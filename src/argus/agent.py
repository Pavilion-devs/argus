"""
The Argus investigation agent — a manual Claude tool-use loop driving the Splunk
MCP tools, capturing grounded evidence, and emitting a streaming event feed.
"""
from __future__ import annotations

import json
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Any

import asyncio
import uuid
from collections.abc import Awaitable, Callable

from .config import Settings, get_settings
from .connectors import ResponseEngine
from .llm import make_llm_client
from .mcp_client import MCPToolError, SplunkMCPClient
from .models import InvestigationReport
from .prompts import (
    AUTH_SPECIALIST,
    ENDPOINT_SPECIALIST,
    INTEL_SPECIALIST,
    INVESTIGATOR_SYSTEM,
    MULTIAGENT_SYNTHESIS,
    NETWORK_SPECIALIST,
    RESPONSE_SYSTEM,
    SYNTHESIS_PROMPT,
)
from .threatintel import ThreatIntel

ENRICH_TOOL = {
    "name": "enrich_indicator",
    "description": "Get real external threat-intelligence (geolocation, ASN/ISP, hosting/proxy "
    "flags, abuse score, reputation) for an indicator. Use on EXTERNAL IPs, domains, and file "
    "hashes — not internal hosts.",
    "input_schema": {
        "type": "object",
        "properties": {
            "indicator": {"type": "string"},
            "indicator_type": {"type": "string", "enum": ["ip", "domain", "hash"]},
        },
        "required": ["indicator", "indicator_type"],
    },
}

SPECIALISTS: list[tuple[str, str]] = [
    ("auth", AUTH_SPECIALIST),
    ("network", NETWORK_SPECIALIST),
    ("endpoint", ENDPOINT_SPECIALIST),
    ("intel", INTEL_SPECIALIST),
]

# An approver decides whether a proposed response action may execute.
Approver = Callable[[str, dict[str, Any]], Awaitable[bool]]

RESPONSE_TOOLS = [
    {
        "name": "block_indicator",
        "description": "Add a confirmed-malicious indicator to the Splunk threat blocklist, "
        "which a correlation search then enforces against live data.",
        "input_schema": {
            "type": "object",
            "properties": {
                "indicator": {"type": "string", "description": "The IP/user/domain/hash value"},
                "indicator_type": {
                    "type": "string",
                    "enum": ["ip", "user", "domain", "hash", "account"],
                },
                "reason": {"type": "string", "description": "Why this indicator is being blocked"},
                "severity": {"type": "string", "enum": ["critical", "high", "medium", "low"]},
            },
            "required": ["indicator", "indicator_type", "reason"],
        },
    },
    {
        "name": "notify_slack",
        "description": "Send a concise incident summary to the SOC Slack channel.",
        "input_schema": {
            "type": "object",
            "properties": {"message": {"type": "string"}},
            "required": ["message"],
        },
    },
    {
        "name": "create_ticket",
        "description": "Open a tracking ticket for follow-up remediation.",
        "input_schema": {
            "type": "object",
            "properties": {
                "summary": {"type": "string"},
                "description": {"type": "string"},
            },
            "required": ["summary", "description"],
        },
    },
    {
        "name": "finish_response",
        "description": "Call when all appropriate response actions have been taken.",
        "input_schema": {
            "type": "object",
            "properties": {"summary": {"type": "string"}},
            "required": ["summary"],
        },
    },
]

MAX_TURNS = 12
PER_TURN_MAX_TOKENS = 16000
TOOL_RESULT_CHAR_CAP = 4000


def _truncate(text: str, cap: int = TOOL_RESULT_CHAR_CAP) -> str:
    if len(text) <= cap:
        return text
    return text[:cap] + f"\n…[truncated {len(text) - cap} chars — narrow your SPL to see more]"


def _thinking_cfg(model: str) -> dict[str, str]:
    """Adaptive thinking; the `display` opt-in is only valid on Opus 4.7/4.8.
    Sonnet 4.6 already returns summarized thinking text by default."""
    cfg = {"type": "adaptive"}
    if model.startswith(("claude-opus-4-7", "claude-opus-4-8")):
        cfg["display"] = "summarized"
    return cfg


def _normalize_schema(schema: dict[str, Any] | None) -> dict[str, Any]:
    """Ensure an MCP inputSchema is a valid Anthropic object schema."""
    out = dict(schema or {})
    out.setdefault("type", "object")
    out.setdefault("properties", {})
    return out


