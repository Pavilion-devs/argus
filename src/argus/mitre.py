"""
MITRE ATT&CK catalog — validates the technique IDs Argus reports against the real
ATT&CK Enterprise matrix, so a hallucinated technique id can never reach a report.

The catalog is a *pinned, versioned* MITRE ATT&CK Enterprise STIX release (not the
moving ``master``), distilled to a compact map committed at
``data/mitre/techniques.json``. For every technique the model emits, Argus confirms
the id is real, attaches the canonical name + tactic(s) + ATT&CK url, and derives
the incident's kill-chain coverage. Tactic names and their kill-chain order are read
straight from the bundle's matrix, so they always match the pinned ATT&CK version.
``sync_catalog()`` (CLI: ``argus mitre-sync``) rebuilds the map from the source.
"""
from __future__ import annotations

import json
import pathlib
from typing import Any, Optional

import httpx

# Pinned, versioned ATT&CK Enterprise release — reproducible and authoritative.
ATTACK_VERSION = "19.1"
STIX_URL = (
    "https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/"
    f"enterprise-attack/enterprise-attack-{ATTACK_VERSION}.json"
)

_DATA_DIR = pathlib.Path(__file__).resolve().parents[2] / "data" / "mitre"
_COMPACT = _DATA_DIR / "techniques.json"


def _compact_from_stix(bundle: dict[str, Any]) -> dict[str, Any]:
    """Distill the full STIX bundle to the {version, tactics, techniques} Argus needs.

    Tactic ordering + display names come from the bundle's own x-mitre-matrix /
    x-mitre-tactic objects, so they always match the pinned ATT&CK version.
    """
    objects = bundle.get("objects", [])
    by_id = {o.get("id"): o for o in objects}

    # Ordered kill-chain tactics, straight from the Enterprise matrix.
    matrix = next((o for o in objects if o.get("type") == "x-mitre-matrix"), None)
    tactics: list[dict[str, str]] = []
    shortnames: list[str] = []
    for ref in (matrix or {}).get("tactic_refs", []):
        tac = by_id.get(ref)
        if tac and tac.get("x_mitre_shortname"):
            shortnames.append(tac["x_mitre_shortname"])
            tactics.append({"shortname": tac["x_mitre_shortname"], "label": tac.get("name", "")})

    techniques: dict[str, dict[str, Any]] = {}
    for obj in objects:
        if obj.get("type") != "attack-pattern":
            continue
        ext = next(
            (
                r
                for r in obj.get("external_references", [])
                if r.get("source_name") == "mitre-attack" and r.get("external_id")
            ),
            None,
        )
        if not ext:
            continue
        tac_names = [
            ph.get("phase_name")
            for ph in obj.get("kill_chain_phases", [])
            if ph.get("kill_chain_name") == "mitre-attack" and ph.get("phase_name")
        ]
        techniques[ext["external_id"]] = {
            "name": obj.get("name", ""),
            "tactics": tac_names,
            "is_subtechnique": bool(obj.get("x_mitre_is_subtechnique", False)),
            "deprecated": bool(obj.get("x_mitre_deprecated") or obj.get("revoked")),
            "url": ext.get("url", ""),
        }
    return {"version": ATTACK_VERSION, "tactics": tactics, "techniques": techniques}


def sync_catalog() -> int:
    """Download the pinned STIX release and (re)build the compact map.
    Returns the number of techniques written."""
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    with httpx.Client(timeout=180.0, follow_redirects=True) as c:
        resp = c.get(STIX_URL)
        resp.raise_for_status()
        bundle = resp.json()
    compact = _compact_from_stix(bundle)
    _COMPACT.write_text(json.dumps(compact, sort_keys=True))
    MitreCatalog._cache = compact
    return len(compact["techniques"])


class MitreCatalog:
    """Process-wide lazy-loaded ATT&CK technique map (pinned version)."""

    _cache: Optional[dict[str, Any]] = None

    @classmethod
    def _load(cls) -> dict[str, Any]:
        if cls._cache is not None:
            return cls._cache
        if _COMPACT.exists():
            try:
                cls._cache = json.loads(_COMPACT.read_text())
                return cls._cache
            except Exception:
                pass
        try:
            sync_catalog()
        except Exception:
            cls._cache = {"version": ATTACK_VERSION, "tactics": [], "techniques": {}}
        return cls._cache or {"version": ATTACK_VERSION, "tactics": [], "techniques": {}}

    @classmethod
    def available(cls) -> bool:
        return bool(cls._load().get("techniques"))

    @classmethod
    def version(cls) -> str:
        return cls._load().get("version", ATTACK_VERSION)

    @classmethod
    def lookup(cls, technique_id: str) -> Optional[dict[str, Any]]:
        return cls._load().get("techniques", {}).get((technique_id or "").strip().upper())

    @classmethod
    def count(cls) -> int:
        return len(cls._load().get("techniques", {}))

    @classmethod
    def tactic_order(cls) -> list[str]:
        return [t["shortname"] for t in cls._load().get("tactics", [])]

    @classmethod
    def tactic_label(cls, shortname: str) -> str:
        for t in cls._load().get("tactics", []):
            if t["shortname"] == shortname:
                return t["label"]
        return shortname.replace("-", " ").title()


def validate_techniques(mitre_attack: list[dict[str, Any]]) -> dict[str, Any]:
    """Validate/enrich a report's MITRE techniques in place against the real catalog.

    For each technique dict: normalizes the id, sets ``valid`` (True/False, or None
    if no catalog is loaded), and on a hit attaches ``canonical_name``/``tactics``/
    ``url``/``deprecated``. Returns a summary with the invalid ids and the ordered
    kill-chain tactics the incident covers (in ATT&CK matrix order).
    """
    cat_available = MitreCatalog.available()
    order = MitreCatalog.tactic_order()
    invalid: list[str] = []
    covered: set[str] = set()

    for t in mitre_attack:
        tid = (t.get("technique_id") or "").strip().upper()
        t["technique_id"] = tid
        info = MitreCatalog.lookup(tid)
        if info is None:
            t["valid"] = False if cat_available else None
            if cat_available and tid:
                invalid.append(tid)
            continue
        t["valid"] = True
        t["canonical_name"] = info["name"]
        t["tactics"] = info["tactics"]
        t["deprecated"] = info["deprecated"]
        t["url"] = info["url"]
        covered.update(info["tactics"])

    kill_chain = [
        {"tactic": tac, "label": MitreCatalog.tactic_label(tac)}
        for tac in order
        if tac in covered
    ]
    return {
        "catalog_available": cat_available,
        "catalog_version": MitreCatalog.version(),
        "catalog_size": MitreCatalog.count(),
        "invalid": invalid,
        "kill_chain": kill_chain,
    }
