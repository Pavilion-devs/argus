# Argus — Autonomous SOC Investigation Agent

> An AI agent that autonomously investigates security alerts end-to-end on the
> Splunk platform — planning, running its own SPL through the **Splunk MCP Server**,
> pivoting across real data, enriching indicators with live threat intel, mapping to
> MITRE ATT&CK, reaching a **grounded** verdict, and **executing real containment**.
> Every conclusion links to the exact SPL it ran and the exact events it saw.

Built for the **Splunk Agentic Ops Hackathon** — Security track.

---

## Quick Path

If you want the shortest path through the project:

```bash
cp .env.example .env
uv sync
uv run argus check
uv run argus investigate "Investigate suspicious AWS activity in botsv3"
uv run argus detections --run --earliest 0
```

For the web UI:

```bash
uv run argus serve --port 8010
cd web
npm install
npm run dev
```

Then open `http://127.0.0.1:3000/dashboard`.

For the Splunk-native demo path:

- Saved search -> custom alert action -> Argus webhook: [`docs/SPLUNK_ALERT_ACTION.md`](docs/SPLUNK_ALERT_ACTION.md)
- Detection dry-run + on-demand proof: [`docs/DETECTION_PROOF.md`](docs/DETECTION_PROOF.md)
- Benchmark and rigor: [`EVALUATION.md`](EVALUATION.md)
- Submission narrative: [`submission.md`](submission.md)

## Why It Stands Out

Argus is strong for the Security track and the Splunk MCP bonus story because it
does three things together:

- **It investigates autonomously through Splunk MCP.** Argus writes its own SPL
  through the Splunk MCP Server instead of following a fixed query tree.
- **It is reusable, not just a demo app.** Argus can sit behind a packaged
  Splunk custom alert action, and it can also expose its own MCP tools for
  other SOC copilots or analyst applications.
- **It leaves the SOC better than it found it.** After a confirmed true
  positive, Argus can contain the threat and install the detection that catches
  the recurrence.

## What Is Real

This repo is not limited to mocked investigation output. The core paths are
implemented and exercised end to end:

- **Investigation reads** go through the **Splunk MCP Server**.
- **Response writes** go to Splunk KV store and scheduled searches through the
  authenticated REST API.
- **Splunk integration** is packaged in [`splunk/argus_response/`](splunk/argus_response/),
  including a custom alert action and demo saved search.
- **Reusable MCP integration** is available through `uv run argus mcp`.
- **Detection proof** is available through the CLI, API, and dashboard **SOC proof**
  tab, so Argus-authored detections can be executed on demand against live data.

## Why Argus

A Tier-1 analyst spends 30–60 minutes manually pivoting across Splunk to triage one
notable. Argus does the same investigation autonomously in minutes, never skips a
pivot, and **proves every claim** with the SPL and events behind it — then it can
contain the threat.

## What it does

- **Autonomous investigation** — a real plan → act → observe → re-plan loop. Claude
  dynamically writes SPL, runs it via the MCP server, reads the results, and decides
  the next query. No hardcoded query paths.
- **Explicit hypothesis ledger** — the agent declares its leading theories up front and
  marks each **confirmed/refuted** as evidence lands, so the reasoning is auditable and
  it tests alternatives instead of confirming the first guess.
- **Institutional memory** — before and during every investigation Argus recalls its own
  past cases and active blocklist (`recall_memory`): a repeat-offender indicator surfaces
  its prior verdict instantly, the way a veteran analyst would remember it.
- **Grounded incident report** — verdict, severity, confidence, attack timeline,
  affected entities, IOCs, and recommended actions — each timeline step linked to the
  `tool_use` query that evidences it.
- **Validated MITRE ATT&CK + kill-chain** — every technique id is checked against a
  pinned, real ATT&CK Enterprise catalog (v19.1, 858 techniques); hallucinated ids are
  dropped, and the incident's tactics render as an ordered kill-chain.
- **Composite risk score (0–100)** — a defensible, explainable score from verdict,
  confidence, severity, kill-chain breadth, live threat-intel, and case-memory history —
  for real triage/prioritization, not just a severity label.
- **Multi-agent mode** (`--multi`) — four specialists (auth, network, endpoint,
  threat-intel) investigate concurrently and a synthesizer correlates them into one
  attack narrative.
- **Real threat-intel enrichment** — IP/domain/hash reputation via ip-api (no key),
  AbuseIPDB and VirusTotal (if keys provided).
- **Real containment** (`--respond`) — writes offending indicators to a Splunk
  KV-store blocklist that a **correlation search enforces against live data**, records
  a case, and (if configured) opens Slack/Jira tickets — with a human-approval gate
  (or `--auto`).
