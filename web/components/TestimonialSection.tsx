'use client';

import { Icon } from "@iconify/react";
import MaskedText from "./MaskedText";

export default function TestimonialSection() {
  return (
    <section className="bg-[#131315]/80 flex flex-col relative z-20 backdrop-blur-sm">
      <div className="flex flex-col border-y text-center bg-[#000000] w-full border-[#27272a] mt-[-1px] pt-28 pb-20 items-center">
        <h2 className="flex flex-wrap gap-x-[0.25em] gap-y-[0.1em] text-3xl md:text-5xl font-light tracking-tighter text-white font-geist max-w-2xl mb-6 justify-center">
          <MaskedText text="Trusted by industry leaders" />
        </h2>
        <p className="reveal-element text-zinc-400 text-lg font-extralight max-w-xl font-geist leading-relaxed">See how modern engineering teams are using our cognitive architecture to scale their operations securely.</p>
      </div>
      <div className="flex flex-col xl:px-20 bg-[#000000] w-full mt-[-1px] pb-20">
        <div className="stagger-container grid grid-cols-1 md:grid-cols-3 gap-[1px] bg-[#27272a] border border-[#27272a] w-full">
          <div className="stagger-item bg-[#18181b] hover:bg-[#1e1e22] transition-colors duration-300 p-10 xl:p-14 group flex flex-col">
            <Icon className="text-3xl text-[#2563eb]/40 mb-8" icon="solar:chat-round-line-linear" />
            <p className="text-zinc-300 text-lg font-extralight leading-relaxed font-geist mb-10 flex-grow">"CogniCore's neural engine reduced our data processing latency by 80%. The dynamic routing alone paid for itself in the first week."</p>
            <div className="flex items-center gap-4 mt-auto">
              <img alt="Sarah Jenkins" className="w-12 h-12 rounded-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500 shadow-lg" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80" />
              <div className="flex flex-col">
                <span className="text-zinc-100 font-medium text-sm font-geist tracking-tight">Sarah Jenkins</span>
                <span className="text-zinc-500 text-xs font-extralight font-geist">CTO, DataFlow Enterprise</span>
              </div>
            </div>
          </div>
          <div className="stagger-item bg-[#18181b] hover:bg-[#1e1e22] transition-colors duration-300 p-10 xl:p-14 group flex flex-col">
            <Icon className="text-3xl text-[#2563eb]/40 mb-8" icon="solar:chat-round-line-linear" />
            <p className="text-zinc-300 text-lg font-extralight leading-relaxed font-geist mb-10 flex-grow">"The vector assimilation capability transformed how we handle unstructured data. We deployed our first production model in under an hour."</p>
            <div className="flex items-center gap-4 mt-auto">
              <img alt="Michael Chen" className="w-12 h-12 rounded-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500 shadow-lg" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80" />
              <div className="flex flex-col">
                <span className="text-zinc-100 font-medium text-sm font-geist tracking-tight">Michael Chen</span>
                <span className="text-zinc-500 text-xs font-extralight font-geist">Lead Architect, Nexus</span>
              </div>
            </div>
          </div>
          <div className="stagger-item bg-[#18181b] hover:bg-[#1e1e22] transition-colors duration-300 p-10 xl:p-14 group flex flex-col">
            <Icon className="text-3xl text-[#2563eb]/40 mb-8" icon="solar:chat-round-line-linear" />
            <p className="text-zinc-300 text-lg font-extralight leading-relaxed font-geist mb-10 flex-grow">"Finally, an AI infrastructure platform that understands enterprise security. The auto-scaling is seamless and the SOC2 compliance was critical for us."</p>
            <div className="flex items-center gap-4 mt-auto">
              <img alt="Elena Rodriguez" className="w-12 h-12 rounded-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500 shadow-lg" src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&q=80" />
              <div className="flex flex-col">
                <span className="text-zinc-100 font-medium text-sm font-geist tracking-tight">Elena Rodriguez</span>
                <span className="text-zinc-500 text-xs font-extralight font-geist">VP Engineering, SecureTech</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
