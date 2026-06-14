"""Argus as an MCP server.

This is the productization layer: external MCP hosts can call Argus as a
higher-level SOC tool, while Argus itself still investigates Splunk through the
Splunk MCP Server. The composition is the point:

    MCP host -> Argus MCP tools -> Argus agent -> Splunk MCP Server -> Splunk
"""
from __future__ import annotations

import json
import os
from typing import Any, Literal

from mcp.server.fastmcp import FastMCP

from .agent import Investigator, MultiAgentInvestigator
from .config import get_settings
from .connectors import ResponseEngine
from .mcp_client import SplunkMCPClient

Transport = Literal["stdio", "sse", "streamable-http"]

# When set (e.g. on the public hosted demo endpoint), Argus exposes only read /
# investigate / proof tools and never registers response execution.
_READONLY = os.getenv("ARGUS_MCP_READONLY", "").strip().lower() in {"1", "true", "yes", "on"}

INSTRUCTIONS = """
Argus is an autonomous SOC investigation agent for Splunk.

Use argus_investigate_alert to investigate a security alert end-to-end. Argus
will query Splunk through the Splunk MCP Server, build a grounded incident
report, and return evidence metadata. Response actions are separate and require
an explicit confirmation string.
""".strip()

mcp = FastMCP(
    "argus-soc-agent",
    instructions=INSTRUCTIONS,
    host="127.0.0.1",
    port=8765,
)


def _settings_status() -> dict[str, Any]:
    s = get_settings()
    return {
        "provider": s.provider,
        "model": s.resolved_model,
        "splunk_mcp_url": s.splunk_mcp_url,
        "splunk_token_configured": bool(s.splunk_token),
    }


async def _with_mcp_client() -> SplunkMCPClient:
    s = get_settings()
    client = SplunkMCPClient(
        s.splunk_mcp_url, s.splunk_token, s.splunk_verify_ssl, s.request_timeout
    )
    await client.__aenter__()
    return client


def _compact_events(events: list[dict[str, Any]]) -> dict[str, Any]:
    tool_calls = [e for e in events if e.get("type") == "tool_call"]
    tool_results = {e.get("id"): e for e in events if e.get("type") == "tool_result"}
    spl_queries: list[dict[str, Any]] = []
    other_tools: list[dict[str, Any]] = []
    for ev in tool_calls:
        item = {
            "id": ev.get("id"),
            "name": ev.get("name"),
            "agent": ev.get("agent", ""),
            "input": ev.get("input") or {},
            "ok": not bool((tool_results.get(ev.get("id")) or {}).get("is_error")),
        }
        if str(ev.get("name", "")).endswith("run_query"):
            spl_queries.append(item)
        else:
            other_tools.append(item)
    return {
        "event_count": len(events),
        "spl_query_count": len(spl_queries),
        "spl_queries": spl_queries,
        "other_tool_calls": other_tools,
        "hypotheses": [e.get("hypothesis") for e in events if e.get("type") == "hypothesis"],
        "recalls": [e.get("recall") for e in events if e.get("type") == "recall"],
        "continuations": [e for e in events if e.get("type") == "continuation"],
    }


def _parse_report(report_json: str | dict[str, Any]) -> dict[str, Any]:
    if isinstance(report_json, dict):
        return report_json
    try:
        parsed = json.loads(report_json)
    except json.JSONDecodeError as exc:
        raise ValueError("report_json must be valid JSON") from exc
    if not isinstance(parsed, dict):
        raise ValueError("report_json must decode to an object")
    return parsed


@mcp.tool()
async def argus_health() -> dict[str, Any]:
    """Check Argus configuration and Splunk MCP Server reachability."""
    info = {"ok": True, "readonly": _READONLY, **_settings_status(), "splunk_mcp": "unknown"}
    if not info["splunk_token_configured"]:
        info["ok"] = False
        info["splunk_mcp"] = "missing_token"
        return info
    client: SplunkMCPClient | None = None
    try:
        client = await _with_mcp_client()
        info["splunk_mcp"] = "connected"
        info["mcp_tools"] = sorted(client.tools)
        info["mcp_server"] = client.server_info.get("serverInfo", {})
    except Exception as exc:
        info["ok"] = False
        info["splunk_mcp"] = "unreachable"
        info["error"] = f"{type(exc).__name__}: {exc}"
    finally:
        if client is not None:
            await client.aclose()
    return info


