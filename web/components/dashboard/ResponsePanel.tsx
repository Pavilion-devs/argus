"use client";

import { Icon } from "@iconify/react";
import { extractSPL } from "@/lib/format";
import type { ResponseAction, ResponseState } from "@/lib/useInvestigation";

function actionIcon(name?: string): string {
  switch (name) {
    case "block_indicator": return "solar:lock-keyhole-linear";
    case "deploy_detection": return "solar:code-square-linear";
    case "notify_slack": return "solar:chat-round-line-linear";
    case "create_ticket": return "solar:ticket-linear";
    default: return "solar:bolt-circle-linear";
  }
}

// Modal overlay for the single action currently awaiting an operator decision.
function ApprovalModal({
  action,
  onDecide,
}: {
  action: ResponseAction;
  onDecide: (id: string, approved: boolean) => void;
}) {
  const spl = action.input ? extractSPL(action.input) : null;
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg animate-fade-up rounded-2xl border border-threat-medium/40 bg-surface shadow-card">
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-threat-medium/40 bg-threat-medium/10">
            <Icon icon="solar:shield-warning-linear" className="h-6 w-6 text-threat-medium" />
          </span>
          <div>
            <div className="text-sm font-medium text-white">Approval required</div>
            <div className="text-[11px] text-zinc-500">Argus proposes a real containment action</div>
          </div>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-2 rounded-lg border border-line/70 bg-surface-100/50 p-3">
            <Icon icon={actionIcon(action.name)} className="h-5 w-5 text-primary-bright" />
            <span className="text-sm text-zinc-200">{action.desc}</span>
          </div>
          {spl && (
            <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-line/70 bg-ink/60 p-3 font-mono text-[11px] leading-relaxed text-emerald-300/90">
              {spl}
            </pre>
          )}
          {action.input && !spl && (
            <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-line/70 bg-ink/60 p-3 font-mono text-[11px] text-zinc-300">
              {JSON.stringify(action.input, null, 2)}
            </pre>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-line px-5 py-4">
          <button
            onClick={() => onDecide(action.action_id!, false)}
            className="btn-ghost !border-refute/40 !text-refute hover:!bg-refute/10"
          >
            <Icon icon="solar:close-circle-linear" className="h-4 w-4" /> Deny
          </button>
          <button onClick={() => onDecide(action.action_id!, true)} className="btn-primary !bg-confirm hover:!bg-emerald-600">
            <Icon icon="solar:check-circle-linear" className="h-4 w-4" /> Approve &amp; execute
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionRow({ a }: { a: ResponseAction }) {
  const ok = a.result?.ok;
  const skipped = a.status === "skipped" || a.result?.skipped;
  const tag = skipped
    ? { cls: "text-zinc-500 border-line", label: "skipped", icon: "solar:minus-circle-linear" }
    : ok
      ? { cls: "text-confirm border-confirm/30 bg-confirm/[0.06]", label: "executed", icon: "solar:check-circle-linear" }
      : { cls: "text-refute border-refute/30 bg-refute/[0.06]", label: "failed", icon: "solar:close-circle-linear" };
  return (
    <div className={`rounded-lg border p-3 ${tag.cls}`}>
      <div className="flex items-center gap-2">
        <Icon icon={actionIcon(a.name)} className="h-4 w-4 shrink-0" />
        <span className="text-[13px] text-zinc-200">{a.desc}</span>
        <span className="ml-auto flex items-center gap-1 text-[11px]">
          <Icon icon={tag.icon} className="h-3.5 w-3.5" /> {tag.label}
        </span>
      </div>
      {a.result?.reason != null && (
        <div className="mt-1 pl-6 text-[11px] text-zinc-500">{String(a.result.reason)}</div>
      )}
      {a.result?.name != null && a.name === "deploy_detection" && (
        <div className="mt-1 pl-6 text-[11px] text-confirm">deployed as “{String(a.result.name)}”</div>
      )}
    </div>
  );
}

export default function ResponsePanel({
  report,
  response,
  onRespond,
  onDecide,
}: {
  report: boolean;
  response: ResponseState;
  onRespond: (mode: "approve" | "auto") => void;
  onDecide: (id: string, approved: boolean) => void;
}) {
  const pending = response.actions.find((a) => a.status === "proposed" && a.action_id);

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <Icon icon="solar:shield-keyhole-linear" className="h-4 w-4 text-primary-bright" />
          <span className="text-sm font-medium text-zinc-200">Response &amp; containment</span>
        </div>
        {response.status === "idle" && report && (
          <div className="flex items-center gap-2">
            <button onClick={() => onRespond("approve")} className="btn-primary !px-3 !py-1.5 text-xs">
              <Icon icon="solar:play-circle-linear" className="h-4 w-4" /> Contain &amp; harden
            </button>
          </div>
        )}
        {response.status === "running" && (
          <span className="flex items-center gap-1.5 text-[11px] text-primary-bright">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-bright animate-pulse-glow" /> executing
          </span>
        )}
        {response.status === "done" && (
          <span className="flex items-center gap-1.5 text-[11px] text-confirm">
            <Icon icon="solar:check-circle-linear" className="h-3.5 w-3.5" /> complete
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 p-3">
        {response.status === "idle" && (
          <div className="p-3 text-sm text-zinc-500">
            Launch the gated response phase: Argus records the case, then proposes real containment
            actions (blocklist writes, detection deploy, tickets) — each requires your approval.
          </div>
        )}
        {response.caseId && (
          <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/[0.06] p-3 text-[13px]">
            <Icon icon="solar:folder-with-files-linear" className="h-4 w-4 text-primary-bright" />
            <span className="text-zinc-200">Case recorded</span>
            <span className="ml-auto font-mono text-xs text-primary-bright">{response.caseId}</span>
          </div>
        )}
        {response.actions.filter((a) => a.status !== "proposed").map((a, i) => (
          <ActionRow key={i} a={a} />
        ))}
        {response.summary && (
          <div className="mt-1 rounded-lg border border-confirm/30 bg-confirm/[0.06] p-3 text-[13px] text-zinc-300">
            <span className="font-medium text-confirm">Response complete · </span>
            {response.summary}
          </div>
        )}
      </div>

      {pending && <ApprovalModal action={pending} onDecide={onDecide} />}
    </div>
  );
}
