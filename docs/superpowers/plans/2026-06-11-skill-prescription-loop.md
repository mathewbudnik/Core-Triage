# Skill Prescription Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Pentagon gap ("Technique is your gap") into a committed, checkable weekly block of drills surfaced on Home and visible/assignable by the coach.

**Architecture:** A new pure-Python catalog module (`src/prescriptions.py`) computes the gap axis and selects a 3-drill block. Two new tables (`skill_prescriptions`, `prescription_progress`) persist the block and idempotent daily check-offs, mirroring the existing `training_plans` + `rehab_progress` patterns. New FastAPI endpoints serve/auto-generate the block, record check-offs, complete the block at 100%, and let a coach see/assign. A new `hub/PrescriptionCard.jsx` renders it on Home; the existing `CoachInbox.jsx` gains a per-client block view + assign control. XP stays client-side in `rewardEngine.js` (a new `awardPrescriptionXP` deduped by prescription id); completion fires the existing `CelebrationOverlay`.

**Tech Stack:** Python/FastAPI + psycopg2 (Postgres), pytest/unittest; React 18 + Vite + Tailwind (Almanac tokens) + framer-motion, vitest + @testing-library/react.

**Conventions (do not violate):** canonical axis keys `power | crimp | dynamic | technique | mobility` (backend pentagon uses legacy `crimpy/technical` — reconcile ONLY via `canon_axis`). Tokens only, no emojis, lucide icons, `.ct-surface` field-cards, skill colors, snappy motion (~0.16s). The Almanac grep gate must stay 0. Do NOT touch paywall gates or safety/medical content.

---

## File Structure

| File | Create/Modify | Responsibility |
|---|---|---|
| `src/prescriptions.py` | Create | `SKILL_AXES`, `canon_axis`, `AXIS_TO_DRILLS` catalog, `compute_gap_axis`, `select_block` — all pure |
| `tests/test_prescriptions.py` | Create | Pure-function unit tests (no DB, CI-safe) |
| `main.py` | Modify | `gap_axis` on `/api/me/state`; `/api/me/prescription`, `/api/prescriptions/check`, coach endpoints; `_serialize_prescription` |
| `database.py` | Modify | 2 new tables in `init_db()`; prescription DB helpers; `user_id` on `list_coach_threads` |
| `tests/test_prescription_api.py` | Create | Real-DB endpoint + helper tests (register/login/cleanup pattern) |
| `frontend/src/api.js` | Modify | `getPrescription`, `checkPrescriptionDrill`, `getClientPrescription`, `assignClientPrescription` |
| `frontend/src/lib/rewardEngine.js` | Modify | `awardPrescriptionXP` (pure) + `awardPrescription` hook callback |
| `frontend/src/lib/__tests__/rewardEngine.prescription.test.js` | Create | XP dedup test |
| `frontend/src/components/hub/PrescriptionCard.jsx` | Create | The Home card (active / balanced / empty states) |
| `frontend/src/components/hub/PrescriptionCard.test.jsx` | Create | Component state tests |
| `frontend/src/components/HubTab.jsx` | Modify | Fetch prescription, render card in `todaySection`, check handler + completion overlay |
| `frontend/src/components/CoachInbox.jsx` | Modify | Per-client block view + assign control |

---

## PHASE 1 — Catalog + gap exposure (pure, CI-safe)

### Task 1: `src/prescriptions.py` — catalog, gap axis, block selection

**Files:**
- Create: `src/prescriptions.py`
- Test: `tests/test_prescriptions.py`

- [ ] **Step 1: Write the failing tests**

Create `tests/test_prescriptions.py`:

```python
"""Pure-function tests for the skill-prescription catalog and gap logic.

No database — safe to run in CI (which provisions no Postgres).
"""
from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.prescriptions import (  # noqa: E402
    SKILL_AXES,
    AXIS_TO_DRILLS,
    canon_axis,
    compute_gap_axis,
    select_block,
)


class CatalogShapeTests(unittest.TestCase):
    def test_five_canonical_axes(self):
        self.assertEqual(SKILL_AXES, ("power", "crimp", "dynamic", "technique", "mobility"))

    def test_each_axis_has_at_least_three_drills(self):
        for axis in SKILL_AXES:
            self.assertIn(axis, AXIS_TO_DRILLS)
            self.assertGreaterEqual(len(AXIS_TO_DRILLS[axis]), 3, axis)

    def test_every_drill_has_required_fields_and_unique_keys(self):
        seen = set()
        for axis in SKILL_AXES:
            for d in AXIS_TO_DRILLS[axis]:
                for field in ("key", "name", "detail", "sets", "reps", "target"):
                    self.assertIn(field, d, f"{axis}:{d.get('key')} missing {field}")
                self.assertIsInstance(d["sets"], int)
                self.assertIsInstance(d["reps"], str)
                self.assertIsInstance(d["target"], int)
                self.assertNotIn(d["key"], seen, f"duplicate key {d['key']}")
                seen.add(d["key"])


class CanonAxisTests(unittest.TestCase):
    def test_aliases_legacy_keys(self):
        self.assertEqual(canon_axis("crimpy"), "crimp")
        self.assertEqual(canon_axis("technical"), "technique")

    def test_passes_canonical_through(self):
        self.assertEqual(canon_axis("power"), "power")
        self.assertEqual(canon_axis("mobility"), "mobility")


class GapAxisTests(unittest.TestCase):
    def test_picks_weakest_present_axis_below_strongest(self):
        axes = {"power": 9.0, "crimpy": 7.0, "dynamic": 6.0, "technical": 3.0, "mobility": 4.0}
        self.assertEqual(compute_gap_axis(axes), "technique")  # legacy 'technical' -> canonical

    def test_none_when_balanced(self):
        axes = {"power": 5.0, "crimpy": 5.0, "dynamic": 5.0, "technical": 5.0, "mobility": 5.0}
        self.assertIsNone(compute_gap_axis(axes))

    def test_none_when_empty_or_missing(self):
        self.assertIsNone(compute_gap_axis(None))
        self.assertIsNone(compute_gap_axis({}))

    def test_tie_for_weakest_resolves_by_canonical_order(self):
        # power and mobility tie for weakest; power comes first in SKILL_AXES.
        axes = {"power": 2.0, "crimp": 8.0, "dynamic": 8.0, "technique": 8.0, "mobility": 2.0}
        self.assertEqual(compute_gap_axis(axes), "power")


class SelectBlockTests(unittest.TestCase):
    def test_returns_three_distinct_drills(self):
        block = select_block("technique")
        self.assertEqual(len(block), 3)
        self.assertEqual(len({d["key"] for d in block}), 3)

    def test_prefers_keys_not_excluded(self):
        first = select_block("crimp")
        first_keys = [d["key"] for d in first]
        second = select_block("crimp", exclude_keys=first_keys)
        second_keys = [d["key"] for d in second]
        # With 5 drills/axis and a block of 3, the rotated block shares no keys.
        self.assertEqual(len(set(first_keys) & set(second_keys)), 0)

    def test_falls_back_to_repeats_when_pool_exhausted(self):
        all_keys = [d["key"] for d in AXIS_TO_DRILLS["power"]]
        block = select_block("power", exclude_keys=all_keys)
        self.assertEqual(len(block), 3)  # still 3 even though everything is excluded

    def test_accepts_legacy_axis_key(self):
        self.assertEqual(len(select_block("technical")), 3)
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd /Users/mathewbudnik/coretriage && pytest tests/test_prescriptions.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'src.prescriptions'`.

- [ ] **Step 3: Create `src/prescriptions.py`**

