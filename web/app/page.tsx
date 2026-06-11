import Link from "next/link";
import { Icon } from "@iconify/react";
import Background from "@/components/Background";
import Nav from "@/components/Nav";
import Hero from "@/components/landing/Hero";

const STAGES = [
  {
    n: "01",
    title: "Investigate",
    icon: "solar:magnifer-zoom-in-linear",
    body: "A real plan → act → observe → re-plan loop. Claude writes its own SPL, runs it through the Splunk MCP Server, reads the results, and decides the next pivot. No hardcoded query paths — it works the case like a Tier-1 analyst, only faster.",
    tag: "MCP-native reads",
  },
  {
    n: "02",
    title: "Report",
    icon: "solar:document-text-linear",
    body: "A grounded incident report: verdict, severity, confidence, an attack timeline, affected entities and IOCs — every claim linked to the exact query that evidences it. MITRE ATT&CK techniques are validated against a pinned catalog; a composite 0–100 risk score makes triage defensible.",
    tag: "Provable every step",
  },
  {
    n: "03",
    title: "Contain",
    icon: "solar:shield-keyhole-linear",
    body: "With a human-approval gate, Argus writes offending indicators to a Splunk KV-store blocklist that a correlation search enforces against live data, records the case, and opens tickets. Real containment, not a recommendation slide.",
    tag: "Human-gated actions",
  },
  {
    n: "04",
    title: "Harden",
    icon: "solar:code-square-linear",
    body: "After a confirmed true positive, Argus authors a new read-only SPL detection for the attack pattern and installs it as a real scheduled Splunk correlation search. It doesn't just close the incident — it leaves behind the detection that catches the next one.",
    tag: "Detection-as-code",
  },
];

const CAPABILITIES = [
  { icon: "solar:branching-paths-up-linear", title: "Hypothesis ledger", body: "Declares leading theories up front and marks each confirmed or refuted as evidence lands — so it tests alternatives instead of confirming the first guess." },
  { icon: "solar:history-linear", title: "Institutional memory", body: "Recalls its own past cases and active blocklist mid-investigation. A repeat-offender indicator surfaces its prior verdict instantly, the way a veteran analyst would remember it." },
  { icon: "solar:shield-network-linear", title: "Validated ATT&CK", body: "Every technique id is checked against a pinned, real ATT&CK Enterprise catalog. Hallucinated ids are dropped; tactics render as an ordered kill-chain." },
  { icon: "solar:pie-chart-2-linear", title: "Composite risk score", body: "An explainable 0–100 score from verdict, confidence, severity, kill-chain breadth, live threat-intel and case history — for real prioritization, not just a label." },
  { icon: "solar:routing-2-linear", title: "Multi-agent team", body: "Four specialists — auth, network, endpoint, threat-intel — investigate concurrently, then a synthesizer correlates them into one attack narrative." },
  { icon: "solar:database-linear", title: "Real threat-intel", body: "IP, domain and hash reputation enrichment via live sources — geolocation, ASN, hosting/proxy flags and abuse scores feed directly into the risk math." },
];

const BENCHMARK = [
  { value: "1.0", label: "Verdict accuracy", sub: "18 runs · 6 BOTS v3 scenarios" },
  { value: "0.99", label: "Grounding precision", sub: "every reported IOC verified in data" },
  { value: "0", label: "Hallucinated ATT&CK ids", sub: "validated against pinned catalog" },
  { value: "~3 min", label: "Per investigation", sub: "~22 autonomous queries each" },
];

function SectionHeading({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-surface-100/60 px-3 py-1 text-xs font-medium text-primary-bright">
        {eyebrow}
      </div>
      <h2 className="text-3xl font-light tracking-tighter text-white md:text-5xl">{title}</h2>
      {sub && <p className="mt-4 text-base leading-relaxed text-zinc-400">{sub}</p>}
    </div>
  );
}

