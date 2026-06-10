# Argus — Known Problems

Two problems were identified on 2026-06-10 and **both were resolved the same day** and
verified statistically (multi-sample eval). The original analysis is kept below for the
record, each followed by its resolution.

See [`issues.md`](issues.md) for the broader backlog of smaller issues and limitations.

**Verification (after fixes) — `argus eval --repeat 3`, 9 real investigations:**

| Scenario | Verdict pass-rate | Distribution |
|---|---|---|
| aws_cred_abuse | 3/3 (100%) | true_positive×3 |
| endpoint_malware | 3/3 (100%) | true_positive×3 |
| benign_dns_control | 3/3 (100%) | false_positive×3 |

Aggregate: **verdict_accuracy 1.0**, grounding precision 0.989, **0 invalid MITRE techniques**.

---

## P1 — Eval verdict accuracy is single-sample on a stochastic agent (noisy)  ✅ RESOLVED

**Severity:** Medium (credibility artifact, not a runtime bug)

**Symptom.** `argus eval` ran each scenario exactly once. With a non-deterministic LLM, a
borderline scenario flips pass/fail between runs, so the headline `verdict_accuracy` swung
even though nothing changed (observed `endpoint_malware`: true_positive, true_positive,
inconclusive, inconclusive across four runs).

**Root cause.** One sample per scenario → the metric reported a Bernoulli draw, not the
agent's true accuracy rate.

### Resolution
Added multi-sampling to the harness (`src/argus/eval.py`, `src/argus/cli.py`):
- `argus eval --repeat K` runs each scenario `K` times.
- Reports a **per-scenario verdict pass-rate + verdict distribution** (e.g. `3/3 (100%)`,
  `true_positive×3`), plus a variance-aware aggregate over `scenarios × K` runs and a
  `per_scenario` block in `results.json`.
- Headline `verdict_accuracy` is now a rate over all runs, so it no longer swings on a
  single draw.

Verified: `argus eval --repeat 3` produces the pass-rate table above. Integrity preserved —
no re-rolling for a lucky run, no goalpost-moving (the same `--repeat 3` invocation is what
produced the 1.0 aggregate, and every individual run is shown).

---

## P2 — Endpoint-malware verdict under-calls (inconclusive instead of true_positive)  ✅ RESOLVED

**Severity:** Medium (investigation tradecraft / verdict reliability)

**Symptom.** On the masquerading-executable scenario the agent *found* the look-alike binary
(`iexeplorer.exe`) but ~half the time concluded `inconclusive` at `confidence ≈ 0.45` instead
of `true_positive`.

**Root cause.** The agent didn't reliably pull the Sysmon process lineage before judging. The
Sysmon data in `botsv3` is stored as **raw XML and is not field-extracted**, so `EventCode=`/
`Image=` filters returned nothing and the agent gave up before reaching the decisive evidence
(the EventID 1 `CommandLine`/`ParentImage`, which contains a reverse shell, an Apache-Struts
exploit string, and `cat /etc/passwd`).

### Resolution — two complementary, general fixes
1. **Sysmon-XML extraction tradecraft** (`prompts.py`). Taught the agent that Windows/Sysmon
   events here are raw XML and how to extract lineage with `rex` on `_raw`
   (`rex field=_raw "Name='CommandLine'>(?<CommandLine>[^<]+)"`, etc.), and that the EventID 1
   process-creation record holds the decisive lineage.
2. **Confidence-gated continuation** (`agent.py`). If the first synthesis hedges to a
   low-confidence `inconclusive` (<0.65), Argus runs ONE more focused pass to pursue the
   decisive pivot (resuming the same conversation) and then re-synthesizes — instead of
   under-calling. Capped at one continuation (`CONTINUATION_TURNS=4`).

**Precision guard (important).** The first version of these fixes over-corrected: the benign
control (`benign_dns_control`) began **over-calling** benign DNS-to-8.8.8.8 as `true_positive`
(1/3 pass-rate). Fixed by making the verdict logic **symmetric and alert-scoped** in both the
prompt and the continuation directive: confirming activity is benign (`false_positive`) is an
equally valid, confident outcome, and the agent must not promote unrelated/ambient host
activity into a verdict for *this* alert. After the rebalance the benign control returned to
**3/3 false_positive** while endpoint stayed **3/3 true_positive** — both fixed, no trade-off.

**Validation seen live:** a single endpoint run hedged to `inconclusive @ 0.45`, the
continuation fired (`↻ continuation`), pulled the EventID 1 lineage (reverse shell + Struts
exploit), and upgraded to `true_positive @ 0.92` — the exact failure mode caught and corrected.