@mcp.tool()
async def argus_investigate_alert(
    alert: str,
    multi_agent: bool = False,
    max_turns: int = 12,
) -> dict[str, Any]:
    """Investigate a security alert through Splunk MCP and return a grounded report.

    The returned `evidence` block includes the SPL queries Argus ran and the tool
    ids referenced by timeline entries in the report.
    """
    if not alert.strip():
        raise ValueError("alert is required")
    max_turns = max(1, min(int(max_turns), 24))
    events: list[dict[str, Any]] = []
    report: dict[str, Any] | None = None
    client = await _with_mcp_client()
    try:
        inv: Investigator | MultiAgentInvestigator = (
            MultiAgentInvestigator(client) if multi_agent else Investigator(client)
        )
        stream = (
            inv.investigate(alert, max_turns_each=max_turns)
            if multi_agent
            else inv.investigate(alert, max_turns=max_turns)
        )
        async for ev in stream:
            events.append(ev)
            if ev.get("type") == "report":
                report = ev.get("report")
    finally:
        await client.aclose()
    if report is None:
        return {"ok": False, "error": "investigation completed without a report", "events": events}
    return {
        "ok": True,
        "mode": "multi-agent" if multi_agent else "single-agent",
        "report": report,
        "evidence": _compact_events(events),
    }


@mcp.tool()
async def argus_list_cases(limit: int = 20) -> dict[str, Any]:
    """List recorded Argus cases from the Splunk KV-store case memory."""
    limit = max(1, min(int(limit), 100))
    client = await _with_mcp_client()
    engine = ResponseEngine(get_settings(), client)
    try:
        rows = await engine.list_cases()
    finally:
        await engine.aclose()
        await client.aclose()
    rows = sorted(rows, key=lambda r: r.get("created_at", ""), reverse=True)[:limit]
    return {"ok": True, "cases": rows}


@mcp.tool()
async def argus_list_blocklist(limit: int = 50) -> dict[str, Any]:
    """List active indicators in the Argus Splunk KV-store threat blocklist."""
    limit = max(1, min(int(limit), 250))
    client = await _with_mcp_client()
    engine = ResponseEngine(get_settings(), client)
    try:
        rows = await engine.list_blocklist()
    finally:
        await engine.aclose()
        await client.aclose()
    rows = sorted(rows, key=lambda r: r.get("added_at", ""), reverse=True)[:limit]
    return {"ok": True, "blocklist": rows}


@mcp.tool()
async def argus_list_detections(limit: int = 50) -> dict[str, Any]:
    """List detections Argus has deployed as Splunk saved searches."""
    limit = max(1, min(int(limit), 250))
    client = await _with_mcp_client()
    engine = ResponseEngine(get_settings(), client)
    try:
        rows = await engine.list_detections()
    finally:
        await engine.aclose()
        await client.aclose()
    return {"ok": True, "detections": rows[:limit]}


@mcp.tool()
async def argus_run_detections(
    name: str = "",
    earliest: str | None = None,
    latest: str | None = None,
    row_limit: int = 20,
) -> dict[str, Any]:
    """Run Argus-deployed detections on demand through Splunk MCP."""
    client = await _with_mcp_client()
    engine = ResponseEngine(get_settings(), client)
    try:
        return await engine.run_deployed_detections(
            name=name,
            earliest=earliest,
            latest=latest,
            row_limit=row_limit,
        )
    finally:
        await engine.aclose()
        await client.aclose()


@mcp.tool()
async def argus_recall_memory(
    indicators: list[str],
    keywords: list[str] | None = None,
) -> dict[str, Any]:
    """Recall prior Argus cases and blocklist hits for indicators or keywords."""
    client = await _with_mcp_client()
    engine = ResponseEngine(get_settings(), client)
    try:
        recall = await engine.recall(indicators, keywords or [])
    finally:
        await engine.aclose()
        await client.aclose()
    return {"ok": True, "recall": recall}


async def argus_execute_response(
    report_json: str,
    confirmation: str,
    case_id: str | None = None,
) -> dict[str, Any]:
    """Execute Argus response actions for a completed report.

    This can write to Splunk KV store, deploy detections, and call configured
    integrations. To prevent accidental containment from an MCP host, the
    confirmation argument must be exactly EXECUTE_ARGUS_RESPONSE.
    """
    if confirmation != "EXECUTE_ARGUS_RESPONSE":
        return {
            "ok": False,
            "error": "confirmation must be exactly EXECUTE_ARGUS_RESPONSE",
        }
    report = _parse_report(report_json)
    events: list[dict[str, Any]] = []
    client = await _with_mcp_client()
    try:
        inv = Investigator(client)
        async for ev in inv.respond(report, mode="auto", case_id=case_id):
            events.append(ev)
    finally:
        await client.aclose()
    return {"ok": True, "events": events}


# Response execution writes to Splunk (KV store, detections, integrations), so it is
# registered ONLY when not in read-only mode. The public hosted endpoint runs with
# ARGUS_MCP_READONLY=1 and therefore never advertises this tool at all.
if not _READONLY:
    mcp.tool()(argus_execute_response)


def run(transport: Transport = "stdio", host: str = "127.0.0.1", port: int = 8765) -> None:
    """Run the Argus MCP server."""
    if transport in {"sse", "streamable-http"}:
        mcp.settings.host = host
        mcp.settings.port = port
    mcp.run(transport=transport)


if __name__ == "__main__":
    run()
