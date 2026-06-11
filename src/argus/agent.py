"""
The Argus investigation agent — a manual Claude tool-use loop driving the Splunk
MCP tools, capturing grounded evidence, and emitting a streaming event feed.
"""
from __future__ import annotations

import json
import re
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Any

import asyncio
import uuid
from collections.abc import Awaitable, Callable

from . import enrich
from .config import Settings, get_settings
from .connectors import ResponseEngine
from .llm import make_llm_client
from .mcp_client import MCPToolError, SplunkMCPClient
from .models import HypothesisVerdicts, InvestigationReport
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

RECALL_TOOL = {
    "name": "recall_memory",
    "description": "Search Argus's institutional memory — past investigation cases and the active "
    "threat blocklist — for prior knowledge about the given indicators (IPs, users, domains, "
    "hashes, hostnames). Use this EARLY in triage and whenever you discover a new indicator: if "
    "Argus has investigated or blocked it before, that history (prior verdict, prior case, "
    "already-blocked) is decisive context a fresh analyst would miss.",
    "input_schema": {
        "type": "object",
        "properties": {
            "indicators": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Concrete indicator values to look up (IPs, users, domains, hashes)",
            },
            "keywords": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Optional keywords to match against past case titles/summaries",
            },
        },
        "required": ["indicators"],
    },
}

HYPOTHESIS_TOOL = {
    "name": "track_hypothesis",
    "description": "Record or update a working hypothesis in your investigation ledger. Declare "
    "your key hypotheses early (status=open), then update each to confirmed or refuted as your "
    "queries produce evidence. This makes your reasoning explicit, auditable, and prevents you "
    "from chasing one theory while ignoring alternatives.",
    "input_schema": {
        "type": "object",
        "properties": {
            "id": {"type": "string", "description": "Short stable id, e.g. 'h1'"},
            "statement": {"type": "string", "description": "The hypothesis in one sentence"},
            "status": {"type": "string", "enum": ["open", "confirmed", "refuted"]},
            "confidence": {"type": "number", "description": "0.0-1.0 current confidence"},
            "evidence": {
                "type": "string",
                "description": "Brief note on the supporting/refuting evidence (tool_use ids, counts)",
            },
        },
        "required": ["id", "statement", "status"],
    },
}

SPECIALISTS: list[tuple[str, str]] = [
    ("auth", AUTH_SPECIALIST),
    ("network", NETWORK_SPECIALIST),
    ("endpoint", ENDPOINT_SPECIALIST),
    ("intel", INTEL_SPECIALIST),
]

# Candidate-indicator extraction for pre-investigation auto-recall.
_IP_RE = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")
_AWSKEY_RE = re.compile(r"\bAKIA[0-9A-Z]{16}\b")
_QUOTED_RE = re.compile(r"['\"]([^'\"]{3,40})['\"]")


def extract_alert_indicators(alert: str) -> list[str]:
    """Pull obvious indicators (IPs, AWS keys, quoted tokens) out of an alert for
    a memory lookup before the investigation even starts."""
    found: list[str] = []
    for rx in (_IP_RE, _AWSKEY_RE):
        found.extend(rx.findall(alert or ""))
    found.extend(m.strip() for m in _QUOTED_RE.findall(alert or ""))
    seen: set[str] = set()
    out: list[str] = []
    for v in found:
        if v and v.lower() not in seen:
            seen.add(v.lower())
            out.append(v)
    return out


def _format_recall_for_prompt(rec: dict[str, Any]) -> str:
    """Render a recall result as a compact prior-knowledge block for the model."""
    lines: list[str] = []
    for b in rec.get("blocklist_hits", []) or []:
        lines.append(
            f"- ALREADY BLOCKED: {b.get('indicator')} ({b.get('type')}) — "
            f"{b.get('reason')} [case {b.get('case_id')}]"
        )
    for c in rec.get("related_cases", []) or []:
        ov = ", ".join(c.get("overlap", []) or []) or ", ".join(c.get("keyword_match", []) or [])
        lines.append(
            f"- PRIOR CASE {c.get('case_id')}: {c.get('verdict')} / {c.get('severity')} — "
            f"\"{(c.get('title') or '')[:80]}\" (shared: {ov})"
        )
    return "\n".join(lines)