```python
"""Skill-prescription catalog and gap logic.

A *prescription* is a one-week block of 3 drills targeting the climber's
weakest Pentagon axis (the "gap"). This module is pure (no DB, no FastAPI) so
it is unit-testable and safe to import anywhere.

Canonical axis keys are ``power | crimp | dynamic | technique | mobility``
(matching frontend ``lib/skills.js``). The backend pentagon emits the legacy
keys ``crimpy``/``technical`` — reconcile ONLY via ``canon_axis``.
"""
from __future__ import annotations

SKILL_AXES = ("power", "crimp", "dynamic", "technique", "mobility")

# legacy backend pentagon keys -> canonical
_AXIS_ALIASES = {"crimpy": "crimp", "technical": "technique"}


def canon_axis(key: str) -> str:
    """Map a (possibly legacy) axis key onto its canonical form."""
    return _AXIS_ALIASES.get(key, key)


def compute_gap_axis(pentagon: dict | None) -> str | None:
    """Return the weakest present canonical axis strictly below the strongest.

    Mirrors the rule in ``frontend/src/lib/identity.js`` ``identityPhrase``:
    a gap only exists when some axis is strictly below the strongest. Ties for
    weakest (or strongest) resolve deterministically by canonical ``SKILL_AXES``
    order. Returns ``None`` for an empty/None pentagon or a balanced one.
    """
    if not pentagon:
        return None
    vals: dict[str, float] = {}
    for raw, v in pentagon.items():
        if isinstance(v, (int, float)):
            vals[canon_axis(raw)] = float(v)
    present = [a for a in SKILL_AXES if a in vals]
    if len(present) < 2:
        return None
    strongest = max(present, key=lambda a: vals[a])  # ties -> first in SKILL_AXES order
    weakest = min(present, key=lambda a: vals[a])     # ties -> first in SKILL_AXES order
    if vals[weakest] >= vals[strongest]:
        return None
    return weakest


def select_block(axis: str, exclude_keys: list[str] | None = None) -> list[dict]:
    """Pick 3 drills for ``axis``, preferring keys not in ``exclude_keys``.

    Deterministic (takes the first matching drills in catalog order) so blocks
    are reproducible and rotate on repeat. Falls back to repeats if the pool is
    smaller than 3 after exclusion.
    """
    axis = canon_axis(axis)
    pool = AXIS_TO_DRILLS.get(axis, [])
    if not pool:
        return []
    exclude = set(exclude_keys or [])
    chosen = [d for d in pool if d["key"] not in exclude][:3]
    if len(chosen) < 3:
        for d in pool:
            if len(chosen) >= 3:
                break
            if d not in chosen:
                chosen.append(d)
    return chosen[:3]


AXIS_TO_DRILLS: dict[str, list[dict]] = {
    "power": [
        {"key": "campus_1_3_5", "name": "Campus board 1-3-5",
         "detail": "Start on rung 1, skip to 3, skip to 5, no feet. Each move explosive — if it's slow, rest more. Progress toward 1-4-7 over the cycle.",
         "sets": 5, "reps": "3 ladders each arm leading", "target": 3, "equipment": ["campus_board"], "level": "intermediate"},
        {"key": "reactive_pullups", "name": "Reactive pull-ups",
         "detail": "From a dead hang, pull as fast as possible to chest with an explosive concentric phase. Trains rate of force development for dynos and dynamic catches.",
         "sets": 4, "reps": "5 reps", "target": 3, "equipment": [], "level": "intermediate"},
        {"key": "no_foot_overhang", "name": "No-foot moves on overhang",
         "detail": "On a steep board or overhang, set sequences where you release feet and pull dynamically to the next hold. Core tension plus dynamic upper-body strength on real holds.",
         "sets": 4, "reps": "4-6 attempts per sequence", "target": 3, "equipment": [], "level": "intermediate"},
        {"key": "frog_hops", "name": "Frog hops on the board",
         "detail": "On a moonboard or system board, both hands matched on a starting hold, jump to a higher matched position, settle, repeat. Each rep near max for symmetrical power output.",
         "sets": 5, "reps": "4 reps per set", "target": 3, "equipment": ["home_wall", "system_wall"], "level": "intermediate"},
        {"key": "campus_1_5_8", "name": "Campus board 1-5-8",
         "detail": "Max-distance campus ladders, both arms. Full rest between sets — this is CNS-intensive, don't rush. 1-5-9 is the elite benchmark.",
         "sets": 6, "reps": "3 ladders each arm", "target": 3, "equipment": ["campus_board"], "level": "advanced"},
    ],
    "crimp": [
        {"key": "max_half_crimp_hangs", "name": "Max-weight half-crimp hangs",
         "detail": "20mm edge, half-crimp, add weight via belt/vest. True max — you should barely complete 10s. Log the added weight (intermediate: typically +5-15 kg).",
         "sets": 5, "reps": "10s on / 50s off", "target": 3, "equipment": ["hangboard"], "level": "intermediate"},
        {"key": "repeaters_7_3", "name": "Repeaters (7s on / 3s off)",
         "detail": "20mm edge, half-crimp or open-hand, bodyweight. 6 reps continuous = one set. By the last 2 reps you should be near failure. Build to 6 clean reps before adding weight.",
         "sets": 4, "reps": "6 x (7s on / 3s off)", "target": 3, "equipment": ["hangboard"], "level": "intermediate"},
        {"key": "open_hand_density", "name": "Open-hand density hangs",
         "detail": "18mm edge, open hand, bodyweight. Accumulate time under tension, pacing evenly across all 6 reps. If you can't complete 6, drop to 5 and build over weeks.",
         "sets": 4, "reps": "6 x (7s on / 3s off)", "target": 3, "equipment": ["hangboard"], "level": "intermediate"},
        {"key": "max_pinch_hangs", "name": "Max-weight pinch hangs",
         "detail": "Pinch block or wide pinch on board, add weight. Target >= 120% body weight across all grip positions over the mesocycle. Pinch at bodyweight is the elite baseline.",
         "sets": 5, "reps": "10s on / 50s off", "target": 3, "equipment": ["hangboard"], "level": "advanced"},
        {"key": "one_arm_lockoff_hangs", "name": "One-arm lock-off hangs",
         "detail": "Assisted one-arm on 20mm, assistance via pulley or foot loop. Reduce assistance each session and track assistance weight. Goal: unassisted 5s one-arm hang in 6-8 weeks.",
         "sets": 4, "reps": "5s per arm", "target": 3, "equipment": ["hangboard"], "level": "elite"},
    ],
    "dynamic": [
        {"key": "dynamic_moves_wall", "name": "Dynamic moves on the wall",
         "detail": "Pick boulder problems or sequences with explosive moves — dynos, lunges, throws — and make limit-style attempts. Explosive contact strength: quality over quantity, full rest between attempts.",
         "sets": 4, "reps": "5 attempts per move", "target": 3, "equipment": [], "level": "beginner"},
        {"key": "feet_on_campusing", "name": "Feet-on campusing",
         "detail": "Use campus rungs with feet on, matching each rung before moving up. Explosive pull from the lats — keep hips in, don't muscle through slowly.",
         "sets": 4, "reps": "5 moves", "target": 3, "equipment": ["campus_board"], "level": "beginner"},
        {"key": "double_dynos", "name": "Double dynos",
         "detail": "Jump both hands simultaneously to a higher pair of rungs. Commit fully — half-committed dynos cause injuries. Most intermediates hit 2-rung; target 3-rung by end of phase.",
         "sets": 4, "reps": "4 attempts", "target": 3, "equipment": ["campus_board"], "level": "intermediate"},
        {"key": "commitment_dyno", "name": "Commitment dyno (controlled exposure)",
         "detail": "Find a safe dyno with a good landing and make dedicated attempts. The goal is full commitment and fall comfort, not send rate — rewires the half-commit habit under safe conditions.",
         "sets": 1, "reps": "5 attempts", "target": 3, "equipment": [], "level": "intermediate"},
        {"key": "campus_skip_ladders", "name": "Campus skip ladders (1-4-7)",
         "detail": "Max-distance skip ladders on the campus board, no feet, progressing the reach span across the cycle. CNS-intensive — full rest between sets, every move must feel explosive.",
         "sets": 5, "reps": "3 ladders each arm leading", "target": 3, "equipment": ["campus_board"], "level": "advanced"},
    ],
    "technique": [
        {"key": "silent_feet", "name": "Silent feet drill",
         "detail": "Climb a moderate route or problem making no sound when placing feet; reset if you hear a foot. Slow down — this is technique, not training to failure. Pays off at every level.",
         "sets": 3, "reps": "5 problems", "target": 3, "equipment": [], "level": "beginner"},
        {"key": "slab_smearing", "name": "Slab technique — smearing",
         "detail": "Work 3-4 slab sequences that require smearing, focusing on hip position. Weight over feet, trust the rubber, lean into the discomfort of slab. Transfers to overhang too.",
         "sets": 2, "reps": "10 min", "target": 3, "equipment": [], "level": "beginner"},
        {"key": "edging_precision", "name": "Edging precision drill",
         "detail": "On vertical or slightly overhanging wall, place each foot on the smallest possible point with no re-adjusting after placement. Climb slow — the failure mode is shifting feet, not the move.",
         "sets": 3, "reps": "5 problems", "target": 3, "equipment": [], "level": "intermediate"},
        {"key": "dual_tex", "name": "Dual-tex drill",
         "detail": "Climb the same problem twice — once in stiff shoes, once in soft — and notice the difference in foot feel. Develops shoe-feel and rubber-trust so you know what your footwear gives you.",
         "sets": 2, "reps": "3 problems each shoe", "target": 3, "equipment": [], "level": "intermediate"},
        {"key": "redpoint_visualisation", "name": "Redpoint visualisation",
         "detail": "Sit quietly with eyes closed and mentally rehearse a project start to finish — every hold, breath, and move. Mental rehearsal consolidates skill; do it the night before a hard attempt.",
         "sets": 1, "reps": "5-10 min per session", "target": 3, "equipment": [], "level": "intermediate"},
    ],
    "mobility": [
        {"key": "shoulder_cars", "name": "Shoulder CARs (controlled articular rotations)",
         "detail": "Standing, trace the largest pain-free circle with each arm, moving slowly through full internal and external rotation. Builds active overhead range for high steps and gastons.",
         "sets": 2, "reps": "5 slow circles each direction per arm", "target": 3, "equipment": [], "level": "beginner"},
        {"key": "deep_squat_hip_opener", "name": "Deep squat hip opener",
         "detail": "Sink into a flat-foot deep squat, elbows inside the knees, and gently press the knees outward while lengthening the spine. Opens the hips for high steps, drop-knees, and heel hooks.",
         "sets": 3, "reps": "45s hold", "target": 3, "equipment": [], "level": "beginner"},
        {"key": "wrist_loading_prep", "name": "Wrist mobility & loaded prep",
         "detail": "On all fours, rock weight forward and back over palms (fingers forward, then reversed), then add slow wrist circles. Prepares wrists for mantles, slopers, and palming on slab.",
         "sets": 2, "reps": "10 rocks each position", "target": 3, "equipment": [], "level": "beginner"},
        {"key": "thoracic_extension_opener", "name": "Thoracic extension opener",
         "detail": "Over a foam roller or rolled towel under the mid-back, support the head and extend the upper back over the roller, breathing into the stretch. Restores the extension lost from rounded climbing posture.",
         "sets": 2, "reps": "8 slow extensions", "target": 3, "equipment": [], "level": "intermediate"},
        {"key": "antagonist_band_complex", "name": "Antagonist band complex",
         "detail": "With a light resistance band, superset wrist extensions, reverse wrist curls, and band pull-aparts for the rear shoulder. Balances the pulling-dominant climber and protects elbows and finger pulleys.",
         "sets": 3, "reps": "15 reps per movement", "target": 3, "equipment": ["resistance_band"], "level": "intermediate"},
    ],
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd /Users/mathewbudnik/coretriage && pytest tests/test_prescriptions.py -v`
Expected: PASS (all tests green).

