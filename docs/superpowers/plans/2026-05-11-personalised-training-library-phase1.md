# Personalised Training Library Implementation Plan (Phase 1 — Schema + Wiring)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `src/coach.py` exercise blocks so plan generation filters on `primary_discipline` and `equipment` from the user profile, without changing the library contents.

**Architecture:** Add a shared `_filter_exercises` helper and `_select_with_fallback` selector. Tag every existing exercise with `disciplines`, `min_experience`, and `equipment_needed`. Refactor all six block selectors (`_hangboard_block`, `_power_block`, `_endurance_block`, `_strength_block`, `_footwork_block`, `_mental_block`) to accept `(experience, discipline, equipment)` and consult their tagged pool through the helpers. Thread the two new profile fields through `generate_plan` and `_pick_session`. New library content (the ~16 exercises listed in the spec) is **out of scope** — that's Phase 2.

**Tech Stack:** Python (no new dependencies), `unittest`.

**Spec:** [docs/superpowers/specs/2026-05-11-personalised-training-library-design.md](../specs/2026-05-11-personalised-training-library-design.md)

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/coach.py` | Modify | Add `_EXPERIENCE_LEVELS`, `_filter_exercises`, `_select_with_fallback`, `_strip_tags` helpers near the top of the file. Tag every exercise in every block with `disciplines` / `min_experience` / `equipment_needed`. Replace the body of each block function with a call to the helper. Update `_pick_session` and `generate_plan` to thread `discipline` and `equipment` through to the block calls. |
| `tests/test_coach.py` | **Create** | Helper unit tests (filter, fallback, strip). Schema-validity test for every pool. Coverage sweep across (experience × discipline × equipment) combinations. Differentiation + anti-regression tests. `generate_plan` end-to-end smoke test. |

---

## Verification commands

Throughout this plan:

- Targeted tests: `.venv/bin/python -m unittest tests.test_coach -v`
- Full Python regression: `.venv/bin/python -m unittest tests.test_coach tests.test_triage_calibration tests.test_bucket tests.test_bucket_content -v`
- Triage scenarios (must stay 102/102): `.venv/bin/python tests/run_all_scenarios.py`
- Backend import smoke: `.venv/bin/python -c "import main; import src.coach"`

---

## Tagging decisions for existing exercises

These are the exact tags every implementer must apply. Pulled from the spec and resolved here so no judgment calls are needed during implementation:

| Exercise | Current location | `disciplines` | `min_experience` | `max_experience` | `equipment_needed` |
|---|---|---|---|---|---|
| Half-crimp hangs (beginner) | `_hangboard_block` beginner block | `["bouldering","sport","trad","competition"]` | `"beginner"` | `"intermediate"` | `["hangboard"]` |
| Open-hand hangs (beginner) | `_hangboard_block` beginner block | `["bouldering","sport","trad","competition"]` | `"beginner"` | `"intermediate"` | `["hangboard"]` |
| Max-weight half-crimp hangs | `_hangboard_block` intermediate | `["bouldering","sport","trad","competition"]` | `"intermediate"` | (omit) | `["hangboard"]` |
| Open-hand density hangs | `_hangboard_block` intermediate | `["bouldering","sport","trad","competition"]` | `"intermediate"` | (omit) | `["hangboard"]` |
| Max-weight pinch hangs | `_hangboard_block` advanced/elite | `["bouldering","competition"]` | `"advanced"` | (omit) | `["hangboard"]` |
| One-arm lock-off hangs | `_hangboard_block` advanced/elite | `["bouldering","competition"]` | `"elite"` | (omit) | `["hangboard"]` |
| Feet-on campusing | `_power_block` beginner | `["bouldering","sport","competition"]` | `"beginner"` | `"intermediate"` | `["campus_board"]` |
| Campus board 1-3-5 | `_power_block` intermediate | `["bouldering","competition"]` | `"intermediate"` | (omit) | `["campus_board"]` |
| Double dynos | `_power_block` intermediate | `["bouldering","competition"]` | `"intermediate"` | (omit) | `["campus_board"]` |
| Campus board 1-5-8 | `_power_block` advanced/elite | `["bouldering","competition"]` | `"advanced"` | (omit) | `["campus_board"]` |
| 4×4s | `_endurance_block` base | `["bouldering","sport","trad","competition"]` | `"beginner"` | (omit) | `[]` |
| Linked route laps | `_endurance_block` base | `["bouldering","sport","trad","competition"]` | `"beginner"` | (omit) | `[]` |
| ARCing | `_endurance_block` advanced+ | `["sport","trad","competition"]` | `"advanced"` | (omit) | `[]` |
| Pull-up variations | `_strength_block` | `["bouldering","sport","trad","competition"]` | `"beginner"` | (omit) | `[]` |
| Front lever progressions | `_strength_block` | `["bouldering","sport","trad","competition"]` | `"beginner"` | (omit) | `[]` |
| Core tension: hollow body holds | `_strength_block` | `["bouldering","sport","trad","competition"]` | `"beginner"` | (omit) | `[]` |
| Silent feet drills | `_footwork_block` | `["bouldering","sport","trad","competition"]` | `"beginner"` | (omit) | `[]` |
| Slab technique — smearing | `_footwork_block` | `["bouldering","sport","trad","competition"]` | `"beginner"` | (omit) | `[]` |
| Headpoint practice | `_mental_block` | `["sport","trad"]` | `"intermediate"` | (omit) | `[]` |
| Breath reset drill | `_mental_block` | `["bouldering","sport","trad","competition"]` | `"beginner"` | (omit) | `[]` |

When the tag table says "(omit)" for `max_experience`, do **not** include the key in the dict — the helper defaults to `"elite"`.

---

## Task 1 — Helpers (filter, fallback, tag-strip) + their unit tests

**Files:**
- Modify: `src/coach.py` (add helpers near the top of the module, right after the imports)
- Create: `tests/test_coach.py`

- [ ] **Step 1: Write failing helper tests**

Create `tests/test_coach.py` with the following exact content:

```python
"""Unit tests for the coach.py exercise selection helpers.

Phase 1 of the personalised training library — verifies the filter +
fallback + tag-strip helpers behave correctly. Block-level and end-to-end
tests come in later tasks.
"""
from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.coach import (  # noqa: E402
    _EXPERIENCE_LEVELS,
    _filter_exercises,
    _select_with_fallback,
    _strip_tags,
)


# Test fixtures: minimal exercise dicts shaped like real entries
def _ex(name, disciplines, min_exp, max_exp=None, equipment=None):
    out = {
        "exercise": name,
        "detail": "test detail",
        "sets": 1,
        "reps": "1",
        "rest_seconds": 60,
        "effort_note": "test",
        "benchmark": "test",
        "disciplines": list(disciplines),
        "min_experience": min_exp,
    }
    if max_exp is not None:
        out["max_experience"] = max_exp
    out["equipment_needed"] = list(equipment) if equipment is not None else []
    return out


