# Climb log + progression loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add session-level structured climb logging (sends/flashes/projects per grade) and a Grade Pyramid progression view, while restoring `/progress` as a real destination.

**Architecture:** One JSONB column added to the existing `training_logs` table (no new table). Server-side validation for V-scale + YDS grades. PR detection runs in the same transaction as the log insert. A new `/api/training/pyramid` aggregates JSONB into a discipline-keyed pyramid. Frontend adds a collapsible climb-log section to the existing `TrainingLogEntry` form, a `GradePyramidCard` to `ProgressTab`, a `HubProgressCard` that replaces `HubSocialStrip` (rank + PRs + mini pyramid), and a celebration toast on new PRs.

**Tech Stack:** PostgreSQL JSONB, FastAPI + Pydantic, Python unittest, React 18, Framer Motion, react-router-dom, lucide-react.

---

## File Structure

**Backend — created**
- `src/climb_grades.py` — `BOULDER_RE`, `ROUTE_RE`, `grade_order(grade)`, `validate_climbs(climbs)`, `format_climbs_summary(climbs)`, `compute_hardest(climbs)`. Pure functions, no DB.
- `tests/test_climb_log.py` — unittest suite for the whole feature.

**Backend — modified**
- `database.py` — JSONB column migration; extend `log_training()` to accept `climbs`; add `get_pyramid(user_id, window)`; add `get_user_hardest(user_id, window)`.
- `main.py` — `TrainingLogRequest` gains `climbs`; validation; PR detection; response shape change; new `GET /api/training/pyramid`.

**Frontend — created**
- `frontend/src/components/ClimbLogSection.jsx` — collapsible Boulder/Route counter grid.
- `frontend/src/components/GradeCounterRow.jsx` — one grade's `−/+` sends/flashes/projects.
- `frontend/src/components/GradePyramidCard.jsx` — full pyramid for ProgressTab.
- `frontend/src/components/HubProgressCard.jsx` — replaces HubSocialStrip.

**Frontend — modified**
- `frontend/src/api.js` — add `getPyramid({ window })`.
- `frontend/src/components/TrainingLogEntry.jsx` — append `<ClimbLogSection />`; capture `new_prs`; dispatch `ct:new-pr` window event.
- `frontend/src/components/ProgressTab.jsx` — insert `<GradePyramidCard />`.
- `frontend/src/components/HubGreeting.jsx` — add PR pill.
- `frontend/src/components/HubTab.jsx` — replace `<HubSocialStrip />` with `<HubProgressCard />`.
- `frontend/src/hooks/useHubData.js` — fetch pyramid; expose `hardestSends`, `pyramidPreview`.
- `frontend/src/App.jsx` — drop `/progress → /train` redirect; render `ProgressTab` at `/progress`. Add `ct:new-pr` listener that fires a celebration toast.

**Frontend — removed**
- `frontend/src/components/HubSocialStrip.jsx` — superseded by `HubProgressCard`.

---

## Task 1: Grade validation + ordering helpers

**Files:**
- Create: `src/climb_grades.py`
- Test: `tests/test_climb_log.py`

- [ ] **Step 1: Write the failing test**

Create `tests/test_climb_log.py` with this content:

```python
"""Tests for the climb log + grade pyramid feature."""
from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.climb_grades import (  # noqa: E402
    grade_order,
    validate_climbs,
    format_climbs_summary,
    compute_hardest,
)


class GradeOrderTests(unittest.TestCase):
    def test_v_scale_ascending(self):
        self.assertLess(grade_order("V0"), grade_order("V5"))
        self.assertLess(grade_order("V5"), grade_order("V13"))
        self.assertLess(grade_order("V13"), grade_order("V17"))

    def test_yds_ascending(self):
        self.assertLess(grade_order("5.6"), grade_order("5.10a"))
        self.assertLess(grade_order("5.10a"), grade_order("5.10d"))
        self.assertLess(grade_order("5.10d"), grade_order("5.11a"))
        self.assertLess(grade_order("5.11a"), grade_order("5.15d"))

    def test_invalid_grade_raises(self):
        with self.assertRaises(ValueError):
            grade_order("V99")
        with self.assertRaises(ValueError):
            grade_order("5.16")


class ValidateClimbsTests(unittest.TestCase):
    def test_empty_ok(self):
        validate_climbs({})

    def test_valid_boulder_ok(self):
        validate_climbs({"boulder": {"V5": {"s": 3, "f": 1, "p": 0}}})

    def test_valid_route_ok(self):
        validate_climbs({"route": {"5.11a": {"s": 1, "f": 0, "p": 2}}})

    def test_bad_top_level_key(self):
        with self.assertRaises(ValueError):
            validate_climbs({"trad": {"5.10a": {"s": 1, "f": 0, "p": 0}}})

    def test_bad_v_grade(self):
        with self.assertRaises(ValueError):
            validate_climbs({"boulder": {"V18": {"s": 1, "f": 0, "p": 0}}})

    def test_bad_yds_grade(self):
        with self.assertRaises(ValueError):
            validate_climbs({"route": {"5.16": {"s": 1, "f": 0, "p": 0}}})

    def test_flashes_exceed_sends(self):
        with self.assertRaises(ValueError):
            validate_climbs({"boulder": {"V5": {"s": 1, "f": 2, "p": 0}}})

    def test_negative_count(self):
        with self.assertRaises(ValueError):
            validate_climbs({"boulder": {"V5": {"s": -1, "f": 0, "p": 0}}})

    def test_non_int_count(self):
        with self.assertRaises(ValueError):
            validate_climbs({"boulder": {"V5": {"s": "three", "f": 0, "p": 0}}})

    def test_missing_counter_key(self):
        with self.assertRaises(ValueError):
            validate_climbs({"boulder": {"V5": {"s": 1}}})


class FormatSummaryTests(unittest.TestCase):
    def test_empty(self):
        self.assertEqual(format_climbs_summary({}), "")

    def test_boulder_only(self):
        self.assertEqual(
            format_climbs_summary({"boulder": {"V5": {"s": 3, "f": 1, "p": 0}}}),
            "Boulder: V5×3 (1 flash)",
        )

    def test_boulder_with_project(self):
        self.assertEqual(
            format_climbs_summary({"boulder": {"V7": {"s": 0, "f": 0, "p": 3}}}),
            "Boulder: V7 projecting (3 tries)",
        )

    def test_multiple_disciplines(self):
        out = format_climbs_summary({
            "boulder": {"V5": {"s": 3, "f": 1, "p": 0}, "V6": {"s": 1, "f": 0, "p": 0}},
            "route":   {"5.11a": {"s": 1, "f": 0, "p": 0}},
        })
        self.assertIn("Boulder: V5×3 (1 flash), V6×1", out)
        self.assertIn("Route: 5.11a×1", out)


class ComputeHardestTests(unittest.TestCase):
    def test_empty(self):
        self.assertEqual(compute_hardest({}), {"boulder": None, "route": None})

    def test_boulder_max(self):
        c = {"boulder": {"V3": {"s": 1, "f": 1, "p": 0}, "V6": {"s": 1, "f": 0, "p": 0}}}
        self.assertEqual(compute_hardest(c)["boulder"], "V6")

    def test_project_does_not_count_as_send(self):
        # Hardest SEND, not hardest attempted.
        c = {"boulder": {"V5": {"s": 1, "f": 0, "p": 0}, "V7": {"s": 0, "f": 0, "p": 3}}}
        self.assertEqual(compute_hardest(c)["boulder"], "V5")
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python -m unittest tests.test_climb_log -v
```
Expected: ImportError — `src.climb_grades` does not exist.

- [ ] **Step 3: Create `src/climb_grades.py`**