def _format_hypotheses(hypotheses: dict[str, dict[str, Any]]) -> str:
    if not hypotheses:
        return ""
    return "\n".join(
        f"- [{h.get('status', 'open')}] {h.get('statement', '')}"
        + (f" (conf {h.get('confidence')})" if h.get("confidence") is not None else "")
        + (f" — {h.get('evidence')}" if h.get("evidence") else "")
        for h in hypotheses.values()
    )


async def reconcile_hypotheses(
    client: Any,
    model: str,
    hypotheses: dict[str, dict[str, Any]],
    *,
    basis: str,
    verdict: str,
) -> None:
    """Close out the hypothesis ledger. The agent declares hypotheses during the
    investigation but doesn't always loop back to resolve them; this reconciles every
    still-`open` hypothesis against the final verdict + analysis so the ledger ends
    confirmed/refuted (or stays open only when the data genuinely couldn't settle it).
    Mutates `hypotheses` in place; a failure here never breaks the report."""
    open_ids = {hid: h for hid, h in hypotheses.items() if h.get("status") == "open"}
    if not open_ids:
        return
    listing = "\n".join(f"- {hid}: {h.get('statement', '')}" for hid, h in open_ids.items())
    content = (
        f"An investigation just concluded with verdict: {verdict}.\n\n"
        f"## Final analysis\n{(basis or '(none)')[:6000]}\n\n"
        f"## Working hypotheses still marked OPEN\n{listing}\n\n"
        "Resolve EACH hypothesis strictly from what the investigation found: mark it "
        "`confirmed` if the evidence supports it, `refuted` if the evidence contradicts it, or "
        "`open` ONLY if the data genuinely could not settle it. Give a final confidence "
        "(0.0-1.0) and a one-line evidence note citing what settled it. Return exactly one "
        "resolution per hypothesis id listed above (use the same ids)."
    )
    try:
        result = await client.messages.parse(
            model=model,
            max_tokens=2000,
            messages=[{"role": "user", "content": content}],
            output_format=HypothesisVerdicts,
        )
        for r in result.parsed_output.resolutions:
            if r.id in hypotheses:
                hypotheses[r.id]["status"] = r.status
                hypotheses[r.id]["confidence"] = r.confidence
                if r.evidence:
                    hypotheses[r.id]["evidence"] = r.evidence
    except Exception:
        pass  # leave the ledger as-is rather than fail the whole report


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
        "name": "deploy_detection",
        "description": "Deploy a NEW Splunk scheduled detection (correlation search) that will "
        "catch recurrence of this attack pattern going forward. Use after a confirmed true "
        "positive: turn what you found into a durable, READ-ONLY SPL detection so Splunk alerts "
        "automatically if it happens again. This hardens the SOC — Argus doesn't just close the "
        "incident, it writes the detection that catches the next one.",
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Short detection name, e.g. 'AWS access-denied burst by source IP'",
                },
                "description": {"type": "string", "description": "What it detects and why it matters"},
                "search": {
                    "type": "string",
                    "description": "Read-only SPL for the detection (search/stats/eval/where/etc — "
                    "NO data-modifying commands). It runs on a schedule over a rolling window, so "
                    "write it to match the attack BEHAVIOR, not the specific timestamps you saw. "
                    "Target the same index and sourcetypes you investigated (e.g. index=botsv3 "
                    "sourcetype=aws:cloudtrail) so the detection is immediately enforceable on this "
                    "Splunk instance.",
                },
                "cron_schedule": {
                    "type": "string",
                    "description": "Cron schedule, e.g. '*/10 * * * *' (every 10 minutes)",
                },
                "rationale": {"type": "string", "description": "Why this detection follows from the incident"},
            },
            "required": ["name", "search", "rationale"],
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

