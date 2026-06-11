"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { api } from "@/lib/api";
import type { EvalResults } from "@/lib/types";

const SCENARIO_LABELS: Record<string, string> = {
  aws_cred_abuse: "AWS credential abuse",
  endpoint_malware: "Endpoint malware",
  s3_public_exposure: "S3 public exposure",
  coinminer_cryptojacking: "Cryptojacking (DNS)",
  benign_dns_control: "Benign control · DNS",
  benign_aws_recon_control: "Benign control · AWS recon",
};

const pct = (n?: number | null) => (n == null ? "—" : `${Math.round(n * 100)}%`);

function MetricTile({ value, label, sub, accent }: { value: string; label: string; sub: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface-100/50 p-4">
      <div className={`tnum text-3xl font-light tracking-tight ${accent ?? "text-white"}`}>{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wider text-primary-bright">{label}</div>
      <div className="mt-0.5 text-[11px] text-zinc-500">{sub}</div>
    </div>
  );
}

export default function EvalPanel() {
  const [data, setData] = useState<EvalResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .evaluation()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setErr(String(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const s = data?.summary;
  const rows = data?.per_scenario ?? [];
  const model = (s?.model ?? "").replace(/^global\.anthropic\./, "");

  if (loading) {
    return (
      <div className="panel flex items-center gap-2 p-6 text-sm text-zinc-500">
        <Icon icon="solar:spinner-linear" className="h-4 w-4 animate-spin-slow text-primary-bright" /> loading benchmark…
      </div>
    );
  }
  if (err || !s) {
    return (
      <div className="panel flex items-center gap-2 p-6 text-sm text-zinc-500">
        <Icon icon="solar:inbox-linear" className="h-4 w-4" />
        {data?.error ?? err ?? "No benchmark results found. Run `argus eval` to generate eval/results.json."}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* aggregate headline metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricTile value={s.verdict_accuracy.toFixed(1)} label="Verdict accuracy" sub={`across ${s.total_runs} real runs`} accent="text-confirm" />
        <MetricTile value={s.mean_grounding_precision.toFixed(2)} label="Grounding precision" sub="every IOC verified in-data" />
        <MetricTile value={s.mean_indicator_recall.toFixed(2)} label="Indicator recall" sub="key IOCs surfaced" />
        <MetricTile
          value={String(s.invalid_mitre_techniques)}
          label="Invalid ATT&CK IDs"
          sub="vs pinned v19.1 catalog"
          accent={s.invalid_mitre_techniques === 0 ? "text-confirm" : "text-refute"}
        />
      </div>

      {/* per-scenario results table */}
      <div className="panel">
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <Icon icon="solar:chart-square-linear" className="h-4 w-4 text-primary-bright" />
            <span className="text-sm font-medium text-zinc-200">Per-scenario results</span>
            <span className="text-[11px] text-zinc-600">· BOTS v3</span>
          </div>
          <span className="chip tnum">{s.scenarios} scenarios × {s.repeat}</span>
        </div>

        <div className="overflow-x-auto p-3">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-zinc-500">
                <th className="px-3 py-2 text-left font-medium">Scenario</th>
                <th className="px-3 py-2 text-left font-medium">Verdict pass-rate</th>
                <th className="px-3 py-2 text-right font-medium">Recall</th>
                <th className="px-3 py-2 text-right font-medium">Grounding</th>
                <th className="px-3 py-2 text-right font-medium">Invalid</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const passed = r.verdict_pass_rate >= 1;
                const dist = Object.entries(r.verdict_distribution)
                  .map(([k, v]) => `${k.replace(/_/g, " ")} ×${v}`)
                  .join(", ");
                return (
                  <tr key={r.id} className="border-t border-line/60 transition-colors hover:bg-surface-100/40">
                    <td className="px-3 py-2.5">
                      <div className="text-zinc-200">{SCENARIO_LABELS[r.id] ?? r.id}</div>
                      <div className="font-mono text-[10px] text-zinc-600">{r.id}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${passed ? "border-confirm/30 bg-confirm/10 text-confirm" : "border-threat-medium/40 bg-threat-medium/10 text-threat-medium"}`}>
                          <Icon icon={passed ? "solar:check-circle-linear" : "solar:hourglass-linear"} className="h-3.5 w-3.5" />
                          {r.passes}/{r.runs}
                        </span>
                      </div>
                      <div className="mt-1 text-[10px] text-zinc-600">{dist}</div>
                    </td>
                    <td className="px-3 py-2.5 text-right tnum text-zinc-300">{pct(r.mean_indicator_recall)}</td>
                    <td className="px-3 py-2.5 text-right tnum text-zinc-300">{pct(r.mean_grounding_precision)}</td>
                    <td className="px-3 py-2.5 text-right tnum">
                      <span className={r.invalid_mitre === 0 ? "text-confirm" : "text-refute"}>{r.invalid_mitre}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="border-t border-line/70 px-4 py-3 text-[11px] leading-relaxed text-zinc-600">
          Multi-sampled at repeat={s.repeat} (verdict pass-rate, not a single draw) · data-verified ground
          truth · {s.provider}/{model} · ~{s.mean_queries.toFixed(0)} queries &amp; ~{s.mean_duration_s.toFixed(0)}s
          per investigation. Regenerated by <span className="font-mono text-zinc-500">argus eval</span>.
        </div>
      </div>
    </div>
  );
}
