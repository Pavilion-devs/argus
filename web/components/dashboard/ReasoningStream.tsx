"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { AGENT_META } from "@/lib/format";
import type { AgentName } from "@/lib/types";
import type { InvestigationState } from "@/lib/useInvestigation";

function useAutoScroll(dep: string) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // only stick to bottom if the user is already near the bottom
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [dep]);
  return ref;
}

function StreamBody({
  thinking,
  answer,
  live,
}: {
  thinking?: string;
  answer?: string;
  live: boolean;
}) {
  const ref = useAutoScroll((thinking ?? "") + (answer ?? ""));
  const empty = !thinking && !answer;
  return (
    <div ref={ref} className="max-h-[28rem] min-h-[7rem] overflow-y-auto px-4 py-3 text-[13px] leading-relaxed">
      {empty && (
        <div className="flex items-center gap-2 py-6 text-zinc-600">
          <Icon icon="solar:hourglass-linear" className="h-4 w-4 animate-pulse-glow" />
          waiting for reasoning…
        </div>
      )}
      {thinking && (
        <p className="whitespace-pre-wrap italic text-zinc-500">{thinking}</p>
      )}
      {answer && (
        <p className={`mt-3 whitespace-pre-wrap text-zinc-200 ${live ? "stream-caret" : ""}`}>{answer}</p>
      )}
    </div>
  );
}

function Lane({
  agent,
  state,
}: {
  agent: Exclude<AgentName, "">;
  state: InvestigationState;
}) {
  const meta = AGENT_META[agent];
  const status = state.specialists[agent];
  const live = status === "running";
  return (
    <div className={`flex flex-col overflow-hidden rounded-xl border ${meta.ring} bg-surface-100/40`}>
      <div className="flex items-center justify-between border-b border-line/60 px-3 py-2">
        <div className="flex items-center gap-2">
          <Icon icon={meta.icon} className={`h-4 w-4 ${meta.text}`} />
          <span className={`text-xs font-medium ${meta.text}`}>{meta.label}</span>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
          {status === "done" ? (
            <>
              <Icon icon="solar:check-circle-linear" className="h-3.5 w-3.5 text-confirm" /> done
            </>
          ) : live ? (
            <>
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot} animate-pulse-glow`} /> live
            </>
          ) : (
            "queued"
          )}
        </span>
      </div>
      <StreamBody thinking={state.thinking[agent]} answer={state.answer[agent]} live={live} />
    </div>
  );
}

export default function ReasoningStream({ state }: { state: InvestigationState }) {
  if (state.mode === "multi") {
    const agents: Exclude<AgentName, "">[] = ["auth", "network", "endpoint", "intel"];
    return (
      <div className="panel">
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <Icon icon="solar:routing-2-linear" className="h-4 w-4 text-primary-bright" />
            <span className="text-sm font-medium text-zinc-200">Specialist team — reasoning in parallel</span>
          </div>
          <span className="chip">4 lanes</span>
        </div>
        <div className="grid gap-3 p-3 lg:grid-cols-2">
          {agents.map((a) => (
            <Lane key={a} agent={a} state={state} />
          ))}
        </div>
      </div>
    );
  }

  const live = state.status === "running";
  return (
    <div className="panel">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <Icon icon="solar:cpu-bolt-linear" className="h-4 w-4 text-primary-bright" />
          <span className="text-sm font-medium text-zinc-200">Live reasoning</span>
        </div>
        {live && (
          <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-primary-bright">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-bright animate-pulse-glow" /> streaming
          </span>
        )}
      </div>
      <StreamBody thinking={state.thinking[""]} answer={state.answer[""]} live={live} />
    </div>
  );
}