- [ ] **Step 5: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add src/prescriptions.py tests/test_prescriptions.py
git -C /Users/mathewbudnik/coretriage commit -m "feat(prescription): skill->drill catalog + gap-axis + block selection"
```

### Task 2: Expose `gap_axis` on `/api/me/state`

**Files:**
- Modify: `main.py` — `get_me_state` (lines 969-995)
- Test: `tests/test_prescription_api.py` (create; first test only)

- [ ] **Step 1: Write the failing test**

Create `tests/test_prescription_api.py` (this file grows across Tasks 2, 4-6, 11). Start with the register/login/cleanup harness copied from `tests/test_state_endpoint.py` plus the gap-axis test:

```python
"""Real-DB tests for the skill-prescription endpoints.

Mirror tests/test_state_endpoint.py: register/login via the real auth
endpoints, hit a real Postgres (whatever CORETRIAGE_DB_* points at),
clean up by deleting the user (FK cascade clears child rows).
"""
from __future__ import annotations

import os
import sys
import unittest

from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import _connect, init_db, log_training  # noqa: E402
from main import app  # noqa: E402

_TEST_PASSWORD = "Rx!Test1password"


def _cleanup_user(email: str) -> None:
    with _connect() as conn, conn.cursor() as cur:
        cur.execute("DELETE FROM users WHERE email = %s;", (email,))
        conn.commit()


def _register_and_login(email: str) -> str:
    client = TestClient(app)
    r = client.post("/api/auth/register", json={"email": email, "password": _TEST_PASSWORD})
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    r = client.post("/api/auth/login", json={"email": email, "password": _TEST_PASSWORD})
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["token"]


def _user_id(email: str) -> int:
    with _connect() as conn, conn.cursor() as cur:
        cur.execute("SELECT id FROM users WHERE email = %s;", (email,))
        return cur.fetchone()[0]


def _seed_send(uid: int, grade: str, styles: dict, date: str = "2026-05-20") -> None:
    """Log one boulder send tagged with the given styles (e.g. {'technical': 1})."""
    log_training(uid, {
        "date": date,
        "session_type": "bouldering",
        "duration_min": 60,
        "intensity": 7,
        "climbs": {"boulder": {grade: {"s": 1, "f": 0, "p": 0, "styles": styles}}},
    })


class GapAxisOnStateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()

    def setUp(self):
        self.email = "rx_gap_test@coretriage.local"
        _cleanup_user(self.email)
        self.token = _register_and_login(self.email)
        self.client = TestClient(app)

    def tearDown(self):
        _cleanup_user(self.email)

    def _auth(self):
        return {"Authorization": f"Bearer {self.token}"}

    def test_state_has_gap_axis_key_null_for_new_user(self):
        r = self.client.get("/api/me/state", headers=self._auth())
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertIn("gap_axis", body)
        self.assertIsNone(body["gap_axis"])  # no sends -> no pentagon -> no gap

    def test_state_gap_axis_is_canonical_when_a_gap_exists(self):
        uid = _user_id(self.email)
        # A hard power send + a much easier technical send => technique is the gap.
        _seed_send(uid, "V8", {"powerful": 1})
        _seed_send(uid, "V1", {"technical": 1}, date="2026-05-21")
        r = self.client.get("/api/me/state", headers=self._auth())
        self.assertEqual(r.status_code, 200, r.text)
        gap = r.json()["gap_axis"]
        # canonical key, not the legacy 'technical'
        self.assertIn(gap, ("power", "crimp", "dynamic", "technique", "mobility"))
        self.assertEqual(gap, "technique")


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd /Users/mathewbudnik/coretriage && pytest tests/test_prescription_api.py::GapAxisOnStateTests -v`
Expected: FAIL — `KeyError`/`assertIn 'gap_axis'` (the field doesn't exist yet). (Requires a reachable Postgres, same as the existing endpoint tests.)

- [ ] **Step 3: Add the import and the field**

In `main.py`, near the other `src.*` imports at the top of the file, add:

```python
from src.prescriptions import compute_gap_axis
```

Then in `get_me_state` (main.py:987-994), add `gap_axis` to the returned dict:

```python
    return {
        "apex_grade": apex_grade,
        "tier": tier,
        "streak_days_current": streak_current,
        "streak_days_longest": streak_longest,
        "pentagon": pentagon,
        "gap_axis": compute_gap_axis(pentagon),
        "recent_sends": recent_sends,
        "archetype": archetype,
    }
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd /Users/mathewbudnik/coretriage && pytest tests/test_prescription_api.py::GapAxisOnStateTests -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add main.py tests/test_prescription_api.py
git -C /Users/mathewbudnik/coretriage commit -m "feat(prescription): expose gap_axis on /api/me/state"
```

---

## PHASE 2 — Persistence + endpoints

### Task 3: Create the two tables in `init_db()`

**Files:**
- Modify: `database.py` — inside `init_db()`, just before the final `conn.commit()` (line ~485)

- [ ] **Step 1: Add the table DDL**

In `database.py`, inside `init_db()`, after the `rehab_progress` block (line 471) and before `conn.commit()`, add:

```python
            # ── Skill prescriptions (weekly gap-targeted block) ───────────
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS skill_prescriptions (
                    id           SERIAL PRIMARY KEY,
                    user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    axis         TEXT NOT NULL,
                    drills_json  JSONB NOT NULL,
                    status       TEXT NOT NULL DEFAULT 'active',
                    source       TEXT NOT NULL DEFAULT 'auto',
                    assigned_by  INT REFERENCES users(id) ON DELETE SET NULL,
                    week_start   DATE NOT NULL DEFAULT CURRENT_DATE,
                    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    completed_at TIMESTAMPTZ
                );
                """
            )
            cur.execute(
                "CREATE INDEX IF NOT EXISTS skill_prescriptions_user_status_idx "
                "ON skill_prescriptions (user_id, status);"
            )
            # ── Prescription progress (idempotent daily drill checkoff) ────
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS prescription_progress (
                    id              SERIAL PRIMARY KEY,
                    user_id         INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    prescription_id INT NOT NULL REFERENCES skill_prescriptions(id) ON DELETE CASCADE,
                    drill_key       TEXT NOT NULL,
                    completed_date  DATE NOT NULL,
                    completed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UNIQUE (user_id, prescription_id, drill_key, completed_date)
                );
                """
            )
            cur.execute(
                "CREATE INDEX IF NOT EXISTS prescription_progress_presc_idx "
                "ON prescription_progress (prescription_id);"
            )
```

- [ ] **Step 2: Verify the schema applies cleanly**

Run: `cd /Users/mathewbudnik/coretriage && python -c "import database; database.init_db(); print('init_db ok')"`
Expected: prints `init_db ok` with no exception (creates the tables idempotently against the configured Postgres).

- [ ] **Step 3: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add database.py
git -C /Users/mathewbudnik/coretriage commit -m "feat(prescription): skill_prescriptions + prescription_progress tables"
```

### Task 4: Prescription DB helpers

**Files:**
- Modify: `database.py` — add helpers near `get_active_plan` (after line ~1304)
- Test: `tests/test_prescription_api.py` — add `PrescriptionDbHelperTests`

- [ ] **Step 1: Write the failing test**

Append to `tests/test_prescription_api.py`:

```python
from database import (  # noqa: E402
    get_active_prescription,
    create_prescription,
    complete_prescription,
    check_prescription_drill,
    get_prescription_checkoffs,
)


class PrescriptionDbHelperTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()

    def setUp(self):
        self.email = "rx_db_test@coretriage.local"
        _cleanup_user(self.email)
        self.token = _register_and_login(self.email)
        self.uid = _user_id(self.email)

    def tearDown(self):
        _cleanup_user(self.email)

    def test_create_and_get_active(self):
        drills = [{"key": "silent_feet", "name": "Silent feet", "target": 3}]
        pid = create_prescription(self.uid, "technique", drills, source="auto")
        self.assertIsInstance(pid, int)
        active = get_active_prescription(self.uid)
        self.assertIsNotNone(active)
        self.assertEqual(active["id"], pid)
        self.assertEqual(active["axis"], "technique")
        self.assertEqual(active["status"], "active")
        self.assertEqual(active["drills_json"][0]["key"], "silent_feet")

    def test_creating_a_second_block_completes_the_first(self):
        first = create_prescription(self.uid, "technique", [{"key": "silent_feet", "target": 3}])
        second = create_prescription(self.uid, "mobility", [{"key": "shoulder_cars", "target": 3}])
        active = get_active_prescription(self.uid)
        self.assertEqual(active["id"], second)
        self.assertNotEqual(active["id"], first)

    def test_checkoff_is_idempotent_per_day(self):
        pid = create_prescription(self.uid, "technique", [{"key": "silent_feet", "target": 3}])
        r1 = check_prescription_drill(self.uid, pid, "silent_feet", "2026-06-11")
        r2 = check_prescription_drill(self.uid, pid, "silent_feet", "2026-06-11")
        self.assertFalse(r1["already_existed"])
        self.assertTrue(r2["already_existed"])
        rows = get_prescription_checkoffs(self.uid, pid)
        self.assertEqual(len(rows), 1)

    def test_checkoffs_accumulate_across_days(self):
        pid = create_prescription(self.uid, "technique", [{"key": "silent_feet", "target": 3}])
        check_prescription_drill(self.uid, pid, "silent_feet", "2026-06-11")
        check_prescription_drill(self.uid, pid, "silent_feet", "2026-06-12")
        rows = get_prescription_checkoffs(self.uid, pid)
        self.assertEqual(len(rows), 2)

    def test_complete_prescription_clears_active(self):
        pid = create_prescription(self.uid, "technique", [{"key": "silent_feet", "target": 3}])
        complete_prescription(pid)
        self.assertIsNone(get_active_prescription(self.uid))
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd /Users/mathewbudnik/coretriage && pytest tests/test_prescription_api.py::PrescriptionDbHelperTests -v`
Expected: FAIL — `ImportError: cannot import name 'create_prescription'`.

- [ ] **Step 3: Add the helpers to `database.py`**

After `get_active_plan` (line ~1304), add:

```python
def create_prescription(
    user_id: int,
    axis: str,
    drills: list[dict[str, Any]],
    source: str = "auto",
    assigned_by: int | None = None,
    week_start: str | None = None,
) -> int:
    """Deactivate any active block, then insert a new active one. Returns new id."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE skill_prescriptions SET status = 'completed', "
                "completed_at = COALESCE(completed_at, NOW()) "
                "WHERE user_id = %s AND status = 'active';",
                (int(user_id),),
            )
            cur.execute(
                """
                INSERT INTO skill_prescriptions
                    (user_id, axis, drills_json, status, source, assigned_by, week_start)
                VALUES (%s, %s, %s::jsonb, 'active', %s, %s, COALESCE(%s, CURRENT_DATE))
                RETURNING id;
                """,
                (int(user_id), axis, json.dumps(drills), source,
                 int(assigned_by) if assigned_by is not None else None, week_start),
            )
            new_id = cur.fetchone()[0]
        conn.commit()
    return int(new_id)


def get_active_prescription(user_id: int) -> dict[str, Any] | None:
    """Return the user's active skill prescription as a dict, or None."""
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, user_id, axis, drills_json, status, source, assigned_by,
                   week_start, created_at, completed_at
            FROM skill_prescriptions
            WHERE user_id = %s AND status = 'active'
            ORDER BY created_at DESC LIMIT 1;
            """,
            (int(user_id),),
        )
        row = cur.fetchone()
    if not row:
        return None
    drills = row[3]
    if isinstance(drills, str):
        drills = json.loads(drills)
    return {
        "id":          row[0],
        "user_id":     row[1],
        "axis":        row[2],
        "drills_json": drills,
        "status":      row[4],
        "source":      row[5],
        "assigned_by": row[6],
        "week_start":  str(row[7]),
        "created_at":  str(row[8]),
        "completed_at": str(row[9]) if row[9] else None,
    }


def complete_prescription(prescription_id: int) -> None:
    """Mark a prescription completed (idempotent on completed_at)."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE skill_prescriptions SET status = 'completed', "
                "completed_at = COALESCE(completed_at, NOW()) WHERE id = %s;",
                (int(prescription_id),),
            )
        conn.commit()


def check_prescription_drill(
    user_id: int, prescription_id: int, drill_key: str, date: str,
) -> dict[str, Any]:
    """Insert a drill checkoff. Idempotent via the UNIQUE constraint.
    Returns {id, already_existed}."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO prescription_progress
                    (user_id, prescription_id, drill_key, completed_date)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (user_id, prescription_id, drill_key, completed_date)
                DO NOTHING
                RETURNING id;
                """,
                (int(user_id), int(prescription_id), drill_key, date),
            )
            row = cur.fetchone()
            already_existed = row is None
            if already_existed:
                cur.execute(
                    "SELECT id FROM prescription_progress WHERE user_id = %s "
                    "AND prescription_id = %s AND drill_key = %s AND completed_date = %s;",
                    (int(user_id), int(prescription_id), drill_key, date),
                )
                row = cur.fetchone()
        conn.commit()
    return {"id": int(row[0]) if row else None, "already_existed": already_existed}


def get_prescription_checkoffs(user_id: int, prescription_id: int) -> list[dict[str, Any]]:
    """All checkoff rows for a block (across all days)."""
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT drill_key, completed_date FROM prescription_progress "
            "WHERE user_id = %s AND prescription_id = %s ORDER BY completed_at ASC;",
            (int(user_id), int(prescription_id)),
        )
        rows = cur.fetchall()
    return [{"drill_key": r[0], "completed_date": str(r[1])} for r in rows]
```

(`json` and `Any` are already imported at the top of `database.py`.)

- [ ] **Step 4: Run to verify it passes**

Run: `cd /Users/mathewbudnik/coretriage && pytest tests/test_prescription_api.py::PrescriptionDbHelperTests -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add database.py tests/test_prescription_api.py
git -C /Users/mathewbudnik/coretriage commit -m "feat(prescription): DB helpers for blocks + idempotent checkoff"
```

### Task 5: `GET /api/me/prescription` + serializer

**Files:**
- Modify: `main.py` — add `PRESCRIPTION_XP`, `_serialize_prescription`, and the GET endpoint (near `get_me_state`)
- Test: `tests/test_prescription_api.py` — add `GetPrescriptionEndpointTests`

- [ ] **Step 1: Write the failing test**

Append to `tests/test_prescription_api.py`:

