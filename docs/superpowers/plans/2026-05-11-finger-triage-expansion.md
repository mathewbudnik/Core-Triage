# Finger Triage Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 9 new climbing-specific finger/hand injury patterns to the triage classifier and 3 new finger-only wizard screens (which finger / where on finger / grip mode) that drive richer discrimination logic.

**Architecture:** Bottom-up: bucket content → Intake dataclass + API model → Finger classifier rules (rewritten with TDD scenarios) → frontend INITIAL_FORM + API payload → 3 new conditional wizard screens → dynamic step routing → tour coachmarks.

**Tech Stack:** Python 3 + FastAPI + Pydantic (backend), React 18 + Framer Motion + React Router (frontend), unittest (Python tests).

**Spec:** [docs/superpowers/specs/2026-05-11-finger-triage-expansion-design.md](docs/superpowers/specs/2026-05-11-finger-triage-expansion-design.md)

---

## File map

**Created:**
- `tests/test_finger_triage.py` — 10 scenario tests for the rewritten Finger branch

**Modified:**
- `src/bucket_content.py` — append 9 new bucket entries
- `src/triage.py` — extend `Intake` dataclass; rewrite Finger branch in `bucket_possibilities()`
- `main.py` — extend `IntakeRequest` Pydantic model; forward 3 new fields into `Intake(...)`
- `frontend/src/components/TriageTab.jsx` — INITIAL_FORM, 3 new conditional step blocks, dynamic step routing
- `frontend/src/hooks/useTriageTour.js` — 3 new tips, step-shift logic for finger flow

**Not changed:**
- `frontend/src/components/BodyDiagram.jsx` (explicit non-goal)
- `frontend/src/api.js` (`triageIntake` already forwards the request body verbatim)
- Database schema (new fields are not persisted)

---

## Task 1 — Add 9 new bucket entries to BUCKET_CONTENT

**Files:**
- Modify: `src/bucket_content.py` — append entries to `BUCKET_CONTENT` dict

- [ ] **Step 1: Write the failing test**

Append to `tests/test_bucket_content.py`:

```python
class NewFingerBucketsPresentTests(unittest.TestCase):
    """Coverage check: every bucket ID referenced by the rewritten
    Finger classifier branch must have a BUCKET_CONTENT entry."""

    EXPECTED_NEW_IDS = [
        "pulley_a3", "pulley_a4", "volar_plate", "trigger_finger",
        "mallet_finger", "jersey_finger", "sagittal_band_rupture",
        "hamate_hook_fracture", "pip_synovitis",
    ]

    def test_all_new_finger_bucket_ids_present(self):
        for bid in self.EXPECTED_NEW_IDS:
            self.assertIn(bid, BUCKET_CONTENT, f"missing bucket id: {bid}")
            entry = BUCKET_CONTENT[bid]
            self.assertIn("base_title", entry)
            self.assertIn("why", entry)
            self.assertGreater(len(entry["base_title"]), 0)
            self.assertGreater(len(entry["why"]), 0)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/python -m unittest tests.test_bucket_content.NewFingerBucketsPresentTests -v`
Expected: FAIL with `missing bucket id: pulley_a3`

- [ ] **Step 3: Add the 9 new entries**

Find the end of the Finger section in `src/bucket_content.py` (after `"boutonniere"`). Insert these 9 entries immediately after the boutonniere entry, before the Wrist section starts:

```python
    "pulley_a3": {
        "base_title": "A3 pulley strain",
        "why": "Mid-finger palm-side pain, often on half-crimp or open-hand grips. Less common than A2.",
        "matches_if": [
            "Palm-side pain in the middle of the finger between the two main joints",
            "Worse on half-crimp or open-hand grips rather than full crimp",
            "Tender to press on the proximal third of the middle phalanx, palm side",
            "Often gradual onset rather than a discrete pop",
        ],
        "not_likely_if": [
            "Pain is at the base of the finger (consider A2 instead)",
            "Pain is at the tip near the DIP joint (consider A4 instead)",
            "Pain is on the side of the joint rather than palm side",
        ],
        "quick_test": "Press on the palm side of the middle of the finger while pulling on a half-crimp position. Localized pain in that exact spot is the A3 pattern.",
    },
    "pulley_a4": {
        "base_title": "A4 pulley strain",
        "why": "Palm-side pain at the finger tip, almost always full-crimp loading on small holds.",
        "matches_if": [
            "Sharp pain on the palm side of the finger near the DIP joint (last knuckle)",
            "Worse on full crimp on small, hard edges",
            "Tender to press at the distal third of the middle phalanx, palm side",
            "May have heard a small pop on a hard crimp move",
        ],
        "not_likely_if": [
            "Pain is at the base of the finger (consider A2)",
            "Pain is in the middle of the finger (consider A3)",
            "Pain is on the side of the joint or back of the finger",
        ],
        "quick_test": "Press at the distal end of the middle phalanx (just before the last knuckle) on the palm side. Sharp localized pain that reproduces during a small-edge full crimp is the A4 pattern.",
    },
    "volar_plate": {
        "base_title": "Volar plate injury (PIP)",
        "why": "PIP joint hyperextension injury — pain on the palm side or back of the middle joint after a jam or backward bend.",
        "matches_if": [
            "The finger was hyperextended or jammed backward at the moment of injury",
            "Pain and swelling at the middle finger joint (PIP), often on the palm side or front",
            "Joint feels stiff and reluctant to fully straighten or fully bend",
            "Often follows catching a fall, jamming on a hold, or a hold breaking unexpectedly",
        ],
        "not_likely_if": [
            "There was no hyperextension or jamming mechanism",
            "Pain is at the base or tip of the finger (palm side) rather than the middle joint",
        ],
        "quick_test": "Gently extend the middle joint backward by a few degrees. Pain and apprehension at the front or palm side of the joint is the volar plate pattern.",
    },
    "trigger_finger": {
        "base_title": "Trigger finger (stenosing tenosynovitis)",
        "why": "Catching or locking sensation when the finger bends or straightens, usually with chronic onset.",
        "matches_if": [
            "Finger catches, locks, or pops when you bend or straighten it",
            "Worst in the morning or after the finger has been still for a while",
            "Tender lump at the base of the finger on the palm side (A1 pulley region)",
            "Gradual onset rather than from a single event",
        ],
        "not_likely_if": [
            "Pain is from a discrete acute event with no catching sensation",
            "Pain is at the joints rather than at the base of the finger",
        ],
        "quick_test": "Slowly close and open the affected finger. A click, catch, or sudden release as the finger moves through its range is the trigger finger pattern.",
    },
    "mallet_finger": {
        "base_title": "Mallet finger (extensor tendon avulsion at DIP)",
        "why": "Cannot fully straighten the fingertip after a jam — the tip droops down. Time-sensitive.",
        "matches_if": [
            "The fingertip cannot be fully extended — it droops down at the last joint",
            "Often happened from a ball or hold hitting the end of the finger",
            "Pain and swelling at the back of the DIP joint",
            "The finger can still bend, but won't straighten the tip on its own",
        ],
        "not_likely_if": [
            "The fingertip extends fully when you try (just hurts)",
            "Pain is at the middle joint rather than at the tip",
        ],
        "quick_test": "Rest the back of the hand flat on a table with all fingers extended. If the affected fingertip cannot be straightened to match the others, this is the mallet pattern — see a clinician within 1 week for splinting.",
    },
    "jersey_finger": {
        "base_title": "Jersey finger (FDP avulsion)",
        "why": "Cannot bend the fingertip after a forceful grip pull — most often the ring finger. Surgical urgency.",
        "matches_if": [
            "Cannot actively bend the fingertip at the last joint, especially after a hard grip pull",
            "Almost always the ring finger, occasionally middle",
            "Often happened catching a fall, a hold popping off, or grabbing as something jerked away",
            "Pain in the palm or finger, sometimes with bruising along the palm",
        ],
        "not_likely_if": [
            "You can fully bend the fingertip on its own (even if painful)",
            "Mechanism was a backward bend rather than a forceful pull",
        ],
        "quick_test": "Hold the middle phalanx still and try to bend only the fingertip. If the tip cannot move at all on its own, this is the jersey pattern — see a hand surgeon within 7-14 days; surgical repair after that window is much harder.",
    },
    "sagittal_band_rupture": {
        "base_title": "Sagittal band rupture (boxer's knuckle)",
        "why": "Extensor tendon slips off the knuckle when the finger is bent — felt as a pop on the back of the hand.",
        "matches_if": [
            "Pain on the back of the hand at the knuckle (MCP joint)",
            "Tendon visibly slips to one side when the finger is bent",
            "Felt a pop on the top of the hand at the moment of injury",
            "Most common on the middle or ring finger MCP",
        ],
        "not_likely_if": [
            "Pain is on the palm side of the finger",
            "Tendon stays straight throughout the bend",
        ],
        "quick_test": "Make a fist slowly while watching the back of the hand. Visible side-to-side movement of the extensor tendon over the knuckle, with a clunk, is the sagittal band pattern.",
    },
    "hamate_hook_fracture": {
        "base_title": "Hook of hamate fracture",
        "why": "Ulnar-side palm pain near the pinky, usually from jamming or a forceful grip — often missed on standard X-rays.",
        "matches_if": [
            "Deep pain on the pinky side of the palm, just below the ring/pinky knuckles",
            "Often from a hand jam, crack climbing, or catching something heavy",
            "Tender to press at the hook of hamate (pinky-side palm, near the base of the heel of the hand)",
            "Pain worsens with strong grip pulling, especially on small holds with the pinky engaged",
        ],
        "not_likely_if": [
            "Pain is on the thumb side of the palm or wrist",
            "Pain is at a specific finger joint rather than deep in the palm",
        ],
        "quick_test": "Press firmly into the pinky-side palm just below the ring-finger knuckle. Sharp focal pain in this exact spot warrants imaging (often CT rather than plain X-ray) — hook of hamate fractures are easily missed.",
    },
    "pip_synovitis": {
        "base_title": "PIP joint synovitis",
        "why": "Chronic capsular swelling at the middle finger joint, common in long-time crimpers as a session-driven overuse.",
        "matches_if": [
            "Persistent puffy swelling at the middle finger joint that doesn't fully resolve",
            "Gradual onset over weeks or months, often related to high session volume",
            "Worse after climbing sessions, easier after a day off",
            "Joint feels stiff first thing in the morning",
        ],
        "not_likely_if": [
            "Acute onset from a single event with a clear pop",
            "Pain is at the base or tip of the finger rather than the middle joint",
        ],
        "quick_test": "Compare the size of the painful PIP joint to the same joint on the other hand. Persistent puffiness with no acute event points to capsular synovitis from chronic load.",
    },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `.venv/bin/python -m unittest tests.test_bucket_content.NewFingerBucketsPresentTests -v`
Expected: PASS — `test_all_new_finger_bucket_ids_present ... ok`

- [ ] **Step 5: Run the full bucket-content suite to confirm nothing regressed**

Run: `.venv/bin/python -m unittest tests.test_bucket_content tests.test_bucket -v`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/bucket_content.py tests/test_bucket_content.py
git commit -m "Add 9 new finger/hand injury bucket entries (A3/A4 pulley, volar plate, trigger, mallet, jersey, sagittal band, hamate hook, PIP synovitis)"
```

---

## Task 2 — Extend Intake dataclass with three new optional fields

**Files:**
- Modify: `src/triage.py:8-35` (the `Intake` dataclass)
- Test: `tests/test_finger_triage.py` (NEW)

- [ ] **Step 1: Create the new test file with a defaults-check**

Create `tests/test_finger_triage.py`:

```python
"""Tests for the rewritten Finger branch in bucket_possibilities()
and the new wizard fields (which_finger, finger_location, grip_mode)."""
from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.triage import Intake, bucket_possibilities  # noqa: E402


def _intake(**overrides) -> Intake:
    """Build an Intake with safe defaults; override only the fields a test cares about."""
    base = dict(
        region="Finger", onset="Sudden", pain_type="Sharp", severity=5,
        swelling="No", bruising="No", numbness="No", weakness="None",
        instability="No", mechanism="Hard crimp", free_text="",
    )
    base.update(overrides)
    return Intake(**base)


class IntakeNewFieldDefaultsTests(unittest.TestCase):
    def test_intake_accepts_new_fields(self):
        i = _intake(which_finger="Ring", finger_location="palm_mid", grip_mode="full_crimp")
        self.assertEqual(i.which_finger, "Ring")
        self.assertEqual(i.finger_location, "palm_mid")
        self.assertEqual(i.grip_mode, "full_crimp")

    def test_intake_new_fields_default_blank(self):
        i = _intake()
        self.assertEqual(i.which_finger, "")
        self.assertEqual(i.finger_location, "")
        self.assertEqual(i.grip_mode, "")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/python -m unittest tests.test_finger_triage -v`
Expected: FAIL — `TypeError: __init__() got an unexpected keyword argument 'which_finger'`

- [ ] **Step 3: Add the three fields to the Intake dataclass**

In `src/triage.py`, after the existing `bladder_bowel_change: bool = False` line at the end of the dataclass (around line 35), add:

```python
    # Finger-specific drill-down (Phase 6). Filled by the wizard only when
    # region == "Finger"; left blank otherwise. Drives the rewritten Finger
    # branch in bucket_possibilities(); blank values fall through to the
    # legacy generic fallback so existing callers keep working unchanged.
    which_finger: str = ""       # Index | Middle | Ring | Pinky | Thumb | Multiple | ""
    finger_location: str = ""    # palm_base | palm_mid | palm_tip | side | dorsal | whole | ""
    grip_mode: str = ""          # full_crimp | half_crimp | open_hand | pocket_1 | pocket_2 |
                                 # pinch | sloper | jam | not_climbing | ""
```