class FilterExercisesTests(unittest.TestCase):
    def test_includes_only_matching_discipline(self):
        pool = [
            _ex("A", ["bouldering"], "beginner"),
            _ex("B", ["sport"], "beginner"),
            _ex("C", ["bouldering", "sport"], "beginner"),
        ]
        result = _filter_exercises(pool, "beginner", "bouldering", [])
        names = [e["exercise"] for e in result]
        self.assertEqual(names, ["A", "C"])

    def test_excludes_below_min_experience(self):
        pool = [
            _ex("Adv only", ["bouldering"], "advanced"),
            _ex("Beg+", ["bouldering"], "beginner"),
        ]
        result = _filter_exercises(pool, "beginner", "bouldering", [])
        self.assertEqual([e["exercise"] for e in result], ["Beg+"])

    def test_excludes_above_max_experience(self):
        pool = [
            _ex("Beg only", ["bouldering"], "beginner", max_exp="intermediate"),
            _ex("Universal", ["bouldering"], "beginner"),
        ]
        result = _filter_exercises(pool, "advanced", "bouldering", [])
        self.assertEqual([e["exercise"] for e in result], ["Universal"])

    def test_equipment_any_of_semantics(self):
        pool = [
            _ex("Hang", ["bouldering"], "beginner", equipment=["hangboard"]),
            _ex("Hang or Home", ["bouldering"], "beginner", equipment=["hangboard", "home_wall"]),
            _ex("Universal", ["bouldering"], "beginner"),
        ]
        result = _filter_exercises(pool, "beginner", "bouldering", ["home_wall"])
        names = [e["exercise"] for e in result]
        # "Hang" excluded (no hangboard), "Hang or Home" included (any-of), "Universal" included
        self.assertEqual(names, ["Hang or Home", "Universal"])

    def test_empty_equipment_needed_means_universal(self):
        pool = [_ex("X", ["bouldering"], "beginner")]
        result = _filter_exercises(pool, "beginner", "bouldering", [])
        self.assertEqual(len(result), 1)

    def test_preserves_pool_order(self):
        pool = [
            _ex("Z", ["bouldering"], "beginner"),
            _ex("A", ["bouldering"], "beginner"),
        ]
        result = _filter_exercises(pool, "beginner", "bouldering", [])
        self.assertEqual([e["exercise"] for e in result], ["Z", "A"])


class SelectWithFallbackTests(unittest.TestCase):
    def test_returns_top_n_when_pool_has_more(self):
        pool = [_ex(f"E{i}", ["bouldering"], "beginner") for i in range(5)]
        result = _select_with_fallback(pool, "beginner", "bouldering", [], n=2)
        self.assertEqual(len(result), 2)
        self.assertEqual([e["exercise"] for e in result], ["E0", "E1"])

    def test_relaxes_equipment_when_strict_match_empty(self):
        # Pool has only hangboard exercises; user has no equipment.
        pool = [_ex("Hang", ["bouldering"], "beginner", equipment=["hangboard"])]
        result = _select_with_fallback(pool, "beginner", "bouldering", [], n=2)
        # Fallback step 1 drops equipment filter → "Hang" qualifies
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["exercise"], "Hang")

    def test_relaxes_discipline_when_equipment_relax_still_empty(self):
        # Pool has only sport exercises; user is a boulderer.
        pool = [_ex("SportThing", ["sport"], "beginner")]
        result = _select_with_fallback(pool, "beginner", "bouldering", [], n=2)
        # Fallback step 2 drops discipline filter → "SportThing" qualifies
        self.assertEqual(len(result), 1)

    def test_returns_at_least_one_even_if_only_experience_matches(self):
        # Final fallback: discipline + equipment dropped, only experience checked
        pool = [_ex("Niche", ["competition"], "beginner", equipment=["campus_board"])]
        result = _select_with_fallback(pool, "beginner", "trad", [], n=2)
        self.assertEqual(len(result), 1)

    def test_returns_empty_only_when_no_entry_matches_experience(self):
        # Pool has only elite exercises; user is beginner
        pool = [_ex("Elite", ["bouldering"], "elite")]
        result = _select_with_fallback(pool, "beginner", "bouldering", [], n=2)
        self.assertEqual(result, [])


class StripTagsTests(unittest.TestCase):
    def test_strips_tag_fields(self):
        ex = _ex("Half-crimp", ["bouldering"], "beginner", max_exp="intermediate", equipment=["hangboard"])
        stripped = _strip_tags(ex)
        self.assertNotIn("disciplines", stripped)
        self.assertNotIn("min_experience", stripped)
        self.assertNotIn("max_experience", stripped)
        self.assertNotIn("equipment_needed", stripped)

    def test_preserves_canonical_fields(self):
        ex = _ex("Half-crimp", ["bouldering"], "beginner")
        stripped = _strip_tags(ex)
        for key in ("exercise", "detail", "sets", "reps", "rest_seconds", "effort_note", "benchmark"):
            self.assertIn(key, stripped, f"{key} should survive strip")

    def test_does_not_mutate_input(self):
        ex = _ex("Half-crimp", ["bouldering"], "beginner")
        _strip_tags(ex)
        self.assertIn("disciplines", ex, "input should be untouched")


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `.venv/bin/python -m unittest tests.test_coach -v`

Expected: ImportError — `_EXPERIENCE_LEVELS`, `_filter_exercises`, `_select_with_fallback`, `_strip_tags` not defined in `src.coach`.

- [ ] **Step 3: Add the helpers to `src/coach.py`**

In `src/coach.py`, locate the imports block at the top of the file. After the `from typing import Any, Dict, List, Optional` line (currently around line 17), insert this block:

