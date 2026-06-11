'use client';

import { Icon } from "@iconify/react";
import MaskedText from "./MaskedText";

export default function PricingSection() {
  return (
    <section className="bg-[#131315]/80 flex flex-col relative z-20 backdrop-blur-sm" id="pricing">
      <div className="flex flex-col border-y text-center bg-[#000000]/80 w-full border-[#27272a] mt-[-1px] pt-28 pb-20 items-center">
        <h2 className="flex flex-wrap gap-x-[0.25em] gap-y-[0.1em] text-3xl md:text-5xl font-light tracking-tighter text-white font-geist max-w-2xl mb-6 justify-center">
          <MaskedText text="Run it the way the incident needs" />
        </h2>
        <p className="reveal-element text-zinc-400 text-lg font-extralight max-w-xl font-geist leading-relaxed">One agent or a coordinated team, investigate-only or all the way to containment. Same engine, same grounded report — runs on the Anthropic API or AWS Bedrock.</p>
      </div>
      <div className="flex flex-col xl:px-20 bg-[#000000] w-full mt-[-1px] pb-20">
        <div className="stagger-container grid grid-cols-1 md:grid-cols-3 gap-[1px] bg-[#27272a] border border-[#27272a] w-full relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#2563eb]/10 blur-[120px] rounded-full pointer-events-none z-0"></div>
          <div className="stagger-item bg-[#18181b] hover:bg-[#1c1c1f] transition-colors duration-300 p-10 xl:p-14 flex flex-col relative z-10">
            <h3 className="text-xl font-medium tracking-tight text-zinc-100 font-geist mb-3">Single-agent</h3>
            <p className="text-zinc-500 text-sm font-extralight leading-relaxed font-geist mb-8 h-10">One autonomous analyst that plans, queries, and proves — the core Argus loop.</p>
            <div className="mb-10 flex items-baseline gap-1">
              <span className="text-5xl lg:text-6xl font-light tracking-tighter text-white font-geist">Investigate</span>
            </div>
            <ul className="flex flex-col gap-5 mb-14 flex-grow">
              <li className="flex items-start gap-3 text-sm text-zinc-300 font-extralight font-geist">
                <Icon className="text-[#2563eb] text-lg mt-0.5 flex-shrink-0" icon="solar:check-circle-linear" />
                Plan → act → observe loop
              </li>
              <li className="flex items-start gap-3 text-sm text-zinc-300 font-extralight font-geist">
                <Icon className="text-[#2563eb] text-lg mt-0.5 flex-shrink-0" icon="solar:check-circle-linear" />
                Grounded incident report
              </li>
              <li className="flex items-start gap-3 text-sm text-zinc-300 font-extralight font-geist">
                <Icon className="text-[#2563eb] text-lg mt-0.5 flex-shrink-0" icon="solar:check-circle-linear" />
                Validated MITRE + kill-chain
              </li>
              <li className="flex items-start gap-3 text-sm text-zinc-300 font-extralight font-geist">
                <Icon className="text-[#2563eb] text-lg mt-0.5 flex-shrink-0" icon="solar:check-circle-linear" />
                Composite risk score
              </li>
              <li className="flex items-start gap-3 text-sm text-zinc-300 font-extralight font-geist">
                <Icon className="text-[#2563eb] text-lg mt-0.5 flex-shrink-0" icon="solar:check-circle-linear" />
                Live token-by-token streaming
              </li>
            </ul>
            <a href="/dashboard" className="w-full py-4 px-6 rounded-full text-sm font-medium transition-all duration-300 font-geist bg-transparent border border-[#27272a] text-zinc-300 hover:text-white hover:border-zinc-500 active:scale-95 text-center">Open dashboard</a>
          </div>
          <div className="stagger-item bg-[#1e1e22] transition-colors duration-300 p-10 xl:p-14 flex flex-col relative z-10">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#172554] via-[#2563eb] to-[#60a5fa]"></div>
            <h3 className="text-xl font-medium tracking-tight text-zinc-100 font-geist mb-3">Multi-agent</h3>
            <p className="text-zinc-500 text-sm font-extralight leading-relaxed font-geist mb-8 h-10">Four specialists — auth, network, endpoint, threat-intel — investigate in parallel.</p>
            <div className="mb-10 flex items-baseline gap-1">
              <span className="text-5xl lg:text-6xl font-light tracking-tighter text-white font-geist">Correlate</span>
            </div>
            <ul className="flex flex-col gap-5 mb-14 flex-grow">
              <li className="flex items-start gap-3 text-sm text-zinc-300 font-extralight font-geist">
                <Icon className="text-[#2563eb] text-lg mt-0.5 flex-shrink-0" icon="solar:check-circle-linear" />
                Everything in single-agent
              </li>
              <li className="flex items-start gap-3 text-sm text-zinc-300 font-extralight font-geist">
                <Icon className="text-[#2563eb] text-lg mt-0.5 flex-shrink-0" icon="solar:check-circle-linear" />
                Four concurrent specialist lanes
              </li>
              <li className="flex items-start gap-3 text-sm text-zinc-300 font-extralight font-geist">
                <Icon className="text-[#2563eb] text-lg mt-0.5 flex-shrink-0" icon="solar:check-circle-linear" />
                Cross-source correlation
              </li>
              <li className="flex items-start gap-3 text-sm text-zinc-300 font-extralight font-geist">
                <Icon className="text-[#2563eb] text-lg mt-0.5 flex-shrink-0" icon="solar:check-circle-linear" />
                One synthesized attack narrative
              </li>
              <li className="flex items-start gap-3 text-sm text-zinc-300 font-extralight font-geist">
                <Icon className="text-[#2563eb] text-lg mt-0.5 flex-shrink-0" icon="solar:check-circle-linear" />
                Faster on complex incidents
              </li>
            </ul>
            <a href="/dashboard" className="w-full py-4 px-6 rounded-full text-sm font-medium transition-all duration-300 font-geist bg-white text-black hover:bg-zinc-200 active:scale-95 shadow-[0_0_24px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] text-center">Launch --multi</a>
          </div>
          <div className="stagger-item bg-[#18181b] hover:bg-[#1c1c1f] transition-colors duration-300 p-10 xl:p-14 flex flex-col relative z-10">
            <h3 className="text-xl font-medium tracking-tight text-zinc-100 font-geist mb-3">Respond &amp; harden</h3>
            <p className="text-zinc-500 text-sm font-extralight leading-relaxed font-geist mb-8 h-10">Close the loop: contain the threat and leave a new detection behind.</p>
            <div className="mb-10 flex items-baseline gap-1">
              <span className="text-5xl lg:text-6xl font-light tracking-tighter text-white font-geist">Contain</span>
            </div>
            <ul className="flex flex-col gap-5 mb-14 flex-grow">
              <li className="flex items-start gap-3 text-sm text-zinc-300 font-extralight font-geist">
                <Icon className="text-[#2563eb] text-lg mt-0.5 flex-shrink-0" icon="solar:check-circle-linear" />
                Blocklist enforced by correlation search
              </li>
              <li className="flex items-start gap-3 text-sm text-zinc-300 font-extralight font-geist">
                <Icon className="text-[#2563eb] text-lg mt-0.5 flex-shrink-0" icon="solar:check-circle-linear" />
                Case recorded to memory
              </li>
              <li className="flex items-start gap-3 text-sm text-zinc-300 font-extralight font-geist">
                <Icon className="text-[#2563eb] text-lg mt-0.5 flex-shrink-0" icon="solar:check-circle-linear" />
                Slack / Jira tickets
              </li>
              <li className="flex items-start gap-3 text-sm text-zinc-300 font-extralight font-geist">
                <Icon className="text-[#2563eb] text-lg mt-0.5 flex-shrink-0" icon="solar:check-circle-linear" />
                Self-hardening detection-as-code
              </li>
              <li className="flex items-start gap-3 text-sm text-zinc-300 font-extralight font-geist">
                <Icon className="text-[#2563eb] text-lg mt-0.5 flex-shrink-0" icon="solar:check-circle-linear" />
                Human-approval gate (or --auto)
              </li>
            </ul>
            <a href="/dashboard" className="w-full py-4 px-6 rounded-full text-sm font-medium transition-all duration-300 font-geist bg-transparent border border-[#27272a] text-zinc-300 hover:text-white hover:border-zinc-500 active:scale-95 text-center">See the response phase</a>
          </div>
        </div>
      </div>
    </section>
  );
}
