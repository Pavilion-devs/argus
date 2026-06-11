'use client';

import { Icon } from "@iconify/react";
import MaskedText from "./MaskedText";

export default function CTASection() {
  return (
    <section className="z-20 xl:px-20 flex flex-col pb-20 relative backdrop-blur-sm">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[1px] bg-[#27272a] border border-[#27272a] w-full overflow-hidden">
        <div className="lg:col-span-2 bg-[#18181b] p-12 md:p-20 xl:p-24 flex flex-col justify-center relative">
          <div className="reveal-element w-16 h-16 border border-[#27272a] bg-[#131315] mb-12 flex items-center justify-center shadow-inner">
            <Icon className="text-3xl text-zinc-300" icon="solar:rocket-linear" />
          </div>
          <h2 className="flex flex-wrap gap-x-[0.25em] gap-y-[0.1em] text-4xl md:text-5xl lg:text-6xl font-light tracking-tighter text-white font-geist mb-8 leading-[1.1]">
            <MaskedText text="Ready to scale your intelligence?" />
          </h2>
          <p className="reveal-element text-lg font-extralight text-zinc-400 max-w-xl leading-relaxed mb-14 font-geist">Join forward-thinking enterprises building the next generation of automated, cognitive workflows. Deploy your first model in minutes.</p>
          <div className="stagger-container flex flex-col sm:flex-row items-center gap-5 w-full sm:w-auto">
            <button className="stagger-item w-full sm:w-auto px-10 py-4 bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-all duration-300 font-geist active:scale-95">Start Free Trial</button>
            <button className="stagger-item w-full sm:w-auto px-10 py-4 bg-[#131315] border border-[#27272a] text-zinc-300 text-sm font-medium hover:text-white hover:border-zinc-500 transition-all duration-300 font-geist active:scale-95">Talk to Sales</button>
          </div>
        </div>
        <div className="reveal-element bg-[#2563eb] p-12 md:p-20 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute inset-0 bg-blue-900/20 mix-blend-overlay pointer-events-none transition-opacity duration-700"></div>
          <Icon className="text-6xl text-white/90 mb-12 relative z-10" icon="solar:shield-check-linear" />
          <div className="relative z-10 mt-auto">
            <h3 className="text-2xl lg:text-3xl font-light text-white tracking-tight font-geist mb-4">Enterprise Grade</h3>
            <p className="text-white/80 font-extralight text-sm leading-relaxed font-geist">Secure by design. SOC2 Type II certified infrastructure with end-to-end encryption and custom VPC deployments available on day one.</p>
          </div>
          <div className="absolute -bottom-24 -right-24 w-72 h-72 border border-white/20 rounded-full group-hover:scale-110 transition-transform duration-1000 ease-out"></div>
          <div className="absolute -bottom-10 -right-10 w-48 h-48 border border-white/20 rounded-full group-hover:scale-110 transition-transform duration-700 ease-out"></div>
        </div>
      </div>
    </section>
  );
}