def mcp_tools_to_anthropic(client: SplunkMCPClient) -> list[dict[str, Any]]:
    """Convert discovered MCP tools to Anthropic tool definitions (sorted for cache stability)."""
    tools: list[dict[str, Any]] = []
    for name in sorted(client.tools):
        spec = client.tools[name]
        tools.append(
            {
                "name": spec.name,
                "description": (spec.description or "").strip()[:1024],
                "input_schema": _normalize_schema(spec.input_schema),
            }
        )
    return tools


@dataclass
class Evidence:
    """A single grounded fact: the tool call + the real result behind it."""

    tool_use_id: str
    tool: str
    arguments: dict[str, Any]
    result_text: str
    is_error: bool


@dataclass
class Investigator:
    mcp: SplunkMCPClient
    settings: Settings = field(default_factory=get_settings)
    evidence: list[Evidence] = field(default_factory=list)

    def __post_init__(self) -> None:
        self.client = make_llm_client(self.settings)
        self.model = self.settings.resolved_model
        self._ti: ThreatIntel | None = None

    def _threatintel(self) -> ThreatIntel:
        if self._ti is None:
            self._ti = ThreatIntel(self.settings)
        return self._ti

    def _tools(self) -> list[dict[str, Any]]:
        """Full toolset offered to the model: discovered MCP tools + enrichment."""
        return mcp_tools_to_anthropic(self.mcp) + [ENRICH_TOOL]

    async def _agent_loop(
        self,
        system_text: str,
        initial_user: str,
        *,
        max_turns: int,
        agent: str = "",
    ) -> AsyncIterator[dict[str, Any]]:
        """Shared plan→act→observe→re-plan loop. Yields display events tagged with
        `agent`, and finally one {"type": "_final", "text": <analysis>} event."""
        tools = self._tools()
        system = [{"type": "text", "text": system_text, "cache_control": {"type": "ephemeral"}}]
        messages: list[dict[str, Any]] = [{"role": "user", "content": initial_user}]
        final_text = ""

        for _turn in range(max_turns):
            async with self.client.messages.stream(
                model=self.model,
                max_tokens=PER_TURN_MAX_TOKENS,
                system=system,
                tools=tools,
                thinking=_thinking_cfg(self.settings.model),
                output_config={"effort": "high"},
                messages=messages,
            ) as stream:
                async for event in stream:
                    if event.type == "content_block_delta":
                        delta = event.delta
                        if delta.type == "thinking_delta":
                            yield {"type": "thinking", "text": delta.thinking, "agent": agent}
                        elif delta.type == "text_delta":
                            yield {"type": "text", "text": delta.text, "agent": agent}
                final = await stream.get_final_message()

            turn_text = "".join(b.text for b in final.content if b.type == "text")
            if turn_text.strip():
                final_text = turn_text
            messages.append({"role": "assistant", "content": final.content})

            if final.stop_reason == "tool_use":
                tool_results = []
                for block in final.content:
                    if block.type != "tool_use":
                        continue
                    yield {
                        "type": "tool_call",
                        "id": block.id,
                        "name": block.name,
                        "input": block.input,
                        "agent": agent,
                    }
                    text, is_error = await self._run_tool(block.name, block.input or {}, block.id)
                    yield {
                        "type": "tool_result",
                        "id": block.id,
                        "name": block.name,
                        "is_error": is_error,
                        "text": text,
                        "agent": agent,
                    }
                    tool_results.append(
                        {
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": _truncate(text) or "(no results)",
                            "is_error": is_error,
                        }
                    )
                messages.append({"role": "user", "content": tool_results})
                continue

            if final.stop_reason == "max_tokens":
                messages.append(
                    {"role": "user", "content": "You were cut off — continue."}
                )
                continue

            if final.stop_reason == "refusal":
                yield {"type": "error", "text": "Model refused to continue.", "agent": agent}
                break

            break  # end_turn

        yield {"type": "_final", "text": final_text, "agent": agent}

    async def investigate(
        self, alert: str, *, max_turns: int = MAX_TURNS
    ) -> AsyncIterator[dict[str, Any]]:
        """Single-agent investigation: yields events then a structured report."""
        initial = (
            "Investigate the following security alert. Work autonomously, end to end, using the "
            "Splunk MCP tools (and enrich_indicator for external IPs/domains/hashes). The data is "
            'in the `botsv3` index and is historical — always search with earliest_time="0".'
            "\n\nALERT:\n" + alert
        )
        final_text = ""
        async for ev in self._agent_loop(INVESTIGATOR_SYSTEM, initial, max_turns=max_turns):
            if ev["type"] == "_final":
                final_text = ev["text"]
            else:
                yield ev

        report = await self._synthesize(final_text)
        yield {"type": "report", "report": report.model_dump()}
        yield {"type": "done"}

    async def respond(
        self,
        report: dict[str, Any],
        *,
        mode: str = "approve",
        approver: Approver | None = None,
        case_id: str | None = None,
    ) -> AsyncIterator[dict[str, Any]]:
        """Execute real containment/response for a completed investigation.

        mode="auto" executes every proposed action; mode="approve" gates each action
        through `approver` (a coroutine returning True to execute)."""
        case_id = case_id or f"ARGUS-{uuid.uuid4().hex[:8].upper()}"
        engine = ResponseEngine(self.settings, self.mcp)
        try:
            # The case record is always written — it is the audit trail, not an action.
            case = await engine.create_case(report, case_id)
            yield {"type": "case_created", "case_id": case_id, "key": case.get("key")}

            messages: list[dict[str, Any]] = [
                {
                    "role": "user",
                    "content": f"Incident report (case {case_id}):\n\n"
                    + json.dumps(report, indent=2),
                }
            ]
            for _turn in range(8):
                resp = await self.client.messages.create(
                    model=self.model,
                    max_tokens=4000,
                    system=RESPONSE_SYSTEM,
                    tools=RESPONSE_TOOLS,
                    messages=messages,
                )
                messages.append({"role": "assistant", "content": resp.content})
                if resp.stop_reason != "tool_use":
                    break

                done = False
                results = []
                for block in resp.content:
                    if block.type != "tool_use":
                        continue
                    if block.name == "finish_response":
                        yield {"type": "response_done", "summary": (block.input or {}).get("summary", "")}
                        done = True
                        results.append(
                            {"type": "tool_result", "tool_use_id": block.id, "content": "ok"}
                        )
                        continue
                    out = await self._execute_action(
                        engine, block.name, block.input or {}, mode, approver, case_id
                    )
                    yield out["event"]
                    results.append(
                        {
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": json.dumps(out["result"]),
                        }
                    )
                messages.append({"role": "user", "content": results})
                if done:
                    break
        finally:
            await engine.aclose()

    async def _execute_action(
        self,
        engine: ResponseEngine,
        name: str,
        args: dict[str, Any],
        mode: str,
        approver: Approver | None,
        case_id: str,
    ) -> dict[str, Any]:
        desc = self._describe_action(name, args)
        approved = True if mode == "auto" else (await approver(desc, args) if approver else False)
        if not approved:
            return {
                "event": {"type": "action_skipped", "action": name, "desc": desc, "input": args},
                "result": {"ok": False, "skipped": True, "reason": "not approved by operator"},
            }
        try:
            if name == "block_indicator":
                result = await engine.block_indicator(
                    args["indicator"],
                    args.get("indicator_type", "ip"),
                    args.get("reason", ""),
                    args.get("severity", "high"),
                    case_id=case_id,
                )
            elif name == "notify_slack":
                result = await engine.notify_slack(args.get("message", ""))
            elif name == "create_ticket":
                result = await engine.create_ticket(
                    args.get("summary", ""), args.get("description", "")
                )
            else:
                result = {"ok": False, "error": f"unknown action {name}"}
        except Exception as exc:
            result = {"ok": False, "error": str(exc)}
        return {
            "event": {"type": "action_executed", "action": name, "desc": desc, "result": result},
            "result": result,
        }

    @staticmethod
    def _describe_action(name: str, args: dict[str, Any]) -> str:
        if name == "block_indicator":
            return f"BLOCK {args.get('indicator_type', '')} {args.get('indicator')} — {args.get('reason', '')}"
        if name == "notify_slack":
            return f"NOTIFY Slack: {args.get('message', '')[:80]}"
        if name == "create_ticket":
            return f"TICKET: {args.get('summary', '')[:80]}"
        return name

    async def _run_tool(
        self, name: str, arguments: dict[str, Any], tool_use_id: str
    ) -> tuple[str, bool]:
        try:
            if name == "enrich_indicator":
                enrich = await self._threatintel().enrich(
                    arguments.get("indicator", ""), arguments.get("indicator_type", "ip")
                )
                text = json.dumps(enrich)
                self.evidence.append(Evidence(tool_use_id, name, arguments, text, False))
                return text, False
            result = await self.mcp.call_tool(name, arguments)
            text = self.mcp.text_content(result)
            self.evidence.append(Evidence(tool_use_id, name, arguments, text, False))
            return text, False
        except MCPToolError as exc:
            msg = f"Tool error (safe-SPL or execution): {exc}"
            self.evidence.append(Evidence(tool_use_id, name, arguments, msg, True))
            return msg, True
        except Exception as exc:  # surface to the model so it can adapt
            msg = f"Error executing {name}: {exc}"
            self.evidence.append(Evidence(tool_use_id, name, arguments, msg, True))
            return msg, True

    async def _synthesize(self, narrative: str) -> InvestigationReport:
        # Synthesize from the agent's own final analysis plus a compact index of the
        # queries it ran — NOT the full raw transcript (which is large and slow).
        evidence_index = "\n".join(
            f"- {e.tool_use_id}: {e.tool} {json.dumps(e.arguments)[:200]}"
            for e in self.evidence
            if not e.is_error
        )[:8000]
        content = (
            "You have completed the investigation below. Convert it into the structured "
            "incident report.\n\n## Your final analysis\n"
            f"{narrative or '(no narrative produced)'}\n\n"
            f"## Queries you ran (tool_use_id: tool args)\n{evidence_index}\n\n"
            + SYNTHESIS_PROMPT
        )
        result = await self.client.messages.parse(
            model=self.model,
            max_tokens=8000,
            system=INVESTIGATOR_SYSTEM,
            messages=[{"role": "user", "content": content}],
            output_format=InvestigationReport,
        )
        return result.parsed_output


