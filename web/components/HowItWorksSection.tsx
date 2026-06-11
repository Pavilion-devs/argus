'use client';

import { Icon } from "@iconify/react";
import MaskedText from "./MaskedText";
import ParticleCanvas from "./ParticleCanvas";

export default function HowItWorksSection() {
  return (
    <section className="bg-[#131315]/80 text-white flex flex-col relative z-20 backdrop-blur-sm" id="capabilities">
      <div className="flex flex-col text-center bg-[#000000] w-full border-[#27272a]/40 border-b pt-28 pr-6 pb-20 pl-6 items-center">
        <h2 className="flex flex-wrap gap-x-[0.25em] gap-y-[0.1em] text-4xl md:text-5xl lg:text-6xl font-light tracking-tighter text-white font-geist mb-6 justify-center">
          <MaskedText text="How it works" />
        </h2>
        <p className="reveal-element text-zinc-400 text-lg md:text-xl font-extralight max-w-2xl font-geist mb-10 leading-relaxed">Discover the intelligent architecture that observes, learns, and autonomously optimizes your operational workflows in real-time.</p>
        <button className="reveal-element px-8 py-3.5 bg-zinc-100 text-black text-sm font-medium rounded-full shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:bg-white hover:scale-[1.03] transition-all duration-300 font-geist">Start building</button>
      </div>
      <div className="flex flex-col min-h-[55vh] overflow-x-hidden xl:flex-row xl:overflow-hidden xl:px-20 bg-[#000000] w-full pt-0 pb-20 relative">
        <div className="reveal-element xl:w-[28%] flex-shrink-0 flex flex-col xl:p-10 transition-all duration-500 z-10 xl:shadow-[10px_0_30px_rgba(0,0,0,0.5)] overflow-hidden bg-[#2563eb] w-full pt-8 pr-8 pb-8 pl-8 relative shadow-2xl border border-[#27272a]">
          <div className="flex items-start gap-3 text-white/90">
            <Icon className="text-3xl mt-3" icon="solar:arrow-right-up-linear" strokeWidth="1.5" />
            <span className="text-7xl font-extralight tracking-tighter font-geist">01</span>
          </div>
          <div className="mt-12 xl:mt-16 space-y-4 relative z-10">
            <h2 className="text-2xl tracking-tight text-white font-medium font-geist">Neural Core</h2>
            <p className="text-white/85 text-sm leading-relaxed pr-4 font-extralight font-geist">A self-learning intelligence foundation that observes, learns, and executes smart decisions in milliseconds to autonomously optimize your operational workflows.</p>
          </div>
          <div className="mt-10 xl:mt-12 rounded-xl overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.3)] group relative">
            <div className="absolute inset-0 z-10 bg-blue-900/40 mix-blend-overlay pointer-events-none transition-opacity duration-700 group-hover:opacity-0"></div>
            <ParticleCanvas />
            <img alt="Neural Network Hardware" className="w-full h-56 xl:h-64 object-cover object-center grayscale opacity-80 transition-all duration-1000 ease-out group-hover:scale-105 group-hover:grayscale-0 group-hover:opacity-100" src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=1200&auto=format&fit=crop" />
          </div>
          <div className="mt-12 xl:mt-auto pt-8 flex flex-col gap-2 relative z-10">
            <Icon className="text-3xl text-white/90" icon="solar:waterdrops-linear" strokeWidth="1.5" />
            <span className="text-lg font-medium tracking-wide font-geist">learning</span>
          </div>
        </div>
        <div className="stagger-container flex flex-row xl:flex-row w-full xl:w-auto divide-x divide-[#27272a] border-y xl:border-y-0 xl:border-y border-y-[#27272a] xl:border-r border-[#27272a]">
          <div className="stagger-item bg-[#18181b] flex-1 flex-shrink-0 flex flex-col justify-between p-6 xl:p-8 hover:bg-[#1e1e22] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] cursor-pointer group xl:w-[140px] xl:flex-none">
            <div>
              <div className="border-b border-[#27272a] pb-4 inline-flex items-center gap-2 text-zinc-400 group-hover:text-zinc-200 transition-colors">
                <Icon className="text-xl transition-transform duration-500 group-hover:translate-y-1" icon="solar:arrow-down-linear" strokeWidth="1.5" />
                <span className="text-3xl font-extralight tracking-tighter font-geist transition-colors duration-300">02</span>
              </div>
              <div className="mt-6 overflow-hidden transition-all duration-500 max-h-0 opacity-0">
                <p className="text-zinc-400 text-sm font-extralight leading-relaxed font-geist whitespace-normal">Instantly vectorize and index structured and unstructured data streams for semantic retrieval.</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-12 xl:mt-auto pt-8">
              <span className="text-sm tracking-wide transition-colors duration-300 font-extralight font-geist text-zinc-500 group-hover:text-zinc-300">assimilation</span>
              <Icon className="text-xl text-zinc-500 transition-all duration-500 opacity-100 group-hover:text-zinc-300" icon="solar:add-circle-linear" />
            </div>
          </div>
          <div className="stagger-item bg-[#18181b] flex-1 flex-shrink-0 flex flex-col justify-between p-6 xl:p-8 hover:bg-[#1e1e22] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] cursor-pointer group xl:w-[140px] xl:flex-none">
            <div>
              <div className="border-b border-[#27272a] pb-4 inline-flex items-center gap-2 text-zinc-400 group-hover:text-zinc-200 transition-colors">
                <Icon className="text-xl transition-transform duration-500 group-hover:translate-y-1" icon="solar:arrow-down-linear" strokeWidth="1.5" />
                <span className="text-3xl font-extralight tracking-tighter font-geist transition-colors duration-300">03</span>
              </div>
              <div className="mt-6 overflow-hidden transition-all duration-500 max-h-0 opacity-0">
                <p className="text-zinc-400 text-sm font-extralight leading-relaxed font-geist whitespace-normal">Route tasks across distributed nodes with sub-millisecond latency and dynamic load balancing.</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-12 xl:mt-auto pt-8">
              <span className="text-sm tracking-wide transition-colors duration-300 font-extralight font-geist text-zinc-500 group-hover:text-zinc-300">processing</span>
              <Icon className="text-xl text-zinc-500 transition-all duration-500 opacity-100 group-hover:text-zinc-300" icon="solar:add-circle-linear" />
            </div>
          </div>
          <div className="stagger-item bg-[#18181b] flex-1 flex-shrink-0 flex flex-col justify-between p-6 xl:p-8 hover:bg-[#1e1e22] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] cursor-pointer group xl:w-[140px] xl:flex-none">
            <div>
              <div className="border-b border-[#27272a] pb-4 inline-flex items-center gap-2 text-zinc-400 group-hover:text-zinc-200 transition-colors">
                <Icon className="text-xl transition-transform duration-500 group-hover:translate-y-1" icon="solar:arrow-down-linear" strokeWidth="1.5" />
                <span className="text-3xl font-extralight tracking-tighter font-geist transition-colors duration-300">04</span>
              </div>
              <div className="mt-6 overflow-hidden transition-all duration-500 max-h-0 opacity-0">
                <p className="text-zinc-400 text-sm font-extralight leading-relaxed font-geist whitespace-normal">Continuously refine neural weights based on real-world outcomes and edge-case evaluations.</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-12 xl:mt-auto pt-8">
              <span className="text-sm tracking-wide transition-colors duration-300 font-extralight font-geist text-zinc-500 group-hover:text-zinc-300">evolution</span>
              <Icon className="text-xl text-zinc-500 transition-all duration-500 opacity-100 group-hover:text-zinc-300" icon="solar:add-circle-linear" />
            </div>
          </div>
        </div>
        <div className="bg-[#18181b] border-y border-r border-[#27272a] flex-1 flex flex-col p-8 xl:p-14 2xl:p-20 relative overflow-hidden transition-all duration-500">
          <div className="reveal-element flex items-center gap-4 text-xs font-normal text-zinc-400 w-full max-w-4xl font-geist">
            <span className="whitespace-nowrap">Intelligence Core</span>
            <div className="flex-1 h-px bg-[#27272a]"></div>
            <span className="whitespace-nowrap">Scale Model</span>
          </div>
          <div className="mt-16 xl:mt-24 max-w-3xl">
            <h1 className="flex flex-wrap gap-x-[0.25em] gap-y-[0.1em] text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight text-zinc-100 leading-[1.1] font-geist">
              <MaskedText text="Scalable intelligence architecture for modern enterprises" />
            </h1>
            <p className="reveal-element mt-8 text-zinc-400 text-base md:text-lg leading-relaxed max-w-2xl font-extralight font-geist">We architect future-proof cognitive systems that process vast datasets securely, scaling seamlessly as your organizational complexity grows.</p>
          </div>
          <div className="stagger-container mt-16 xl:mt-24 ml-2 grid grid-cols-6 gap-x-12 gap-y-10 w-max" data-stagger="0.02">
            <div className="stagger-item w-1.5 h-1.5 rounded-full bg-[#27272a]" style={{ animationDelay: '0s' }}></div>
            <div className="stagger-item w-1.5 h-1.5 rounded-full bg-[#27272a]" style={{ animationDelay: '0s' }}></div>
            <div className="stagger-item w-1.5 h-1.5 rounded-full bg-[#27272a]" style={{ animationDelay: '0s' }}></div>
            <div className="stagger-item w-1.5 h-1.5 rounded-full bg-[#27272a]" style={{ animationDelay: '0s' }}></div>
            <div className="stagger-item w-1.5 h-1.5 rounded-full bg-[#27272a]" style={{ animationDelay: '0s' }}></div>
            <div className="stagger-item w-1.5 h-1.5 rounded-full bg-[#27272a]" style={{ animationDelay: '0s' }}></div>
            <div className="stagger-item w-1.5 h-1.5 rounded-full bg-[#27272a]" style={{ animationDelay: '0s' }}></div>
            <div className="stagger-item w-1.5 h-1.5 rounded-full bg-[#27272a]" style={{ animationDelay: '0s' }}></div>
            <div className="stagger-item w-1.5 h-1.5 rounded-full bg-[#27272a]" style={{ animationDelay: '0s' }}></div>
            <div className="stagger-item w-1.5 h-1.5 rounded-full bg-[#27272a]" style={{ animationDelay: '0s' }}></div>
            <div className="stagger-item w-1.5 h-1.5 rounded-full bg-[#27272a]" style={{ animationDelay: '0s' }}></div>
            <div className="stagger-item w-1.5 h-1.5 rounded-full bg-[#27272a]" style={{ animationDelay: '0s' }}></div>
            <div className="stagger-item w-1.5 h-1.5 rounded-full bg-[#27272a]" style={{ animationDelay: '0s' }}></div>
            <div className="stagger-item w-1.5 h-1.5 rounded-full bg-[#27272a]" style={{ animationDelay: '0s' }}></div>
            <div className="stagger-item w-1.5 h-1.5 rounded-full bg-[#2563eb] shadow-[0_0_12px_rgba(37,99,235,0.8)] animate-slow-pulse" style={{ animationDelay: '2s' }}></div>
            <div className="stagger-item w-1.5 h-1.5 rounded-full bg-[#27272a]" style={{ animationDelay: '0s' }}></div>
            <div className="stagger-item w-1.5 h-1.5 rounded-full bg-[#27272a]" style={{ animationDelay: '0s' }}></div>
            <div className="stagger-item w-1.5 h-1.5 rounded-full bg-[#27272a]" style={{ animationDelay: '0s' }}></div>
            <div className="stagger-item w-1.5 h-1.5 rounded-full bg-[#2563eb] shadow-[0_0_12px_rgba(37,99,235,0.8)] animate-slow-pulse" style={{ animationDelay: '1.5s' }}></div>
            <div className="stagger-item w-1.5 h-1.5 rounded-full bg-[#27272a]" style={{ animationDelay: '0s' }}></div>
            <div className="stagger-item w-1.5 h-1.5 rounded-full bg-[#27272a]" style={{ animationDelay: '0s' }}></div>
            <div className="stagger-item w-1.5 h-1.5 rounded-full bg-[#2563eb] shadow-[0_0_12px_rgba(37,99,235,0.8)] animate-slow-pulse" style={{ animationDelay: '0.5s' }}></div>
            <div className="stagger-item w-1.5 h-1.5 rounded-full bg-[#27272a]" style={{ animationDelay: '0s' }}></div>
            <div className="stagger-item w-1.5 h-1.5 rounded-full bg-[#2563eb] shadow-[0_0_12px_rgba(37,99,235,0.8)] animate-slow-pulse" style={{ animationDelay: '1.5s' }}></div>
            <div className="stagger-item w-1.5 h-1.5 rounded-full bg-[#27272a]" style={{ animationDelay: '0s' }}></div>
            <div className="stagger-item w-1.5 h-1.5 rounded-full bg-[#2563eb] shadow-[0_0_12px_rgba(37,99,235,0.8)] animate-slow-pulse" style={{ animationDelay: '0s' }}></div>
            <div className="stagger-item w-1.5 h-1.5 rounded-full bg-[#27272a]" style={{ animationDelay: '0s' }}></div>
            <div className="stagger-item w-1.5 h-1.5 rounded-full bg-[#27272a]" style={{ animationDelay: '0s' }}></div>
            <div className="stagger-item w-1.5 h-1.5 rounded-full bg-[#27272a]" style={{ animationDelay: '0s' }}></div>
            <div className="stagger-item w-1.5 h-1.5 rounded-full bg-[#27272a]" style={{ animationDelay: '0s' }}></div>
          </div>
          <div className="reveal-element mt-16 xl:mt-auto pt-8 flex items-center gap-4 text-zinc-400 text-sm">
            <Icon className="text-[#2563eb] text-2xl" icon="solar:widget-5-linear" strokeWidth="1.5" />
            <span className="font-extralight tracking-wide font-geist">Architect, automate, scale, and secure.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
