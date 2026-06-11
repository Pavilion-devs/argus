# Argus Web UI

A Next.js (App Router · TypeScript · Tailwind) front-end for **Argus** — a polished
landing page plus a **live investigation dashboard** that streams a *real* Argus
investigation as it happens. No mock data: every token, query, hypothesis, recall and
report on screen comes from the actual engine over Server-Sent Events.

## Architecture

```
browser ──(SSE / JSON, same-origin)──▶ Next.js dev server :3000
                                          │  rewrites /api/* ──▶ Argus bridge :8000 (FastAPI)
                                          │                         │ runs Investigator /
                                          │                         │ MultiAgentInvestigator
                                          ▼                         ▼
                                   React dashboard          Splunk MCP + Bedrock (real)
```

- **`src/argus/server.py`** (in the repo root project) is the FastAPI/SSE bridge. It runs
  the engine exactly as the CLI does and forwards each yielded event as an SSE message.
- The browser talks to **same-origin `/api/*`**, which Next rewrites to the bridge — so
  there's no CORS or hardcoded port in the client.

## Run it (two processes)

From the repo root, start the bridge:

```bash
uv run argus serve            # FastAPI on http://127.0.0.1:8000
# (or: .venv/bin/argus serve)
```

Then start the web app:

```bash
cd web
npm install
npm run dev                   # Next.js on http://localhost:3000
```

Open **http://localhost:3000**, click **Launch Console**, pick a preset alert (the AWS
credential-abuse one is the headline demo), choose single- or multi-agent, and **Run**.

If the bridge runs on another host/port, set `ARGUS_API` for the rewrite target:

```bash
ARGUS_API=http://127.0.0.1:9000 npm run dev
```

## What the dashboard shows (all real, streamed)

- **Live reasoning** — token-by-token thinking + analysis; in `--multi`, four specialist
  lanes (auth · network · endpoint · threat-intel) reasoning in parallel.
- **SPL feed** — every `splunk_run_query` the agent fires, with the exact SPL and the raw
  events it returned (expand any row).
- **Hypothesis ledger** — open / confirmed / refuted as evidence lands.
- **Institutional memory** — repeat-offender recall ("already blocked", prior cases) and
  the ↻ confidence-gated continuation moment.
- **Grounded report** — verdict + a 0–100 risk gauge + the ATT&CK kill-chain + validated
  MITRE techniques + affected entities + IOCs + an attack timeline whose steps drill down
  to the exact query + events behind them.
- **Response & containment** — a human-approval modal for each real action (blocklist
  write, detection-as-code deploy, ticket), the recorded case, and execution results.
- **Memory & hardening tab** — the case browser, auto-deployed detections, and the active
  threat blocklist (from the bridge's read endpoints).

## Notes

- A full investigation runs ~3 minutes against live `botsv3` data and ends with a single
  structured-report synthesis call; the dashboard shows a "synthesizing report" state for
  that final step rather than appearing to freeze.
- `next.config.mjs` sets `compress: false` so the dev server does not gzip-buffer the SSE
  stream (compression holds the whole response, breaking incremental delivery).
- Stack: Next 14 · React 18 · Tailwind 3 (theme ported from the design template) ·
  `@iconify/react` (Solar icons) · GSAP (hero) · Geist font.