```python
"""Pure helpers for climb grade validation, ordering, and summarisation.

Grades supported:
  - V-scale (bouldering): V0–V17
  - YDS    (sport/trad):  5.6–5.9, 5.10a–5.15d

Discipline keys: 'boulder', 'route'.
Per-grade counter shape: {'s': sends, 'f': flashes, 'p': projects}.
Invariant: f <= s (a flash is a send on first try).
"""
from __future__ import annotations

import re
from typing import Dict, Optional, Any


BOULDER_RE = re.compile(r"^V([0-9]|1[0-7])$")
# YDS: 5.6-5.9 OR 5.10a-5.15d
ROUTE_RE = re.compile(r"^5\.(?:[6-9]|1[0-5][a-d])$")

_DISCIPLINES = ("boulder", "route")
_COUNTER_KEYS = ("s", "f", "p")

# Numeric YDS letter offsets so 5.10a < 5.10b < 5.10c < 5.10d
_YDS_LETTER = {"a": 0, "b": 1, "c": 2, "d": 3}


def grade_order(grade: str) -> int:
    """Return a sortable integer rank for `grade`. Lower = easier.

    Boulder grades start at 0; route grades start at 1000 so they never
    collide with boulder ranks (we never mix the two in a single sort).
    """
    m = BOULDER_RE.match(grade)
    if m:
        return int(m.group(1))
    m = ROUTE_RE.match(grade)
    if m:
        # "5.6" → 6 ; "5.10a" → 10*4 + 0 = 40 ; "5.15d" → 15*4 + 3 = 63
        body = grade[2:]  # strip "5."
        if len(body) == 1:  # 5.6..5.9
            return 1000 + int(body) * 4
        # 5.10a–5.15d
        num = int(body[:-1])
        letter = _YDS_LETTER[body[-1]]
        return 1000 + num * 4 + letter
    raise ValueError(f"invalid grade: {grade}")


def validate_climbs(climbs: Any) -> None:
    """Raise ValueError if `climbs` is not a well-formed climb dict."""
    if not isinstance(climbs, dict):
        raise ValueError("climbs must be a JSON object")
    for discipline, grades in climbs.items():
        if discipline not in _DISCIPLINES:
            raise ValueError("discipline must be boulder or route")
        if not isinstance(grades, dict):
            raise ValueError(f"{discipline} grades must be an object")
        regex = BOULDER_RE if discipline == "boulder" else ROUTE_RE
        for grade, counters in grades.items():
            if not regex.match(grade):
                kind = "V-scale" if discipline == "boulder" else "YDS"
                raise ValueError(f"invalid {kind} grade: {grade}")
            if not isinstance(counters, dict):
                raise ValueError(f"counters for {grade} must be an object")
            for key in _COUNTER_KEYS:
                if key not in counters:
                    raise ValueError(f"missing counter '{key}' for {grade}")
                v = counters[key]
                if not isinstance(v, int) or isinstance(v, bool) or v < 0:
                    raise ValueError("counts must be non-negative integers")
            if counters["f"] > counters["s"]:
                raise ValueError(f"flashes cannot exceed sends for {grade}")


def format_climbs_summary(climbs: Dict[str, Dict[str, Dict[str, int]]]) -> str:
    """Render `climbs` as a human-readable single-line summary."""
    if not climbs:
        return ""
    parts = []
    for discipline_label, discipline_key in (("Boulder", "boulder"), ("Route", "route")):
        grades = climbs.get(discipline_key, {})
        if not grades:
            continue
        # Sort grades ascending for stable output.
        sorted_grades = sorted(grades.keys(), key=grade_order)
        entries = []
        for g in sorted_grades:
            c = grades[g]
            s, f, p = c["s"], c["f"], c["p"]
            if s > 0:
                if f > 0:
                    entries.append(f"{g}×{s} ({f} flash)")
                else:
                    entries.append(f"{g}×{s}")
            elif p > 0:
                entries.append(f"{g} projecting ({p} tries)")
        if entries:
            parts.append(f"{discipline_label}: {', '.join(entries)}")
    return ". ".join(parts)


def compute_hardest(climbs: Dict[str, Dict[str, Dict[str, int]]]) -> Dict[str, Optional[str]]:
    """Return the hardest *sent* grade per discipline. Projects don't count."""
    out: Dict[str, Optional[str]] = {"boulder": None, "route": None}
    for discipline in _DISCIPLINES:
        grades = climbs.get(discipline, {})
        sent = [g for g, c in grades.items() if c.get("s", 0) > 0]
        if sent:
            out[discipline] = max(sent, key=grade_order)
    return out
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
python -m unittest tests.test_climb_log -v
```
Expected: all tests in GradeOrderTests, ValidateClimbsTests, FormatSummaryTests, ComputeHardestTests pass.

- [ ] **Step 5: Commit**

```bash
git add src/climb_grades.py tests/test_climb_log.py
git commit -m "feat(climb-log): grade validation + ordering + summary helpers"
```

---

## Task 2: Migration — add `climbs` JSONB column to `training_logs`

**Files:**
- Modify: `database.py` (init_db, after the `training_logs` CREATE TABLE block around line 248)
- Test: `tests/test_climb_log.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/test_climb_log.py`:

```python
from database import _connect, init_db  # noqa: E402


class SchemaMigrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()

    def test_training_logs_has_climbs_jsonb(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """SELECT data_type, column_default, is_nullable
                       FROM information_schema.columns
                       WHERE table_name = 'training_logs' AND column_name = 'climbs';"""
                )
                row = cur.fetchone()
        self.assertIsNotNone(row, "climbs column missing")
        data_type, default, nullable = row
        self.assertEqual(data_type, "jsonb")
        self.assertIn("'{}'", default or "")
        self.assertEqual(nullable, "NO")
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
python -m unittest tests.test_climb_log.SchemaMigrationTests -v
```
Expected: FAIL with "climbs column missing".

- [ ] **Step 3: Add the migration**

In `database.py`, after the existing `try: cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS training_logs_user_date_idx ...")` block inside `init_db()` (this is right after the `training_logs` CREATE TABLE — currently around line 273), add:

```python
            # Climb-log feature: structured sends/flashes/projects per grade,
            # stored as JSONB keyed by discipline → grade → counters.
            _add_column_if_missing(
                cur,
                "training_logs",
                "climbs",
                "JSONB NOT NULL DEFAULT '{}'::jsonb",
            )
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
python -m unittest tests.test_climb_log.SchemaMigrationTests -v
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add database.py tests/test_climb_log.py
git commit -m "feat(climb-log): training_logs.climbs JSONB migration"
```

---

## Task 3: Extend `log_training()` to persist `climbs` + auto-generate `grades_sent`

**Files:**
- Modify: `database.py:1024-1046` (the `log_training` function)
- Test: `tests/test_climb_log.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/test_climb_log.py`:

```python
from database import log_training, get_training_logs  # noqa: E402


def _make_seed_user(email: str = "climb_test@coretriage.local") -> int:
    """Create (or reuse) a test user, return its id. Cleans up rows."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO users (email, password_hash) VALUES (%s, %s) "
                "ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING id;",
                (email, "x"),
            )
            uid = cur.fetchone()[0]
            cur.execute("DELETE FROM training_logs WHERE user_id = %s;", (uid,))
        conn.commit()
    return uid


class LogTrainingClimbsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.uid = _make_seed_user()

    def tearDown(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM training_logs WHERE user_id = %s;", (self.uid,))
            conn.commit()

    def test_insert_with_climbs_writes_jsonb(self):
        log_training(self.uid, {
            "date": "2026-05-15",
            "session_type": "bouldering",
            "duration_min": 90,
            "intensity": 7,
            "climbs": {"boulder": {"V5": {"s": 3, "f": 1, "p": 0}}},
            "notes": "",
        })
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT climbs, grades_sent FROM training_logs WHERE user_id = %s;",
                    (self.uid,),
                )
                row = cur.fetchone()
        climbs, grades_sent = row
        self.assertEqual(climbs, {"boulder": {"V5": {"s": 3, "f": 1, "p": 0}}})
        self.assertEqual(grades_sent, "Boulder: V5×3 (1 flash)")

    def test_insert_without_climbs_is_unchanged(self):
        log_training(self.uid, {
            "date": "2026-05-15",
            "session_type": "hangboard",
            "duration_min": 30,
            "intensity": 6,
            "grades_sent": "manual text",
            "notes": "",
        })
        rows = get_training_logs(self.uid)
        self.assertEqual(rows[0]["grades_sent"], "manual text")
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
python -m unittest tests.test_climb_log.LogTrainingClimbsTests -v
```
Expected: FAIL — `climbs` argument ignored.

- [ ] **Step 3: Extend `log_training` in `database.py`**

Replace the existing `log_training` function (starts at line 1024) with:

```python
def log_training(user_id: int, data: Dict[str, Any]) -> int:
    """Insert a training log entry and return its id.

    If `data['climbs']` is a non-empty dict, it's persisted to the JSONB
    column and an auto-generated human-readable summary overrides any
    `grades_sent` value the caller passed (so the two stay in sync).
    """
    from src.climb_grades import format_climbs_summary  # local import to avoid circular

    climbs = data.get("climbs") or {}
    grades_sent = data.get("grades_sent") or ""
    if climbs:
        grades_sent = format_climbs_summary(climbs)

    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO training_logs (user_id, date, session_type, duration_min, intensity, grades_sent, notes, climbs)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb)
                RETURNING id;
                """,
                (
                    int(user_id),
                    data.get("date"),
                    data.get("session_type"),
                    data.get("duration_min"),
                    data.get("intensity"),
                    grades_sent,
                    data.get("notes"),
                    json.dumps(climbs),
                ),
            )
            new_id = cur.fetchone()[0]
        conn.commit()
    return int(new_id)
```

If `json` is not already imported at the top of `database.py`, add `import json` at the top.

- [ ] **Step 4: Run the test to verify it passes**

```bash
python -m unittest tests.test_climb_log.LogTrainingClimbsTests -v
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add database.py tests/test_climb_log.py
git commit -m "feat(climb-log): log_training persists climbs + auto-summary"
```

---