```python
class GetPrescriptionEndpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()

    def setUp(self):
        self.email = "rx_get_test@coretriage.local"
        _cleanup_user(self.email)
        self.token = _register_and_login(self.email)
        self.uid = _user_id(self.email)
        self.client = TestClient(app)

    def tearDown(self):
        _cleanup_user(self.email)

    def _auth(self):
        return {"Authorization": f"Bearer {self.token}"}

    def test_new_user_has_no_prescription(self):
        r = self.client.get("/api/me/prescription?date=2026-06-11", headers=self._auth())
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertIsNone(body["gap_axis"])
        self.assertIsNone(body["prescription"])

    def test_auto_generates_block_for_gap(self):
        _seed_send(self.uid, "V8", {"powerful": 1})
        _seed_send(self.uid, "V1", {"technical": 1}, date="2026-05-21")
        r = self.client.get("/api/me/prescription?date=2026-06-11", headers=self._auth())
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertEqual(body["gap_axis"], "technique")
        presc = body["prescription"]
        self.assertIsNotNone(presc)
        self.assertEqual(presc["axis"], "technique")
        self.assertEqual(len(presc["drills"]), 3)
        for d in presc["drills"]:
            self.assertIn("done", d)
            self.assertEqual(d["done"], 0)
        self.assertEqual(presc["progress"]["current"], 0)
        self.assertGreater(presc["progress"]["total"], 0)

    def test_second_fetch_reuses_the_same_active_block(self):
        _seed_send(self.uid, "V8", {"powerful": 1})
        _seed_send(self.uid, "V1", {"technical": 1}, date="2026-05-21")
        a = self.client.get("/api/me/prescription?date=2026-06-11", headers=self._auth()).json()
        b = self.client.get("/api/me/prescription?date=2026-06-11", headers=self._auth()).json()
        self.assertEqual(a["prescription"]["id"], b["prescription"]["id"])

    def test_requires_auth(self):
        r = TestClient(app).get("/api/me/prescription?date=2026-06-11")
        self.assertIn(r.status_code, (401, 403))
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd /Users/mathewbudnik/coretriage && pytest tests/test_prescription_api.py::GetPrescriptionEndpointTests -v`
Expected: FAIL — 404 Not Found (endpoint doesn't exist).

- [ ] **Step 3: Add the serializer + endpoint in `main.py`**

Update the import added in Task 2 to pull in the catalog helpers too:

```python
from src.prescriptions import compute_gap_axis, select_block, AXIS_TO_DRILLS
```

Add the DB-helper imports to the existing `from database import (...)` block in `main.py`:

```python
    get_active_prescription,
    create_prescription,
    complete_prescription,
    check_prescription_drill,
    get_prescription_checkoffs,
```

Add a constant near the other module constants (e.g. by `_PENTAGON_AXES`, main.py:711):

```python
PRESCRIPTION_XP = 250  # XP granted (client-side) when a weekly block completes
```

Add the serializer near `_compute_current_pentagon` (after line 839):

```python
def _serialize_prescription(presc: dict, checkoffs: list[dict]) -> dict:
    """Build the frontend payload: drills with per-drill `done` (capped at target)
    + block progress. `done` counts distinct checkoff days for that drill."""
    done_by_key: dict[str, int] = {}
    for row in checkoffs:
        done_by_key[row["drill_key"]] = done_by_key.get(row["drill_key"], 0) + 1
    drills = []
    total = 0
    current = 0
    for d in presc["drills_json"]:
        target = int(d.get("target", 3))
        done = min(done_by_key.get(d["key"], 0), target)
        total += target
        current += done
        drills.append({**d, "target": target, "done": done})
    pct = round(100 * current / total) if total else 0
    return {
        "id":         presc["id"],
        "axis":       presc["axis"],
        "status":     presc["status"],
        "source":     presc["source"],
        "week_start": presc["week_start"],
        "drills":     drills,
        "progress":   {"current": current, "total": total, "pct": pct},
    }


def _active_block_payload(user_id: int) -> dict:
    """Return {gap_axis, prescription}. Auto-generate an active block when a gap
    exists and none is active. Returns prescription=None when balanced (no gap)."""
    pentagon = _compute_current_pentagon(user_id)
    gap_axis = compute_gap_axis(pentagon)
    active = get_active_prescription(user_id)
    if active is None and gap_axis is not None:
        drills = select_block(gap_axis)
        new_id = create_prescription(user_id, gap_axis, drills, source="auto")
        active = get_active_prescription(user_id)
    if active is None:
        return {"gap_axis": gap_axis, "prescription": None}
    checkoffs = get_prescription_checkoffs(user_id, active["id"])
    return {"gap_axis": gap_axis, "prescription": _serialize_prescription(active, checkoffs)}
```

Add the endpoint near `get_me_state` (after line 995):

```python
@app.get("/api/me/prescription")
@limiter.limit("60/minute")
def get_my_prescription(request: Request, user: dict = Depends(get_current_user)):
    """The climber's active weekly skill block (auto-generated for the current
    gap when none is active). `date` is accepted for client-cache symmetry."""
    return _active_block_payload(user["id"])
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd /Users/mathewbudnik/coretriage && pytest tests/test_prescription_api.py::GetPrescriptionEndpointTests -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add main.py tests/test_prescription_api.py
git -C /Users/mathewbudnik/coretriage commit -m "feat(prescription): GET /api/me/prescription with auto-generation"
```

### Task 6: `POST /api/prescriptions/check` (idempotent + completion)

**Files:**
- Modify: `main.py` — request model + endpoint
- Test: `tests/test_prescription_api.py` — add `CheckPrescriptionEndpointTests`

- [ ] **Step 1: Write the failing test**

Append to `tests/test_prescription_api.py`:

```python
class CheckPrescriptionEndpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()

    def setUp(self):
        self.email = "rx_check_test@coretriage.local"
        _cleanup_user(self.email)
        self.token = _register_and_login(self.email)
        self.uid = _user_id(self.email)
        self.client = TestClient(app)
        # Seed a gap so an auto block exists.
        _seed_send(self.uid, "V8", {"powerful": 1})
        _seed_send(self.uid, "V1", {"technical": 1}, date="2026-05-21")
        self.presc = self.client.get(
            "/api/me/prescription?date=2026-06-11", headers=self._auth()
        ).json()["prescription"]

    def tearDown(self):
        _cleanup_user(self.email)

    def _auth(self):
        return {"Authorization": f"Bearer {self.token}"}

    def test_check_increments_progress_and_is_idempotent(self):
        key = self.presc["drills"][0]["key"]
        r1 = self.client.post("/api/prescriptions/check",
                              json={"drill_key": key, "date": "2026-06-11"},
                              headers=self._auth())
        self.assertEqual(r1.status_code, 200, r1.text)
        body1 = r1.json()
        self.assertFalse(body1["completed"])
        self.assertEqual(body1["prescription"]["progress"]["current"], 1)
        # Same drill, same day -> no double count.
        r2 = self.client.post("/api/prescriptions/check",
                              json={"drill_key": key, "date": "2026-06-11"},
                              headers=self._auth())
        self.assertEqual(r2.json()["prescription"]["progress"]["current"], 1)

    def test_block_completes_at_100_percent(self):
        # 3 drills x target 3 = 9 checkoffs across 3 distinct days.
        days = ["2026-06-11", "2026-06-12", "2026-06-13"]
        last = None
        for d in self.presc["drills"]:
            for day in days:
                last = self.client.post("/api/prescriptions/check",
                                        json={"drill_key": d["key"], "date": day},
                                        headers=self._auth()).json()
        self.assertTrue(last["completed"])
        self.assertEqual(last["xp"], 250)
        self.assertEqual(last["prescription"]["progress"]["pct"], 100)
        # The completed block is no longer the active one; a new gap may auto-generate.
        again = self.client.get("/api/me/prescription?date=2026-06-14",
                                headers=self._auth()).json()
        if again["prescription"]:
            self.assertNotEqual(again["prescription"]["id"], self.presc["id"])

    def test_rejects_drill_not_in_block(self):
        r = self.client.post("/api/prescriptions/check",
                             json={"drill_key": "not_a_real_drill", "date": "2026-06-11"},
                             headers=self._auth())
        self.assertEqual(r.status_code, 400, r.text)
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd /Users/mathewbudnik/coretriage && pytest tests/test_prescription_api.py::CheckPrescriptionEndpointTests -v`
Expected: FAIL — 404 (endpoint missing).

- [ ] **Step 3: Add the request model + endpoint in `main.py`**

Add the request model near `RehabCheckRequest` (main.py:495):

```python
class PrescriptionCheckRequest(BaseModel):
    drill_key: str
    date: str
```

Add the endpoint after `get_my_prescription`:

```python
@app.post("/api/prescriptions/check")
@limiter.limit("60/minute")
def check_my_prescription(
    request: Request,
    req: PrescriptionCheckRequest,
    user: dict = Depends(get_current_user),
):
    """Check off a drill for the active block on `date`. Idempotent per day.
    Auto-completes the block at 100% and reports XP to award (client-side)."""
    if not _DATE_RE.match(req.date or ""):
        raise HTTPException(status_code=400, detail="date must be YYYY-MM-DD")
    if not req.drill_key or len(req.drill_key) > 200:
        raise HTTPException(status_code=400, detail="drill_key invalid")
    active = get_active_prescription(user["id"])
    if active is None:
        raise HTTPException(status_code=404, detail="no_active_prescription")
    valid_keys = {d["key"] for d in active["drills_json"]}
    if req.drill_key not in valid_keys:
        raise HTTPException(status_code=400, detail="drill_key not in active block")

    check_prescription_drill(user["id"], active["id"], req.drill_key, req.date)
    checkoffs = get_prescription_checkoffs(user["id"], active["id"])
    payload = _serialize_prescription(active, checkoffs)

    completed = payload["progress"]["pct"] >= 100
    if completed:
        complete_prescription(active["id"])
        payload = {**payload, "status": "completed"}
    return {
        "prescription": payload,
        "completed": completed,
        "xp": PRESCRIPTION_XP if completed else 0,
    }
```

(`_DATE_RE` already exists in `main.py`, used by the rehab endpoints.)

- [ ] **Step 4: Run to verify it passes**

Run: `cd /Users/mathewbudnik/coretriage && pytest tests/test_prescription_api.py::CheckPrescriptionEndpointTests -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add main.py tests/test_prescription_api.py
git -C /Users/mathewbudnik/coretriage commit -m "feat(prescription): POST /api/prescriptions/check + auto-complete"
```

---

## PHASE 3 — Home card

### Task 7: `api.js` wrappers

**Files:**
- Modify: `frontend/src/api.js`

- [ ] **Step 1: Add the wrappers**

In `frontend/src/api.js`, after the rehab progress wrappers (line ~106), add:

```js
// Skill prescriptions (the diagnose->prescribe loop)
export const getPrescription = (date) =>
  request('GET', `/api/me/prescription?date=${encodeURIComponent(date)}`)
export const checkPrescriptionDrill = ({ drill_key, date }) =>
  request('POST', '/api/prescriptions/check', { drill_key, date })
```

- [ ] **Step 2: Verify the build still compiles**

Run: `cd /Users/mathewbudnik/coretriage/frontend && npm run build`
Expected: build succeeds (green).

- [ ] **Step 3: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/api.js
git -C /Users/mathewbudnik/coretriage commit -m "feat(prescription): api.js wrappers for prescription fetch + check"
```

### Task 8: `awardPrescriptionXP` in the reward engine

**Files:**
- Modify: `frontend/src/lib/rewardEngine.js`
- Test: `frontend/src/lib/__tests__/rewardEngine.prescription.test.js`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/lib/__tests__/rewardEngine.prescription.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { getInitialState, awardPrescriptionXP } from '../rewardEngine'

describe('awardPrescriptionXP', () => {
  it('adds XP and records the prescription id on first award', () => {
    const s0 = getInitialState()
    const { state, awarded } = awardPrescriptionXP(s0, 42, 250)
    expect(awarded).toBe(true)
    expect(state.totalXP).toBe(s0.totalXP + 250)
    expect(state.prescriptionAwards).toContain(42)
  })

  it('does not re-award the same prescription id (dedup)', () => {
    const s0 = getInitialState()
    const { state: s1 } = awardPrescriptionXP(s0, 42, 250)
    const { state: s2, awarded } = awardPrescriptionXP(s1, 42, 250)
    expect(awarded).toBe(false)
    expect(s2.totalXP).toBe(s1.totalXP) // unchanged
  })

  it('ignores a null id', () => {
    const s0 = getInitialState()
    const { state, awarded } = awardPrescriptionXP(s0, null, 250)
    expect(awarded).toBe(false)
    expect(state).toBe(s0)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd /Users/mathewbudnik/coretriage/frontend && npx vitest run src/lib/__tests__/rewardEngine.prescription.test.js`
Expected: FAIL — `awardPrescriptionXP` is not exported.

- [ ] **Step 3: Implement it**

In `frontend/src/lib/rewardEngine.js`, add `prescriptionAwards: []` to the object returned by `getInitialState()` (alongside `quest`):

```js
    quest:         { id: null, generatedDate: null, progress: { current: 0, target: 0 } },
    prescriptionAwards: [],
```

Add the pure function (place it near `addSend`):

```js
/**
 * Grant block-completion XP exactly once per prescription id. Dedup mirrors the
 * daily-quest date dedup: an id already in `prescriptionAwards` is a no-op, so a
 * reload or a re-check never re-awards. Returns { state, awarded }.
 */
export function awardPrescriptionXP(state, prescriptionId, xp) {
  const awarded = state.prescriptionAwards ?? []
  if (prescriptionId == null || awarded.includes(prescriptionId)) {
    return { state, awarded: false }
  }
  const next = {
    ...state,
    totalXP: state.totalXP + Math.max(0, xp || 0),
    prescriptionAwards: [...awarded, prescriptionId],
  }
  return { state: next, awarded: true }
}
```

In `useRewardEngine()`, add a callback and expose it:

```js
  const awardPrescription = useCallback((prescriptionId, xp) => {
    const { state: next, awarded } = awardPrescriptionXP(state, prescriptionId, xp)
    if (awarded) { setState(next); saveState(next) }
    return awarded
  }, [state])
```

and add `awardPrescription` to the returned object:

```js
  return { state, logSend, logSends, awardPrescription, reset }
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd /Users/mathewbudnik/coretriage/frontend && npx vitest run src/lib/__tests__/rewardEngine.prescription.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/lib/rewardEngine.js frontend/src/lib/__tests__/rewardEngine.prescription.test.js
git -C /Users/mathewbudnik/coretriage commit -m "feat(prescription): client-side block-completion XP (deduped by id)"
```

### Task 9: `PrescriptionCard.jsx`

**Files:**
- Create: `frontend/src/components/hub/PrescriptionCard.jsx`
- Test: `frontend/src/components/hub/PrescriptionCard.test.jsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/hub/PrescriptionCard.test.jsx`:

```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import PrescriptionCard from './PrescriptionCard'

const activePresc = {
  id: 7,
  axis: 'technique',
  status: 'active',
  drills: [
    { key: 'silent_feet', name: 'Silent feet', detail: 'Quiet placements', sets: 3, reps: '5 problems', target: 3, done: 3 },
    { key: 'edging_precision', name: 'Edging precision', detail: 'One-touch', sets: 3, reps: '5 problems', target: 3, done: 1 },
    { key: 'slab_smearing', name: 'Slab smearing', detail: 'Hips in', sets: 2, reps: '10 min', target: 3, done: 0 },
  ],
  progress: { current: 4, total: 9, pct: 44 },
}

describe('PrescriptionCard', () => {
  it('renders the active block: axis eyebrow, 3 drills, progress', () => {
    render(<PrescriptionCard prescription={activePresc} gapAxis="technique" hasSends onCheck={() => {}} />)
    expect(screen.getByText(/PRESCRIBED/i)).toBeTruthy()
    expect(screen.getByText(/Technique/i)).toBeTruthy()
    expect(screen.getByText('Silent feet')).toBeTruthy()
    expect(screen.getByText('Slab smearing')).toBeTruthy()
    expect(screen.getByText(/4 \/ 9|4 of 9/)).toBeTruthy()
  })

  it('calls onCheck with the drill key when an incomplete drill is tapped', () => {
    const onCheck = vi.fn()
    render(<PrescriptionCard prescription={activePresc} gapAxis="technique" hasSends onCheck={onCheck} />)
    fireEvent.click(screen.getByText('Slab smearing'))
    expect(onCheck).toHaveBeenCalledWith('slab_smearing')
  })

  it('renders the balanced rest state when there is a gap-less pentagon', () => {
    render(<PrescriptionCard prescription={null} gapAxis={null} hasSends onCheck={() => {}} />)
    expect(screen.getByText(/Well-rounded/i)).toBeTruthy()
    expect(screen.queryByText('Silent feet')).toBeNull()
  })

  it('renders the empty state for a climber with no sends', () => {
    render(<PrescriptionCard prescription={null} gapAxis={null} hasSends={false} onCheck={() => {}} />)
    expect(screen.getByText(/log a few sends/i)).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd /Users/mathewbudnik/coretriage/frontend && npx vitest run src/components/hub/PrescriptionCard.test.jsx`
Expected: FAIL — cannot resolve `./PrescriptionCard`.

- [ ] **Step 3: Create the component**

Create `frontend/src/components/hub/PrescriptionCard.jsx`. Uses Almanac `.ct-surface` + `skillColor` tint, lucide icons, no emojis, snappy motion. Mirrors the approved mockup.

```jsx
import { motion } from 'framer-motion'
import { Check, ArrowRight, Loader2, Sparkles } from 'lucide-react'
import { skillColor, skillLabel } from '../../lib/skills'

/**
 * PrescriptionCard — the Home "diagnose -> prescribe" card.
 *
 * Three states:
 *   - active block: skill-tinted field card, 3 drill rows you check off, progress bar
 *   - balanced:     no real gap -> a "well-rounded" rest state (no drills)
 *   - empty:        no sends yet -> a gentle "log sends" nudge
 *
 * Props:
 *   prescription: serialized block { id, axis, status, drills[{key,name,detail,sets,reps,target,done}], progress } | null
 *   gapAxis:      canonical axis key | null
 *   hasSends:     bool — whether the climber has any pentagon at all
 *   onCheck:      (drillKey) => void
 *   checkingKey:  string | null — drill currently posting (shows a spinner)
 */
function hexToRgba(hex, a) {
  const h = hex.replace('#', '')
  const n = parseInt(h, 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

export default function PrescriptionCard({ prescription, gapAxis, hasSends, onCheck, checkingKey = null }) {
  // ── Empty: no sends yet ─────────────────────────────────────────────
  if (!hasSends) {
    return (
      <div className="ct-surface p-5 text-center">
        <p className="ct-eyebrow text-ink-muted">Prescribed for you</p>
        <p className="mt-2 text-[15px] font-semibold text-ink" style={{ fontFamily: 'Fraunces, serif' }}>
          Log a few sends to unlock your prescription
        </p>
        <p className="mt-1 text-[12px] text-ink-soft">Your weakest skill becomes a weekly focus block.</p>
      </div>
    )
  }

  // ── Balanced: a pentagon but no real gap ────────────────────────────
  if (!prescription) {
    return (
      <div className="ct-surface p-5 text-center">
        <div className="mx-auto mb-3 w-11 h-11 rounded-full border-2 border-dashed border-ct-rim flex items-center justify-center">
          <Sparkles size={20} className="text-sage-deep" />
        </div>
        <p className="ct-eyebrow text-ink-muted">No standout gap</p>
        <p className="mt-1.5 text-[16px] font-semibold text-ink" style={{ fontFamily: 'Fraunces, serif' }}>
          Well-rounded right now
        </p>
        <p className="mt-1 text-[12px] text-ink-soft">
          Your five skills are even. Keep climbing — the next gap surfaces as you push grades.
        </p>
      </div>
    )
  }

  // ── Active block ────────────────────────────────────────────────────
  const axis = prescription.axis
  const color = skillColor(axis)
  const label = skillLabel(axis)
  const { current, total, pct } = prescription.progress

  return (
    <div className="ct-surface relative overflow-hidden p-0">
      <div className="absolute inset-y-0 left-0 w-1" style={{ background: color }} />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(120% 80% at 0% 0%, ${hexToRgba(color, 0.1)}, transparent 60%)` }}
      />
      <div className="relative p-4 pl-[18px]">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: color }} />
            <span className="ct-eyebrow" style={{ color }}>Prescribed · {label}</span>
          </div>
          <span className="ct-eyebrow text-ink-muted border border-ct-rim rounded-full px-2 py-0.5">Week 1</span>
        </div>

        <p className="mt-2 text-[18px] leading-tight font-semibold text-ink" style={{ fontFamily: 'Fraunces, serif' }}>
          {label} is your gap
        </p>
        <p className="mt-1 text-[12.5px] text-ink-soft">Your thinnest axis — three drills to thicken it this week.</p>

        <div className="mt-3">
          {prescription.drills.map((d) => {
            const complete = d.done >= d.target
            const busy = checkingKey === d.key
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => !complete && !busy && onCheck(d.key)}
                className="w-full flex items-center gap-3 py-2.5 border-t border-ct-hairline first:border-t-0 text-left"
              >
                <span
                  className="flex-none w-[22px] h-[22px] rounded-full border-[1.8px] flex items-center justify-center"
                  style={{
                    borderColor: complete ? color : 'var(--ct-rim, #bcae8a)',
                    background: complete ? color : 'transparent',
                  }}
                >
                  {busy ? <Loader2 size={12} className="animate-spin text-ink-muted" />
                        : complete ? <Check size={13} className="text-cream" /> : null}
                </span>
                <span className="flex-1 min-w-0">
                  <span className={`block text-[13.5px] font-semibold leading-tight ${complete ? 'text-ink-muted line-through' : 'text-ink'}`}>
                    {d.name}
                  </span>
                  <span className="block ct-meta text-ink-muted mt-0.5">{d.sets} × {d.reps}</span>
                </span>
                <span className="flex-none flex gap-1">
                  {Array.from({ length: d.target }).map((_, i) => (
                    <span
                      key={i}
                      className="w-[7px] h-[7px] rounded-full border-[1.5px]"
                      style={{
                        borderColor: i < d.done ? color : 'var(--ct-rim, #bcae8a)',
                        background: i < d.done ? color : 'transparent',
                      }}
                    />
                  ))}
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-3">
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="ct-eyebrow text-ink-muted">Block progress</span>
            <span className="ct-meta text-ink font-bold ct-tnum">{current} / {total}</span>
          </div>
          <div className="h-[7px] rounded-full bg-ink/[0.10] overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: color }}
              initial={{ width: `${pct}%` }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.16, ease: [0.2, 0.7, 0.2, 1] }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
```

(If `--ct-rim` is not defined as a CSS var, the literal fallback `#bcae8a` matches the `ct-rim` token — consistent with the existing pattern in `GradePyramidCard`.)

- [ ] **Step 4: Run to verify it passes**

Run: `cd /Users/mathewbudnik/coretriage/frontend && npx vitest run src/components/hub/PrescriptionCard.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/components/hub/PrescriptionCard.jsx frontend/src/components/hub/PrescriptionCard.test.jsx
git -C /Users/mathewbudnik/coretriage commit -m "feat(prescription): Home PrescriptionCard (active/balanced/empty)"
```

### Task 10: Wire the card into `HubTab.jsx`

**Files:**
- Modify: `frontend/src/components/HubTab.jsx`

- [ ] **Step 1: Add imports**

In `frontend/src/components/HubTab.jsx`, extend the existing imports:

```jsx
import { getMeState, getPentagonSnapshots, getPrescription, checkPrescriptionDrill } from '../api'
import CelebrationOverlay from './ui/CelebrationOverlay'
import PrescriptionCard from './hub/PrescriptionCard'
```

and add `awardPrescription` from the reward engine hook:

```jsx
  const { state: engine, awardPrescription } = useRewardEngine()
```

- [ ] **Step 2: Add state + fetch + handlers**

Add a local date helper and state near the top of the component (after the existing `useState` lines):

```jsx
  const [rx, setRx] = useState(null)            // { gap_axis, prescription }
  const [checkingKey, setCheckingKey] = useState(null)
  const [celebrate, setCelebrate] = useState(null) // { xp } | null

  const today = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })()
```

Fetch the prescription in the existing mount `useEffect` by extending the `Promise.all`:

```jsx
  useEffect(() => {
    let cancelled = false
    Promise.all([getMeState(), getPentagonSnapshots(6), getPrescription(today)])
      .then(([s, ss, r]) => {
        if (cancelled) return
        setState(s)
        setSnapshots(
          (ss.snapshots || []).map((snap) => ({ capturedAt: snap.captured_at, axes: snap.axes })),
        )
        setRx(r)
      })
      .catch((err) => console.error('[HubTab] state fetch failed', err))
    return () => { cancelled = true }
  }, [])
```

Add the check handler (place after `xpPct` is computed):

```jsx
  async function handleCheckDrill(drillKey) {
    if (checkingKey) return
    setCheckingKey(drillKey)
    try {
      const res = await checkPrescriptionDrill({ drill_key: drillKey, date: today })
      setRx((prev) => ({ ...prev, prescription: res.prescription }))
      if (res.completed) {
        const id = res.prescription?.id
        if (awardPrescription(id, res.xp)) setCelebrate({ xp: res.xp })
        // Re-fetch so the next block (new gap) or the balanced state appears.
        getPrescription(today).then(setRx).catch(() => {})
      }
    } catch (err) {
      console.error('[HubTab] check failed', err)
    } finally {
      setCheckingKey(null)
    }
  }
```

- [ ] **Step 3: Render the card at the top of `todaySection`**

Replace the existing `todaySection` (lines 95-100) with:

```jsx
  const todaySection = (
    <div className="space-y-4">
      <PrescriptionCard
        prescription={rx?.prescription}
        gapAxis={rx?.gap_axis}
        hasSends={!!state?.pentagon}
        onCheck={handleCheckDrill}
        checkingKey={checkingKey}
      />
      <TodaysQuestCard />
      <HubRecentSends />
    </div>
  )
```

Add the celebration overlay just before the closing `</div>` of the root return (after the `isDesktop ? ... : ...` block):

```jsx
      <CelebrationOverlay
        open={!!celebrate}
        onClose={() => setCelebrate(null)}
        title="BLOCK COMPLETE"
        subtitle={celebrate ? `+${celebrate.xp} XP` : ''}
      />
```

- [ ] **Step 4: Verify build + existing tests**

Run: `cd /Users/mathewbudnik/coretriage/frontend && npm run build && npx vitest run`
Expected: build green; all vitest suites pass (including the new PrescriptionCard + rewardEngine tests).

- [ ] **Step 5: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/components/HubTab.jsx
git -C /Users/mathewbudnik/coretriage commit -m "feat(prescription): wire PrescriptionCard into Home Today + completion celebration"
```

---

## PHASE 4 — Coach see + assign

### Task 11: `user_id` on threads + coach prescription endpoints

**Files:**
- Modify: `database.py` — `list_coach_threads` (add `user_id` to each row)
- Modify: `main.py` — coach GET/POST endpoints
- Test: `tests/test_prescription_api.py` — add `CoachPrescriptionEndpointTests`

- [ ] **Step 1: Write the failing test**

Append to `tests/test_prescription_api.py`:

```python
def _make_coach(email: str) -> str:
    """Register a user and promote them to the coach role; return bearer token."""
    token = _register_and_login(email)
    with _connect() as conn, conn.cursor() as cur:
        cur.execute("UPDATE users SET role = 'coach' WHERE email = %s;", (email,))
        conn.commit()
    return token


class CoachPrescriptionEndpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()

    def setUp(self):
        self.client_email = "rx_client_test@coretriage.local"
        self.coach_email = "rx_coach_test@coretriage.local"
        _cleanup_user(self.client_email)
        _cleanup_user(self.coach_email)
        self.client_token = _register_and_login(self.client_email)
        self.client_uid = _user_id(self.client_email)
        self.coach_token = _make_coach(self.coach_email)

    def tearDown(self):
        _cleanup_user(self.client_email)
        _cleanup_user(self.coach_email)

    def _coach_auth(self):
        return {"Authorization": f"Bearer {self.coach_token}"}

    def _client_auth(self):
        return {"Authorization": f"Bearer {self.client_token}"}

    def test_non_coach_is_forbidden(self):
        r = TestClient(app).get(
            f"/api/admin/coach/clients/{self.client_uid}/prescription",
            headers=self._client_auth(),
        )
        self.assertEqual(r.status_code, 403)

    def test_coach_sees_client_block(self):
        # Seed a gap on the client.
        _seed_send(self.client_uid, "V8", {"powerful": 1})
        _seed_send(self.client_uid, "V1", {"technical": 1}, date="2026-05-21")
        r = TestClient(app).get(
            f"/api/admin/coach/clients/{self.client_uid}/prescription",
            headers=self._coach_auth(),
        )
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json()["gap_axis"], "technique")

    def test_coach_assigns_a_block(self):
        r = TestClient(app).post(
            f"/api/admin/coach/clients/{self.client_uid}/prescription",
            json={"axis": "mobility", "drill_keys": ["shoulder_cars", "deep_squat_hip_opener", "wrist_loading_prep"]},
            headers=self._coach_auth(),
        )
        self.assertEqual(r.status_code, 200, r.text)
        presc = r.json()["prescription"]
        self.assertEqual(presc["axis"], "mobility")
        self.assertEqual(presc["source"], "coach")
        # The client now sees the coach-assigned block.
        seen = TestClient(app).get(
            "/api/me/prescription?date=2026-06-11", headers=self._client_auth()
        ).json()["prescription"]
        self.assertEqual(seen["axis"], "mobility")
        self.assertEqual(seen["source"], "coach")
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd /Users/mathewbudnik/coretriage && pytest tests/test_prescription_api.py::CoachPrescriptionEndpointTests -v`
Expected: FAIL — 404 (endpoints missing).

- [ ] **Step 3a: Add `user_id` to `list_coach_threads`**

In `database.py`, find `list_coach_threads` (returns the inbox rows). Add `user_id` to the SELECT and to each returned dict. For example, if the function builds rows as dicts, add `"user_id": row[<idx>]` and include the threads table's `user_id` column in the query. (The threads table already stores `user_id` — it is how `get_thread_by_user` works.) The added key must be named exactly `user_id`.

- [ ] **Step 3b: Add a coach drill-selection helper to `src/prescriptions.py`**

To honor a coach's explicit `drill_keys`, add to `src/prescriptions.py`:

```python
def drills_for_keys(axis: str, drill_keys: list[str]) -> list[dict]:
    """Resolve explicit catalog keys (within an axis) to drill dicts, in the
    given order. Unknown keys are skipped; falls back to `select_block` if none resolve."""
    axis = canon_axis(axis)
    by_key = {d["key"]: d for d in AXIS_TO_DRILLS.get(axis, [])}
    chosen = [by_key[k] for k in (drill_keys or []) if k in by_key]
    return chosen or select_block(axis)
```

(Add a quick assertion to `tests/test_prescriptions.py` `SelectBlockTests`: `self.assertEqual([d["key"] for d in drills_for_keys("mobility", ["shoulder_cars"])], ["shoulder_cars"])`, importing `drills_for_keys`.)

- [ ] **Step 3c: Add the coach endpoints in `main.py`**

Update the `src.prescriptions` import to include the new helper:

```python
from src.prescriptions import compute_gap_axis, select_block, drills_for_keys, AXIS_TO_DRILLS
```

Add a request model near the others:

```python
class CoachAssignPrescriptionRequest(BaseModel):
    axis: str
    drill_keys: list[str] = []
```

Add the endpoints near the other `/api/admin/coach/*` handlers (main.py:1999+):

```python
@app.get("/api/admin/coach/clients/{client_id}/prescription")
@limiter.limit("60/minute")
def coach_get_client_prescription(
    request: Request, client_id: int, _coach: dict = Depends(require_coach),
):
    """Coach view of a client's gap + active block (auto-generates like the user route)."""
    return _active_block_payload(client_id)


@app.post("/api/admin/coach/clients/{client_id}/prescription")
@limiter.limit("20/minute")
def coach_assign_client_prescription(
    request: Request,
    client_id: int,
    req: CoachAssignPrescriptionRequest,
    coach: dict = Depends(require_coach),
):
    """Assign a coach-authored block to a client, replacing any active one."""
    axis = req.axis
    if axis not in AXIS_TO_DRILLS:
        raise HTTPException(status_code=400, detail="axis invalid")
    drills = drills_for_keys(axis, req.drill_keys)
    create_prescription(client_id, axis, drills, source="coach", assigned_by=coach["id"])
    return _active_block_payload(client_id)
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd /Users/mathewbudnik/coretriage && pytest tests/test_prescription_api.py::CoachPrescriptionEndpointTests tests/test_prescriptions.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add main.py database.py src/prescriptions.py tests/test_prescription_api.py tests/test_prescriptions.py
git -C /Users/mathewbudnik/coretriage commit -m "feat(prescription): coach see + assign endpoints (require_coach, keyed by user_id)"
```

### Task 12: Coach inbox — see + assign UI

**Files:**
- Modify: `frontend/src/api.js` — coach wrappers
- Modify: `frontend/src/components/CoachInbox.jsx` — per-client block panel

- [ ] **Step 1: Add the api wrappers**

In `frontend/src/api.js`, after the prescription wrappers, add:

```js
export const getClientPrescription = (userId) =>
  request('GET', `/api/admin/coach/clients/${encodeURIComponent(userId)}/prescription`)
export const assignClientPrescription = (userId, { axis, drill_keys }) =>
  request('POST', `/api/admin/coach/clients/${encodeURIComponent(userId)}/prescription`, { axis, drill_keys })
```

- [ ] **Step 2: Surface the block when a thread is opened**

In `frontend/src/components/CoachInbox.jsx`:

Add imports:

```jsx
import { getClientPrescription, assignClientPrescription } from '../api'
import { skillLabel, SKILL_KEYS } from '../lib/skills'
```

Add state:

```jsx
  const [clientRx, setClientRx] = useState(null)   // { gap_axis, prescription }
```

In `selectThread(thread)`, after `setMessages(msgs)` succeeds, fetch the block (the thread row now carries `user_id` from Task 11):

```jsx
    setClientRx(null)
    if (thread.user_id) {
      getClientPrescription(thread.user_id).then(setClientRx).catch(() => setClientRx(null))
    }
```

Add an assign handler inside the component:

```jsx
  async function assignBlock(axis) {
    if (!selectedThread?.user_id) return
    try {
      const updated = await assignClientPrescription(selectedThread.user_id, { axis, drill_keys: [] })
      setClientRx(updated)
    } catch (err) {
      setError(err.message || 'Could not assign a block.')
    }
  }
```

Render a compact read-only block summary + an assign row at the top of the thread message pane (just inside the messages container, above the `messages.map(...)`):

```jsx
              {clientRx && (
                <div className="ct-surface p-3 mb-3">
                  <p className="ct-eyebrow text-ink-muted">Skill prescription</p>
                  {clientRx.prescription ? (
                    <p className="text-[13px] text-ink mt-1">
                      <span className="font-semibold">{skillLabel(clientRx.prescription.axis)}</span> block ·{' '}
                      {clientRx.prescription.progress.current}/{clientRx.prescription.progress.total} done
                      {clientRx.prescription.source === 'coach' ? ' · assigned' : ''}
                    </p>
                  ) : (
                    <p className="text-[13px] text-ink-soft mt-1">
                      {clientRx.gap_axis ? `Gap: ${skillLabel(clientRx.gap_axis)}` : 'Well-rounded — no gap'}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {SKILL_KEYS.map((axis) => (
                      <button
                        key={axis}
                        type="button"
                        onClick={() => assignBlock(axis)}
                        className="text-[11px] font-semibold px-2 py-1 rounded-full border border-ct-rim text-ink-soft hover:bg-clay/12 hover:text-ink transition-colors"
                      >
                        Assign {skillLabel(axis)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
```

- [ ] **Step 3: Verify build + tests**

Run: `cd /Users/mathewbudnik/coretriage/frontend && npm run build && npx vitest run`
Expected: build green; all vitest suites pass.

- [ ] **Step 4: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/api.js frontend/src/components/CoachInbox.jsx
git -C /Users/mathewbudnik/coretriage commit -m "feat(prescription): coach inbox sees + assigns a client's skill block"
```

---

## PHASE 5 — Polish + verify

### Task 13: Full verification gate

**Files:** none (verification only; small fixes if the gate flags anything)

- [ ] **Step 1: Backend tests**

Run: `cd /Users/mathewbudnik/coretriage && pytest tests/test_prescriptions.py tests/test_prescription_api.py -v`
Expected: all PASS. (`test_prescriptions.py` is CI-safe; `test_prescription_api.py` needs a reachable Postgres, same as the repo's other endpoint tests.)

- [ ] **Step 2: Frontend build + tests**

Run: `cd /Users/mathewbudnik/coretriage/frontend && npm run build && npx vitest run`
Expected: build green; ~148 prior tests + the new PrescriptionCard/rewardEngine tests all pass.

- [ ] **Step 3: Almanac grep gate (must be 0)**

Run from `frontend/`:

```bash
cd /Users/mathewbudnik/coretriage/frontend && grep -rnE "217,119,87|#d97757|#f0a875|#1c2520|#243530|#1f2924|#f0f5ed|#c8d3c4|#14b8a6|#fb7185|#fbbf24|#95a698|#7dd3c0|#a78bfa|text-white|rgba\(255,255,255" src --include=*.jsx --include=*.js | grep -v ".test." | grep -v "__tests__"
```

Expected: **no output** (zero hits). The new `PrescriptionCard.jsx` and `CoachInbox.jsx` edits use only tokens / skill colors.

- [ ] **Step 4: Lint the backend**

Run: `cd /Users/mathewbudnik/coretriage && ruff check src/prescriptions.py main.py database.py`
Expected: no errors (matches CI's `ruff check .`).

- [ ] **Step 5: Manual smoke (optional but recommended)**

Start the app (`cd frontend && npm run dev`; backend `uvicorn main:app --reload --port 8000`), sign in as a user with a clear skill gap, confirm: the prescription card shows on Home → Today, tapping a drill fills a rep dot + the bar, completing all 9 fires the celebration and re-targets, and a coach account sees + can assign a block from the inbox thread view.

- [ ] **Step 6: Final commit (if any polish fixes were needed)**

```bash
git -C /Users/mathewbudnik/coretriage add -A
git -C /Users/mathewbudnik/coretriage commit -m "chore(prescription): verification gate — build/tests/grep green"
```

---

## Self-Review notes (already reconciled against the spec)

- **Spec coverage:** catalog+gap (Task 1-2), 2 tables (Task 3), helpers (Task 4), GET/auto-gen (Task 5), check/complete (Task 6), Home card+XP+celebration (Task 7-10), coach see+assign (Task 11-12), verify (Task 13). All spec sections map to a task.
- **Key spelling** reconciled in exactly one place: `canon_axis` (`crimpy→crimp`, `technical→technique`). Backend pentagon keys flow through it in `compute_gap_axis` and `select_block`.
- **Coach reality:** no relationship model — endpoints under `/api/admin/coach/`, `require_coach` only, keyed by `user_id` (added to `list_coach_threads`). Matches existing `admin_reply`.
- **XP ownership:** client-side only (`awardPrescriptionXP`, deduped by prescription id); server's `xp` field is informational. No double-counting on reload.
- **Type consistency:** the serialized block shape (`{id, axis, status, source, drills:[{key,name,detail,sets,reps,target,done}], progress:{current,total,pct}}`) is identical in `_serialize_prescription` (Task 5), the GET/POST responses (Task 5-6), the card props (Task 9), and the HubTab wiring (Task 10).
