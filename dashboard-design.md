# Argus Dashboard — Design Spec (port & re-skin)

**Important:** most of this is already built. The job is **not greenfield** — it's
(1) light content adaptation of the new landing template and (2) **porting the existing,
working dashboard onto it and re-skinning it**. Do not rebuild from scratch.

### What already exists
- **Backend bridge — live in the working tree.** `src/argus/server.py` + the `argus serve`
  CLI command: a FastAPI/SSE layer with `/investigate` and `/respond` endpoints that stream
  the engine's events. Built in commits `14366dd` / `39a61ee`. Run it and confirm it works first.
- **A complete prior dashboard frontend — in git history at `a55625e`.** Recover any file with
  `git show a55625e:<path>` or `git checkout a55625e -- <path>`:
  - `web/components/dashboard/`: `ReasoningStream.tsx`, `SplFeed.tsx`, `HypothesisLedger.tsx`,
    `MemoryPanel.tsx`, `MemoryTab.tsx`, `ReportPanel.tsx`, `RiskGauge.tsx`, `EvidenceDrawer.tsx`,
    `ResponsePanel.tsx`
  - `web/lib/`: `sse.ts`, `types.ts`, `useInvestigation.ts`, `api.ts`, `format.ts` (the data layer)
  - `web/app/dashboard/page.tsx` (the dashboard route)
- **The new landing template — in `web/` now.** Next.js App Router + Tailwind + `@iconify/react`
  + GSAP. Sections are components (`HeroSection`, `FeaturesSection`, `MetricsSection`,
  `HowItWorksSection`, `PricingSection`, `TestimonialSection`, `CTASection`, `Navbar`, `Footer`,
  `DashboardOverview`). **The design is finished and good — do not redesign it.**

So: keep the new template's **look**, bring over the prior dashboard's **logic**, and make the
panels wear the new design. Work it in phases — finish Phase 1 and confirm before Phase 2.

---

## Visual language (reuse — do NOT reinvent)

- Reuse the new template's Tailwind tokens, dark background, card/border/glow styling,
  `@iconify/react` icons, fonts, and GSAP feel. `components/DashboardOverview.tsx` is the
  **style seed** for dashboard panels — match its chrome.
- The ported panels keep their DATA handling (from `a55625e`); only their **styling** changes
  to the new template's classes. New panels should look like they shipped with the template.
- Add semantic status colors only where data needs them: red/amber for threat severity,
  emerald for "contained/benign/good", the template accent for primary.

---

## Phase 1 — Adapt the landing page (content only, no design/layout changes)

Swap placeholder copy in the existing section components for Argus's story. **Edit text/props
only.**

| Component | Adapt to |
|---|---|
| `Navbar.tsx` | "Argus" brand; links (Product, How it works, Evaluation, Dashboard) |
| `HeroSection.tsx` | The pitch: *autonomous SOC investigator that investigates → proves → contains → hardens, entirely through the Splunk MCP Server.* CTA → `/dashboard` |
| `DashboardOverview.tsx` | A preview/still of the real dashboard (verdict + risk + kill-chain) |
| `HowItWorksSection.tsx` | The loop: alert → plan/act/observe (MCP SPL) → grounded report → gated response → detection-as-code |
| `FeaturesSection.tsx` | Real capabilities: grounded reasoning, hypothesis ledger, institutional memory, validated MITRE + kill-chain, risk scoring, multi-agent, self-hardening loop |
| `MetricsSection.tsx` | Real eval numbers from `EVALUATION.md`: verdict accuracy 1.0, grounding 0.99, 0 invalid ATT&CK ids, 6 scenarios / 18 runs |
| `TestimonialSection.tsx` | Repurpose as "why it matters" / SOC pain, or drop |
| `PricingSection.tsx` | Repurpose (deployment/editions) or drop — it's a hackathon project |
| `CTASection.tsx` / `Footer.tsx` | CTA → dashboard; footer → the GitHub repo |

Keep it honest — metrics must match `EVALUATION.md`. No invented customers/numbers. Commit,
confirm the look, then move on.

---

## Phase 2 — Port the dashboard onto the new template

A `/dashboard` route where you submit/pick an alert and **watch Argus investigate live**, then
drill into the grounded report and the response.

### 2.0 — Restore the data layer + verify the backend
- Run `argus serve` and hit `/investigate` (SSE) to confirm the bridge streams real events.
- Recover `web/lib/{sse,types,useInvestigation,api,format}.ts` from `a55625e` — this is the
  already-working glue (SSE parsing, the event/report TypeScript types, the `useInvestigation`
  hook). Keep it; it saves you re-deriving the whole event contract.

