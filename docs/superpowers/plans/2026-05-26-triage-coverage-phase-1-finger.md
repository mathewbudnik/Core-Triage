# Triage Coverage Phase 1 — Finger/Hand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 4 new finger/hand buckets (epiphyseal stress fx, DIP capsulitis, flexor tendon rupture, thumb UCL), fix 8 finger-region decision-tree paths, add 3 new intake fields (age_band + 2 functional-check questions), split the KB finger content into 4 per-pattern files. Backend-only; no DB migrations.

**Architecture:** Pure Python changes in [src/triage.py](../../src/triage.py) (Intake dataclass + bucket_possibilities() finger branch) and [src/bucket_content.py](../../src/bucket_content.py) (4 new entries). Frontend wizard ([frontend/src/components/TriageTab.jsx](../../frontend/src/components/TriageTab.jsx)) gets 3 new questions. KB markdown files split for finer-grained RAG citation. Frontend ↔ backend keyword contract kept in sync via [frontend/src/data/signalChips.js](../../frontend/src/data/signalChips.js). All test scaffolding extends existing patterns in [tests/test_finger_triage.py](../../tests/test_finger_triage.py).

**Tech Stack:** Python 3 (dataclasses, no extra deps), React 18 + Vite frontend, pytest/unittest for backend tests, vitest for any frontend JS tests. WebSearch tool for per-bucket clinical research.

**Spec:** [docs/superpowers/specs/2026-05-26-triage-coverage-phase-1-finger-design.md](../specs/2026-05-26-triage-coverage-phase-1-finger-design.md)
**Roadmap:** [docs/superpowers/specs/2026-05-26-triage-coverage-roadmap-design.md](../specs/2026-05-26-triage-coverage-roadmap-design.md)

---

## File map (built in this order)

| # | File | Action | Why this order |
|---|---|---|---|
| 1 | [src/triage.py](../../src/triage.py) | Modify (Intake dataclass) | Foundation — fields gate everything downstream |
| 2-3 | [frontend/src/components/TriageTab.jsx](../../frontend/src/components/TriageTab.jsx) | Modify | Wizard collects the new field values |
| 4-10 | [src/triage.py](../../src/triage.py) | Modify (bucket_possibilities) | 7 path edits to existing-bucket gating; pure logic |
| 11-14 | [src/bucket_content.py](../../src/bucket_content.py) + [src/triage.py](../../src/triage.py) | Modify (4 new buckets) | Each bucket: research → content → surfacing rule |
| 15 | [kb/finger_*.md](../../kb/) | Restructure (split + new) | KB chunking for better RAG citation |
| 16 | [tests/run_all_scenarios.py](../../tests/run_all_scenarios.py) | Add 12 scenarios | Regression corpus |
| 17 | (manual) | Verify | Full suite + smoke test |

---

## Common reference snippets

### A. The current `Intake` dataclass (will be modified in Task 1)

