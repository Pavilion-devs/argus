import pytest

from argus.config import Settings
from argus.connectors import ResponseEngine, _is_read_only_spl


def test_read_only_spl_allows_normal_search() -> None:
    ok, why = _is_read_only_spl(
        "search index=botsv3 sourcetype=aws:cloudtrail "
        "| stats count by sourceIPAddress userIdentity.userName"
    )

    assert ok is True
    assert why == ""


def test_read_only_spl_blocks_mutating_pipeline_command() -> None:
    ok, why = _is_read_only_spl("search index=botsv3 | outputlookup argus_threat_blocklist")

    assert ok is False
    assert why == "forbidden command: outputlookup"


def test_read_only_spl_blocks_mutating_first_command() -> None:
    ok, why = _is_read_only_spl("delete index=botsv3")

    assert ok is False
    assert why == "forbidden command: delete"


class FakeMCP:
    def __init__(self, text: str = '{"results": [{"count": "1"}]}', fail: bool = False) -> None:
        self.text = text
        self.fail = fail
        self.calls = []

    async def run_query(self, spl: str, earliest_time: str, latest_time: str, row_limit: int):
        self.calls.append((spl, earliest_time, latest_time, row_limit))
        if self.fail:
            raise RuntimeError("bad spl")
        return {"content": [{"type": "text", "text": self.text}]}

    def text_content(self, _result):
        return self.text


@pytest.mark.asyncio
async def test_deploy_detection_stops_when_mcp_dry_run_fails() -> None:
    engine = ResponseEngine(Settings(SPLUNK_TOKEN="token"), FakeMCP(fail=True))
    try:
        result = await engine.deploy_detection("Demo", "search index=botsv3 | stats count")
    finally:
        await engine.aclose()

    assert result["ok"] is False
    assert "dry-run" in result["error"]
    assert result["dry_run"] == {"checked": True, "ok": False}


@pytest.mark.asyncio
async def test_run_deployed_detections_executes_saved_searches(monkeypatch) -> None:
    mcp = FakeMCP('{"results": [{"sourceIPAddress": "139.198.18.205"}]}')
    engine = ResponseEngine(Settings(SPLUNK_TOKEN="token"), mcp)

    async def fake_list():
        return [
            {
                "name": "Argus - Auto: Demo",
                "description": "AWS demo",
                "search": "search index=botsv3 | head 1",
                "dispatch_earliest_time": "0",
                "dispatch_latest_time": "now",
            }
        ]

    monkeypatch.setattr(engine, "list_detections", fake_list)
    try:
        result = await engine.run_deployed_detections(name="demo", row_limit=5)
    finally:
        await engine.aclose()

    assert result["ok"] is True
    assert result["detections_checked"] == 1
    assert result["detections_matched"] == 1
    assert result["runs"][0]["match_count"] == 1
    assert mcp.calls == [("search index=botsv3 | head 1", "0", "now", 5)]
