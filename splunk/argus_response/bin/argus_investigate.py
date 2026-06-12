#!/usr/bin/env python3
"""Splunk custom alert action: send an alert payload to Argus.

Splunk invokes custom alert actions with a JSON payload on stdin. This script
normalizes the useful fields and posts them to `argus serve` at
POST /api/splunk/alert. It exits after Argus accepts the job; the LLM
investigation runs asynchronously in Argus so Splunk is not blocked for minutes.
"""
from __future__ import annotations

import csv
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

DEFAULT_ARGUS_URL = "http://127.0.0.1:8010/api/splunk/alert"


def _log(message: str) -> None:
    print(f"argus_investigate: {message}", file=sys.stderr)


def _truthy(value: Any) -> bool:
    return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}


def _read_stdin_json() -> dict[str, Any]:
    raw = sys.stdin.read()
    if not raw.strip():
        return {}
    try:
        value = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise SystemExit(f"invalid alert action JSON on stdin: {exc}") from exc
    return value if isinstance(value, dict) else {}


def _config(payload: dict[str, Any]) -> dict[str, Any]:
    cfg = payload.get("configuration") or payload.get("config") or {}
    if not isinstance(cfg, dict):
        cfg = {}
    return cfg


def _read_results_file(path: str | None, limit: int = 10) -> list[dict[str, Any]]:
    if not path:
        return []
    p = Path(path)
    if not p.exists() or not p.is_file():
        return []
    try:
        with p.open(newline="") as fh:
            return [row for _, row in zip(range(limit), csv.DictReader(fh))]
    except Exception as exc:
        _log(f"could not read results_file={path}: {exc}")
        return []


def _first_result(payload: dict[str, Any]) -> dict[str, Any] | None:
    result = payload.get("result")
    return result if isinstance(result, dict) else None


def _body(payload: dict[str, Any], cfg: dict[str, Any]) -> dict[str, Any]:
    results = _read_results_file(
        payload.get("results_file") or payload.get("resultsFile") or payload.get("results_path")
    )
    result = _first_result(payload)
    return {
        "search_name": payload.get("search_name") or payload.get("searchName"),
        "app": payload.get("app"),
        "owner": payload.get("owner"),
        "sid": payload.get("sid"),
        "results_link": payload.get("results_link") or payload.get("resultsLink"),
        "result": result,
        "results": results,
        "auto_respond": _truthy(cfg.get("auto_respond") or cfg.get("param.auto_respond")),
        "multi": _truthy(cfg.get("multi") or cfg.get("param.multi")),
        "max_turns": int(cfg.get("max_turns") or cfg.get("param.max_turns") or 8),
    }


def _post(url: str, token: str, body: dict[str, Any]) -> dict[str, Any]:
    data = json.dumps(body).encode("utf-8")
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
        headers["X-Argus-Token"] = token
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            text = resp.read().decode("utf-8", errors="replace")
            parsed = json.loads(text) if text else {}
            return parsed if isinstance(parsed, dict) else {"ok": True, "response": parsed}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"Argus returned HTTP {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise SystemExit(f"could not reach Argus at {url}: {exc}") from exc


def main() -> int:
    payload = _read_stdin_json()
    cfg = _config(payload)
    url = (
        cfg.get("argus_url")
        or cfg.get("param.argus_url")
        or os.environ.get("ARGUS_ALERT_URL")
        or DEFAULT_ARGUS_URL
    )
    token = (
        cfg.get("argus_token")
        or cfg.get("param.argus_token")
        or os.environ.get("ARGUS_ALERT_TOKEN")
        or ""
    )
    body = _body(payload, cfg)
    if not body.get("result") and not body.get("results"):
        _log("no alert results were included; Argus will investigate from alert metadata only")
    response = _post(str(url), str(token), body)
    if not response.get("ok"):
        raise SystemExit(f"Argus rejected alert action: {json.dumps(response)}")
    _log(f"accepted by Argus job_id={response.get('job_id')} status={response.get('status')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
