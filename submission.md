# Argus — Splunk Agentic Ops Hackathon Submission

## Project Name

Argus — Autonomous SOC Analyst

## Tagline

The autonomous SOC analyst for Splunk: it writes its own SPL via the MCP Server, maps MITRE ATT&CK, and contains threats, with every verdict grounded in real events.

## Overview

A Tier-1 analyst spends 30–60 minutes triaging a single Splunk alert, and the queue never ends. Pointing an LLM at it only helps if the verdict can be trusted, and "true positive, severity high" is worthless without the evidence behind it.

Argus is built around that constraint. It is an autonomous SOC analyst for Splunk with one rule: every material claim is grounded in real Splunk evidence, linked back to the exact SPL it ran and the events it used. It reads Splunk only through the Splunk MCP Server, which keeps the whole investigation auditable, portable, and reusable.

## Try It Live (no setup)

- **Live app + dashboard:** https://www.tryargus.xyz · **Docs:** https://www.tryargus.xyz/docs
- **Hosted MCP for judges** — point Claude Code/Desktop at a live, **read-only** Argus running against real Splunk + BOTS v3, with no clone, `uv`, or credentials:
  ```bash
  claude mcp add argus-hosted --transport http https://mcp.tryargus.xyz/mcp \
    --header "Authorization: Bearer <token in submission notes>"
  ```
  Then ask Claude to `use argus-hosted to investigate suspicious AWS activity in botsv3`. Response/containment tools are not exposed on the hosted endpoint.
- **Demo video:** https://youtu.be/1id6YQgY73s

## What Argus Does

Given an alert or a natural-language request, Argus:

1. Recalls prior cases and the active blocklist so repeat offenders surface immediately.
2. Investigates autonomously with a real plan → act → observe → re-plan loop. It writes SPL, runs it through the Splunk MCP Server, reads the results, and chooses the next pivot. No scripted paths.
3. Tracks explicit hypotheses, marking each confirmed or refuted as evidence arrives.
4. Produces a grounded report: verdict, severity, confidence, attack timeline, IOCs, validated MITRE ATT&CK, kill-chain, and an explainable 0–100 risk score.
5. Executes response behind approval gates: a Splunk KV-store blocklist enforced by a correlation search, optional tickets, and a recorded case.
6. Self-hardens after a true positive by writing and installing a read-only SPL detection so the SOC catches the recurrence.

On BOTS v3 it autonomously finds the Frothly AWS compromise (leaked key, hijacked `web_admin`, attacker IP `139.198.18.205`), contains it, and writes a detection that fires on the same pattern.

## How We Built It

A Python async orchestrator runs a custom Claude tool-use loop (Claude Sonnet 4.6 on AWS Bedrock). All investigation reads go through the Splunk MCP Server (Splunkbase 7931) over JSON-RPC, running real SPL against live Splunk every run — nothing is mocked. Response writes use Splunk's authenticated REST API, so the analysis path stays read-only and MCP-native while actions stay explicit and gated. Deterministic post-processing validates MITRE technique ids against a pinned ATT&CK catalog and computes the risk score, so the trustworthy parts can't be hallucinated.

Argus also ships as reusable infrastructure: a CLI, a streaming web dashboard, an Argus MCP server so other copilots can call it, and a Splunk custom alert action so a saved search can trigger it. All of it runs live in the cloud — the dashboard on Vercel, the agent + Splunk co-located on a VPS behind HAProxy/TLS, and a hosted, token-gated **read-only** MCP endpoint other hosts can connect to directly.

## Why This Stands Out

- It writes its own SPL through the Splunk MCP Server instead of following a fixed query tree.
- Every claim is auditable, linked to the exact SPL and events rather than a free-form summary.
- It is reusable as infrastructure: a Splunk alert action on one side, an analyst-grade MCP server on the other.
- It doesn't stop at triage. It contains the threat and installs the detection that catches the next one.

## Live Proof Completed

- Splunk custom alert action package: `splunk/argus_response/`
- Webhook endpoints for Splunk alerts: `POST /api/splunk/alert` (plus status and list)
- Argus MCP server for external hosts: `uv run argus mcp` (verified callable from Claude Code)
- Detection dry-run before deploy and on-demand execution: `uv run argus detections --run --earliest 0`
- Dashboard "SOC proof" tab for alert jobs and detection firing
- Evaluation over 6 curated BOTS v3 scenarios: verdict accuracy 1.0, grounding ~0.99, 0 invalid ATT&CK ids (18 runs)
- Live-fire: a recorded case, the deployed detection "Argus - Auto: AWS IAM API abuse by web_admin source IP", and 1 live match on `139.198.18.205` / `web_admin`
- Deployed live end-to-end: the Next.js dashboard on Vercel (`www.tryargus.xyz`), the agent + Splunk Enterprise + BOTS v3 + Bedrock co-located on a cloud VPS behind HAProxy/TLS (`api.tryargus.xyz`), and a hosted **read-only** Argus MCP endpoint (`mcp.tryargus.xyz`) judges connect to with a single `claude mcp add`

## Challenges We Faced

A failing benchmark turned out to be wrong, not the agent: a "malicious" ground-truth IP was actually Splunk's own benign data-collection account. We fixed the metric instead of forcing the agent toward a false positive, and made that a core principle.

Pulling decisive evidence from raw XML-heavy Sysmon data in BOTS v3 took better extraction tradecraft plus a confidence-gated continuation, so the agent finishes a close-but-not-decisive pivot.

Real integration friction: MCP tokens only work when minted with `audience=mcp`, and the web stream needed exact SSE framing plus disabled Next.js compression before events would render.

## What We Learned

- Grounding is the product. Without evidence links, security AI isn't trustworthy enough to use.
- A failing metric can indicate a data problem, not an agent problem.
- Benign verdicts must be first-class successful outcomes, or the system over-calls.
- Strong constraints buy trust: keep investigation MCP-native and read-only, and gate every write.

## What's Next

- Move from exact-match case recall to semantic recall.
- Broaden the detection-replay evidence.
- Calibrate risk-score weights against labeled incident-priority data.
- Harden the hosted MCP for multi-tenant use: per-org Splunk connections and scoped, OAuth-issued tokens instead of a shared demo bearer.
- Stream live investigation progress over MCP so a connected host can watch Argus reason, not just receive the final report.

## Built With

`python`, `splunk-mcp-server`, `spl`, `botsv3`, `model-context-protocol`, `claude-sonnet-4.6`, `aws-bedrock`, `mitre-att&ck`, `fastapi`, `next.js`, `splunk-kv-store`, `splunk-rest-api`

---

Repo: https://github.com/Pavilion-devs/argus (public · MIT) · Live: https://www.tryargus.xyz · Hosted MCP: https://mcp.tryargus.xyz/mcp · Demo: https://youtu.be/1id6YQgY73s
