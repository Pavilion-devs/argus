// Mirrors the structured events the Argus engine yields (src/argus/agent.py) and the
// enriched report (models.py + enrich.py). These are the wire contract the SSE bridge
// forwards verbatim.

export type AgentName = "" | "auth" | "network" | "endpoint" | "intel";

export interface BlocklistHit {
  indicator: string;
  type: string;
  reason: string;
  severity?: string;
  case_id?: string;
  added_at?: string;
}

export interface RelatedCase {
  case_id: string;
  verdict: string;
  severity: string;
  title: string;
  created_at?: string;
  overlap: string[];
  keyword_match: string[];
}

export interface Recall {
  indicators_checked: string[];
  blocklist_hits: BlocklistHit[];
  related_cases: RelatedCase[];
}

export interface Hypothesis {
  id: string;
  statement: string;
  status: "open" | "confirmed" | "refuted";
  confidence?: number | null;
  evidence?: string;
}

export interface TimelineEntry {
  time: string;
  event: string;
  evidence_tool_use_id?: string | null;
}

export interface MitreTechnique {
  technique_id: string;
  name: string;
  rationale: string;
  // Attached in place by mitre.validate_techniques (see enrich.py) when a
  // catalog is loaded: validity + canonical metadata for the ATT&CK link.
  valid?: boolean | null;
  canonical_name?: string;
  tactics?: string[];
  deprecated?: boolean;
  url?: string;
}

export interface Entity {
  type: string;
  value: string;
  role: string;
}

export interface RecommendedAction {
  action: string;
  rationale: string;
  automatable: boolean;
}

export interface KillChainStage {
  tactic: string;
  label: string;
}

export interface ThreatIntelSignal {
  malicious: boolean;
  worst_abuse: number;
  vt_malicious: number;
  flags: string[];
  notes: string[];
}

export interface Report {
  verdict: "true_positive" | "false_positive" | "inconclusive";
  severity: "critical" | "high" | "medium" | "low" | "informational";
  confidence: number;
  title: string;
  summary: string;
  attack_timeline: TimelineEntry[];
  mitre_attack: MitreTechnique[];
  affected_entities: Entity[];
  iocs: string[];
  recommended_actions: RecommendedAction[];
  // enrichment (enrich.py)
  kill_chain: KillChainStage[];
  mitre_invalid: string[];
  mitre_catalog?: { version: string; size: number; available: boolean };
  threat_intel_signal?: ThreatIntelSignal;
  prior_cases?: RelatedCase[];
  blocklist_hits?: BlocklistHit[];
  hypotheses?: Hypothesis[];
  risk_score: number;
  risk_band: "critical" | "high" | "medium" | "low";
  risk_rationale: string;
}

// ---- Streamed events --------------------------------------------------------
export type ArgusEvent =
  | { type: "stream_open"; mode?: string; stream_id?: string }
  | { type: "stream_end" }
  | { type: "thinking"; text: string; agent: AgentName }
  | { type: "text"; text: string; agent: AgentName }
  | { type: "tool_call"; id: string; name: string; input: Record<string, unknown>; agent: AgentName }
  | { type: "tool_result"; id: string; name: string; is_error: boolean; text: string; agent: AgentName }
  | { type: "recall"; recall: Recall; agent: AgentName }
  | { type: "hypothesis"; hypothesis: Hypothesis; agent: AgentName }
  | { type: "continuation"; reason: string; verdict: string; confidence: number }
  | { type: "report"; report: Report }
  | { type: "done" }
  | { type: "error"; text: string }
  | { type: "multi_start"; agents: AgentName[] }
  | { type: "specialist_started"; agent: AgentName }
  | { type: "specialist_done"; agent: AgentName; findings: string }
  // response phase
  | { type: "case_created"; case_id: string; key: string }
  | { type: "action_proposed"; stream_id: string; action_id: string; desc: string; input: Record<string, unknown> }
  | { type: "action_executed"; action: string; desc: string; result: Record<string, unknown> }
  | { type: "action_skipped"; action: string; desc: string; input: Record<string, unknown> }
  | { type: "response_done"; summary: string };

export type ArgusEventType = ArgusEvent["type"];

// ---- Read-endpoint shapes ---------------------------------------------------
export interface CaseRow {
  case_id: string;
  title: string;
  verdict: string;
  severity: string;
  confidence: number;
  risk_score?: number;
  risk_band?: string;
  summary: string;
  entities?: string; // JSON string
  iocs?: string; // JSON string
  created_at: string;
  status: string;
}

export interface DetectionRow {
  name: string;
  search: string;
  cron_schedule: string;
  is_scheduled: boolean | string;
  description: string;
  dispatch_earliest_time?: string;
  dispatch_latest_time?: string;
}

export interface BlocklistRow {
  indicator: string;
  type: string;
  reason: string;
  severity: string;
  case_id: string;
  added_by?: string;
  added_at: string;
}

// ---- Evaluation harness (eval/results.json) ---------------------------------
export interface EvalSummary {
  scenarios: number;
  repeat: number;
  total_runs: number;
  verdict_accuracy: number;
  mean_indicator_recall: number;
  mean_grounding_precision: number;
  invalid_mitre_techniques: number;
  mean_queries: number;
  mean_duration_s: number;
  model: string;
  provider: string;
}

export interface EvalScenario {
  id: string;
  runs: number;
  verdict_pass_rate: number;
  passes: number;
  verdict_distribution: Record<string, number>;
  expected_verdict: string[];
  mean_indicator_recall: number | null;
  mean_grounding_precision: number | null;
  invalid_mitre: number;
}

export interface EvalResults {
  summary: EvalSummary | null;
  per_scenario: EvalScenario[];
  error?: string;
}

export interface SplunkAlertJob {
  ok: boolean;
  job_id: string;
  status: "queued" | "running" | "done" | "error";
  search_name?: string | null;
  sid?: string | null;
  auto_respond?: boolean;
  case_id?: string;
  case_key?: string;
  events?: number;
  report?: Report;
  error?: string;
}

export interface DetectionRun {
  ok: boolean;
  name: string;
  search: string;
  earliest?: string;
  latest?: string;
  match_count?: number;
  matches?: Record<string, unknown>[];
  raw?: string;
  error?: string;
}

export interface DetectionRunResult {
  ok: boolean;
  detections_checked: number;
  detections_matched: number;
  runs: DetectionRun[];
  error?: string;
}
