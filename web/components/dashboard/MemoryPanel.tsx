"use client";

import { Icon } from "@iconify/react";
import { fmtTime, severityChip } from "@/lib/format";
import type { Recall } from "@/lib/types";
import type { InvestigationState } from "@/lib/useInvestigation";

// Merge all recall events into a deduped view of prior knowledge.
function merge(recalls: Recall[]) {
  const blocks = new Map<string, Recall["blocklist_hits"][number]>();
  const cases = new Map<string, Recall["related_cases"][number]>();
  for (const r of recalls) {
    for (const b of r.blocklist_hits ?? []) blocks.set((b.indicator ?? "").toLowerCase(), b);
    for (const c of r.related_cases ?? []) cases.set(c.case_id, c);
  }
  return { blocks: [...blocks.values()], cases: [...cases.values()] };
}

export default function MemoryPanel({ state }: { state: InvestigationState }) {
  const { blocks, cases } = merge(state.recalls);
  const hasMemory = blocks.length > 0 || cases.length > 0;
  const cont = state.continuation;

  if (!hasMemory && !cont) {
    return (
      <div className="panel">
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <Icon icon="solar:history-linear" className="h-4 w-4 text-primary-bright" />
            <span className="text-sm font-medium text-zinc-200">Institutional memory</span>
          </div>
        </div>
        <div className="p-4 text-sm text-zinc-600">
          Argus checks its case memory & blocklist as it discovers indicators. Repeat offenders surface here.
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <Icon icon="solar:history-linear" className="h-4 w-4 text-primary-bright" />
          <span className="text-sm font-medium text-zinc-200">Institutional memory</span>
        </div>
        {hasMemory && (
          <span className="flex items-center gap-1.5 text-[11px] text-primary-bright">
            <Icon icon="solar:bell-bing-linear" className="h-3.5 w-3.5" /> seen before
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2.5 p-3">
        {blocks.map((b) => (
          <div key={b.indicator} className="rounded-lg border border-threat-critical/30 bg-threat-critical/[0.06] p-3">
            <div className="flex items-center gap-2">
              <Icon icon="solar:lock-keyhole-linear" className="h-4 w-4 text-threat-critical" />
              <span className="font-mono text-xs text-zinc-200">{b.indicator}</span>
              <span className={`ml-auto rounded border px-1.5 py-0.5 text-[10px] capitalize ${severityChip(b.severity)}`}>
                already blocked
              </span>
            </div>
            <p className="mt-1.5 line-clamp-2 text-[12px] leading-snug text-zinc-400">{b.reason}</p>
            {b.case_id && <div className="mt-1 text-[10px] text-zinc-600">prior case {b.case_id}</div>}
          </div>
        ))}
        {cases.map((c) => (
          <div key={c.case_id} className="rounded-lg border border-line/70 bg-surface-100/40 p-3">
            <div className="flex items-center gap-2">
              <Icon icon="solar:folder-with-files-linear" className="h-4 w-4 text-primary-bright" />
              <span className="text-xs font-medium text-zinc-200">{c.case_id}</span>
              <span className={`ml-auto rounded border px-1.5 py-0.5 text-[10px] capitalize ${severityChip(c.severity)}`}>
                {c.verdict?.replace("_", " ")}
              </span>
            </div>
            <p className="mt-1.5 line-clamp-2 text-[12px] leading-snug text-zinc-400">{c.title}</p>
            <div className="mt-1 flex items-center gap-2 text-[10px] text-zinc-600">
              {c.overlap?.length > 0 && <span>shared: {c.overlap.join(", ")}</span>}
              <span className="ml-auto">{fmtTime(c.created_at)}</span>
            </div>
          </div>
        ))}

        {cont && (
          <div className="rounded-lg border border-threat-medium/40 bg-threat-medium/[0.07] p-3">
            <div className="flex items-center gap-2 text-threat-medium">
              <Icon icon="solar:refresh-circle-linear" className="h-4 w-4" />
              <span className="text-xs font-medium">↻ continuation triggered</span>
            </div>
            <p className="mt-1.5 text-[12px] leading-snug text-zinc-400">
              Verdict was <span className="font-medium text-zinc-300">{cont.verdict}</span> @ conf{" "}
              {Number(cont.confidence).toFixed(2)} — {cont.reason}. Pursuing the decisive pivot before finalizing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
