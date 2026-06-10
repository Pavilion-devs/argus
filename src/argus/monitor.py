"""
Continuous monitoring: poll a Splunk detection, and auto-investigate each NEW
notable it surfaces — the always-on SOC loop. Every auto-investigation is recorded
as a case (and optionally contained).
"""
from __future__ import annotations

import asyncio
import json
import uuid
from collections.abc import AsyncIterator

from .agent import Investigator
from .config import Settings, get_settings
from .connectors import ResponseEngine
from .mcp_client import SplunkMCPClient

# Default detection: AWS API calls that were denied/throttled (attacker recon /
# resource-hijacking signature), grouped by source IP — each row is a notable.
DEFAULT_DETECTION = (
    'index=botsv3 sourcetype=aws:cloudtrail '
    '(errorCode="Client.UnauthorizedOperation" OR errorCode="AccessDenied" '
    'OR errorCode="Client.InstanceLimitExceeded") '
    "| stats count values(eventName) as events by sourceIPAddress "
    "| where count > 20 | sort - count | head 5"
)
DEFAULT_KEY = "sourceIPAddress"


async def watch(
    mcp: SplunkMCPClient,
    settings: Settings | None = None,
    *,
    detection: str = DEFAULT_DETECTION,
    key: str = DEFAULT_KEY,
    interval: float = 0.0,
    max_iterations: int = 1,
    auto_respond: bool = False,
    max_turns: int = 8,
) -> AsyncIterator[dict]:
    settings = settings or get_settings()
    engine = ResponseEngine(settings, mcp)
    seen: set[str] = set()
    try:
        for iteration in range(max_iterations):
            res = await mcp.run_query(
                detection, earliest_time="0", latest_time="now", row_limit=50
            )
            data = json.loads(mcp.text_content(res) or "{}")
            rows = data.get("results", [])
            new_rows = [r for r in rows if r.get(key) and r[key] not in seen]
            yield {
                "type": "poll",
                "iteration": iteration + 1,
                "total": len(rows),
                "new": len(new_rows),
            }

            for row in new_rows:
                kv = row[key]
                seen.add(kv)
                yield {"type": "notable", "key": kv, "row": row}
                alert = (
                    f"A SOC detection fired on {key}={kv}. Detection row: "
                    f"{json.dumps(row)[:400]}. Investigate this notable end to end and "
                    "determine whether it is a true threat."
                )
                inv = Investigator(mcp, settings)
                report = None
                async for ev in inv.investigate(alert, max_turns=max_turns):
                    ev["notable"] = kv
                    if ev["type"] == "report":
                        report = ev["report"]
                    yield ev

                if report is None:
                    continue
                case_id = f"ARGUS-{uuid.uuid4().hex[:8].upper()}"
                if auto_respond:
                    async for rev in inv.respond(report, mode="auto", case_id=case_id):
                        rev["notable"] = kv
                        yield rev
                else:
                    case = await engine.create_case(report, case_id)
                    yield {"type": "case_created", "case_id": case_id,
                           "key": case.get("key"), "notable": kv}

            if interval and iteration < max_iterations - 1:
                await asyncio.sleep(interval)
    finally:
        await engine.aclose()
