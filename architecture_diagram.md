# Argus — Architecture Diagram

> Required by the hackathon rules at repo root. Shows how Argus interacts with
> Splunk, how the AI agents are integrated, and the data flow between components.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  CLI · WEB UI · ARGUS MCP SERVER (argus mcp)   investigate [--multi] [--respond]│
│  live streaming UI + reusable MCP tools for external SOC copilots/apps          │
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
│        tools: hypothesis ledger · recall_memory (case memory) · enrich_indicator │
│   Multi-agent (--multi):  ┌ auth ┐ ┌ network ┐ ┌ endpoint ┐ ┌ intel ┐           │
│                           └──────┴─┴─────────┴─┴──────────┴─┴──────┘             │
│                           run concurrently → synthesizer → one report            │
│                                                                                  │
│   Grounding store: every claim → (exact SPL, exact events)                       │
│   Deterministic enrichment (enrich.py): MITRE ATT&CK validation (mitre.py) ·     │
│        kill-chain · composite risk score · case-memory linkage                   │
│   Structured incident report: verdict · severity · risk · timeline · kill-chain  │
│   Eval harness: verdict accuracy · recall · grounding precision · ATT&CK validity│
│   Argus MCP tools: investigate_alert · recall_memory · cases · detections ·      │
│        gated response execution                                                  │
└───────┬───────────────────────────────────────┬───────────────┬─────────────────┘
        │ reads Splunk ONLY via MCP               │ enrich        │ contain + harden
        │                                         ▼               ▼
┌───────▼────────────────────────┐   ┌─────────────────────────┐  ┌──────────────────┐
│  SPLUNK MCP SERVER              │   │  THREAT INTEL           │  │  RESPONSE ENGINE  │
│  (Splunkbase 7931, :8089/       │   │  ip-api · AbuseIPDB ·   │  │  (connectors.py)  │
│   services/mcp, bearer aud=mcp) │   │  VirusTotal             │  │                   │
│  tools: splunk_run_query,       │   │  (enrich_indicator tool)│  │  KV blocklist +   │
│  splunk_get_indexes/metadata…   │   └─────────────────────────┘  │  case store +     │
└───────┬────────────────────────┘                                 │  DETECTION-AS-CODE│
        │ JSON-RPC                                                  │  via Splunk REST  │
┌───────▼─────────────────────────────────────────────┐            │  Slack · Jira     │
│  SPLUNK ENTERPRISE  (BOTS v3 · 2M+ events)           │◀───────────┤  (real, gated)    │
│  argus_response app: KV collections + lookups +      │  enforced   └──────────────────┘
│  "Threat Blocklist Enforcement" correlation search   │  by search       │
│  + Argus-authored scheduled detections  ◀────────────────────────────────┘
│                                                       │  installs new detection
└──────────────────────────────────────────────────────┘
```

## Data flow (one investigation)

1. An alert (or NL request) enters the orchestrator from the CLI, web UI, or
   **Argus's own MCP server** (`argus mcp`). Argus **recalls its case memory**
   for any indicator already named in the alert (`recall_memory`).
2. **Investigation reads Splunk only through the MCP Server**: the agent generates SPL,
   runs `splunk_run_query`, reads real results, and pivots — looping until confident. It
   maintains an explicit **hypothesis ledger** (confirm/refute), re-checks **case memory**
   on each new indicator, and enriches external IOCs via real **threat-intel**. In
   `--multi`, four specialist sub-agents do this concurrently for their domain.
3. A synthesizer produces the **grounded** incident report — each timeline step linked to
   the `tool_use` query that evidences it.
4. **Deterministic enrichment** (`enrich.py`, no model): every MITRE technique id is
   validated against the pinned ATT&CK catalog (`mitre.py`) and rendered as an ordered
   kill-chain; a composite **risk score (0–100)** is computed from verdict, confidence,
   severity, kill-chain breadth, threat-intel and case-memory history.
5. With `--respond`, the **Response Engine** executes real, gated actions: writes offending
   indicators to a Splunk KV-store blocklist (REST, enforced by a **correlation search**),
   records a case, posts Slack/Jira — and for a confirmed true positive **deploys a new
   scheduled detection** (detection-as-code) so Splunk auto-alerts on recurrence. Detection
   SPL is dry-run through MCP before saving, and Argus can run deployed detections on
   demand (`argus detections --run`) to prove they fire.
6. The **eval harness** scores accuracy: verdict accuracy, indicator recall, grounding
   precision (every reported IOC verified to exist in the data), and ATT&CK validity.

> Investigation is 100% MCP-native. Containment writes go via the authenticated Splunk
> KV-store REST API (the Splunk MCP server's safe-SPL allowlist is intentionally
> read-only). Argus can also publish its own higher-level MCP tools so an existing
> SOC copilot can call the full investigation workflow instead of integrating a
> bespoke API.
```
