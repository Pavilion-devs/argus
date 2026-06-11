"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { api } from "@/lib/api";
import { fmtTime, safeParse, severityChip, verdictStyle } from "@/lib/format";
import type { BlocklistRow, CaseRow, DetectionRow, Entity } from "@/lib/types";

function useEndpoint<T>(loader: () => Promise<T>, deps: number) {
  const [data, setData] = useState<T | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    loader()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setErr(String(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deps]);
  return { data, err, loading };
}

function CaseCard({ c }: { c: CaseRow }) {
  const v = verdictStyle(c.verdict);
  const iocs = safeParse<string[]>(c.iocs, []);
  const entities = safeParse<Entity[]>(c.entities, []);
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-line/70 bg-surface-100/40 p-4">
      <button onClick={() => setOpen((o) => !o)} className="w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${v.cls}`}>
              <Icon icon={v.icon} className="h-3.5 w-3.5" /> {v.label}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[11px] capitalize ${severityChip(c.severity)}`}>{c.severity}</span>
            {c.risk_score != null && (
              <span className="chip tnum !py-0.5 text-[11px]">risk {c.risk_score}</span>
            )}
          </div>
          <span className="font-mono text-[11px] text-zinc-500">{c.case_id}</span>
        </div>
        <h3 className="mt-2.5 text-sm font-medium text-zinc-100">{c.title}</h3>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-600">
          <span>{fmtTime(c.created_at)}</span>
          <span>· conf {Number(c.confidence).toFixed(2)}</span>
          <Icon icon="solar:alt-arrow-down-linear" className={`ml-auto h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>
      {open && (
        <div className="mt-3 border-t border-line/60 pt-3">
          <p className="text-[12px] leading-relaxed text-zinc-400">{c.summary}</p>
          {entities.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {entities.map((e, i) => (
                <span key={i} className="rounded border border-line bg-surface-50 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
                  {e.type}:{e.value}
                </span>
              ))}
            </div>
          )}
          {iocs.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {iocs.map((i) => (
                <span key={i} className="rounded border border-line bg-ink/40 px-1.5 py-0.5 font-mono text-[10px] text-threat-high">
                  {i}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetectionCard({ d }: { d: DetectionRow }) {
  const on = String(d.is_scheduled) === "1" || d.is_scheduled === true || String(d.is_scheduled) === "true";
  return (
    <div className="rounded-xl border border-line/70 bg-surface-100/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon icon="solar:code-square-linear" className="h-4 w-4 text-primary-bright" />
          <h3 className="text-sm font-medium text-zinc-100">{d.name.replace(/^Argus - Auto:\s*/, "")}</h3>
        </div>
        <span className={`flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${on ? "border-confirm/30 bg-confirm/10 text-confirm" : "border-line text-zinc-500"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${on ? "bg-confirm animate-pulse-glow" : "bg-zinc-600"}`} />
          {on ? "scheduled" : "off"}
        </span>
      </div>
      {d.description && <p className="mt-2 line-clamp-2 text-[12px] leading-snug text-zinc-500">{d.description.replace(/\s*\[argus_case=[^\]]+\]/, "")}</p>}
      <div className="mt-2 flex items-center gap-2 text-[11px] text-zinc-600">
        <Icon icon="solar:clock-circle-linear" className="h-3.5 w-3.5" />
        <span className="font-mono">{d.cron_schedule}</span>
      </div>
      <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded-lg border border-line/60 bg-ink/60 p-2.5 font-mono text-[10px] leading-relaxed text-emerald-300/80">
        {d.search}
      </pre>
    </div>
  );
}

function Empty({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-2 p-4 text-sm text-zinc-600">
      <Icon icon={icon} className="h-4 w-4" /> {text}
    </div>
  );
}

export default function MemoryTab({ refreshKey }: { refreshKey: number }) {
  const cases = useEndpoint(() => api.cases(), refreshKey);
  const dets = useEndpoint(() => api.detections(), refreshKey);
  const blocks = useEndpoint(() => api.blocklist(), refreshKey);

  const caseRows = (cases.data?.cases ?? []).sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  const detRows = dets.data?.detections ?? [];
  const blockRows = (blocks.data?.blocklist ?? []) as BlocklistRow[];

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* cases */}
      <div className="panel lg:row-span-2">
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <Icon icon="solar:folder-with-files-linear" className="h-4 w-4 text-primary-bright" />
            <span className="text-sm font-medium text-zinc-200">Case memory</span>
          </div>
          <span className="chip tnum">{caseRows.length} cases</span>
        </div>
        <div className="flex max-h-[44rem] flex-col gap-3 overflow-y-auto p-3">
          {cases.loading && <Empty icon="solar:spinner-linear" text="loading cases…" />}
          {!cases.loading && caseRows.length === 0 && <Empty icon="solar:inbox-linear" text="No cases recorded yet — run an investigation with containment." />}
          {caseRows.map((c) => (
            <CaseCard key={c.case_id + (c.created_at ?? "")} c={c} />
          ))}
        </div>
      </div>

      {/* detections */}
      <div className="panel">
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <Icon icon="solar:code-square-linear" className="h-4 w-4 text-primary-bright" />
            <span className="text-sm font-medium text-zinc-200">Deployed detections</span>
            <span className="text-[11px] text-zinc-600">· self-hardening loop</span>
          </div>
          <span className="chip tnum">{detRows.length}</span>
        </div>
        <div className="flex max-h-[20rem] flex-col gap-3 overflow-y-auto p-3">
          {dets.loading && <Empty icon="solar:spinner-linear" text="loading detections…" />}
          {!dets.loading && detRows.length === 0 && <Empty icon="solar:inbox-linear" text="No auto-deployed detections yet." />}
          {detRows.map((d) => (
            <DetectionCard key={d.name} d={d} />
          ))}
        </div>
      </div>

      {/* blocklist */}
      <div className="panel">
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <Icon icon="solar:lock-keyhole-linear" className="h-4 w-4 text-primary-bright" />
            <span className="text-sm font-medium text-zinc-200">Threat blocklist</span>
            <span className="text-[11px] text-zinc-600">· enforced by correlation search</span>
          </div>
          <span className="chip tnum">{blockRows.length}</span>
        </div>
        <div className="flex max-h-[20rem] flex-col gap-2 overflow-y-auto p-3">
          {blocks.loading && <Empty icon="solar:spinner-linear" text="loading blocklist…" />}
          {!blocks.loading && blockRows.length === 0 && <Empty icon="solar:inbox-linear" text="Blocklist is empty." />}
          {blockRows.map((b, i) => (
            <div key={b.indicator + i} className="rounded-lg border border-line/70 bg-surface-100/40 p-3">
              <div className="flex items-center gap-2">
                <span className="rounded border border-line bg-surface-50 px-1.5 py-0.5 text-[10px] uppercase text-zinc-500">{b.type}</span>
                <span className="font-mono text-xs text-zinc-200">{b.indicator}</span>
                <span className={`ml-auto rounded-full border px-2 py-0.5 text-[10px] capitalize ${severityChip(b.severity)}`}>{b.severity}</span>
              </div>
              <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-zinc-500">{b.reason}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
