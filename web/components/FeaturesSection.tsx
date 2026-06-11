'use client';

import { Icon } from "@iconify/react";
import MaskedText from "./MaskedText";

export default function FeaturesSection() {
  return (
    <section className="bg-[#131315]/80 flex flex-col relative z-20 backdrop-blur-sm" id="features">
      <div className="flex flex-col border-y text-center bg-[#000000] w-full border-[#27272a] pt-28 pb-20 items-center">
        <div className="reveal-element inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2563eb]/10 border border-[#2563eb]/20 text-[#2563eb] text-xs font-medium tracking-wide font-geist mb-6">
          <Icon icon="solar:stars-linear" />
          Investigation tradecraft
        </div>
        <h2 className="flex flex-wrap gap-x-[0.25em] gap-y-[0.1em] text-3xl md:text-5xl font-light tracking-tighter text-white font-geist max-w-2xl mb-6 justify-center">
          <MaskedText text="Every step an analyst would take" />
        </h2>
        <p className="reveal-element text-zinc-400 text-lg font-extralight max-w-xl font-geist leading-relaxed">A full plan → act → observe → re-plan loop, run autonomously as a single agent or a four-specialist team — and it proves every claim it makes.</p>
      </div>
      <div className="flex flex-col xl:px-20 bg-[#000000] w-full mt-[-1px] pb-20">
        <div className="stagger-container grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[1px] bg-[#27272a] border border-[#27272a] w-full">
          <div className="stagger-item bg-[#18181b] hover:bg-[#1e1e22] transition-colors duration-300 p-10 xl:p-14 group flex flex-col cursor-pointer">
            <div className="flex justify-between items-start mb-14">
              <div className="w-14 h-14 border border-[#27272a] flex items-center justify-center group-hover:border-[#2563eb]/50 transition-colors bg-[#131315]">
                <Icon className="text-2xl text-zinc-500 group-hover:text-[#2563eb] transition-colors" icon="solar:link-circle-linear" />
              </div>
              <span className="text-5xl font-extralight text-[#27272a] group-hover:text-zinc-600 transition-colors font-geist tracking-tighter">01</span>
            </div>
            <h3 className="text-xl font-medium tracking-tight text-zinc-100 font-geist mb-4 group-hover:text-[#2563eb] transition-colors">Grounded, provable reasoning</h3>
            <p className="text-zinc-500 text-sm font-extralight leading-relaxed font-geist">Every verdict links to the exact SPL Argus ran and the exact events it saw. Click any conclusion in the report to drill down to the query and the rows behind it.</p>
          </div>
          <div className="stagger-item bg-[#18181b] hover:bg-[#1e1e22] transition-colors duration-300 p-10 xl:p-14 group flex flex-col cursor-pointer">
            <div className="flex justify-between items-start mb-14">
              <div className="w-14 h-14 border border-[#27272a] flex items-center justify-center group-hover:border-[#2563eb]/50 transition-colors bg-[#131315]">
                <Icon className="text-2xl text-zinc-500 group-hover:text-[#2563eb] transition-colors" icon="solar:checklist-minimalistic-linear" />
              </div>
              <span className="text-5xl font-extralight text-[#27272a] group-hover:text-zinc-600 transition-colors font-geist tracking-tighter">02</span>
            </div>
            <h3 className="text-xl font-medium tracking-tight text-zinc-100 font-geist mb-4 group-hover:text-[#2563eb] transition-colors">Explicit hypothesis ledger</h3>
            <p className="text-zinc-500 text-sm font-extralight leading-relaxed font-geist">Argus declares its leading theories up front and marks each confirmed or refuted as evidence lands — so it tests alternatives instead of just confirming the first guess.</p>
          </div>
          <div className="stagger-item bg-[#18181b] hover:bg-[#1e1e22] transition-colors duration-300 p-10 xl:p-14 group flex flex-col cursor-pointer">
            <div className="flex justify-between items-start mb-14">
              <div className="w-14 h-14 border border-[#27272a] flex items-center justify-center group-hover:border-[#2563eb]/50 transition-colors bg-[#131315]">
                <Icon className="text-2xl text-zinc-500 group-hover:text-[#2563eb] transition-colors" icon="solar:history-linear" />
              </div>
              <span className="text-5xl font-extralight text-[#27272a] group-hover:text-zinc-600 transition-colors font-geist tracking-tighter">03</span>
            </div>
            <h3 className="text-xl font-medium tracking-tight text-zinc-100 font-geist mb-4 group-hover:text-[#2563eb] transition-colors">Institutional memory</h3>
            <p className="text-zinc-500 text-sm font-extralight leading-relaxed font-geist">Before and during every case Argus recalls its own past investigations and active blocklist — a repeat-offender indicator surfaces its prior verdict instantly, the way a veteran analyst would remember it.</p>
          </div>
          <div className="stagger-item bg-[#18181b] hover:bg-[#1e1e22] transition-colors duration-300 p-10 xl:p-14 group flex flex-col cursor-pointer">
            <div className="flex justify-between items-start mb-14">
              <div className="w-14 h-14 border border-[#27272a] flex items-center justify-center group-hover:border-[#2563eb]/50 transition-colors bg-[#131315]">
                <Icon className="text-2xl text-zinc-500 group-hover:text-[#2563eb] transition-colors" icon="solar:shield-network-linear" />
              </div>
              <span className="text-5xl font-extralight text-[#27272a] group-hover:text-zinc-600 transition-colors font-geist tracking-tighter">04</span>
            </div>
            <h3 className="text-xl font-medium tracking-tight text-zinc-100 font-geist mb-4 group-hover:text-[#2563eb] transition-colors">Validated MITRE ATT&amp;CK</h3>
            <p className="text-zinc-500 text-sm font-extralight leading-relaxed font-geist">Every technique ID is checked against a pinned ATT&amp;CK v19.1 catalog of 858 techniques; hallucinated IDs are dropped, and the incident's tactics render as an ordered kill-chain.</p>
          </div>
          <div className="stagger-item bg-[#18181b] hover:bg-[#1e1e22] transition-colors duration-300 p-10 xl:p-14 group flex flex-col cursor-pointer">
            <div className="flex justify-between items-start mb-14">
              <div className="w-14 h-14 border border-[#27272a] flex items-center justify-center group-hover:border-[#2563eb]/50 transition-colors bg-[#131315]">
                <Icon className="text-2xl text-zinc-500 group-hover:text-[#2563eb] transition-colors" icon="solar:chart-square-linear" />
              </div>
              <span className="text-5xl font-extralight text-[#27272a] group-hover:text-zinc-600 transition-colors font-geist tracking-tighter">05</span>
            </div>
            <h3 className="text-xl font-medium tracking-tight text-zinc-100 font-geist mb-4 group-hover:text-[#2563eb] transition-colors">Composite risk score</h3>
            <p className="text-zinc-500 text-sm font-extralight leading-relaxed font-geist">An explainable 0–100 score from verdict, confidence, severity, kill-chain breadth, live threat-intel and case history — built for real triage and prioritization, not just a severity label.</p>
          </div>
          <div className="stagger-item bg-[#18181b] hover:bg-[#1e1e22] transition-colors duration-300 p-10 xl:p-14 group flex flex-col cursor-pointer">
            <div className="flex justify-between items-start mb-14">
              <div className="w-14 h-14 border border-[#27272a] flex items-center justify-center group-hover:border-[#2563eb]/50 transition-colors bg-[#131315]">
                <Icon className="text-2xl text-zinc-500 group-hover:text-[#2563eb] transition-colors" icon="solar:code-square-linear" />
              </div>
              <span className="text-5xl font-extralight text-[#27272a] group-hover:text-zinc-600 transition-colors font-geist tracking-tighter">06</span>
            </div>
            <h3 className="text-xl font-medium tracking-tight text-zinc-100 font-geist mb-4 group-hover:text-[#2563eb] transition-colors">Self-hardening loop</h3>
            <p className="text-zinc-500 text-sm font-extralight leading-relaxed font-geist">After a confirmed true positive, Argus writes a new SPL detection for the attack pattern and installs it as a scheduled Splunk correlation search — so the SOC auto-alerts if it ever recurs.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
