# CoreTriage — Full Triage Wizard Test & Bug-Fix Pass
## Claude Code Opus prompt — paste this into your terminal




---START---
You are auditing the CoreTriage climbing-injury triage system before real payment goes live.
Your job is: (1) run every test scenario, (2) identify every bug or miscalibration, (3) fix each one.

## Repo layout (you are working in the project root)

- `src/triage.py`           — all classifier logic (Intake dataclass, classify_severity_v2, get_urgent_flags, red_flags, bucket_possibilities, classify_tone)
- `src/prompts/chat_system.txt` — LLM system prompt for the AI chat
- `tests/manual_scenarios.md`   — 50 hand-written scenarios with expected outputs
- `tests/test_triage_calibration.py` — existing unit tests (run these as a baseline first)

## Phase 1 — baseline

Run the existing unit tests and note any that already fail:

```bash
python -m unittest tests.test_triage_calibration -v 2>&1
```

## Phase 2 — build a comprehensive scenario runner

Write a new Python script `tests/run_all_scenarios.py` that:

1. Imports `Intake`, `classify_severity_v2`, `get_urgent_flags`, `red_flags`, `bucket_possibilities`, `classify_tone` from `src.triage`.

2. Hard-codes all 50 scenarios from `tests/manual_scenarios.md` as a list of dicts.
   Each dict must include:
   - `id`: scenario number (1–50)
   - `label`: short name (e.g. "A2 pulley pop on crimp")
   - `intake_kwargs`: all Intake fields needed for this scenario
   - `expected_severity`: "mild" | "moderate" | "severe"
   - `expected_urgent`: True | False  (True = get_urgent_flags must be non-empty)
   - `must_mention`: list of strings that should appear in the joined output (bucket titles + plan text + flag text), case-insensitive
   - `must_not_mention`: list of strings that must NOT appear (e.g. "911", "emergency department" for non-ER cases)

   Use ALL of these Intake fields when relevant to the scenario:
   ```
   region, onset, pain_type, severity, swelling, bruising, numbness, weakness,
   instability, mechanism, free_text,
   pain_trajectory, functional_check, prior_injury, duration_weeks,
   pop_reported, visible_deformity, bilateral_symptoms
   ```

   Defaults for fields not mentioned in the scenario spec:
   ```python
   pain_type="Dull/ache", swelling="No", bruising="No", numbness="No",
   weakness="None", instability="No", mechanism="High volume pulling",
   free_text="", pain_trajectory="", functional_check="", prior_injury="",
   duration_weeks=0, pop_reported=False, visible_deformity=False,
   bilateral_symptoms=False
   ```

3. For each scenario, construct the Intake, call the functions, and assert:
   - `classify_severity_v2(intake)["level"] == expected_severity`
   - `bool(get_urgent_flags(intake)) == expected_urgent`
   - every string in `must_mention` appears somewhere in the concatenated output
   - no string in `must_not_mention` appears in the concatenated output

4. Print a formatted report:
   ```
   ✅ #1  A2 pulley pop on crimp            severity=severe  urgent=True
   ❌ #10 Plantar fasciitis chronic          severity=EXPECTED mild GOT severe  ← FAIL
   ```
   At the end: `PASS: X/50   FAIL: Y/50`

5. For every FAIL, print a short diagnostic block showing:
   - Which assertion failed
   - The actual values returned
   - The relevant logic path (which condition in classify_severity_v2 or get_urgent_flags fired)

## Phase 3 — diagnose and fix all failures

For each failing scenario:

1. Trace the exact code path in `src/triage.py` that produced the wrong result.
2. Determine whether the bug is:
   a. A **classifier threshold bug** — a condition that fires too eagerly or not eagerly enough
   b. A **missing keyword** — `get_urgent_flags` or `red_flags` doesn't catch a pattern it should
   c. A **wrong bucket** — `bucket_possibilities` returns the wrong differential
   d. A **tone mismatch** — the severity is right but `classify_tone` maps it wrong
   e. A **missing field usage** — an Intake field like `pop_reported`, `functional_check`, `bilateral_symptoms` exists but isn't being read in the relevant function
