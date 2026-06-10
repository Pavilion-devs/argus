"""
Real response/containment connectors for Argus.

Every method here performs a real action against a real system:
  - block_indicator / create_case: write to Splunk KV-store collections via the
    authenticated REST API (argus_response app).
  - run_enforcement: run the blocklist-enforcement search against live data
    through the MCP server (read-only, MCP-native).
  - notify_slack / create_ticket: real Slack webhook / Jira REST calls.

Nothing here is simulated; if an integration isn't configured (no Slack/Jira
creds), the method says so honestly rather than pretending to have fired.
"""
from __future__ import annotations

import base64
import json
import re
from datetime import datetime, timezone
from typing import Any, Optional

import httpx

from .config import Settings
from .mcp_client import SplunkMCPClient

_KV_PATH = "/servicesNS/nobody/argus_response/storage/collections/data/{collection}"
_SAVED_SEARCHES_PATH = "/servicesNS/nobody/argus_response/saved/searches"
_DETECTION_PREFIX = "Argus - Auto:"

# SPL commands that write/mutate/execute — a deployed detection must be read-only.
_FORBIDDEN_SPL = (
    "outputlookup", "outputcsv", "delete", "collect", "tscollect", "mcollect",
    "meventcollect", "sendalert", "runshellscript", "script", "crawl", "dump",
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _is_read_only_spl(spl: str) -> tuple[bool, str]:
    """Reject SPL that could write, mutate, or execute — a detection only reads."""
    text = (spl or "").strip()
    if not text:
        return False, "empty search"
    low = " " + text.lower().replace("\n", " ") + " "
    for cmd in _FORBIDDEN_SPL:
        if re.search(r"\|\s*" + re.escape(cmd) + r"\b", low) or low.lstrip().startswith(cmd + " "):
            return False, f"forbidden command: {cmd}"
    return True, ""


def _safe_json_list(raw: Any) -> list[Any]:
    if isinstance(raw, list):
        return raw
    if isinstance(raw, str) and raw.strip():
        try:
            val = json.loads(raw)
            return val if isinstance(val, list) else [val]
        except Exception:
            return []
    return []


class ResponseEngine:
    """Executes real containment/response actions."""

    def __init__(self, settings: Settings, mcp: Optional[SplunkMCPClient] = None) -> None:
        self.settings = settings
        self.mcp = mcp
        self._http = httpx.AsyncClient(verify=settings.splunk_verify_ssl, timeout=30.0)

    async def aclose(self) -> None:
        await self._http.aclose()

    # ---- Splunk KV-store writes (real) -------------------------------------
    async def _kv_insert(self, collection: str, row: dict[str, Any]) -> str:
        url = self.settings.splunk_base_url + _KV_PATH.format(collection=collection)
        resp = await self._http.post(
            url,
            headers={
                "Authorization": f"Bearer {self.settings.splunk_token}",
                "Content-Type": "application/json",
            },
            content=json.dumps(row),
        )
        resp.raise_for_status()
        return resp.json().get("_key", "")

    async def block_indicator(
        self,
        indicator: str,
        indicator_type: str,
        reason: str,
        severity: str = "high",
        case_id: str = "",
        added_by: str = "argus",
    ) -> dict[str, Any]:
        """Add an indicator (IP/user/domain/hash) to the real KV-store blocklist."""
        key = await self._kv_insert(
            "argus_threat_blocklist",
            {
                "indicator": indicator,
                "type": indicator_type,
                "reason": reason,
                "severity": severity,
                "case_id": case_id,
                "added_by": added_by,
                "added_at": _now_iso(),
            },
        )
        return {"ok": True, "key": key, "indicator": indicator, "collection": "argus_threat_blocklist"}

    async def create_case(self, report: dict[str, Any], case_id: str) -> dict[str, Any]:
        """Persist the investigation as a real case/notable record in KV store."""
        key = await self._kv_insert(
            "argus_cases",
            {
                "case_id": case_id,
                "title": report.get("title", "")[:1000],
                "verdict": report.get("verdict", ""),
                "severity": report.get("severity", ""),
                "confidence": float(report.get("confidence", 0) or 0),
                "risk_score": int(report.get("risk_score", 0) or 0),
                "risk_band": report.get("risk_band", ""),
                "summary": report.get("summary", "")[:5000],
                "entities": json.dumps(report.get("affected_entities", []))[:5000],
                "iocs": json.dumps(report.get("iocs", []))[:5000],
                "created_at": _now_iso(),
                "status": "open",
            },
        )
        return {"ok": True, "key": key, "case_id": case_id, "collection": "argus_cases"}

    async def _kv_list(self, collection: str) -> list[dict[str, Any]]:
        url = self.settings.splunk_base_url + _KV_PATH.format(collection=collection)
        resp = await self._http.get(
            url,
            headers={"Authorization": f"Bearer {self.settings.splunk_token}"},
            params={"output_mode": "json"},
        )
        resp.raise_for_status()
        return resp.json()

    async def list_blocklist(self) -> list[dict[str, Any]]:
        return await self._kv_list("argus_threat_blocklist")

    async def list_cases(self) -> list[dict[str, Any]]:
        return await self._kv_list("argus_cases")

    # ---- Institutional memory (recall) -------------------------------------
    async def recall(
        self, indicators: list[str], keywords: Optional[list[str]] = None
    ) -> dict[str, Any]:
        """Search Argus's case memory + active blocklist for prior knowledge about
        the given indicators. Exact (case-insensitive) indicator matching avoids
        false overlaps; keywords additionally match past case titles/summaries."""
        inds = {str(i).strip().lower() for i in (indicators or []) if str(i).strip()}
        kws = [k.strip().lower() for k in (keywords or []) if k.strip()]
        blocklist_hits: list[dict[str, Any]] = []
        related: list[dict[str, Any]] = []
        if not inds and not kws:
            return {"indicators_checked": [], "blocklist_hits": [], "related_cases": []}

        try:
            for row in await self.list_blocklist():
                val = (row.get("indicator") or "").strip().lower()
                if val and val in inds:
                    blocklist_hits.append({
                        "indicator": row.get("indicator"),
                        "type": row.get("type"),
                        "reason": row.get("reason"),
                        "severity": row.get("severity"),
                        "case_id": row.get("case_id"),
                        "added_at": row.get("added_at"),
                    })
        except Exception:
            pass

        try:
            for c in await self.list_cases():
                pool = {
                    str(x).strip().lower()
                    for x in _safe_json_list(c.get("iocs"))
                    + [e.get("value") for e in _safe_json_list(c.get("entities")) if isinstance(e, dict)]
                    if x
                }
                overlap = sorted(inds & pool)
                blob = f"{c.get('title','')} {c.get('summary','')}".lower()
                kw_hit = [k for k in kws if k in blob]
                if overlap or kw_hit:
                    related.append({
                        "case_id": c.get("case_id"),
                        "verdict": c.get("verdict"),
                        "severity": c.get("severity"),
                        "title": c.get("title"),
                        "created_at": c.get("created_at"),
                        "overlap": overlap,
                        "keyword_match": kw_hit,
                    })
        except Exception:
            pass

        related.sort(key=lambda r: r.get("created_at", ""), reverse=True)
        return {
            "indicators_checked": sorted(inds),
            "blocklist_hits": blocklist_hits,
            "related_cases": related,
        }

    # ---- Self-hardening: deploy a real Splunk detection (detection-as-code) -
    async def deploy_detection(
        self,
        name: str,
        search: str,
        *,
        description: str = "",
        cron_schedule: str = "*/10 * * * *",
        earliest: str = "-65m@m",
        rationale: str = "",
        case_id: str = "",
    ) -> dict[str, Any]:
        """Install a NEW scheduled correlation search in the argus_response app via
        the Splunk REST API, so Splunk auto-alerts if this attack pattern recurs.
        The SPL is validated read-only before deployment."""
        ok, why = _is_read_only_spl(search)
        if not ok:
            return {"ok": False, "error": f"refused unsafe detection SPL ({why})"}
        full = name if name.startswith(_DETECTION_PREFIX) else f"{_DETECTION_PREFIX} {name}"
        body = {
            "name": full,
            "search": search,
            "description": (description or rationale or "")[:1000]
            + (f"  [argus_case={case_id}]" if case_id else ""),
            "cron_schedule": cron_schedule or "*/10 * * * *",
            "is_scheduled": "1",
            "dispatch.earliest_time": earliest,
            "dispatch.latest_time": "now",
            "alert_type": "number of events",
            "alert_comparator": "greater than",
            "alert_threshold": "0",
            "alert.track": "1",
            "alert.severity": "4",
        }
        headers = {"Authorization": f"Bearer {self.settings.splunk_token}"}
        url = self.settings.splunk_base_url + _SAVED_SEARCHES_PATH
        resp = await self._http.post(url, headers=headers, params={"output_mode": "json"}, data=body)
        if resp.status_code == 409:  # already exists — update it in place
            edit = {k: v for k, v in body.items() if k != "name"}
            resp = await self._http.post(
                f"{url}/{full}", headers=headers, params={"output_mode": "json"}, data=edit
            )
        ok = resp.status_code < 300
        return {
            "ok": ok,
            "status": resp.status_code,
            "name": full,
            "detail": None if ok else resp.text[:300],
        }

    async def list_detections(self) -> list[dict[str, Any]]:
        """List the detections Argus has auto-deployed (saved searches it created)."""
        headers = {"Authorization": f"Bearer {self.settings.splunk_token}"}
        url = self.settings.splunk_base_url + _SAVED_SEARCHES_PATH
        resp = await self._http.get(
            url, headers=headers, params={"output_mode": "json", "count": "0", "search": _DETECTION_PREFIX}
        )
        resp.raise_for_status()
        out: list[dict[str, Any]] = []
        for entry in resp.json().get("entry", []):
            if not entry.get("name", "").startswith(_DETECTION_PREFIX):
                continue
            content = entry.get("content", {})
            out.append({
                "name": entry.get("name"),
                "search": content.get("search", ""),
                "cron_schedule": content.get("cron_schedule", ""),
                "is_scheduled": content.get("is_scheduled"),
                "description": content.get("description", ""),
            })
        return out

    # ---- Enforcement (MCP-native, read-only) -------------------------------
    async def run_enforcement(self) -> dict[str, Any]:
        """Run the blocklist-enforcement logic against live Splunk data through MCP."""
        if self.mcp is None:
            return {"ok": False, "error": "no MCP client available"}
        spl = (
            "index=botsv3 "
            "| eval argus_indicator=coalesce(src_ip, dest_ip, src, dest, sourceIPAddress, user) "
            "| search argus_indicator=* "
            "| lookup argus_threat_blocklist indicator AS argus_indicator "
            "OUTPUT reason AS argus_reason severity AS argus_severity case_id AS argus_case_id "
            "| where isnotnull(argus_reason) "
            "| stats count AS event_count values(sourcetype) AS sourcetypes "
            "by argus_indicator argus_reason argus_severity argus_case_id"
        )
        result = await self.mcp.run_query(spl, earliest_time="0", latest_time="now", row_limit=100)
        return {"ok": True, "matches": self.mcp.text_content(result)}

    # ---- External integrations (real) --------------------------------------
    async def notify_slack(self, message: str) -> dict[str, Any]:
        if not self.settings.slack_webhook_url:
            return {"ok": False, "skipped": True, "reason": "SLACK_WEBHOOK_URL not configured"}
        resp = await self._http.post(self.settings.slack_webhook_url, json={"text": message})
        return {"ok": resp.status_code < 300, "status": resp.status_code}

    async def create_ticket(self, summary: str, description: str) -> dict[str, Any]:
        s = self.settings
        if not (s.jira_base_url and s.jira_email and s.jira_api_token):
            return {"ok": False, "skipped": True, "reason": "Jira not configured"}
        auth = base64.b64encode(f"{s.jira_email}:{s.jira_api_token}".encode()).decode()
        resp = await self._http.post(
            s.jira_base_url.rstrip("/") + "/rest/api/2/issue",
            headers={"Authorization": f"Basic {auth}", "Content-Type": "application/json"},
            content=json.dumps(
                {
                    "fields": {
                        "project": {"key": s.jira_project_key},
                        "summary": summary[:255],
                        "description": description,
                        "issuetype": {"name": "Task"},
                    }
                }
            ),
        )
        ok = resp.status_code < 300
        return {"ok": ok, "status": resp.status_code, "key": resp.json().get("key") if ok else None}