- [ ] **Step 4: Run test to verify it passes**

Run: `.venv/bin/python -m unittest tests.test_finger_triage.IntakeNewFieldDefaultsTests -v`
Expected: PASS — both tests green.

- [ ] **Step 5: Run the full triage calibration suite to confirm nothing regressed**

Run: `.venv/bin/python -m unittest tests.test_triage_calibration -v 2>&1 | tail -20`
Expected: all green (existing tests still pass because new fields are optional with defaults).

- [ ] **Step 6: Commit**

```bash
git add src/triage.py tests/test_finger_triage.py
git commit -m "Intake: add which_finger / finger_location / grip_mode optional fields"
```

---

## Task 3 — Forward new fields through the FastAPI handler

**Files:**
- Modify: `main.py:345-357` (IntakeRequest model) and `main.py:611-623` (Intake construction in `/api/triage` handler)

- [ ] **Step 1: Write the failing test**

Append to `tests/test_finger_triage.py`:

```python
class IntakeRequestForwardingTests(unittest.TestCase):
    """The FastAPI IntakeRequest must accept and forward the three new fields."""

    def test_intake_request_accepts_new_fields(self):
        from main import IntakeRequest
        req = IntakeRequest(
            region="Finger", onset="Sudden", pain_type="Sharp", severity=5,
            swelling="No", bruising="No", numbness="No", weakness="None",
            instability="No", mechanism="Hard crimp", free_text="",
            which_finger="Ring", finger_location="palm_mid", grip_mode="full_crimp",
        )
        self.assertEqual(req.which_finger, "Ring")
        self.assertEqual(req.finger_location, "palm_mid")
        self.assertEqual(req.grip_mode, "full_crimp")

    def test_intake_request_new_fields_default_blank(self):
        from main import IntakeRequest
        req = IntakeRequest(
            region="Finger", onset="Sudden", pain_type="Sharp", severity=5,
            swelling="No", bruising="No", numbness="No", weakness="None",
            instability="No", mechanism="Hard crimp",
        )
        self.assertEqual(req.which_finger, "")
        self.assertEqual(req.finger_location, "")
        self.assertEqual(req.grip_mode, "")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/python -m unittest tests.test_finger_triage.IntakeRequestForwardingTests -v`
Expected: FAIL — `ValidationError: extra inputs are not permitted` or `AttributeError: which_finger`.

- [ ] **Step 3: Extend the IntakeRequest model**

In `main.py`, replace the IntakeRequest class (around line 345):

```python
class IntakeRequest(BaseModel):
    region: str
    onset: str
    pain_type: str
    severity: int
    swelling: str
    bruising: str
    numbness: str
    weakness: str
    instability: str
    mechanism: str
    free_text: str = ""
    k: int = 4
    # Finger-specific drill-down (Phase 6). Optional with safe defaults so
    # pre-Phase-6 clients continue to work.
    which_finger: str = ""
    finger_location: str = ""
    grip_mode: str = ""
```

- [ ] **Step 4: Forward the three new fields when building the Intake**

In `main.py`, replace the Intake construction inside `/api/triage` (around line 611) so it forwards the three new fields:

```python
    intake = Intake(
        region=req.region,
        onset=req.onset,
        pain_type=req.pain_type,
        severity=req.severity,
        swelling=req.swelling,
        bruising=req.bruising,
        numbness=req.numbness,
        weakness=req.weakness,
        instability=req.instability,
        mechanism=req.mechanism,
        free_text=req.free_text,
        which_finger=req.which_finger,
        finger_location=req.finger_location,
        grip_mode=req.grip_mode,
    )
```

- [ ] **Step 5: Run test to verify it passes**

Run: `.venv/bin/python -m unittest tests.test_finger_triage.IntakeRequestForwardingTests -v`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add main.py tests/test_finger_triage.py
git commit -m "Backend: forward which_finger / finger_location / grip_mode through /api/triage"
```

---

## Task 4 — Rewrite Finger branch: urgent patterns (mallet, jersey)

**Files:**
- Modify: `src/triage.py` — Finger branch of `bucket_possibilities()`

- [ ] **Step 1: Write failing tests for the two urgent patterns**

Append to `tests/test_finger_triage.py`:

```python
class FingerUrgentPatternTests(unittest.TestCase):
    """Urgent finger patterns must surface first, regardless of other signals."""

    def test_mallet_finger_text_trigger(self):
        i = _intake(free_text="my fingertip droops and I can't extend tip")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertIn("mallet_finger", ids)
        self.assertEqual(ids.index("mallet_finger"), 0,
                         f"mallet_finger should surface first; got {ids}")

    def test_jersey_finger_ring_sudden_text(self):
        i = _intake(
            which_finger="Ring", onset="Sudden",
            free_text="grabbed a hold and now I can't bend tip on my ring finger",
        )
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertIn("jersey_finger", ids)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `.venv/bin/python -m unittest tests.test_finger_triage.FingerUrgentPatternTests -v`
Expected: FAIL — `mallet_finger` and `jersey_finger` not in the output IDs (current branch only has boutonniere).

- [ ] **Step 3: Replace the Finger branch with the new structure (urgent patterns first)**

Find the current Finger branch in `src/triage.py` (around line 959 — `if "finger" in region:`). Replace the ENTIRE branch (from the `if "finger" in region:` line through the `elif "wrist" in region:` line, NOT including the elif) with:

```python
    if "finger" in region:
        wf, loc, grip = i.which_finger, i.finger_location, i.grip_mode
        text_l = i.free_text.lower()

        # ── URGENT patterns first ─────────────────────────────────────────
        # Mallet finger — extensor avulsion at DIP, splint within 1 week
        if (
            "can't extend tip" in text_l
            or "cannot extend tip" in text_l
            or "tip droops" in text_l
            or "mallet" in text_l
        ):
            out.append(Bucket.from_id("mallet_finger", qualifier="urgent"))

        # Jersey finger — FDP avulsion, surgical within 7-14 days
        if (
            wf == "Ring"
            and i.onset == "Sudden"
            and (
                "can't bend tip" in text_l
                or "cannot bend tip" in text_l
                or "can't flex tip" in text_l
                or grip == "jam"
            )
        ):
            out.append(Bucket.from_id("jersey_finger", qualifier="urgent"))

        # Boutonnière — central slip rupture, splint within 72h
        if (
            "can't straighten" in text_l
            or "won't extend" in text_l
            or "stuck bent" in text_l
            or "boutonniere" in text_l
        ):
            out.append(Bucket.from_id("boutonniere", qualifier="urgent"))

        # (Remaining patterns added in subsequent tasks.)

    elif "wrist" in region:
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `.venv/bin/python -m unittest tests.test_finger_triage.FingerUrgentPatternTests -v`
Expected: PASS — both urgent patterns fire.

- [ ] **Step 5: Run the existing bucket-content coverage sweep**

Run: `.venv/bin/python -m unittest tests.test_bucket_content -v 2>&1 | tail -10`
Expected: still green (sweep tolerates branches that don't emit any bucket; only verifies IDs that DO emit have entries).

- [ ] **Step 6: Commit**

```bash
git add src/triage.py tests/test_finger_triage.py
git commit -m "Finger triage: rewrite branch with urgent patterns (mallet, jersey, boutonniere)"
```

---

## Task 5 — Finger branch: pulley patterns (A2, A4, A3)

**Files:**
- Modify: `src/triage.py` — Finger branch

- [ ] **Step 1: Write failing tests**

Append to `tests/test_finger_triage.py`:

```python
class FingerPulleyPatternTests(unittest.TestCase):
    def test_a2_ring_full_crimp_palm_mid(self):
        i = _intake(which_finger="Ring", finger_location="palm_mid", grip_mode="full_crimp")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertIn("pulley_a2", ids)
        # A2 should rank above A3/A4 when finger + location + grip all align
        self.assertLess(ids.index("pulley_a2"), ids.index("pulley_a4") + 100,
                        "pulley_a2 should surface for this combo")

    def test_a4_palm_tip_full_crimp(self):
        i = _intake(finger_location="palm_tip", grip_mode="full_crimp")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertIn("pulley_a4", ids)
        self.assertNotIn("pulley_a2", ids,
                         "A2 should not surface when location is palm_tip")

    def test_a3_palm_mid_half_crimp_pinky(self):
        # Pinky at palm_mid with half-crimp — not the A2 pattern (wrong finger),
        # not the A4 pattern (wrong location), should be A3.
        i = _intake(which_finger="Pinky", finger_location="palm_mid", grip_mode="half_crimp")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertIn("pulley_a3", ids)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `.venv/bin/python -m unittest tests.test_finger_triage.FingerPulleyPatternTests -v`
Expected: FAIL — none of `pulley_a2`, `pulley_a3`, `pulley_a4` surface yet.

- [ ] **Step 3: Add pulley rules**

In `src/triage.py`, inside the Finger branch (`if "finger" in region:`), after the boutonniere block and before the closing of the branch, add:

```python
        # ── PULLEY patterns ───────────────────────────────────────────────
        if (
            loc == "palm_mid"
            and grip in {"full_crimp", "half_crimp"}
            and wf in {"Ring", "Middle", "Index"}
        ):
            out.append(Bucket.from_id("pulley_a2", qualifier="most likely"))
        elif loc == "palm_tip" and grip in {"full_crimp", "half_crimp"}:
            out.append(Bucket.from_id("pulley_a4", qualifier="likely"))
        elif loc == "palm_mid" and grip in {"half_crimp", "open_hand"}:
            out.append(Bucket.from_id("pulley_a3", qualifier="possible"))
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `.venv/bin/python -m unittest tests.test_finger_triage.FingerPulleyPatternTests -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/triage.py tests/test_finger_triage.py
git commit -m "Finger triage: A2, A4, A3 pulley patterns keyed on location + grip"
```

---

## Task 6 — Finger branch: lumbrical, collateral, volar plate

**Files:**
- Modify: `src/triage.py` — Finger branch

- [ ] **Step 1: Write failing tests**

Append to `tests/test_finger_triage.py`:

```python
class FingerJointAndPocketPatternTests(unittest.TestCase):
    def test_lumbrical_pocket_palm_base(self):
        i = _intake(finger_location="palm_base", grip_mode="pocket_1")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertIn("lumbrical_tear", ids)

    def test_collateral_side_jam(self):
        i = _intake(finger_location="side", grip_mode="jam", onset="Sudden")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertIn("collateral_ligament_finger", ids)

    def test_volar_plate_dorsal_hyperextend_text(self):
        i = _intake(finger_location="dorsal", free_text="finger got jammed back hard")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertIn("volar_plate", ids)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `.venv/bin/python -m unittest tests.test_finger_triage.FingerJointAndPocketPatternTests -v`
Expected: FAIL — none of the three patterns surface yet.

- [ ] **Step 3: Add the three rules**

In `src/triage.py`, inside the Finger branch, after the pulley rules block, add:

```python
        # ── LUMBRICAL — pocket grip on the palmar lumbrical region ───────
        if grip in {"pocket_1", "pocket_2"} and loc in {"palm_base", "palm_mid"}:
            out.append(Bucket.from_id("lumbrical_tear", qualifier="likely"))

        # ── COLLATERAL — side-of-joint pain on sudden injury or jam ──────
        if loc == "side" and (i.onset == "Sudden" or grip == "jam"):
            out.append(Bucket.from_id("collateral_ligament_finger", qualifier="likely"))

        # ── VOLAR PLATE — dorsal/side joint pain with hyperextension text
        if loc in {"dorsal", "side"} and (
            "hyperextend" in text_l
            or "jammed back" in text_l
            or "bent backward" in text_l
            or "bent back" in text_l
        ):
            out.append(Bucket.from_id("volar_plate", qualifier="likely"))
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `.venv/bin/python -m unittest tests.test_finger_triage.FingerJointAndPocketPatternTests -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/triage.py tests/test_finger_triage.py
git commit -m "Finger triage: lumbrical (pocket), collateral (side+jam), volar plate (dorsal+hyperextend)"
```

---

## Task 7 — Finger branch: sagittal band, hamate hook, trigger finger, PIP synovitis

**Files:**
- Modify: `src/triage.py` — Finger branch

- [ ] **Step 1: Write failing tests**

Append to `tests/test_finger_triage.py`:

```python
class FingerRemainingPatternTests(unittest.TestCase):
    def test_sagittal_band_middle_dorsal_pop_top(self):
        i = _intake(
            which_finger="Middle", finger_location="dorsal",
            free_text="felt a pop on top of my knuckle",
        )
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertIn("sagittal_band_rupture", ids)

    def test_hamate_hook_pinky_jam(self):
        i = _intake(which_finger="Pinky", grip_mode="jam")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertIn("hamate_hook_fracture", ids)

    def test_trigger_finger_gradual_catch(self):
        i = _intake(onset="Gradual", free_text="finger catches when I close my hand")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertIn("trigger_finger", ids)

    def test_pip_synovitis_gradual_palm_mid_swelling(self):
        i = _intake(onset="Gradual", finger_location="palm_mid", swelling="Yes")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertIn("pip_synovitis", ids)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `.venv/bin/python -m unittest tests.test_finger_triage.FingerRemainingPatternTests -v`
Expected: FAIL — none of the four patterns surface yet.

- [ ] **Step 3: Add the four rules**

In `src/triage.py`, inside the Finger branch, after the volar plate block, add:

```python
        # ── SAGITTAL BAND — middle/ring extensor tendon slip ─────────────
        if loc == "dorsal" and wf in {"Middle", "Ring"} and (
            "pop on top" in text_l
            or "tendon shifts" in text_l
            or "tendon slips" in text_l
            or "knuckle pops" in text_l
        ):
            out.append(Bucket.from_id("sagittal_band_rupture", qualifier="likely"))

        # ── HAMATE HOOK — pinky-side palm pain from jamming ──────────────
        if wf == "Pinky" and (
            grip == "jam"
            or "pinky-side palm" in text_l
            or "ulnar palm" in text_l
            or "hamate" in text_l
        ):
            out.append(Bucket.from_id("hamate_hook_fracture", qualifier="consider evaluation"))

        # ── TRIGGER FINGER — chronic catching ────────────────────────────
        if i.onset == "Gradual" and (
            "catch" in text_l
            or "lock" in text_l
            or "stuck" in text_l
            or "trigger" in text_l
        ):
            out.append(Bucket.from_id("trigger_finger", qualifier="possible"))

        # ── PIP SYNOVITIS — chronic mid-joint swelling ───────────────────
        if i.onset == "Gradual" and loc == "palm_mid" and i.swelling == "Yes":
            out.append(Bucket.from_id("pip_synovitis", qualifier="common"))
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `.venv/bin/python -m unittest tests.test_finger_triage.FingerRemainingPatternTests -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/triage.py tests/test_finger_triage.py
git commit -m "Finger triage: sagittal band, hamate hook, trigger finger, PIP synovitis"
```

---

## Task 8 — Finger branch: legacy fallback + tail catch-all

**Files:**
- Modify: `src/triage.py` — Finger branch

- [ ] **Step 1: Write failing tests**

Append to `tests/test_finger_triage.py`:

```python
class FingerFallbackTests(unittest.TestCase):
    """When the user skips the new finger drill-down (blank fields),
    we fall back to legacy generic buckets so old clients still work."""

    def test_legacy_fallback_blank_fields_still_surfaces_pulley(self):
        # All new fields blank — should fall back to legacy logic.
        i = _intake(mechanism="Hard crimp", free_text="")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertIn("pulley_a2", ids,
                      "blank new fields should fall back and surface pulley_a2")
        self.assertIn("flexor_tenosynovitis", ids,
                      "legacy fallback should always surface generic tenosynovitis")

    def test_tail_catch_all_for_unmatched_specific_combo(self):
        # Pinky + palm_mid + full_crimp — no specific pulley rule matches
        # (A2 needs Ring/Middle/Index; A4 needs palm_tip; A3 needs half/open).
        # Tail catch-all should ensure flexor_tenosynovitis still surfaces.
        i = _intake(which_finger="Pinky", finger_location="palm_mid", grip_mode="full_crimp")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertIn("flexor_tenosynovitis", ids,
                      "tail catch-all should surface generic bucket when no pattern matches")
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `.venv/bin/python -m unittest tests.test_finger_triage.FingerFallbackTests -v`
Expected: FAIL — `pulley_a2` not in output for blank fields, `flexor_tenosynovitis` not in output for Pinky combo.

- [ ] **Step 3: Add fallback + tail catch-all**

In `src/triage.py`, inside the Finger branch, after the PIP synovitis block and BEFORE the `elif "wrist" in region:` line, add:

```python
        # ── LEGACY FALLBACK — when ALL new finger fields are blank ──────
        # Pre-Phase-6 clients and users who skipped the drill-down still get
        # sensible results via the original mechanism + free-text logic.
        if not any([wf, loc, grip]):
            pulley_signals = (
                i.mechanism in {"Hard crimp", "Dynamic catch", "Pocket",
                                "High volume pulling", "Steep climbing/board"}
                or "pulley" in text_l
                or "a2" in text_l
                or "a4" in text_l
            )
            if pulley_signals:
                out.append(Bucket.from_id("pulley_a2", qualifier="most likely"))
            if i.mechanism in {"Pocket", "Asymmetric hold"}:
                out.append(Bucket.from_id("lumbrical_tear", qualifier="possible"))
            out.append(Bucket.from_id("flexor_tenosynovitis", qualifier="possible"))
            out.append(Bucket.from_id("collateral_ligament_finger", qualifier="possible"))

        # ── TAIL CATCH-ALL — surface a generic bucket if none of the
        # specific rules above fired (e.g. Pinky + palm_mid + full_crimp,
        # which is a valid input that no pulley rule matches). Without this,
        # the user would see zero finger buckets and a confusing UI.
        _FINGER_BUCKET_PREFIXES = (
            "pulley", "lumbrical", "collateral", "volar", "trigger",
            "mallet", "jersey", "sagittal", "hamate", "pip_",
            "boutonniere", "flexor",
        )
        if not any(b.id.startswith(_FINGER_BUCKET_PREFIXES) for b in out):
            out.append(Bucket.from_id("flexor_tenosynovitis", qualifier="possible"))
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `.venv/bin/python -m unittest tests.test_finger_triage.FingerFallbackTests -v`
Expected: PASS.

- [ ] **Step 5: Run the full Finger triage suite to confirm the new branch is complete**

Run: `.venv/bin/python -m unittest tests.test_finger_triage -v 2>&1 | tail -30`
Expected: all green — every scenario class passes.

- [ ] **Step 6: Run the existing calibration suite to confirm nothing regressed**

Run: `.venv/bin/python -m unittest tests.test_bucket tests.test_bucket_content tests.test_triage_calibration -v 2>&1 | tail -20`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add src/triage.py tests/test_finger_triage.py
git commit -m "Finger triage: legacy fallback + tail catch-all so every combo surfaces a bucket"
```

---

## Task 9 — Frontend INITIAL_FORM + API payload

**Files:**
- Modify: `frontend/src/components/TriageTab.jsx` — INITIAL_FORM and `triageIntake` call

- [ ] **Step 1: Add three keys to INITIAL_FORM**

In `frontend/src/components/TriageTab.jsx`, find the `INITIAL_FORM` constant and replace it:

```js
const INITIAL_FORM = {
  region: '', onset: '', mechanism: '', pain_type: '',
  severity: 5, swelling: 'No', bruising: 'No',
  numbness: 'No', weakness: 'None', instability: 'No', free_text: '',
  // Finger-specific drill-down — only filled when region === 'Finger'
  which_finger: '', finger_location: '', grip_mode: '',
}
```

- [ ] **Step 2: Forward the new fields in the triageIntake call**

In `frontend/src/components/TriageTab.jsx`, find the `handleSubmit` function and the `triageIntake({...})` call (around line 657-674). Replace the call so it explicitly forwards the new fields:

```js
const data = await triageIntake({
  ...form,
  free_text: freeText ?? form.free_text,
  severity: Number(form.severity),
  which_finger: form.which_finger || '',
  finger_location: form.finger_location || '',
  grip_mode: form.grip_mode || '',
  k,
})
```

- [ ] **Step 3: Verify the file still compiles**