## Task 4: `get_user_hardest()` + PR detection helper

**Files:**
- Modify: `database.py` (append after `get_training_logs` around line 1077)
- Test: `tests/test_climb_log.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/test_climb_log.py`:

```python
from database import get_user_hardest  # noqa: E402


class HardestSendTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.uid = _make_seed_user(email="hardest_test@coretriage.local")

    def tearDown(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM training_logs WHERE user_id = %s;", (self.uid,))
            conn.commit()

    def test_no_logs_returns_none(self):
        out = get_user_hardest(self.uid, window="all")
        self.assertEqual(out, {"boulder": None, "route": None})

    def test_picks_max_send_across_logs(self):
        log_training(self.uid, {
            "date": "2026-05-10", "session_type": "bouldering",
            "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V5": {"s": 2, "f": 0, "p": 0}}},
        })
        log_training(self.uid, {
            "date": "2026-05-12", "session_type": "bouldering",
            "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V7": {"s": 1, "f": 0, "p": 0}}},
        })
        log_training(self.uid, {
            "date": "2026-05-14", "session_type": "routes",
            "duration_min": 60, "intensity": 7,
            "climbs": {"route": {"5.11c": {"s": 1, "f": 0, "p": 0}}},
        })
        out = get_user_hardest(self.uid, window="all")
        self.assertEqual(out, {"boulder": "V7", "route": "5.11c"})

    def test_projects_dont_count(self):
        log_training(self.uid, {
            "date": "2026-05-10", "session_type": "bouldering",
            "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V7": {"s": 0, "f": 0, "p": 5}}},
        })
        out = get_user_hardest(self.uid, window="all")
        self.assertIsNone(out["boulder"])
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
python -m unittest tests.test_climb_log.HardestSendTests -v
```
Expected: FAIL — `get_user_hardest` does not exist.

- [ ] **Step 3: Add `get_user_hardest` to `database.py`**

Append after the existing `get_training_logs` function (around line 1077):

```python
def get_user_hardest(user_id: int, window: str = "all") -> Dict[str, Optional[str]]:
    """Return the user's hardest *sent* grade per discipline.

    `window` ∈ {'month', 'all'}. 'month' = last 30 days rolling.
    Sends-only (counters where s > 0); projects (p) don't qualify.
    """
    from src.climb_grades import grade_order  # local import

    if window not in ("month", "all"):
        raise ValueError("window must be 'month' or 'all'")
    where_window = "" if window == "all" else "AND created_at >= NOW() - INTERVAL '30 days'"

    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT climbs FROM training_logs
                WHERE user_id = %s AND climbs <> '{{}}'::jsonb {where_window};
                """,
                (int(user_id),),
            )
            rows = cur.fetchall()

    best: Dict[str, Optional[str]] = {"boulder": None, "route": None}
    for (climbs,) in rows:
        for discipline in ("boulder", "route"):
            grades = (climbs or {}).get(discipline, {})
            for g, c in grades.items():
                if c.get("s", 0) <= 0:
                    continue
                if best[discipline] is None or grade_order(g) > grade_order(best[discipline]):
                    best[discipline] = g
    return best
```

Also ensure `Optional` is in the existing `from typing import ...` line at the top of `database.py` (it likely already is; if not, add it).

- [ ] **Step 4: Run the test to verify it passes**

```bash
python -m unittest tests.test_climb_log.HardestSendTests -v
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add database.py tests/test_climb_log.py
git commit -m "feat(climb-log): get_user_hardest helper for PR detection"
```

---

## Task 5: `get_pyramid()` aggregator

**Files:**
- Modify: `database.py` (append after `get_user_hardest`)
- Test: `tests/test_climb_log.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/test_climb_log.py`:

```python
from database import get_pyramid  # noqa: E402


class PyramidTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.uid = _make_seed_user(email="pyramid_test@coretriage.local")

    def tearDown(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM training_logs WHERE user_id = %s;", (self.uid,))
            conn.commit()

    def test_empty_user(self):
        out = get_pyramid(self.uid, window="all")
        self.assertEqual(out, {
            "window": "all",
            "boulder": {"hardest_send": None, "hardest_flash": None, "grades": []},
            "route":   {"hardest_send": None, "hardest_flash": None, "grades": []},
        })

    def test_sums_across_logs_and_sorts(self):
        log_training(self.uid, {
            "date": "2026-05-10", "session_type": "bouldering",
            "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V5": {"s": 2, "f": 1, "p": 0}, "V6": {"s": 0, "f": 0, "p": 2}}},
        })
        log_training(self.uid, {
            "date": "2026-05-12", "session_type": "bouldering",
            "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V5": {"s": 1, "f": 0, "p": 0}, "V7": {"s": 1, "f": 0, "p": 0}}},
        })
        out = get_pyramid(self.uid, window="all")
        self.assertEqual(out["boulder"]["hardest_send"], "V7")
        self.assertEqual(out["boulder"]["hardest_flash"], "V5")
        # Grades sorted ascending; counters summed.
        grades = out["boulder"]["grades"]
        self.assertEqual(grades, [
            {"grade": "V5", "s": 3, "f": 1, "p": 0},
            {"grade": "V6", "s": 0, "f": 0, "p": 2},
            {"grade": "V7", "s": 1, "f": 0, "p": 0},
        ])
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
python -m unittest tests.test_climb_log.PyramidTests -v
```
Expected: FAIL — `get_pyramid` does not exist.

- [ ] **Step 3: Add `get_pyramid` to `database.py`**

Append after `get_user_hardest`:

```python
def get_pyramid(user_id: int, window: str = "month") -> Dict[str, Any]:
    """Aggregate the user's climbs JSONB into a discipline-keyed pyramid.

    `window` ∈ {'month', 'all'}. Output shape:
      {"window": str,
       "boulder": {"hardest_send": str|None, "hardest_flash": str|None,
                   "grades": [{"grade": str, "s": int, "f": int, "p": int}, ...]},
       "route": ... }
    `grades` is sorted ascending; only grades with non-zero counters are returned.
    """
    from src.climb_grades import grade_order  # local import

    if window not in ("month", "all"):
        raise ValueError("window must be 'month' or 'all'")
    where_window = "" if window == "all" else "AND created_at >= NOW() - INTERVAL '30 days'"

    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT climbs FROM training_logs
                WHERE user_id = %s AND climbs <> '{{}}'::jsonb {where_window};
                """,
                (int(user_id),),
            )
            rows = cur.fetchall()

    out: Dict[str, Any] = {"window": window}
    for discipline in ("boulder", "route"):
        # accumulate counters per grade
        agg: Dict[str, Dict[str, int]] = {}
        for (climbs,) in rows:
            grades = (climbs or {}).get(discipline, {})
            for g, c in grades.items():
                slot = agg.setdefault(g, {"s": 0, "f": 0, "p": 0})
                slot["s"] += int(c.get("s", 0))
                slot["f"] += int(c.get("f", 0))
                slot["p"] += int(c.get("p", 0))
        # drop fully-zero rows
        nonzero = {g: c for g, c in agg.items() if c["s"] or c["f"] or c["p"]}
        sorted_grades = sorted(nonzero.keys(), key=grade_order)

        sends_only  = [g for g in sorted_grades if nonzero[g]["s"] > 0]
        flashes_only = [g for g in sorted_grades if nonzero[g]["f"] > 0]
        out[discipline] = {
            "hardest_send":  sends_only[-1]  if sends_only  else None,
            "hardest_flash": flashes_only[-1] if flashes_only else None,
            "grades": [
                {"grade": g, **nonzero[g]} for g in sorted_grades
            ],
        }
    return out
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
python -m unittest tests.test_climb_log.PyramidTests -v
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add database.py tests/test_climb_log.py
git commit -m "feat(climb-log): get_pyramid aggregates climbs by discipline + window"
```

---

## Task 6: Extend `POST /api/training` with climbs validation + new_prs detection

**Files:**
- Modify: `main.py:423-429` (TrainingLogRequest), `main.py:1041-1071` (log_session endpoint)
- Test: `tests/test_climb_log.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/test_climb_log.py`:

```python
from fastapi.testclient import TestClient  # noqa: E402
from main import app  # noqa: E402


def _auth_token_for(email: str) -> str:
    """Register or log in a user, return bearer token."""
    client = TestClient(app)
    payload = {"email": email, "password": "ClimbTest!1pw"}
    r = client.post("/api/auth/register", json=payload)
    if r.status_code == 400:
        r = client.post("/api/auth/login", json=payload)
    return r.json()["token"]


class LogSessionEndpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.email = "endpoint_climb@coretriage.local"
        cls.token = _auth_token_for(cls.email)
        cls.client = TestClient(app)

    def tearDown(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM training_logs WHERE user_id IN "
                    "(SELECT id FROM users WHERE email = %s);", (self.email,))
            conn.commit()

    def _post(self, body):
        return self.client.post(
            "/api/training", json=body,
            headers={"Authorization": f"Bearer {self.token}"},
        )

    def test_no_climbs_returns_no_prs(self):
        r = self._post({
            "session_type": "hangboard", "duration_min": 30, "intensity": 6,
        })
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertIn("id", body)
        self.assertEqual(body.get("new_prs"), {"boulder": None, "route": None})

    def test_first_boulder_send_sets_pr(self):
        r = self._post({
            "session_type": "bouldering", "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V5": {"s": 1, "f": 0, "p": 0}}},
        })
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["new_prs"], {"boulder": "V5", "route": None})

    def test_lower_grade_does_not_set_pr(self):
        # First, set a V7 PR
        self._post({
            "session_type": "bouldering", "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V7": {"s": 1, "f": 0, "p": 0}}},
        })
        # Now send a V5 — not a PR
        r = self._post({
            "session_type": "bouldering", "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V5": {"s": 2, "f": 0, "p": 0}}},
        })
        self.assertEqual(r.json()["new_prs"], {"boulder": None, "route": None})

    def test_invalid_grade_returns_400(self):
        r = self._post({
            "session_type": "bouldering", "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V99": {"s": 1, "f": 0, "p": 0}}},
        })
        self.assertEqual(r.status_code, 400)
        self.assertIn("V99", r.json()["detail"])

    def test_flashes_exceed_sends_returns_400(self):
        r = self._post({
            "session_type": "bouldering", "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V5": {"s": 1, "f": 2, "p": 0}}},
        })
        self.assertEqual(r.status_code, 400)
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
python -m unittest tests.test_climb_log.LogSessionEndpointTests -v
```
Expected: FAIL — endpoint doesn't accept climbs, response missing `new_prs`.

- [ ] **Step 3: Extend `TrainingLogRequest` in `main.py`**

Replace the existing `TrainingLogRequest` (line 423-429):

```python
class TrainingLogRequest(BaseModel):
    date: Optional[str] = None
    session_type: str
    duration_min: int
    intensity: int
    grades_sent: str = ""
    notes: str = ""
    climbs: Dict[str, Dict[str, Dict[str, int]]] = {}
```

If `Dict` isn't imported at the top, add `from typing import Dict, Optional` (Optional likely already imported).

- [ ] **Step 4: Update `log_session` endpoint in `main.py`**

Replace the existing `log_session` function (line 1041-1071) with:

```python
@app.post("/api/training")
@limiter.limit("60/minute")
def log_session(request: Request, req: TrainingLogRequest, user: Dict = Depends(get_current_user)):
    # Anti-abuse validation — prevent log inflation that would skew leaderboards.
    # Max 12h per single logged session (anything longer is clearly an outlier).
    if req.duration_min is not None and (req.duration_min < 0 or req.duration_min > 720):
        raise HTTPException(status_code=400, detail="Session length must be between 0 and 720 minutes (12 hours).")
    if req.intensity is not None and (req.intensity < 1 or req.intensity > 10):
        raise HTTPException(status_code=400, detail="Intensity must be between 1 and 10.")
    if req.date:
        try:
            session_date = datetime.fromisoformat(req.date).date() if "T" in req.date else datetime.strptime(req.date, "%Y-%m-%d").date()
            if session_date > datetime.now(timezone.utc).date():
                raise HTTPException(status_code=400, detail="Session date cannot be in the future.")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    # Validate climbs shape + grades + invariants. 400 on any failure.
    from src.climb_grades import validate_climbs, compute_hardest
    try:
        validate_climbs(req.climbs)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # PR detection: snapshot the user's hardest BEFORE insert, then compare to
    # this session's hardest. A new PR is one where this session's grade is
    # strictly harder than the prior best (or there was no prior best).
    from database import get_user_hardest
    from src.climb_grades import grade_order
    before = get_user_hardest(user["id"], window="all")
    session_hardest = compute_hardest(req.climbs)

    log_id = log_training(
        user["id"],
        {
            "date": req.date,
            "session_type": req.session_type,
            "duration_min": req.duration_min,
            "intensity": req.intensity,
            "grades_sent": req.grades_sent,
            "notes": req.notes,
            "climbs": req.climbs,
        },
    )

    new_prs = {"boulder": None, "route": None}
    for discipline in ("boulder", "route"):
        sh = session_hardest[discipline]
        if not sh:
            continue
        prev = before[discipline]
        if prev is None or grade_order(sh) > grade_order(prev):
            new_prs[discipline] = sh

    return {"id": log_id, "new_prs": new_prs}
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
python -m unittest tests.test_climb_log.LogSessionEndpointTests -v
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add main.py tests/test_climb_log.py
git commit -m "feat(climb-log): POST /api/training accepts climbs + returns new_prs"
```

---

## Task 7: `GET /api/training/pyramid` endpoint

**Files:**
- Modify: `main.py` (append after the existing `/api/training/leaderboard` endpoint)
- Test: `tests/test_climb_log.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/test_climb_log.py`:

```python
class PyramidEndpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.email = "pyr_endpoint@coretriage.local"
        cls.token = _auth_token_for(cls.email)
        cls.client = TestClient(app)

    def tearDown(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM training_logs WHERE user_id IN "
                    "(SELECT id FROM users WHERE email = %s);", (self.email,))
            conn.commit()

    def test_empty_user(self):
        r = self.client.get(
            "/api/training/pyramid?window=all",
            headers={"Authorization": f"Bearer {self.token}"},
        )
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertEqual(body["window"], "all")
        self.assertEqual(body["boulder"]["grades"], [])

    def test_aggregates_sends(self):
        self.client.post(
            "/api/training", json={
                "session_type": "bouldering", "duration_min": 60, "intensity": 7,
                "climbs": {"boulder": {"V5": {"s": 2, "f": 1, "p": 0}}},
            },
            headers={"Authorization": f"Bearer {self.token}"},
        )
        self.client.post(
            "/api/training", json={
                "session_type": "bouldering", "duration_min": 60, "intensity": 7,
                "climbs": {"boulder": {"V5": {"s": 1, "f": 0, "p": 0}, "V6": {"s": 0, "f": 0, "p": 2}}},
            },
            headers={"Authorization": f"Bearer {self.token}"},
        )
        r = self.client.get(
            "/api/training/pyramid?window=all",
            headers={"Authorization": f"Bearer {self.token}"},
        )
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertEqual(body["boulder"]["hardest_send"], "V5")
        self.assertEqual(body["boulder"]["grades"], [
            {"grade": "V5", "s": 3, "f": 1, "p": 0},
            {"grade": "V6", "s": 0, "f": 0, "p": 2},
        ])

    def test_invalid_window(self):
        r = self.client.get(
            "/api/training/pyramid?window=year",
            headers={"Authorization": f"Bearer {self.token}"},
        )
        self.assertEqual(r.status_code, 400)
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
python -m unittest tests.test_climb_log.PyramidEndpointTests -v
```
Expected: FAIL — endpoint 404.

- [ ] **Step 3: Add the endpoint to `main.py`**

In `main.py`, locate the existing `@app.get("/api/training/leaderboard")` block (around line 1155) and append after it:

```python
@app.get("/api/training/pyramid")
@limiter.limit("60/minute")
def fetch_pyramid(
    request: Request,
    window: str = "month",
    user: Dict = Depends(get_current_user),
):
    if window not in ("month", "all"):
        raise HTTPException(status_code=400, detail="window must be 'month' or 'all'")
    from database import get_pyramid
    return get_pyramid(user["id"], window=window)
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
python -m unittest tests.test_climb_log.PyramidEndpointTests -v
```
Expected: PASS.

- [ ] **Step 5: Run the full backend suite**

```bash
python -m unittest tests.test_climb_log -v
```
Expected: ALL tests pass. (16+ tests across 7 classes.)

- [ ] **Step 6: Commit**

```bash
git add main.py tests/test_climb_log.py
git commit -m "feat(climb-log): GET /api/training/pyramid endpoint"
```

---

## Task 8: Frontend API client — `getPyramid`

**Files:**
- Modify: `frontend/src/api.js` (around line 70-86, the training section)

- [ ] **Step 1: Add the helper**

In `frontend/src/api.js`, locate the existing `getTrainingLogs` line (around line 71) and add directly below:

```js
export const getPyramid = ({ window = 'month' } = {}) =>
  request('GET', `/api/training/pyramid?window=${encodeURIComponent(window)}`)
```

- [ ] **Step 2: Smoke-test in the browser console**

In the dev server, log in, then in DevTools console:

```js
fetch('/api/training/pyramid?window=all', {
  headers: { Authorization: `Bearer ${sessionStorage.getItem('ct_token')}` }
}).then(r => r.json()).then(console.log)
```

