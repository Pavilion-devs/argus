"use client";

import { Icon } from "@iconify/react";
import { severityChip, verdictStyle } from "@/lib/format";
import type { Report } from "@/lib/types";
import RiskGauge from "./RiskGauge";

function Section({ icon, title, count, children }: { icon: string; title: string; count?: number; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line/70 bg-surface-100/40 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon icon={icon} className="h-4 w-4 text-primary-bright" />
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">{title}</span>
        {count != null && <span className="text-[11px] text-zinc-600">· {count}</span>}
      </div>
      {children}
    </div>
  );
}

export default function ReportPanel({
  report,
  evidenceIds,
  onEvidence,
}: {
  report: Report;
  evidenceIds: Set<string>;
  onEvidence: (toolUseId: string) => void;
}) {
  const v = verdictStyle(report.verdict);
  const ti = report.threat_intel_signal;

  return (
    <div className="panel overflow-hidden">
      {/* header */}
      <div className="border-b border-line/70 bg-gradient-to-r from-surface-100/80 to-transparent p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${v.cls}`}>
                <Icon icon={v.icon} className="h-4 w-4" /> {v.label}
              </span>
              <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${severityChip(report.severity)}`}>
                {report.severity}
              </span>
              <span className="chip tnum">confidence {Number(report.confidence).toFixed(2)}</span>
            </div>
            <h2 className="text-xl font-medium tracking-tight text-white">{report.title}</h2>
          </div>
          <div className="shrink-0">
            <RiskGauge score={report.risk_score} band={report.risk_band} size={132} />
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">{report.summary}</p>
        {report.risk_rationale && (
          <p className="mt-3 rounded-lg border border-line/60 bg-ink/40 px-3 py-2 font-mono text-[11px] leading-relaxed text-zinc-500">
            risk: {report.risk_rationale}
          </p>
        )}
      </div>

      <div className="grid gap-3 p-4 lg:grid-cols-2">
        {/* kill-chain */}
        {report.kill_chain?.length > 0 && (
          <Section icon="solar:routing-2-linear" title="ATT&CK kill-chain" count={report.kill_chain.length}>
            <div className="flex flex-wrap items-center gap-1.5">
              {report.kill_chain.map((k, i) => (
                <div key={k.label + i} className="flex items-center gap-1.5">
                  <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] text-primary-bright">
                    {k.label}
                  </span>
                  {i < report.kill_chain.length - 1 && (
                    <Icon icon="solar:alt-arrow-right-linear" className="h-3.5 w-3.5 text-zinc-600" />
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* threat intel */}
        {ti && (ti.notes?.length > 0 || ti.malicious) && (
          <Section icon="solar:shield-network-linear" title="Threat intel">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-md border px-2 py-1 text-[11px] ${ti.malicious ? "border-threat-critical/40 bg-threat-critical/10 text-threat-critical" : "border-line bg-surface-50 text-zinc-300"}`}>
                {ti.malicious ? "confirmed malicious infra" : "no hard malicious signal"}
              </span>
              {ti.notes?.map((n) => (
                <span key={n} className="rounded-md border border-line px-2 py-1 text-[11px] text-zinc-400">{n}</span>
              ))}
            </div>
          </Section>
        )}

        {/* MITRE techniques */}
        {report.mitre_attack?.length > 0 && (
          <Section icon="solar:shield-warning-linear" title="MITRE ATT&CK" count={report.mitre_attack.length}>
            <div className="flex flex-col gap-2">
              {report.mitre_attack.map((m) => (
                <div key={m.technique_id} className="flex items-start gap-2">
                  <span className="shrink-0 rounded border border-line bg-surface-50 px-1.5 py-0.5 font-mono text-[10px] text-primary-bright">
                    {m.technique_id}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[12px] text-zinc-200">{m.name}</div>
                    <div className="text-[11px] leading-snug text-zinc-500">{m.rationale}</div>
                  </div>
                </div>
              ))}
              {report.mitre_invalid?.length > 0 && (
                <div className="mt-1 text-[11px] text-refute">
                  dropped {report.mitre_invalid.length} invalid id(s): {report.mitre_invalid.join(", ")}
                </div>
              )}
            </div>
          </Section>
        )}

        {/* entities */}
        {report.affected_entities?.length > 0 && (
          <Section icon="solar:users-group-rounded-linear" title="Affected entities" count={report.affected_entities.length}>
            <div className="flex flex-col gap-1.5">
              {report.affected_entities.map((e, i) => (
                <div key={e.value + i} className="flex items-center gap-2 text-[12px]">
                  <span className="rounded border border-line bg-surface-50 px-1.5 py-0.5 text-[10px] uppercase text-zinc-500">{e.type}</span>
                  <span className="truncate font-mono text-zinc-200">{e.value}</span>
                  <span className="ml-auto text-[11px] capitalize text-zinc-500">{e.role}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* IOCs */}
        {report.iocs?.length > 0 && (
          <Section icon="solar:danger-triangle-linear" title="Indicators of compromise" count={report.iocs.length}>
            <div className="flex flex-wrap gap-1.5">
              {report.iocs.map((ioc) => (
                <span key={ioc} className="rounded-md border border-line bg-ink/40 px-2 py-1 font-mono text-[11px] text-zinc-300">
                  {ioc}
                </span>
              ))}
            </div>
          </Section>
        )}
      </div>

      {/* attack timeline with evidence drill-down */}
      {report.attack_timeline?.length > 0 && (
        <div className="border-t border-line/70 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Icon icon="solar:clock-circle-linear" className="h-4 w-4 text-primary-bright" />
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">Attack timeline</span>
            <span className="text-[11px] text-zinc-600">· click a step to see the exact query &amp; events behind it</span>
          </div>
          <ol className="relative ml-2 border-l border-line/70">
            {report.attack_timeline.map((t, i) => {
              const hasEvidence = t.evidence_tool_use_id && evidenceIds.has(t.evidence_tool_use_id);
              return (
                <li key={i} className="relative mb-3 pl-5 last:mb-0">
                  <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                  <button
                    disabled={!hasEvidence}
                    onClick={() => hasEvidence && onEvidence(t.evidence_tool_use_id!)}
                    className={`group w-full rounded-lg border p-3 text-left transition-all ${
                      hasEvidence
                        ? "border-line/70 bg-surface-100/40 hover:border-primary/40 hover:bg-surface-50"
                        : "cursor-default border-line/40 bg-surface-100/20"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-zinc-500">{t.time}</span>
                      {hasEvidence && (
                        <span className="flex items-center gap-1 text-[10px] text-primary-bright opacity-70 transition-opacity group-hover:opacity-100">
                          <Icon icon="solar:code-square-linear" className="h-3.5 w-3.5" /> evidence
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[13px] leading-snug text-zinc-200">{t.event}</p>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* recommended actions */}
      {report.recommended_actions?.length > 0 && (
        <div className="border-t border-line/70 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Icon icon="solar:checklist-minimalistic-linear" className="h-4 w-4 text-primary-bright" />
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">Recommended actions</span>
          </div>
          <div className="flex flex-col gap-2">
            {report.recommended_actions.map((a, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-lg border border-line/70 bg-surface-100/40 p-3">
                <Icon
                  icon={a.automatable ? "solar:bolt-circle-linear" : "solar:hand-stars-linear"}
                  className={`mt-0.5 h-4 w-4 shrink-0 ${a.automatable ? "text-confirm" : "text-zinc-500"}`}
                />
                <div className="min-w-0">
                  <p className="text-[13px] text-zinc-200">{a.action}</p>
                  <p className="text-[11px] leading-snug text-zinc-500">{a.rationale}</p>
                </div>
                {a.automatable && (
                  <span className="ml-auto shrink-0 rounded border border-confirm/30 bg-confirm/10 px-1.5 py-0.5 text-[10px] text-confirm">
                    automatable
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