### 2.1 — Event reference (what the stream emits)

Each SSE message is a JSON object with a `type` (and usually an `agent` tag, `""` for
single-agent). Authoritative source: `src/argus/agent.py` + `cli.py` (and the existing
`web/lib/types.ts` in `a55625e`).

| Event | Payload | Render |
|---|---|---|
| `multi_start` | `agents[]` | Start the specialist lanes |
| `specialist_started` / `specialist_done` | `agent`, `findings` | Lane status |
| `thinking` / `text` | `text`, `agent` | Reasoning stream |
| `tool_call` | `id`, `name`, `input`, `agent` | SPL feed (the query) |
| `tool_result` | `id`, `name`, `is_error`, `text`, `agent` | SPL feed result (✓/✗ + rows) |
| `recall` | `recall{related_cases[], blocklist_hits[]}` | "🧠 seen before" memory chip |
| `hypothesis` | `hypothesis{id, statement, status, confidence}` | Ledger chip (open/confirmed/refuted) |
| `continuation` | `reason`, `verdict`, `confidence` | "↻ pursuing the decisive pivot" banner |
| `report` | `report{…}` (fields below) | The Incident Report panel |
| `case_created` / `action_executed` / `action_skipped` / `response_done` | … | Response phase rows |
| `error` / `done` | — | Error toast / stream end |

### 2.2 — Panels (port + re-skin these from `a55625e`)

- **Investigation Console** — `ReasoningStream.tsx` (reasoning/narration), `SplFeed.tsx` (live
  SPL + results), `HypothesisLedger.tsx`, the recall chip, the continuation banner. For `--multi`,
  four specialist lanes (auth/network/endpoint/intel) by `agent` tag.
- **Incident Report** — `ReportPanel.tsx` + `RiskGauge.tsx`. Report fields (from `models.py` +
  `enrich.py`): `verdict`, `severity`, `confidence`, `title`, `summary`, `risk_score` (0–100),
  `risk_band`, `risk_rationale`, `kill_chain[]` (`{tactic,label}`, ordered), `mitre_attack[]`
  (`{technique_id, canonical_name, tactics, url, valid}`), `attack_timeline[]`
  (`{time, event, evidence_tool_use_id}`), `affected_entities[]` (`{type,value,role}`), `iocs[]`,
  `recommended_actions[]` (`{action,rationale,automatable}`), `prior_cases[]`, `hypotheses[]`,
  `threat_intel_signal{}`. Render verdict badge (TP=red/FP=emerald/inconclusive=amber), the risk
  gauge (tooltip = `risk_rationale`), the ATT&CK kill-chain (ordered labels + technique chips →
  `url`), the timeline, entities, IOCs, recommended actions.
- **Evidence drill-down** — `EvidenceDrawer.tsx`. The grounding payoff: accumulate
  `tool_call`/`tool_result` by `id`; a timeline step (or any cited claim) with an
  `evidence_tool_use_id` is clickable → show **the exact SPL + the exact result rows** behind it.
  *Do not drop this — it's the single most convincing thing in the demo.*
- **Response** — `ResponsePanel.tsx`. With `respond` on: `case_created`, each `action_executed`
  (block / notify / ticket / **deploy_detection** → show the deployed search name + SPL + schedule),
  `response_done`. Run `mode="auto"` for the demo (web-based human approval is later — the CLI has it).
- **Memory / Detections** — `MemoryPanel.tsx` / `MemoryTab.tsx` over `GET /api/cases` and
  `/api/detections`: past cases (case_id, verdict, severity, risk, title, date) and the scheduled
  detections Argus auto-deployed (the self-hardening loop's visible output).

---

## Suggested order (phase 2)
1. `argus serve` up + data layer restored from `a55625e` + a bare `/dashboard` that renders the
   raw stream (prove the pipe on the new template).
2. Port + re-skin the **Investigation Console** (single-agent first, then `--multi` lanes).
3. Port + re-skin the **Incident Report** + **Evidence drawer**.
4. Port + re-skin **Response** + **Memory/Detections**.
5. Polish + the demo run (AWS alert: web_admin / 139.198.18.205).

## Out of scope (for now)
- Web-based human-in-the-loop approval (auto mode for the demo; CLI has the gate).
- Auth / multi-user; live `argus monitor` → dashboard (nice later).
- Any redesign of the template. If something looks off, it's content/skin, not a new design.
