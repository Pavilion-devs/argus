# ARGUS — Autonomous SOC Investigation Agent
### Splunk Agentic Ops Hackathon · Security Track · MCP-Native
*(Working title "Argus" — the hundred-eyed watchman. Rename freely.)*

---

## 0. Mission & Stakes

Build a **real, fully-working** autonomous Security Operations Center (SOC) investigation agent on the Splunk platform. When a security alert fires, Argus autonomously investigates it end-to-end through the Splunk MCP Server — planning, running its own SPL, pivoting across data, correlating evidence, mapping to MITRE ATT&CK, reaching a verdict, and **executing a real response** — with every conclusion provably grounded in the actual queries it ran and the actual events it saw.

- **Hackathon:** Splunk Agentic Ops Hackathon (Sponsor: Cisco/Splunk; Admin: Devpost)
- **Submission deadline:** **June 15, 2026, 9:00 AM PDT** (hard)
- **Feedback prize deadline:** June 19, 2026, 9:00 AM PDT
- **Judging:** June 26 – July 10, 2026 · Winners ~July 17, 2026
- **Team:** Solo entrant + Claude Code, building together
- **Prize targets:**
  - Grand Prize — $7,000
  - Security Track — $3,000
  - Bonus: **Best Use of Splunk MCP Server** — $1,000 (primary bonus; we are MCP-native)
  - Most Valuable Feedback — $200 (individual; capture real friction as we build)
- **A single project is eligible for Grand + its track + all 3 bonuses.** It can ultimately collect one overall/track prize + one bonus. We go for Grand/Security + MCP bonus.

---

## 1. Locked Decisions

| Decision | Value |
|---|---|
| Track | **Security / SOC** |
| Architecture | **MCP-native** — the agent touches Splunk *only* through the MCP server |
| Models | Cloud models OK. **Claude (Anthropic API)** as primary reasoning brain |
| Environment | Splunk Enterprise free trial (60 days) + Developer License; on-prem/local |
| Data | **Boss of the SOC (BOTS)** public dataset — real ingested data, really queried |
| Stance | **Everything real and working. No simulation, no hardcoded results, no scripted-only paths, no demo-ware.** |

---

## 2. Non-Negotiable Principles

1. **Real & working** — every feature genuinely executes against the live Splunk instance. Nothing faked, stubbed, or pre-canned for the camera.
2. **General, not scripted** — the agent dynamically decides each next SPL query from prior results. It investigates *whatever* alert/data it's given, not one rehearsed scenario.
3. **Grounded / provable** — every claim in the report links to the exact SPL executed and the exact returned events. Zero unverifiable assertions.
4. **Pure MCP client** — all Splunk interaction routes through the Splunk MCP Server tools. This is the spine of the "Best Use of MCP Server" story.
5. **Real actions** — response/containment actions actually execute against real, controllable targets (see §6E). Approval gate is a real workflow feature, not a hedge.
6. **Reproducible** — open-source repo, public BOTS data, documented setup; a judge can run it.

---

## 3. The Problem

A notable event fires in a SOC. A Tier-1 analyst then spends 30–60+ minutes manually pivoting across indexes — checking the source IP's history, the targeted user's auth events, process execution, lateral movement — then hand-writes findings. This is slow, inconsistent, fatigue-prone, and the #1 SOC bottleneck. Alerts pile up faster than humans can triage. **MTTR and analyst burnout are the core pain.**

---

## 4. The Product — What Argus Actually Does

Give Argus an alert (from a real Splunk notable/saved-search, or a plain-English request like *"investigate the brute-force on po-1556"*). It then runs a real autonomous loop:

1. **Plan** — decompose the alert into hypotheses and an investigation strategy.
2. **Act** — generate SPL (`generate_spl` / `saia_generate_spl`) and execute it (`run_splunk_query`) via MCP; orient with `get_indexes` / `get_saved_searches`.
3. **Observe & pivot** — read real results, decide the next query (suspicious IP → what else it touched → did the target account gain privileges → lateral movement). Self-correct when a query returns nothing.
4. **Correlate** — weave threads into a single coherent narrative.
5. **Conclude** — verdict (true/false positive), severity/risk score, attack timeline, affected entities, MITRE ATT&CK mapping.
6. **Respond** — execute a real containment/response action (see §6E).