Run: `curl -s http://localhost:5173/src/components/TriageTab.jsx -o /dev/null -w "%{http_code}\n"`
Expected: `200`

(If 5173 isn't running, start the dev server first: `cd frontend && npm run dev` in another shell.)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/TriageTab.jsx
git commit -m "Frontend: extend INITIAL_FORM and API payload with finger drill-down fields"
```

---

## Task 10 — Frontend: three new conditional step blocks

**Files:**
- Modify: `frontend/src/components/TriageTab.jsx` — add three new step JSX blocks

- [ ] **Step 1: Add the three step constants**

Near the existing `STEP_TITLES` array in `frontend/src/components/TriageTab.jsx`, add a finger-specific titles array:

```js
const FINGER_STEP_TITLES = [
  { title: 'Which finger?',          sub: 'Pick the one bothering you most' },
  { title: 'Where on the finger?',   sub: 'The spot that hurts most' },
  { title: 'What grip were you using?', sub: 'When the pain started' },
]

const WHICH_FINGER_OPTIONS = [
  'Index', 'Middle', 'Ring', 'Pinky', 'Thumb', 'Multiple', 'Not sure',
]

const FINGER_LOCATION_OPTIONS = [
  { key: 'palm_base', label: 'Palm-side base (knuckle / A1 area)' },
  { key: 'palm_mid',  label: 'Palm-side middle (PIP / A2 area)' },
  { key: 'palm_tip',  label: 'Palm-side tip (DIP / A4 area)' },
  { key: 'side',      label: 'Side of a joint' },
  { key: 'dorsal',    label: 'Back of the finger' },
  { key: 'whole',     label: 'Whole finger' },
  { key: '',          label: 'Not sure' },
]

const GRIP_MODE_OPTIONS = [
  { key: 'full_crimp',     label: 'Full crimp' },
  { key: 'half_crimp',     label: 'Half crimp' },
  { key: 'open_hand',      label: 'Open hand / drag' },
  { key: 'pocket_1',       label: 'Pocket (1 finger)' },
  { key: 'pocket_2',       label: 'Pocket (2 fingers)' },
  { key: 'pinch',          label: 'Pinch' },
  { key: 'sloper',         label: 'Sloper' },
  { key: 'jam',            label: 'Jam (crack)' },
  { key: 'not_climbing',   label: 'Not climbing-related' },
  { key: '',               label: 'Not sure' },
]
```

- [ ] **Step 2: Add the three step JSX blocks**

In the wizard render section of `frontend/src/components/TriageTab.jsx`, find the existing step blocks (`{step === 0 && (...)}`, `{step === 1 && (...)}` etc.). Add three new blocks for the finger drill-down. They render only when both the step index matches AND the region is Finger. Use the existing OptionCard pattern. (Exact step indices land in Task 11; for now wire the blocks so the field is set when an option is tapped.)

Add these three blocks right after the existing Step 0 (region) block:

```jsx
{/* ── Finger-only — Which finger? ─────────────────────────────────── */}
{form.region === 'Finger' && step === 'finger_which' && (
  <div ref={tour.anchor('which-finger')} className="space-y-3">
    <p className="text-sm font-medium text-text mb-3">Which finger?</p>
    <div className="grid grid-cols-2 gap-3">
      {WHICH_FINGER_OPTIONS.map((opt) => (
        <OptionCard
          key={opt}
          selected={form.which_finger === opt}
          onClick={() => { set('which_finger', opt); setDirection(1); advance() }}
        >
          <p className="font-semibold text-text text-sm">{opt}</p>
        </OptionCard>
      ))}
    </div>
    <button
      onClick={() => { set('which_finger', ''); setDirection(1); advance() }}
      className="text-xs text-muted hover:text-accent transition-colors mt-3"
    >
      Skip — not sure
    </button>
  </div>
)}

{/* ── Finger-only — Where on the finger? ──────────────────────────── */}
{form.region === 'Finger' && step === 'finger_location' && (
  <div ref={tour.anchor('finger-location')} className="space-y-3">
    <p className="text-sm font-medium text-text mb-3">Where on the finger?</p>
    <div className="space-y-3">
      {FINGER_LOCATION_OPTIONS.map(({ key, label }) => (
        <OptionCard
          key={label}
          selected={form.finger_location === key && form._finger_location_label === label}
          onClick={() => {
            set('finger_location', key)
            set('_finger_location_label', label)
            setDirection(1); advance()
          }}
        >
          <p className="font-semibold text-text text-sm">{label}</p>
        </OptionCard>
      ))}
    </div>
  </div>
)}

{/* ── Finger-only — Grip mode at injury ───────────────────────────── */}
{form.region === 'Finger' && step === 'grip_mode' && (
  <div ref={tour.anchor('grip-mode')} className="space-y-3">
    <p className="text-sm font-medium text-text mb-3">What grip were you using?</p>
    <div className="grid grid-cols-2 gap-3">
      {GRIP_MODE_OPTIONS.map(({ key, label }) => (
        <OptionCard
          key={label}
          selected={form.grip_mode === key && form._grip_mode_label === label}
          onClick={() => {
            set('grip_mode', key)
            set('_grip_mode_label', label)
            setDirection(1); advance()
          }}
        >
          <p className="font-semibold text-text text-sm">{label}</p>
        </OptionCard>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 3: Verify Vite serves the file**

Run: `curl -s http://localhost:5173/src/components/TriageTab.jsx -o /dev/null -w "%{http_code}\n"`
Expected: `200`. (The step keys `finger_which`, `finger_location`, `grip_mode` aren't recognised yet — the blocks won't actually render. That's fine; Task 11 wires routing.)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/TriageTab.jsx
git commit -m "Frontend: scaffold three finger-only step blocks (which / where / grip)"
```

---

## Task 11 — Frontend: dynamic step routing (5 vs 8 steps)

**Files:**
- Modify: `frontend/src/components/TriageTab.jsx` — replace fixed `TOTAL_STEPS = 5` with dynamic flow

- [ ] **Step 1: Replace the static slug array with a flow function**

In `frontend/src/components/TriageTab.jsx`, replace the `TOTAL_STEPS` constant and `STEP_SLUGS` array (around lines 166-170):

```js
// Step flow is dynamic: Finger region inserts three drill-down steps between
// the region picker and the onset/mechanism step.
const BASE_FLOW = ['', 'onset', 'symptoms', 'details', 'finish']
const FINGER_FLOW = ['', 'finger_which', 'finger_location', 'grip_mode',
                     'onset', 'symptoms', 'details', 'finish']

function flowFor(region) {
  return region === 'Finger' ? FINGER_FLOW : BASE_FLOW
}
const RESULTS_SLUG = 'results'
```

- [ ] **Step 2: Update `pathToStep` and `stepToPath` to use the dynamic flow**

Replace the two helper functions:

```js
function pathToStep(pathname, region) {
  const seg = pathname.replace(/^\/triage\/?/, '').split('/')[0]
  if (seg === RESULTS_SLUG) return 'results'
  const flow = flowFor(region)
  const idx = flow.indexOf(seg)
  return idx >= 0 ? idx : 0
}

function stepToPath(step, region) {
  if (step === 'results') return `/triage/${RESULTS_SLUG}`
  const flow = flowFor(region)
  const slug = flow[step] || ''
  return slug ? `/triage/${slug}` : '/triage'
}
```

- [ ] **Step 3: Update call sites in the component to pass the region**

Inside the `TriageTab` component, find every call to `pathToStep(...)` and `stepToPath(...)`. Update them so they pass `form.region` as the second argument. Also replace the `step === N` integer comparisons in the step blocks with slug-based comparisons via the current flow.

Replace the `urlStep` derivation:

```js
const urlStep = pathToStep(location.pathname, form.region)
const step = urlStep === 'results' ? 0 : urlStep
const isResultsRoute = urlStep === 'results'
const flow = flowFor(form.region)
const TOTAL_STEPS = flow.length
const currentSlug = flow[step] || ''
```

Replace the `step === N` checks in the existing step blocks with slug-based checks:

```js
{currentSlug === '' && (
  /* existing Step 0 — region picker, BodyDiagram */
)}
{currentSlug === 'onset' && (
  /* existing onset + mechanism block */
)}
{currentSlug === 'symptoms' && (
  /* existing severity + pain_type block */
)}
{currentSlug === 'details' && (
  /* existing symptoms checkboxes block */
)}
{currentSlug === 'finish' && (
  /* existing FreeTextStep block */
)}
```

And replace the new finger-only blocks from Task 10 to use slugs:

```jsx
{currentSlug === 'finger_which' && form.region === 'Finger' && ( /* Which finger? */ )}
{currentSlug === 'finger_location' && form.region === 'Finger' && ( /* Where? */ )}
{currentSlug === 'grip_mode' && form.region === 'Finger' && ( /* Grip mode? */ )}
```

Update `advance()` and `retreat()` to use the dynamic flow:

```js
const advance = useCallback(() => {
  setDirection(1)
  const next = Math.min(step + 1, TOTAL_STEPS - 1)
  navigate(stepToPath(next, form.region))
}, [step, TOTAL_STEPS, form.region, navigate])

const retreat = useCallback(() => {
  setDirection(-1)
  const prev = Math.max(step - 1, 0)
  navigate(stepToPath(prev, form.region))
}, [step, form.region, navigate])
```

And update `selectRegion` so picking Finger lands on `finger_which` (the next step in the finger flow) rather than `onset`:

```js
const selectRegion = useCallback((value) => {
  const isLower  = LOWER_BODY.includes(value)
  const wasLower = LOWER_BODY.includes(form.region)
  setForm((f) => ({
    ...f,
    region: value,
    mechanism: isLower !== wasLower ? '' : f.mechanism,
  }))
  setDirection(1)
  navigate(stepToPath(1, value))   // 1 in BASE_FLOW = 'onset'; 1 in FINGER_FLOW = 'finger_which'
}, [form.region, navigate])
```

Update the step-title and step-dots renders:

```jsx
<StepDots current={step} total={TOTAL_STEPS} />
<h2 className="text-xl font-bold text-text">
  {form.region === 'Finger' && step >= 1 && step <= 3
    ? FINGER_STEP_TITLES[step - 1].title
    : STEP_TITLES[Math.max(0, step - (form.region === 'Finger' ? 3 : 0))].title}
</h2>
```

(Cleaner approach: extract a `stepTitleFor(slug)` helper that maps slug → title — recommended if the inline ternary is awkward in the existing code.)

- [ ] **Step 4: Update `canAdvance()` to handle the new step slugs**

```js
const canAdvance = () => {
  if (currentSlug === '') return !!form.region
  if (currentSlug === 'finger_which') return true   // Skip allowed
  if (currentSlug === 'finger_location') return true
  if (currentSlug === 'grip_mode') return true
  if (currentSlug === 'onset') return !!form.onset && !!form.mechanism
  if (currentSlug === 'symptoms') return !!form.pain_type
  return true
}
```

- [ ] **Step 5: Verify Vite serves the file**

Run: `curl -s http://localhost:5173/src/components/TriageTab.jsx -o /dev/null -w "%{http_code}\n"`
Expected: `200`.

- [ ] **Step 6: Manual smoke test**

In a browser, open the running app, start a triage:
- Pick **Finger** → confirm the next screen is "Which finger?" (not the onset row).
- Tap **Ring** → next screen is "Where on the finger?"
- Tap **Palm-side middle** → next screen is "What grip were you using?"
- Tap **Full crimp** → next screen is the onset/mechanism step (existing UI).
- Back button works at every step.
- Repeat with **Shoulder** (any non-Finger region) → confirm flow goes straight to onset/mechanism with no finger screens.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/TriageTab.jsx
git commit -m "Frontend: dynamic step routing — Finger flow inserts 3 drill-down screens"
```

---

## Task 12 — Tour coachmarks for finger-only steps

**Files:**
- Modify: `frontend/src/hooks/useTriageTour.js` — TIPS array

- [ ] **Step 1: Read the current TIPS structure**

Existing `useTriageTour.js` TIPS are keyed by numeric `step`. With the dynamic flow, finger users land on step indices 1/2/3 for the drill-down screens, and the existing tips that fire at step 1/2/3 (onset/severity/symptoms) shift to 4/5/6 for the finger flow.

- [ ] **Step 2: Replace the TIPS constant with a region-aware lookup**

In `frontend/src/hooks/useTriageTour.js`, replace the `TIPS` array with two arrays keyed by `currentSlug` (not step index):

```js
const TIPS_BY_SLUG = {
  '':               { anchorId: 'region-diagram', label: 'Step 1',  body: 'Tap where it hurts. You can change this anytime.' },
  'finger_which':   { anchorId: 'which-finger',    label: 'Step 2',  body: 'Which finger? Helps narrow what got hurt.' },
  'finger_location':{ anchorId: 'finger-location', label: 'Step 3',  body: 'Where on the finger? Picks out pulley vs joint vs side.' },
  'grip_mode':      { anchorId: 'grip-mode',       label: 'Step 4',  body: 'What grip? Crimp loads A2/A4 — pockets load lumbrical.' },
  'onset':          { anchorId: 'onset-row',       label: 'Step ?',  body: 'Was it gradual or sudden? Then pick how it happened.' },
  'symptoms':       { anchorId: 'severity-slider', label: 'Step ?',  body: "Slide to rate today's pain, then pick what it feels like." },
  'details':        { anchorId: 'symptoms-grid',   label: 'Step ?',  body: 'Tick everything that applies — none is fine too.' },
  'finish':         { anchorId: 'free-text',       label: 'Step ?',  body: 'Add anything else (climbs, holds, history). Optional.' },
}
```

- [ ] **Step 3: Update the hook signature to take the slug**

```js
export default function useTriageTour({ slug, totalSteps }) {
  // ... existing seen/skipped/dismissed state ...
  const tip = useMemo(() => {
    if (!active) return null
    if (dismissed.has(slug)) return null
    const t = TIPS_BY_SLUG[slug]
    if (!t) return null
    return { ...t, index: 0, total: totalSteps }
  }, [active, dismissed, slug, totalSteps])
  // ... rest of the hook unchanged except dismissedSteps is keyed by slug ...
}
```

(Migrate the existing dismissed-set from numeric step indices to slug strings — same Set semantics.)

- [ ] **Step 4: Update TriageTab.jsx to pass `slug` instead of `step` to `useTriageTour`**

```js
const tour = useTriageTour({ slug: currentSlug, totalSteps: TOTAL_STEPS })
```

- [ ] **Step 5: Verify**

Run: `curl -s http://localhost:5173/src/hooks/useTriageTour.js -o /dev/null -w "%{http_code}\n"`
Expected: `200`.

Manual smoke test: in the browser, replay the tour (`?` button) and walk through Finger → confirm three new tips appear on the finger-only screens, and existing tips still fire on onset/symptoms/details/finish.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/hooks/useTriageTour.js frontend/src/components/TriageTab.jsx
git commit -m "Frontend tour: slug-keyed tips + 3 new finger drill-down coachmarks"
```

---

## Task 13 — End-to-end verification + final commit

**Files:** None modified. Verification + final summary commit.

- [ ] **Step 1: Run the full backend test suite**

Run: `.venv/bin/python -m unittest tests.test_bucket tests.test_bucket_content tests.test_triage_calibration tests.test_finger_triage -v 2>&1 | tail -40`
Expected: all green. ~125+ tests.

- [ ] **Step 2: Hit the live /api/triage endpoint with a finger scenario**

(If the backend isn't running locally: `uvicorn main:app --reload --port 8000` in another shell.)

```bash
curl -s -X POST http://localhost:8000/api/triage \
  -H "Content-Type: application/json" \
  -d '{
    "region": "Finger",
    "onset": "Sudden",
    "pain_type": "Sharp",
    "severity": 7,
    "swelling": "No",
    "bruising": "No",
    "numbness": "No",
    "weakness": "None",
    "instability": "No",
    "mechanism": "Hard crimp",
    "free_text": "felt a pop",
    "which_finger": "Ring",
    "finger_location": "palm_mid",
    "grip_mode": "full_crimp"
  }' | python3 -c "import sys,json; d=json.load(sys.stdin); print('buckets:'); [print(' ', b.get('title')) for b in d.get('buckets',[])]"
```

Expected output (top bucket):
```
buckets:
  Pulley strain/rupture (A2) — most likely
  ...
```

- [ ] **Step 3: Hit the endpoint with a non-finger scenario to confirm no regression**

```bash
curl -s -X POST http://localhost:8000/api/triage \
  -H "Content-Type: application/json" \
  -d '{
    "region": "Shoulder", "onset": "Gradual", "pain_type": "Dull/ache",
    "severity": 5, "swelling": "No", "bruising": "No",
    "numbness": "No", "weakness": "None", "instability": "No",
    "mechanism": "High volume pulling", "free_text": ""
  }' | python3 -c "import sys,json; d=json.load(sys.stdin); print('buckets:'); [print(' ', b.get('title')) for b in d.get('buckets',[])]"
```

Expected: rotator cuff / shoulder buckets surface as before — no `which_finger` / `finger_location` / `grip_mode` needed.

- [ ] **Step 4: Browser smoke test — three mental walk-throughs**

In a real browser:

**Walk-through A: Finger, sudden, crimp, pop, ring finger, palm-mid**
- Triage → Finger → Ring → Palm-side middle → Full crimp → Sudden → Hard crimp → 7/10 → Sharp → Symptoms (No, No, No, None, None) → "felt a pop" → Submit.
- Expected: Results page shows **Pulley strain/rupture (A2) — most likely** as the top bucket. No JS errors in console.

**Walk-through B: Shoulder, gradual, no functional limit**
- Triage → Shoulder → Gradual → High volume pulling → 5/10 → Dull → no symptoms → no notes → Submit.
- Expected: results page renders with rotator-cuff-type buckets, no finger-specific buckets surface. No console errors. Step count was 5 (not 8).

**Walk-through C: Finger drill-down with all "Skip / Not sure" — fallback path**
- Triage → Finger → Skip → Not sure → Not sure → onset/severity/symptoms/notes normally → Submit.
- Expected: results page renders with legacy generic finger buckets (pulley_a2 + flexor_tenosynovitis + collateral_ligament_finger surface via the fallback branch). No console errors.

- [ ] **Step 5: Final summary commit (if any small cleanups remain)**

If everything is clean, no commit needed. If there are leftover comment/doc tweaks:

```bash
git status
git add -p   # selectively stage cleanups only
git commit -m "Finger triage expansion: docs cleanups"
```

- [ ] **Step 6: Push**

```bash
git push origin main
```

Expected: branch advances on origin/main. The 13 task commits land in order on the remote.

---

## Self-review checklist (for the implementing engineer)

After all tasks are done, confirm:

1. ✅ All 9 new bucket IDs (pulley_a3, pulley_a4, volar_plate, trigger_finger, mallet_finger, jersey_finger, sagittal_band_rupture, hamate_hook_fracture, pip_synovitis) have `BUCKET_CONTENT` entries with `base_title`, `why`, `matches_if`, `not_likely_if`, `quick_test`.
2. ✅ `Intake` dataclass has `which_finger`, `finger_location`, `grip_mode` with default `""`.
3. ✅ `IntakeRequest` Pydantic model accepts the same three fields with default `""`.
4. ✅ `/api/triage` handler forwards them into `Intake(...)`.
5. ✅ The Finger branch of `bucket_possibilities()` is fully rewritten: urgent first, pulley patterns, lumbrical, collateral, volar plate, sagittal band, hamate hook, trigger, PIP synovitis, legacy fallback, tail catch-all.
6. ✅ Frontend INITIAL_FORM has the three new keys; the API call forwards them.
7. ✅ Three new conditional step blocks render only when `region === 'Finger'`.
8. ✅ Step routing is dynamic — 5 slots for non-Finger flows, 8 slots for Finger flow.
9. ✅ Step dots/back button/continue button work cleanly across both flows.
10. ✅ Tour coachmarks show three new tips for the finger-only steps; existing tips still fire on onset/severity/symptoms/finish.
11. ✅ All 4 test suites pass (`test_bucket`, `test_bucket_content`, `test_triage_calibration`, `test_finger_triage`).
12. ✅ Three browser walk-throughs (Finger+specific / Shoulder / Finger+all-skip) produce sensible results with no console errors.
13. ✅ Database schema is unchanged (no migration needed).
