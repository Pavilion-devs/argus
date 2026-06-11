'use client';

import { Icon } from "@iconify/react";
import MaskedText from "./MaskedText";

export default function HeroSection() {
  return (
    <section className="relative w-full min-h-[90vh] flex flex-col items-center justify-center overflow-hidden">
      <div className="flex md:px-8 z-0 pr-2 pb-0 pl-2 absolute top-0 right-0 bottom-0 left-0 gap-x-0 gap-y-0 items-end justify-center" style={{ maskImage: 'linear-gradient(transparent, black 0%, black 85%, transparent)' }}>
        <div className="flex-1 h-full w-full step-bar" style={{ height: '88.3306%' }}></div>
        <div className="flex-1 h-full w-full step-bar" style={{ height: '80.1608%' }}></div>
        <div className="flex-1 h-full w-full step-bar" style={{ height: '72.4081%' }}></div>
        <div className="flex-1 h-full w-full step-bar" style={{ height: '65.069%' }}></div>
        <div className="flex-1 h-full w-full step-bar" style={{ height: '58.1406%' }}></div>
        <div className="flex-1 h-full w-full step-bar" style={{ height: '51.6241%' }}></div>
        <div className="flex-1 h-full w-full step-bar" style={{ height: '45.5291%' }}></div>
        <div className="flex-1 h-full w-full step-bar" style={{ height: '39.8798%' }}></div>
        <div className="flex-1 h-full w-full step-bar" style={{ height: '34.7251%' }}></div>
        <div className="flex-1 h-full w-full step-bar" style={{ height: '30.1574%' }}></div>
        <div className="flex-1 h-full w-full step-bar" style={{ height: '26.3656%' }}></div>
        <div className="flex-1 h-full w-full step-bar" style={{ height: '23.9634%' }}></div>
        <div className="flex-1 h-full w-full step-bar" style={{ height: '26.1771%' }}></div>
        <div className="flex-1 h-full w-full step-bar" style={{ height: '29.7922%' }}></div>
        <div className="flex-1 h-full w-full step-bar" style={{ height: '34.2058%' }}></div>
        <div className="flex-1 h-full w-full step-bar" style={{ height: '39.2387%' }}></div>
        <div className="flex-1 h-full w-full step-bar" style={{ height: '44.8061%' }}></div>
        <div className="flex-1 h-full w-full step-bar" style={{ height: '50.8641%' }}></div>
        <div className="flex-1 h-full w-full step-bar" style={{ height: '57.3909%' }}></div>
        <div className="flex-1 h-full w-full step-bar" style={{ height: '64.3762%' }}></div>
        <div className="flex-1 h-full w-full step-bar" style={{ height: '71.8153%' }}></div>
        <div className="flex-1 h-full w-full step-bar" style={{ height: '79.7049%' }}></div>
        <div className="flex-1 h-full w-full step-bar" style={{ height: '88.0399%' }}></div>
      </div>
      <main className="z-10 flex-1 flex flex-col text-center mt-20 pr-4 pl-4 relative items-center justify-center">
        <h1 className="flex flex-wrap gap-x-[0.25em] gap-y-[0.1em] md:text-5xl lg:text-8xl text-4xl font-light text-white tracking-tighter font-geist max-w-4xl mb-6 drop-shadow-2xl justify-center">
          <MaskedText text="The SOC analyst that proves its work." />
        </h1>
        <p className="reveal-element text-sm md:text-lg font-extralight text-gray-300 max-w-[580px] leading-relaxed mb-10 drop-shadow-md font-geist">Argus autonomously investigates security alerts end-to-end on Splunk — planning and running its own SPL through the MCP Server, pivoting across real data, reaching a grounded verdict, then containing the threat. Every conclusion links to the exact query and the exact events behind it.</p>
        <div className="stagger-container flex flex-col sm:flex-row items-center gap-5">
          <a href="/dashboard" className="stagger-item w-full sm:w-auto px-8 py-3.5 bg-white text-black text-sm font-medium rounded-full shadow-[0_0_24px_rgba(255,255,255,0.25)] hover:shadow-[0_0_40px_rgba(255,255,255,0.45)] hover:scale-[1.02] transition-all duration-300 font-geist text-center">Launch live investigation</a>
          <a href="#how-it-works" className="stagger-item w-full sm:w-auto px-8 py-3.5 bg-black/40 backdrop-blur-md border border-white/10 text-white text-sm font-medium rounded-full hover:bg-white/10 hover:border-white/20 transition-all duration-300 font-geist text-center">See how it works</a>
        </div>
      </main>
      <div className="reveal-element absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce text-white/50">
        <Icon height="24" icon="solar:mouse-circle-linear" width="24" />
      </div>
    </section>
  );
}
