"use client";

import { Icon } from "@iconify/react";
import { hypothesisStyle } from "@/lib/format";
import type { Hypothesis } from "@/lib/types";

export default function HypothesisLedger({ hypotheses }: { hypotheses: Record<string, Hypothesis> }) {
  const items = Object.values(hypotheses);
  const counts = {
    confirmed: items.filter((h) => h.status === "confirmed").length,
    refuted: items.filter((h) => h.status === "refuted").length,
    open: items.filter((h) => h.status === "open").length,
  };
  return (
    <div className="panel">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <Icon icon="solar:branching-paths-up-linear" className="h-4 w-4 text-primary-bright" />
          <span className="text-sm font-medium text-zinc-200">Hypothesis ledger</span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-confirm">{counts.confirmed} confirmed</span>
          <span className="text-refute">{counts.refuted} refuted</span>
          <span className="text-threat-medium">{counts.open} open</span>
        </div>
      </div>
      <div className="flex flex-col gap-2 p-3">
        {items.length === 0 && (
          <div className="py-5 text-sm text-zinc-600">
            Argus declares its theories here, then marks each confirmed or refuted as evidence lands.
          </div>
        )}
        {items.map((h) => {
          const st = hypothesisStyle(h.status);
          return (
            <div key={h.id} className="rounded-lg border border-line/70 bg-surface-100/40 p-3">
              <div className="flex items-start gap-2.5">
                <Icon icon={st.icon} className={`mt-0.5 h-4 w-4 shrink-0 ${st.cls}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-snug text-zinc-200">{h.statement}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                    <span className={`font-medium capitalize ${st.cls}`}>{h.status}</span>
                    {h.confidence != null && (
                      <span className="text-zinc-500">conf {Number(h.confidence).toFixed(2)}</span>
                    )}
                    {h.evidence && <span className="truncate text-zinc-600">· {h.evidence}</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
