// Read-endpoint helpers. The browser uses same-origin relative paths; Next
// rewrites proxy /api/* to the Argus bridge (see next.config.mjs).

import type { BlocklistRow, CaseRow, DetectionRow } from "./types";

async function getJSON<T>(path: string): Promise<T> {
  const resp = await fetch(path, { headers: { Accept: "application/json" }, cache: "no-store" });
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
  blocklist: () => getJSON<{ blocklist: BlocklistRow[]; error?: string }>("/api/blocklist"),
};

export async function postDecision(stream_id: string, action_id: string, approved: boolean) {
  const resp = await fetch("/api/respond/decision", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stream_id, action_id, approved }),
  });
  return resp.json();
}
