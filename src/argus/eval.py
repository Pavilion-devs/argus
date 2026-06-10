"""
Evaluation harness for Argus.

Runs Argus against curated BOTS v3 scenarios with known ground truth and measures:
  - verdict accuracy        (incl. a benign control to test it doesn't cry wolf)
  - indicator recall        (did Argus surface the key ground-truth indicators?)
  - grounding precision      (does EVERY IOC Argus reports actually exist in the
                              Splunk data? — an automated "zero hallucination" check)
  - efficiency               (queries run, wall-clock per investigation)

Ground truth is self-validating: each expected indicator is verified to actually
exist in botsv3 before scoring, so we never score against a phantom.
"""
from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass, field

from .agent import Investigator
from .config import Settings, get_settings
from .mcp_client import SplunkMCPClient

_IP_RE = re.compile(r"^\d{1,3}(?:\.\d{1,3}){3}$")
_CONCRETE_RE = re.compile(r"^[A-Za-z0-9._:\-/]+$")


@dataclass
class Scenario:
    id: str
    alert: str
    expected_verdict: list[str]
    expected_indicators: list[str] = field(default_factory=list)


# Ground-truth indicators MUST be verified MALICIOUS against the data, not merely
# present. Each must be backed by an attack footprint (denied/abusive actions tied to
# the incident) — existence alone is NOT enough. Cautionary example: `34.215.24.225`
# was originally listed here as an "attacker IP"; investigation showed it is actually
# `arn:aws:iam::...:user/splunk_access` — the Splunk Add-on for AWS's own data-collection
# account (4040 benign read calls, zero malicious actions, never touched web_admin). It
# was scoring the agent DOWN for correctly NOT flagging benign infrastructure. Removed.
SCENARIOS: list[Scenario] = [
    Scenario(
        id="aws_cred_abuse",
        alert=(
            "AWS GuardDuty flagged anomalous IAM activity in the Frothly AWS account. "
            "Investigate whether AWS credentials were compromised, identify the attacker "
            "source IPs, and determine what actions they attempted."
        ),
        expected_verdict=["true_positive"],
        # web_admin: the compromised IAM account — the central IOC of this incident (637
        #   abusive calls incl. RunInstances cryptomining, all denied). 139.198.18.205:
        #   the primary attacker source IP (China/Yunify) driving those calls. Both are
        #   data-verified malicious. (Real secondary attacker IPs also present but not
        #   required for core recall: 35.153.154.221, 82.102.18.111, 209.107.196.112.)
        expected_indicators=["web_admin", "139.198.18.205"],
    ),
    Scenario(
        id="endpoint_malware",
        alert=(
            "Endpoint monitoring flagged a suspicious masquerading executable on a Frothly "
            "Windows host. Investigate for malware, identify the file and the affected host."
        ),
        expected_verdict=["true_positive"],
        # iexeplorer.exe: masquerading binary (typosquat of iexplore.exe) from a
        #   user-writable temp path; Sysmon EventID 1 shows a reverse shell + Apache
        #   Struts exploit + /etc/passwd read. Data-verified malicious.
        expected_indicators=["iexeplorer.exe"],
    ),
    Scenario(
        id="benign_dns_control",
        alert=(
            "An analyst flagged outbound DNS traffic to 8.8.8.8 from a workstation as "
            "potentially suspicious. Investigate whether this represents a real threat."
        ),
        expected_verdict=["false_positive", "inconclusive"],
        expected_indicators=[],
    ),
]


def _extract_iocs(report: dict) -> list[str]:
    vals: list[str] = list(report.get("iocs", []) or [])
    for ent in report.get("affected_entities", []) or []:
        v = ent.get("value")
        if v:
            vals.append(v)
    # de-dup preserving order
    seen: set[str] = set()
    out: list[str] = []
    for v in vals:
        v = str(v).strip()
        if v and v.lower() not in seen:
            seen.add(v.lower())
            out.append(v)
    return out


def _is_concrete(ioc: str) -> bool:
    return len(ioc) >= 4 and " " not in ioc and bool(_CONCRETE_RE.match(ioc))


def _matched(expected: str, iocs: list[str]) -> bool:
    exp = expected.lower()
    if _IP_RE.match(expected):
        return any(exp == i.lower() for i in iocs)
    return any(exp in i.lower() for i in iocs)


async def _count_in_botsv3(mcp: SplunkMCPClient, term: str) -> int:
    try:
        res = await mcp.run_query(
            f'search index=botsv3 "{term}" | head 1 | stats count',
            earliest_time="0", latest_time="now", row_limit=1,
        )
        data = json.loads(mcp.text_content(res) or "{}")
        rows = data.get("results", [])
        return int(rows[0].get("count", 0)) if rows else 0
    except Exception:
        return 0


async def validate_ground_truth(mcp: SplunkMCPClient) -> dict[str, list[str]]:
    """Confirm each expected indicator actually exists in botsv3 (self-validation).

    NOTE: existence is necessary but NOT sufficient — an indicator can exist and still be
    benign (see the `34.215.24.225` / splunk_access cautionary note at SCENARIOS). Ground
    truth must be curated from indicators verified MALICIOUS in the data; this check only
    guards against scoring an indicator that isn't in the dataset at all."""
    missing: dict[str, list[str]] = {}
    for sc in SCENARIOS:
        for ind in sc.expected_indicators:
            if await _count_in_botsv3(mcp, ind) == 0:
                missing.setdefault(sc.id, []).append(ind)
    return missing


async def grounding_precision(mcp: SplunkMCPClient, iocs: list[str]) -> tuple[int, int, list[str]]:
    """Fraction of Argus's concrete IOCs that actually appear in botsv3."""
    grounded = 0
    checked = 0
    ungrounded: list[str] = []
    for ioc in iocs:
        if not _is_concrete(ioc):
            continue
        checked += 1
        if await _count_in_botsv3(mcp, ioc) > 0:
            grounded += 1
        else:
            ungrounded.append(ioc)
    return grounded, checked, ungrounded


