"""
Argus streaming bridge — a thin FastAPI/SSE layer over the investigation engine.

This server does NOT reimplement any agent logic. It opens a real Splunk MCP client,
runs `Investigator` / `MultiAgentInvestigator` exactly as the CLI does, and forwards
each structured event the engine yields to the browser as a Server-Sent Event. The
web dashboard renders that real stream.

Endpoints
  POST /api/investigate          → SSE: the live investigation event feed
  POST /api/respond              → SSE: the response/containment feed (human-gated)
  POST /api/respond/decision     → approve/deny a single proposed response action
  POST /api/splunk/alert         → Splunk saved-search alert action callback
  GET  /api/splunk/alert/{id}    → background alert-investigation job status
  GET  /api/cases                → recorded cases (institutional memory)
  GET  /api/detections           → auto-deployed detections (self-hardening loop)
  GET  /api/blocklist            → active threat blocklist
  GET  /api/health               → liveness + provider/model + MCP reachability
"""
from __future__ import annotations

import asyncio
import json
import uuid
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from .agent import Investigator, MultiAgentInvestigator
from .config import get_settings
from .connectors import ResponseEngine
from .mcp_client import SplunkMCPClient

app = FastAPI(title="Argus", version="0.1.0", description="Autonomous SOC investigation agent")

# The dashboard is a separate Next.js dev server (and any static export). SSE doesn't
# use cookies, so a permissive CORS policy is safe and avoids local-port friction.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _client() -> SplunkMCPClient:
    s = get_settings()
    return SplunkMCPClient(
        s.splunk_mcp_url, s.splunk_token, s.splunk_verify_ssl, s.request_timeout
    )


def _sse(event: dict[str, Any]) -> dict[str, str]:
    """Render an engine event as an SSE message (named by its `type`)."""
    return {"event": str(event.get("type", "message")), "data": json.dumps(event, default=str)}


# ---------------------------------------------------------------------------
# Investigation stream
# ---------------------------------------------------------------------------
class InvestigateBody(BaseModel):
    alert: str
    multi: bool = False
    max_turns: int = 12


@app.post("/api/investigate")
async def investigate(body: InvestigateBody, request: Request) -> EventSourceResponse:
    """Run a real autonomous investigation and stream every engine event."""

    async def gen() -> AsyncIterator[dict[str, str]]:
        yield _sse({"type": "stream_open", "mode": "multi" if body.multi else "single"})
        try:
            async with _client() as c:
                inv: Investigator | MultiAgentInvestigator = (
                    MultiAgentInvestigator(c) if body.multi else Investigator(c)
                )
                stream = (
                    inv.investigate(body.alert, max_turns_each=body.max_turns)
                    if body.multi
                    else inv.investigate(body.alert, max_turns=body.max_turns)
                )
                async for ev in stream:
                    if await request.is_disconnected():
                        break
                    yield _sse(ev)
        except Exception as exc:  # surface the failure to the UI rather than hanging
            yield _sse({"type": "error", "text": f"{type(exc).__name__}: {exc}"})
        finally:
            yield _sse({"type": "stream_end"})

    return EventSourceResponse(gen())


# ---------------------------------------------------------------------------
# Response / containment stream — with a real human-approval gate over HTTP
# ---------------------------------------------------------------------------
# Each in-flight response stream keeps a registry of futures, one per proposed
# action, that the browser resolves by POSTing an approve/deny decision.
_SESSIONS: dict[str, dict[str, asyncio.Future[bool]]] = {}
_APPROVAL_TIMEOUT = 600.0  # seconds an operator has to decide before auto-deny


class RespondBody(BaseModel):
    report: dict[str, Any]
    mode: str = "approve"  # "approve" = human-gated each action, "auto" = execute all
    case_id: str | None = None


class DecisionBody(BaseModel):
    stream_id: str
    action_id: str
    approved: bool


@app.post("/api/respond")
async def respond(body: RespondBody, request: Request) -> EventSourceResponse:
    """Run the response phase. In `approve` mode each proposed action is emitted as
    an `action_proposed` event and execution blocks until the browser POSTs a
    decision to /api/respond/decision."""
    stream_id = uuid.uuid4().hex
    queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
    pending: dict[str, asyncio.Future[bool]] = {}
    _SESSIONS[stream_id] = pending

    async def approver(desc: str, args: dict[str, Any]) -> bool:
        action_id = uuid.uuid4().hex
        fut: asyncio.Future[bool] = asyncio.get_event_loop().create_future()
        pending[action_id] = fut
        await queue.put(
            {
                "type": "action_proposed",
                "stream_id": stream_id,
                "action_id": action_id,
                "desc": desc,
                "input": args,
            }
        )
        try:
            return await asyncio.wait_for(fut, timeout=_APPROVAL_TIMEOUT)
        except asyncio.TimeoutError:
            return False
        finally:
            pending.pop(action_id, None)

    async def runner() -> None:
        try:
            async with _client() as c:
                inv = Investigator(c)
                async for ev in inv.respond(
                    body.report, mode=body.mode, approver=approver, case_id=body.case_id
                ):
                    await queue.put(ev)
        except Exception as exc:
            await queue.put({"type": "error", "text": f"{type(exc).__name__}: {exc}"})
        finally:
            await queue.put({"type": "_done"})

    async def gen() -> AsyncIterator[dict[str, str]]:
        yield _sse({"type": "stream_open", "stream_id": stream_id})
        task = asyncio.create_task(runner())
        try:
            while True:
                ev = await queue.get()
                if ev.get("type") == "_done":
                    break
                yield _sse(ev)
        finally:
            task.cancel()
            _SESSIONS.pop(stream_id, None)
            yield _sse({"type": "stream_end"})

    return EventSourceResponse(gen())


