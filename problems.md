# Argus — Known Problems (prioritized, to tackle later)

These are the two problems we explicitly chose to defer on 2026-06-10. They are
**measurement / robustness** issues, not failures of the new capabilities (those are
verified working end-to-end). Each has a root cause and a concrete proposed fix.

See [`issues.md`](issues.md) for the broader backlog of smaller issues and limitations.

---

## P1 — Eval verdict accuracy is single-sample on a stochastic agent (noisy)

**Severity:** Medium (credibility artifact, not a runtime bug)

**Symptom.** `argus eval` runs each scenario exactly once. With a non-deterministic
LLM, a borderline scenario flips pass/fail between runs, so the headline
`verdict_accuracy` swings even though nothing changed.

**Evidence.** Across four real runs the `endpoint_malware` scenario returned:
`true_positive, true_positive, inconclusive, inconclusive` (~50/50). That single
scenario is the *entire* difference between `verdict_accuracy = 1.0` and `0.667`. The
`aws_cred_abuse` (critical attack) and `benign_dns_control` (benign) scenarios are
correct on every run.

**Root cause.** One sample per scenario → the metric reports a Bernoulli draw, not the
agent's true accuracy rate. The current committed `eval/results.json` reflects one
unlucky draw on `endpoint_malware`.

**Impact.** The committed eval artifact under-sells the system; the number isn't
reproducible run-to-run.

**Proposed fix.** Add multi-sampling to the harness:
- `argus eval --repeat K` runs each scenario `K` times.
- Report **per-scenario pass-rate** (e.g. "endpoint: TP in 2/4 runs") and the verdict
  distribution, plus the mean/stdev of recall & grounding.
- Headline `verdict_accuracy` becomes a rate over `scenarios × K`, with the variance
  shown — honest and reproducible.
- Small change: wrap `run_scenario` in a loop in `src/argus/eval.py`, aggregate.

**Acceptance.** `argus eval --repeat 5` reports a stable pass-rate per scenario and an
aggregate with visible variance; no single-draw cliff.

**Explicitly rejected (would be gaming, not fixing).** Re-rolling the full eval until a
100% run appears and committing that; reverting `max_turns` to the value that happened
to pass; or adding `inconclusive` to the accepted verdicts for `endpoint_malware`.

---

## P2 — Endpoint-malware verdict under-calls (inconclusive instead of true_positive)

**Severity:** Medium (investigation tradecraft / verdict reliability)

**Symptom.** On the masquerading-executable scenario the agent *finds* the look-alike
binary (`iexeplorer.exe`, a typo-squat of `iexplore.exe`) on host `FYODOR-L` but
sometimes concludes `inconclusive` at `confidence ≈ 0.45` instead of `true_positive`.

**Evidence.** `iexeplorer.exe` has 147 events in `botsv3`, including 52 Sysmon
(`Microsoft-Windows-Sysmon/Operational`) process-creation events — i.e. the decisive
evidence (parent process, command line, image path, hash) is present in the data. In the
under-call runs the agent stopped before chaining that Sysmon lineage and hedged.

**Root cause.** The agent doesn't *reliably* pull the process lineage for a flagged
executable before judging. A masquerading system-binary name is a strong true-positive
signal, but only once you confirm the path/parent/hash — which the agent does
inconsistently under a finite turn budget.

**What was already tried (2026-06-10).** Strengthened `INVESTIGATOR_SYSTEM` with a
"Reaching a verdict (don't under-call)" section and the `ENDPOINT_SPECIALIST` prompt to
require pulling parent/command-line/path/hash before concluding (using a *generic*
example — `scvhost.exe` vs `svchost.exe` — deliberately NOT the test's answer). This is a
soft, stochastic nudge; it did not fully stabilise the verdict in the samples run.

**Proposed fixes (in order of preference).**
1. **Process-lineage sub-routine.** When the agent flags a suspicious image name, give it
   a focused tool/step that pulls the Sysmon EventCode=1 record (Image, ParentImage,
   CommandLine, Hashes, User) for that process, so the confirming evidence is always on
   the table before synthesis.
2. **Confidence-gated continuation.** If the synthesized verdict is `inconclusive` but a
   high-value pivot is still untried (e.g. process lineage not pulled), loop once more
   instead of finalizing.
3. **Multi-agent for endpoint cases.** The dedicated `endpoint` specialist (`--multi`)
   already pulls Sysmon more reliably; consider routing malware-shaped alerts to it.

**Risk to avoid.** Don't push so hard that the agent over-calls the benign control
(`benign_dns_control` must stay `false_positive`/`inconclusive`). Any fix must be
validated against the benign scenario too.

**Acceptance.** Over `--repeat 5`, `endpoint_malware` returns `true_positive` in the
large majority of runs while `benign_dns_control` stays benign.
