"use client";

import Link from "next/link";
import { Icon } from "@iconify/react";

type Tab = "investigate" | "memory" | "proof" | "evaluation";

const NAV: { id: Tab; label: string; icon: string }[] = [
  { id: "investigate", label: "Live investigation", icon: "solar:pulse-linear" },
  { id: "memory", label: "Memory & hardening", icon: "solar:history-linear" },
  { id: "proof", label: "SOC proof", icon: "solar:shield-check-linear" },
  { id: "evaluation", label: "Evaluation", icon: "solar:chart-square-linear" },
];

function SideLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  const cls =
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-surface-100/60 hover:text-white";
  const external = href.startsWith("http");
  const inner = (
    <>
      <Icon icon={icon} className="h-[18px] w-[18px] shrink-0" />
      <span>{label}</span>
    </>
  );
  return external ? (
    <a href={href} target="_blank" rel="noreferrer" className={cls}>
      {inner}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  );
}

// Fixed left rail for the dashboard. Desktop-only; the Topbar carries a compact
// tab switcher on small screens.
export default function Sidebar({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r border-line bg-ink/80 backdrop-blur-xl lg:flex">
      <Link href="/" className="flex h-16 items-center gap-2.5 border-b border-line px-5 transition-opacity hover:opacity-90">
        <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-orb shadow-glow-sm">
          <Icon icon="solar:eye-scan-linear" className="h-5 w-5 text-white" />
        </span>
        <span className="leading-tight">
          <span className="block text-[15px] font-medium tracking-tight text-white">Argus</span>
          <span className="block text-[10px] text-zinc-500">SOC investigation agent</span>
        </span>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-2 px-2 text-[10px] font-medium uppercase tracking-wider text-zinc-600">Console</div>
        <div className="space-y-1">
          {NAV.map((n) => {
            const active = tab === n.id;
            return (
              <button
                key={n.id}
                onClick={() => onTab(n.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary-bright"
                    : "text-zinc-400 hover:bg-surface-100/60 hover:text-white"
                }`}
              >
                <Icon icon={n.icon} className="h-[18px] w-[18px] shrink-0" />
                <span className="flex-1">{n.label}</span>
                {active && <span className="h-1.5 w-1.5 rounded-full bg-primary-bright animate-pulse-glow" />}
              </button>
            );
          })}
        </div>

        <div className="my-4 border-t border-line/70" />

        <div className="mb-2 px-2 text-[10px] font-medium uppercase tracking-wider text-zinc-600">Project</div>
        <div className="space-y-1">
          <SideLink href="/" icon="solar:home-smile-linear" label="Home" />
          <SideLink href="/docs" icon="solar:book-2-linear" label="Docs" />
          <SideLink href="https://github.com/Pavilion-devs/argus" icon="simple-icons:github" label="GitHub" />
        </div>
      </nav>

      <div className="border-t border-line px-4 py-3 text-[11px] leading-relaxed text-zinc-600">
        Built for the Splunk Agentic Ops Hackathon · Security track
      </div>
    </aside>
  );
}
