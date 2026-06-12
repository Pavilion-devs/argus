"use client";

import { Icon } from "@iconify/react";

type Tab = "investigate" | "memory" | "proof" | "evaluation";

interface Health {
  mcp?: string;
  provider?: string;
  model?: string;
}

function HealthPill({ health }: { health: Health | null }) {
  const ok = health?.mcp === "connected";
  return (
    <div className="flex items-center gap-2 rounded-full border border-line bg-surface-100/60 px-3 py-1.5 text-[11px]">
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          ok ? "bg-confirm animate-pulse-glow" : health ? "bg-threat-high" : "bg-zinc-600"
        }`}
      />
      <span className="text-zinc-400">
        {health ? (
          <>
            MCP {ok ? "connected" : health.mcp} · {health.provider}/
            {(health.model ?? "").replace(/^global\.anthropic\./, "")}
          </>
        ) : (
          "checking engine…"
        )}
      </span>
    </div>
  );
}

const META: Record<Tab, { title: string; sub: string }> = {
  investigate: {
    title: "Investigation console",
    sub: "Live, grounded autonomous investigation streamed from the real Argus engine.",
  },
  memory: {
    title: "Memory & hardening",
    sub: "Recorded cases, auto-deployed detections, and the active threat blocklist.",
  },
  proof: {
    title: "SOC proof",
    sub: "Splunk alert-action jobs and on-demand proof that Argus detections fire.",
  },
  evaluation: {
    title: "Evaluation",
    sub: "The BOTS v3 benchmark — verdict accuracy, grounding, and per-scenario results.",
  },
};

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "investigate", label: "Live", icon: "solar:pulse-linear" },
  { id: "memory", label: "Memory", icon: "solar:history-linear" },
  { id: "proof", label: "Proof", icon: "solar:shield-check-linear" },
  { id: "evaluation", label: "Eval", icon: "solar:chart-square-linear" },
];

// Full-width sticky header for the dashboard content area (sits to the right of
// the fixed Sidebar on desktop). Carries the page title, live engine health, and
// a compact tab switcher on small screens where the sidebar is hidden.
export default function Topbar({
  tab,
  onTab,
  health,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
  health: Health | null;
}) {
  const meta = META[tab];
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/70 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-orb shadow-glow-sm lg:hidden">
          <Icon icon="solar:eye-scan-linear" className="h-5 w-5 text-white" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-base font-medium tracking-tight text-white sm:text-lg">{meta.title}</h1>
          <p className="hidden truncate text-[12px] text-zinc-500 sm:block">{meta.sub}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <HealthPill health={health} />
        </div>
      </div>

      {/* compact tab switcher — only when the sidebar is hidden */}
      <div className="flex gap-1 px-4 pb-3 lg:hidden">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => onTab(t.id)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors ${
              tab === t.id ? "bg-primary text-white" : "border border-line text-zinc-400 hover:text-white"
            }`}
          >
            <Icon icon={t.icon} className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>
    </header>
  );
}
