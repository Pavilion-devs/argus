"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import { Icon } from "@iconify/react";
import Background from "@/components/Background";
import Nav from "@/components/Nav";
import ReasoningStream from "@/components/dashboard/ReasoningStream";
import SplFeed from "@/components/dashboard/SplFeed";
import HypothesisLedger from "@/components/dashboard/HypothesisLedger";
import MemoryPanel from "@/components/dashboard/MemoryPanel";
import ReportPanel from "@/components/dashboard/ReportPanel";
import EvidenceDrawer from "@/components/dashboard/EvidenceDrawer";
import ResponsePanel from "@/components/dashboard/ResponsePanel";
import MemoryTab from "@/components/dashboard/MemoryTab";
import { api } from "@/lib/api";
import { useInvestigation } from "@/lib/useInvestigation";

const PRESETS: { label: string; alert: string }[] = [
  {
    label: "AWS credential abuse",
    alert:
      "Investigate suspicious activity in the Frothly AWS account: the web_admin IAM user is issuing unusual EC2 API calls from 139.198.18.205. Determine whether the account is compromised.",
  },
  {
    label: "Endpoint malware",
    alert:
      "A process named iexeplorer.exe was flagged on a Frothly Windows endpoint. Investigate whether it is malicious and what it did.",
  },
  {
    label: "S3 public exposure",
    alert: "Investigate a possible public exposure of the frothlywebcode S3 bucket in the Frothly AWS account.",
  },
  {
    label: "Cryptojacking (DNS)",
    alert: "Investigate repeated DNS lookups to coinhive.com observed from Frothly hosts.",
  },
  {
    label: "Benign control (DNS to 8.8.8.8)",
    alert: "Investigate DNS traffic to 8.8.8.8 from a Frothly host flagged by a rule.",
  },
];

type HealthData = Awaited<ReturnType<typeof api.health>>;

function HealthPill({ health }: { health: HealthData | null }) {
  const ok = health?.mcp === "connected";
  return (
    <div className="flex items-center gap-2 rounded-full border border-line bg-surface-100/60 px-3 py-1.5 text-[11px]">
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-confirm animate-pulse-glow" : health ? "bg-threat-high" : "bg-zinc-600"}`} />
      <span className="text-zinc-400">
        {health ? (
          <>
            MCP {ok ? "connected" : health.mcp} · {health.provider}/{(health.model ?? "").replace(/^global\.anthropic\./, "")}
          </>
        ) : (
          "checking engine…"
        )}
      </span>
    </div>
  );
}

