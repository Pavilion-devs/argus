"use client";

import { useEffect } from "react";
import { Icon } from "@iconify/react";
import { extractSPL, toolLabel } from "@/lib/format";
import type { ToolCallRecord } from "@/lib/useInvestigation";

export default function EvidenceDrawer({
  rec,
  onClose,
}: {
  rec: ToolCallRecord | null;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!rec) return null;
  const spl = extractSPL(rec.input);

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-2xl animate-fade-up flex-col border-l border-line bg-surface shadow-[10px_0_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-primary/30 bg-primary/10">
              <Icon icon="solar:code-square-linear" className="h-5 w-5 text-primary-bright" />
            </span>
            <div>
              <div className="text-sm font-medium text-white">Evidence</div>
              <div className="text-[11px] text-zinc-500">
                {toolLabel(rec.name)} · {rec.id}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg border border-line p-2 text-zinc-400 transition-colors hover:border-white/20 hover:text-white">
            <Icon icon="solar:close-circle-linear" className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wider text-zinc-500">
            <Icon icon="solar:magnifer-linear" className="h-3.5 w-3.5" /> exact SPL run
          </div>
          <pre className="mb-6 overflow-x-auto whitespace-pre-wrap rounded-xl border border-line/70 bg-ink/60 p-4 font-mono text-xs leading-relaxed text-emerald-300/90">
            {spl ?? JSON.stringify(rec.input, null, 2)}
          </pre>

          <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wider text-zinc-500">
            <Icon icon="solar:database-linear" className="h-3.5 w-3.5" />
            {rec.result?.is_error ? "error" : "raw events returned"}
          </div>
          <pre
            className={`overflow-auto whitespace-pre-wrap rounded-xl border border-line/70 bg-ink/60 p-4 font-mono text-xs leading-relaxed ${
              rec.result?.is_error ? "text-refute/90" : "text-zinc-300"
            }`}
          >
            {rec.result?.text ?? "(no result captured)"}
          </pre>
        </div>

        <div className="border-t border-line px-5 py-3 text-[11px] text-zinc-600">
          This is the actual query Argus issued through the Splunk MCP Server and the actual data it
          read — the grounding behind the claim.
        </div>
      </aside>
    </div>
  );
}
