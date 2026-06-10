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
from datetime import datetime, timezone
from typing import Any, Optional

import httpx

from .config import Settings
from .mcp_client import SplunkMCPClient

_KV_PATH = "/servicesNS/nobody/argus_response/storage/collections/data/{collection}"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


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