export default function Home() {
  return (
    <main className="relative">
      <Background />
      <Nav variant="landing" />
      <Hero />

      {/* HOW IT WORKS */}
      <section id="how" className="relative z-10 mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <SectionHeading
          eyebrow="The loop"
          title="Investigate. Report. Contain. Harden."
          sub="One autonomous cycle that takes an alert from raw notable to a closed, grounded case — and leaves the SOC stronger than it found it."
        />
        <div className="mt-16 grid gap-5 md:grid-cols-2">
          {STAGES.map((s) => (
            <div
              key={s.n}
              className="group relative overflow-hidden rounded-2xl border border-line bg-card-sheen p-7 transition-all hover:border-primary/40 hover:shadow-glow"
            >
              <div className="flex items-start justify-between">
                <span className="font-mono text-sm text-zinc-600">{s.n}</span>
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface-50 text-primary-bright transition-colors group-hover:border-primary/40">
                  <Icon icon={s.icon} className="h-6 w-6" />
                </span>
              </div>
              <h3 className="mt-5 text-xl font-medium tracking-tight text-zinc-100 transition-colors group-hover:text-primary-bright">
                {s.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">{s.body}</p>
              <div className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs text-zinc-400">
                <Icon icon="solar:check-circle-linear" className="h-3.5 w-3.5 text-confirm" />
                {s.tag}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* GROUNDING / THESIS */}
      <section id="evidence" className="relative z-10 border-y border-line/60 bg-surface/40 py-24 backdrop-blur-sm">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-surface-100/60 px-3 py-1 text-xs font-medium text-primary-bright">
              The grounding thesis
            </div>
            <h2 className="text-3xl font-light tracking-tighter text-white md:text-4xl">
              Every conclusion is provable from the data it queried.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-zinc-400">
              An AI verdict you can&apos;t check is just a guess with confidence. Argus captures the exact
              SPL and the exact events behind every claim. Click any timeline step in the console and the
              query that evidences it — plus the raw results — drill open. That&apos;s the difference between
              a plausible answer and an auditable one.
            </p>
            <ul className="mt-7 space-y-3">
              {[
                "Reads Splunk only through the MCP Server — a clean, auditable boundary",
                "Each timeline step carries the tool_use id of the query behind it",
                "Reported IOCs are automatically checked to exist in the data (zero-hallucination)",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 text-sm text-zinc-300">
                  <Icon icon="solar:check-circle-linear" className="mt-0.5 h-5 w-5 shrink-0 text-confirm" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          {/* evidence visual */}
          <div className="rounded-2xl border border-line bg-card-sheen p-1.5 shadow-card">
            <div className="rounded-xl border border-line/70 bg-ink/60 p-4 font-mono text-xs">
              <div className="flex items-center gap-2 border-b border-line/60 pb-3 text-zinc-500">
                <span className="h-2.5 w-2.5 rounded-full bg-threat-critical/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-threat-medium/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-confirm/70" />
                <span className="ml-2 text-[11px]">claim → evidence</span>
              </div>
              <div className="mt-3 space-y-3">
                <div className="text-zinc-300">
                  <span className="text-primary-bright">timeline</span> · web_admin issues RunInstances across 15 regions
                </div>
                <div className="rounded-lg border border-line/70 bg-surface-100/60 p-3 text-zinc-400">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-600">evidenced by tool_use_01</div>
                  <div className="mt-1.5 leading-relaxed text-emerald-300/90">
                    index=botsv3 sourcetype=aws:cloudtrail<br />
                    eventName=RunInstances user=web_admin<br />
                    | stats dc(awsRegion) count by sourceIPAddress
                  </div>
                </div>
                <div className="flex items-center gap-2 text-zinc-500">
                  <Icon icon="solar:arrow-down-linear" className="h-4 w-4" />
                  <span>637 denied calls · 1 source IP · 139.198.18.205</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CAPABILITIES */}
      <section id="capabilities" className="relative z-10 mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <SectionHeading
          eyebrow="Capabilities"
          title="Analyst tradecraft, made autonomous"
          sub="The judgment a senior analyst brings to a case — declared hypotheses, institutional memory, validated frameworks — encoded into the agent."
        />
        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((c) => (
            <div
              key={c.title}
              className="group rounded-2xl border border-line bg-surface-100/50 p-6 transition-all hover:border-primary/40 hover:bg-surface-50"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface-50 text-primary-bright transition-colors group-hover:border-primary/40 group-hover:shadow-glow-sm">
                <Icon icon={c.icon} className="h-6 w-6" />
              </span>
              <h3 className="mt-5 text-lg font-medium tracking-tight text-zinc-100">{c.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-zinc-400">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* BENCHMARK */}
      <section id="benchmark" className="relative z-10 border-y border-line/60 bg-surface/40 py-24 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="Measured, not asserted"
            title="The numbers, and the discipline behind them"
            sub="Argus is scored against curated BOTS v3 scenarios with data-verified ground truth — including benign precision controls so it doesn't cry wolf. Multi-sampled, root-caused, honest."
          />
          <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {BENCHMARK.map((b) => (
              <div key={b.label} className="rounded-2xl border border-line bg-card-sheen p-6 text-center">
                <div className="tnum bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-4xl font-light text-transparent">
                  {b.value}
                </div>
                <div className="mt-2 text-sm font-medium text-zinc-200">{b.label}</div>
                <div className="mt-1 text-xs text-zinc-500">{b.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto max-w-5xl px-4 py-28 text-center sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-line bg-card-sheen p-12 shadow-card">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/20 blur-[100px]" />
          <h2 className="relative text-3xl font-light tracking-tighter text-white md:text-5xl">
            Watch it work a real case.
          </h2>
          <p className="relative mx-auto mt-5 max-w-xl text-base text-zinc-400">
            Run the AWS credential-abuse alert through the live console and watch Argus reason,
            query Splunk, build its hypothesis ledger, and reach a grounded verdict — in real time.
          </p>
          <Link href="/dashboard" className="hero-cta btn-primary relative mt-9">
            <Icon icon="solar:play-circle-linear" className="h-5 w-5" />
            Open the live console
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-line/50 bg-ink px-6 pb-10 pt-16">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-orb shadow-glow-sm">
              <Icon icon="solar:eye-scan-linear" className="h-5 w-5 text-white" />
            </span>
            <div>
              <div className="text-sm font-medium text-white">Argus</div>
              <div className="text-xs text-zinc-500">Autonomous SOC investigation agent</div>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm text-zinc-500">
            <span>Built on the Splunk MCP Server</span>
            <span className="hidden h-4 w-px bg-line sm:block" />
            <span>BOTS v3 · MITRE ATT&CK v19.1</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
