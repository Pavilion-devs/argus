"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { gsap } from "gsap";

export default function Hero() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".hero-pill", { y: 12, opacity: 0, duration: 0.5 })
        .from(".hero-word", { y: 28, opacity: 0, duration: 0.7, stagger: 0.08 }, "-=0.2")
        .from(".hero-sub", { y: 16, opacity: 0, duration: 0.6 }, "-=0.35")
        .from(".hero-cta", { y: 14, opacity: 0, duration: 0.5, stagger: 0.1 }, "-=0.3")
        .from(".hero-orb", { scale: 0.6, opacity: 0, duration: 1.2, ease: "power2.out" }, "-=1.1")
        .from(".hero-ring", { scale: 0.5, opacity: 0, duration: 1.2, stagger: 0.15 }, "-=1.0");
      gsap.to(".hero-orb", { y: -14, duration: 4, repeat: -1, yoyo: true, ease: "sine.inOut" });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      className="relative flex min-h-[92vh] w-full flex-col items-center justify-center overflow-hidden px-4 pt-28"
    >
      {/* central glowing orb */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="hero-orb relative h-[30rem] w-[30rem]">
          <div className="absolute inset-0 rounded-full bg-blue-orb opacity-25 blur-[90px]" />
          <div className="hero-ring absolute inset-8 rounded-full border border-primary/30" />
          <div className="hero-ring absolute inset-20 rounded-full border border-primary/20" />
          <div className="hero-ring absolute inset-32 rounded-full border border-white/10" />
          <div className="absolute inset-0 grid place-items-center">
            <div className="grid h-24 w-24 place-items-center rounded-3xl border border-white/10 bg-zinc-900/60 shadow-glow backdrop-blur-sm">
              <Icon icon="solar:eye-scan-linear" className="h-12 w-12 text-primary-bright animate-pulse-glow" />
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="hero-pill mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900/70 px-3.5 py-1.5 text-xs text-zinc-300 backdrop-blur">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-confirm opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-confirm" />
          </span>
          Splunk Agentic Ops Hackathon · Security track
        </div>

        <h1 className="flex max-w-4xl flex-wrap justify-center gap-x-[0.28em] gap-y-1 text-4xl font-light leading-[1.05] tracking-tighter text-white md:text-6xl lg:text-7xl">
          {"The SOC analyst".split(" ").map((w, i) => (
            <span key={i} className="hero-word">{w}</span>
          ))}
          <span className="hero-word bg-gradient-to-r from-primary-bright via-primary to-indigo-400 bg-clip-text text-transparent">
            that proves
          </span>
          <span className="hero-word bg-gradient-to-r from-primary-bright via-primary to-indigo-400 bg-clip-text text-transparent">
            its work.
          </span>
        </h1>

        <p className="hero-sub mt-7 max-w-2xl text-base leading-relaxed text-zinc-400 md:text-lg">
          Argus autonomously investigates security alerts end-to-end on Splunk — planning and running
          its own SPL, pivoting across real data, reaching a grounded verdict, then containing the
          threat. Every conclusion links to the exact query and the exact events behind it.
        </p>

        <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
          <Link href="/dashboard" className="hero-cta btn-primary">
            <Icon icon="solar:play-circle-linear" className="h-5 w-5" />
            Launch live investigation
          </Link>
          <a href="#how" className="hero-cta btn-ghost">
            See how it works
            <Icon icon="solar:arrow-down-linear" className="h-4 w-4" />
          </a>
        </div>

        <div className="hero-sub mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-zinc-500">
          {[
            ["solar:shield-check-linear", "100% MCP-native reads"],
            ["solar:graph-up-linear", "Verdict accuracy 1.0 · grounding 0.99"],
            ["solar:routing-2-linear", "4-specialist multi-agent mode"],
            ["solar:code-square-linear", "Self-hardening detection-as-code"],
          ].map(([icon, label]) => (
            <span key={label} className="flex items-center gap-2">
              <Icon icon={icon} className="h-4 w-4 text-primary-bright" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