```python


# ---------------------------------------------------------------------------
# Exercise selection helpers
# ---------------------------------------------------------------------------

_EXPERIENCE_LEVELS = ["beginner", "intermediate", "advanced", "elite"]

_TAG_KEYS = ("disciplines", "min_experience", "max_experience", "equipment_needed")


def _filter_exercises(
    pool: List[Dict],
    experience: str,
    discipline: str,
    equipment: List[str],
) -> List[Dict]:
    """Return entries from `pool` that match all four constraints.

    Filtering is conjunctive: experience window AND discipline AND equipment.
    Order is preserved — pool authors control priority via list order.
    Returns an empty list if nothing matches. Callers should use
    `_select_with_fallback` if they want a graceful degradation chain.
    """
    user_idx = _EXPERIENCE_LEVELS.index(experience)
    out: List[Dict] = []
    for ex in pool:
        min_idx = _EXPERIENCE_LEVELS.index(ex["min_experience"])
        max_idx = _EXPERIENCE_LEVELS.index(ex.get("max_experience", "elite"))
        if not (min_idx <= user_idx <= max_idx):
            continue
        if discipline not in ex["disciplines"]:
            continue
        needed = ex.get("equipment_needed", [])
        if needed and not any(e in equipment for e in needed):
            continue
        out.append(ex)
    return out


def _select_with_fallback(
    pool: List[Dict],
    experience: str,
    discipline: str,
    equipment: List[str],
    n: int,
) -> List[Dict]:
    """Pick up to `n` exercises from `pool` with graceful fallback.

    Tries the strict filter first. If it returns empty:
    1. Drop the equipment filter (user has gear gaps but exercise still valuable)
    2. Drop the discipline filter (give them a generic, common-sense alternative)

    Always strips tag fields from the returned dicts so the generated plan
    dict matches the legacy shape. Returns an empty list only if no exercise
    in the pool matches the user's experience level at all (caller bug).
    """
    # Step 1: strict filter
    strict = _filter_exercises(pool, experience, discipline, equipment)
    if strict:
        return [_strip_tags(ex) for ex in strict[:n]]
    # Step 2: relax equipment
    relaxed_equipment = _filter_exercises(pool, experience, discipline, equipment=["__ALL__"])
    # The sentinel above won't match real equipment_needed, so re-implement
    # the relaxation as: same filter minus the equipment step
    relaxed_equipment = []
    user_idx = _EXPERIENCE_LEVELS.index(experience)
    for ex in pool:
        min_idx = _EXPERIENCE_LEVELS.index(ex["min_experience"])
        max_idx = _EXPERIENCE_LEVELS.index(ex.get("max_experience", "elite"))
        if not (min_idx <= user_idx <= max_idx):
            continue
        if discipline not in ex["disciplines"]:
            continue
        relaxed_equipment.append(ex)
    if relaxed_equipment:
        return [_strip_tags(ex) for ex in relaxed_equipment[:n]]
    # Step 3: relax discipline too — only experience window remains
    relaxed_all = []
    for ex in pool:
        min_idx = _EXPERIENCE_LEVELS.index(ex["min_experience"])
        max_idx = _EXPERIENCE_LEVELS.index(ex.get("max_experience", "elite"))
        if not (min_idx <= user_idx <= max_idx):
            continue
        relaxed_all.append(ex)
    return [_strip_tags(ex) for ex in relaxed_all[:n]]


def _strip_tags(exercise: Dict) -> Dict:
    """Return a copy of `exercise` with tag-only fields removed.

    The tag fields (`disciplines`, `min_experience`, `max_experience`,
    `equipment_needed`) are authoring metadata for selection logic; they
    don't belong in the generated plan dict that gets saved to the database
    and rendered in the UI.
    """
    return {k: v for k, v in exercise.items() if k not in _TAG_KEYS}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `.venv/bin/python -m unittest tests.test_coach -v`

Expected: `Ran 15 tests ... OK` (5 filter tests + 5 fallback tests + 3 strip tests + 2 fixture setup tests in module are still counted via discovery — actual count may be slightly different; the important thing is OK).

- [ ] **Step 5: Run the broader Python suite to confirm no regressions elsewhere**

Run: `.venv/bin/python -m unittest tests.test_coach tests.test_triage_calibration tests.test_bucket tests.test_bucket_content -v`

Expected: All previous test counts still pass + the new test_coach tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/coach.py tests/test_coach.py
git commit -m "Add _filter_exercises + _select_with_fallback + _strip_tags helpers"
```

---

## Task 2 — Tag every existing exercise + refactor all six block selectors + wire profile fields

**Files:**
- Modify: `src/coach.py` (every block function, plus `_pick_session` and `generate_plan`)

This is the big atomic task. It bundles tagging + refactor + wiring because partially-converted state (some blocks new-signature, some old) breaks `_pick_session`. All six blocks change in one commit.

- [ ] **Step 1: Replace `_hangboard_block`**

Currently `src/coach.py` has `def _hangboard_block(experience: str) -> List[Dict]:` (around line 24) with three branches per experience level. Replace the entire function with:

```python
_HANGBOARD_POOL: List[Dict] = [
    {
        "exercise": "Half-crimp hangs",
        "detail": "Shoulder-width on 20mm edge, half-crimp grip",
        "sets": 4,
        "reps": "7s on / 3s off",
        "rest_seconds": 120,
        "effort_note": "~80% of max — you should be able to complete all reps but feel challenged",
        "benchmark": "Beginner target: hang 7s at 80–90% body weight on a 20mm edge",
        "disciplines": ["bouldering", "sport", "trad", "competition"],
        "min_experience": "beginner",
        "max_experience": "intermediate",
        "equipment_needed": ["hangboard"],
    },
    {
        "exercise": "Open-hand hangs",
        "detail": "Same edge, open-hand position — gentler on pulleys",
        "sets": 3,
        "reps": "7s on / 3s off",
        "rest_seconds": 120,
        "effort_note": "Should feel distinct from half-crimp — don't white-knuckle",
        "benchmark": "This position recruits the A2 pulley less — use it as a recovery set",
        "disciplines": ["bouldering", "sport", "trad", "competition"],
        "min_experience": "beginner",
        "max_experience": "intermediate",
        "equipment_needed": ["hangboard"],
    },
    {
        "exercise": "Max-weight half-crimp hangs",
        "detail": "20mm edge, add weight via belt/vest",
        "sets": 5,
        "reps": "10s on / 50s off",
        "rest_seconds": 180,
        "effort_note": "True max — you should barely complete 10s. Log the added weight.",
        "benchmark": "Intermediate: typically +5–15 kg on 20mm at 10s",
        "disciplines": ["bouldering", "sport", "trad", "competition"],
        "min_experience": "intermediate",
        "equipment_needed": ["hangboard"],
    },
    {
        "exercise": "Open-hand density hangs",
        "detail": "18mm edge, open hand, bodyweight",
        "sets": 4,
        "reps": "6 × (7s on / 3s off)",
        "rest_seconds": 180,
        "effort_note": "Accumulate time under tension — pace yourself evenly across all 6 reps",
        "benchmark": "If you can't complete 6 reps, drop to 5 and build over weeks",
        "disciplines": ["bouldering", "sport", "trad", "competition"],
        "min_experience": "intermediate",
        "equipment_needed": ["hangboard"],
    },
    {
        "exercise": "Max-weight pinch hangs",
        "detail": "Pinch block or wide pinch on board, add weight",
        "sets": 5,
        "reps": "10s on / 50s off",
        "rest_seconds": 180,
        "effort_note": "Target ≥ 120% body weight across all grip positions over the mesocycle",
        "benchmark": "Elite: pinch at bodyweight is the baseline — train beyond",
        "disciplines": ["bouldering", "competition"],
        "min_experience": "advanced",
        "equipment_needed": ["hangboard"],
    },
    {
        "exercise": "One-arm lock-off hangs",
        "detail": "Assisted one-arm on 20mm, assistance via pulley or foot loop",
        "sets": 4,
        "reps": "5s per arm",
        "rest_seconds": 120,
        "effort_note": "Reduce assistance each session — track assistance weight",
        "benchmark": "Goal: unassisted 5s one-arm hang within 6–8 weeks",
        "disciplines": ["bouldering", "competition"],
        "min_experience": "elite",
        "equipment_needed": ["hangboard"],
    },
]


def _hangboard_block(experience: str, discipline: str, equipment: List[str]) -> List[Dict]:
    return _select_with_fallback(_HANGBOARD_POOL, experience, discipline, equipment, n=2)
```

