'use client';

import { Icon } from "@iconify/react";
import MaskedText from "./MaskedText";

export default function CTASection() {
  return (
    <section className="z-20 xl:px-20 flex flex-col pb-20 relative backdrop-blur-sm">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[1px] bg-[#27272a] border border-[#27272a] w-full overflow-hidden">
        <div className="lg:col-span-2 bg-[#18181b] p-12 md:p-20 xl:p-24 flex flex-col justify-center relative">
          <div className="reveal-element w-16 h-16 border border-[#27272a] bg-[#131315] mb-12 flex items-center justify-center shadow-inner">
            <Icon className="text-3xl text-zinc-300" icon="solar:play-circle-linear" />
          </div>
          <h2 className="flex flex-wrap gap-x-[0.25em] gap-y-[0.1em] text-4xl md:text-5xl lg:text-6xl font-light tracking-tighter text-white font-geist mb-8 leading-[1.1]">
            <MaskedText text="Watch Argus investigate live" />
          </h2>
          <p className="reveal-element text-lg font-extralight text-zinc-400 max-w-xl leading-relaxed mb-14 font-geist">Submit an alert and watch the agent plan, run its SPL, mark its hypotheses, and reach a grounded verdict in real time — then drill into any claim to see the exact query and events behind it.</p>
          <div className="stagger-container flex flex-col sm:flex-row items-center gap-5 w-full sm:w-auto">
            <a href="/dashboard" className="stagger-item w-full sm:w-auto px-10 py-4 bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-all duration-300 font-geist active:scale-95 text-center">Launch the dashboard</a>
            <a href="#evaluation" className="stagger-item w-full sm:w-auto px-10 py-4 bg-[#131315] border border-[#27272a] text-zinc-300 text-sm font-medium hover:text-white hover:border-zinc-500 transition-all duration-300 font-geist active:scale-95 text-center">Read the evaluation</a>
          </div>
        </div>
        <div className="reveal-element bg-[#2563eb] p-12 md:p-20 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute inset-0 bg-blue-900/20 mix-blend-overlay pointer-events-none transition-opacity duration-700"></div>
          <Icon className="text-6xl text-white/90 mb-12 relative z-10" icon="solar:eye-scan-linear" />
          <div className="relative z-10 mt-auto">
            <h3 className="text-2xl lg:text-3xl font-light text-white tracking-tight font-geist mb-4">MCP-native by design</h3>
            <p className="text-white/80 font-extralight text-sm leading-relaxed font-geist">Argus only ever reads Splunk through the Splunk MCP Server — every query is auditable, and every conclusion links straight back to the events it saw. Nothing is asserted that the data can't prove.</p>
          </div>
          <div className="absolute -bottom-24 -right-24 w-72 h-72 border border-white/20 rounded-full group-hover:scale-110 transition-transform duration-1000 ease-out"></div>
          <div className="absolute -bottom-10 -right-10 w-48 h-48 border border-white/20 rounded-full group-hover:scale-110 transition-transform duration-700 ease-out"></div>
        </div>
      </div>
    </section>
  );
}
