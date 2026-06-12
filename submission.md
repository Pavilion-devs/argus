# Argus — Splunk Agentic Ops Hackathon Submission

## Project Name

Argus — Autonomous SOC Analyst

## Tagline

The autonomous SOC analyst for Splunk: it writes its own SPL via the MCP
Server, maps MITRE ATT&CK, and contains threats, with every verdict grounded in
real events.

## Overview

A Tier-1 SOC analyst spends 30-60 minutes manually pivoting across Splunk to
triage a single notable event, and there are usually many more waiting in the
queue. The obvious idea is to point an LLM at the alert, but in security that
only matters if the model can be trusted. "True positive, severity high" is
not useful if nobody can see the exact evidence behind it.

Argus is built around that constraint. It is an autonomous SOC analyst for
Splunk with one hard rule: every material claim must be grounded in real
Splunk evidence. Every conclusion links back to the SPL Argus wrote and the
events it used. The other half of the design is MCP discipline: Argus reads
Splunk only through the Splunk MCP Server, never through a hidden side path.
That makes the investigation flow auditable, portable, and reusable.

## What Argus Does

Given an alert or a natural-language investigation request, Argus:

1. Recalls prior cases and the active blocklist so repeat offenders surface
   immediately.
2. Investigates autonomously with a real plan -> act -> observe -> re-plan
   loop. Claude writes SPL, runs it through the Splunk MCP Server, inspects the
   results, and chooses the next pivot.
3. Tracks explicit hypotheses and marks them confirmed or refuted as evidence
   arrives, so the reasoning stays inspectable.
4. Produces a grounded incident report with verdict, severity, confidence,
   attack timeline, IOCs, validated MITRE ATT&CK mapping, kill-chain, and an
   explainable 0-100 risk score.
5. Executes response actions behind approval gates by writing to a Splunk
   KV-store blocklist, opening workflow tickets if configured, and recording
   the case for later memory recall.
6. Self-hardens after a true positive by writing and installing a read-only SPL
   detection as a real scheduled search so the SOC can catch the recurrence.

On the BOTS v3 dataset, Argus autonomously finds the Frothly AWS compromise,
including the leaked access key `AKIAIGKL572SFDPOKLHA`, the compromised
`web_admin` identity, and attacker IP `139.198.18.205`, then contains it and
authors a detection that fires on the same attack pattern.

## How We Built It

Argus is a Python async orchestrator with a custom Claude tool-use loop. We did
not use a managed-agent abstraction because the system needs tight control over
Splunk MCP tool access, evidence grounding, case memory, and write approval
gates.

All investigation reads go through the Splunk MCP Server over JSON-RPC. Response
writes use Splunk's authenticated REST API to update KV-store collections and
scheduled searches. That separation is deliberate: the analysis path stays
read-only and MCP-native, while response actions remain explicit and gated.

Deterministic post-processing validates the parts that should never be
hallucinated. MITRE ATT&CK technique ids are checked against a pinned ATT&CK
Enterprise catalog committed to the repo, and the risk score is computed from
observable factors including verdict, confidence, severity, kill-chain breadth,
threat intelligence, and case-memory recidivism.

Argus also ships in reusable forms:

- A CLI for investigation, response, and evaluation.
- A streaming web dashboard for live investigation review.
- An Argus MCP server (`argus mcp`) so other SOC copilots can call
  high-level investigation tools directly.
- A packaged Splunk custom alert action so a saved search can trigger Argus as
  part of an existing analyst workflow.

## Why This Stands Out

Argus is not a chat UI over logs. The important differentiators are:

- It writes its own SPL through the Splunk MCP Server instead of following a
  fixed query tree.
- It makes grounded, auditable claims instead of free-form security summaries.
- It is reusable as infrastructure: a Splunk alert action on one side and an
  analyst-grade MCP server on the other.
- It does not stop at triage. It can contain the threat and install the
  detection that catches the next occurrence.

## Live Proof Completed

The repo and local validation now cover the full story:

- Splunk custom alert action package: `splunk/argus_response/`
- Argus webhook endpoints for Splunk alerts: `POST /api/splunk/alert`,
  `GET /api/splunk/alert/{job_id}`, `GET /api/splunk/alerts`
- Argus MCP server for external hosts: `uv run argus mcp`
- Detection dry-run before deployment and on-demand detection execution:
  `uv run argus detections --run --earliest 0`
- Dashboard SOC proof tab for alert jobs and detection proof
- Evaluation harness over 6 curated BOTS v3 scenarios

Live-fire validation against a local Splunk instance produced:

- Case: `ARGUS-SPLUNK-8CECF595`
- Detection: `Argus - Auto: AWS IAM API abuse by web_admin source IP`
- Detection proof: 1 live match on BOTS data for `139.198.18.205` /
  `web_admin`

## Challenges We Faced

One of the biggest debugging wins was discovering that a failing benchmark was
wrong, not the agent. Our AWS scenario recall was stuck at 0.5 because a
ground-truth indicator had been mislabeled as malicious when it was actually
Splunk's own benign AWS collection account. Fixing the metric instead of
forcing the agent toward a false positive became a core project principle.

Another hard problem was extracting decisive evidence from raw XML-heavy Sysmon
data in BOTS v3. We had to teach the agent better extraction tradecraft and add
confidence-gated continuation so it could finish the pivot when the first pass
was close but not decisive.

We also had to handle real integration friction: MCP tokens only work when they
are minted with `audience=mcp`, and the web stream path required exact SSE
framing plus disabled Next.js compression before events would render reliably.

## What We Learned

- Grounding is the product in security AI. Without evidence links, the output
  is not trustworthy enough to use.
- A failing metric can indicate a data problem, not an agent problem.
- Benign verdicts need to be treated as first-class successful outcomes or the
  system becomes biased toward over-calling.
- Strong constraints improve trust. Keeping investigation MCP-native and
  read-only while gating writes makes the autonomy safer and easier to defend.

Measured over an 18-run multi-sample evaluation, Argus reached verdict accuracy
1.0, grounding precision about 0.99, and 0 hallucinated MITRE ATT&CK technique
ids on the curated benchmark.

## What's Next

- Move from exact-match case recall to semantic recall.
- Expand the detection replay story for even cleaner demo evidence.
- Calibrate risk-score weights against labeled incident-priority data.

## Built With

`python`, `typescript`, `anthropic-claude`, `claude-sonnet-4.6`,
`model-context-protocol`, `splunk`, `splunk-mcp-server`, `spl`, `aws-bedrock`,
`boto3`, `fastapi`, `server-sent-events`, `sse-starlette`, `uvicorn`,
`pydantic`, `typer`, `next.js`, `react`, `tailwindcss`, `mitre-att&ck`,
`botsv3`, `splunk-kv-store`, `splunk-rest-api`, `json-rpc`, `ip-api`,
`abuseipdb`, `virustotal`, `slack-webhook`, `jira-rest-api`, `uv`, `ruff`,
`pytest`
