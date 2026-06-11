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


@app.get("/api/blocklist")
async def blocklist() -> dict[str, Any]:
    """The active KV-store threat blocklist a correlation search enforces."""
    try:
        return {"blocklist": await _engine_list("list_blocklist")}
    except Exception as exc:
        return {"blocklist": [], "error": f"{type(exc).__name__}: {exc}"}


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


def serve(host: str = "127.0.0.1", port: int = 8000, reload: bool = False) -> None:
    """Run the Argus streaming bridge (used by `argus serve`)."""
    import uvicorn

    uvicorn.run("argus.server:app", host=host, port=port, reload=reload, log_level="info")