Expected: `{ window: 'all', boulder: { ... }, route: { ... } }` (empty grades for a fresh account).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api.js
git commit -m "feat(climb-log): api.js getPyramid helper"
```

---

## Task 9: `ClimbLogSection` + `GradeCounterRow` components

**Files:**
- Create: `frontend/src/components/GradeCounterRow.jsx`, `frontend/src/components/ClimbLogSection.jsx`

- [ ] **Step 1: Create `GradeCounterRow.jsx`**

```jsx
import { Minus, Plus } from 'lucide-react'

/**
 * One grade's three counters: Sends · Flashes · Projects.
 * Tap targets are 44×44px to meet the Apple HIG minimum on mobile.
 *
 * Props:
 *   grade:    string                                — e.g. "V5" or "5.11a"
 *   counters: { s: number, f: number, p: number }   — current state
 *   onChange: (next) => void                        — receives the full updated counters object
 */
export default function GradeCounterRow({ grade, counters, onChange }) {
  const { s, f, p } = counters

  function bump(key, delta) {
    let nextS = s, nextF = f, nextP = p
    if (key === 's') nextS = Math.max(0, s + delta)
    if (key === 'f') nextF = Math.max(0, f + delta)
    if (key === 'p') nextP = Math.max(0, p + delta)
    // Invariant: flashes <= sends. If sends drops below flashes, clamp flashes.
    if (nextF > nextS) nextF = nextS
    onChange({ s: nextS, f: nextF, p: nextP })
  }

  return (
    <div className="grid grid-cols-[3rem_1fr_1fr_1fr] items-center gap-2 py-1.5">
      <span className="text-sm font-bold text-text">{grade}</span>
      {[['s', s, 'sends'], ['f', f, 'flashes'], ['p', p, 'projects']].map(([k, val, label]) => (
        <div key={k} className="flex items-center justify-between gap-1">
          <button
            type="button"
            onClick={() => bump(k, -1)}
            disabled={val === 0}
            aria-label={`decrement ${label} for ${grade}`}
            className="w-11 h-11 inline-flex items-center justify-center rounded-lg
                       border border-outline text-muted hover:text-text
                       disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Minus size={14} />
          </button>
          <span className="text-sm font-bold text-text tabular-nums min-w-[1.5rem] text-center">
            {val}
          </span>
          <button
            type="button"
            onClick={() => bump(k, +1)}
            aria-label={`increment ${label} for ${grade}`}
            className="w-11 h-11 inline-flex items-center justify-center rounded-lg
                       border border-outline text-muted hover:text-text"
          >
            <Plus size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create `ClimbLogSection.jsx`**

```jsx
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp } from 'lucide-react'
import GradeCounterRow from './GradeCounterRow'

const V_GRADES   = Array.from({ length: 18 }, (_, i) => `V${i}`)
const YDS_GRADES = [
  '5.6', '5.7', '5.8', '5.9',
  ...['10', '11', '12', '13', '14', '15'].flatMap(n => ['a', 'b', 'c', 'd'].map(l => `5.${n}${l}`)),
]

// Default visible range — keeps the form short for beginners.
const BOULDER_DEFAULT_VISIBLE = 6  // V0–V5
const ROUTE_DEFAULT_VISIBLE   = 6  // 5.6–5.11a

/**
 * Collapsible structured-climbs section. Two sub-tabs (Boulder · Route);
 * each row has Sends · Flashes · Projects counters.
 *
 * Props:
 *   value:       { boulder?: {...}, route?: {...} }   — current climbs dict
 *   onChange:    (next) => void                       — receives a fully replaced climbs dict
 *   defaultTab:  'boulder' | 'route'                  — initial tab; overridden by localStorage if present
 */
export default function ClimbLogSection({ value, onChange, defaultTab = 'boulder' }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState(() => {
    try { return localStorage.getItem('ct_climb_tab') || defaultTab } catch { return defaultTab }
  })
  const [extraBoulder, setExtraBoulder] = useState(0)  // how many "+ harder" clicks
  const [extraRoute, setExtraRoute]     = useState(0)

  const boulderGrades = useMemo(
    () => V_GRADES.slice(0, BOULDER_DEFAULT_VISIBLE + extraBoulder),
    [extraBoulder],
  )
  const routeGrades = useMemo(
    () => YDS_GRADES.slice(0, ROUTE_DEFAULT_VISIBLE + extraRoute),
    [extraRoute],
  )

  function switchTab(t) {
    setTab(t)
    try { localStorage.setItem('ct_climb_tab', t) } catch {}
  }

  function updateCounter(discipline, grade, counters) {
    const next = {
      ...value,
      [discipline]: {
        ...(value?.[discipline] || {}),
        [grade]: counters,
      },
    }
    // Strip fully-zero rows to keep the JSONB compact.
    if (counters.s === 0 && counters.f === 0 && counters.p === 0) {
      delete next[discipline][grade]
    }
    if (Object.keys(next[discipline]).length === 0) {
      delete next[discipline]
    }
    onChange(next)
  }

  return (
    <div className="rounded-lg border border-outline bg-panel/60">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-text"
      >
        Log climbs <span className="text-muted/60 font-normal">(optional)</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3">
              {/* Tab strip */}
              <div className="flex gap-1 bg-bg/40 rounded-lg p-1">
                {[['boulder', 'Boulder'], ['route', 'Route']].map(([k, label]) => (
                  <button
                    type="button"
                    key={k}
                    onClick={() => switchTab(k)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${
                      tab === k ? 'bg-accent/20 text-accent' : 'text-muted hover:text-text'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Header */}
              <div className="grid grid-cols-[3rem_1fr_1fr_1fr] items-center gap-2 px-1">
                <span />
                <span className="text-[10px] uppercase tracking-wide text-muted text-center">Sends</span>
                <span className="text-[10px] uppercase tracking-wide text-muted text-center">Flashes</span>
                <span className="text-[10px] uppercase tracking-wide text-muted text-center">Projects</span>
              </div>

              {/* Rows */}
              {tab === 'boulder' && (
                <>
                  {boulderGrades.map(g => (
                    <GradeCounterRow
                      key={g}
                      grade={g}
                      counters={value?.boulder?.[g] || { s: 0, f: 0, p: 0 }}
                      onChange={(c) => updateCounter('boulder', g, c)}
                    />
                  ))}
                  {extraBoulder + BOULDER_DEFAULT_VISIBLE < V_GRADES.length && (
                    <button
                      type="button"
                      onClick={() => setExtraBoulder(n => n + 3)}
                      className="text-xs text-accent font-bold hover:underline"
                    >
                      + harder
                    </button>
                  )}
                </>
              )}
              {tab === 'route' && (
                <>
                  {routeGrades.map(g => (
                    <GradeCounterRow
                      key={g}
                      grade={g}
                      counters={value?.route?.[g] || { s: 0, f: 0, p: 0 }}
                      onChange={(c) => updateCounter('route', g, c)}
                    />
                  ))}
                  {extraRoute + ROUTE_DEFAULT_VISIBLE < YDS_GRADES.length && (
                    <button
                      type="button"
                      onClick={() => setExtraRoute(n => n + 4)}
                      className="text-xs text-accent font-bold hover:underline"
                    >
                      + harder
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

- [ ] **Step 3: Smoke-test by mounting in TrainingLogEntry (next task wires it)**

For now: no manual test. Component renders nothing until Task 10 wires it.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/GradeCounterRow.jsx frontend/src/components/ClimbLogSection.jsx
git commit -m "feat(climb-log): ClimbLogSection + GradeCounterRow components"
```

---

## Task 10: Wire `ClimbLogSection` into `TrainingLogEntry`

**Files:**
- Modify: `frontend/src/components/TrainingLogEntry.jsx`

- [ ] **Step 1: Replace the file contents**

Replace the entire contents of `frontend/src/components/TrainingLogEntry.jsx` with:

```jsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { logTraining } from '../api'
import DatePicker from './DatePicker'
import ClimbLogSection from './ClimbLogSection'

const SESSION_TYPES = ['bouldering', 'routes', 'hangboard', 'strength', 'outdoor', 'rest', 'other']

// Session types where logging individual climbs makes sense. Hangboard /
// strength / rest hide the climb section entirely — no climbs to log.
const CLIMB_SESSION_TYPES = new Set(['bouldering', 'routes', 'outdoor', 'other'])

const INTENSITY_LABELS = {
  1: 'Very easy', 2: 'Easy', 3: 'Easy-moderate',
  4: 'Moderate', 5: 'Moderate', 6: 'Moderate-hard',
  7: 'Hard', 8: 'Very hard', 9: 'Maximal', 10: 'Absolute max',
}

const INTENSITY_COLOR = (val) => {
  if (val <= 3) return 'text-accent'
  if (val <= 6) return 'text-accent3'
  return 'text-accent2'
}

export default function TrainingLogEntry({ sessionType: prefillType, onSave, onCancel }) {
  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    date: today,
    session_type: prefillType || 'bouldering',
    duration_min: 90,
    intensity: 7,
    grades_sent: '',
    notes: '',
    climbs: {},
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await logTraining(form)
      // If the server detected a new PR, broadcast a window event so App.jsx
      // can show the celebration toast. We can't import the toast directly
      // because TrainingLogEntry isn't a child of the toast slot.
      if (res?.new_prs && (res.new_prs.boulder || res.new_prs.route)) {
        window.dispatchEvent(new CustomEvent('ct:new-pr', { detail: res.new_prs }))
      }
      onSave?.()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const showClimbSection = CLIMB_SESSION_TYPES.has(form.session_type)
  const defaultTab = form.session_type === 'routes' ? 'route' : 'boulder'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-text">Log this session</p>
        {onCancel && (
          <button onClick={onCancel} className="text-muted hover:text-text">
            <X size={15} />
          </button>
        )}
      </div>

      {/* Date + type */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-muted mb-1">Date</p>
          <DatePicker value={form.date} onChange={(v) => set('date', v)} />
        </div>
        <div>
          <p className="text-xs text-muted mb-1">Session type</p>
          <select
            value={form.session_type}
            onChange={(e) => set('session_type', e.target.value)}
            className="w-full bg-panel border border-outline rounded-lg px-3 py-1.5 text-sm text-text outline-none focus:border-accent capitalize"
          >
            {SESSION_TYPES.map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Duration */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-muted">Duration</p>
          <span className="text-xs font-bold text-accent">{form.duration_min} min</span>
        </div>
        <input
          type="range"
          min={15}
          max={240}
          step={15}
          value={form.duration_min}
          onChange={(e) => set('duration_min', +e.target.value)}
          className="w-full accent-teal-400"
        />
      </div>

      {/* Intensity */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-muted">Intensity (RPE)</p>
          <span className={`text-xs font-bold ${INTENSITY_COLOR(form.intensity)}`}>
            {form.intensity}/10 — {INTENSITY_LABELS[form.intensity]}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          value={form.intensity}
          onChange={(e) => set('intensity', +e.target.value)}
          className="w-full accent-teal-400"
        />
      </div>

      {/* Free-text grades_sent — kept as a fallback for users who prefer typing */}
      <div>
        <p className="text-xs text-muted mb-1">Grades sent (free-form, optional)</p>
        <input
          type="text"
          placeholder="e.g. V5×3, V6×1, V7 attempt"
          value={form.grades_sent}
          onChange={(e) => set('grades_sent', e.target.value)}
          className="w-full bg-panel border border-outline rounded-lg px-3 py-1.5 text-sm text-text placeholder:text-muted/50 outline-none focus:border-accent"
        />
      </div>

      {/* Structured climb log — only for climbing-relevant session types */}
      {showClimbSection && (
        <ClimbLogSection
          value={form.climbs}
          onChange={(v) => set('climbs', v)}
          defaultTab={defaultTab}
        />
      )}

      {/* Notes */}
      <div>
        <p className="text-xs text-muted mb-1">Notes (optional)</p>
        <textarea
          rows={2}
          placeholder="How did it feel? Any breakthroughs or setbacks?"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          className="w-full bg-panel border border-outline rounded-lg px-3 py-1.5 text-sm text-text placeholder:text-muted/50 outline-none focus:border-accent resize-none"
        />
      </div>

      {error && <p className="text-xs text-accent2">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {saving ? 'Saving…' : <><Check size={14} /> Save session</>}
      </button>
    </motion.div>
  )
}
```

- [ ] **Step 2: Manual smoke-test**

In the dev server: open Train tab → start a session log → select session type `bouldering` → confirm the "Log climbs (optional)" collapsible section appears below the free-form grades field. Expand it, tap `+` on the V5 sends counter once, save. Check the network response — should include `new_prs: { boulder: "V5", route: null }` for a fresh account.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/TrainingLogEntry.jsx
git commit -m "feat(climb-log): TrainingLogEntry wires ClimbLogSection + new_prs event"
```

---

## Task 11: Celebration toast in `App.jsx`

**Files:**
- Modify: `frontend/src/App.jsx` (existing toast slot + new event listener)

- [ ] **Step 1: Add the `ct:new-pr` listener**

In `frontend/src/App.jsx`, find the existing `ct:auth-expired` listener block (around lines 134-143). Directly after it, add:

```jsx
  // Climb log celebration: PR toast on new hardest send. Dispatched by
  // TrainingLogEntry after a successful log when new_prs has a value.
  useEffect(() => {
    const handler = (ev) => {
      const { boulder, route } = ev.detail || {}
      const parts = []
      if (boulder) parts.push(`${boulder} boulder`)
      if (route)   parts.push(`${route} route`)
      if (parts.length === 0) return
      setToast({
        kind: 'celebration',
        message: `New PR — ${parts.join(' + ')}!`,
        link: '/progress',
      })
    }
    window.addEventListener('ct:new-pr', handler)
    return () => window.removeEventListener('ct:new-pr', handler)
  }, [])
```

- [ ] **Step 2: Render the celebration toast**

Find the existing `<AnimatePresence>` block that renders `toast` (around lines 296-324). Inside the styled `<div role="alert" ...>`, the current logic switches on `toast.kind === 'error'` vs default. Update so a `celebration` kind gets the celebratory styling and the message is tappable to navigate. Replace the existing toast `<div>` styling block:

```jsx
<div
  role="alert"
  className={`rounded-lg border px-4 py-3 text-sm shadow-lg backdrop-blur-sm flex items-start gap-3 ${
    toast.kind === 'error'
      ? 'bg-accent3/10 border-accent3/30 text-accent3'
      : toast.kind === 'celebration'
        ? 'bg-gradient-to-r from-accent/20 to-accent2/15 border-accent/50 text-text cursor-pointer'
        : 'bg-panel2 border-outline text-text'
  }`}
  onClick={() => {
    if (toast.link) {
      navigate(toast.link)
      setToast(null)
    }
  }}
>
  <span className="flex-1 leading-snug">
    {toast.kind === 'celebration' && '🎉 '}
    {toast.message}
    {toast.link && <span className="ml-2 text-accent font-bold">Tap to view ›</span>}
  </span>
  <button
    onClick={(e) => { e.stopPropagation(); setToast(null) }}
    className="text-muted hover:text-text shrink-0"
    aria-label="Dismiss"
  >
    <X size={14} />
  </button>
</div>
```

Also update the auto-dismiss timer (around line 146-150) — celebration is 4s, others stay 5s:

```jsx
  useEffect(() => {
    if (!toast) return
    const ms = toast.kind === 'celebration' ? 4000 : 5000
    const t = setTimeout(() => setToast(null), ms)
    return () => clearTimeout(t)
  }, [toast])
```

- [ ] **Step 3: Manual smoke-test**

Log a session in Train with a structured V-grade — confirm a 4-second celebratory toast appears at top center with "🎉 New PR — V5 boulder! Tap to view ›". Tap it → routes to `/progress` (which after Task 14 will render the Strava-style page; for now `/progress` still redirects to `/train` so the tap appears to do nothing useful — that's expected, the route fix comes in Task 14).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat(climb-log): celebration toast on new PR"
```

---

## Task 12: `useHubData` — fetch pyramid + expose `hardestSends`, `pyramidPreview`

**Files:**
- Modify: `frontend/src/hooks/useHubData.js` (uses `Promise.allSettled` with five fetches)

- [ ] **Step 1: Replace the file contents**

Replace `frontend/src/hooks/useHubData.js` entirely with:

```js
import { useEffect, useState } from 'react'
import {
  getSessions,
  getActivePlan,
  getTrainingStats,
  getTrainingLogs,
  getLeaderboard,
  getPyramid,
} from '../api'

const todayIsoDate = () => new Date().toISOString().slice(0, 10)

// Compute the calendar date of a plan session using the same algorithm
// PlanView.jsx uses, so "today's session" is consistent across the app.
function planSessionForToday(activePlan) {
  if (!activePlan?.plan_data?.sessions?.length || !activePlan.start_date) return null
  const start = new Date(activePlan.start_date + 'T00:00:00')
  const dpw = activePlan.plan_data.days_per_week || 3
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dayOffset = Math.floor((today - start) / 86400000)

  for (const s of activePlan.plan_data.sessions) {
    const off = (s.week - 1) * 7 + Math.round((s.day_in_week - 1) * (7 / dpw))
    if (off === dayOffset) return s
  }
  return null
}

/**
 * Loads everything HubTab needs in parallel. Per-endpoint failures degrade
 * gracefully — a 404 on /api/plans/active is normal (no plan yet) and is
 * NOT surfaced as an error.
 *
 * Returns: { loading, lastTriage, activePlan, todaySession, todayLogged,
 *           stats, rank, hardestSends, pyramidPreview }
 */
export function useHubData(user) {
  const [data, setData] = useState({
    loading: true,
    lastTriage: null,
    activePlan: null,
    todaySession: null,
    todayLogged: false,
    stats: null,
    rank: null,
    hardestSends:   { boulder: null, route: null },
    pyramidPreview: [],
  })

  useEffect(() => {
    if (!user) {
      setData((d) => ({ ...d, loading: false }))
      return
    }
    let cancelled = false

    Promise.allSettled([
      getSessions(1),
      getActivePlan(),
      getTrainingStats(),
      getTrainingLogs(5),
      getLeaderboard({ window: 'week', limit: 1 }),
      getPyramid({ window: 'month' }),
    ]).then(([sessionsR, planR, statsR, logsR, lbR, pyrR]) => {
      if (cancelled) return

      const sessions   = sessionsR.status === 'fulfilled' ? (sessionsR.value || []) : []
      const activePlan = planR.status     === 'fulfilled' ? planR.value             : null
      const stats      = statsR.status    === 'fulfilled' ? statsR.value            : null
      const logs       = logsR.status     === 'fulfilled' ? (logsR.value || [])     : []
      const lb         = lbR.status       === 'fulfilled' ? lbR.value               : null
      const pyramid    = pyrR.status      === 'fulfilled' ? pyrR.value              : null

      const today = todayIsoDate()
      const todayLogged = logs.some((l) => l.date === today)
      const todaySession = planSessionForToday(activePlan)

      const hardestSends = {
        boulder: pyramid?.boulder?.hardest_send || null,
        route:   pyramid?.route?.hardest_send   || null,
      }
      // Boulder pyramid preview takes precedence (matches HubGreeting + spec).
      // Fall back to route if no boulder data. Top 3 grades, descending so
      // hardest shows first.
      const primaryColumn = pyramid?.boulder?.grades?.length
        ? pyramid.boulder.grades
        : (pyramid?.route?.grades || [])
      const pyramidPreview = [...primaryColumn].reverse().slice(0, 3)

      setData({
        loading: false,
        lastTriage: sessions[0] || null,
        activePlan,
        todaySession,
        todayLogged,
        stats,
        rank: lb?.me || null,
        hardestSends,
        pyramidPreview,
      })
    })

    return () => { cancelled = true }
  }, [user])

  return data
}
```

- [ ] **Step 2: Smoke-test**

Reload the Hub. Temporarily add `console.log('hub data', data)` at the top of `HubTab`'s render to inspect. Confirm: `hardestSends.boulder` is `null` for fresh accounts, equals `"V5"` (or whatever PR was set) after a structured climb log. `pyramidPreview` is `[]` for fresh accounts, has up to 3 grade entries otherwise. Remove the temporary log before committing.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useHubData.js
git commit -m "feat(climb-log): useHubData exposes hardestSends + pyramidPreview"
```

---

## Task 13: `HubGreeting` PR pill

**Files:**
- Modify: `frontend/src/components/HubGreeting.jsx`

- [ ] **Step 1: Read current subtitle logic**

Open `frontend/src/components/HubGreeting.jsx`. The current subtitle build (around line 12-14):

```js
  const rp = rehabProgress(data.lastTriage?.created_at)
  if (rp && data.lastTriage) {
    return `${formatToday()} · Day ${rp.dayInPhase} of ${data.lastTriage.injury_area.toLowerCase()} rehab`
```

- [ ] **Step 2: Add the PR fragment**

Replace the subtitle-builder so it appends a PR pill when available. After the existing parts are computed, change the return to:

```js
  const rp = rehabProgress(data.lastTriage?.created_at)
  const pr = data.hardestSends?.boulder
    || data.hardestSends?.route
    || null
  const prFragment = pr
    ? (data.hardestSends?.boulder ? `${pr} boulder` : `${pr} route`)
    : null

  const segments = [formatToday()]
  if (prFragment) segments.push(prFragment)
  if (rp && data.lastTriage) {
    segments.push(`Day ${rp.dayInPhase} of ${data.lastTriage.injury_area.toLowerCase()} rehab`)
  }
  return segments.join(' · ')
```

(Boulder takes precedence over route if both exist — matches the spec's "boulder is primary for the V13 audience" rationale.)

- [ ] **Step 3: Smoke-test**

Hub greeting should now show `Friday · V5 boulder` for a user with a V5 PR, `Friday · V5 boulder · Day 3 of wrist rehab` for a user with both, and `Friday` alone for new users with neither.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/HubGreeting.jsx
git commit -m "feat(climb-log): HubGreeting PR pill in subtitle"
```

---

## Task 14: `HubProgressCard` replaces `HubSocialStrip`

**Files:**
- Create: `frontend/src/components/HubProgressCard.jsx`
- Modify: `frontend/src/components/HubTab.jsx` (swap the import + JSX)
- Delete: `frontend/src/components/HubSocialStrip.jsx`
- Modify: `frontend/src/App.jsx` (restore `/progress` route)

- [ ] **Step 1: Restore the `/progress` route**

In `frontend/src/App.jsx`, find the line:

```jsx
              <Route path="/progress"      element={<Navigate to="/train" replace />} />
```

Replace with:

```jsx
              <Route path="/progress"      element={<ProgressTab user={user} onLoginClick={() => setShowAuth(true)} />} />
```

`ProgressTab` is already lazy-imported at the top of the file (line 29 in the current file) — no import change needed.

- [ ] **Step 2: Create `HubProgressCard.jsx`**

```jsx
import { Trophy } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

/**
 * Replaces HubSocialStrip. Folds three jobs into one card:
 *  - leaderboard rank
 *  - hardest-send PR badges per discipline
 *  - top 3 grades from this month's boulder pyramid (or route if no boulder)
 *
 * Props:
 *   rank:           { rank, hours, display_name } | null
 *   hardestSends:   { boulder: string|null, route: string|null }
 *   pyramidPreview: [{ grade, s, f, p }]   — top 3 rows for the mini pyramid
 */
export default function HubProgressCard({ rank, hardestSends, pyramidPreview }) {
  const navigate = useNavigate()
  const hasAnyClimbs = !!(pyramidPreview && pyramidPreview.length)
  const hasRank      = !!(rank && rank.rank)
  const empty        = !hasRank && !hasAnyClimbs

  if (empty) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl
                      bg-panel2/50 border border-outline text-xs text-muted">
        <span>Log your first session to see how you stack up.</span>
        <button
          type="button"
          onClick={() => navigate('/train')}
          className="text-accent text-[11px] font-bold hover:underline"
        >
          Go to Train ›
        </button>
      </div>
    )
  }

  const prParts = []
  if (hardestSends?.boulder) prParts.push(`${hardestSends.boulder} boulder`)
  if (hardestSends?.route)   prParts.push(`${hardestSends.route} route`)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate('/progress')}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate('/progress') }}
      className="px-4 py-3 rounded-xl bg-panel2/50 border border-outline cursor-pointer
                 hover:border-accent/30 transition-colors focus:outline-none
                 focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="flex items-center gap-2 text-muted">
          {hasRank ? (
            <>
              <Trophy size={14} strokeWidth={2.2} className="text-accent3" />
              Ranked <strong className="text-text font-bold">#{rank.rank}</strong> this week
            </>
          ) : (
            <span>This month</span>
          )}
        </span>
        {prParts.length > 0 && (
          <span className="text-text font-bold">{prParts.join(' · ')}</span>
        )}
      </div>

      {hasAnyClimbs && (
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            {pyramidPreview.map(({ grade, s }) => (
              <span key={grade} className="text-[11px] text-muted flex items-center gap-1.5">
                <span className="text-text font-bold tabular-nums">{grade}</span>
                <span className="inline-flex gap-[2px]">
                  {Array.from({ length: 5 }, (_, i) => (
                    <span
                      key={i}
                      className={`inline-block w-1.5 h-2.5 rounded-[1px] ${
                        i < Math.min(s, 5) ? 'bg-accent' : 'bg-outline'
                      }`}
                    />
                  ))}
                </span>
              </span>
            ))}
          </div>
          <span className="text-accent text-[11px] font-bold">See progress ›</span>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Swap `HubSocialStrip` for `HubProgressCard` in `HubTab.jsx`**

In `frontend/src/components/HubTab.jsx`:

- Replace `import HubSocialStrip from './HubSocialStrip'` with `import HubProgressCard from './HubProgressCard'`.
- Replace `<HubSocialStrip rank={data.rank} />` (around line 199) with:

```jsx
      <HubProgressCard
        rank={data.rank}
        hardestSends={data.hardestSends}
        pyramidPreview={data.pyramidPreview}
      />
```

- [ ] **Step 4: Delete `HubSocialStrip.jsx`**

```bash
git rm frontend/src/components/HubSocialStrip.jsx
```

- [ ] **Step 5: Manual smoke-test**

Hub now shows the new progress card at the bottom. Tap it → routes to `/progress` which renders the existing Strava-style page (ProgressTab). Confirm: no console errors; tapping anywhere on the card navigates; the page actually loads (no more spinner-loop or empty Train screen).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/App.jsx frontend/src/components/HubProgressCard.jsx frontend/src/components/HubTab.jsx
git commit -m "feat(climb-log): HubProgressCard + restore /progress route"
```

---

## Task 15: `GradePyramidCard` for `ProgressTab`

**Files:**
- Create: `frontend/src/components/GradePyramidCard.jsx`
- Modify: `frontend/src/components/ProgressTab.jsx` (insert above the existing TrainStatsPanel structure)

- [ ] **Step 1: Create `GradePyramidCard.jsx`**

```jsx
import { useState, useEffect, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { getPyramid } from '../api'

/**
 * Full grade pyramid for ProgressTab. Two columns (Boulder · Route),
 * each row a horizontal stacked bar (flashes · sends · projects).
 * Time window pill: Month | All.
 */
function PyramidColumn({ label, data }) {
  if (!data || (!data.grades?.length && !data.hardest_send && !data.hardest_flash)) {
    return (
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-muted mb-2">
          {label}
        </p>
        <p className="text-xs text-muted/70 italic">No climbs logged yet.</p>
      </div>
    )
  }
  // For bar width: scale to the max counter SUM across the column's rows so
  // the heaviest row is fullest. We don't want columns scaled to each other —
  // boulder and route are independent.
  const maxRowTotal = Math.max(
    1, ...data.grades.map(g => g.s + g.f + g.p),
  )

  return (
    <div className="flex-1 min-w-0 space-y-2">
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-muted">
          {label}
        </p>
        <p className="text-[11px] text-muted">
          {data.hardest_send  && <>send <span className="text-text font-bold">{data.hardest_send}</span></>}
          {data.hardest_send && data.hardest_flash && ' · '}
          {data.hardest_flash && <>flash <span className="text-text font-bold">{data.hardest_flash}</span></>}
        </p>
      </div>
      {data.grades.map(({ grade, s, f, p }) => {
        const total = s + f + p
        const w = (n) => `${Math.round((n / maxRowTotal) * 100)}%`
        return (
          <div key={grade} className="space-y-1">
            <div className="flex items-baseline justify-between text-[11px]">
              <span className="text-text font-bold tabular-nums">{grade}</span>
              <span className="text-muted">
                {s > 0 && <>{s} send{s === 1 ? '' : 's'}</>}
                {f > 0 && <> · {f} flash{f === 1 ? '' : 'es'}</>}
                {p > 0 && <> · {p} project{p === 1 ? '' : 's'}</>}
              </span>
            </div>
            <div className="flex h-1.5 rounded-full bg-bg/40 overflow-hidden">
              {f > 0 && <span className="h-full bg-accent" style={{ width: w(f) }} />}
              {s - f > 0 && <span className="h-full bg-accent/60" style={{ width: w(s - f) }} />}
              {p > 0 && <span className="h-full bg-accent3" style={{ width: w(p) }} />}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function GradePyramidCard() {
  const [windowKey, setWindowKey] = useState(() => {
    try { return localStorage.getItem('ct_pyramid_window') || 'month' } catch { return 'month' }
  })
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    getPyramid({ window: windowKey })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [windowKey])

  useEffect(() => { load() }, [load])

  function pickWindow(w) {
    setWindowKey(w)
    try { localStorage.setItem('ct_pyramid_window', w) } catch {}
  }

  const empty = !loading && !error && data
    && !data.boulder?.grades?.length
    && !data.route?.grades?.length

  return (
    <div className="rounded-xl border border-outline bg-panel/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-extrabold text-text">Grade Pyramid</p>
        <div className="flex gap-1 bg-bg/40 rounded-lg p-0.5 text-[11px]">
          {[['month', 'Month'], ['all', 'All']].map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => pickWindow(k)}
              className={`px-2 py-1 rounded-md font-bold transition-colors ${
                windowKey === k ? 'bg-accent/20 text-accent' : 'text-muted hover:text-text'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="py-6 flex justify-center"><Loader2 size={16} className="animate-spin text-accent" /></div>}
      {error && <p className="text-xs text-accent2">{error}</p>}
      {empty && (
        <p className="text-xs text-muted">
          No climbs logged yet. Log a session in Train (set type to bouldering or routes) to see your pyramid grow.
        </p>
      )}
      {!loading && !error && !empty && data && (
        <div className="flex flex-col sm:flex-row gap-6">
          <PyramidColumn label="Boulder" data={data.boulder} />
          <PyramidColumn label="Route" data={data.route} />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Insert `GradePyramidCard` into `ProgressTab`**

In `frontend/src/components/ProgressTab.jsx`, add the import:

```jsx
import GradePyramidCard from './GradePyramidCard'
```

Then in the `ready`-state return (around line 121-130), insert the new card between the TrainStatsPanel and any other rendered content. Replace:

```jsx
      <TrainStatsPanel user={user} />
```

with:

```jsx
      <TrainStatsPanel user={user} />
      <div className="mt-6">
        <GradePyramidCard />
      </div>
```

This places the pyramid below the existing leaderboard (which is the centerpiece of TrainStatsPanel) and above the trend chart — matching the spec's "Pyramid sits high enough to be seen, but below the leaderboard" rule. TrainStatsPanel itself stays untouched.

- [ ] **Step 3: Manual smoke-test**

Navigate to `/progress`. Confirm:
- The page renders the Strava-style content (no redirect to Train).
- "Grade Pyramid" card appears below the leaderboard.
- For a user with no climbs logged: empty state copy.
- For a user with a V5 logged: a bar appears for V5 in the Boulder column with the right counts.
- Tapping the Month/All toggle switches the data + persists across reload.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/GradePyramidCard.jsx frontend/src/components/ProgressTab.jsx
git commit -m "feat(climb-log): GradePyramidCard in ProgressTab"
```

---

## Task 16: Full end-to-end manual verification

**Files:** none — manual test pass.

- [ ] **Step 1: Run the backend test suite**

```bash
python -m unittest tests.test_climb_log -v
```

Expected: 100% pass on all 7 test classes. If anything fails, fix and re-run before continuing.

- [ ] **Step 2: Run the full backend test suite to catch regressions**

```bash
python -m unittest discover tests -v
```

Expected: 100% pass. The new tests should bring the count up by ~25-30. No prior tests should regress.

- [ ] **Step 3: Manual end-to-end test on mobile (over LAN)**

1. Sign in with a fresh account (or wipe `training_logs` for an existing one).
2. Navigate to Hub. Confirm: `HubProgressCard` shows empty state ("Log your first session…").
3. Go to Train. Log a session: `bouldering`, 60 min, V5 with 2 sends + 1 flash.
4. Confirm: 4-second toast "🎉 New PR — V5 boulder! Tap to view ›".
5. Tap toast. Lands on `/progress`.
6. Confirm: ProgressTab renders. Grade Pyramid card shows V5 row with 2 sends (1 flash) bar.
7. Back to Hub. Confirm: greeting now reads `<weekday> · V5 boulder`. Progress card shows rank line + "V5 boulder" + V5 mini bar.
8. Log a second session, this time `routes`, 5.11a with 1 send. Confirm new toast `🎉 New PR — 5.11a route!`. Tap → `/progress`. Pyramid now shows both columns populated.
9. Log a third session with V5 again (lower than V7 if any was logged) — confirm NO toast (not a PR).
10. Switch the pyramid time pill from Month → All. Confirm: persists across reload.

- [ ] **Step 4: Run the frontend dev build to surface any syntax errors**

```bash
cd frontend && npm run build && cd ..
```

Expected: build succeeds with no errors. (Warnings are acceptable.)

- [ ] **Step 5: Commit any fixes**

If any verification steps surfaced bugs, fix and commit as scoped follow-ups:

```bash
git add <files>
git commit -m "fix(climb-log): <specific fix>"
```

- [ ] **Step 6: Final summary commit (optional)**

If there were no fixes, no final commit needed. The feature is complete.

---

## Spec coverage check

| Spec requirement | Task |
|---|---|
| JSONB column on training_logs | Task 2 |
| Grades_sent auto-summary | Task 3 |
| Server-side grade validation | Task 1 + Task 6 |
| f ≤ s invariant | Task 1 (helper) + Task 6 (endpoint) |
| POST /api/training extended + new_prs | Task 6 |
| GET /api/training/pyramid | Task 7 |
| getPyramid frontend helper | Task 8 |
| ClimbLogSection (collapsible, sub-tabs, + harder, persist tab) | Task 9 |
| GradeCounterRow with 44px tap targets | Task 9 |
| TrainingLogEntry conditional render by session_type | Task 10 |
| Celebration toast (4s, tap to /progress) | Task 11 |
| useHubData hardestSends + pyramidPreview | Task 12 |
| HubGreeting PR pill (boulder takes precedence) | Task 13 |
| HubProgressCard (rank + PR + mini pyramid) | Task 14 |
| Restore /progress route | Task 14 |
| GradePyramidCard in ProgressTab | Task 15 |
| Empty states everywhere | Tasks 14 + 15 |
| Manual mobile + regression pass | Task 16 |