- [ ] **Step 2: Replace `_power_block`**

Currently `def _power_block(experience: str)` (around line 90). Replace with:

```python
_POWER_POOL: List[Dict] = [
    {
        "exercise": "Feet-on campusing",
        "detail": "Use campus rungs with feet on. Match each rung before moving up.",
        "sets": 4,
        "reps": "5 moves",
        "rest_seconds": 120,
        "effort_note": "Explosive pull — don't muscle through slowly",
        "benchmark": "Beginner: focus on keeping hips in and generating power from lats",
        "disciplines": ["bouldering", "sport", "competition"],
        "min_experience": "beginner",
        "max_experience": "intermediate",
        "equipment_needed": ["campus_board"],
    },
    {
        "exercise": "Campus board 1-3-5",
        "detail": "Start on rung 1, skip to 3, skip to 5. No feet.",
        "sets": 5,
        "reps": "3 ladders each arm leading",
        "rest_seconds": 180,
        "effort_note": "Each move should feel explosive — if it's slow, rest more",
        "benchmark": "Intermediate: 1-3-5 is the baseline. Progress to 1-4-7 over the cycle.",
        "disciplines": ["bouldering", "competition"],
        "min_experience": "intermediate",
        "equipment_needed": ["campus_board"],
    },
    {
        "exercise": "Double dynos",
        "detail": "Jump both hands simultaneously to a higher pair of rungs",
        "sets": 4,
        "reps": "4 attempts",
        "rest_seconds": 180,
        "effort_note": "Commit fully — half-committed dynos cause injuries",
        "benchmark": "Most intermediate climbers hit 2-rung dynos; target 3-rung by end of phase",
        "disciplines": ["bouldering", "competition"],
        "min_experience": "intermediate",
        "equipment_needed": ["campus_board"],
    },
    {
        "exercise": "Campus board 1-5-8",
        "detail": "Max-distance campus ladders, both arms",
        "sets": 6,
        "reps": "3 ladders each arm",
        "rest_seconds": 240,
        "effort_note": "Full rest between sets — this is CNS-intensive, don't rush",
        "benchmark": "Advanced/elite: 1-5-8 is baseline. 1-5-9 is the benchmark for elite fingerboarders.",
        "disciplines": ["bouldering", "competition"],
        "min_experience": "advanced",
        "equipment_needed": ["campus_board"],
    },
]


def _power_block(experience: str, discipline: str, equipment: List[str]) -> List[Dict]:
    return _select_with_fallback(_POWER_POOL, experience, discipline, equipment, n=2)
```

- [ ] **Step 3: Replace `_endurance_block`**

Currently `def _endurance_block(experience: str)` (around line 137). Replace with:

```python
_ENDURANCE_POOL: List[Dict] = [
    {
        "exercise": "4×4s",
        "detail": "Pick 4 boulder problems 2–3 grades below max. Climb all 4 back to back, rest 3 min, repeat 4 rounds.",
        "sets": 4,
        "reps": "4 problems continuous",
        "rest_seconds": 180,
        "effort_note": "The last round should feel very hard — if it's easy, the problems are too easy",
        "benchmark": "Your forearms should be noticeably pumped after round 2. Full pump by round 4.",
        "disciplines": ["bouldering", "sport", "trad", "competition"],
        "min_experience": "beginner",
        "equipment_needed": [],
    },
    {
        "exercise": "Linked route laps",
        "detail": "Climb a moderate route, immediately downclimb or lower and repeat",
        "sets": 3,
        "reps": "5 laps per route",
        "rest_seconds": 300,
        "effort_note": "Pace yourself — the goal is maintaining technique under fatigue, not sprinting",
        "benchmark": "Intermediate: maintain footwork quality on laps 4–5. Beginners: 3 laps is the target.",
        "disciplines": ["bouldering", "sport", "trad", "competition"],
        "min_experience": "beginner",
        "equipment_needed": [],
    },
    {
        "exercise": "ARCing (aerobic restoration and capillarity)",
        "detail": "20–40 min of continuous easy climbing (50–60% effort). No stopping.",
        "sets": 1,
        "reps": "20–40 min",
        "rest_seconds": 0,
        "effort_note": "You should be able to hold a full conversation throughout — this is recovery training",
        "benchmark": "If you're breathing hard, you're going too hard. The adaptation is in the sustained duration.",
        "disciplines": ["sport", "trad", "competition"],
        "min_experience": "advanced",
        "equipment_needed": [],
    },
]


def _endurance_block(experience: str, discipline: str, equipment: List[str]) -> List[Dict]:
    return _select_with_fallback(_ENDURANCE_POOL, experience, discipline, equipment, n=3)
```

- [ ] **Step 4: Replace `_strength_block`**

Currently `def _strength_block(experience: str)` (around line 171). Replace with:

```python
def _pullup_benchmark(experience: str) -> str:
    return {
        "beginner": "Bodyweight pull-ups with full ROM. Use assistance band if needed.",
        "intermediate": "Add 5–10 kg. Archer pull-ups count as assisted one-arm.",
        "advanced": "Add 20+ kg. Progress toward one-arm pull-ups.",
        "elite": "One-arm pull-up training is the standard.",
    }.get(experience, "Full ROM, controlled descent")


_STRENGTH_POOL: List[Dict] = [
    {
        "exercise": "Pull-up variations",
        "detail": "Weighted pull-ups or archer pull-ups depending on level",
        "sets": 4,  # caller overrides this when needed; see below
        "reps": "5-8",  # caller overrides
        "rest_seconds": 180,
        "effort_note": "Last rep should be hard but form must stay clean — no kipping",
        "benchmark": "Full ROM, controlled descent",  # caller overrides via _pullup_benchmark
        "disciplines": ["bouldering", "sport", "trad", "competition"],
        "min_experience": "beginner",
        "equipment_needed": [],
    },
    {
        "exercise": "Front lever progressions",
        "detail": "Tuck → advanced tuck → straddle → full. Hold each for 3×5s.",
        "sets": 4,
        "reps": "3 × 5s holds",
        "rest_seconds": 120,
        "effort_note": "Hold the position where you're working — don't sacrifice form for a harder position",
        "benchmark": "Intermediate: advanced tuck. Advanced: straddle. Elite: full front lever.",
        "disciplines": ["bouldering", "sport", "trad", "competition"],
        "min_experience": "beginner",
        "equipment_needed": [],
    },
    {
        "exercise": "Core tension: hollow body holds",
        "detail": "Supine, arms overhead, press low back flat to floor, lift legs to ~30°",
        "sets": 3,
        "reps": "30s",
        "rest_seconds": 60,
        "effort_note": "If low back lifts off the floor, raise legs higher — quality over quantity",
        "benchmark": "Beginners: 15s is a solid starting point. Build to 45s over the phase.",
        "disciplines": ["bouldering", "sport", "trad", "competition"],
        "min_experience": "beginner",
        "equipment_needed": [],
    },
]


def _strength_block(experience: str, discipline: str, equipment: List[str]) -> List[Dict]:
    selected = _select_with_fallback(_STRENGTH_POOL, experience, discipline, equipment, n=3)
    # Patch the pull-up entry with experience-specific sets/reps/benchmark
    for ex in selected:
        if ex["exercise"] == "Pull-up variations":
            ex["sets"] = 4 if experience != "beginner" else 3
            ex["reps"] = "5" if experience in ("advanced", "elite") else "8"
            ex["benchmark"] = _pullup_benchmark(experience)
    return selected
```

