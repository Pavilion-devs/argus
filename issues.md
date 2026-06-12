# Argus — Issues & Limitations Backlog

An honest catalog of known issues, limitations, and rough edges as of **2026-06-10**,
after adding the deeper-reasoning, institutional-memory, and self-hardening upgrades.
The two prioritized problems live in [`problems.md`](problems.md); everything else is here.

Severity: 🔴 high · 🟠 medium · 🟢 low/cosmetic · 🔵 not-yet-built (known gap)

---

## Investigation quality

- ✅ **AWS scenario recall stuck at 0.5 — RESOLVED (root cause: poisoned ground truth, not the
  agent).** Traced the miss of `34.215.24.225` through the pipeline: in the data it is
  `arn:aws:iam::622676721278:user/splunk_access` — the **Splunk Add-on for AWS's own
  data-collection account** (userAgent `Boto3/… Linux-aws`, 4040 benign read calls, **zero**
  malicious actions, never touches `web_admin`). It was wrongly listed as an "attacker IP," so the
  eval was docking the agent for **correctly not flagging benign infrastructure**. Fixed by
  correcting the ground truth to the data-verified core IOCs (`web_admin` — the compromised
  account — and `139.198.18.205` — the primary attacker IP). Lesson: "fixing the symptom" (nudging
  the agent to surface `34.215.24.225`) would have *trained the over-calling we just removed.*
- ✅ **Endpoint verdict variance — RESOLVED** (see [`problems.md`](problems.md) P2): Sysmon-XML
  extraction tradecraft + a confidence-gated continuation. Verified 3/3 true_positive.
- ✅ **Over-calling benign API enumeration as "recon" — RESOLVED** (surfaced by the expanded
  benchmark). A new precision control (`benign_aws_recon_control` — the same `splunk_access` data
  collector, alerted as "possible recon") caught the agent calling it `true_positive` ~1/2 the
  time. Root cause: it confirmed "enumeration = recon" without identifying the principal. Fixed with
  general tradecraft (prompts.py): before judging enumeration/scanning, identify the account +
  userAgent and check for denied/abusive actions — a service account with an SDK/CLI userAgent doing
  read-only calls with no denials is benign automation, not an attacker. Now 3/3 false_positive,
  and ~40% fewer queries (it rules benign faster). Real attacks stay flagged (they ride a
  compromised identity / show denied actions).
- 🟢 **Confidence-gated continuation adds latency to inconclusive runs.** When the first verdict
  is a low-confidence `inconclusive`, Argus runs one extra ~4-turn pass before finalizing. Only
  fires on hedged verdicts (confident ones finalize immediately), but it does add a minute or two
  to those cases. Acceptable trade for not under-calling.
- 🟢 **Hypothesis ledger can add cognitive load.** On a tight turn budget the
  `track_hypothesis` / `recall_memory` calls cost reasoning steps; an unconfirmed
  contributor to shallower investigations on some runs. Mitigated by the agent batching
  tool calls in parallel, but worth watching.

## Response / detection-as-code

- 🟠 **Detection targets the wrong index unless nudged.** The agent first wrote a deployed
  detection against `index=aws` (a production generalization) rather than `index=botsv3`,
  so it would not fire on the BOTS replay. A prompt nudge now asks it to target the
  investigated index, but it's soft — not guaranteed. Consider passing the index/sourcetypes
  used during the investigation into the deploy step explicitly.
- 🟢 **Lingering `index=aws` test detection in Splunk.** From the first verified run, a
  detection named `Argus - Auto: AWS IAM multi-region RunInstances burst by single user`
  is installed but won't fire on `botsv3`. Real artifact; clean up or leave as evidence.
- 🟢 **Deployed SPL is validated read-only but not "does it run".** `_is_read_only_spl`
  blocks data-modifying commands, but we don't dry-run the detection to confirm it parses
  and returns plausibly. Could add a one-shot MCP execution as a smoke test before saving.
- 🟢 **Detection windows can double-alert.** Default schedule is a 65-min rolling window
  every 10 min → overlapping windows, no throttle/dedup. Fine for catching bursts; add
  `alert.suppress` if noise matters.
- 🟢 **`deploy_detection` 409→update path is untested.** Only the 201-create path was
  exercised live; the "already exists → edit in place" branch is unverified.

## Institutional memory