- **Self-hardening loop (detection-as-code)** — after a confirmed true positive Argus
  writes a new read-only SPL **detection** for the attack pattern and **installs it as a
  real scheduled Splunk correlation search**, so the SOC auto-alerts if it recurs. Argus
  doesn't just close the incident — it leaves behind the detection that catches the next one.
- **Evaluation harness** (`argus eval`) — runs Argus against 6 curated BOTS v3 scenarios
  (4 real attacks: AWS IAM credential abuse, endpoint malware, S3 public exposure,
  cryptojacking; + 2 benign precision controls) and measures verdict accuracy, indicator
  recall, **grounding precision** (every reported IOC verified to exist in the data), and
  **ATT&CK validity** (invalid technique ids — should be zero). `--repeat K` multi-samples
  each scenario and reports a verdict **pass-rate** (a single run is one noisy draw). Every
  ground-truth indicator is curated from the data as verified-malicious, not just present.
- **Live token-by-token streaming** of the agent's reasoning.
- **Provider-agnostic** — runs on the **Anthropic API** or **AWS Bedrock**.
- **Reusable SOC MCP server** — Argus can also run as its own MCP server
  (`argus mcp`), exposing high-level tools like `argus_investigate_alert`,
  `argus_recall_memory`, and gated response execution so existing SOC copilots
  and MCP hosts can plug it in directly. Argus consumes the Splunk MCP Server
  and publishes an analyst-grade MCP interface on top.

## Architecture

See [`architecture_diagram.md`](architecture_diagram.md). In short: a CLI/agent →
a Claude-powered (single- or multi-agent) orchestrator → the **Splunk MCP Server**
(the only way it reads Splunk) → Splunk Enterprise with the BOTS v3 dataset. Real
containment is written to KV-store collections (via the authenticated REST API) in
the companion `argus_response` app and enforced by a correlation search.

## What To Demo

The strongest demo path right now is:

1. Fire the packaged Splunk alert action into `argus serve`.
2. Show the resulting case in the dashboard's **SOC proof** / **Memory & hardening** views.
3. Show the grounded report and evidence drill-down.
4. Run `uv run argus detections --run --earliest 0` or the dashboard **SOC proof** tab to prove the Argus-authored detection fires on live BOTS data.

## Requirements