@dataclass
class MultiAgentInvestigator:
    """Runs specialist sub-agents (auth, network, endpoint, threat-intel) concurrently,
    each driving its own MCP-backed investigation, then synthesizes one report."""

    mcp: SplunkMCPClient
    settings: Settings = field(default_factory=get_settings)

    def __post_init__(self) -> None:
        self.client = make_llm_client(self.settings)
        self.model = self.settings.resolved_model
        self.evidence: list[Evidence] = []

    async def investigate(
        self, alert: str, *, max_turns_each: int = 5
    ) -> AsyncIterator[dict[str, Any]]:
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        findings: dict[str, str] = {}

        async def run_specialist(name: str, system: str) -> None:
            sub = Investigator(self.mcp, self.settings)
            initial = (
                f"You are the {name.upper()} specialist. Investigate your domain for this alert "
                'against the botsv3 index (historical — always earliest_time="0"). Report concrete '
                "findings with evidence.\n\nALERT:\n" + alert
            )
            await queue.put({"type": "specialist_started", "agent": name})
            final = ""
            async for ev in sub._agent_loop(system, initial, max_turns=max_turns_each, agent=name):
                if ev["type"] == "_final":
                    final = ev["text"]
                else:
                    await queue.put(ev)
            findings[name] = final
            self.evidence.extend(sub.evidence)
            await queue.put({"type": "specialist_done", "agent": name, "findings": final})

        tasks = [asyncio.create_task(run_specialist(n, s)) for n, s in SPECIALISTS]
        yield {"type": "multi_start", "agents": [n for n, _ in SPECIALISTS]}

        async def _waiter() -> None:
            await asyncio.gather(*tasks)
            await queue.put({"type": "_all_done"})

        waiter = asyncio.create_task(_waiter())
        while True:
            ev = await queue.get()
            if ev.get("type") == "_all_done":
                break
            yield ev
        await waiter

        report = await self._synthesize_multi(alert, findings)
        yield {"type": "report", "report": report.model_dump()}
        yield {"type": "done"}

    async def _synthesize_multi(
        self, alert: str, findings: dict[str, str]
    ) -> InvestigationReport:
        sections = "\n\n".join(
            f"### {name.upper()} specialist findings\n{text or '(no findings)'}"
            for name, text in findings.items()
        )
        evidence_index = "\n".join(
            f"- {e.tool_use_id}: {e.tool} {json.dumps(e.arguments)[:160]}"
            for e in self.evidence
            if not e.is_error
        )[:8000]
        content = (
            f"ALERT:\n{alert}\n\n{sections}\n\n"
            f"## All queries run across specialists (tool_use_id: tool args)\n{evidence_index}\n\n"
            + SYNTHESIS_PROMPT
        )
        result = await self.client.messages.parse(
            model=self.model,
            max_tokens=8000,
            system=MULTIAGENT_SYNTHESIS,
            messages=[{"role": "user", "content": content}],
            output_format=InvestigationReport,
        )
        return result.parsed_output

    async def respond(self, report: dict[str, Any], **kw: Any) -> AsyncIterator[dict[str, Any]]:
        """Delegate the response phase to a standard Investigator."""
        inv = Investigator(self.mcp, self.settings)
        async for ev in inv.respond(report, **kw):
            yield ev
