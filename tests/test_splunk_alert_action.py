from __future__ import annotations

import importlib.util
from pathlib import Path

from argus.server import SplunkAlertBody, _build_alert_text


def _load_alert_action_module():
    path = Path(__file__).resolve().parents[1] / "splunk" / "argus_response" / "bin" / "argus_investigate.py"
    spec = importlib.util.spec_from_file_location("argus_investigate_action", path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_build_alert_text_prefers_explicit_alert() -> None:
    body = SplunkAlertBody(alert="Investigate this exact notable", search_name="ignored")

    assert _build_alert_text(body) == "Investigate this exact notable"


def test_build_alert_text_includes_saved_search_context() -> None:
    body = SplunkAlertBody(
        search_name="Argus - Demo",
        app="argus_response",
        owner="admin",
        sid="scheduler__admin__search__RMD",
        result={"sourceIPAddress": "139.198.18.205", "count": "637"},
    )

    text = _build_alert_text(body)

    assert "Splunk saved-search alert fired" in text
    assert "search_name=Argus - Demo" in text
    assert "sourceIPAddress" in text
    assert "139.198.18.205" in text


def test_alert_action_body_normalizes_configuration() -> None:
    mod = _load_alert_action_module()
    payload = {
        "configuration": {
            "auto_respond": "1",
            "multi": "true",
            "max_turns": "9",
        },
        "search_name": "Demo",
        "app": "argus_response",
        "owner": "admin",
        "sid": "123",
        "result": {"sourceIPAddress": "139.198.18.205"},
    }

    body = mod._body(payload, payload["configuration"])

    assert body["search_name"] == "Demo"
    assert body["auto_respond"] is True
    assert body["multi"] is True
    assert body["max_turns"] == 9
    assert body["result"] == {"sourceIPAddress": "139.198.18.205"}