# Confidence-gated continuation: if the first synthesis hedges to `inconclusive`
# with low confidence, push ONE more focused pass to pursue the decisive pivot
# before finalizing — rather than under-calling a real threat.
CONTINUATION_TURNS = 4
CONTINUATION_CONF = 0.65


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
    hypotheses: dict[str, dict[str, Any]] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.client = make_llm_client(self.settings)
        self.model = self.settings.resolved_model
        self._ti: ThreatIntel | None = None
        self.recalls: list[dict[str, Any]] = []
        self._messages: list[dict[str, Any]] = []

    def _threatintel(self) -> ThreatIntel:
        if self._ti is None:
            self._ti = ThreatIntel(self.settings)
        return self._ti

    def _tools(self) -> list[dict[str, Any]]:
        """Full toolset offered to the model: discovered MCP tools + enrichment,
        institutional-memory recall, and the hypothesis ledger."""
        return mcp_tools_to_anthropic(self.mcp) + [ENRICH_TOOL, RECALL_TOOL, HYPOTHESIS_TOOL]

    def _evidence_pairs(self) -> list[tuple[str, str]]:
        return [(e.tool, e.result_text) for e in self.evidence if not e.is_error]

    async def _recall(self, indicators: list[str], keywords: list[str] | None = None) -> dict[str, Any]:
        """Look up indicators in Argus's case memory + blocklist (short-lived engine)."""
        engine = ResponseEngine(self.settings, self.mcp)
        try:
            rec = await engine.recall(indicators, keywords)
        finally:
            await engine.aclose()
        self.recalls.append(rec)
        return rec

    async def _agent_loop(
        self,
        system_text: str,
        initial_user: str,
        *,
        max_turns: int,
        agent: str = "",
        messages: list[dict[str, Any]] | None = None,
    ) -> AsyncIterator[dict[str, Any]]:
        """Shared plan→act→observe→re-plan loop. Yields display events tagged with
        `agent`, and finally one {"type": "_final", "text": <analysis>} event.

        Pass `messages` to RESUME an existing conversation (the continuation gate uses
        this to push one more focused pass); `initial_user` is then appended as a new
        user turn. The full conversation is left on `self._messages` for resumption."""
        tools = self._tools()
        system = [{"type": "text", "text": system_text, "cache_control": {"type": "ephemeral"}}]
        if messages is None:
            messages = [{"role": "user", "content": initial_user}]
        elif messages and messages[-1].get("role") == "user":
            # Resuming after a user turn (e.g. trailing tool_results) — fold the
            # directive into it to avoid two consecutive user turns.
            prev = messages[-1].get("content")
            if isinstance(prev, str):
                messages[-1]["content"] = prev + "\n\n" + initial_user
            else:
                messages[-1]["content"] = list(prev) + [{"type": "text", "text": initial_user}]
        else:
            messages.append({"role": "user", "content": initial_user})
        self._messages = messages
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
                    if block.name == "track_hypothesis":
                        yield {
                            "type": "hypothesis",
                            "hypothesis": self.hypotheses.get(str((block.input or {}).get("id", ""))),
                            "agent": agent,
                        }
                    elif block.name == "recall_memory" and not is_error:
                        try:
                            yield {"type": "recall", "recall": json.loads(text), "agent": agent}
                        except Exception:
                            pass
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
        """Single-agent investigation: yields events then a grounded, enriched report."""
        # Pre-investigation auto-recall: if the alert already names an indicator
        # Argus has seen, surface that history before the loop even starts.
        prior_block = ""
        seeds = extract_alert_indicators(alert)
        if seeds:
            rec = await self._recall(seeds, [])
            if rec.get("related_cases") or rec.get("blocklist_hits"):
                yield {"type": "recall", "recall": rec, "agent": ""}
                prior_block = _format_recall_for_prompt(rec)

        initial = (
            "Investigate the following security alert. Work autonomously, end to end, using the "
            "Splunk MCP tools (and enrich_indicator for external IPs/domains/hashes). The data is "
            'in the `botsv3` index and is historical — always search with earliest_time="0".'
            "\n\nALERT:\n" + alert
        )
        if prior_block:
            initial += (
                "\n\n## Prior knowledge from Argus case memory\n" + prior_block
                + "\nTreat these as leads to confirm against live data, not conclusions."
            )

        final_text = ""
        async for ev in self._agent_loop(INVESTIGATOR_SYSTEM, initial, max_turns=max_turns):
            if ev["type"] == "_final":
                final_text = ev["text"]
            else:
                yield ev

        report = await self._synthesize(final_text)

        # Confidence-gated continuation: if the agent hedged to a low-confidence
        # `inconclusive`, push ONE focused pass to pursue the decisive pivot and then
        # commit — instead of under-calling a real threat. Resolving the pivot can just
        # as well CONFIRM benign, so this never forces a true_positive.
        if self._needs_continuation(report):
            yield {
                "type": "continuation",
                "reason": "low-confidence inconclusive — pursuing the decisive pivot",
                "verdict": report.verdict,
                "confidence": report.confidence,
            }
            async for ev in self._agent_loop(
                INVESTIGATOR_SYSTEM,
                self._continuation_directive(report),
                max_turns=CONTINUATION_TURNS,
                messages=self._messages,
            ):
                if ev["type"] == "_final":
                    final_text = ev["text"] or final_text
                else:
                    yield ev
            report = await self._synthesize(final_text)

        # Close out the hypothesis ledger against the final verdict (declare → resolve).
        await reconcile_hypotheses(
            self.client, self.model, self.hypotheses,
            basis=final_text or report.summary, verdict=report.verdict,
        )
        rep = enrich.enrich_report(
            report.model_dump(),
            evidence_pairs=self._evidence_pairs(),
            hypotheses=list(self.hypotheses.values()),
            recalls=self.recalls,
        )
        yield {"type": "report", "report": rep}
        yield {"type": "done"}

    def _needs_continuation(self, report: InvestigationReport) -> bool:
        """Trigger one more focused pass only when the agent under-calls: a
        low-confidence `inconclusive`. Confident verdicts (either way) finalize."""
        return report.verdict == "inconclusive" and float(report.confidence or 0) < CONTINUATION_CONF

    def _continuation_directive(self, report: InvestigationReport) -> str:
        open_hyps = [
            h.get("statement", "") for h in self.hypotheses.values() if h.get("status") == "open"
        ]
        hyp_txt = (
            "\n\nUnresolved hypotheses to settle:\n" + "\n".join(f"- {s}" for s in open_hyps)
            if open_hyps
            else ""
        )
        return (
            f"Your current verdict is INCONCLUSIVE at confidence {float(report.confidence or 0):.2f}. "
            "That is not a finished investigation — run the decisive pivot, then COMMIT to the "
            f"verdict the evidence supports for the activity this alert flagged.{hyp_txt}\n\n"
            "Run the single most decisive pivot now:\n"
            "- If a suspicious/masquerading process or executable is involved, pull its Sysmon "
            "EventID 1 process-creation lineage — Image, ParentImage, full CommandLine, Hashes, "
            "User — and any network connections. Sysmon data here is raw XML; extract with "
            "`rex field=_raw \"Name='CommandLine'>(?<CommandLine>[^<]+)\"` (and ParentImage, Image, "
            "Hashes).\n"
            "- If an account/IP/domain/DNS query is involved, pull the specific records that reveal "
            "what it actually is.\n\n"
            "Then commit to the truth: **true_positive** if the pivot shows the flagged activity is "
            "genuinely malicious (reverse shell, exploit, C2, credential theft, a masquerading "
            "binary); **false_positive** if it shows the activity is benign or expected (a legitimate "
            "program, a public DNS resolver, a normal admin task) — a confident benign ruling is just "
            "as valuable, so do not inflate it into a threat, and do not promote unrelated activity on "
            "the host into a verdict for THIS alert. Stay `inconclusive` only if the data genuinely "
            "cannot answer the question."
        )

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
            elif name == "deploy_detection":
                result = await engine.deploy_detection(
                    args.get("name", "Argus auto-detection"),
                    args.get("search", ""),
                    description=args.get("description", ""),
                    cron_schedule=args.get("cron_schedule", "*/10 * * * *"),
                    rationale=args.get("rationale", ""),
                    case_id=case_id,
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
        if name == "deploy_detection":
            return f"DEPLOY DETECTION: {args.get('name', '')[:70]} [{args.get('cron_schedule', '*/10 * * * *')}]"
        return name

    async def _run_tool(
        self, name: str, arguments: dict[str, Any], tool_use_id: str
    ) -> tuple[str, bool]:
        try:
            if name == "enrich_indicator":
                enr = await self._threatintel().enrich(
                    arguments.get("indicator", ""), arguments.get("indicator_type", "ip")
                )
                text = json.dumps(enr)
                self.evidence.append(Evidence(tool_use_id, name, arguments, text, False))
                return text, False
            if name == "recall_memory":
                rec = await self._recall(
                    arguments.get("indicators", []) or [], arguments.get("keywords") or []
                )
                # Recall is a memory check, not a data query — kept out of `evidence`
                # so it never inflates the SPL/query counts, but tracked for enrichment.
                return json.dumps(rec), False
            if name == "track_hypothesis":
                hid = str(arguments.get("id") or f"h{len(self.hypotheses) + 1}")
                self.hypotheses[hid] = {
                    "id": hid,
                    "statement": arguments.get("statement", ""),
                    "status": arguments.get("status", "open"),
                    "confidence": arguments.get("confidence"),
                    "evidence": arguments.get("evidence", ""),
                }
                return json.dumps({"ok": True, "ledger_size": len(self.hypotheses)}), False
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
        hyp_block = _format_hypotheses(self.hypotheses)
        recall_block = (
            _format_recall_for_prompt(enrich._merge_recall(self.recalls)) if self.recalls else ""
        )
        extra = ""
        if hyp_block:
            extra += f"\n## Hypothesis ledger (your confirmed/refuted theories)\n{hyp_block}\n"
        if recall_block:
            extra += f"\n## Prior knowledge from case memory (factor into severity/verdict)\n{recall_block}\n"
        content = (
            "You have completed the investigation below. Convert it into the structured "
            "incident report.\n\n## Your final analysis\n"
            f"{narrative or '(no narrative produced)'}\n\n"
            f"## Queries you ran (tool_use_id: tool args)\n{evidence_index}\n"
            f"{extra}\n"
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
        self.hypotheses: dict[str, dict[str, Any]] = {}
        self.recalls: list[dict[str, Any]] = []

    async def investigate(
        self, alert: str, *, max_turns_each: int = 5
    ) -> AsyncIterator[dict[str, Any]]:
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        findings: dict[str, str] = {}

        # Orchestrator-level auto-recall: one memory lookup seeds every specialist.
        prior_block = ""
        recall_event: dict[str, Any] | None = None
        seeds = extract_alert_indicators(alert)
        if seeds:
            engine = ResponseEngine(self.settings, self.mcp)
            try:
                rec = await engine.recall(seeds, [])
            finally:
                await engine.aclose()
            if rec.get("related_cases") or rec.get("blocklist_hits"):
                self.recalls.append(rec)
                prior_block = _format_recall_for_prompt(rec)
                recall_event = {"type": "recall", "recall": rec, "agent": ""}

        async def run_specialist(name: str, system: str) -> None:
            sub = Investigator(self.mcp, self.settings)
            initial = (
                f"You are the {name.upper()} specialist. Investigate your domain for this alert "
                'against the botsv3 index (historical — always earliest_time="0"). Report concrete '
                "findings with evidence.\n\nALERT:\n" + alert
            )
            if prior_block:
                initial += "\n\n## Prior knowledge from Argus case memory\n" + prior_block
            await queue.put({"type": "specialist_started", "agent": name})
            final = ""
            async for ev in sub._agent_loop(system, initial, max_turns=max_turns_each, agent=name):
                if ev["type"] == "_final":
                    final = ev["text"]
                else:
                    await queue.put(ev)
            findings[name] = final
            self.evidence.extend(sub.evidence)
            self.recalls.extend(sub.recalls)
            for hid, h in sub.hypotheses.items():
                self.hypotheses[f"{name}:{hid}"] = h
            await queue.put({"type": "specialist_done", "agent": name, "findings": final})

        tasks = [asyncio.create_task(run_specialist(n, s)) for n, s in SPECIALISTS]
        yield {"type": "multi_start", "agents": [n for n, _ in SPECIALISTS]}
        if recall_event:
            yield recall_event

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
        await reconcile_hypotheses(
            self.client, self.model, self.hypotheses,
            basis=report.summary, verdict=report.verdict,
        )
        rep = enrich.enrich_report(
            report.model_dump(),
            evidence_pairs=[(e.tool, e.result_text) for e in self.evidence if not e.is_error],
            hypotheses=list(self.hypotheses.values()),
            recalls=self.recalls,
        )
        yield {"type": "report", "report": rep}
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
        hyp_block = _format_hypotheses(self.hypotheses)
        recall_block = (
            _format_recall_for_prompt(enrich._merge_recall(self.recalls)) if self.recalls else ""
        )
        extra = ""
        if hyp_block:
            extra += f"\n## Hypotheses tracked across specialists\n{hyp_block}\n"
        if recall_block:
            extra += f"\n## Prior knowledge from case memory (factor into severity/verdict)\n{recall_block}\n"
        content = (
            f"ALERT:\n{alert}\n\n{sections}\n\n"
            f"## All queries run across specialists (tool_use_id: tool args)\n{evidence_index}\n"
            f"{extra}\n"
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
