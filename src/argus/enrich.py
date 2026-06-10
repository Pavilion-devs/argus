"""
Post-investigation enrichment: turns the model's grounded report into Argus's
final, decision-grade report by layering on deterministic, non-model signals:

  - MITRE ATT&CK validation + kill-chain coverage (``mitre.validate_techniques``)
  - a defensible composite RISK SCORE (0-100) with an explainable breakdown
  - the hypothesis ledger the agent built during the investigation
  - prior-case / blocklist recall ("have we seen this before")

None of this is model-judged — it is computed from the pinned ATT&CK catalog, the
real threat-intel the agent pulled, and Argus's own case memory. That is the point:
the verdict is the model's; the risk math and the validation are Argus's.
"""
from __future__ import annotations

import json
from typing import Any

from . import mitre

_SEVERITY_POINTS = {"critical": 22, "high": 15, "medium": 8, "low": 3, "informational": 0}
_VERDICT_BASE = {"true_positive": 38, "inconclusive": 14, "false_positive": 0}


def threat_intel_signal(evidence_pairs: list[tuple[str, str]]) -> dict[str, Any]:
    """Scan the real enrich_indicator results the agent pulled for hard malicious
    signal (AbuseIPDB score, VirusTotal detections, hosting/proxy/tor flags)."""
    worst_abuse = 0
    vt_malicious = 0
    flags: set[str] = set()
    for tool, text in evidence_pairs:
        if tool != "enrich_indicator" or not text:
            continue
        try:
            data = json.loads(text)
        except Exception:
            continue
        src = data.get("sources", {}) if isinstance(data, dict) else {}
        ab = src.get("abuseipdb") or {}
        if isinstance(ab, dict) and isinstance(ab.get("abuse_confidence_score"), (int, float)):
            worst_abuse = max(worst_abuse, int(ab["abuse_confidence_score"]))
            if ab.get("is_tor"):
                flags.add("tor")
        vt = src.get("virustotal") or {}
        if isinstance(vt, dict) and isinstance(vt.get("malicious"), int):
            vt_malicious = max(vt_malicious, vt["malicious"])
        ipapi = src.get("ip-api") or {}
        if isinstance(ipapi, dict):
            for f in ("hosting", "proxy"):
                if ipapi.get(f):
                    flags.add(f)
    malicious = worst_abuse >= 50 or vt_malicious >= 1
    notes: list[str] = []
    if worst_abuse:
        notes.append(f"AbuseIPDB {worst_abuse}/100")
    if vt_malicious:
        notes.append(f"VirusTotal {vt_malicious} malicious")
    if flags:
        notes.append("flags: " + ",".join(sorted(flags)))
    return {
        "malicious": malicious,
        "worst_abuse": worst_abuse,
        "vt_malicious": vt_malicious,
        "flags": sorted(flags),
        "notes": notes,
    }


def score_risk(
    report: dict[str, Any],
    *,
    kill_chain: list[dict[str, str]],
    ti: dict[str, Any],
    prior_confirmed: bool,
) -> tuple[int, str, str]:
    """Composite, explainable risk score (0-100). Each factor is a defensible,
    independent dimension a real SOC would weigh for triage/prioritization."""
    verdict = report.get("verdict", "")
    severity = report.get("severity", "")
    confidence = float(report.get("confidence", 0) or 0)

    factors: list[tuple[str, int]] = []
    base = _VERDICT_BASE.get(verdict, 0)
    if base:
        factors.append((f"verdict={verdict}", base))
    sev = _SEVERITY_POINTS.get(severity, 0)
    if sev:
        factors.append((f"severity={severity}", sev))
    conf_pts = round(confidence * 12)
    if conf_pts:
        factors.append((f"confidence={confidence:.2f}", conf_pts))
    stages = len(kill_chain)
    kc = min(stages, 6) * 3
    if kc:
        factors.append((f"{stages} ATT&CK tactics in kill-chain", kc))
    if ti.get("malicious"):
        factors.append(("threat-intel: confirmed malicious infra", 10))
    elif ti.get("flags"):
        factors.append(("threat-intel: " + ",".join(ti["flags"]) + " infra", 3))
    if prior_confirmed:
        factors.append(("indicator previously confirmed in case memory", 10))

    score = max(0, min(100, sum(p for _, p in factors)))
    band = (
        "critical" if score >= 80 else
        "high" if score >= 60 else
        "medium" if score >= 35 else
        "low"
    )
    breakdown = "; ".join(f"{name} +{pts}" for name, pts in factors) or "no positive risk factors"
    rationale = f"{score}/100 ({band}) — {breakdown}"
    return score, band, rationale


def _merge_recall(recalls: list[dict[str, Any]]) -> dict[str, Any]:
    """Union multiple recall results, de-duping cases by id and blocklist by indicator."""
    cases: dict[str, dict[str, Any]] = {}
    blocks: dict[str, dict[str, Any]] = {}
    for rec in recalls or []:
        for c in rec.get("related_cases", []) or []:
            cid = c.get("case_id") or json.dumps(c, sort_keys=True)
            cases.setdefault(cid, c)
        for b in rec.get("blocklist_hits", []) or []:
            key = (b.get("indicator") or "").lower()
            blocks.setdefault(key, b)
    return {"related_cases": list(cases.values()), "blocklist_hits": list(blocks.values())}


def enrich_report(
    report: dict[str, Any],
    *,
    evidence_pairs: list[tuple[str, str]],
    hypotheses: list[dict[str, Any]] | None = None,
    recalls: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Layer Argus's deterministic signals onto the model's grounded report (in place)."""
    summary = mitre.validate_techniques(report.get("mitre_attack", []) or [])
    report["kill_chain"] = summary["kill_chain"]
    report["mitre_invalid"] = summary["invalid"]
    report["mitre_catalog"] = {
        "version": summary["catalog_version"],
        "size": summary["catalog_size"],
        "available": summary["catalog_available"],
    }

    ti = threat_intel_signal(evidence_pairs)
    report["threat_intel_signal"] = ti

    merged = _merge_recall(recalls or [])
    report["prior_cases"] = merged["related_cases"]
    report["blocklist_hits"] = merged["blocklist_hits"]
    prior_confirmed = bool(merged["blocklist_hits"]) or any(
        c.get("verdict") == "true_positive" and c.get("overlap")
        for c in merged["related_cases"]
    )

    if hypotheses is not None:
        report["hypotheses"] = hypotheses

    score, band, rationale = score_risk(
        report, kill_chain=summary["kill_chain"], ti=ti, prior_confirmed=prior_confirmed
    )
    report["risk_score"] = score
    report["risk_band"] = band
    report["risk_rationale"] = rationale
    return report