Located at [src/triage.py:9-45](../../src/triage.py#L9). Current fields include `region`, `onset`, `pain_type`, `severity`, `mechanism`, `free_text`, `swelling`, `bruising`, `numbness`, `weakness`, `instability`, plus Phase 5/6 fields (`pain_trajectory`, `functional_check`, `years_climbing`, `which_finger`, `finger_location`, `grip_mode`, etc.).

### B. Existing bucket-content entry structure (template for Tasks 11-14)

Every entry in [src/bucket_content.py](../../src/bucket_content.py) follows this shape:

```python
"bucket_id": {
    "base_title": "Human-readable title",
    "why": "One sentence explaining the typical mechanism / presentation",
    "matches_if": [
        "User-facing bullet 1",
        "User-facing bullet 2",
        "User-facing bullet 3",
        # ≥3 bullets required
    ],
    "not_likely_if": [
        "Exclusion bullet 1",
        "Exclusion bullet 2",
    ],
    "quick_test": "One-line self-test the user can run",
    "reasoning_basis": "Paragraph of clinical reasoning. Cites mechanism, anatomy, key differentials.",
    "sources": [
        {"name": "Author Year — short title", "url": "https://..."},
        # ≥2 peer-reviewed sources required
    ],
},
```

### C. Frontend ↔ backend keyword contract

Whenever you add text-pattern matching in [src/triage.py](../../src/triage.py), check whether the matching keywords also need to appear in [frontend/src/data/signalChips.js](../../frontend/src/data/signalChips.js). The [tests/test_signal_chips_keywords.py](../../tests/test_signal_chips_keywords.py) regression test enforces parity.

---

## Task 1: Add 3 new fields to `Intake` dataclass

The whole plan depends on these fields existing. Pure data structure change; no logic.

**Files:**
- Modify: [src/triage.py:9-45](../../src/triage.py#L9) (Intake dataclass)
- Test: [tests/test_finger_triage.py](../../tests/test_finger_triage.py)

- [ ] **Step 1: Read the current Intake dataclass**

```bash
sed -n '9,45p' /Users/mathewbudnik/coretriage/src/triage.py
```

Note where to insert new fields — after the Phase 6 finger-drill-down fields (`which_finger`, `finger_location`, `grip_mode`), before any urgent-signal flags.

- [ ] **Step 2: Write failing tests for the new fields**

Append to [tests/test_finger_triage.py](../../tests/test_finger_triage.py):

```python
import unittest
from src.triage import Intake


class TestIntakeNewFields(unittest.TestCase):
    """Phase 1 added age_band + 2 functional-check fields. Verify they exist
    with empty-string defaults so existing intakes deserialize cleanly."""

    def test_age_band_default_empty(self):
        i = Intake(region="Finger")
        self.assertEqual(i.age_band, "")

    def test_age_band_accepts_band_values(self):
        for band in ("under_14", "14_to_17", "18_to_29", "30_to_49", "50_plus"):
            i = Intake(region="Finger", age_band=band)
            self.assertEqual(i.age_band, band)

    def test_can_extend_fingertip_default_empty(self):
        i = Intake(region="Finger")
        self.assertEqual(i.can_extend_fingertip, "")

    def test_can_extend_fingertip_accepts_values(self):
        for v in ("Yes", "No", "Painful"):
            i = Intake(region="Finger", can_extend_fingertip=v)
            self.assertEqual(i.can_extend_fingertip, v)

    def test_can_straighten_middle_joint_default_empty(self):
        i = Intake(region="Finger")
        self.assertEqual(i.can_straighten_middle_joint, "")

    def test_can_straighten_middle_joint_accepts_values(self):
        for v in ("Yes", "No", "Painful"):
            i = Intake(region="Finger", can_straighten_middle_joint=v)
            self.assertEqual(i.can_straighten_middle_joint, v)
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd /Users/mathewbudnik/coretriage && python -m unittest tests.test_finger_triage.TestIntakeNewFields -v
```

Expected: 6 FAIL with `AttributeError: 'Intake' object has no attribute 'age_band'` (or similar for the other two fields).

- [ ] **Step 4: Add the three fields to the Intake dataclass**

Edit [src/triage.py:9-45](../../src/triage.py#L9) — find the existing `Intake` dataclass definition and add three new fields. Add them in a Phase-7 block so it's clear which spec they came from. The exact insertion point: after the existing finger-drill-down fields (`grip_mode`), before any urgent-signal flags (`pop_reported`, `visible_deformity`, etc.):

```python
    # ── Phase 7 (2026-05-26): triage coverage expansion ─────────────
    # See docs/superpowers/specs/2026-05-26-triage-coverage-phase-1-finger-design.md
    age_band: str = ""                       # "under_14" | "14_to_17" | "18_to_29" | "30_to_49" | "50_plus" | ""
    can_extend_fingertip: str = ""           # "Yes" | "No" | "Painful" | ""
    can_straighten_middle_joint: str = ""    # "Yes" | "No" | "Painful" | ""
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd /Users/mathewbudnik/coretriage && python -m unittest tests.test_finger_triage.TestIntakeNewFields -v
```

Expected: 6 PASS.

- [ ] **Step 6: Run the full existing test suite to confirm no regression**

```bash
cd /Users/mathewbudnik/coretriage && python -m unittest discover tests -v 2>&1 | tail -10
```

Expected: All existing tests still pass. Total tests went up by 6.

- [ ] **Step 7: Commit**

```bash
cd /Users/mathewbudnik/coretriage && git add src/triage.py tests/test_finger_triage.py && git commit -m "feat(triage): add Intake fields for Phase 1 (age_band + 2 functional checks)

Phase 1 of triage coverage expansion. Adds three privacy-preserving
intake fields, all defaulting to empty string so existing intakes
deserialize unchanged:
  - age_band — for pediatric epiphyseal gating (also reused in Phase 3)
  - can_extend_fingertip — for mallet finger urgent-path question
  - can_straighten_middle_joint — for boutonniere urgent-path question

Spec: docs/superpowers/specs/2026-05-26-triage-coverage-phase-1-finger-design.md"
```

---

## Task 2: Frontend wizard — `age_band` question

Add the age-band wizard step. Per spec §3.1, this appears for ALL regions (not finger-only) so it's available without UI rework when Phase 3 lands.

**Files:**
- Modify: [frontend/src/components/TriageTab.jsx](../../frontend/src/components/TriageTab.jsx)
- Test: manual verification (no component-test infrastructure)

- [ ] **Step 1: Read the current TriageTab.jsx wizard structure**

```bash
grep -nE '(useState|step|chip|onSelect|wizard|setIntake)' /Users/mathewbudnik/coretriage/frontend/src/components/TriageTab.jsx | head -40
```

Identify the wizard pattern (e.g., `step` state, chip groups, intake-building object). The new question should follow the same chip-button pattern used by other intake fields.

- [ ] **Step 2: Add the age_band chip group**

Find the wizard step that fits logically (recommendation: early — between region selection and other intake) and add a chip-group section. Use the existing chip styling pattern in the file. Exact code depends on the existing component shape; match what's already there.

A reference structure for the chip set:

```jsx
const AGE_BAND_OPTIONS = [
  { value: "under_14",  label: "Under 14"   },
  { value: "14_to_17",  label: "14–17"      },
  { value: "18_to_29",  label: "18–29"      },
  { value: "30_to_49",  label: "30–49"      },
  { value: "50_plus",   label: "50+"        },
]

// inside the wizard JSX:
<section className="...">
  <h3 className="...">How old are you?</h3>
  <p className="...">Optional — used to flag age-specific patterns.</p>
  <div className="...">
    {AGE_BAND_OPTIONS.map(opt => (
      <button
        type="button"
        key={opt.value}
        onClick={() => setIntake(prev => ({ ...prev, age_band: opt.value }))}
        className={intake.age_band === opt.value ? "chip chip--active" : "chip"}
      >
        {opt.label}
      </button>
    ))}
    <button
      type="button"
      onClick={() => setIntake(prev => ({ ...prev, age_band: "" }))}
      className={intake.age_band === "" ? "chip chip--active" : "chip"}
    >
      Skip
    </button>
  </div>
</section>
```

Adjust class names to match the existing chip styling in [TriageTab.jsx](../../frontend/src/components/TriageTab.jsx). The exact classes are likely `ct-chip` / `ct-chip--active` or similar — read the file to confirm the conventions in use.

- [ ] **Step 3: Confirm intake serialization carries the new field**

Search for where the wizard's final intake payload is sent to the backend:

```bash
grep -nE '(postTriage|api/triage|fetch.*triage|submitIntake)' /Users/mathewbudnik/coretriage/frontend/src/components/TriageTab.jsx /Users/mathewbudnik/coretriage/frontend/src/api.js 2>&1 | head -10
```

The intake object is sent as JSON; if it's spread as `{ ...intake }`, the new field flows automatically. If it's an explicit field list, add `age_band: intake.age_band` to the payload.

- [ ] **Step 4: Verify frontend builds**

```bash
cd /Users/mathewbudnik/coretriage/frontend && npx vite build --mode development 2>&1 | tail -10
```

Expected: clean build, no errors mentioning TriageTab.

- [ ] **Step 5: Manual smoke test**

Start the dev server and walk through a finger triage. The age-band step should appear, all 5 bands + Skip should be selectable, and the choice should persist to the backend (verify by checking the network request payload in DevTools).

```bash
cd /Users/mathewbudnik/coretriage/frontend && npm run dev
# Open http://localhost:5173, navigate to triage, walk through wizard
```

Then Ctrl-C to stop the dev server.

- [ ] **Step 6: Commit**

```bash
cd /Users/mathewbudnik/coretriage && git add frontend/src/components/TriageTab.jsx && git commit -m "feat(triage): add age_band wizard step (all regions)

Privacy-preserving age field with 5 bands. Used in Phase 1 for
pediatric epiphyseal stress fx gating; reused in Phase 3 for
spondylolysis gating.

Skip option = empty string = no age-specific branches fire."
```

---

## Task 3: Frontend wizard — functional-check questions (mallet + boutonnière)

Two new yes/no/painful chips, finger-only. Per spec §3.2 and §3.3.

**Files:**
- Modify: [frontend/src/components/TriageTab.jsx](../../frontend/src/components/TriageTab.jsx)

- [ ] **Step 1: Identify the finger-specific intake section**

```bash
grep -nE '(finger|Finger|FINGER)' /Users/mathewbudnik/coretriage/frontend/src/components/TriageTab.jsx | head -20
```

The finger-only branch likely uses a conditional render like `{intake.region === "Finger" && (...)}`. Both new questions go inside that branch.

- [ ] **Step 2: Add the two chip groups**

Inside the finger-only branch, add two new chip-group sections following the same pattern as Task 2:

```jsx
const FUNCTIONAL_OPTIONS = [
  { value: "Yes",     label: "Yes"     },
  { value: "No",      label: "No"      },
  { value: "Painful", label: "Painful" },
]

// First question: mallet finger functional check
<section className="...">
  <h3 className="...">Can you fully straighten the tip of the injured finger on its own?</h3>
  <div className="...">
    {FUNCTIONAL_OPTIONS.map(opt => (
      <button
        type="button"
        key={opt.value}
        onClick={() => setIntake(prev => ({ ...prev, can_extend_fingertip: opt.value }))}
        className={intake.can_extend_fingertip === opt.value ? "chip chip--active" : "chip"}
      >
        {opt.label}
      </button>
    ))}
    <button
      type="button"
      onClick={() => setIntake(prev => ({ ...prev, can_extend_fingertip: "" }))}
      className={intake.can_extend_fingertip === "" ? "chip chip--active" : "chip"}
    >
      Skip
    </button>
  </div>
</section>

// Second question: boutonniere functional check
<section className="...">
  <h3 className="...">Can you fully straighten the middle joint of the injured finger?</h3>
  <div className="...">
    {FUNCTIONAL_OPTIONS.map(opt => (
      <button
        type="button"
        key={opt.value}
        onClick={() => setIntake(prev => ({ ...prev, can_straighten_middle_joint: opt.value }))}
        className={intake.can_straighten_middle_joint === opt.value ? "chip chip--active" : "chip"}
      >
        {opt.label}
      </button>
    ))}
    <button
      type="button"
      onClick={() => setIntake(prev => ({ ...prev, can_straighten_middle_joint: "" }))}
      className={intake.can_straighten_middle_joint === "" ? "chip chip--active" : "chip"}
    >
      Skip
    </button>
  </div>
</section>
```

Use the same class names as the existing chip-group sections in the file.

- [ ] **Step 3: Verify the frontend builds**

```bash
cd /Users/mathewbudnik/coretriage/frontend && npx vite build --mode development 2>&1 | tail -10
```

- [ ] **Step 4: Manual smoke test**

```bash
cd /Users/mathewbudnik/coretriage/frontend && npm run dev
```

Walk through a finger triage. Both questions should appear with 4 chips each (Yes / No / Painful / Skip). Stop the dev server with Ctrl-C.

- [ ] **Step 5: Commit**

```bash
cd /Users/mathewbudnik/coretriage && git add frontend/src/components/TriageTab.jsx && git commit -m "feat(triage): add finger functional-check wizard questions

Two new chip groups (Yes/No/Painful/Skip), finger-only:
  - 'Can you fully straighten the tip?' → drives mallet_finger urgent path
  - 'Can you fully straighten the middle joint?' → drives boutonniere urgent path

Replaces fragile free-text-only signal for the two most time-critical
finger splinting windows."
```

---

## Task 4: Broaden `pulley_a2` gating

Path fix per spec §2.1. Pure logic change; no intake-field dependency.

**Files:**
- Modify: [src/triage.py:1024-1029](../../src/triage.py#L1024)
- Test: [tests/test_finger_triage.py](../../tests/test_finger_triage.py)

- [ ] **Step 1: Read the current pulley_a2 surfacing code**

```bash
sed -n '1020,1035p' /Users/mathewbudnik/coretriage/src/triage.py
```

Confirm the current shape matches the spec's "current" snippet (a single `if` with three AND'd conditions producing one bucket at qualifier `most likely`).

- [ ] **Step 2: Write failing tests**

Append to [tests/test_finger_triage.py](../../tests/test_finger_triage.py):

```python
from src.triage import Intake, bucket_possibilities


class TestPulleyA2Broadening(unittest.TestCase):
    """Per spec §2.1: A2 covers palm_base + palm_mid, allows open_hand,
    surfaces for Pinky/Thumb/Multiple at downgraded qualifier."""

    def test_a2_palm_base_full_crimp_ring_still_most_likely(self):
        i = Intake(region="Finger", which_finger="Ring",
                   finger_location="palm_base", grip_mode="full_crimp")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertIn("pulley_a2", ids)
        # Must be most_likely qualifier for the standard case
        a2 = next(b for b in bucket_possibilities(i) if b.id == "pulley_a2")
        self.assertEqual(a2.qualifier, "most likely")

    def test_a2_palm_mid_full_crimp_pinky_downgraded(self):
        i = Intake(region="Finger", which_finger="Pinky",
                   finger_location="palm_mid", grip_mode="full_crimp")
        a2 = next((b for b in bucket_possibilities(i) if b.id == "pulley_a2"), None)
        self.assertIsNotNone(a2, "A2 should fire for Pinky at palm_mid + full_crimp")
        self.assertEqual(a2.qualifier, "possible")

    def test_a2_palm_mid_open_hand_downgraded(self):
        i = Intake(region="Finger", which_finger="Ring",
                   finger_location="palm_mid", grip_mode="open_hand")
        a2 = next((b for b in bucket_possibilities(i) if b.id == "pulley_a2"), None)
        self.assertIsNotNone(a2, "A2 should fire for open_hand at palm_mid")
        self.assertEqual(a2.qualifier, "possible")

    def test_a2_does_not_fire_for_palm_tip(self):
        i = Intake(region="Finger", which_finger="Ring",
                   finger_location="palm_tip", grip_mode="full_crimp")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertNotIn("pulley_a2", ids)
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd /Users/mathewbudnik/coretriage && python -m unittest tests.test_finger_triage.TestPulleyA2Broadening -v
```

Expected: 3 of 4 FAIL (the `palm_base` and `Pinky` and `open_hand` tests fail; the palm_tip exclusion test should pass already since the old code didn't fire on palm_tip either).

- [ ] **Step 4: Replace the surfacing code**

Edit [src/triage.py:1024-1029](../../src/triage.py#L1024). Replace the existing block:

```python
        # OLD
        if (
            loc == "palm_mid"
            and grip in {"full_crimp", "half_crimp"}
            and wf in {"Ring", "Middle", "Index"}
        ):
            out.append(Bucket.from_id("pulley_a2", qualifier="most likely"))
```

with:

```python
        # NEW — Phase 1 broadened: A2 spans palm_base→palm_mid (per Miro/Schöffl 2021),
        # open_hand can damage it under high load, Pinky/Thumb A2 ruptures do occur.
        if (
            loc in {"palm_base", "palm_mid"}
            and grip in {"full_crimp", "half_crimp", "open_hand"}
        ):
            if wf in {"Pinky", "Thumb", "Multiple"} or grip == "open_hand":
                out.append(Bucket.from_id("pulley_a2", qualifier="possible"))
            else:
                out.append(Bucket.from_id("pulley_a2", qualifier="most likely"))
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd /Users/mathewbudnik/coretriage && python -m unittest tests.test_finger_triage.TestPulleyA2Broadening -v
```

Expected: 4 PASS.

- [ ] **Step 6: Run full test suite for no regression**

```bash
cd /Users/mathewbudnik/coretriage && python -m unittest discover tests 2>&1 | tail -5
```

Expected: all tests pass (existing 100+ scenarios are not gated on A2 narrow behavior; broadening should not regress).

- [ ] **Step 7: Commit**

```bash
cd /Users/mathewbudnik/coretriage && git add src/triage.py tests/test_finger_triage.py && git commit -m "fix(triage): broaden pulley_a2 to palm_base, open_hand, all fingers

Per Miro/Schöffl 2021, A2 anatomically spans the proximal phalanx
(palm_base → palm_mid) and open-hand grips can damage it under high
load. Pinky/Thumb A2 ruptures occur (rarely) but currently silently
miss because gating excluded those fingers.

New rule: palm_base or palm_mid + crimp or open_hand fires A2.
Pinky/Thumb/Multiple OR open_hand downgrade qualifier from
'most likely' to 'possible'."
```

---

## Task 5: Add `pulley_a4` fallback at `palm_mid`

Path fix per spec §2.2.

**Files:**
- Modify: [src/triage.py:1030-1031](../../src/triage.py#L1030)
- Test: [tests/test_finger_triage.py](../../tests/test_finger_triage.py)

- [ ] **Step 1: Write failing tests**

Append to [tests/test_finger_triage.py](../../tests/test_finger_triage.py):

```python
class TestPulleyA4PalmMidFallback(unittest.TestCase):
    """Per spec §2.2: A4 should also fire at palm_mid (downgraded) since
    users describe A4-region pain as 'middle of finger'."""

    def test_a4_palm_tip_still_likely(self):
        i = Intake(region="Finger", which_finger="Ring",
                   finger_location="palm_tip", grip_mode="full_crimp")
        a4 = next((b for b in bucket_possibilities(i) if b.id == "pulley_a4"), None)
        self.assertIsNotNone(a4)
        self.assertEqual(a4.qualifier, "likely")

    def test_a4_palm_mid_fires_as_possible(self):
        i = Intake(region="Finger", which_finger="Ring",
                   finger_location="palm_mid", grip_mode="full_crimp")
        a4 = next((b for b in bucket_possibilities(i) if b.id == "pulley_a4"), None)
        self.assertIsNotNone(a4, "A4 should fire at palm_mid as 'possible'")
        self.assertEqual(a4.qualifier, "possible")

    def test_a4_palm_base_does_not_fire(self):
        i = Intake(region="Finger", which_finger="Ring",
                   finger_location="palm_base", grip_mode="full_crimp")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertNotIn("pulley_a4", ids)
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/mathewbudnik/coretriage && python -m unittest tests.test_finger_triage.TestPulleyA4PalmMidFallback -v
```

Expected: 1 of 3 FAIL (the `palm_mid` fallback fails; the existing `palm_tip` test passes because current code already fires there; the `palm_base` test passes because current code doesn't fire there).

- [ ] **Step 3: Update the surfacing code**

Edit [src/triage.py:1030-1031](../../src/triage.py#L1030). Replace:

```python
        # OLD
        if loc == "palm_tip" and grip in {"full_crimp", "half_crimp"}:
            out.append(Bucket.from_id("pulley_a4", qualifier="likely"))
```

with:

```python
        # NEW — Phase 1: also fire at palm_mid as 'possible' (users describe
        # A4-region pain as 'middle of finger' without anatomical training).
        if loc == "palm_tip" and grip in {"full_crimp", "half_crimp"}:
            out.append(Bucket.from_id("pulley_a4", qualifier="likely"))
        elif loc == "palm_mid" and grip in {"full_crimp", "half_crimp"}:
            out.append(Bucket.from_id("pulley_a4", qualifier="possible"))
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/mathewbudnik/coretriage && python -m unittest tests.test_finger_triage.TestPulleyA4PalmMidFallback -v
```

Expected: 3 PASS.

- [ ] **Step 5: Run full test suite**

```bash
cd /Users/mathewbudnik/coretriage && python -m unittest discover tests 2>&1 | tail -5
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
cd /Users/mathewbudnik/coretriage && git add src/triage.py tests/test_finger_triage.py && git commit -m "fix(triage): pulley_a4 fires at palm_mid as 'possible' fallback

Users describe A4-region pain (middle phalanx) as 'middle of finger'
because they lack anatomical training. Current rule missed these
users entirely. New fallback: palm_mid + crimp fires A4 at 'possible'
qualifier so the differential surfaces alongside A2/A3."
```

---

## Task 6: Broaden `jersey_finger` beyond Ring finger

Path fix per spec §2.3.

**Files:**
- Modify: [src/triage.py:1002-1012](../../src/triage.py#L1002)
- Test: [tests/test_finger_triage.py](../../tests/test_finger_triage.py)

- [ ] **Step 1: Write failing tests**

Append:

```python
class TestJerseyFingerBroadening(unittest.TestCase):
    """Per spec §2.3: jersey on Ring stays 'urgent'; Middle/Index get
    'consider evaluation' for the same signals."""

    def test_jersey_ring_still_urgent(self):
        i = Intake(region="Finger", which_finger="Ring",
                   onset="Sudden", grip_mode="jam")
        jf = next((b for b in bucket_possibilities(i) if b.id == "jersey_finger"), None)
        self.assertIsNotNone(jf)
        self.assertEqual(jf.qualifier, "urgent")

    def test_jersey_middle_consider_evaluation(self):
        i = Intake(region="Finger", which_finger="Middle",
                   onset="Sudden", grip_mode="jam")
        jf = next((b for b in bucket_possibilities(i) if b.id == "jersey_finger"), None)
        self.assertIsNotNone(jf, "jersey should fire for Middle finger")
        self.assertEqual(jf.qualifier, "consider evaluation")

    def test_jersey_index_consider_evaluation(self):
        i = Intake(region="Finger", which_finger="Index",
                   onset="Sudden", grip_mode="jam")
        jf = next((b for b in bucket_possibilities(i) if b.id == "jersey_finger"), None)
        self.assertIsNotNone(jf)
        self.assertEqual(jf.qualifier, "consider evaluation")

    def test_jersey_pinky_does_not_fire(self):
        i = Intake(region="Finger", which_finger="Pinky",
                   onset="Sudden", grip_mode="jam")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertNotIn("jersey_finger", ids)

    def test_jersey_ring_without_sudden_does_not_fire(self):
        i = Intake(region="Finger", which_finger="Ring",
                   onset="Gradual", grip_mode="jam")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertNotIn("jersey_finger", ids)
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/mathewbudnik/coretriage && python -m unittest tests.test_finger_triage.TestJerseyFingerBroadening -v
```

Expected: 2 of 5 FAIL (Middle and Index — the new paths).

- [ ] **Step 3: Update the surfacing code**

Edit [src/triage.py:1002-1012](../../src/triage.py#L1002). Replace the existing jersey-finger block with:

```python
        # Jersey finger — FDP avulsion, surgical within 7-14 days
        # Phase 1 broadened: Ring stays 'urgent' (~75% of cases per FDP anatomy);
        # Middle/Index get 'consider evaluation' for the same signals.
        jersey_signal = (
            i.onset == "Sudden"
            and (
                any(p in text_l for p in ("can't bend tip", "can't flex tip", "cannot bend tip"))
                or grip == "jam"
            )
        )
        if jersey_signal:
            if wf == "Ring":
                out.append(Bucket.from_id("jersey_finger", qualifier="urgent"))
            elif wf in {"Middle", "Index"}:
                out.append(Bucket.from_id("jersey_finger", qualifier="consider evaluation"))
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/mathewbudnik/coretriage && python -m unittest tests.test_finger_triage.TestJerseyFingerBroadening -v
```

Expected: 5 PASS.

- [ ] **Step 5: Run full test suite**

```bash
cd /Users/mathewbudnik/coretriage && python -m unittest discover tests 2>&1 | tail -5
```

- [ ] **Step 6: Commit**

```bash
cd /Users/mathewbudnik/coretriage && git add src/triage.py tests/test_finger_triage.py && git commit -m "fix(triage): jersey_finger surfaces for Middle/Index at 'consider eval'

~75% of jersey-finger cases are Ring finger per FDP anatomy, but the
other 25% (Middle/Index) currently get zero urgent flag. Ring stays
at 'urgent' qualifier; Middle/Index now surface at 'consider
evaluation' for the same signals (Sudden + jam or 'can't bend tip')."
```

---

## Task 7: Mallet finger — structured intake replaces free-text dependency

Path fix per spec §2.4. Depends on `can_extend_fingertip` field (Task 1) and structured-vs-text conflict resolution.

**Files:**
- Modify: [src/triage.py:993-999](../../src/triage.py#L993)
- Test: [tests/test_finger_triage.py](../../tests/test_finger_triage.py)

- [ ] **Step 1: Write failing tests**

Append:

```python
class TestMalletFingerStructured(unittest.TestCase):
    """Per spec §2.4: structured 'No' fires urgent; 'Painful' fires
    possible; 'Yes' + text-droop fires only 'possible' (don't override
    user's own answer); empty + text fires urgent (text-pattern fallback)."""

    def test_mallet_structured_no_fires_urgent_without_text(self):
        i = Intake(region="Finger", can_extend_fingertip="No")
        mf = next((b for b in bucket_possibilities(i) if b.id == "mallet_finger"), None)
        self.assertIsNotNone(mf)
        self.assertEqual(mf.qualifier, "urgent")

    def test_mallet_structured_no_wins_over_contradicting_text(self):
        i = Intake(region="Finger", can_extend_fingertip="No",
                   free_text="my finger feels fine")
        mf = next((b for b in bucket_possibilities(i) if b.id == "mallet_finger"), None)
        self.assertEqual(mf.qualifier, "urgent")

    def test_mallet_structured_painful_fires_possible(self):
        i = Intake(region="Finger", can_extend_fingertip="Painful")
        mf = next((b for b in bucket_possibilities(i) if b.id == "mallet_finger"), None)
        self.assertIsNotNone(mf)
        self.assertEqual(mf.qualifier, "possible")

    def test_mallet_structured_yes_plus_droop_text_fires_possible(self):
        # User explicitly says they CAN extend but text mentions droop — soft surface
        i = Intake(region="Finger", can_extend_fingertip="Yes",
                   free_text="tip droops a bit")
        mf = next((b for b in bucket_possibilities(i) if b.id == "mallet_finger"), None)
        self.assertIsNotNone(mf, "soft surface so user can reconsider")
        self.assertEqual(mf.qualifier, "possible")

    def test_mallet_text_pattern_fallback_when_structured_empty(self):
        i = Intake(region="Finger", free_text="tip droops")
        mf = next((b for b in bucket_possibilities(i) if b.id == "mallet_finger"), None)
        self.assertIsNotNone(mf)
        self.assertEqual(mf.qualifier, "urgent")

    def test_mallet_structured_yes_no_text_does_not_fire(self):
        i = Intake(region="Finger", can_extend_fingertip="Yes")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertNotIn("mallet_finger", ids)
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/mathewbudnik/coretriage && python -m unittest tests.test_finger_triage.TestMalletFingerStructured -v
```

Expected: most FAIL (the new structured paths don't exist yet).

- [ ] **Step 3: Update the surfacing code**

Edit [src/triage.py:993-999](../../src/triage.py#L993). Replace the existing mallet-finger block with:

```python
        # Mallet finger — extensor avulsion at DIP, splint within 1 week
        # Phase 1: structured intake (can_extend_fingertip) takes precedence
        # over free-text. 'Yes' + droop text fires only 'possible' (don't
        # override user's own answer).
        mallet_text = (
            any(p in text_l for p in ("can't extend tip", "tip droops"))
            or "mallet" in text_l
        )
        if i.can_extend_fingertip == "No":
            out.append(Bucket.from_id("mallet_finger", qualifier="urgent"))
        elif i.can_extend_fingertip == "Painful":
            out.append(Bucket.from_id("mallet_finger", qualifier="possible"))
        elif i.can_extend_fingertip == "Yes" and mallet_text:
            out.append(Bucket.from_id("mallet_finger", qualifier="possible"))
        elif i.can_extend_fingertip == "" and mallet_text:
            out.append(Bucket.from_id("mallet_finger", qualifier="urgent"))
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/mathewbudnik/coretriage && python -m unittest tests.test_finger_triage.TestMalletFingerStructured -v
```

Expected: 6 PASS.

- [ ] **Step 5: Run full test suite**

```bash
cd /Users/mathewbudnik/coretriage && python -m unittest discover tests 2>&1 | tail -5
```

- [ ] **Step 6: Commit**

```bash
cd /Users/mathewbudnik/coretriage && git add src/triage.py tests/test_finger_triage.py && git commit -m "fix(triage): mallet_finger structured intake replaces free-text

72-hour splinting window is too critical to depend on user phrasing.
New structured can_extend_fingertip field:
  - 'No'      → urgent
  - 'Painful' → possible
  - 'Yes' + droop text → possible (soft surface, don't override user)
  - ''  + droop text → urgent (text-pattern fallback)"
```

---

## Task 8: Boutonnière — structured intake replaces free-text dependency

Path fix per spec §2.5. Same shape as Task 7.

**Files:**
- Modify: [src/triage.py:1015-1021](../../src/triage.py#L1015)
- Test: [tests/test_finger_triage.py](../../tests/test_finger_triage.py)

- [ ] **Step 1: Write failing tests**

Append:

```python
class TestBoutonniereStructured(unittest.TestCase):
    """Per spec §2.5: same conflict-resolution pattern as mallet."""

    def test_boutonniere_structured_no_fires_urgent_without_text(self):
        i = Intake(region="Finger", can_straighten_middle_joint="No")
        b = next((b for b in bucket_possibilities(i) if b.id == "boutonniere"), None)
        self.assertIsNotNone(b)
        self.assertEqual(b.qualifier, "urgent")

    def test_boutonniere_structured_painful_fires_possible(self):
        i = Intake(region="Finger", can_straighten_middle_joint="Painful")
        b = next((b for b in bucket_possibilities(i) if b.id == "boutonniere"), None)
        self.assertIsNotNone(b)
        self.assertEqual(b.qualifier, "possible")

    def test_boutonniere_yes_plus_text_fires_possible(self):
        i = Intake(region="Finger", can_straighten_middle_joint="Yes",
                   free_text="can't straighten my middle joint")
        b = next((b for b in bucket_possibilities(i) if b.id == "boutonniere"), None)
        self.assertIsNotNone(b)
        self.assertEqual(b.qualifier, "possible")

    def test_boutonniere_text_fallback_when_structured_empty(self):
        i = Intake(region="Finger", free_text="boutonniere deformity")
        b = next((b for b in bucket_possibilities(i) if b.id == "boutonniere"), None)
        self.assertIsNotNone(b)
        self.assertEqual(b.qualifier, "urgent")

    def test_boutonniere_yes_no_text_does_not_fire(self):
        i = Intake(region="Finger", can_straighten_middle_joint="Yes")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertNotIn("boutonniere", ids)
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/mathewbudnik/coretriage && python -m unittest tests.test_finger_triage.TestBoutonniereStructured -v
```

- [ ] **Step 3: Update the surfacing code**

Edit [src/triage.py:1015-1021](../../src/triage.py#L1015). Replace:

```python
        # Boutonnière — extensor central slip rupture, 72-hour splint window
        # Phase 1: structured intake (can_straighten_middle_joint) takes
        # precedence over free-text. Same conflict-resolution as mallet.
        boutonniere_text = any(
            p in text_l for p in ("can't straighten", "won't extend", "stuck bent",
                                  "boutonniere", "boutonnière", "joint won't")
        )
        if i.can_straighten_middle_joint == "No":
            out.append(Bucket.from_id("boutonniere", qualifier="urgent"))
        elif i.can_straighten_middle_joint == "Painful":
            out.append(Bucket.from_id("boutonniere", qualifier="possible"))
        elif i.can_straighten_middle_joint == "Yes" and boutonniere_text:
            out.append(Bucket.from_id("boutonniere", qualifier="possible"))
        elif i.can_straighten_middle_joint == "" and boutonniere_text:
            out.append(Bucket.from_id("boutonniere", qualifier="urgent"))
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/mathewbudnik/coretriage && python -m unittest tests.test_finger_triage.TestBoutonniereStructured -v
```

- [ ] **Step 5: Run full test suite**

```bash
cd /Users/mathewbudnik/coretriage && python -m unittest discover tests 2>&1 | tail -5
```

- [ ] **Step 6: Commit**

```bash
cd /Users/mathewbudnik/coretriage && git add src/triage.py tests/test_finger_triage.py && git commit -m "fix(triage): boutonniere structured intake replaces free-text

Same pattern as mallet_finger: 72-hour splint window relies on
structured can_straighten_middle_joint field rather than fragile
free-text matching."
```

---

## Task 9: Loosen `pip_synovitis` to include stiffness text

Path fix per spec §2.6.

**Files:**
- Modify: [src/triage.py:1080-1081](../../src/triage.py#L1080)
- Test: [tests/test_finger_triage.py](../../tests/test_finger_triage.py)

- [ ] **Step 1: Write failing test**

```python
class TestPipSynovitisLoosened(unittest.TestCase):
    """Per spec §2.6: fire on Gradual + palm_mid + (swelling OR stiffness text)."""

    def test_pip_synovitis_with_swelling_still_fires(self):
        i = Intake(region="Finger", onset="Gradual",
                   finger_location="palm_mid", swelling="Yes")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertIn("pip_synovitis", ids)

    def test_pip_synovitis_with_stiff_morning_text_fires(self):
        i = Intake(region="Finger", onset="Gradual",
                   finger_location="palm_mid", swelling="No",
                   free_text="stiff in the morning")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertIn("pip_synovitis", ids)

    def test_pip_synovitis_with_ache_text_fires(self):
        i = Intake(region="Finger", onset="Gradual",
                   finger_location="palm_mid", swelling="No",
                   free_text="dull ache in middle joint")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertIn("pip_synovitis", ids)

    def test_pip_synovitis_no_swelling_no_text_does_not_fire(self):
        i = Intake(region="Finger", onset="Gradual",
                   finger_location="palm_mid", swelling="No",
                   free_text="sharp pain")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertNotIn("pip_synovitis", ids)
```

- [ ] **Step 2: Run tests**

```bash
cd /Users/mathewbudnik/coretriage && python -m unittest tests.test_finger_triage.TestPipSynovitisLoosened -v
```

Expected: 2 FAIL (the new stiffness/ache text-pattern paths).

- [ ] **Step 3: Update the surfacing code**

Edit [src/triage.py:1080-1081](../../src/triage.py#L1080). Replace:

```python
        # PIP synovitis — gradual middle-finger pain with stiffness or swelling
        # Phase 1: loosened to fire on stiffness text patterns even without
        # visible swelling (per Frontiers 2023 case report).
        pip_stiffness_text = any(t in text_l for t in ("stiff", "morning", "ache"))
        if i.onset == "Gradual" and loc == "palm_mid" and (
            i.swelling == "Yes" or pip_stiffness_text
        ):
            out.append(Bucket.from_id("pip_synovitis", qualifier="likely"))
```

- [ ] **Step 4: Run tests**

```bash
cd /Users/mathewbudnik/coretriage && python -m unittest tests.test_finger_triage.TestPipSynovitisLoosened -v
```

- [ ] **Step 5: Run full suite**

```bash
cd /Users/mathewbudnik/coretriage && python -m unittest discover tests 2>&1 | tail -5
```

- [ ] **Step 6: Commit**

```bash
cd /Users/mathewbudnik/coretriage && git add src/triage.py tests/test_finger_triage.py && git commit -m "fix(triage): pip_synovitis fires on stiffness text without swelling

Per Frontiers 2023, many climbers present with stiffness/dull ache
without visible swelling. Add stiff/morning/ache text patterns as
alternative trigger to the swelling flag."
```

---

## Task 10: Broaden `sagittal_band_rupture` text patterns + sync signalChips

Path fix per spec §2.7. Frontend ↔ backend keyword contract must stay in sync.

**Files:**
- Modify: [src/triage.py:1053-1059](../../src/triage.py#L1053)
- Modify: [frontend/src/data/signalChips.js](../../frontend/src/data/signalChips.js)
- Test: [tests/test_finger_triage.py](../../tests/test_finger_triage.py) + [tests/test_signal_chips_keywords.py](../../tests/test_signal_chips_keywords.py)

- [ ] **Step 1: Read the current signalChips.js structure**

```bash
grep -nE '(sagittal|knuckle|tendon)' /Users/mathewbudnik/coretriage/frontend/src/data/signalChips.js | head -10
```

Identify how signal chips are registered. Likely a chip with `keywords` array that mirrors what `triage.py` text-matches against.

- [ ] **Step 2: Write failing tests**

```python
class TestSagittalBandPatterns(unittest.TestCase):
    """Per spec §2.7: broaden patterns to include climber-natural phrasing."""

    def test_existing_pop_on_top_still_fires(self):
        i = Intake(region="Finger", which_finger="Middle",
                   finger_location="dorsal", free_text="pop on top of knuckle")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertIn("sagittal_band_rupture", ids)

    def test_snapping_over_knuckle_fires(self):
        i = Intake(region="Finger", which_finger="Middle",
                   finger_location="dorsal", free_text="snapping over knuckle")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertIn("sagittal_band_rupture", ids)

    def test_knuckle_catches_fires(self):
        i = Intake(region="Finger", which_finger="Ring",
                   finger_location="dorsal", free_text="my knuckle catches when I move it")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertIn("sagittal_band_rupture", ids)

    def test_extensor_pops_fires(self):
        i = Intake(region="Finger", which_finger="Middle",
                   finger_location="dorsal", free_text="extensor pops")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertIn("sagittal_band_rupture", ids)
```

- [ ] **Step 3: Run tests**

```bash
cd /Users/mathewbudnik/coretriage && python -m unittest tests.test_finger_triage.TestSagittalBandPatterns -v
```

Expected: 3 FAIL (the new patterns).

- [ ] **Step 4: Update the surfacing code**

Edit [src/triage.py:1053-1059](../../src/triage.py#L1053). Add the new patterns:

```python
        # Sagittal band rupture — dorsal middle/ring finger snap over knuckle
        # Phase 1: broadened text patterns to match climber-natural phrasing.
        sb_signals = any(p in text_l for p in (
            "pop on top", "tendon shifts", "tendon slips", "knuckle pops",
            "snapping over knuckle", "knuckle catches", "tendon snaps", "extensor pops",
        ))
        if loc == "dorsal" and wf in {"Middle", "Ring"} and sb_signals:
            out.append(Bucket.from_id("sagittal_band_rupture", qualifier="likely"))
```

- [ ] **Step 5: Run finger tests**

```bash
cd /Users/mathewbudnik/coretriage && python -m unittest tests.test_finger_triage.TestSagittalBandPatterns -v
```

Expected: 4 PASS.

- [ ] **Step 6: Update signalChips.js to mirror the new patterns**

Read [frontend/src/data/signalChips.js](../../frontend/src/data/signalChips.js) and find the chip whose keywords match sagittal-band phrasing (likely a "knuckle pop" or "tendon shift" chip). Add the new patterns to its `keywords` array:

```javascript
// In the chip definition for sagittal-band-related phrasing:
keywords: [
  "pop on top", "tendon shifts", "tendon slips", "knuckle pops",
  "snapping over knuckle", "knuckle catches", "tendon snaps", "extensor pops",
],
```

Exact field name depends on the chip's existing shape — match it.

- [ ] **Step 7: Run the keyword-contract regression test**

```bash
cd /Users/mathewbudnik/coretriage && python -m unittest tests.test_signal_chips_keywords -v
```

Expected: PASS. If FAIL, the chips and triage.py patterns are out of sync — re-check both.

- [ ] **Step 8: Run full suite**

```bash
cd /Users/mathewbudnik/coretriage && python -m unittest discover tests 2>&1 | tail -5
```

- [ ] **Step 9: Commit**

```bash
cd /Users/mathewbudnik/coretriage && git add src/triage.py frontend/src/data/signalChips.js tests/test_finger_triage.py && git commit -m "fix(triage): sagittal_band patterns include climber-natural phrasing

Most climbers describe this as 'snapping over the knuckle' rather than
the technical 'tendon slips' phrasing. Adds 4 new text patterns to
both the backend pattern set and the frontend signalChips contract."
```

---

## Task 11: New bucket — `epiphyseal_stress_fx`

Pediatric finger growth-plate stress fracture. Career-ending if missed. Always-urgent, inserted at index 0 for under-18 climbers with finger region.

**Files:**
- Modify: [src/bucket_content.py](../../src/bucket_content.py)
- Modify: [src/triage.py:987](../../src/triage.py#L987) (top of finger branch)
- Test: [tests/test_finger_triage.py](../../tests/test_finger_triage.py) + [tests/test_bucket_content.py](../../tests/test_bucket_content.py)

- [ ] **Step 1: Research the bucket via WebSearch**

Run these searches and read 2-3 relevant results to gather sources:

```
"Schöffl epiphyseal stress fracture climbing finger 2022"
"Salter-Harris III adolescent climber finger growth plate"
"pediatric climbing finger injury algorithm"
```

Primary source to cite (already identified in spec): [Schöffl V et al. Diagnostic-Therapeutic Algorithm for Finger Epiphyseal Growth Plate Stress Injuries in Adolescent Climbers. 2022](https://journals.sagepub.com/doi/10.1177/03635465211056956).

Note key clinical facts: typical location (proximal/middle phalanx growth plate), typical age (10-17), mechanism (high-volume crimping), key differential (looks like ordinary finger pain on soft-tissue triage), management (immediate cessation of high-load crimping, hand specialist evaluation, X-ray, possible MRI).

- [ ] **Step 2: Write failing tests**

```python
class TestEpiphysealStressFx(unittest.TestCase):
    """Per spec §1.1: always urgent, inserted at index 0 for under-18
    + finger + (Hard crimp OR not Sudden onset)."""

    def test_fires_for_under_14_finger_hard_crimp(self):
        i = Intake(region="Finger", age_band="under_14", mechanism="Hard crimp")
        buckets = bucket_possibilities(i)
        self.assertEqual(buckets[0].id, "epiphyseal_stress_fx",
                         "must be at index 0 to override other finger differentials")
        self.assertEqual(buckets[0].qualifier, "urgent")

    def test_fires_for_14_to_17_finger_gradual(self):
        i = Intake(region="Finger", age_band="14_to_17", onset="Gradual")
        buckets = bucket_possibilities(i)
        self.assertEqual(buckets[0].id, "epiphyseal_stress_fx")

    def test_does_not_fire_for_adult(self):
        i = Intake(region="Finger", age_band="18_to_29", mechanism="Hard crimp")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertNotIn("epiphyseal_stress_fx", ids)

    def test_does_not_fire_for_50_plus(self):
        i = Intake(region="Finger", age_band="50_plus", mechanism="Hard crimp")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertNotIn("epiphyseal_stress_fx", ids)

    def test_does_not_fire_for_empty_age_band(self):
        i = Intake(region="Finger", age_band="", mechanism="Hard crimp")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertNotIn("epiphyseal_stress_fx", ids)

    def test_does_not_fire_for_under_14_non_finger_region(self):
        i = Intake(region="Knee", age_band="under_14", mechanism="Heel hook")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertNotIn("epiphyseal_stress_fx", ids)

    def test_does_not_fire_for_under_14_sudden_onset(self):
        # Sudden injuries are acute trauma, not stress fx — wrong differential
        i = Intake(region="Finger", age_band="under_14", onset="Sudden",
                   mechanism="Fall")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertNotIn("epiphyseal_stress_fx", ids)
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd /Users/mathewbudnik/coretriage && python -m unittest tests.test_finger_triage.TestEpiphysealStressFx -v
```

Expected: 2-3 FAIL (the ones expecting the bucket to fire — the "doesn't fire" tests already pass since the bucket doesn't exist).

- [ ] **Step 4: Add the bucket content**

Edit [src/bucket_content.py](../../src/bucket_content.py). Add a new entry in the BUCKET_CONTENT dict, alphabetically near other finger entries. Draft the content from your research in Step 1:

```python
    "epiphyseal_stress_fx": {
        "base_title": "Finger growth plate stress injury (adolescent)",
        "why": "In climbers under ~17, high-load crimping can cause stress fractures of the finger growth plate (Salter-Harris III at the proximal interphalangeal joint). Looks like ordinary finger pain on the surface but can be career-ending if missed.",
        "matches_if": [
            "You are under 18 and finger pain has developed gradually with crimping.",
            "Pain is at a finger joint (PIP most common) rather than along a tendon.",
            "Swelling, tenderness, or stiffness at the joint without a clear single-incident mechanism.",
            "Pain worsens with full crimping (closed crimp) more than open-hand grips.",
        ],
        "not_likely_if": [
            "You are over 18 (growth plates have closed).",
            "Pain started suddenly during a single move with a clear pop or tear (more likely acute soft-tissue injury).",
        ],
        "quick_test": "Press directly on the PIP joint bone (top/side of the middle joint). Sharp localized tenderness on the bone — not the tendon — raises concern. STOP crimping until a hand specialist evaluates.",
        "reasoning_basis": "Per Schöffl et al. (2022), pediatric climbing finger injuries differ from adult injuries because growth plates remain open until age 14-17. Repetitive high-load crimping (especially full crimp) generates compressive forces at the PIP epiphysis that adolescent bone cannot remodel fast enough, producing Salter-Harris III stress fractures. The injury is often silent on initial soft-tissue exam — looks like generic finger pain — but X-ray and MRI reveal the underlying bone injury. Missed cases can lead to growth-plate closure abnormalities, joint deformity, and permanent inability to climb at high grades. Schöffl's diagnostic-therapeutic algorithm calls for immediate cessation of high-load crimping in any climber under 17 with insidious-onset finger joint pain, with hand specialist evaluation including X-ray within a week.",
        "sources": [
            {
                "name": "Schöffl V et al. 2022 — Diagnostic-Therapeutic Algorithm for Finger Epiphyseal Growth Plate Stress Injuries in Adolescent Climbers",
                "url": "https://journals.sagepub.com/doi/10.1177/03635465211056956",
            },
            {
                "name": "Schöffl V et al. 2015 — Injury Trends in Rock Climbers (911-injury case series)",
                "url": "https://journals.sagepub.com/doi/full/10.1016/j.wem.2014.08.013",
            },
        ],
    },
```

If your WebSearch turned up more recent/better sources than these, prefer them — match the existing quality bar.

- [ ] **Step 5: Add the surfacing rule**

Edit [src/triage.py](../../src/triage.py). Find the start of the finger branch in `bucket_possibilities()` (around [line 987](../../src/triage.py#L987)). At the VERY TOP of the finger branch (before any other Bucket.from_id calls), add the age-gated insert:

```python
    if "finger" in region:
        wf, loc, grip = i.which_finger, i.finger_location, i.grip_mode
        text_l = (i.free_text or "").lower()

        # ── EPIPHYSEAL STRESS FX (Phase 1) ─────────────────────────
        # Pediatric finger growth-plate stress fracture. Career-ending
        # if missed. Always surfaces FIRST for under-18 climbers with
        # crimping mechanism or insidious onset — overrides soft-tissue
        # differentials that would otherwise look more likely.
        if (
            i.age_band in {"under_14", "14_to_17"}
            and (i.mechanism == "Hard crimp" or i.onset != "Sudden")
        ):
            out.insert(0, Bucket.from_id("epiphyseal_stress_fx", qualifier="urgent"))

        # ── existing finger logic continues below ──
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd /Users/mathewbudnik/coretriage && python -m unittest tests.test_finger_triage.TestEpiphysealStressFx -v
```

Expected: 7 PASS.

- [ ] **Step 7: Run bucket-content schema test**

```bash
cd /Users/mathewbudnik/coretriage && python -m unittest tests.test_bucket_content -v 2>&1 | tail -10
```

Expected: PASS. The `epiphyseal_stress_fx` entry must have all required fields (matches_if ≥3 bullets, quick_test present, reasoning_basis ≥1 paragraph, sources ≥2 entries).

- [ ] **Step 8: Run full suite**

```bash
cd /Users/mathewbudnik/coretriage && python -m unittest discover tests 2>&1 | tail -5
```

- [ ] **Step 9: Commit**

```bash
cd /Users/mathewbudnik/coretriage && git add src/bucket_content.py src/triage.py tests/test_finger_triage.py && git commit -m "feat(triage): add epiphyseal_stress_fx bucket (adolescent pediatric)

Career-ending finger growth-plate stress fracture in climbers under
~17 per Schöffl 2022 diagnostic-therapeutic algorithm. Inserted at
index 0 of the finger differential list — overrides soft-tissue
differentials that would otherwise look more likely on intake.

Fires only when age_band in {under_14, 14_to_17} AND finger region
AND (Hard crimp mechanism OR non-Sudden onset)."
```

---

## Task 12: New bucket — `dip_capsulitis`

DIP joint capsulitis. Distinct from PIP synovitis.

**Files:**
- Modify: [src/bucket_content.py](../../src/bucket_content.py)
- Modify: [src/triage.py](../../src/triage.py) (finger branch)
- Test: [tests/test_finger_triage.py](../../tests/test_finger_triage.py)

- [ ] **Step 1: Research via WebSearch**

```
"DIP capsulitis climbing finger climbing doctor"
"distal interphalangeal joint capsulitis rock climbing"
"finger joint capsulitis rehab"
```

Primary sources already identified: [Frontiers 2023 capsulitis case](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2023.1185653/full) and [The Climbing Doctor DIP](https://theclimbingdoctor.com/dipcapsulitis/).

- [ ] **Step 2: Write failing tests**

```python
class TestDipCapsulitis(unittest.TestCase):
    """Per spec §1.2: gradual + palm_tip + (swelling or stiff/morning/ache text)."""

    def test_dip_capsulitis_with_swelling_fires_likely(self):
        i = Intake(region="Finger", onset="Gradual",
                   finger_location="palm_tip", swelling="Yes")
        dc = next((b for b in bucket_possibilities(i) if b.id == "dip_capsulitis"), None)
        self.assertIsNotNone(dc)
        self.assertEqual(dc.qualifier, "likely")

    def test_dip_capsulitis_with_stiff_text_fires(self):
        i = Intake(region="Finger", onset="Gradual",
                   finger_location="palm_tip", swelling="No",
                   free_text="stiff in the morning")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertIn("dip_capsulitis", ids)

    def test_dip_capsulitis_does_not_fire_for_sudden_onset(self):
        i = Intake(region="Finger", onset="Sudden",
                   finger_location="palm_tip", swelling="Yes")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertNotIn("dip_capsulitis", ids)

    def test_dip_capsulitis_does_not_fire_for_palm_mid(self):
        # palm_mid is PIP territory, not DIP
        i = Intake(region="Finger", onset="Gradual",
                   finger_location="palm_mid", swelling="Yes")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertNotIn("dip_capsulitis", ids)

    def test_dip_capsulitis_coexists_with_pulley_a4(self):
        # palm_tip + crimp could be both A4 (tendon-side) and DIP (joint-side)
        i = Intake(region="Finger", onset="Gradual",
                   finger_location="palm_tip", grip_mode="full_crimp",
                   swelling="Yes")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertIn("pulley_a4", ids)
        self.assertIn("dip_capsulitis", ids)
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd /Users/mathewbudnik/coretriage && python -m unittest tests.test_finger_triage.TestDipCapsulitis -v
```

- [ ] **Step 4: Add the bucket content**

Edit [src/bucket_content.py](../../src/bucket_content.py). Add:

```python
    "dip_capsulitis": {
        "base_title": "DIP joint capsulitis",
        "why": "Inflammation of the distal interphalangeal joint capsule (the small joint nearest the fingertip). Comes on gradually from repeated full-crimping that hyperextends the DIP. Distinct from A4 pulley pain — same area but joint-side rather than tendon-side.",
        "matches_if": [
            "Pain at the fingertip joint (DIP) developing gradually over weeks of crimping.",
            "Stiffness in the morning or after rest; warms up with movement.",
            "Dull ache rather than the sharp 'crimp pop' of a pulley.",
            "Swelling or thickening around the DIP joint may be visible.",
        ],
        "not_likely_if": [
            "Pain came on suddenly with a clear pop or tear.",
            "Pain is along the palm-side tendon between joints rather than at the joint itself.",
        ],
        "quick_test": "Bend and straighten the fingertip joint gently. Stiffness and dull ache through the range — without sharp tendon-side pain — suggests joint capsule rather than pulley.",
        "reasoning_basis": "Per the Frontiers 2023 case report on climbing finger joint capsulitis/synovitis and The Climbing Doctor's clinical reviews, repeated full-crimping that hyperextends the DIP joint stresses the joint capsule and surrounding synovium. Symptoms develop insidiously over weeks-to-months: stiffness, dull ache, mild swelling, sometimes nodular thickening. The differential matters because management differs from A4 pulley injury (which is in the same anatomical region but loads the tendon-pulley system, not the joint capsule). Pulley rehab prescribes graded tendon loading; capsulitis rehab prescribes capsular mobility work and a temporary shift away from full-crimp grips. Both can coexist in heavy crimpers.",
        "sources": [
            {
                "name": "Frontiers 2023 — Clinical management of finger joint capsulitis/synovitis in a rock climber",
                "url": "https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2023.1185653/full",
            },
            {
                "name": "The Climbing Doctor — DIP Joint Pain",
                "url": "https://theclimbingdoctor.com/dipcapsulitis/",
            },
        ],
    },
```

- [ ] **Step 5: Add the surfacing rule**

Edit [src/triage.py](../../src/triage.py). Add to the finger branch in `bucket_possibilities()`. Insert AFTER the pulley_a4 block (since DIP capsulitis is also palm_tip and we want both differentials to surface):

```python
        # DIP capsulitis (Phase 1) — joint-side palm_tip pain, gradual onset
        if (
            loc == "palm_tip"
            and i.onset == "Gradual"
            and (i.swelling == "Yes" or any(t in text_l for t in ("stiff", "morning", "ache")))
        ):
            out.append(Bucket.from_id("dip_capsulitis", qualifier="likely"))
```

- [ ] **Step 6: Run tests**

```bash
cd /Users/mathewbudnik/coretriage && python -m unittest tests.test_finger_triage.TestDipCapsulitis -v
```

- [ ] **Step 7: Run full suite**

```bash
cd /Users/mathewbudnik/coretriage && python -m unittest discover tests 2>&1 | tail -5
```

- [ ] **Step 8: Commit**

```bash
cd /Users/mathewbudnik/coretriage && git add src/bucket_content.py src/triage.py tests/test_finger_triage.py && git commit -m "feat(triage): add dip_capsulitis bucket (DIP joint capsulitis)

Distinct from PIP synovitis (middle joint) and A4 pulley (tendon-side
of same region). Joint capsule inflammation from repeated full-crimping
that hyperextends the DIP. Coexists with A4 pulley when both fire.

Per Frontiers 2023 + The Climbing Doctor."
```

---

## Task 13: New bucket — `flexor_tendon_rupture`

Isolated FDS or midsubstance FDP rupture. Distinct from jersey_finger's distal avulsion.

**Files:**
- Modify: [src/bucket_content.py](../../src/bucket_content.py)
- Modify: [src/triage.py](../../src/triage.py)
- Test: [tests/test_finger_triage.py](../../tests/test_finger_triage.py)

- [ ] **Step 1: Research via WebSearch**

```
"FDS rupture rock climbing case report"
"flexor digitorum superficialis tear climber"
"midsubstance FDP tear climbing"
```

Primary source: [JSAMS 2021 case report on isolated middle finger FDS rupture in a climber](https://www.sciencedirect.com/science/article/abs/pii/S2468122921001195). Second source: standard hand-surgery references on flexor tendon zone injuries.

- [ ] **Step 2: Write failing tests**

```python
class TestFlexorTendonRupture(unittest.TestCase):
    """Per spec §1.3: Sudden + severity>=7 + tear text + NOT palm_tip
    (palm_tip = jersey territory)."""

    def test_fires_for_sudden_severe_with_tear_text(self):
        i = Intake(region="Finger", onset="Sudden", severity=8,
                   finger_location="palm_mid", free_text="I tore something")
        ftr = next((b for b in bucket_possibilities(i) if b.id == "flexor_tendon_rupture"), None)
        self.assertIsNotNone(ftr)
        self.assertEqual(ftr.qualifier, "consider evaluation")

    def test_does_not_fire_for_palm_tip(self):
        # palm_tip + sudden + tear = jersey path, not flexor rupture
        i = Intake(region="Finger", onset="Sudden", severity=8,
                   finger_location="palm_tip", free_text="I tore something")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertNotIn("flexor_tendon_rupture", ids)

    def test_does_not_fire_for_gradual_onset(self):
        i = Intake(region="Finger", onset="Gradual", severity=8,
                   finger_location="palm_mid", free_text="I tore something")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertNotIn("flexor_tendon_rupture", ids)

    def test_does_not_fire_for_low_severity(self):
        i = Intake(region="Finger", onset="Sudden", severity=4,
                   finger_location="palm_mid", free_text="snapped")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertNotIn("flexor_tendon_rupture", ids)

    def test_does_not_fire_without_tear_text(self):
        i = Intake(region="Finger", onset="Sudden", severity=8,
                   finger_location="palm_mid", free_text="really painful")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertNotIn("flexor_tendon_rupture", ids)
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd /Users/mathewbudnik/coretriage && python -m unittest tests.test_finger_triage.TestFlexorTendonRupture -v
```

- [ ] **Step 4: Add the bucket content**

Edit [src/bucket_content.py](../../src/bucket_content.py):

```python
    "flexor_tendon_rupture": {
        "base_title": "Flexor tendon rupture (midsubstance / FDS isolated)",
        "why": "Rare tendon-substance tear of the flexor digitorum superficialis (FDS) or midsubstance flexor digitorum profundus (FDP) — distinct from the more common 'jersey finger' which is the FDP avulsion off the bone at the fingertip. Reported in climbers under explosive loading.",
        "matches_if": [
            "Sudden, severe finger pain during a hard pull — often with an audible pop or sense of tearing.",
            "Pain is NOT localized at the fingertip joint (which would suggest jersey finger).",
            "Difficulty bending the finger normally after the injury.",
            "May or may not have visible swelling depending on the tear location.",
        ],
        "not_likely_if": [
            "Pain is localized at the fingertip with inability to bend the tip — that pattern points to jersey finger.",
            "Onset was gradual rather than a single explosive incident.",
            "Severity is mild — flexor tendon ruptures present as severe acute pain.",
        ],
        "quick_test": "Try to flex the finger against resistance (have someone hold your finger straight while you try to curl it). Sharp pain, weakness, or a visible 'gap' along the palm-side tendon raises concern. Get hand-surgery evaluation rapidly.",
        "reasoning_basis": "While jersey finger (FDP avulsion at the distal phalanx) is the climbing-recognized flexor injury, isolated FDS ruptures and midsubstance FDP tears do occur — documented in case reports and case series. The clinical distinction matters because surgical management differs: avulsions are reattached at the bone; midsubstance tears require tendon-to-tendon repair in a different anatomical zone. Both present as sudden severe pain with loss of finger flexion, but the location of pain and the specific functional deficit (can't bend the tip vs can't bend the whole finger) help differentiate. This bucket is rare in climbing populations and surfaces at 'consider evaluation' rather than primary — its main role is to remind the user/clinician that the differential exists beyond jersey finger.",
        "sources": [
            {
                "name": "Schöffl V et al. 2021 — Unusual rupture of the middle finger FDS in a climber",
                "url": "https://www.sciencedirect.com/science/article/abs/pii/S2468122921001195",
            },
            {
                "name": "Schöffl V et al. 2015 — Injury Trends in Rock Climbers (911-injury case series)",
                "url": "https://journals.sagepub.com/doi/full/10.1016/j.wem.2014.08.013",
            },
        ],
    },
```

- [ ] **Step 5: Add the surfacing rule**

Edit [src/triage.py](../../src/triage.py). Add to the finger branch:

```python
        # Flexor tendon rupture (Phase 1) — rare midsubstance/FDS tear,
        # distinct from jersey_finger (distal FDP avulsion at palm_tip).
        if (
            i.onset == "Sudden"
            and i.severity >= 7
            and any(t in text_l for t in ("tore", "snapped", "pop", "ripped"))
            and loc != "palm_tip"
        ):
            out.append(Bucket.from_id("flexor_tendon_rupture", qualifier="consider evaluation"))
```

- [ ] **Step 6: Run tests**

```bash
cd /Users/mathewbudnik/coretriage && python -m unittest tests.test_finger_triage.TestFlexorTendonRupture -v
```

- [ ] **Step 7: Run full suite**

```bash
cd /Users/mathewbudnik/coretriage && python -m unittest discover tests 2>&1 | tail -5
```

- [ ] **Step 8: Commit**

```bash
cd /Users/mathewbudnik/coretriage && git add src/bucket_content.py src/triage.py tests/test_finger_triage.py && git commit -m "feat(triage): add flexor_tendon_rupture bucket (FDS / midsubstance FDP)

Distinct from jersey_finger (distal FDP avulsion at the bone).
Rare in climbing but documented (Schöffl 2021 FDS case). Surfaces at
'consider evaluation' since rare — main role is to remind that the
differential exists beyond jersey finger.

Fires on Sudden + severity>=7 + tear text + NOT palm_tip
(palm_tip would be the jersey path)."
```

---

## Task 14: New bucket — `thumb_ucl`

Thumb UCL sprain ("skier's thumb"). Closes the dead Thumb wizard path.

**Files:**
- Modify: [src/bucket_content.py](../../src/bucket_content.py)
- Modify: [src/triage.py](../../src/triage.py)
- Test: [tests/test_finger_triage.py](../../tests/test_finger_triage.py)

- [ ] **Step 1: Research via WebSearch**

```
"thumb UCL sprain climbing"
"skier's thumb rock climbing crack jam"
"thumb ulnar collateral ligament tear hand surgery"
"Stener lesion thumb UCL surgical indication"
```

Sources: general hand-surgery literature on thumb UCL sprain (Stener lesion, surgical decision). Climbing-specific case reports are sparse but the mechanism (forced thumb abduction during jam / fall) is clearly climbing-relevant. Cite the standard refs.

- [ ] **Step 2: Write failing tests**

```python
class TestThumbUcl(unittest.TestCase):
    """Per spec §1.4: any Thumb in finger region; likely if Sudden/jam/text,
    possible otherwise."""

    def test_fires_likely_for_thumb_sudden(self):
        i = Intake(region="Finger", which_finger="Thumb", onset="Sudden")
        t = next((b for b in bucket_possibilities(i) if b.id == "thumb_ucl"), None)
        self.assertIsNotNone(t)
        self.assertEqual(t.qualifier, "likely")

    def test_fires_likely_for_thumb_jam(self):
        i = Intake(region="Finger", which_finger="Thumb", grip_mode="jam")
        t = next((b for b in bucket_possibilities(i) if b.id == "thumb_ucl"), None)
        self.assertIsNotNone(t)
        self.assertEqual(t.qualifier, "likely")

    def test_fires_likely_for_thumb_with_jam_text(self):
        i = Intake(region="Finger", which_finger="Thumb",
                   free_text="jammed thumb in a crack")
        t = next((b for b in bucket_possibilities(i) if b.id == "thumb_ucl"), None)
        self.assertIsNotNone(t)
        self.assertEqual(t.qualifier, "likely")

    def test_fires_possible_for_thumb_gradual_no_signals(self):
        i = Intake(region="Finger", which_finger="Thumb", onset="Gradual")
        t = next((b for b in bucket_possibilities(i) if b.id == "thumb_ucl"), None)
        self.assertIsNotNone(t)
        self.assertEqual(t.qualifier, "possible")

    def test_does_not_fire_for_ring_finger(self):
        i = Intake(region="Finger", which_finger="Ring", onset="Sudden")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertNotIn("thumb_ucl", ids)

    def test_does_not_fire_for_non_finger_region(self):
        i = Intake(region="Wrist", which_finger="Thumb", onset="Sudden")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertNotIn("thumb_ucl", ids)
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd /Users/mathewbudnik/coretriage && python -m unittest tests.test_finger_triage.TestThumbUcl -v
```

- [ ] **Step 4: Add the bucket content**

Edit [src/bucket_content.py](../../src/bucket_content.py):

```python
    "thumb_ucl": {
        "base_title": "Thumb UCL sprain (\"skier's thumb\")",
        "why": "Sprain or rupture of the thumb's ulnar collateral ligament at the metacarpophalangeal joint. In climbing, happens when the thumb gets forced into abduction — typically during a jam in a crack, a fall caught with the thumb extended, or a powerful pinch that pries the thumb sideways.",
        "matches_if": [
            "Pain along the inside (palm-side) of the base of the thumb after a sudden incident.",
            "Swelling and bruising at the thumb MCP joint within 24 hours.",
            "Weakness when pinching against the index finger.",
            "Sense of laxity or instability when stressing the thumb sideways (especially toward the index finger).",
        ],
        "not_likely_if": [
            "Pain is at the thumb tip rather than the base.",
            "Onset was insidious over weeks with no specific incident (more likely arthritis or tendinopathy).",
        ],
        "quick_test": "Stabilize the thumb metacarpal with one hand and gently move the thumb sideways (away from the index finger). Pain and a sense of looseness — more than the uninjured thumb — raises concern for UCL sprain. A complete tear (Stener lesion) requires surgical evaluation, ideally within 1-2 weeks.",
        "reasoning_basis": "The thumb UCL stabilizes the metacarpophalangeal joint against radial-directed forces (forces pushing the thumb sideways away from the hand). In climbing, jam cracks that force the thumb into abduction and falls caught with the thumb extended are the typical mechanisms. Acute presentations ('skier's thumb' from the analogous ski-pole injury) require examination for the Stener lesion — a complete tear where the adductor aponeurosis becomes interposed between the torn ligament ends, preventing healing without surgical repair. Partial sprains heal with 4-6 weeks of immobilization. Chronic untreated tears ('gamekeeper's thumb') lead to persistent instability and pinch weakness, which is functionally devastating for climbing. The bucket exists primarily because the current triage wizard allows which_finger='Thumb' but the finger branch never branches on Thumb, leaving all Thumb selections to fall through to a clinically inappropriate catch-all.",
        "sources": [
            {
                "name": "Wikipedia — Skier's thumb (overview + Stener lesion)",
                "url": "https://en.wikipedia.org/wiki/Skier%27s_thumb",
            },
            {
                "name": "OrthoBullets — Thumb Collateral Ligament Injury",
                "url": "https://www.orthobullets.com/hand/6038/thumb-collateral-ligament-injury",
            },
        ],
    },
```

Replace the OrthoBullets URL if your WebSearch turned up a stronger climbing-specific source.

- [ ] **Step 5: Add the surfacing rule**

Edit [src/triage.py](../../src/triage.py). Add to the finger branch:

```python
        # Thumb UCL (Phase 1) — was a dead path (Thumb selectable in wizard,
        # nothing surfaced for it). Acute if Sudden/jam/text, possible otherwise.
        if wf == "Thumb":
            if (
                i.onset == "Sudden"
                or grip == "jam"
                or any(t in text_l for t in ("jammed thumb", "bent back", "caught my thumb"))
            ):
                out.append(Bucket.from_id("thumb_ucl", qualifier="likely"))
            else:
                out.append(Bucket.from_id("thumb_ucl", qualifier="possible"))
```

- [ ] **Step 6: Run tests**

```bash
cd /Users/mathewbudnik/coretriage && python -m unittest tests.test_finger_triage.TestThumbUcl -v
```

- [ ] **Step 7: Run full suite**

```bash
cd /Users/mathewbudnik/coretriage && python -m unittest discover tests 2>&1 | tail -5
```

- [ ] **Step 8: Commit**

```bash
cd /Users/mathewbudnik/coretriage && git add src/bucket_content.py src/triage.py tests/test_finger_triage.py && git commit -m "feat(triage): add thumb_ucl bucket + close dead Thumb wizard path

The wizard allows which_finger='Thumb' but the finger branch never
branched on Thumb — all Thumb selections silently fell through to
flexor_tenosynovitis catch-all. New bucket covers acute (skier's
thumb) and chronic (gamekeeper's) UCL injury, with climbing-specific
mechanisms (jam, fall caught with thumb)."
```

---

## Task 15: KB restructure — split `finger_pulley.md` into 4 files

Per spec §4.2. Better RAG citation granularity.

**Files:**
- Modify: [kb/finger_pulley.md](../../kb/finger_pulley.md) (trimmed)
- Create: [kb/finger_capsulitis_synovitis.md](../../kb/finger_capsulitis_synovitis.md)
- Create: [kb/finger_pediatric.md](../../kb/finger_pediatric.md)
- Create: [kb/thumb_injuries.md](../../kb/thumb_injuries.md)
- Create: [kb/finger_tendon_injuries.md](../../kb/finger_tendon_injuries.md)

- [ ] **Step 1: Read the current finger_pulley.md to map content sections**

```bash
grep -nE '^##' /Users/mathewbudnik/coretriage/kb/finger_pulley.md
```

This shows the H2 section headings. Map each section to which new file it should move to:
- Pulley sections (A2, A3, A4, biomechanics, taping) → stay in `finger_pulley.md`
- Mallet, jersey, boutonnière content → move to `finger_tendon_injuries.md` (plus add flexor rupture content)
- Trigger finger / tenosynovitis → move to `finger_tendon_injuries.md`
- PIP synovitis, capsulitis content → move to `finger_capsulitis_synovitis.md` (plus add DIP capsulitis)
- Anything pediatric / growth-plate → move to `finger_pediatric.md` (plus add epiphyseal stress fx)
- Anything thumb-specific → move to `thumb_injuries.md` (plus add thumb UCL)

- [ ] **Step 2: Create `kb/finger_tendon_injuries.md`**

Extract the relevant sections from `finger_pulley.md` (mallet, jersey, boutonnière, trigger finger, tenosynovitis). Add new content for `flexor_tendon_rupture` based on what you wrote in Task 13 step 4 (reasoning_basis + a few sentences expanded). Header:

```markdown
# Climbing-related flexor and extensor tendon injuries

Covers tendon-substance and tendon-attachment injuries of the fingers.
These differ from pulley injuries (which are the ligamentous bands
holding tendons to bone, not the tendons themselves).

## Mallet finger (extensor avulsion at DIP)
...

## Boutonnière (central slip rupture at PIP)
...

## Jersey finger (FDP avulsion at distal phalanx)
...

## Trigger finger (A1 pulley stenosing tenosynovitis)
...

## Flexor tenosynovitis
...

## Isolated FDS rupture / midsubstance FDP tear
[new content]
...
```

Each section: 3-5 paragraphs covering mechanism, presentation, exam, management, return-to-climb.

- [ ] **Step 3: Create `kb/finger_capsulitis_synovitis.md`**

Move PIP synovitis content out of `finger_pulley.md`. Add a new section for DIP capsulitis (use the content from Task 12 step 4 as the seed, expanded).

```markdown
# Climber finger joint capsulitis and synovitis

Inflammation of the finger joint capsule and synovium. Common in
climbers from repeated high-load crimping. Distinct from pulley
injuries (tendon system) and tendinopathies.

## PIP joint synovitis
...

## DIP joint capsulitis
[new content from Task 12]
...

## Differentiating capsulitis from pulley injury
...
```

- [ ] **Step 4: Create `kb/finger_pediatric.md`**

New file. Use the reasoning_basis from Task 11 step 4 as the seed.

```markdown
# Pediatric and adolescent climbing finger injuries

Special considerations for climbers under approximately age 17 whose
finger growth plates have not yet closed.

## Epiphyseal stress fracture (Salter-Harris III)
[content from Task 11]

## When to escalate to a hand specialist
...

## Return-to-climb guidance for adolescents post-injury
...
```

- [ ] **Step 5: Create `kb/thumb_injuries.md`**

New file. Use content from Task 14 step 4.

```markdown
# Thumb injuries in rock climbing

## Thumb UCL sprain (skier's thumb / gamekeeper's thumb)
[content from Task 14]

## Mechanism in climbing
- Jam cracks forcing thumb into abduction
- Falls caught with thumb extended
- Powerful pinches prying the thumb sideways

## Distinguishing acute UCL sprain from chronic instability
...

## Surgical decision (Stener lesion)
...
```

- [ ] **Step 6: Trim `finger_pulley.md` to pulley-only content**

Remove sections that moved to the new files. The file should now cover:
- A2, A3, A4 pulley anatomy
- Schöffl pulley injury grading (I-III)
- Crimp-grip mechanism
- Taping for support
- Pulley rehab principles

Anything tendon/joint/pediatric/thumb is now in the new files.

- [ ] **Step 7: Verify the retriever picks up the new files**

The retriever in [src/retriever.py:19-29](../../src/retriever.py#L19) loads all `.md` files in `kb/` eagerly on import. Verify by importing it:

```bash
cd /Users/mathewbudnik/coretriage && python -c "
from src.retriever import get_retriever
r = get_retriever()
print(f'Loaded {len(r.chunks)} KB files')
print('Files:', sorted([c.source for c in r.chunks]))
"
```

Expected output: 21 files loaded (was 17; added 4 new ones; finger_pulley still present but trimmed). All 4 new files should appear in the sorted list.

- [ ] **Step 8: Run full suite (no regressions in scenarios from KB changes)**

```bash
cd /Users/mathewbudnik/coretriage && python -m unittest discover tests 2>&1 | tail -5
```

- [ ] **Step 9: Commit**

```bash
cd /Users/mathewbudnik/coretriage && git add kb/finger_pulley.md kb/finger_capsulitis_synovitis.md kb/finger_pediatric.md kb/thumb_injuries.md kb/finger_tendon_injuries.md && git commit -m "docs(kb): split finger_pulley.md into 4 per-pattern files

Better RAG citation granularity. Each new bucket's content lives in a
file matching its anatomical/clinical category rather than all finger
content in one monolithic file.

  - finger_pulley.md         (trimmed to pulleys + biomechanics)
  - finger_tendon_injuries   (mallet, jersey, boutonnière, trigger,
                              tenosynovitis, flexor rupture)
  - finger_capsulitis_synovitis  (PIP synovitis + DIP capsulitis)
  - finger_pediatric         (epiphyseal stress fx + adolescent guidance)
  - thumb_injuries           (thumb UCL + thumb-specific patterns)"
```

---

## Task 16: Add 12 new regression scenarios

Per spec §5.2.

**Files:**
- Modify: [tests/run_all_scenarios.py](../../tests/run_all_scenarios.py)

- [ ] **Step 1: Read the scenario file structure**

```bash
head -100 /Users/mathewbudnik/coretriage/tests/run_all_scenarios.py
```

Identify the scenario data structure (likely a list of dicts with `name`, `intake`, `expected_buckets`, etc.) and follow the same shape.

- [ ] **Step 2: Append the 12 new scenarios**

Add to the scenarios list:

```python
# Phase 1 — Triage Coverage Expansion (Finger)
# See: docs/superpowers/specs/2026-05-26-triage-coverage-phase-1-finger-design.md
{
    "name": "P1-01: 15yo climber crimp pain → epiphyseal first",
    "intake": dict(region="Finger", age_band="14_to_17", mechanism="Hard crimp",
                   onset="Gradual"),
    "must_have": ["epiphyseal_stress_fx"],
    "must_be_first": "epiphyseal_stress_fx",
},
{
    "name": "P1-02: 12yo climber finger pain → epiphyseal overrides all",
    "intake": dict(region="Finger", age_band="under_14", mechanism="Hard crimp"),
    "must_have": ["epiphyseal_stress_fx"],
    "must_be_first": "epiphyseal_stress_fx",
},
{
    "name": "P1-03: 28yo DIP stiffness no swelling → dip_capsulitis likely",
    "intake": dict(region="Finger", age_band="18_to_29", onset="Gradual",
                   finger_location="palm_tip", swelling="No",
                   free_text="finger feels stiff in the morning"),
    "must_have": ["dip_capsulitis"],
},
{
    "name": "P1-04: Sudden severe finger pain + 'tore' + palm_mid → flexor_tendon_rupture",
    "intake": dict(region="Finger", onset="Sudden", severity=8,
                   finger_location="palm_mid", free_text="I tore something hard"),
    "must_have": ["flexor_tendon_rupture"],
},
{
    "name": "P1-05: Thumb forced abduction during jam → thumb_ucl likely",
    "intake": dict(region="Finger", which_finger="Thumb", onset="Sudden",
                   grip_mode="jam", free_text="jammed thumb in a crack"),
    "must_have": ["thumb_ucl"],
},
{
    "name": "P1-06: Pinky A2-region pain → pulley_a2 possible (broadened path)",
    "intake": dict(region="Finger", which_finger="Pinky",
                   finger_location="palm_mid", grip_mode="full_crimp"),
    "must_have": ["pulley_a2"],
},
{
    "name": "P1-07: Open-hand grip palm_mid → pulley_a2 possible (open_hand path)",
    "intake": dict(region="Finger", which_finger="Ring",
                   finger_location="palm_mid", grip_mode="open_hand"),
    "must_have": ["pulley_a2"],
},
{
    "name": "P1-08: Middle finger jersey-finger pattern → jersey consider eval",
    "intake": dict(region="Finger", which_finger="Middle", onset="Sudden",
                   grip_mode="jam", free_text="can't bend tip after a hard pull"),
    "must_have": ["jersey_finger"],
},
{
    "name": "P1-09: Mallet structured 'No' → mallet_finger urgent without text",
    "intake": dict(region="Finger", can_extend_fingertip="No"),
    "must_have": ["mallet_finger"],
},
{
    "name": "P1-10: Boutonniere structured 'No' → boutonniere urgent without text",
    "intake": dict(region="Finger", can_straighten_middle_joint="No"),
    "must_have": ["boutonniere"],
},
{
    "name": "P1-11: Gradual palm_mid + stiffness text no swelling → pip_synovitis",
    "intake": dict(region="Finger", onset="Gradual", finger_location="palm_mid",
                   swelling="No", free_text="stiff and achy in the morning"),
    "must_have": ["pip_synovitis"],
},
{
    "name": "P1-12: Sagittal band with 'snapping over knuckle' → sagittal_band_rupture",
    "intake": dict(region="Finger", which_finger="Middle",
                   finger_location="dorsal", free_text="snapping over knuckle"),
    "must_have": ["sagittal_band_rupture"],
},
```

Adjust the dict keys to match the existing scenario shape (likely `Intake` constructor args; the `must_be_first` key may need to be implemented in the runner if it doesn't exist).

- [ ] **Step 3: Run the scenario corpus**

```bash
cd /Users/mathewbudnik/coretriage && python tests/run_all_scenarios.py 2>&1 | tail -20
```

Expected: all existing scenarios pass + all 12 new scenarios pass.

- [ ] **Step 4: Commit**

```bash
cd /Users/mathewbudnik/coretriage && git add tests/run_all_scenarios.py && git commit -m "test(triage): add 12 Phase 1 finger scenarios

One per new bucket (4) + one per significant decision-tree fix (8).
Verifies end-to-end: intake construction → bucket_possibilities()
output ordering and contents."
```

---

## Task 17: Final verification + manual smoke

Walk the acceptance criteria from spec §6.

**Files:** (none)

- [ ] **Step 1: Run the entire test suite**

```bash
cd /Users/mathewbudnik/coretriage && python -m unittest discover tests -v 2>&1 | tail -30
```

Expected: All tests pass. Tally vs baseline (was X, now X+25 new unit tests + verify scenario corpus 100+ all pass).

- [ ] **Step 2: Run the scenario corpus one more time**

```bash
cd /Users/mathewbudnik/coretriage && python tests/run_all_scenarios.py 2>&1 | tail -10
```

Expected: 100% pass.

- [ ] **Step 3: Verify backend file scope honors preservation contract**

```bash
cd /Users/mathewbudnik/coretriage && git diff main..HEAD --stat | grep -E '\.(py|md|jsx?)$' | sort
```

Expected files modified/created:
- `src/triage.py` (modified)
- `src/bucket_content.py` (modified)
- `tests/test_finger_triage.py` (modified)
- `tests/run_all_scenarios.py` (modified)
- `kb/finger_*.md` (modified or created — 5 files)
- `kb/thumb_injuries.md` (created)
- `frontend/src/components/TriageTab.jsx` (modified)
- `frontend/src/data/signalChips.js` (modified)

Expected NOT in the diff:
- `main.py`, `database.py`, `src/billing.py`, `src/coach.py`, `src/email.py` (per spec §6 acceptance #12)
- `frontend/src/components/Recover*.jsx`, `frontend/src/components/RehabProtocol.jsx` (per spec §6 acceptance #11)

If anything outside this expected set is in the diff, investigate.

- [ ] **Step 4: Start the backend + frontend and do a smoke triage**

```bash
# In one terminal:
cd /Users/mathewbudnik/coretriage && source .venv/bin/activate && uvicorn main:app --reload
# In another terminal:
cd /Users/mathewbudnik/coretriage/frontend && npm run dev
```

Walk through these triages in the browser:
1. **Pediatric**: age_band="14-17", region=Finger, mechanism=Hard crimp → epiphyseal_stress_fx should appear as the first bucket
2. **DIP capsulitis**: age_band="18-29", region=Finger, finger_location=palm_tip, onset=Gradual, free_text="stiff in morning" → dip_capsulitis should appear
3. **Thumb UCL**: region=Finger, which_finger=Thumb, onset=Sudden, grip=jam → thumb_ucl should appear at "likely"
4. **Mallet structured**: region=Finger, can_extend_fingertip="No", no text → mallet_finger should appear at "urgent"
5. **Boutonnière structured**: region=Finger, can_straighten_middle_joint="No", no text → boutonniere should appear at "urgent"

Stop both servers.

- [ ] **Step 5: No commit** — verification only.

---

## Future work (NOT in this plan)

Per the roadmap doc:
- **Phase 2:** Wrist/elbow/shoulder content + chip-set fix (unblocks pec_major_tear and distal_biceps)
- **Phase 3:** Trunk/back/abs content (closes the Abs blackhole + adds spondylolysis for adolescents using the same age_band field added here)
- **Phase 4:** Lower extremity refinement (PCL, popliteus, patellofemoral, iliopsoas, meniscus heel-hook fix, hip_labral insidious fix) + cross-cutting `out[:4]` truncation audit

Each phase gets its own brainstorm → spec → plan → implementation cycle.