---

## 5. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  WEB UI  (streaming reasoning trace · live SPL results ·       │
│           timeline viz · evidence drill-down · case mgmt)     │
└───────────────────────────┬─────────────────────────────────┘
                            │  (WebSocket / SSE streaming)
┌───────────────────────────▼─────────────────────────────────┐
│  ARGUS ORCHESTRATOR  (Claude API = reasoning brain)           │
│   • Lead investigator agent: plan → act → observe → reflect    │
│   • Specialist sub-agents: auth · network · endpoint · intel   │
│   • Synthesizer: merge findings → grounded report             │
│   • Grounding store: claim → (SPL, events) provenance map      │
│   • Response engine: pluggable real action connectors          │
│   • Case memory: persistent investigation store                │
└───────────────────────────┬─────────────────────────────────┘
                            │  speaks MCP ONLY (bearer token)
┌───────────────────────────▼─────────────────────────────────┐
│  SPLUNK MCP SERVER  (Splunkbase app 7931, :8089/services/mcp) │
│   tools: generate_spl · run_splunk_query · get_indexes ·       │
│          get_index_info · get_saved_searches · get_splunk_info │
│          (+ saia_* if AI Assistant installed)                 │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  SPLUNK ENTERPRISE  (BOTS dataset ingested)                   │
│   + KV-store blocklist · correlation searches · notables       │
└─────────────────────────────────────────────────────────────┘
        ▲
        └── External (real): Threat-intel APIs · Slack/Jira webhooks
