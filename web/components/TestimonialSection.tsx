'use client';

import { Icon } from "@iconify/react";
import MaskedText from "./MaskedText";

export default function TestimonialSection() {
  return (
    <section className="bg-[#131315]/80 flex flex-col relative z-20 backdrop-blur-sm">
      <div className="flex flex-col border-y text-center bg-[#000000] w-full border-[#27272a] mt-[-1px] pt-28 pb-20 items-center">
        <h2 className="flex flex-wrap gap-x-[0.25em] gap-y-[0.1em] text-3xl md:text-5xl font-light tracking-tighter text-white font-geist max-w-2xl mb-6 justify-center">
          <MaskedText text="Triage shouldn't take an hour" />
        </h2>
        <p className="reveal-element text-zinc-400 text-lg font-extralight max-w-xl font-geist leading-relaxed">The bottleneck in the SOC isn't detection — it's the slow, manual, unprovable investigation that comes after the alert fires.</p>
      </div>
      <div className="flex flex-col xl:px-20 bg-[#000000] w-full mt-[-1px] pb-20">
        <div className="stagger-container grid grid-cols-1 md:grid-cols-3 gap-[1px] bg-[#27272a] border border-[#27272a] w-full">
          <div className="stagger-item bg-[#18181b] hover:bg-[#1e1e22] transition-colors duration-300 p-10 xl:p-14 group flex flex-col">
            <Icon className="text-3xl text-[#2563eb]/40 mb-8" icon="solar:clock-circle-linear" />
            <p className="text-zinc-300 text-lg font-extralight leading-relaxed font-geist mb-10 flex-grow">A Tier-1 analyst spends 30–60 minutes manually pivoting across Splunk to triage a single notable — and still has to write up why it's a threat.</p>
            <div className="flex items-center gap-4 mt-auto">
              <div className="w-12 h-12 rounded-full bg-[#131315] border border-[#27272a] grid place-items-center text-[#2563eb] shadow-lg">
                <Icon className="text-xl" icon="solar:hourglass-line-linear" />
              </div>
              <div className="flex flex-col">
                <span className="text-zinc-100 font-medium text-sm font-geist tracking-tight">Manual triage</span>
                <span className="text-zinc-500 text-xs font-extralight font-geist">30–60 min per notable</span>
              </div>
            </div>
          </div>
          <div className="stagger-item bg-[#18181b] hover:bg-[#1e1e22] transition-colors duration-300 p-10 xl:p-14 group flex flex-col">
            <Icon className="text-3xl text-[#2563eb]/40 mb-8" icon="solar:bell-off-linear" />
            <p className="text-zinc-300 text-lg font-extralight leading-relaxed font-geist mb-10 flex-grow">Alert queues grow faster than analysts can work them, so real attacks sit in the backlog right next to the false alarms nobody had time to clear.</p>
            <div className="flex items-center gap-4 mt-auto">
              <div className="w-12 h-12 rounded-full bg-[#131315] border border-[#27272a] grid place-items-center text-[#2563eb] shadow-lg">
                <Icon className="text-xl" icon="solar:inbox-archive-linear" />
              </div>
              <div className="flex flex-col">
                <span className="text-zinc-100 font-medium text-sm font-geist tracking-tight">Alert fatigue</span>
                <span className="text-zinc-500 text-xs font-extralight font-geist">The backlog problem</span>
              </div>
            </div>
          </div>
          <div className="stagger-item bg-[#18181b] hover:bg-[#1e1e22] transition-colors duration-300 p-10 xl:p-14 group flex flex-col">
            <Icon className="text-3xl text-[#2563eb]/40 mb-8" icon="solar:shield-check-linear" />
            <p className="text-zinc-300 text-lg font-extralight leading-relaxed font-geist mb-10 flex-grow">When an AI finally flags something, you can't act on a verdict you can't audit — every conclusion needs the exact query and the exact events behind it.</p>
            <div className="flex items-center gap-4 mt-auto">
              <div className="w-12 h-12 rounded-full bg-[#131315] border border-[#27272a] grid place-items-center text-[#2563eb] shadow-lg">
                <Icon className="text-xl" icon="solar:verified-check-linear" />
              </div>
              <div className="flex flex-col">
                <span className="text-zinc-100 font-medium text-sm font-geist tracking-tight">Trust &amp; audit</span>
                <span className="text-zinc-500 text-xs font-extralight font-geist">Provable, or it doesn't ship</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