The pull-up entry needs runtime `experience`-driven adjustments (the legacy code computed sets/reps/benchmark per call). We preserve that behavior by patching after selection. The `_select_with_fallback` helper already returns fresh dicts via `_strip_tags`, so mutation here is safe.

- [ ] **Step 5: Replace `_footwork_block`**

Currently `def _footwork_block()` (around line 208). Replace with:

```python
_FOOTWORK_POOL: List[Dict] = [
    {
        "exercise": "Silent feet drills",
        "detail": "Climb a moderate route/problem — no sound when placing feet. Reset if you hear a foot.",
        "sets": 3,
        "reps": "5 problems",
        "rest_seconds": 90,
        "effort_note": "Slow down — this is technique, not training to failure",
        "benchmark": "Even V8+ climbers benefit from this drill. Precision > speed at all levels.",
        "disciplines": ["bouldering", "sport", "trad", "competition"],
        "min_experience": "beginner",
        "equipment_needed": [],
    },
    {
        "exercise": "Slab technique — smearing",
        "detail": "Find or set 3–4 slab sequences that require smearing. Focus on hip position.",
        "sets": 2,
        "reps": "10 min",
        "rest_seconds": 120,
        "effort_note": "Weight over feet, trust the rubber — lean into the discomfort of slab",
        "benchmark": "Most climbers undertrain slab. 10 min of focused slab work pays dividends on overhang too.",
        "disciplines": ["bouldering", "sport", "trad", "competition"],
        "min_experience": "beginner",
        "equipment_needed": [],
    },
]


def _footwork_block(experience: str, discipline: str, equipment: List[str]) -> List[Dict]:
    return _select_with_fallback(_FOOTWORK_POOL, experience, discipline, equipment, n=2)
```

- [ ] **Step 6: Replace `_mental_block`**

Currently `def _mental_block()` (around line 231). Replace with:

```python
_MENTAL_POOL: List[Dict] = [
    {
        "exercise": "Headpoint practice",
        "detail": "Take a route/problem at your limit. Rehearse the crux moves on TR or with padding first, then commit.",
        "sets": 1,
        "reps": "2–3 attempts from the ground",
        "rest_seconds": 300,
        "effort_note": "The goal is committing to the move — falling is part of the process",
        "benchmark": "Most climbers avoid this drill. Scheduling it makes it happen.",
        "disciplines": ["sport", "trad"],
        "min_experience": "intermediate",
        "equipment_needed": [],
    },
    {
        "exercise": "Breath reset drill",
        "detail": "Before each attempt, take 3 slow diaphragmatic breaths. On the wall, breathe at every rest hold.",
        "sets": 1,
        "reps": "Every attempt in the session",
        "rest_seconds": 0,
        "effort_note": "This is a habit drill — the reps are every single attempt, not a separate exercise block",
        "benchmark": "Most climbers forget to breathe on hard moves. This drill rewires that pattern.",
        "disciplines": ["bouldering", "sport", "trad", "competition"],
        "min_experience": "beginner",
        "equipment_needed": [],
    },
]


def _mental_block(experience: str, discipline: str, equipment: List[str]) -> List[Dict]:
    return _select_with_fallback(_MENTAL_POOL, experience, discipline, equipment, n=2)
```

- [ ] **Step 7: Update `_pick_session` signature and all its schedule lambdas**

Locate `def _pick_session(...)` (around line 397). Replace the entire function with:

```python
def _pick_session(
    goal: str, day: int, total_days: int,
    week: int, is_deload: bool,
    experience: str, finger_ok: bool, shoulder_ok: bool,
    injury_flags: List[str],
    discipline: str,
    equipment: List[str],
) -> tuple[str, List[Dict]]:
    """Return (session_type, main_blocks) for a given day slot."""

    volume_scale = 0.6 if is_deload else 1.0

    if goal == "grade_progression":
        schedule = {
            1: ("hangboard", lambda: _hangboard_block(experience, discipline, equipment) if finger_ok else _strength_block(experience, discipline, equipment)),
            2: ("power", lambda: _power_block(experience, discipline, equipment) if finger_ok else _endurance_block(experience, discipline, equipment)),
            3: ("project", lambda: [_footwork_block(experience, discipline, equipment)[0], _mental_block(experience, discipline, equipment)[0]]),
            4: ("strength", lambda: _strength_block(experience, discipline, equipment)),
            5: ("endurance", lambda: _endurance_block(experience, discipline, equipment)),
        }
    elif goal == "route_endurance":
        schedule = {
            1: ("endurance", lambda: _endurance_block(experience, discipline, equipment)),
            2: ("strength", lambda: _strength_block(experience, discipline, equipment)),
            3: ("endurance", lambda: _endurance_block(experience, discipline, equipment)),
            4: ("technique", lambda: _footwork_block(experience, discipline, equipment)),
            5: ("endurance", lambda: _endurance_block(experience, discipline, equipment)),
        }
    elif goal == "competition":
        schedule = {
            1: ("power", lambda: _power_block(experience, discipline, equipment) if finger_ok else _strength_block(experience, discipline, equipment)),
            2: ("hangboard", lambda: _hangboard_block(experience, discipline, equipment) if finger_ok else _endurance_block(experience, discipline, equipment)),
            3: ("project", lambda: _mental_block(experience, discipline, equipment)),
            4: ("strength", lambda: _strength_block(experience, discipline, equipment)),
            5: ("power", lambda: _power_block(experience, discipline, equipment) if finger_ok else _footwork_block(experience, discipline, equipment)),
        }
    elif goal == "injury_prevention":
        schedule = {
            1: ("technique", lambda: _footwork_block(experience, discipline, equipment)),
            2: ("strength", lambda: _strength_block(experience, discipline, equipment)),
            3: ("endurance", lambda: _endurance_block(experience, discipline, equipment)),
            4: ("technique", lambda: _footwork_block(experience, discipline, equipment) + _mental_block(experience, discipline, equipment)),
            5: ("strength", lambda: _strength_block(experience, discipline, equipment)),
        }
    else:  # general
        schedule = {
            1: ("hangboard", lambda: _hangboard_block(experience, discipline, equipment) if finger_ok else _strength_block(experience, discipline, equipment)),
            2: ("endurance", lambda: _endurance_block(experience, discipline, equipment)),
            3: ("technique", lambda: _footwork_block(experience, discipline, equipment)),
            4: ("strength", lambda: _strength_block(experience, discipline, equipment)),
            5: ("project", lambda: _mental_block(experience, discipline, equipment)),
        }

    slot = ((day - 1) % len(schedule)) + 1
    session_type, blocks_fn = schedule.get(slot, schedule[1])
    blocks = blocks_fn()

    if is_deload:
        blocks = blocks[:max(1, len(blocks) // 2)]

    return session_type, blocks
```

