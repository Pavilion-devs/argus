# Argus — Architecture Diagram

> Required by the hackathon rules at repo root. Shows how Argus interacts with
> Splunk, how the AI agents are integrated, and the data flow between components.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  CLI / (web UI next)   check · query · investigate [--multi] [--respond] · eval │
│  live token-by-token streaming of agent reasoning + SPL + results              │
└───────────────────────────────┬────────────────────────────────────────────────┘
                                │
┌───────────────────────────────▼────────────────────────────────────────────────┐
│  ARGUS ORCHESTRATOR  (Python · async)                                            │
│                                                                                  │
│   LLM provider abstraction (llm.py):                                             │
│        Anthropic API  ──or──  AWS Bedrock (boto3 + Bedrock API key)              │
│        model: claude-sonnet-4-6   · adaptive thinking · effort · streaming       │
│                                                                                  │
│   Single-agent:  plan → act → observe → re-plan   (agent.py)                     │
│   Multi-agent (--multi):  ┌ auth ┐ ┌ network ┐ ┌ endpoint ┐ ┌ intel ┐           │
│                           └──────┴─┴─────────┴─┴──────────┴─┴──────┘             │
│                           run concurrently → synthesizer → one report            │
│                                                                                  │
│   Grounding store: every claim → (exact SPL, exact events)                       │
│   Structured incident report: verdict · severity · timeline · MITRE · IOCs       │
│   Eval harness: verdict accuracy · indicator recall · grounding precision        │
└───────┬─────────────────────────────────────────────┬───────────────┬──────────┘
        │ reads Splunk ONLY via MCP                     │ enrich        │ contain
        │                                               ▼               ▼
┌───────▼────────────────────────┐   ┌─────────────────────────┐  ┌────────────────┐
│  SPLUNK MCP SERVER              │   │  THREAT INTEL           │  │  RESPONSE       │
│  (Splunkbase 7931, :8089/       │   │  ip-api · AbuseIPDB ·   │  │  ENGINE         │
│   services/mcp, bearer aud=mcp) │   │  VirusTotal             │  │  (connectors)   │
│  tools: splunk_run_query,       │   │  (enrich_indicator tool)│  │                 │
│  splunk_get_indexes/metadata…   │   └─────────────────────────┘  │  KV blocklist + │
└───────┬────────────────────────┘                                 │  case store via │
        │ JSON-RPC                                                  │  Splunk REST    │
┌───────▼─────────────────────────────────────────────┐            │  Slack · Jira   │
│  SPLUNK ENTERPRISE  (BOTS v3 · 2M+ events)           │◀───────────┤  (real, gated)  │
│  argus_response app: KV collections + lookups +      │  enforced   └────────────────┘
│  "Threat Blocklist Enforcement" correlation search   │  by search
└──────────────────────────────────────────────────────┘
```

## Data flow (one investigation)

1. An alert (or NL request) enters the orchestrator.
2. **Investigation reads Splunk only through the MCP Server**: the agent generates SPL,
   runs `splunk_run_query`, reads real results, and pivots — looping until confident.
   In `--multi`, four specialist sub-agents do this concurrently for their domain.
3. The **threat-intel** tool enriches external IOCs via real reputation services.
4. A synthesizer produces the **grounded** incident report — each timeline step linked
   to the `tool_use` query that evidences it.
5. With `--respond`, the **Response Engine** executes real containment: writes offending
   indicators to a Splunk KV-store blocklist (REST), records a case, and posts Slack/Jira
   tickets — gated by human approval (or `--auto`). A **correlation search** then enforces
   the blocklist against live Splunk data.
6. The **eval harness** scores accuracy, including verifying every reported IOC exists in
   the data (grounding precision).

> Investigation is 100% MCP-native. Containment writes go via the authenticated Splunk
> KV-store REST API (the MCP server's safe-SPL allowlist is intentionally read-only).
```
