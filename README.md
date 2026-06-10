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
- **Grounded incident report** — verdict, severity, confidence, attack timeline,
  MITRE ATT&CK techniques, affected entities, IOCs, and recommended actions — each
  timeline step linked to the `tool_use` query that evidences it.
- **Multi-agent mode** (`--multi`) — four specialists (auth, network, endpoint,
  threat-intel) investigate concurrently and a synthesizer correlates them into one
  attack narrative.
- **Real threat-intel enrichment** — IP/domain/hash reputation via ip-api (no key),
  AbuseIPDB and VirusTotal (if keys provided).
- **Real containment** (`--respond`) — writes offending indicators to a Splunk
  KV-store blocklist that a **correlation search enforces against live data**, records
  a case, and (if configured) opens Slack/Jira tickets — with a human-approval gate
  (or `--auto`).
- **Evaluation harness** (`argus eval`) — measures verdict accuracy, indicator recall,
  and **grounding precision** (every reported IOC is verified to exist in the data).
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
  agent.py        # single-agent + multi-agent investigation loops, response phase
  connectors.py   # ResponseEngine: KV-store blocklist/cases, enforcement, Slack/Jira
  threatintel.py  # real IP/domain/hash reputation enrichment
  llm.py          # provider-agnostic client (Anthropic API or AWS Bedrock via boto3)
  models.py       # the structured incident report
  prompts.py      # investigator / specialist / synthesis / response prompts
  eval.py         # evaluation harness (verdict / recall / grounding precision)
  cli.py          # check | query | tool | investigate | eval
splunk/argus_response/   # companion Splunk app (KV collections + correlation search)
```

## Status

🚧 Active build for the hackathon. Engine (single- + multi-agent, grounded reports,
real containment, threat-intel, streaming, eval) is complete and verified end-to-end.
A streaming web UI is next. See [`PROJECT.md`](PROJECT.md) for the full plan.

## License

MIT — see [`LICENSE`](LICENSE).
