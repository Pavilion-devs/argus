'use client';

import { Icon } from "@iconify/react";
import MaskedText from "./MaskedText";

export default function PricingSection() {
  return (
    <section className="bg-[#131315]/80 flex flex-col relative z-20 backdrop-blur-sm" id="pricing">
      <div className="flex flex-col border-y text-center bg-[#000000]/80 w-full border-[#27272a] mt-[-1px] pt-28 pb-20 items-center">
        <h2 className="flex flex-wrap gap-x-[0.25em] gap-y-[0.1em] text-3xl md:text-5xl font-light tracking-tighter text-white font-geist max-w-2xl mb-6 justify-center">
          <MaskedText text="Predictable pricing at scale" />
        </h2>
        <p className="reveal-element text-zinc-400 text-lg font-extralight max-w-xl font-geist leading-relaxed">Start free, then pay for exactly what you use. Our efficient architecture passes the compute cost savings directly to you.</p>
      </div>
      <div className="flex flex-col xl:px-20 bg-[#000000] w-full mt-[-1px] pb-20">
        <div className="stagger-container grid grid-cols-1 md:grid-cols-3 gap-[1px] bg-[#27272a] border border-[#27272a] w-full relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#2563eb]/10 blur-[120px] rounded-full pointer-events-none z-0"></div>
          <div className="stagger-item bg-[#18181b] hover:bg-[#1c1c1f] transition-colors duration-300 p-10 xl:p-14 flex flex-col relative z-10">
            <h3 className="text-xl font-medium tracking-tight text-zinc-100 font-geist mb-3">Developer</h3>
            <p className="text-zinc-500 text-sm font-extralight leading-relaxed font-geist mb-8 h-10">Perfect for prototyping and evaluating the platform's core capabilities.</p>
            <div className="mb-10 flex items-baseline gap-1">
              <span className="text-5xl lg:text-6xl font-light tracking-tighter text-white font-geist">Free</span>
            </div>
            <ul className="flex flex-col gap-5 mb-14 flex-grow">
              <li className="flex items-start gap-3 text-sm text-zinc-300 font-extralight font-geist">
                <Icon className="text-[#2563eb] text-lg mt-0.5 flex-shrink-0" icon="solar:check-circle-linear" />
                Up to 100k operations/month
              </li>
              <li className="flex items-start gap-3 text-sm text-zinc-300 font-extralight font-geist">
                <Icon className="text-[#2563eb] text-lg mt-0.5 flex-shrink-0" icon="solar:check-circle-linear" />
                Shared cognitive engine
              </li>
              <li className="flex items-start gap-3 text-sm text-zinc-300 font-extralight font-geist">
                <Icon className="text-[#2563eb] text-lg mt-0.5 flex-shrink-0" icon="solar:check-circle-linear" />
                Community forum support
              </li>
              <li className="flex items-start gap-3 text-sm text-zinc-300 font-extralight font-geist">
                <Icon className="text-[#2563eb] text-lg mt-0.5 flex-shrink-0" icon="solar:check-circle-linear" />
                Basic vector assimilation
              </li>
              <li className="flex items-start gap-3 text-sm text-zinc-300 font-extralight font-geist">
                <Icon className="text-[#2563eb] text-lg mt-0.5 flex-shrink-0" icon="solar:check-circle-linear" />
                48-hour data retention
              </li>
            </ul>
            <button className="w-full py-4 px-6 rounded-full text-sm font-medium transition-all duration-300 font-geist bg-transparent border border-[#27272a] text-zinc-300 hover:text-white hover:border-zinc-500 active:scale-95">Start Building</button>
          </div>
          <div className="stagger-item bg-[#1e1e22] transition-colors duration-300 p-10 xl:p-14 flex flex-col relative z-10">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#172554] via-[#2563eb] to-[#60a5fa]"></div>
            <h3 className="text-xl font-medium tracking-tight text-zinc-100 font-geist mb-3">Scale</h3>
            <p className="text-zinc-500 text-sm font-extralight leading-relaxed font-geist mb-8 h-10">For production workloads and rapidly growing engineering teams.</p>
            <div className="mb-10 flex items-baseline gap-1">
              <span className="text-5xl lg:text-6xl font-light tracking-tighter text-white font-geist">$499</span>
              <span className="text-zinc-500 font-extralight font-geist tracking-wide">/mo</span>
            </div>
            <ul className="flex flex-col gap-5 mb-14 flex-grow">
              <li className="flex items-start gap-3 text-sm text-zinc-300 font-extralight font-geist">
                <Icon className="text-[#2563eb] text-lg mt-0.5 flex-shrink-0" icon="solar:check-circle-linear" />
                Up to 10M operations/month
              </li>
              <li className="flex items-start gap-3 text-sm text-zinc-300 font-extralight font-geist">
                <Icon className="text-[#2563eb] text-lg mt-0.5 flex-shrink-0" icon="solar:check-circle-linear" />
                Dedicated neural nodes
              </li>
              <li className="flex items-start gap-3 text-sm text-zinc-300 font-extralight font-geist">
                <Icon className="text-[#2563eb] text-lg mt-0.5 flex-shrink-0" icon="solar:check-circle-linear" />
                Priority SLA support (&lt;4h)
              </li>
              <li className="flex items-start gap-3 text-sm text-zinc-300 font-extralight font-geist">
                <Icon className="text-[#2563eb] text-lg mt-0.5 flex-shrink-0" icon="solar:check-circle-linear" />
                Advanced semantic search
              </li>
              <li className="flex items-start gap-3 text-sm text-zinc-300 font-extralight font-geist">
                <Icon className="text-[#2563eb] text-lg mt-0.5 flex-shrink-0" icon="solar:check-circle-linear" />
                Dynamic task routing
              </li>
            </ul>
            <button className="w-full py-4 px-6 rounded-full text-sm font-medium transition-all duration-300 font-geist bg-white text-black hover:bg-zinc-200 active:scale-95 shadow-[0_0_24px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)]">Start Free Trial</button>
          </div>
          <div className="stagger-item bg-[#18181b] hover:bg-[#1c1c1f] transition-colors duration-300 p-10 xl:p-14 flex flex-col relative z-10">
            <h3 className="text-xl font-medium tracking-tight text-zinc-100 font-geist mb-3">Enterprise</h3>
            <p className="text-zinc-500 text-sm font-extralight leading-relaxed font-geist mb-8 h-10">Mission-critical infrastructure with custom SLA and deployment.</p>
            <div className="mb-10 flex items-baseline gap-1">
              <span className="text-5xl lg:text-6xl font-light tracking-tighter text-white font-geist">Custom</span>
            </div>
            <ul className="flex flex-col gap-5 mb-14 flex-grow">
              <li className="flex items-start gap-3 text-sm text-zinc-300 font-extralight font-geist">
                <Icon className="text-[#2563eb] text-lg mt-0.5 flex-shrink-0" icon="solar:check-circle-linear" />
                Unlimited operations
              </li>
              <li className="flex items-start gap-3 text-sm text-zinc-300 font-extralight font-geist">
                <Icon className="text-[#2563eb] text-lg mt-0.5 flex-shrink-0" icon="solar:check-circle-linear" />
                Custom VPC deployment
              </li>
              <li className="flex items-start gap-3 text-sm text-zinc-300 font-extralight font-geist">
                <Icon className="text-[#2563eb] text-lg mt-0.5 flex-shrink-0" icon="solar:check-circle-linear" />
                24/7 dedicated engineering
              </li>
              <li className="flex items-start gap-3 text-sm text-zinc-300 font-extralight font-geist">
                <Icon className="text-[#2563eb] text-lg mt-0.5 flex-shrink-0" icon="solar:check-circle-linear" />
                SOC2 & HIPAA compliance
              </li>
              <li className="flex items-start gap-3 text-sm text-zinc-300 font-extralight font-geist">
                <Icon className="text-[#2563eb] text-lg mt-0.5 flex-shrink-0" icon="solar:check-circle-linear" />
                On-premise deployment options
              </li>
            </ul>
            <button className="w-full py-4 px-6 rounded-full text-sm font-medium transition-all duration-300 font-geist bg-transparent border border-[#27272a] text-zinc-300 hover:text-white hover:border-zinc-500 active:scale-95">Contact Sales</button>
          </div>
        </div>
      </div>
    </section>
  );
}
