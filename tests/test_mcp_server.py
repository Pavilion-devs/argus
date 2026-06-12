import pytest

from argus.mcp_server import _compact_events, _parse_report


def test_compact_events_extracts_spl_queries_and_ledgers() -> None:
    events = [
        {
            "type": "tool_call",
            "id": "toolu_1",
            "name": "splunk_run_query",
            "agent": "",
            "input": {"query": "search index=botsv3 | head 1"},
        },
        {"type": "tool_result", "id": "toolu_1", "is_error": False, "text": "{}"},
        {
            "type": "hypothesis",
            "hypothesis": {"id": "h1", "status": "confirmed", "statement": "Compromise"},
        },
        {"type": "recall", "recall": {"related_cases": [], "blocklist_hits": []}},
    ]

    compact = _compact_events(events)

    assert compact["event_count"] == 4
    assert compact["spl_query_count"] == 1
    assert compact["spl_queries"][0]["id"] == "toolu_1"
    assert compact["spl_queries"][0]["ok"] is True
    assert compact["hypotheses"][0]["id"] == "h1"
    assert compact["recalls"][0]["related_cases"] == []


def test_parse_report_accepts_json_object() -> None:
    report = _parse_report('{"verdict": "true_positive", "confidence": 0.91}')

    assert report["verdict"] == "true_positive"
    assert report["confidence"] == 0.91


def test_parse_report_rejects_non_object_json() -> None:
    with pytest.raises(ValueError, match="decode to an object"):
        _parse_report('["not", "a", "report"]')
