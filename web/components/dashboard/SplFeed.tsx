"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { AGENT_META, extractSPL, toolLabel } from "@/lib/format";
import type { ToolCallRecord } from "@/lib/useInvestigation";

function ToolRow({ rec, multi }: { rec: ToolCallRecord; multi: boolean }) {
  const [open, setOpen] = useState(false);
  const spl = extractSPL(rec.input);
  const oneLine = spl ?? JSON.stringify(rec.input);
  const meta = rec.agent ? AGENT_META[rec.agent] : null;
  const pending = !rec.result;
  const err = rec.result?.is_error;

  return (
    <div className="rounded-lg border border-line/70 bg-surface-100/40">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-surface-50/50"
      >
        <span className="mt-0.5 shrink-0">
          {pending ? (
            <Icon icon="solar:spinner-linear" className="h-4 w-4 animate-spin-slow text-primary-bright" />
          ) : err ? (
            <Icon icon="solar:close-circle-linear" className="h-4 w-4 text-refute" />
          ) : (
            <Icon icon="solar:check-circle-linear" className="h-4 w-4 text-confirm" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {meta && <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} title={meta.label} />}
            <span className="text-xs font-medium text-zinc-300">{toolLabel(rec.name)}</span>
            {multi && meta && <span className={`text-[10px] ${meta.text}`}>{meta.label}</span>}
          </div>
          <div className="mt-1 truncate font-mono text-[11px] text-emerald-300/80">{oneLine}</div>
        </div>
        <Icon
          icon="solar:alt-arrow-down-linear"
          className={`mt-0.5 h-4 w-4 shrink-0 text-zinc-600 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="border-t border-line/60 px-3 py-3">
          {spl && (
            <div className="mb-3">
              <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-600">query</div>
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-md border border-line/60 bg-ink/60 p-2.5 font-mono text-[11px] leading-relaxed text-emerald-300/90">
                {spl}
              </pre>
            </div>
          )}
          {!spl && (
            <pre className="mb-3 overflow-x-auto whitespace-pre-wrap rounded-md border border-line/60 bg-ink/60 p-2.5 font-mono text-[11px] text-zinc-300">
              {JSON.stringify(rec.input, null, 2)}
            </pre>
          )}
          <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-600">
            {err ? "error" : "result"}
          </div>
          <pre className={`max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-line/60 bg-ink/60 p-2.5 font-mono text-[11px] leading-relaxed ${err ? "text-refute/90" : "text-zinc-300"}`}>
            {rec.result?.text ?? "(running…)"}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function SplFeed({
  toolCalls,
  multi,
}: {
  toolCalls: ToolCallRecord[];
  multi: boolean;
}) {
  // Surface real data queries prominently; show count of memory/hypothesis ops too.
  const queries = toolCalls.filter((t) => t.name === "splunk_run_query");
  return (
    <div className="panel flex flex-col">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <Icon icon="solar:database-linear" className="h-4 w-4 text-primary-bright" />
          <span className="text-sm font-medium text-zinc-200">SPL feed</span>
        </div>
        <span className="chip tnum">{queries.length} queries · {toolCalls.length} tool calls</span>
      </div>
      <div className="flex max-h-[34rem] flex-col gap-2 overflow-y-auto p-3">
        {toolCalls.length === 0 && (
          <div className="flex items-center gap-2 py-8 text-sm text-zinc-600">
            <Icon icon="solar:inbox-linear" className="h-4 w-4" />
            No queries yet — they appear here the moment Argus runs them.
          </div>
        )}
        {toolCalls.map((rec) => (
          <ToolRow key={rec.id} rec={rec} multi={multi} />
        ))}
      </div>
    </div>
  );
}
