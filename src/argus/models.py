"""Structured models for an Argus investigation."""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


class HypothesisVerdict(BaseModel):
    """Final status of a tracked hypothesis once the investigation concludes."""

    id: str = Field(description="The hypothesis id being resolved")
    status: Literal["confirmed", "refuted", "open"]
    confidence: float = Field(description="0.0-1.0 final confidence in the resolution")
    evidence: str = Field(default="", description="One-line note on what settled it")


class HypothesisVerdicts(BaseModel):
    """Resolutions for the still-open hypotheses, reconciled against the final verdict."""

    resolutions: list[HypothesisVerdict] = Field(default_factory=list)


class TimelineEntry(BaseModel):
    time: str = Field(description="Timestamp (or relative ordering) of the event")
    event: str = Field(description="What happened at this point in the attack")
    evidence_tool_use_id: Optional[str] = Field(
        default=None,
        description="tool_use id of the run_query whose results evidence this step",
    )


class MitreTechnique(BaseModel):
    technique_id: str = Field(description="MITRE ATT&CK technique id, e.g. T1110.001")
    name: str = Field(description="Technique name")
    rationale: str = Field(description="Why this technique applies, citing observed evidence")


class Entity(BaseModel):
    type: str = Field(description="host | user | ip | domain | hash | account | process | url")
    value: str
    role: str = Field(description="role in the incident, e.g. source, target, c2, compromised")


class RecommendedAction(BaseModel):
    action: str = Field(description="A concrete response action")
    rationale: str
    automatable: bool = Field(
        description="True if Argus can execute this now via a response connector "
        "(blocklist, notable, ticket)"
    )


class InvestigationReport(BaseModel):
    """The grounded incident report Argus produces at the end of an investigation."""

    verdict: Literal["true_positive", "false_positive", "inconclusive"]
    severity: Literal["critical", "high", "medium", "low", "informational"]
    confidence: float = Field(description="0.0-1.0 confidence in the verdict")
    title: str = Field(description="Short incident title")
    summary: str = Field(description="Executive summary of the investigation and conclusion")
    attack_timeline: list[TimelineEntry] = Field(default_factory=list)
    mitre_attack: list[MitreTechnique] = Field(default_factory=list)
    affected_entities: list[Entity] = Field(default_factory=list)
    iocs: list[str] = Field(default_factory=list, description="Indicators of compromise observed")
    recommended_actions: list[RecommendedAction] = Field(default_factory=list)