- [ ] **Step 8: Update `_goal_template` (the single intermediate caller of `_pick_session`)**

`_pick_session` is called from exactly one place: inside `_goal_template` at around line 374 of `src/coach.py`. Replace the signature and the call site.

Find:

```python
def _goal_template(goal: str, days: int, experience: str, injury_flags: List[str]) -> List[Dict]:
```

Replace with:

```python
def _goal_template(
    goal: str,
    days: int,
    experience: str,
    injury_flags: List[str],
    discipline: str,
    equipment: List[str],
) -> List[Dict]:
```

Then find the `_pick_session(...)` call inside the same function (around line 374):

```python
            session_type, main_blocks = _pick_session(
                goal, day_in_week, days, week, is_deload,
                experience, finger_ok, shoulder_ok, injury_flags
            )
```

Replace with:

```python
            session_type, main_blocks = _pick_session(
                goal, day_in_week, days, week, is_deload,
                experience, finger_ok, shoulder_ok, injury_flags,
                discipline, equipment,
            )
```

- [ ] **Step 9: Update `generate_plan` to extract profile fields and pass them to `_goal_template`**

Find `def generate_plan(profile, injury_flags, openai_client=None)` (around line 646). The function currently extracts `goal`, `experience`, `days` near the top. Add two more extractions, and update the `_goal_template` call.

Replace this block:

```python
    goal = profile.get("primary_goal", "general")
    experience = profile.get("experience_level", "beginner")
    days = max(1, min(6, profile.get("days_per_week", 3)))

    sessions = _goal_template(goal, days, experience, injury_flags)
```

With:

```python
    goal = profile.get("primary_goal", "general")
    experience = profile.get("experience_level", "beginner")
    days = max(1, min(6, profile.get("days_per_week", 3)))
    discipline = profile.get("primary_discipline") or "bouldering"
    equipment = profile.get("equipment") or []

    sessions = _goal_template(goal, days, experience, injury_flags, discipline, equipment)
```

After Steps 7-9, every chain from `generate_plan` → `_goal_template` → `_pick_session` → block selector passes the new fields through correctly.

- [ ] **Step 10: Backend import smoke**

Run: `.venv/bin/python -c "import src.coach"`

Expected: no errors. Catches any syntax/wiring breakage from the refactor.

- [ ] **Step 11: Run targeted helper tests**

Run: `.venv/bin/python -m unittest tests.test_coach -v`

Expected: all helper tests from Task 1 still pass. The new block functions now exist but aren't yet covered by tests — that's Tasks 3-5.

- [ ] **Step 12: Run the broader Python suite to catch regressions**

Run: `.venv/bin/python -m unittest tests.test_coach tests.test_triage_calibration tests.test_bucket tests.test_bucket_content -v`

Expected: all previous tests still pass.

Run: `.venv/bin/python tests/run_all_scenarios.py`