async def run_scenario(
    mcp: SplunkMCPClient, settings: Settings, sc: Scenario, *, max_turns: int
) -> dict:
    inv = Investigator(mcp, settings)
    t0 = time.monotonic()
    report: dict | None = None
    async for ev in inv.investigate(sc.alert, max_turns=max_turns):
        if ev["type"] == "report":
            report = ev["report"]
    duration = round(time.monotonic() - t0, 1)
    n_queries = sum(1 for e in inv.evidence if not e.is_error)

    if report is None:
        return {"id": sc.id, "error": "no report produced", "duration_s": duration}

    iocs = _extract_iocs(report)
    matched = [e for e in sc.expected_indicators if _matched(e, iocs)]
    recall = (len(matched) / len(sc.expected_indicators)) if sc.expected_indicators else None
    # Ground the FULL concrete IOC set the agent surfaced (iocs + entity values),
    # not just the `iocs` field — otherwise the headline zero-hallucination metric
    # silently checks nothing when the model files indicators under entities.
    grounded, checked, ungrounded = await grounding_precision(mcp, iocs)
    verdict_ok = report.get("verdict") in sc.expected_verdict

    return {
        "id": sc.id,
        "verdict": report.get("verdict"),
        "expected_verdict": sc.expected_verdict,
        "verdict_ok": verdict_ok,
        "severity": report.get("severity"),
        "confidence": report.get("confidence"),
        "risk_score": report.get("risk_score"),
        "risk_band": report.get("risk_band"),
        "kill_chain": [k.get("label") for k in report.get("kill_chain", []) or []],
        "mitre_invalid": report.get("mitre_invalid", []) or [],
        "indicator_recall": recall,
        "matched_indicators": matched,
        "expected_indicators": sc.expected_indicators,
        "grounding_precision": round(grounded / checked, 3) if checked else None,
        "grounded": grounded,
        "iocs_checked": checked,
        "ungrounded_iocs": ungrounded,
        "n_queries": n_queries,
        "duration_s": duration,
        "ioc_count": len(iocs),
    }


def _aggregate_scenario(scenario: Scenario, runs: list[dict]) -> dict:
    """Per-scenario aggregation across repeated runs: verdict pass-RATE + distribution
    are the honest signals on a stochastic agent (vs a single noisy pass/fail)."""
    n = len(runs)
    passes = sum(1 for r in runs if r["verdict_ok"])
    dist: dict[str, int] = {}
    for r in runs:
        dist[r["verdict"]] = dist.get(r["verdict"], 0) + 1
    recalls = [r["indicator_recall"] for r in runs if r["indicator_recall"] is not None]
    gps = [r["grounding_precision"] for r in runs if r["grounding_precision"] is not None]
    return {
        "id": scenario.id,
        "runs": n,
        "verdict_pass_rate": round(passes / n, 3) if n else None,
        "passes": passes,
        "verdict_distribution": dist,
        "expected_verdict": scenario.expected_verdict,
        "mean_indicator_recall": round(sum(recalls) / len(recalls), 3) if recalls else None,
        "mean_grounding_precision": round(sum(gps) / len(gps), 3) if gps else None,
        "invalid_mitre": sum(len(r.get("mitre_invalid", [])) for r in runs),
    }


async def run_eval(
    mcp: SplunkMCPClient,
    *,
    settings: Settings | None = None,
    scenario_ids: list[str] | None = None,
    max_turns: int = 12,
    repeat: int = 1,
) -> dict:
    settings = settings or get_settings()
    scenarios = [s for s in SCENARIOS if not scenario_ids or s.id in scenario_ids]
    repeat = max(1, repeat)

    missing = await validate_ground_truth(mcp)
    results = []
    for sc in scenarios:
        for run_idx in range(repeat):
            r = await run_scenario(mcp, settings, sc, max_turns=max_turns)
            r["run"] = run_idx + 1
            results.append(r)

    scored = [r for r in results if "error" not in r]
    # Per-scenario pass-RATE over the K samples (the statistically honest view).
    per_scenario = [
        _aggregate_scenario(sc, [r for r in scored if r["id"] == sc.id])
        for sc in scenarios
        if any(r["id"] == sc.id for r in scored)
    ]
    # Headline verdict accuracy is a rate over ALL runs (scenarios × repeat).
    verdict_acc = (
        sum(1 for r in scored if r["verdict_ok"]) / len(scored) if scored else None
    )
    recalls = [r["indicator_recall"] for r in scored if r["indicator_recall"] is not None]
    gps = [r["grounding_precision"] for r in scored if r["grounding_precision"] is not None]
    total_invalid_mitre = sum(len(r.get("mitre_invalid", [])) for r in scored)
    summary = {
        "scenarios": len(scenarios),
        "repeat": repeat,
        "total_runs": len(scored),
        "verdict_accuracy": round(verdict_acc, 3) if verdict_acc is not None else None,
        "mean_indicator_recall": round(sum(recalls) / len(recalls), 3) if recalls else None,
        "mean_grounding_precision": round(sum(gps) / len(gps), 3) if gps else None,
        "invalid_mitre_techniques": total_invalid_mitre,
        "mean_queries": round(sum(r["n_queries"] for r in scored) / len(scored), 1) if scored else None,
        "mean_duration_s": round(sum(r["duration_s"] for r in scored) / len(scored), 1) if scored else None,
        "model": settings.resolved_model,
        "provider": settings.provider,
        "ground_truth_missing": missing,
    }
    return {"summary": summary, "per_scenario": per_scenario, "results": results}