- 🟠 **Recall matching is exact-only.** `ResponseEngine.recall()` matches indicators by
  exact (case-insensitive) value — deliberately, to avoid false overlaps. It therefore
  misses CIDR membership, domain/subdomain relationships, and hash-case variants. The
  planned upgrade (semantic recall over case summaries via Bedrock Titan embeddings) is
  **not built**; current recall is deterministic string overlap only.
- 🟢 **Memory is state-dependent.** Recall only finds what's in the KV store; if the
  blocklist/case collections are cleared, prior-knowledge signal disappears (observed: the
  blocklist was empty until a `--respond` run repopulated it). Expected, but means demo
  state matters.

## Risk scoring

- 🟢 **Weights are hand-tuned heuristics.** The composite 0–100 score
  (verdict/severity/confidence/kill-chain/threat-intel/memory) is explainable and
  defensible but **not calibrated** against labeled incident priority. The band cutoffs
  (35/60/80) are judgment calls. No validation that the score correlates with real triage
  order.

## MITRE ATT&CK

- 🟢 **Pinned to ATT&CK v19.1, which uses "Stealth" / "Defense Impairment".** This is the
  current, authoritative naming (v18 renamed "Defense Evasion"), so it's correct — but it
  may read as unfamiliar/odd to an analyst or judge expecting the classic 14-tactic matrix
  in a fast demo. Decision was to use current/authoritative + show the version. Revisit only
  if it confuses the demo audience.

## Evaluation harness

- ✅ **Single-sample per scenario — RESOLVED** (see [`problems.md`](problems.md) P1): added
  `argus eval --repeat K` reporting per-scenario verdict pass-rates + distributions.
- ✅ **`results.json` now reflects a multi-sample run** (`--repeat 3`, 18 investigations:
  verdict_accuracy 1.0, grounding 0.987, 0 invalid MITRE). It carries a `per_scenario` pass-rate
  block. Note this is 3 samples/scenario — a strong signal, not a guarantee of 100% forever; run
  a higher `--repeat` for tighter confidence intervals.
- 🟠 **Ground truth was existence-validated, not malice-validated (systemic).** `validate_ground_truth`
  only confirms an indicator is *present* in `botsv3` — which let a benign IP (`34.215.24.225`,
  splunk_access infra) masquerade as an attacker IOC and silently corrupt the recall metric (see the
  resolved item under "Investigation quality"). Mitigated for now by curating + documenting each
  indicator's malice rationale in `SCENARIOS` (eval.py). A stronger guard would surface each
  indicator's data context (associated account / denied-action footprint) at validation time so a
  benign one is obvious — deferred (heuristic, easy to get wrong; manual curation is the reliable fix).
- 🟢 **Indicator recall** now measures the data-verified core IOCs. `endpoint_malware` recall can
  still vary run-to-run even when the verdict is correct (IOC enumeration completeness); verdict +
  grounding are the solid metrics.
- 🟢 **`recall_memory` not counted in `n_queries`.** By design (it's a memory check, not a
  data query), but it means the eval "Q" column slightly understates total tool calls.
- 🟢 **Eval default `max_turns` raised 8 → 12.** More representative of real `investigate`
  usage, but slower (~3–4 min/scenario). Intentional.

## Infra / ops

- 🟢 **Threat-intel rate limits.** `ip-api.com` is free/unkeyed with rate limits; a heavy
  investigation enriching many IPs can get throttled (handled gracefully as "unavailable").
  AbuseIPDB / VirusTotal require keys that aren't set, so those sources report unavailable.
- 🟢 **Bedrock streaming is real but single-region.** Works (`us-west-2`); no failover or
  adaptive throttling/backoff beyond the SDK defaults. Heavy `--multi` concurrency (4
  specialists + synthesis) could approach account limits.

## Productization / integration

- ✅ **Streaming web UI — BUILT.** The Next.js dashboard in `web/` streams real
  investigation events from `argus serve`: reasoning, SPL, hypotheses, recall,
  grounded report, evidence drill-down, response approvals, memory, and eval results.
- ✅ **Argus MCP server — BUILT.** `argus mcp` exposes Argus as reusable MCP tools
  (`argus_investigate_alert`, memory/case/detection listing, and gated response
  execution), so existing SOC copilots can call the full workflow instead of
  integrating a bespoke API.

## Not yet built (known gaps)

- 🔵 **Semantic case recall (embeddings).** See "Institutional memory" above.
- 🔵 **Detection efficacy proof.** We deploy detections but don't yet demonstrate one
  *firing* on replayed data end-to-end (would be a strong demo beat if the detection targets
  `index=botsv3`).