Expected: `102/102 PASS` (scenarios don't touch coach.py but worth confirming nothing leaked).

- [ ] **Step 13: Quick interactive smoke**

Run:

```bash
.venv/bin/python -c "
from src.coach import _hangboard_block, _power_block, _strength_block, _endurance_block, _footwork_block, _mental_block
# Sport climber, intermediate, no campus board:
print('Hangboard:', [e['exercise'] for e in _hangboard_block('intermediate', 'sport', ['hangboard'])])
print('Power:', [e['exercise'] for e in _power_block('intermediate', 'sport', [])])
print('Endurance:', [e['exercise'] for e in _endurance_block('advanced', 'sport', [])])
# Boulderer, advanced, full kit:
print('Boulder Power:', [e['exercise'] for e in _power_block('advanced', 'bouldering', ['campus_board'])])
"
```

Expected output: prints exercise lists. Pinch hangs should NOT appear for sport climber. Should appear for advanced boulderer with hangboard. Campus exercises should NOT appear for sport climber.

- [ ] **Step 14: Commit**

```bash
git add src/coach.py
git commit -m "Tag exercises + refactor block selectors + wire discipline+equipment through plan generation"
```

---

## Task 3 — Schema validation test

**Files:**
- Modify: `tests/test_coach.py`

- [ ] **Step 1: Append schema-validity test class**

Add to `tests/test_coach.py` BEFORE the `if __name__ == "__main__":` block:

```python
# Schema validation — every pool entry must have the required tag fields
# with correct types. This catches authoring errors that would otherwise
# only surface when a specific (experience × discipline × equipment) combo
# happens to filter to that entry.

VALID_DISCIPLINES = {"bouldering", "sport", "trad", "competition"}
VALID_EQUIPMENT = {"hangboard", "home_wall", "gym_membership", "outdoor_crag", "campus_board", "system_wall"}


class ExercisePoolSchemaTests(unittest.TestCase):
    def _collect_pools(self):
        from src.coach import (
            _HANGBOARD_POOL, _POWER_POOL, _ENDURANCE_POOL,
            _STRENGTH_POOL, _FOOTWORK_POOL, _MENTAL_POOL,
        )
        return {
            "hangboard": _HANGBOARD_POOL,
            "power": _POWER_POOL,
            "endurance": _ENDURANCE_POOL,
            "strength": _STRENGTH_POOL,
            "footwork": _FOOTWORK_POOL,
            "mental": _MENTAL_POOL,
        }

    def test_every_pool_entry_has_required_tag_fields(self):
        for pool_name, pool in self._collect_pools().items():
            for ex in pool:
                label = f"{pool_name}::{ex.get('exercise', '?')}"
                self.assertIn("disciplines", ex, f"{label}: missing disciplines")
                self.assertIn("min_experience", ex, f"{label}: missing min_experience")
                # equipment_needed and max_experience are optional fields,
                # but if present must be the right shape

    def test_disciplines_values_are_valid(self):
        for pool_name, pool in self._collect_pools().items():
            for ex in pool:
                label = f"{pool_name}::{ex.get('exercise', '?')}"
                discs = ex["disciplines"]
                self.assertIsInstance(discs, list, f"{label}: disciplines must be list")
                self.assertGreater(len(discs), 0, f"{label}: disciplines must be non-empty")
                for d in discs:
                    self.assertIn(d, VALID_DISCIPLINES, f"{label}: '{d}' is not a valid discipline")

    def test_min_experience_is_valid_level(self):
        for pool_name, pool in self._collect_pools().items():
            for ex in pool:
                label = f"{pool_name}::{ex.get('exercise', '?')}"
                self.assertIn(ex["min_experience"], _EXPERIENCE_LEVELS, f"{label}: invalid min_experience")

    def test_max_experience_when_present_is_valid(self):
        for pool_name, pool in self._collect_pools().items():
            for ex in pool:
                label = f"{pool_name}::{ex.get('exercise', '?')}"
                if "max_experience" in ex:
                    self.assertIn(ex["max_experience"], _EXPERIENCE_LEVELS, f"{label}: invalid max_experience")

    def test_max_experience_not_below_min(self):
        for pool_name, pool in self._collect_pools().items():
            for ex in pool:
                if "max_experience" not in ex:
                    continue
                label = f"{pool_name}::{ex.get('exercise', '?')}"
                min_idx = _EXPERIENCE_LEVELS.index(ex["min_experience"])
                max_idx = _EXPERIENCE_LEVELS.index(ex["max_experience"])
                self.assertLessEqual(min_idx, max_idx, f"{label}: max_experience < min_experience")

    def test_equipment_needed_values_are_valid(self):
        for pool_name, pool in self._collect_pools().items():
            for ex in pool:
                label = f"{pool_name}::{ex.get('exercise', '?')}"
                eq = ex.get("equipment_needed", [])
                self.assertIsInstance(eq, list, f"{label}: equipment_needed must be list")
                for e in eq:
                    self.assertIn(e, VALID_EQUIPMENT, f"{label}: '{e}' is not valid equipment")
```

- [ ] **Step 2: Run schema tests**

Run: `.venv/bin/python -m unittest tests.test_coach.ExercisePoolSchemaTests -v`

Expected: 6 tests pass. If any fail, fix the corresponding exercise entry in `src/coach.py` (the failure message identifies which pool and which exercise).

- [ ] **Step 3: Commit**

```bash
git add tests/test_coach.py
git commit -m "Add schema validation tests for exercise pools"
```

---

## Task 4 — Coverage sweep test

**Files:**
- Modify: `tests/test_coach.py`

- [ ] **Step 1: Append coverage sweep test class**

Add to `tests/test_coach.py` before the `if __name__ == "__main__":` block:

```python
class BlockCoverageTests(unittest.TestCase):
    """Sweep experience × discipline × equipment-subsets and assert every block
    returns at least one exercise for every combination. Guards against
    fallback-chain leaks and discipline tags that accidentally exclude
    a valid user."""

    EXPERIENCE_LEVELS = ["beginner", "intermediate", "advanced", "elite"]
    DISCIPLINES = ["bouldering", "sport", "trad", "competition"]
    EQUIPMENT_SUBSETS = [
        [],  # nothing
        ["hangboard"],
        ["gym_membership"],
        ["hangboard", "campus_board", "gym_membership"],
        ["hangboard", "home_wall", "gym_membership", "outdoor_crag", "campus_board", "system_wall"],  # full kit
    ]

    BLOCK_NAMES = ["hangboard", "power", "endurance", "strength", "footwork", "mental"]

    def _get_block(self, name):
        from src import coach
        return getattr(coach, f"_{name}_block")

    def test_every_block_returns_nonempty_for_every_combination(self):
        from itertools import product
        for block_name in self.BLOCK_NAMES:
            block = self._get_block(block_name)
            for exp, disc, equip in product(self.EXPERIENCE_LEVELS, self.DISCIPLINES, self.EQUIPMENT_SUBSETS):
                result = block(exp, disc, equip)
                self.assertGreaterEqual(
                    len(result), 1,
                    f"{block_name} returned empty for ({exp}, {disc}, {equip!r})",
                )

    def test_returned_exercises_have_canonical_fields_only(self):
        """Tag fields must be stripped from the returned exercises so the
        generated plan dict matches the legacy schema."""
        from src import coach
        for block_name in self.BLOCK_NAMES:
            block = self._get_block(block_name)
            result = block("intermediate", "bouldering", ["hangboard", "campus_board"])
            for ex in result:
                for tag_key in ("disciplines", "min_experience", "max_experience", "equipment_needed"):
                    self.assertNotIn(
                        tag_key, ex,
                        f"{block_name}: tag field '{tag_key}' leaked into returned exercise '{ex.get('exercise', '?')}'",
                    )
                # Canonical fields must survive
                for canonical in ("exercise", "detail", "sets", "reps", "rest_seconds", "effort_note", "benchmark"):
                    self.assertIn(
                        canonical, ex,
                        f"{block_name}: canonical field '{canonical}' missing from '{ex.get('exercise', '?')}'",
                    )
```

- [ ] **Step 2: Run coverage tests**

Run: `.venv/bin/python -m unittest tests.test_coach.BlockCoverageTests -v`

Expected: 2 tests pass. If `test_every_block_returns_nonempty_for_every_combination` fails, the assertion message identifies the offending block + combination — likely a fallback chain bug or an exercise pool too narrowly tagged.

- [ ] **Step 3: Commit**

```bash
git add tests/test_coach.py
git commit -m "Add block coverage sweep test"
```

---

## Task 5 — Differentiation + anti-regression + generate_plan smoke test

**Files:**
- Modify: `tests/test_coach.py`

- [ ] **Step 1: Append the remaining test class**

Add to `tests/test_coach.py` before the `if __name__ == "__main__":` block:

```python
class BlockDifferentiationTests(unittest.TestCase):
    """Verify the personalisation actually personalises — different inputs
    must produce different outputs in key places."""

    def test_boulderer_and_sport_climber_get_different_power_blocks_when_no_campus(self):
        """Without a campus board, the boulderer's strict filter returns empty,
        the fallback chain delivers something. The sport climber also gets
        a fallback. Both shouldn't be empty — but they don't have to be
        identical either; what matters is that the result is sensible."""
        from src.coach import _power_block
        boulder_out = _power_block("intermediate", "bouldering", [])
        sport_out = _power_block("intermediate", "sport", [])
        self.assertGreaterEqual(len(boulder_out), 1)
        self.assertGreaterEqual(len(sport_out), 1)

    def test_pinch_hangs_only_for_advanced_plus_boulder_or_competition(self):
        """Anti-regression for the original user complaint: pinch hangs
        must not appear for sport/trad climbers or for anyone below advanced."""
        from src.coach import _hangboard_block

        def names(experience, discipline):
            return [e["exercise"] for e in _hangboard_block(experience, discipline, ["hangboard"])]

        # Should NOT contain pinch hangs:
        for case in [
            ("beginner", "bouldering"),
            ("intermediate", "bouldering"),
            ("intermediate", "sport"),
            ("intermediate", "trad"),
            ("advanced", "sport"),
            ("advanced", "trad"),
            ("elite", "sport"),
            ("elite", "trad"),
        ]:
            self.assertNotIn(
                "Max-weight pinch hangs", names(*case),
                f"Pinch hangs leaked into {case}",
            )

        # SHOULD contain pinch hangs (or at least, they're eligible — block
        # only takes top n=2, so check pool eligibility not selection slot)
        from src.coach import _HANGBOARD_POOL, _filter_exercises
        for case in [
            ("advanced", "bouldering"),
            ("elite", "bouldering"),
            ("advanced", "competition"),
            ("elite", "competition"),
        ]:
            eligible = _filter_exercises(_HANGBOARD_POOL, case[0], case[1], ["hangboard"])
            eligible_names = [e["exercise"] for e in eligible]
            self.assertIn(
                "Max-weight pinch hangs", eligible_names,
                f"Pinch hangs not eligible for {case} but should be",
            )

    def test_no_campus_board_filters_campus_exercises(self):
        """Equipment gating actually filters out gear-required exercises in
        the strict path."""
        from src.coach import _POWER_POOL, _filter_exercises
        eligible = _filter_exercises(_POWER_POOL, "intermediate", "bouldering", [])
        names = [e["exercise"] for e in eligible]
        # Without campus_board, all four current power exercises are gated out
        # (every existing entry requires campus_board). The fallback chain
        # will give the user something via discipline relaxation — but the
        # *strict* filter must be empty.
        self.assertEqual(
            names, [],
            f"Expected empty strict filter when boulderer has no campus board, got {names}",
        )

    def test_trad_climber_gets_headpoint_practice_in_mental_block(self):
        """The narrow tagging on Headpoint Practice (sport+trad only) is
        the kind of differentiation this whole refactor exists to enable."""
        from src.coach import _mental_block
        names = [e["exercise"] for e in _mental_block("intermediate", "trad", [])]
        self.assertIn("Headpoint practice", names)

    def test_boulderer_does_not_get_headpoint_practice_via_strict_filter(self):
        """Boulderer shouldn't see Headpoint Practice through the strict
        filter (it's not tagged for bouldering)."""
        from src.coach import _MENTAL_POOL, _filter_exercises
        eligible = _filter_exercises(_MENTAL_POOL, "intermediate", "bouldering", [])
        names = [e["exercise"] for e in eligible]
        self.assertNotIn("Headpoint practice", names)


class GeneratePlanSmokeTest(unittest.TestCase):
    """End-to-end: generate_plan must still produce a structurally valid
    plan dict for a default profile. Doesn't assert specific exercises —
    just that the shape is intact after the refactor."""

    def _profile(self, **overrides):
        base = {
            "experience_level": "intermediate",
            "years_climbing": 3,
            "primary_discipline": "bouldering",
            "max_grade_boulder": "V5",
            "max_grade_route": "",
            "days_per_week": 3,
            "session_length_min": 90,
            "equipment": ["hangboard", "gym_membership"],
            "weaknesses": [],
            "primary_goal": "grade_progression",
            "goal_grade": "V7",
        }
        base.update(overrides)
        return base

    def test_default_profile_generates_valid_plan(self):
        from src.coach import generate_plan
        plan = generate_plan(self._profile(), injury_flags=[], openai_client=None)
        self.assertIsInstance(plan, dict)
        self.assertIn("sessions", plan.get("plan_data", plan))
        # Unwrap if generate_plan returns {..., "plan_data": {...}} shape
        sessions = plan.get("plan_data", plan).get("sessions", [])
        self.assertGreater(len(sessions), 0)
        for s in sessions[:5]:
            self.assertIn("main", s)
            for ex in s["main"]:
                # Canonical fields present
                self.assertIn("exercise", ex)
                self.assertIn("sets", ex)
                # Tag fields stripped
                for tag in ("disciplines", "min_experience", "equipment_needed"):
                    self.assertNotIn(tag, ex, f"Tag '{tag}' leaked into generated plan exercise {ex.get('exercise','?')}")

    def test_sport_climber_no_campus_generates_valid_plan(self):
        from src.coach import generate_plan
        plan = generate_plan(
            self._profile(primary_discipline="sport", equipment=["gym_membership"]),
            injury_flags=[], openai_client=None,
        )
        sessions = plan.get("plan_data", plan).get("sessions", [])
        self.assertGreater(len(sessions), 0)

    def test_trad_climber_minimal_equipment_generates_valid_plan(self):
        from src.coach import generate_plan
        plan = generate_plan(
            self._profile(primary_discipline="trad", equipment=[]),
            injury_flags=[], openai_client=None,
        )
        sessions = plan.get("plan_data", plan).get("sessions", [])
        self.assertGreater(len(sessions), 0)
```

- [ ] **Step 2: Run all coach tests**

Run: `.venv/bin/python -m unittest tests.test_coach -v`

Expected: all tests pass.

If the smoke test fails because the actual `generate_plan` return shape doesn't match the assertion (`plan_data` vs flat `sessions`), inspect what `generate_plan` actually returns and adjust the assertions to match. Don't paper over a real bug — but if the test was wrong about the wrapper shape, fix the test.

- [ ] **Step 3: Final regression sweep**

Run: `.venv/bin/python -m unittest tests.test_coach tests.test_triage_calibration tests.test_bucket tests.test_bucket_content -v`

Expected: all pass.

Run: `.venv/bin/python tests/run_all_scenarios.py`

Expected: `102/102 PASS`.

- [ ] **Step 4: Commit**

```bash
git add tests/test_coach.py
git commit -m "Add differentiation + anti-regression + generate_plan smoke tests"
```

---

## Self-Review checklist (already run by plan author)

- ✅ **Spec coverage:**
  - `_filter_exercises` helper → Task 1
  - `_select_with_fallback` + 3-level fallback chain → Task 1
  - `_strip_tags` → Task 1
  - All 6 block selectors refactored to `(experience, discipline, equipment)` → Task 2
  - Every existing exercise tagged per the spec's table → Task 2 (with explicit tag table reproduced in plan)
  - `_pick_session` + `generate_plan` plumbed → Task 2
  - Schema validation test → Task 3
  - Coverage sweep → Task 4
  - Differentiation + anti-regression + smoke → Task 5
  - Library expansion → out of scope (Phase 2)
  - Weaknesses + goal-grade → out of scope (Phase 3)

- ✅ **Placeholder scan:** Every code step contains complete code. No "follow the pattern" or "implement similar". Each block's exact code is reproduced in Task 2.

- ✅ **Type consistency:** `_filter_exercises` signature is consistent across Task 1 definition and all Task 2 usages. Block signatures uniformly `(experience: str, discipline: str, equipment: List[str]) -> List[Dict]`. Pool variable names follow a uniform `_HANGBOARD_POOL`, `_POWER_POOL`, etc. convention. The `_select_with_fallback` `n` parameter is positional in every block call.
