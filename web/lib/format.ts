// Shared color/label helpers so verdict, severity, risk and agents render
// consistently everywhere.

import type { AgentName } from "./types";

export const AGENTS: { id: Exclude<AgentName, "">; label: string; icon: string }[] = [
  { id: "auth", label: "Auth", icon: "solar:shield-keyhole-linear" },
  { id: "network", label: "Network", icon: "solar:routing-2-linear" },
  { id: "endpoint", label: "Endpoint", icon: "solar:server-square-linear" },
  { id: "intel", label: "Threat Intel", icon: "solar:shield-network-linear" },
];

export const AGENT_META: Record<
  Exclude<AgentName, "">,
  { label: string; icon: string; text: string; ring: string; dot: string }
> = {
  auth: { label: "Auth", icon: "solar:shield-keyhole-linear", text: "text-fuchsia-300", ring: "border-fuchsia-500/30", dot: "bg-fuchsia-400" },
  network: { label: "Network", icon: "solar:routing-2-linear", text: "text-cyan-300", ring: "border-cyan-500/30", dot: "bg-cyan-400" },
  endpoint: { label: "Endpoint", icon: "solar:server-square-linear", text: "text-amber-300", ring: "border-amber-500/30", dot: "bg-amber-400" },
  intel: { label: "Threat Intel", icon: "solar:shield-network-linear", text: "text-emerald-300", ring: "border-emerald-500/30", dot: "bg-emerald-400" },
};

export function verdictStyle(verdict?: string): { label: string; cls: string; icon: string } {
  switch (verdict) {
    case "true_positive":
      return { label: "True Positive", cls: "text-threat-critical border-threat-critical/40 bg-threat-critical/10", icon: "solar:danger-circle-linear" };
    case "false_positive":
      return { label: "False Positive", cls: "text-confirm border-confirm/40 bg-confirm/10", icon: "solar:check-circle-linear" };
    case "inconclusive":
      return { label: "Inconclusive", cls: "text-threat-medium border-threat-medium/40 bg-threat-medium/10", icon: "solar:question-circle-linear" };
    default:
      return { label: verdict ?? "—", cls: "text-zinc-400 border-line bg-surface-50", icon: "solar:minus-circle-linear" };
  }
}

export function severityColor(sev?: string): string {
  switch (sev) {
    case "critical": return "text-threat-critical";
    case "high": return "text-threat-high";
    case "medium": return "text-threat-medium";
    case "low": return "text-threat-low";
    default: return "text-zinc-400";
  }
}

export function severityChip(sev?: string): string {
  switch (sev) {
    case "critical": return "text-threat-critical border-threat-critical/40 bg-threat-critical/10";
    case "high": return "text-threat-high border-threat-high/40 bg-threat-high/10";
    case "medium": return "text-threat-medium border-threat-medium/40 bg-threat-medium/10";
    case "low": return "text-threat-low border-threat-low/40 bg-threat-low/10";
    default: return "text-zinc-400 border-line bg-surface-50";
  }
}

export function riskColor(band?: string): string {
  switch (band) {
    case "critical": return "#ef4444";
    case "high": return "#f97316";
    case "medium": return "#f59e0b";
    case "low": return "#10b981";
    default: return "#3f3f46";
  }
}

export function hypothesisStyle(status?: string): { cls: string; icon: string; dot: string } {
  switch (status) {
    case "confirmed": return { cls: "text-confirm", icon: "solar:check-circle-linear", dot: "bg-confirm" };
    case "refuted": return { cls: "text-refute", icon: "solar:close-circle-linear", dot: "bg-refute" };
    default: return { cls: "text-threat-medium", icon: "solar:hourglass-linear", dot: "bg-threat-medium animate-pulse-glow" };
  }
}

export function fmtTime(iso?: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso.slice(0, 19).replace("T", " ");
  }
}

// Pretty one-line label for an MCP tool call.
export function toolLabel(name: string): string {
  if (name === "splunk_run_query") return "SPL query";
  if (name === "enrich_indicator") return "threat-intel";
  if (name === "recall_memory") return "memory recall";
  if (name === "track_hypothesis") return "hypothesis";
  return name.replace(/^splunk_/, "").replace(/_/g, " ");
}

// Extract the SPL text from a tool_call input (run_query and friends).
export function extractSPL(input: Record<string, unknown>): string | null {
  const q = input?.query ?? input?.search ?? input?.spl;
  return typeof q === "string" ? q : null;
}

export function safeParse<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== "string") return (raw as T) ?? fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
