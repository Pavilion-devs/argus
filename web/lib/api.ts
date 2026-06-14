// Read-endpoint helpers. The browser uses same-origin relative paths; Next
// rewrites proxy /api/* to the Argus bridge (see next.config.mjs).

import type {
  BlocklistRow,
  CaseRow,
  DetectionRow,
  DetectionRunResult,
  EvalResults,
  SplunkAlertJob,
} from "./types";

// In production the browser calls the Argus backend directly — set
// NEXT_PUBLIC_ARGUS_API to e.g. https://api.tryargus.xyz. Empty in local dev,
// where next.config's rewrite proxies same-origin /api/* to the bridge on :8010.
// Direct calls keep SSE unbuffered (proxying the stream through Vercel buffers it).
export const API_BASE = process.env.NEXT_PUBLIC_ARGUS_API ?? "";

async function getJSON<T>(path: string): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!resp.ok) throw new Error(`${path} → ${resp.status}`);
  return (await resp.json()) as T;
}

export const api = {
  health: () =>
    getJSON<{
      ok: boolean;
      provider: string;
      model: string;
      mcp: string;
      mcp_tools?: number;
      mcp_server?: { name?: string; version?: string };
      mcp_error?: string;
    }>("/api/health"),
  cases: () => getJSON<{ cases: CaseRow[]; error?: string }>("/api/cases"),
  detections: () => getJSON<{ detections: DetectionRow[]; error?: string }>("/api/detections"),
  runDetections: (params: { name?: string; earliest?: string; latest?: string; limit?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.name) q.set("name", params.name);
    if (params.earliest) q.set("earliest", params.earliest);
    if (params.latest) q.set("latest", params.latest);
    if (params.limit != null) q.set("limit", String(params.limit));
    const suffix = q.toString() ? `?${q}` : "";
    return getJSON<DetectionRunResult>(`/api/detections/run${suffix}`);
  },
  blocklist: () => getJSON<{ blocklist: BlocklistRow[]; error?: string }>("/api/blocklist"),
  evaluation: () => getJSON<EvalResults>("/api/eval"),
  alertJobs: () => getJSON<{ ok: boolean; jobs: SplunkAlertJob[]; error?: string }>("/api/splunk/alerts"),
};

export async function postDecision(stream_id: string, action_id: string, approved: boolean) {
  const resp = await fetch(`${API_BASE}/api/respond/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stream_id, action_id, approved }),
  });
  return resp.json();
}