- macOS / Linux, [`uv`](https://docs.astral.sh/uv/)
- Splunk Enterprise 9.x/10.x + the **Splunk MCP Server** app (Splunkbase 7931)
- The **BOTS v3** dataset (free, pre-indexed)
- An LLM provider: an Anthropic API key, **or** an AWS Bedrock API key + model access

## Setup

### 1. Splunk + MCP Server + data
```bash
# Install Splunk Enterprise (download from splunk.com), then:
$SPLUNK_HOME/bin/splunk start --accept-license --answer-yes --no-prompt --seed-passwd '<pw>'

# Install the MCP Server app (Splunkbase app 7931), then allow plaintext tokens locally:
$SPLUNK_HOME/bin/splunk install app splunk-mcp-server_*.tgz -auth admin:'<pw>'
printf '[server]\nrequire_encrypted_token = false\n' \
  > $SPLUNK_HOME/etc/apps/Splunk_MCP_Server/local/mcp.conf

# Load BOTS v3 (pre-indexed; no license impact):
curl -L -o botsv3.tgz https://botsdataset.s3.amazonaws.com/botsv3/botsv3_data_set.tgz
tar -xzf botsv3.tgz -C $SPLUNK_HOME/etc/apps/

# Install the Argus response app (this repo):
cp -R splunk/argus_response $SPLUNK_HOME/etc/apps/
$SPLUNK_HOME/bin/splunk restart
```

The companion app also includes a custom alert action, **Investigate with Argus**,
and a disabled demo saved search wired to it. With `uv run argus serve` running,
Splunk can send a saved-search alert directly into Argus, which investigates it
through the Splunk MCP Server and records a case back in Splunk. See
[`docs/SPLUNK_ALERT_ACTION.md`](docs/SPLUNK_ALERT_ACTION.md).

Argus-authored detections are dry-run through the Splunk MCP Server before they
are saved, and can be executed on demand for proof of efficacy. See
[`docs/DETECTION_PROOF.md`](docs/DETECTION_PROOF.md).

### 2. A Splunk token (audience MUST be `mcp`)
```bash
curl -sk -u admin:'<pw>' -X POST \
  https://localhost:8089/services/admin/token-auth/tokens_auth -d disabled=false
curl -sk -u admin:'<pw>' -X POST https://localhost:8089/services/authorization/tokens \
  --data-urlencode name=admin --data-urlencode audience=mcp -d output_mode=json
```

### 3. Configure and install Argus
```bash
cp .env.example .env     # set SPLUNK_TOKEN + provider creds (see below)
uv sync
uv run argus check       # lists the MCP tools — confirms the whole chain is live
```

### Provider configuration (.env)
- **Anthropic:** `ARGUS_PROVIDER=anthropic`, `ANTHROPIC_API_KEY=…`
- **AWS Bedrock:** `ARGUS_PROVIDER=bedrock`, `AWS_BEARER_TOKEN_BEDROCK=…`, `AWS_REGION=us-west-2`
- `ARGUS_MODEL=claude-sonnet-4-6` (default)

## Usage

```bash
# Sanity checks
uv run argus check
uv run argus query 'search index=botsv3 | stats count' --earliest 0

# Single-agent investigation (live streaming reasoning + SPL)
uv run argus investigate "Investigate suspicious AWS activity in botsv3"

# Multi-agent specialist team
uv run argus investigate "Investigate the Frothly AWS compromise" --multi

# Investigate AND contain (human-approval gate; add --auto to skip prompts)
uv run argus investigate "Investigate AWS credential abuse" --respond

# Evaluate accuracy on BOTS scenarios
uv run argus eval

# Prove Argus-authored detections execute and match live Splunk data
uv run argus detections --run --earliest 0

# Expose Argus itself as an MCP server (stdio by default)
uv run argus mcp

# Optional HTTP transports for MCP clients that support them
uv run argus mcp --transport streamable-http --host 127.0.0.1 --port 8765
```

## Argus as an MCP server

Argus is both an MCP client and an MCP server:

```text
MCP host / SOC copilot
  -> Argus MCP tools
  -> Argus autonomous investigator
  -> Splunk MCP Server
  -> Splunk Enterprise
```

Available Argus MCP tools:

- `argus_health` — configuration and Splunk MCP reachability.
- `argus_investigate_alert` — runs a full grounded investigation and returns the
  report plus evidence metadata.
- `argus_recall_memory` — searches Argus case memory and blocklist.
- `argus_list_cases`, `argus_list_blocklist`, `argus_list_detections` — expose
  the SOC memory and self-hardening artifacts.
- `argus_execute_response` — executes response actions from a completed report.
  This tool requires the exact confirmation string `EXECUTE_ARGUS_RESPONSE`
  because it can write to Splunk KV store and deploy detections.

## Project layout

```
src/argus/
  mcp_client.py   # async JSON-RPC client for the Splunk MCP Server
  agent.py        # single-agent + multi-agent loops, hypothesis ledger, response phase
  connectors.py   # ResponseEngine: blocklist/cases, recall, enforcement, detection-as-code, Slack/Jira
  enrich.py       # deterministic post-processing: MITRE validation + risk score + memory + kill-chain
  mitre.py        # pinned MITRE ATT&CK Enterprise catalog (technique validation)
  threatintel.py  # real IP/domain/hash reputation enrichment
  llm.py          # provider-agnostic client (Anthropic API or AWS Bedrock via boto3)
  models.py       # the structured incident report
  prompts.py      # investigator / specialist / synthesis / response prompts
  eval.py         # evaluation harness (verdict / recall / grounding precision / ATT&CK validity)
  mcp_server.py   # Argus-as-MCP tools for external SOC copilots / MCP hosts
  cli.py          # check | query | tool | investigate | cases | detections | monitor | serve | mcp | eval
data/mitre/techniques.json   # pinned ATT&CK v19.1 catalog (committed, reproducible)
splunk/argus_response/       # companion Splunk app (KV collections + correlation search)
```

## Status

🚧 Active build for the hackathon. The engine is complete and verified end-to-end:
single- + multi-agent investigation, hypothesis ledger, institutional memory (case
recall), grounded reports, validated MITRE ATT&CK + kill-chain, composite risk scoring,
real containment, the self-hardening detection-as-code loop, threat-intel, streaming,
and the eval harness. A **streaming web UI** is now in [`web/`](web/) — a polished
Next.js landing page + a live investigation dashboard that streams a real Argus
investigation (reasoning, SPL, hypotheses, recall, grounded report, response) over SSE
via a thin FastAPI bridge (`argus serve`). See [`web/README.md`](web/README.md) and
[`PROJECT.md`](PROJECT.md).

**Evaluation & engineering rigor:** [`EVALUATION.md`](EVALUATION.md) documents the
6-scenario BOTS v3 benchmark, the measured results (verdict accuracy 1.0, grounding 0.99,
0 hallucinated ATT&CK ids over 18 runs), and the real bugs the harness caught and we
root-caused — including a poisoned ground-truth indicator that turned out to be Splunk's
own data collector. Open limitations: [`issues.md`](issues.md); resolved problems with
evidence: [`problems.md`](problems.md).

## License

MIT — see [`LICENSE`](LICENSE).