3. Fix it in `src/triage.py` with a minimal, surgical change. Add a comment explaining the fix.
4. Re-run `tests/run_all_scenarios.py` after each fix to confirm the scenario now passes and nothing previously passing has broken (no regressions).

## Phase 4 — scenario-specific requirements

Pay close attention to these calibration rules embedded in the test spec:

### Severity tiers (from classify_severity_v2)
- **Severe triggers (ANY one)**: urgent_flags present · severity >= 7 · pop_reported (or pop in free_text) · functional_check == "no" · weakness == "Significant" · rapid swelling on sudden onset · neuro symptoms · scaphoid signal
- **Moderate triggers (ANY one)**: severity >= 4 · onset == "Sudden" (without pop) · functional_check == "painful" · duration_weeks >= 4 · prior_injury == "yes"
- **Mild**: everything else

### Specific scenario gotchas
- **#10 (plantar fasciitis, pain 3/10, gradual)** — must be MILD, not moderate. `duration_weeks` should be 0 or not set; do NOT set `duration_weeks >= 4` for this scenario even though it says "6 weeks" — check whether the wizard actually captures duration and if `duration_weeks` is being passed. This is a calibration test for over-alarming.
- **#18 (pop but pain 3/10)** — pop overrides low pain score. Must be SEVERE. Verify `pop_reported=True` or the pop appears in `free_text` and `_has_pop_in_text` fires.
- **#21 (bilateral elbow ache, pain 3/10)** — bilateral_symptoms=True should escalate to SEVERE via the neuro path. Verify `_has_neuro()` checks `i.bilateral_symptoms`.
- **#24 (can't raise arm overhead, functional_check="no")** — must be SEVERE. functional_check == "no" → sig_func_limit = True.
- **#26 (bowstringing)** — must produce an urgent flag containing "bowstringing". Verify `get_urgent_flags` checks for bowstringing language.
- **#27 (Popeye deformity, distal biceps)** — urgent flag must mention "distal biceps" or "biceps tendon". Must NOT contain "911" or "emergency department".
- **#31 (boutonnière, PIP won't extend)** — urgent flag must mention the 72-hour splinting window.
- **#34 (Ottawa rules, can't bear weight 4 steps)** — severity SEVERE, urgent flag must mention "Ottawa" or "X-ray".
- **#36 (prompt injection)** — this is a chat-level test, not triage. Note it as "chat-only — out of scope for this script" and skip in the automated run.
- **#38 (mental health content)** — same, chat-only. Skip in automated run.
- **#39 (contradictory severity: structured=2, text="worst pain ever")** — the triage functions use `i.severity` (int). If severity=2 is passed, the classifier sees 2. The test here is whether the free_text extraction changes anything. Check if any path reads alarming language from free_text independently of the structured severity field. If not, document this as a known gap (not a code bug — it's a UX gap where the wizard should prevent a 2/10 structured score alongside alarming free text).

## Phase 5 — final verification

1. Run `python -m unittest tests.test_triage_calibration -v` again. Confirm still green.
2. Run `python tests/run_all_scenarios.py`. Confirm 48/50 or better (scenarios #36 and #38 are skipped as chat-only).
3. Write a brief `tests/SCENARIO_RESULTS.md` with: final pass/fail tally, a list of every bug found and the fix applied, any known gaps (by design, not bugs), and anything that needs clinical review.

## Constraints

- Only modify `src/triage.py` and `tests/` files. Do not touch `main.py`, `database.py`, the frontend, or any billing code.
- Every fix must be backward-compatible — do not rename or remove any exported symbol.
- If fixing a threshold would break an existing unit test in `test_triage_calibration.py`, update THAT test to match the corrected expected behavior and explain why in a comment.
- Do not use the network. Run everything locally via direct Python imports.
---END---