```

This diagram becomes `architecture_diagram.png` at the repo root (required by the rules).

---

## 6. Feature Set (All-In, All Real)

### A. Investigation Engine
- True agent loop: **plan → act → observe → reflect → re-plan**, no hardcoded query paths.
- **Multi-agent**: a lead investigator dispatches specialist sub-agents (auth, network, endpoint, threat-intel), each running its own MCP-driven SPL; a synthesizer merges.
- Self-correction: retries/reformulates SPL on empty or malformed results.
- Hypothesis tracking: spawns, tests, confirms/prunes hypotheses.

### B. Grounding & Evidence
- Every claim carries provenance: the exact SPL + the exact events that support it.
- UI drill-down: click any line of the report → see the query and raw events.
- Confidence scoring per finding.

### C. MITRE ATT&CK Mapping
- Map observed behavior to real ATT&CK techniques/tactics; render the kill-chain.
- Validate model output against a real ATT&CK technique catalog (no invented IDs).

### D. Threat-Intel Enrichment
- Real enrichment of IPs/domains/hashes via real public reputation APIs.
- Feed enrichment back into the agent's reasoning.

### E. Real Response / Containment Connectors (actually execute)
- **Splunk-native:** create a real notable event; write offending IP/user to a real **KV-store blocklist** enforced by a real correlation search.
- **Webhook/ticketing:** real Slack message + real Jira/webhook ticket containing the grounded report.
- **Pluggable connector interface** so more real targets can be added.
- **Approval gate** (real human-in-the-loop) *and* **auto-execute** mode — both real, user-selectable.

### F. Continuous Monitoring Mode
- Watch a real Splunk saved-search/alert stream; auto-investigate new notables in real time as they fire.

### G. Case Management & Memory
- Persist every investigation (queries, evidence, verdict, actions) to a real datastore.
- Browse past cases; ask follow-up questions against a stored case.

### H. Streaming UI
- Live token-streamed agent reasoning + live SPL execution results.
- Interactive attack timeline; entity graph (hosts/users/IPs); evidence drill-down.

### I. Reporting / Export
- One-click export of the grounded incident report to PDF/Markdown.

### J. Evaluation Harness
- Run Argus against BOTS scenarios with known ground truth; measure verdict accuracy, pivots taken, time-to-conclusion. Real metrics for the README + video credibility (boosts "Technological Implementation").

### K. (Stretch, if ahead) Splunk App Packaging
- Package as a real Splunk app via the Python SDK; validate with **App Inspect**. Adds a clean-architecture credibility point (and a nod to Developer Tools).

---

## 7. Tech Stack (proposed)

- **Agent brain:** Claude (Anthropic API), strong tool-use; structured outputs.
- **Orchestrator:** Python (async), MCP client to Splunk MCP Server.
- **Backend/API:** FastAPI + WebSocket/SSE streaming.
- **UI:** React/Next.js (or Streamlit if we need speed) — streaming reasoning + viz.
- **Store:** SQLite/Postgres for case memory.
- **Splunk:** Enterprise trial + MCP Server app + (optional) AI Assistant for SPL.
- **Data:** BOTS v3 (or available BOTS version).

*Stack is firm-ish; we adjust only for speed, never to fake functionality.*

---

## 8. Data

**Boss of the SOC (BOTS)** — Splunk's public attack dataset. We ingest it for real; the agent issues real SPL against it and reads real results. Judges (Splunk people) recognize BOTS instantly → credibility. Using real public data ≠ hardcoding.

---

## 9. Build Sequencing (always-working, layered — NOT scope cuts)

The system is functional at the end of every phase; each phase stacks complexity on a living build.

- **Phase 0 — Environment (Day 1):** Splunk Enterprise install · MCP Server app + token · ingest BOTS · confirm MCP tools return real data · Anthropic API key. *Done = agent can run one real SPL via MCP.*
- **Phase 1 — Core loop:** single-agent plan→act→observe→re-plan over MCP, dynamic SPL, grounded output to console. *Done = real autonomous investigation, text out.*
- **Phase 2 — Grounding + report:** provenance map (claim→SPL→events), verdict, timeline, ATT&CK mapping.
- **Phase 3 — UI:** streaming reasoning + live results + timeline + evidence drill-down.
- **Phase 4 — Multi-agent + enrichment:** specialist sub-agents + real threat-intel.
- **Phase 5 — Real response:** KV-store blocklist + correlation search, notable creation, Slack/Jira, approval/auto modes.
- **Phase 6 — Monitoring + case memory:** real alert-stream auto-investigation + persistent cases.
- **Phase 7 — Eval harness + polish + export.**
- **Phase 8 — Submission:** record real-run video (<3 min), README, `architecture_diagram.png`, OSS license, text description; submit early.
- **Stretch — Splunk app packaging + App Inspect.**

---

## 10. Demo (3 min, a real live run — no fakery)

1. **0:00–0:20** — The pain: alert overload, manual pivoting.
2. **0:20–0:35** — A real BOTS notable on screen.
3. **0:35–2:10** — Argus runs **live**: plans, generates SPL, fires real queries via MCP, pivots, correlates → verdict, timeline, ATT&CK, affected entities.
4. **2:10–2:40** — Grounding payoff: click a claim → real SPL + real events. Then it **executes** a real containment (blocklist + ticket).
5. **2:40–3:00** — Impact line + "built entirely on the Splunk MCP Server" + architecture flash.

---

## 11. Submission Checklist (from Official Rules)

- [ ] Public, open-source repo with a detectable **OSS license** (visible in About)
- [ ] Clear **README** + setup/run instructions + dependencies + example config/data
- [ ] **`architecture_diagram.(md|pdf|png)`** at repo root (Splunk interaction · AI integration · data flow)
- [ ] **Demo video < 3 min**, public on YouTube/Vimeo/Youku (shows it running, shows AI use, problem, value)
- [ ] **Text description** of features/functionality
- [ ] Track selected: **Security**
- [ ] Project free to test, available through end of Judging Period
- [ ] No third-party trademarks/copyrighted music without permission
- [ ] Submit **before** June 15, 9:00 AM PDT (aim for a full day early)

---

## 12. Feedback Prize ($200)

As we build, log every real friction point with the MCP server / SDKs / docs (bugs, UX gaps, missing tools, doc errors). Submit one actionable Feedback Submission before **June 19**. Individual prize, independent of the project.

---

## 13. Why This Wins (mapped to the 4 equally-weighted criteria)

- **Technological Implementation:** real multi-agent loop, dynamic tool-use over live MCP, self-correction, grounded provenance, eval-measured accuracy.
- **Design:** streaming reasoning + evidence drill-down + timeline/graph — feels like a product, not a script.
- **Potential Impact:** collapses 45-min manual triage to minutes, never skips a pivot — universal, quantifiable SOC value.
- **Quality of Idea:** an autonomous, *provable* investigator that actually executes response — not "chat with your logs."

Plus: a clean "pure MCP client" story → **Best Use of Splunk MCP Server** bonus.
