'use client';

import Link from "next/link";
import { Icon } from "@iconify/react";
import MaskedText from "./MaskedText";
import ArchitectureDiagram from "./ArchitectureDiagram";

const steps = [
  {
    n: "01",
    title: "Alert → Plan",
    label: "planning",
    icon: "solar:checklist-minimalistic-linear",
    body: "Argus takes the notable, recalls its own past cases and active blocklist, then declares the leading hypotheses it will test before it runs a single query.",
  },
  {
    n: "02",
    title: "Write SPL",
    label: "querying",
    icon: "solar:database-linear",
    body: "It writes SPL on the fly and runs it through the Splunk MCP Server, the only way Argus ever touches Splunk.",
  },
  {
    n: "03",
    title: "Observe → Pivot",
    label: "pivoting",
    icon: "solar:routing-2-linear",
    body: "It reads the result rows, confirms or refutes each hypothesis, and decides the next query. No hardcoded paths.",
  },
  {
    n: "04",
    title: "Prove → Contain",
    label: "hardening",
    icon: "solar:shield-check-linear",
    body: "It files a grounded report, contains the threat through a gated response, and installs a detection so it cannot recur.",
  },
];

export default function HowItWorksSection() {
  return (
    <section className="bg-[#131315]/80 text-white flex flex-col relative z-20 backdrop-blur-sm" id="how-it-works">
      <div className="flex flex-col text-center bg-[#000000] w-full border-[#27272a]/40 border-b pt-28 pr-6 pb-20 pl-6 items-center">
        <h2 className="flex flex-wrap gap-x-[0.25em] gap-y-[0.1em] text-4xl md:text-5xl lg:text-6xl font-light tracking-tighter text-white font-geist mb-6 justify-center">
          <MaskedText text="How it works" />
        </h2>
        <p className="reveal-element text-zinc-400 text-lg md:text-xl font-extralight max-w-2xl font-geist mb-10 leading-relaxed">One alert in, a contained incident out. Argus runs a real plan, act, observe, re-plan loop against live Splunk, proves the verdict, then closes the loop with a gated response and a new detection.</p>
        <a href="/dashboard" className="reveal-element px-8 py-3.5 bg-zinc-100 text-black text-sm font-medium rounded-full shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:bg-white hover:scale-[1.03] transition-all duration-300 font-geist">See it live</a>
      </div>

      <div className="w-full bg-[#000000] px-6 pt-16 pb-20 xl:px-20">
        <div className="reveal-element mx-auto mb-10 flex max-w-7xl items-center gap-4 text-xs font-normal text-zinc-500 font-geist">
          <span className="whitespace-nowrap tracking-wide">Plan · Act · Observe · Re-plan</span>
          <div className="h-px flex-1 bg-[#27272a]"></div>
          <span className="whitespace-nowrap tracking-wide">MCP-native</span>
        </div>
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {steps.map((s) => (
            <div
              key={s.n}
              className="reveal-element group flex flex-col rounded-2xl border border-[#27272a] bg-[#18181b] p-8 transition-all duration-500 hover:border-[#3f3f46] hover:bg-[#1e1e22]"
            >
              <div className="flex items-center justify-between">
                <span className="font-geist text-5xl font-extralight tracking-tighter text-zinc-100">{s.n}</span>
                <Icon icon={s.icon} className="text-2xl text-[#2563eb] transition-transform duration-500 group-hover:-translate-y-0.5" strokeWidth="1.5" />
              </div>
              <h3 className="mt-10 font-geist text-xl font-medium tracking-tight text-white">{s.title}</h3>
              <p className="mt-3 font-geist text-sm font-extralight leading-relaxed text-zinc-400">{s.body}</p>
              <span className="mt-auto pt-10 font-geist text-xs uppercase tracking-[0.18em] text-zinc-500">{s.label}</span>
            </div>
          ))}
        </div>
        <div className="reveal-element mx-auto mt-10 flex max-w-7xl items-center gap-4 text-zinc-400 text-sm">
          <Icon className="text-[#2563eb] text-2xl" icon="solar:widget-5-linear" strokeWidth="1.5" />
          <span className="font-extralight tracking-wide font-geist">Plan · act · observe · prove · contain · harden.</span>
        </div>
      </div>

      {/* Full architecture diagram — embedded preview. Remove this whole block to drop it. */}
      <div
        id="architecture"
        className="flex w-full flex-col items-center border-t border-[#27272a]/40 bg-[#000000] px-6 py-24"
      >
        <div className="reveal-element mb-10 max-w-2xl text-center">
          <span className="font-geist text-xs uppercase tracking-[0.22em] text-zinc-500">
            The full picture
          </span>
          <h3 className="mt-3 font-geist text-3xl font-light tracking-tight text-white md:text-4xl">
            One diagram, end to end
          </h3>
          <p className="mt-4 font-geist text-base font-extralight leading-relaxed text-zinc-400">
            From the analyst&apos;s alert to a contained incident and a fresh detection, the
            whole Argus architecture in a single view.
          </p>
        </div>
        <div className="w-full max-w-7xl">
          <ArchitectureDiagram framed />
        </div>
        <Link
          href="/architecture"
          className="reveal-element mt-8 inline-flex items-center gap-2 font-geist text-sm font-medium text-zinc-300 transition-colors hover:text-white"
        >
          Open full view
          <Icon icon="solar:arrow-right-up-linear" className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
