# Argus — Architecture Diagram

> Required by the hackathon rules at repo root. Shows how Argus interacts with
> Splunk, how the AI agents are integrated, and the data flow between components.
> (A rendered `.png` version will accompany this before submission.)

```
┌───────────────────────────────────────────────────────────────────────┐
│  WEB UI  (React)                                                        │
│  • streaming agent reasoning trace   • live SPL + results               │
│  • attack timeline + entity graph    • evidence drill-down (claim→SPL)  │
│  • case management   • response approval / auto-execute toggle          │
└───────────────────────────────┬───────────────────────────────────────┘
                                │  WebSocket / SSE (streaming)
┌───────────────────────────────▼───────────────────────────────────────┐
│  ARGUS ORCHESTRATOR  (Python / FastAPI · Claude API = reasoning brain)  │
│                                                                         │
│   Lead Investigator agent:  plan → act → observe → reflect → re-plan    │
│        │                                                                │
│        ├── Auth sub-agent ─────┐                                        │
│        ├── Network sub-agent ──┤  each runs its own MCP-driven SPL      │
│        ├── Endpoint sub-agent ─┤                                        │
│        └── Threat-Intel agent ─┘  (+ real external reputation APIs)     │
│        │                                                                │
│   Synthesizer → grounded incident report                               │
│   Grounding store:  claim → (exact SPL, exact events) provenance        │
│   Response engine:  pluggable REAL connectors (see below)              │
│   Case memory:      persistent investigation store (SQLite/Postgres)    │
└───────────────────────────────┬───────────────────────────────────────┘
                                │  MCP protocol ONLY  (Bearer token, TLS)
┌───────────────────────────────▼───────────────────────────────────────┐
│  SPLUNK MCP SERVER   (Splunkbase app 7931 · :8089/services/mcp)         │
│  tools: generate_spl · run_splunk_query · get_indexes · get_index_info  │
│         · get_saved_searches · get_splunk_info · (saia_* if installed)   │
└───────────────────────────────┬───────────────────────────────────────┘
                                │
┌───────────────────────────────▼───────────────────────────────────────┐
│  SPLUNK ENTERPRISE   (Docker · BOTS v3 dataset ingested)                │
│  + KV-store blocklist · correlation searches · notable events          │
└───────────────────────────────────────────────────────────────────────┘

      Real external integrations (response + enrichment):
      Threat-intel reputation APIs · Slack webhook · Jira / ticketing
```

## Data flow (one investigation)

1. An alert (real Splunk notable / saved-search result, or NL request) enters the orchestrator.
2. The Lead Investigator plans hypotheses and dispatches specialist sub-agents.
3. Each sub-agent calls the **Splunk MCP Server** to generate + run SPL, reads real
   results, and decides its next query (pivot). All Splunk access is via MCP.
4. Threat-Intel agent enriches observed IOCs via real external reputation APIs.
5. The Synthesizer merges findings into a grounded report — every claim is linked to
   the exact SPL executed and the exact events returned (stored in the grounding store).
6. The Response engine executes a real action (KV-store blocklist enforced by a real
   correlation search · notable creation · Slack/Jira ticket), gated by approval or auto-execute.
7. The full case (queries, evidence, verdict, actions) is persisted to case memory.
```