@app.post("/api/respond/decision")
async def respond_decision(body: DecisionBody) -> dict[str, Any]:
    """Resolve a single pending response action (approve/deny)."""
    pending = _SESSIONS.get(body.stream_id)
    if not pending or body.action_id not in pending:
        return {"ok": False, "error": "unknown or already-resolved action"}
    fut = pending[body.action_id]
    if not fut.done():
        fut.set_result(bool(body.approved))
    return {"ok": True, "approved": bool(body.approved)}


# ---------------------------------------------------------------------------
# Splunk saved-search / custom alert-action callback
# ---------------------------------------------------------------------------
class SplunkAlertBody(BaseModel):
    """Normalized payload posted by the Argus Splunk custom alert action.

    The action script sends these fields from Splunk's alert-action JSON. The
    model also accepts direct/manual posts, which keeps the endpoint easy to
    smoke-test with curl.
    """

    alert: str | None = None
    search_name: str | None = None
    app: str | None = None
    owner: str | None = None
    sid: str | None = None
    result: dict[str, Any] | None = None
    results: list[dict[str, Any]] | None = None
    results_link: str | None = None
    auto_respond: bool = False
    multi: bool = False
    max_turns: int = 8


_ALERT_JOBS: dict[str, dict[str, Any]] = {}


def _authorized_alert_request(request: Request) -> bool:
    token = get_settings().argus_alert_token
    if not token:
        return True
    auth = request.headers.get("authorization", "")
    header_token = request.headers.get("x-argus-token", "")
    return auth == f"Bearer {token}" or header_token == token


def _build_alert_text(body: SplunkAlertBody) -> str:
    if body.alert and body.alert.strip():
        return body.alert.strip()
    rows = body.results or ([body.result] if body.result else [])
    preview = json.dumps(rows[:5], default=str)[:2000] if rows else "(no rows provided)"
    parts = [
        "A Splunk saved-search alert fired and should be investigated end to end.",
        f"search_name={body.search_name or 'unknown'}",
        f"app={body.app or 'unknown'}",
        f"owner={body.owner or 'unknown'}",
        f"sid={body.sid or 'unknown'}",
    ]
    if body.results_link:
        parts.append(f"results_link={body.results_link}")
    parts.append(f"alert_rows={preview}")
    return "\n".join(parts)


async def _run_splunk_alert_job(job_id: str, body: SplunkAlertBody) -> None:
    job = _ALERT_JOBS[job_id]
    job["status"] = "running"
    alert_text = _build_alert_text(body)
    try:
        async with _client() as c:
            inv: Investigator | MultiAgentInvestigator = (
                MultiAgentInvestigator(c) if body.multi else Investigator(c)
            )
            report: dict[str, Any] | None = None
            events = 0
            stream = (
                inv.investigate(alert_text, max_turns_each=body.max_turns)
                if body.multi
                else inv.investigate(alert_text, max_turns=body.max_turns)
            )
            async for ev in stream:
                events += 1
                if ev.get("type") == "report":
                    report = ev.get("report")
            if report is None:
                job.update({"status": "error", "error": "investigation produced no report"})
                return

            case_id = f"ARGUS-SPLUNK-{uuid.uuid4().hex[:8].upper()}"
            if body.auto_respond:
                response_events: list[dict[str, Any]] = []
                async for rev in inv.respond(report, mode="auto", case_id=case_id):
                    response_events.append(rev)
                job.update(
                    {
                        "status": "done",
                        "case_id": case_id,
                        "report": report,
                        "events": events,
                        "response_events": response_events,
                    }
                )
            else:
                engine = ResponseEngine(get_settings(), c)
                try:
                    case = await engine.create_case(report, case_id)
                finally:
                    await engine.aclose()
                job.update(
                    {
                        "status": "done",
                        "case_id": case_id,
                        "case_key": case.get("key"),
                        "report": report,
                        "events": events,
                    }
                )
    except Exception as exc:
        job.update({"status": "error", "error": f"{type(exc).__name__}: {exc}"})


