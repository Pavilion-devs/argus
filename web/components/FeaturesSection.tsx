'use client';

import { Icon } from "@iconify/react";
import MaskedText from "./MaskedText";

export default function FeaturesSection() {
  return (
    <section className="bg-[#131315]/80 flex flex-col relative z-20 backdrop-blur-sm">
      <div className="flex flex-col border-y text-center bg-[#000000] w-full border-[#27272a] pt-28 pb-20 items-center">
        <div className="reveal-element inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2563eb]/10 border border-[#2563eb]/20 text-[#2563eb] text-xs font-medium tracking-wide font-geist mb-6">
          <Icon icon="solar:stars-linear" />
          Platform Capabilities
        </div>
        <h2 className="flex flex-wrap gap-x-[0.25em] gap-y-[0.1em] text-3xl md:text-5xl font-light tracking-tighter text-white font-geist max-w-2xl mb-6 justify-center">
          <MaskedText text="Intelligence at every layer" />
        </h2>
        <p className="reveal-element text-zinc-400 text-lg font-extralight max-w-xl font-geist leading-relaxed">Everything you need to build, deploy, and scale cognitive workflows without worrying about underlying infrastructure.</p>
      </div>
      <div className="flex flex-col xl:px-20 bg-[#000000] w-full mt-[-1px] pb-20">
        <div className="stagger-container grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[1px] bg-[#27272a] border border-[#27272a] w-full">
          <div className="stagger-item bg-[#18181b] hover:bg-[#1e1e22] transition-colors duration-300 p-10 xl:p-14 group flex flex-col cursor-pointer">
            <div className="flex justify-between items-start mb-14">
              <div className="w-14 h-14 border border-[#27272a] flex items-center justify-center group-hover:border-[#2563eb]/50 transition-colors bg-[#131315]">
                <Icon className="text-2xl text-zinc-500 group-hover:text-[#2563eb] transition-colors" icon="solar:cpu-bolt-linear" />
              </div>
              <span className="text-5xl font-extralight text-[#27272a] group-hover:text-zinc-600 transition-colors font-geist tracking-tighter">01</span>
            </div>
            <h3 className="text-xl font-medium tracking-tight text-zinc-100 font-geist mb-4 group-hover:text-[#2563eb] transition-colors">Real-time Processing</h3>
            <p className="text-zinc-500 text-sm font-extralight leading-relaxed font-geist">Analyze thousands of data streams concurrently with millisecond latency, powered by our distributed neural engine.</p>
          </div>
          <div className="stagger-item bg-[#18181b] hover:bg-[#1e1e22] transition-colors duration-300 p-10 xl:p-14 group flex flex-col cursor-pointer">
            <div className="flex justify-between items-start mb-14">
              <div className="w-14 h-14 border border-[#27272a] flex items-center justify-center group-hover:border-[#2563eb]/50 transition-colors bg-[#131315]">
                <Icon className="text-2xl text-zinc-500 group-hover:text-[#2563eb] transition-colors" icon="solar:shield-network-linear" />
              </div>
              <span className="text-5xl font-extralight text-[#27272a] group-hover:text-zinc-600 transition-colors font-geist tracking-tighter">02</span>
            </div>
            <h3 className="text-xl font-medium tracking-tight text-zinc-100 font-geist mb-4 group-hover:text-[#2563eb] transition-colors">Enterprise Security</h3>
            <p className="text-zinc-500 text-sm font-extralight leading-relaxed font-geist">Bank-grade encryption, role-based access control, and continuous threat monitoring built into the core architecture.</p>
          </div>
          <div className="stagger-item bg-[#18181b] hover:bg-[#1e1e22] transition-colors duration-300 p-10 xl:p-14 group flex flex-col cursor-pointer">
            <div className="flex justify-between items-start mb-14">
              <div className="w-14 h-14 border border-[#27272a] flex items-center justify-center group-hover:border-[#2563eb]/50 transition-colors bg-[#131315]">
                <Icon className="text-2xl text-zinc-500 group-hover:text-[#2563eb] transition-colors" icon="solar:branching-paths-up-linear" />
              </div>
              <span className="text-5xl font-extralight text-[#27272a] group-hover:text-zinc-600 transition-colors font-geist tracking-tighter">03</span>
            </div>
            <h3 className="text-xl font-medium tracking-tight text-zinc-100 font-geist mb-4 group-hover:text-[#2563eb] transition-colors">Dynamic Routing</h3>
            <p className="text-zinc-500 text-sm font-extralight leading-relaxed font-geist">Automatically route complex tasks to the most efficient cognitive models, minimizing costs while maximizing throughput.</p>
          </div>
          <div className="stagger-item bg-[#18181b] hover:bg-[#1e1e22] transition-colors duration-300 p-10 xl:p-14 group flex flex-col cursor-pointer">
            <div className="flex justify-between items-start mb-14">
              <div className="w-14 h-14 border border-[#27272a] flex items-center justify-center group-hover:border-[#2563eb]/50 transition-colors bg-[#131315]">
                <Icon className="text-2xl text-zinc-500 group-hover:text-[#2563eb] transition-colors" icon="solar:database-linear" />
              </div>
              <span className="text-5xl font-extralight text-[#27272a] group-hover:text-zinc-600 transition-colors font-geist tracking-tighter">04</span>
            </div>
            <h3 className="text-xl font-medium tracking-tight text-zinc-100 font-geist mb-4 group-hover:text-[#2563eb] transition-colors">Vector Assimilation</h3>
            <p className="text-zinc-500 text-sm font-extralight leading-relaxed font-geist">Instantly convert unstructured enterprise data into searchable, semantic vector spaces for instant retrieval.</p>
          </div>
          <div className="stagger-item bg-[#18181b] hover:bg-[#1e1e22] transition-colors duration-300 p-10 xl:p-14 group flex flex-col cursor-pointer">
            <div className="flex justify-between items-start mb-14">
              <div className="w-14 h-14 border border-[#27272a] flex items-center justify-center group-hover:border-[#2563eb]/50 transition-colors bg-[#131315]">
                <Icon className="text-2xl text-zinc-500 group-hover:text-[#2563eb] transition-colors" icon="solar:code-square-linear" />
              </div>
              <span className="text-5xl font-extralight text-[#27272a] group-hover:text-zinc-600 transition-colors font-geist tracking-tighter">05</span>
            </div>
            <h3 className="text-xl font-medium tracking-tight text-zinc-100 font-geist mb-4 group-hover:text-[#2563eb] transition-colors">API-First Design</h3>
            <p className="text-zinc-500 text-sm font-extralight leading-relaxed font-geist">Integrate seamlessly with your existing stack using our comprehensive REST and GraphQL endpoints.</p>
          </div>
          <div className="stagger-item bg-[#18181b] hover:bg-[#1e1e22] transition-colors duration-300 p-10 xl:p-14 group flex flex-col cursor-pointer">
            <div className="flex justify-between items-start mb-14">
              <div className="w-14 h-14 border border-[#27272a] flex items-center justify-center group-hover:border-[#2563eb]/50 transition-colors bg-[#131315]">
                <Icon className="text-2xl text-zinc-500 group-hover:text-[#2563eb] transition-colors" icon="solar:chart-square-linear" />
              </div>
              <span className="text-5xl font-extralight text-[#27272a] group-hover:text-zinc-600 transition-colors font-geist tracking-tighter">06</span>
            </div>
            <h3 className="text-xl font-medium tracking-tight text-zinc-100 font-geist mb-4 group-hover:text-[#2563eb] transition-colors">Predictive Scaling</h3>
            <p className="text-zinc-500 text-sm font-extralight leading-relaxed font-geist">Our infrastructure anticipates load spikes and auto-scales compute resources before bottlenecks occur.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