function StatTile({ icon, label, value, accent }: { icon: string; label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-100/50 px-4 py-3">
      <Icon icon={icon} className={`h-5 w-5 ${accent ?? "text-primary-bright"}`} />
      <div>
        <div className="tnum text-lg font-light leading-none text-white">{value}</div>
        <div className="mt-0.5 text-[11px] text-zinc-500">{label}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { state, run, stop, respond, decide } = useInvestigation();
  const [alert, setAlert] = useState(PRESETS[0].alert);
  const [multi, setMulti] = useState(false);
  const [tab, setTab] = useState<"investigate" | "memory">("investigate");
  const [evidenceId, setEvidenceId] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [refreshKey, bumpRefresh] = useReducer((x: number) => x + 1, 0);
  const [, tick] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth(null));
  }, []);

  // tick the elapsed clock while running
  useEffect(() => {
    if (state.status !== "running") return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [state.status]);

  // refresh the memory tab whenever an investigation or response completes
  useEffect(() => {
    if (state.status === "done") bumpRefresh();
  }, [state.status]);
  useEffect(() => {
    if (state.response.status === "done") bumpRefresh();
  }, [state.response.status]);

  const byId = useMemo(() => {
    const m: Record<string, (typeof state.toolCalls)[number]> = {};
    for (const t of state.toolCalls) m[t.id] = t;
    return m;
  }, [state.toolCalls.length, state.status]);
  const evidenceIds = useMemo(
    () => new Set(state.toolCalls.filter((t) => t.result).map((t) => t.id)),
    [state.toolCalls.length, state.status],
  );

  const queries = state.toolCalls.filter((t) => t.name === "splunk_run_query").length;
  const hypCount = Object.keys(state.hypotheses).length;
  const elapsed = state.startedAt ? Math.max(0, ((state.finishedAt ?? Date.now()) - state.startedAt) / 1000) : 0;
  const running = state.status === "running";
  const hasContent =
    running || state.status === "done" || state.status === "error" || state.toolCalls.length > 0;

  // After the reasoning loop ends there is a non-streaming synthesis call (the
  // structured report). Detect that gap so the UI shows progress, not a freeze.
  const sinceLast = state.lastEventAt ? Date.now() - state.lastEventAt : 0;
  const synthesizing = running && !state.report && state.toolCalls.length > 0 && sinceLast > 4000;

  const phase = state.response.status !== "idle"
    ? state.response.status === "done" ? "Contained" : "Responding"
    : state.status === "running"
      ? synthesizing ? "Synthesizing" : state.report ? "Finalizing" : "Investigating"
      : state.status === "done" ? "Complete"
        : state.status === "error" ? "Error" : "Idle";

  return (
    <main className="relative min-h-screen pb-20">
      <Background dense />
      <Nav variant="app" />

      <div className="mx-auto max-w-7xl px-4 pt-24 sm:px-6">
        {/* title row */}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-light tracking-tight text-white">Investigation console</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Live, grounded autonomous investigation streamed from the real Argus engine.
            </p>
          </div>
          <HealthPill health={health} />
        </div>

        {/* tabs */}
        <div className="mb-5 flex items-center gap-1 rounded-full border border-line bg-surface-100/50 p-1 text-sm">
          {([["investigate", "Live investigation", "solar:pulse-linear"], ["memory", "Memory & hardening", "solar:history-linear"]] as const).map(
            ([id, label, icon]) => (
              <button
                key={id}
                onClick={() => {
                  setTab(id);
                  if (id === "memory") bumpRefresh();
                }}
                className={`flex items-center gap-2 rounded-full px-4 py-2 transition-colors ${
                  tab === id ? "bg-primary text-white shadow-glow-sm" : "text-zinc-400 hover:text-white"
                }`}
              >
                <Icon icon={icon} className="h-4 w-4" /> {label}
              </button>
            ),
          )}
        </div>

        {tab === "investigate" ? (
          <>
            {/* command bar */}
            <div className="panel mb-5 p-4">
              <div className="flex flex-col gap-3 lg:flex-row">
                <div className="flex-1">
                  <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-zinc-500">Alert</label>
                  <textarea
                    value={alert}
                    onChange={(e) => setAlert(e.target.value)}
                    rows={2}
                    disabled={running}
                    className="w-full resize-none rounded-xl border border-line bg-ink/50 px-3.5 py-2.5 text-sm text-zinc-200 outline-none transition-colors placeholder:text-zinc-600 focus:border-primary/50 disabled:opacity-60"
                    placeholder="Describe the alert to investigate…"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {PRESETS.map((p) => (
                      <button
                        key={p.label}
                        onClick={() => setAlert(p.alert)}
                        disabled={running}
                        className="rounded-full border border-line px-2.5 py-1 text-[11px] text-zinc-400 transition-colors hover:border-primary/40 hover:text-primary-bright disabled:opacity-50"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col justify-between gap-3 lg:w-56">
                  <button
                    onClick={() => setMulti((m) => !m)}
                    disabled={running}
                    className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm transition-colors disabled:opacity-60 ${
                      multi ? "border-primary/50 bg-primary/10 text-primary-bright" : "border-line bg-ink/40 text-zinc-300"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon icon="solar:routing-2-linear" className="h-4 w-4" /> Multi-agent
                    </span>
                    <span className={`relative h-5 w-9 rounded-full transition-colors ${multi ? "bg-primary" : "bg-surface-300"}`}>
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${multi ? "left-[1.15rem]" : "left-0.5"}`} />
                    </span>
                  </button>
                  {running ? (
                    <button onClick={stop} className="btn-ghost !border-refute/40 !text-refute hover:!bg-refute/10">
                      <Icon icon="solar:stop-circle-linear" className="h-5 w-5" /> Stop
                    </button>
                  ) : (
                    <button onClick={() => run(alert, { multi })} disabled={!alert.trim()} className="btn-primary">
                      <Icon icon="solar:play-circle-linear" className="h-5 w-5" /> Run investigation
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* status strip */}
            {hasContent && (
              <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatTile
                  icon={running ? "solar:pulse-linear" : state.status === "error" ? "solar:danger-triangle-linear" : "solar:check-circle-linear"}
                  label="Phase"
                  value={phase}
                  accent={state.status === "error" ? "text-refute" : running ? "text-primary-bright" : "text-confirm"}
                />
                <StatTile icon="solar:database-linear" label="SPL queries" value={String(queries)} />
                <StatTile icon="solar:branching-paths-up-linear" label="Hypotheses" value={String(hypCount)} />
                <StatTile icon="solar:clock-circle-linear" label="Elapsed" value={`${elapsed.toFixed(0)}s`} />
              </div>
            )}

            {state.status === "error" && (
              <div className="mb-5 flex items-center gap-2 rounded-xl border border-refute/40 bg-refute/[0.08] p-4 text-sm text-refute">
                <Icon icon="solar:danger-triangle-linear" className="h-5 w-5" />
                {state.error ?? "The investigation stream errored."}
              </div>
            )}

            {!hasContent && (
              <div className="panel grid place-items-center py-20 text-center">
                <div>
                  <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-line bg-surface-50 shadow-glow">
                    <Icon icon="solar:eye-scan-linear" className="h-9 w-9 text-primary-bright" />
                  </span>
                  <h3 className="mt-5 text-lg font-medium text-zinc-200">Ready to investigate</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
                    Pick a preset alert or write your own, choose single or multi-agent, and run. Argus
                    will reason, query Splunk live, and reach a grounded verdict in front of you.
                  </p>
                </div>
              </div>
            )}

            {hasContent && (
              <div className="grid gap-5 lg:grid-cols-3">
                <div className="flex flex-col gap-5 lg:col-span-2">
                  <ReasoningStream state={state} />
                  <SplFeed toolCalls={state.toolCalls} multi={state.mode === "multi"} />
                </div>
                <div className="flex flex-col gap-5">
                  <HypothesisLedger hypotheses={state.hypotheses} />
                  <MemoryPanel state={state} />
                  {state.report && (
                    <ResponsePanel
                      report={!!state.report}
                      response={state.response}
                      onRespond={respond}
                      onDecide={decide}
                    />
                  )}
                </div>
              </div>
            )}

            {synthesizing && !state.report && (
              <div className="panel mt-5 flex items-center gap-4 p-6">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-primary/30 bg-primary/10">
                  <Icon icon="solar:document-add-linear" className="h-6 w-6 text-primary-bright animate-pulse-glow" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium text-zinc-100">
                    <Icon icon="solar:spinner-linear" className="h-4 w-4 animate-spin-slow text-primary-bright" />
                    Synthesizing the grounded report
                  </div>
                  <p className="mt-1 text-[13px] text-zinc-500">
                    Reasoning complete — validating MITRE ATT&amp;CK against the pinned catalog, building the
                    kill-chain, computing the composite risk score, and linking every claim to its evidence.
                  </p>
                </div>
              </div>
            )}

            {state.report && (
              <div className="mt-5">
                <ReportPanel report={state.report} evidenceIds={evidenceIds} onEvidence={setEvidenceId} />
              </div>
            )}
          </>
        ) : (
          <MemoryTab refreshKey={refreshKey} />
        )}
      </div>

      <EvidenceDrawer rec={evidenceId ? byId[evidenceId] ?? null : null} onClose={() => setEvidenceId(null)} />
    </main>
  );
}
