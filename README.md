# Argus — Autonomous SOC Investigation Agent

> An AI agent that autonomously investigates security alerts end-to-end on the
> Splunk platform — planning, running its own SPL through the **Splunk MCP Server**,
> pivoting across real data, mapping to MITRE ATT&CK, reaching a grounded verdict,
> and executing a real response. Every conclusion links to the exact SPL it ran and
> the exact events it saw.

Built for the **Splunk Agentic Ops Hackathon** — Security track.

---

## Why Argus

A Tier-1 analyst spends 30–60 minutes manually pivoting across Splunk to triage a
single notable. Argus does the same investigation autonomously in minutes, never
skips a pivot, and **proves every claim** with the SPL and events behind it.

## Architecture

See [`architecture_diagram.md`](architecture_diagram.md). In short: a React UI →
a Claude-powered multi-agent orchestrator → the **Splunk MCP Server** (the only way
it touches Splunk) → Splunk Enterprise with the BOTS v3 dataset.

## Requirements

- macOS / Linux, [`uv`](https://docs.astral.sh/uv/), Node 20+
- Docker runtime (on Apple Silicon: `colima`)
- An Anthropic API key
- Splunk MCP Server app (Splunkbase 7931) + BOTS v3 dataset

## Quickstart

```bash
# 1. Bring up Splunk (Docker)
brew install colima docker docker-compose
colima start --cpu 4 --memory 8 --disk 60
cp .env.example .env            # then edit secrets
docker compose up -d            # Splunk Web -> http://localhost:8000 (admin / SPLUNK_PASSWORD)

# 2. Install the MCP Server app + BOTS v3 into Splunk
#    (drop the .tgz files into ./splunk/apps first — see scripts/setup_splunk.sh)
./scripts/setup_splunk.sh

# 3. Create a Splunk auth token (Settings > Tokens) and put it in .env as SPLUNK_TOKEN

# 4. Install + run Argus
uv sync
uv run argus investigate "investigate the brute-force activity on po-1556"
# or launch the full UI:
uv run argus serve            # backend
cd web && npm install && npm run dev   # UI -> http://localhost:3000
```

## Status

🚧 Active build. See [`PROJECT.md`](PROJECT.md) for the full plan and phase tracker.

## License

MIT — see [`LICENSE`](LICENSE).
