# Argus — Autonomous SOC Investigation Agent

> An AI agent that autonomously investigates security alerts end-to-end on the
> Splunk platform — planning, running its own SPL through the **Splunk MCP Server**,
> pivoting across real data, enriching indicators with live threat intel, mapping to
> MITRE ATT&CK, reaching a **grounded** verdict, and **executing real containment**.
> Every conclusion links to the exact SPL it ran and the exact events it saw.

Built for the **Splunk Agentic Ops Hackathon** — Security track.

---

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

## Architecture

See [`architecture_diagram.md`](architecture_diagram.md). In short: a CLI/agent →
a Claude-powered (single- or multi-agent) orchestrator → the **Splunk MCP Server**
(the only way it reads Splunk) → Splunk Enterprise with the BOTS v3 dataset. Real
containment is written to KV-store collections (via the authenticated REST API) in
the companion `argus_response` app and enforced by a correlation search.

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
```

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
  cli.py          # check | query | tool | investigate | cases | detections | monitor | mitre-sync | eval
data/mitre/techniques.json   # pinned ATT&CK v19.1 catalog (committed, reproducible)
splunk/argus_response/       # companion Splunk app (KV collections + correlation search)
```

## Status

🚧 Active build for the hackathon. The engine is complete and verified end-to-end:
single- + multi-agent investigation, hypothesis ledger, institutional memory (case
recall), grounded reports, validated MITRE ATT&CK + kill-chain, composite risk scoring,
real containment, the self-hardening detection-as-code loop, threat-intel, streaming,
and the eval harness. A streaming web UI is next. See [`PROJECT.md`](PROJECT.md).

## License

MIT — see [`LICENSE`](LICENSE).
