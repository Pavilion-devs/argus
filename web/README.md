# Argus Dashboard

Next.js dashboard for the Argus autonomous SOC investigation agent.

The dashboard connects to the Python SSE bridge exposed by `uv run argus serve`.
It does not simulate investigations: every run streams the same structured events
emitted by the CLI engine, including reasoning, MCP-backed SPL calls, hypothesis
updates, memory recall, the grounded report, and gated response actions.

## Run

From the repository root:

```bash
uv run argus serve
cd web
npm install
npm run dev
```

Then open `http://localhost:3000/dashboard`.

## Structure

```text
app/dashboard/page.tsx              Live investigation workspace
components/dashboard/ReasoningStream.tsx
components/dashboard/SplFeed.tsx
components/dashboard/HypothesisLedger.tsx
components/dashboard/ReportPanel.tsx
components/dashboard/EvidenceDrawer.tsx
components/dashboard/ResponsePanel.tsx
components/dashboard/MemoryTab.tsx
components/dashboard/EvalPanel.tsx
components/dashboard/ProofPanel.tsx      Alert-action jobs + detection proof
lib/useInvestigation.ts             SSE stream state machine
lib/api.ts                          Read endpoint helpers
```

## Notes

- Next rewrites `/api/*` to the Argus bridge; see `next.config.mjs`.
- The response panel uses a real approval gate. Approving an action lets the
  backend write to Splunk KV store, deploy detections, or call configured
  integrations.
- The evaluation tab reads the committed `eval/results.json` through the bridge.