@app.post("/api/splunk/alert")
async def splunk_alert(body: SplunkAlertBody, request: Request) -> dict[str, Any]:
    """Accept a Splunk saved-search/custom-alert callback and investigate it.

    Returns immediately with a job id so Splunk's alert action does not block for
    the full LLM investigation.
    """
    if not _authorized_alert_request(request):
        return {"ok": False, "error": "unauthorized"}
    body.max_turns = max(1, min(int(body.max_turns), 24))
    job_id = f"splunk-{uuid.uuid4().hex[:12]}"
    _ALERT_JOBS[job_id] = {
        "ok": True,
        "job_id": job_id,
        "status": "queued",
        "search_name": body.search_name,
        "sid": body.sid,
        "auto_respond": body.auto_respond,
    }
    asyncio.create_task(_run_splunk_alert_job(job_id, body))
    return _ALERT_JOBS[job_id]


@app.get("/api/splunk/alert/{job_id}")
async def splunk_alert_status(job_id: str) -> dict[str, Any]:
    """Return status for a background Splunk alert investigation job."""
    return _ALERT_JOBS.get(job_id) or {"ok": False, "error": "unknown job_id"}


@app.get("/api/splunk/alerts")
async def splunk_alert_jobs() -> dict[str, Any]:
    """Return alert-action jobs known to this Argus bridge process."""
    jobs = sorted(_ALERT_JOBS.values(), key=lambda j: j.get("job_id", ""), reverse=True)
    return {"ok": True, "jobs": jobs}


# ---------------------------------------------------------------------------
# Institutional memory & self-hardening — read endpoints
# ---------------------------------------------------------------------------
async def _engine_list(method: str) -> list[dict[str, Any]]:
    async with _client() as c:
        engine = ResponseEngine(get_settings(), c)
        try:
            return await getattr(engine, method)()
        finally:
            await engine.aclose()


@app.get("/api/cases")
async def cases() -> dict[str, Any]:
    """The cases Argus has recorded — its institutional memory."""
    try:
        return {"cases": await _engine_list("list_cases")}
    except Exception as exc:
        return {"cases": [], "error": f"{type(exc).__name__}: {exc}"}


@app.get("/api/detections")
async def detections() -> dict[str, Any]:
    """The detections Argus auto-deployed (the self-hardening loop's output)."""
    try:
        return {"detections": await _engine_list("list_detections")}
    except Exception as exc:
        return {"detections": [], "error": f"{type(exc).__name__}: {exc}"}


@app.get("/api/detections/run")
async def run_detections(
    name: str = "",
    earliest: str = "",
    latest: str = "",
    limit: int = 20,
) -> dict[str, Any]:
    """Run Argus-authored detections on demand through MCP."""
    try:
        async with _client() as c:
            engine = ResponseEngine(get_settings(), c)
            try:
                return await engine.run_deployed_detections(
                    name=name,
                    earliest=earliest or None,
                    latest=latest or None,
                    row_limit=limit,
                )
            finally:
                await engine.aclose()
    except Exception as exc:
        return {"ok": False, "error": f"{type(exc).__name__}: {exc}", "runs": []}


@app.get("/api/blocklist")
async def blocklist() -> dict[str, Any]:
    """The active KV-store threat blocklist a correlation search enforces."""
    try:
        return {"blocklist": await _engine_list("list_blocklist")}
    except Exception as exc:
        return {"blocklist": [], "error": f"{type(exc).__name__}: {exc}"}


@app.get("/api/eval")
async def eval_results() -> dict[str, Any]:
    """The committed benchmark results (eval/results.json) — the eval harness output."""
    try:
        path = Path(__file__).resolve().parents[2] / "eval" / "results.json"
        return json.loads(path.read_text())
    except Exception as exc:
        return {"summary": None, "per_scenario": [], "results": [], "error": f"{type(exc).__name__}: {exc}"}


@app.get("/api/health")
async def health() -> dict[str, Any]:
    """Liveness + provider/model, and whether the Splunk MCP chain is reachable."""
    s = get_settings()
    info: dict[str, Any] = {
        "ok": True,
        "provider": s.provider,
        "model": s.resolved_model,
        "splunk_mcp_url": s.splunk_mcp_url,
        "mcp": "unknown",
    }
    try:
        async with _client() as c:
            info["mcp"] = "connected"
            info["mcp_tools"] = len(c.tools)
            info["mcp_server"] = c.server_info.get("serverInfo", {})
    except Exception as exc:
        info["mcp"] = "unreachable"
        info["mcp_error"] = f"{type(exc).__name__}: {exc}"
    return info


def serve(host: str = "127.0.0.1", port: int = 8010, reload: bool = False) -> None:
    """Run the Argus streaming bridge (used by `argus serve`)."""
    import uvicorn

    uvicorn.run("argus.server:app", host=host, port=port, reload=reload, log_level="info")
