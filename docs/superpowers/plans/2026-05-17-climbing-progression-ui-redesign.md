# Climbing-progression UI redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Hub + Progress pages around an 11-tier color identity system, an Apple-Fitness-style rings hero, a Runna-style weekly calendar, a tier-promotion award system, and four live-feedback patterns that make the app respond visually to climbing actions.

**Architecture:** A working-tier helper (`working_tier(user_id)`) derives the user's tier from `get_user_hardest(user_id, window='month')`. A new `awards` table + award engine fires inside POST `/api/training` on log commit. The frontend mirrors the tier mapping in `lib/tier.js` and applies CSS custom properties via `<TierThemeRoot>` so the Hub, Progress, and nav active indicator all re-theme without component-by-component prop drilling. The Hub is rebuilt from 5 new components (Greeting / Rings / Project / Week strip / Feed); the Progress page is rebuilt from 6 sections (Header / Tier hero / Pyramid / Awards / Leaderboard / Trend). Live feedback layers on top: PR toast (existing, restyled), award unlock toast (new), tier-promotion takeover (new), and context-aware greeting variants.

**Tech Stack:** Python 3 / FastAPI / Pydantic / Postgres (JSONB) / `unittest` / React 18 / Framer Motion / lucide-react / Tailwind / `localStorage` / CSS custom properties.

---

## File structure (locked before tasks)

**Backend — new code:**
- `src/climb_grades.py` adds: `V_TIERS`, `TIER_NAMES`, `v_grade_to_tier`, `yds_to_tier`, `working_tier_from_hardest`
- `src/awards_catalog.py` (NEW) — catalog of award kinds + predicate functions
- `database.py` adds: `awards` table migration, `insert_award`, `list_awards`, `compute_streak`, `count_sends`
- `main.py` adds: `AwardOut` Pydantic model, `GET /api/awards` endpoint, extends POST `/api/training` response with `tier_change` + `new_awards`

**Backend — tests:**
- `tests/test_tiers.py` (NEW) — tier mapping helpers
- `tests/test_awards.py` (NEW) — award engine, predicates, endpoint

**Frontend — new files:**
- `frontend/src/lib/tier.js` — palette tokens, name lookup, V→tier, YDS→tier
- `frontend/src/lib/hubGreeting.js` — greeting variant selector
- `frontend/src/lib/awardCatalog.js` — frontend mirror of award metadata (name, icon, gradient)
- `frontend/src/hooks/useTierTheme.js` — exposes `{ tierId, tierName, tokens }` to consumers
- `frontend/src/hooks/useAwards.js` — fetch + cache awards list
- `frontend/src/components/TierThemeRoot.jsx` — wraps a subtree, sets CSS custom properties
- `frontend/src/components/HubRingsCard.jsx`
- `frontend/src/components/HubProjectCard.jsx`
- `frontend/src/components/HubWeekStrip.jsx`
- `frontend/src/components/HubFeedCard.jsx`
- `frontend/src/components/ProgressTierHero.jsx`
- `frontend/src/components/ProgressTrendGraph.jsx`
- `frontend/src/components/AwardsStrip.jsx`
- `frontend/src/components/AwardMedal.jsx` — size variants 40/84/168
- `frontend/src/components/AwardUnlockToast.jsx`
- `frontend/src/components/TierPromotionTakeover.jsx`

**Frontend — modified files:**
- `frontend/src/api.js` — add `getAwards`
- `frontend/src/hooks/useHubData.js` — fetch + expose working tier
- `frontend/src/components/HubGreeting.jsx` — variants + tier pill + avatar
- `frontend/src/components/HubTab.jsx` — rebuild around new components, drop tool cards + HubProgressCard
- `frontend/src/components/ProgressTab.jsx` — rebuild around new section layout
- `frontend/src/components/TrainingLogEntry.jsx` — dispatch `ct:tier-promotion` + `ct:award-unlocked` events
- `frontend/src/App.jsx` — listen for tier-promotion + award-unlocked, refresh PR toast styling, expose nav active-indicator CSS var

**Frontend — removed:**
- `frontend/src/components/HubProgressCard.jsx` — superseded by `/progress` in nav

---

## Phase 1 — Backend foundations

### Task 1: Tier mapping helpers

**Files:**
- Modify: `src/climb_grades.py` (append new functions)
- Test: `tests/test_tiers.py` (new)

- [ ] **Step 1: Create the failing test**

Create `tests/test_tiers.py`:

```python
"""Tests for tier mapping helpers."""
from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.climb_grades import (  # noqa: E402
    V_TIERS,
    TIER_NAMES,
    v_grade_to_tier,
    yds_to_tier,
    working_tier_from_hardest,
)


class VTierTests(unittest.TestCase):
    def test_v_grades_unique_through_v9(self):
        self.assertEqual(v_grade_to_tier("V0"), "v0")
        self.assertEqual(v_grade_to_tier("V5"), "v5")
        self.assertEqual(v_grade_to_tier("V9"), "v9")

    def test_v10_and_above_collapse_to_v10(self):
        self.assertEqual(v_grade_to_tier("V10"), "v10")
        self.assertEqual(v_grade_to_tier("V12"), "v10")
        self.assertEqual(v_grade_to_tier("V17"), "v10")

    def test_invalid_grade_raises(self):
        with self.assertRaises(ValueError):
            v_grade_to_tier("V99")
        with self.assertRaises(ValueError):
            v_grade_to_tier("not a grade")


class YDSTierTests(unittest.TestCase):
    def test_easy_routes_v0(self):
        self.assertEqual(yds_to_tier("5.6"), "v0")
        self.assertEqual(yds_to_tier("5.10d"), "v0")

    def test_511a_v1(self):
        self.assertEqual(yds_to_tier("5.11a"), "v1")

    def test_511b_through_511c_v2(self):
        self.assertEqual(yds_to_tier("5.11b"), "v2")
        self.assertEqual(yds_to_tier("5.11c"), "v2")

    def test_511d_v3(self):
        self.assertEqual(yds_to_tier("5.11d"), "v3")

    def test_512_band(self):
        self.assertEqual(yds_to_tier("5.12a"), "v4")
        self.assertEqual(yds_to_tier("5.12b"), "v4")
        self.assertEqual(yds_to_tier("5.12c"), "v5")
        self.assertEqual(yds_to_tier("5.12d"), "v5")

    def test_513_band(self):
        self.assertEqual(yds_to_tier("5.13a"), "v6")
        self.assertEqual(yds_to_tier("5.13b"), "v7")
        self.assertEqual(yds_to_tier("5.13c"), "v8")
        self.assertEqual(yds_to_tier("5.13d"), "v9")

    def test_514_plus_v10(self):
        self.assertEqual(yds_to_tier("5.14a"), "v10")
        self.assertEqual(yds_to_tier("5.15d"), "v10")


class WorkingTierTests(unittest.TestCase):
    def test_no_sends_defaults_to_v0(self):
        self.assertEqual(working_tier_from_hardest({"boulder": None, "route": None}), "v0")

    def test_picks_higher_of_boulder_and_route(self):
        # V5 boulder vs 5.11a route (V1) → V5 wins
        self.assertEqual(
            working_tier_from_hardest({"boulder": "V5", "route": "5.11a"}),
            "v5",
        )
        # V3 boulder vs 5.13a route (V6) → V6 wins
        self.assertEqual(
            working_tier_from_hardest({"boulder": "V3", "route": "5.13a"}),
            "v6",
        )

    def test_only_route(self):
        self.assertEqual(
            working_tier_from_hardest({"boulder": None, "route": "5.12c"}),
            "v5",
        )

    def test_only_boulder(self):
        self.assertEqual(
            working_tier_from_hardest({"boulder": "V8", "route": None}),
            "v8",
        )


class TierConstantsTests(unittest.TestCase):
    def test_v_tiers_list_length(self):
        self.assertEqual(len(V_TIERS), 11)
        self.assertEqual(V_TIERS[0], "v0")
        self.assertEqual(V_TIERS[-1], "v10")

    def test_tier_names_complete(self):
        for tier in V_TIERS:
            self.assertIn(tier, TIER_NAMES)
        # Spot check names
        self.assertEqual(TIER_NAMES["v0"], "Ivory")
        self.assertEqual(TIER_NAMES["v7"], "Cobalt")
        self.assertEqual(TIER_NAMES["v10"], "Coral")
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python -m unittest tests.test_tiers -v
```
Expected: ImportError — `V_TIERS`, `TIER_NAMES`, etc. don't exist yet.

- [ ] **Step 3: Add helpers to `src/climb_grades.py`**

Append at the end of `src/climb_grades.py`:

```python
# ── Tier system (V0–V9 unique + V10+ Coral) ───────────────────────────

V_TIERS = ["v0", "v1", "v2", "v3", "v4", "v5", "v6", "v7", "v8", "v9", "v10"]

TIER_NAMES = {
    "v0":  "Ivory",
    "v1":  "Honey",
    "v2":  "Apricot",
    "v3":  "Acid Lime",
    "v4":  "Jade",
    "v5":  "Teal",
    "v6":  "Electric Sky",
    "v7":  "Cobalt",
    "v8":  "Iris",
    "v9":  "Magenta",
    "v10": "Coral",
}


def v_grade_to_tier(grade: str) -> str:
    """Map a V-grade ('V0'..'V17') to a tier id.
    V10 and harder all collapse to 'v10' (Coral)."""
    m = BOULDER_RE.match(grade)
    if not m:
        raise ValueError(f"invalid V-grade: {grade}")
    n = int(m.group(1))
    return f"v{min(n, 10)}"


# YDS -> tier per the chart in the design spec
_YDS_TIER_MAP = {
    "5.6": "v0", "5.7": "v0", "5.8": "v0", "5.9": "v0",
    "5.10a": "v0", "5.10b": "v0", "5.10c": "v0", "5.10d": "v0",
    "5.11a": "v1",
    "5.11b": "v2", "5.11c": "v2",
    "5.11d": "v3",
    "5.12a": "v4", "5.12b": "v4",
    "5.12c": "v5", "5.12d": "v5",
    "5.13a": "v6",
    "5.13b": "v7",
    "5.13c": "v8",
    "5.13d": "v9",
    # 5.14a..5.15d all coral
    "5.14a": "v10", "5.14b": "v10", "5.14c": "v10", "5.14d": "v10",
    "5.15a": "v10", "5.15b": "v10", "5.15c": "v10", "5.15d": "v10",
}


def yds_to_tier(grade: str) -> str:
    """Map a YDS grade ('5.6'..'5.15d') to a tier id."""
    if grade not in _YDS_TIER_MAP:
        if ROUTE_RE.match(grade):
            # Valid YDS we forgot to map — default to v10 if 5.14+, else v0
            return "v10"
        raise ValueError(f"invalid YDS grade: {grade}")
    return _YDS_TIER_MAP[grade]


def _tier_index(tier: str) -> int:
    """Return the position of a tier id in V_TIERS; used for max() comparison."""
    try:
        return V_TIERS.index(tier)
    except ValueError:
        return -1


def working_tier_from_hardest(hardest: Dict[str, Optional[str]]) -> str:
    """Return the user's working tier from a `get_user_hardest()` result.

    Picks the higher of the boulder and route tier mappings. Defaults
    to 'v0' if both are None.
    """
    boulder = hardest.get("boulder")
    route   = hardest.get("route")
    tiers = []
    if boulder:
        tiers.append(v_grade_to_tier(boulder))
    if route:
        tiers.append(yds_to_tier(route))
    if not tiers:
        return "v0"
    return max(tiers, key=_tier_index)
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
python -m unittest tests.test_tiers -v
```
Expected: all 14 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/climb_grades.py tests/test_tiers.py
git commit -m "feat(tier): V→tier + YDS→tier + working_tier_from_hardest helpers"
```

---

### Task 2: `awards` table migration

**Files:**
- Modify: `database.py` (add migration inside `init_db()` after the existing climb-log migration)
- Test: `tests/test_awards.py` (new)

- [ ] **Step 1: Write the failing test**

Create `tests/test_awards.py`:

```python
"""Tests for the awards system."""
from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import _connect, init_db  # noqa: E402


class AwardsSchemaTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()

    def test_awards_table_exists_with_columns(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """SELECT column_name, data_type, is_nullable
                       FROM information_schema.columns
                       WHERE table_name = 'awards'
                       ORDER BY ordinal_position;"""
                )
                cols = cur.fetchall()
        names = [c[0] for c in cols]
        for required in ("id", "user_id", "kind", "payload", "earned_at"):
            self.assertIn(required, names, f"awards.{required} missing")
        # payload is jsonb
        for name, dt, _ in cols:
            if name == "payload":
                self.assertEqual(dt, "jsonb")

    def test_unique_user_kind_constraint(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """SELECT 1 FROM information_schema.table_constraints
                       WHERE table_name = 'awards'
                       AND constraint_type = 'UNIQUE';"""
                )
                self.assertIsNotNone(cur.fetchone(), "UNIQUE (user_id, kind) missing")
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python -m unittest tests.test_awards.AwardsSchemaTests -v
```
Expected: FAIL — table doesn't exist.

- [ ] **Step 3: Add migration to `database.py`**

In `database.py`, locate the existing climb-log migration (the `_add_column_if_missing(cur, "training_logs", "climbs", ...)` block inside `init_db()`). Directly after the seed-climber progression-table CREATE TABLE block, add:

```python
            # Awards — milestones earned by the user (first V5, 10-day streak,
            # ×30 sends, etc.). The award engine in main.py runs at log commit
            # and inserts new rows here when predicates unlock.
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS awards (
                    id         SERIAL PRIMARY KEY,
                    user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    kind       TEXT NOT NULL,
                    payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
                    earned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UNIQUE (user_id, kind)
                );
                """
            )
            cur.execute("CREATE INDEX IF NOT EXISTS awards_user_idx ON awards (user_id);")
```

- [ ] **Step 4: Run test to verify it passes**

```bash
python -m unittest tests.test_awards.AwardsSchemaTests -v
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add database.py tests/test_awards.py
git commit -m "feat(awards): awards table migration"
```

---

### Task 3: Award helpers — insert, list, streak/count math

**Files:**
- Modify: `database.py` (append helpers after the existing climb-log helpers)
- Test: `tests/test_awards.py` (append a new test class)

- [ ] **Step 1: Append failing tests**

Append to `tests/test_awards.py`:

```python
from database import (  # noqa: E402
    log_training,
    insert_award,
    list_awards,
    compute_streak,
    count_sends,
)


def _make_user(email: str = "awards_test@coretriage.local") -> int:
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO users (email, password_hash) VALUES (%s, %s) "
                "ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING id;",
                (email, "x"),
            )
            uid = cur.fetchone()[0]
            cur.execute("DELETE FROM training_logs WHERE user_id = %s;", (uid,))
            cur.execute("DELETE FROM awards WHERE user_id = %s;", (uid,))
        conn.commit()
    return uid


class AwardHelpersTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.uid = _make_user()

    def tearDown(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM awards WHERE user_id = %s;", (self.uid,))
                cur.execute("DELETE FROM training_logs WHERE user_id = %s;", (self.uid,))
            conn.commit()

    def test_insert_and_list(self):
        insert_award(self.uid, "first_send_v5", {"trigger_log_id": 1, "grade": "V5"})
        rows = list_awards(self.uid)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["kind"], "first_send_v5")
        self.assertEqual(rows[0]["payload"]["grade"], "V5")

    def test_insert_is_idempotent(self):
        insert_award(self.uid, "first_send_v5", {"grade": "V5"})
        insert_award(self.uid, "first_send_v5", {"grade": "V5"})  # re-fire
        rows = list_awards(self.uid)
        self.assertEqual(len(rows), 1, "duplicate award not deduped")

    def test_count_sends_total(self):
        log_training(self.uid, {
            "date": "2026-05-10", "session_type": "bouldering",
            "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V5": {"s": 3, "f": 1, "p": 0}}},
        })
        log_training(self.uid, {
            "date": "2026-05-11", "session_type": "bouldering",
            "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V6": {"s": 2, "f": 0, "p": 0}}, "route": {"5.11a": {"s": 1, "f": 0, "p": 0}}},
        })
        self.assertEqual(count_sends(self.uid), 6)

    def test_compute_streak_consecutive(self):
        # 3 consecutive days = streak of 3
        for d in ("2026-05-14", "2026-05-15", "2026-05-16"):
            log_training(self.uid, {
                "date": d, "session_type": "bouldering",
                "duration_min": 60, "intensity": 7,
            })
        self.assertEqual(compute_streak(self.uid, today="2026-05-16"), 3)

    def test_compute_streak_breaks_on_gap(self):
        # Logged 14, 15, 16, then 18 → streak ending 18 is 1 day
        for d in ("2026-05-14", "2026-05-15", "2026-05-16", "2026-05-18"):
            log_training(self.uid, {
                "date": d, "session_type": "bouldering",
                "duration_min": 60, "intensity": 7,
            })
        self.assertEqual(compute_streak(self.uid, today="2026-05-18"), 1)

    def test_compute_streak_no_logs(self):
        self.assertEqual(compute_streak(self.uid, today="2026-05-16"), 0)
```

- [ ] **Step 2: Run tests, expect import error**

```bash
python -m unittest tests.test_awards.AwardHelpersTests -v
```
Expected: ImportError on `insert_award`, `list_awards`, `compute_streak`, `count_sends`.

- [ ] **Step 3: Add helpers to `database.py`**

Append after the existing `get_pyramid` function in `database.py`:

```python
# ── Awards helpers ────────────────────────────────────────────────────


def insert_award(user_id: int, kind: str, payload: Dict[str, Any]) -> Optional[int]:
    """Insert a new award row, idempotent via UNIQUE (user_id, kind).

    Returns the new row id if inserted, None if it already existed.
    """
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO awards (user_id, kind, payload)
                VALUES (%s, %s, %s::jsonb)
                ON CONFLICT (user_id, kind) DO NOTHING
                RETURNING id;
                """,
                (int(user_id), kind, json.dumps(payload or {})),
            )
            row = cur.fetchone()
        conn.commit()
    return int(row[0]) if row else None


def list_awards(user_id: int) -> List[Dict[str, Any]]:
    """Return the user's earned awards, newest first."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, kind, payload, earned_at
                FROM awards WHERE user_id = %s
                ORDER BY earned_at DESC;
                """,
                (int(user_id),),
            )
            rows = cur.fetchall()
    return [
        {
            "id": r[0],
            "kind": r[1],
            "payload": r[2] or {},
            "earned_at": str(r[3]),
        }
        for r in rows
    ]


def count_sends(user_id: int) -> int:
    """Total count of sends across all `training_logs.climbs` rows for a user.
    Sums `s` across every grade across both disciplines."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT climbs FROM training_logs
                WHERE user_id = %s AND climbs <> '{}'::jsonb;
                """,
                (int(user_id),),
            )
            rows = cur.fetchall()
    total = 0
    for (climbs,) in rows:
        for discipline in ("boulder", "route"):
            grades = (climbs or {}).get(discipline, {})
            for c in grades.values():
                total += int(c.get("s", 0) or 0)
    return total


def compute_streak(user_id: int, today: str) -> int:
    """Return the user's current consecutive-day streak ending at `today`.

    `today` is a YYYY-MM-DD string in the user's local timezone (matches the
    `training_logs.date` column convention). A streak is the number of
    consecutive calendar days ending at today with at least one training_logs
    row. Zero if today has no log.
    """
    from datetime import date, timedelta

    def parse(s: str) -> date:
        y, m, d = s.split("-")
        return date(int(y), int(m), int(d))

    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT DISTINCT date FROM training_logs WHERE user_id = %s;
                """,
                (int(user_id),),
            )
            dates_set = {r[0] for r in cur.fetchall()}

    cursor_date = parse(today)
    streak = 0
    while cursor_date in dates_set:
        streak += 1
        cursor_date = cursor_date - timedelta(days=1)
    return streak
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
python -m unittest tests.test_awards -v
```
Expected: 6/6 pass (1 schema + 5 helpers).

- [ ] **Step 5: Commit**

```bash
git add database.py tests/test_awards.py
git commit -m "feat(awards): insert/list helpers + count_sends + compute_streak"
```

---

### Task 4: Awards catalog + engine

**Files:**
- Create: `src/awards_catalog.py`
- Test: `tests/test_awards.py` (append)

- [ ] **Step 1: Append failing tests**

Append to `tests/test_awards.py`:

```python
from src.awards_catalog import (  # noqa: E402
    AWARD_CATALOG,
    detect_new_awards,
)


class AwardEngineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.uid = _make_user(email="award_engine@coretriage.local")

    def tearDown(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM awards WHERE user_id = %s;", (self.uid,))
                cur.execute("DELETE FROM training_logs WHERE user_id = %s;", (self.uid,))
            conn.commit()

    def test_first_send_v3_fires_when_logged(self):
        log_training(self.uid, {
            "date": "2026-05-15", "session_type": "bouldering",
            "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V3": {"s": 1, "f": 0, "p": 0}}},
        })
        new = detect_new_awards(self.uid, "2026-05-15")
        kinds = {a["kind"] for a in new}
        self.assertIn("first_send_v3", kinds)

    def test_first_send_v3_idempotent(self):
        log_training(self.uid, {
            "date": "2026-05-15", "session_type": "bouldering",
            "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V3": {"s": 1, "f": 0, "p": 0}}},
        })
        detect_new_awards(self.uid, "2026-05-15")
        # Log another V3 — should NOT re-fire first_send_v3
        log_training(self.uid, {
            "date": "2026-05-16", "session_type": "bouldering",
            "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V3": {"s": 2, "f": 0, "p": 0}}},
        })
        new = detect_new_awards(self.uid, "2026-05-16")
        kinds = {a["kind"] for a in new}
        self.assertNotIn("first_send_v3", kinds)

    def test_first_flash_fires(self):
        log_training(self.uid, {
            "date": "2026-05-15", "session_type": "bouldering",
            "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V4": {"s": 1, "f": 1, "p": 0}}},
        })
        new = detect_new_awards(self.uid, "2026-05-15")
        self.assertIn("first_flash", {a["kind"] for a in new})

    def test_streak_10d_fires_at_day_10(self):
        from datetime import date, timedelta
        start = date(2026, 5, 6)
        for i in range(10):
            d = (start + timedelta(days=i)).isoformat()
            log_training(self.uid, {
                "date": d, "session_type": "bouldering",
                "duration_min": 60, "intensity": 7,
            })
        new = detect_new_awards(self.uid, "2026-05-15")
        self.assertIn("streak_10d", {a["kind"] for a in new})

    def test_volume_10_fires(self):
        log_training(self.uid, {
            "date": "2026-05-15", "session_type": "bouldering",
            "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V3": {"s": 10, "f": 0, "p": 0}}},
        })
        new = detect_new_awards(self.uid, "2026-05-15")
        self.assertIn("volume_10", {a["kind"] for a in new})

    def test_catalog_complete(self):
        # Sanity: catalog covers grade/streak/volume/style milestones
        kinds = {entry["kind"] for entry in AWARD_CATALOG}
        for required in ("first_send_v3", "first_send_v10", "streak_3d", "streak_100d",
                         "volume_10", "volume_500", "first_flash"):
            self.assertIn(required, kinds, f"catalog missing {required}")
```

- [ ] **Step 2: Run tests, expect import failure**

```bash
python -m unittest tests.test_awards.AwardEngineTests -v
```
Expected: ImportError on `src.awards_catalog`.

- [ ] **Step 3: Create `src/awards_catalog.py`**

```python
"""Award catalog + engine — predicates that decide when each award unlocks.

Each catalog entry is a dict: { kind, category, label, predicate }.
`predicate(uid, today_iso)` returns `(unlocked: bool, payload: dict)`.

`detect_new_awards(uid, today_iso)` runs every catalog entry against the
user's current state, inserts unlocked entries via `insert_award`, and
returns the list of newly-inserted rows.
"""
from __future__ import annotations

from typing import Any, Callable, Dict, List, Tuple

from database import (
    _connect,
    count_sends,
    compute_streak,
    insert_award,
    list_awards,
)


# ── Predicates ─────────────────────────────────────────────────────────


def _user_has_send_at_v(uid: int, target_v: str) -> bool:
    """True if user has any send at the given V-grade across all logs."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT 1 FROM training_logs
                WHERE user_id = %s
                  AND (climbs -> 'boulder' -> %s ->> 's')::int > 0
                LIMIT 1;
                """,
                (int(uid), target_v),
            )
            return cur.fetchone() is not None


def _user_has_any_flash(uid: int) -> bool:
    """True if user has any flash logged in any discipline / any grade."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT climbs FROM training_logs
                WHERE user_id = %s AND climbs <> '{}'::jsonb;
                """,
                (int(uid),),
            )
            for (climbs,) in cur.fetchall():
                for discipline in ("boulder", "route"):
                    for c in (climbs or {}).get(discipline, {}).values():
                        if int(c.get("f", 0) or 0) > 0:
                            return True
    return False


def _make_first_send_predicate(target_v: str, label: str) -> Callable:
    def pred(uid: int, today_iso: str):
        if _user_has_send_at_v(uid, target_v):
            return True, {"grade": target_v}
        return False, {}
    pred.__name__ = f"pred_first_send_{target_v.lower()}"
    return pred


def _make_streak_predicate(n_days: int) -> Callable:
    def pred(uid: int, today_iso: str):
        streak = compute_streak(uid, today=today_iso)
        return streak >= n_days, {"days": streak}
    pred.__name__ = f"pred_streak_{n_days}d"
    return pred


def _make_volume_predicate(n_sends: int) -> Callable:
    def pred(uid: int, today_iso: str):
        total = count_sends(uid)
        return total >= n_sends, {"sends": total}
    pred.__name__ = f"pred_volume_{n_sends}"
    return pred


def _pred_first_flash(uid: int, today_iso: str):
    if _user_has_any_flash(uid):
        return True, {}
    return False, {}


# ── Catalog ────────────────────────────────────────────────────────────

AWARD_CATALOG: List[Dict[str, Any]] = [
    # Grade milestones — V3 through V10+
    *[
        {"kind": f"first_send_v{n}", "category": "grade",
         "label": f"First V{n}", "predicate": _make_first_send_predicate(f"V{n}", f"First V{n}")}
        for n in (3, 4, 5, 6, 7, 8, 9, 10)
    ],
    # Streak milestones
    {"kind": "streak_3d",   "category": "streak", "label": "3-day streak",   "predicate": _make_streak_predicate(3)},
    {"kind": "streak_10d",  "category": "streak", "label": "10-day streak",  "predicate": _make_streak_predicate(10)},
    {"kind": "streak_30d",  "category": "streak", "label": "30-day streak",  "predicate": _make_streak_predicate(30)},
    {"kind": "streak_100d", "category": "streak", "label": "100-day streak", "predicate": _make_streak_predicate(100)},
    # Volume milestones
    {"kind": "volume_10",   "category": "volume", "label": "10 sends",   "predicate": _make_volume_predicate(10)},
    {"kind": "volume_30",   "category": "volume", "label": "30 sends",   "predicate": _make_volume_predicate(30)},
    {"kind": "volume_50",   "category": "volume", "label": "50 sends",   "predicate": _make_volume_predicate(50)},
    {"kind": "volume_100",  "category": "volume", "label": "100 sends",  "predicate": _make_volume_predicate(100)},
    {"kind": "volume_500",  "category": "volume", "label": "500 sends",  "predicate": _make_volume_predicate(500)},
    # Style milestones
    {"kind": "first_flash", "category": "style",  "label": "First flash", "predicate": _pred_first_flash},
]


def detect_new_awards(uid: int, today_iso: str) -> List[Dict[str, Any]]:
    """Run every catalog predicate. For each that unlocks AND isn't already
    in `awards`, insert it and return the new rows."""
    earned_kinds = {a["kind"] for a in list_awards(uid)}
    new_awards: List[Dict[str, Any]] = []
    for entry in AWARD_CATALOG:
        if entry["kind"] in earned_kinds:
            continue
        unlocked, payload = entry["predicate"](uid, today_iso)
        if unlocked:
            insert_award(uid, entry["kind"], payload)
            new_awards.append({
                "kind": entry["kind"],
                "label": entry["label"],
                "category": entry["category"],
                "payload": payload,
            })
    return new_awards
```

- [ ] **Step 4: Run tests**

```bash
python -m unittest tests.test_awards -v
```
Expected: 12/12 pass.

- [ ] **Step 5: Commit**

```bash
git add src/awards_catalog.py tests/test_awards.py
git commit -m "feat(awards): catalog + detect_new_awards engine"
```

---

### Task 5: Extend `POST /api/training` with `tier_change` + `new_awards`

**Files:**
- Modify: `main.py:1041-1098` (the existing `log_session` endpoint)
- Test: `tests/test_awards.py` (append)

- [ ] **Step 1: Append the failing test**

Append to `tests/test_awards.py`:

```python
from fastapi.testclient import TestClient  # noqa: E402
from main import app  # noqa: E402


def _auth_token(email: str) -> str:
    c = TestClient(app)
    pw = "ClimbTest!1pw"
    r = c.post("/api/auth/register", json={"email": email, "password": pw})
    if r.status_code == 400:
        r = c.post("/api/auth/login", json={"email": email, "password": pw})
    return r.json()["token"]


class LogSessionAwardsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.email = "log_awards@coretriage.local"
        cls.token = _auth_token(cls.email)
        cls.client = TestClient(app)

    def tearDown(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM training_logs WHERE user_id IN "
                    "(SELECT id FROM users WHERE email = %s);", (self.email,))
                cur.execute(
                    "DELETE FROM awards WHERE user_id IN "
                    "(SELECT id FROM users WHERE email = %s);", (self.email,))
            conn.commit()

    def _post(self, body):
        return self.client.post(
            "/api/training", json=body,
            headers={"Authorization": f"Bearer {self.token}"},
        )

    def test_response_includes_tier_change_and_new_awards(self):
        r = self._post({
            "session_type": "bouldering", "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V5": {"s": 1, "f": 0, "p": 0}}},
        })
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertIn("tier_change", body)
        self.assertIn("new_awards", body)

    def test_first_send_v5_promotes_v0_to_v5(self):
        r = self._post({
            "session_type": "bouldering", "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V5": {"s": 1, "f": 0, "p": 0}}},
        })
        body = r.json()
        self.assertEqual(body["tier_change"], {"from": "v0", "to": "v5"})

    def test_no_tier_change_returns_none(self):
        self._post({
            "session_type": "bouldering", "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V5": {"s": 1, "f": 0, "p": 0}}},
        })
        r = self._post({
            "session_type": "bouldering", "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V5": {"s": 1, "f": 0, "p": 0}}},
        })
        self.assertIsNone(r.json()["tier_change"])

    def test_first_send_v5_returns_award_in_response(self):
        r = self._post({
            "session_type": "bouldering", "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V5": {"s": 1, "f": 0, "p": 0}}},
        })
        body = r.json()
        kinds = [a["kind"] for a in body["new_awards"]]
        self.assertIn("first_send_v5", kinds)
```

- [ ] **Step 2: Run tests, expect failure**

```bash
python -m unittest tests.test_awards.LogSessionAwardsTests -v
```
Expected: FAIL — response missing `tier_change` / `new_awards`.

- [ ] **Step 3: Extend `log_session` in `main.py`**

In `main.py` find the existing `log_session` function (the `@app.post("/api/training")` endpoint, around line 1041). Replace its body so the final part (after PR detection + log_training insert) becomes:

```python
    # PR detection — existing
    before = get_user_hardest(user["id"], window="all")
    session_hardest = compute_hardest(req.climbs)

    # NEW: snapshot working tier BEFORE insert
    from src.climb_grades import working_tier_from_hardest
    tier_before = working_tier_from_hardest(
        get_user_hardest(user["id"], window="month")
    )

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
    from src.climb_grades import grade_order
    for discipline in ("boulder", "route"):
        sh = session_hardest[discipline]
        if not sh:
            continue
        prev = before[discipline]
        if prev is None or grade_order(sh) > grade_order(prev):
            new_prs[discipline] = sh

    # NEW: tier change detection
    tier_after = working_tier_from_hardest(
        get_user_hardest(user["id"], window="month")
    )
    tier_change = None
    if tier_after != tier_before:
        tier_change = {"from": tier_before, "to": tier_after}

    # NEW: award engine
    from src.awards_catalog import detect_new_awards
    today_iso = req.date or datetime.now(timezone.utc).date().isoformat()
    new_awards = detect_new_awards(user["id"], today_iso)

    return {
        "id": log_id,
        "new_prs": new_prs,
        "tier_change": tier_change,
        "new_awards": new_awards,
    }
```

- [ ] **Step 4: Run all tests**

```bash
python -m unittest tests.test_awards tests.test_climb_log tests.test_tiers -v
```
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add main.py tests/test_awards.py
git commit -m "feat(climb-log): POST /api/training returns tier_change + new_awards"
```

---

### Task 6: `GET /api/awards` endpoint

**Files:**
- Modify: `main.py` (add new endpoint after `/api/training/pyramid`)
- Test: `tests/test_awards.py` (append)

- [ ] **Step 1: Append failing test**

Append to `tests/test_awards.py`:

```python
class AwardsEndpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.email = "awards_endpoint@coretriage.local"
        cls.token = _auth_token(cls.email)
        cls.client = TestClient(app)

    def tearDown(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM training_logs WHERE user_id IN "
                    "(SELECT id FROM users WHERE email = %s);", (self.email,))
                cur.execute(
                    "DELETE FROM awards WHERE user_id IN "
                    "(SELECT id FROM users WHERE email = %s);", (self.email,))
            conn.commit()

    def test_empty_user_no_awards(self):
        r = self.client.get(
            "/api/awards",
            headers={"Authorization": f"Bearer {self.token}"},
        )
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertEqual(body["earned"], [])
        self.assertIsInstance(body["locked"], list)

    def test_after_first_v5_earned_includes_it(self):
        self.client.post(
            "/api/training", json={
                "session_type": "bouldering", "duration_min": 60, "intensity": 7,
                "climbs": {"boulder": {"V5": {"s": 1, "f": 0, "p": 0}}},
            },
            headers={"Authorization": f"Bearer {self.token}"},
        )
        r = self.client.get(
            "/api/awards",
            headers={"Authorization": f"Bearer {self.token}"},
        )
        body = r.json()
        kinds = [a["kind"] for a in body["earned"]]
        self.assertIn("first_send_v5", kinds)
```

- [ ] **Step 2: Run test, expect 404**

```bash
python -m unittest tests.test_awards.AwardsEndpointTests -v
```

- [ ] **Step 3: Add the endpoint**

In `main.py`, locate the existing `@app.get("/api/training/pyramid")` block (after `fetch_leaderboard`, around line 1205). After that endpoint, append:

```python
@app.get("/api/awards")
@limiter.limit("60/minute")
def fetch_awards(request: Request, user: Dict = Depends(get_current_user)):
    from database import list_awards
    from src.awards_catalog import AWARD_CATALOG
    earned = list_awards(user["id"])
    earned_kinds = {a["kind"] for a in earned}
    # Locked = catalog minus earned. Caller (frontend) filters down to
    # "next milestone per category" — backend returns all for flexibility.
    locked = [
        {"kind": entry["kind"], "label": entry["label"], "category": entry["category"]}
        for entry in AWARD_CATALOG
        if entry["kind"] not in earned_kinds
    ]
    return {"earned": earned, "locked": locked}
```

- [ ] **Step 4: Run tests**

```bash
python -m unittest tests.test_awards -v
```

- [ ] **Step 5: Commit**

```bash
git add main.py tests/test_awards.py
git commit -m "feat(awards): GET /api/awards endpoint"
```

---

## Phase 2 — Frontend foundations

### Task 7: `frontend/src/lib/tier.js` — palette tokens + helpers

**Files:**
- Create: `frontend/src/lib/tier.js`

- [ ] **Step 1: Create the file**

```jsx
/**
 * Tier system constants + helpers. Mirrors src/climb_grades.py's
 * tier mapping, but with hex tokens for theming.
 *
 * Each tier exposes three colors: light (highlights), c (main), deep
 * (gradient endpoint + halo). Glow uses c at ~22% alpha.
 */

export const V_TIERS = ['v0','v1','v2','v3','v4','v5','v6','v7','v8','v9','v10']

export const TIER_NAMES = {
  v0:  'Ivory',
  v1:  'Honey',
  v2:  'Apricot',
  v3:  'Acid Lime',
  v4:  'Jade',
  v5:  'Teal',
  v6:  'Electric Sky',
  v7:  'Cobalt',
  v8:  'Iris',
  v9:  'Magenta',
  v10: 'Coral',
}

export const TIER_TOKENS = {
  v0:  { light: '#f5f4ec', c: '#e8e6dc', deep: '#6b685a' },
  v1:  { light: '#fbd470', c: '#f7b03a', deep: '#7c5a14' },
  v2:  { light: '#ffa97a', c: '#ff7a3d', deep: '#802811' },
  v3:  { light: '#d9f06a', c: '#c5e637', deep: '#5a6810' },
  v4:  { light: '#6bf0c9', c: '#2dd4a5', deep: '#105e48' },
  v5:  { light: '#5eead4', c: '#14b8a6', deep: '#0a4f48' },
  v6:  { light: '#7cc3ff', c: '#3aa1ff', deep: '#0d3d70' },
  v7:  { light: '#9598fa', c: '#5b5ff2', deep: '#1d1f7a' },
  v8:  { light: '#ad95ff', c: '#8466ff', deep: '#3a2580' },
  v9:  { light: '#ea7df5', c: '#d946ef', deep: '#6c1a7f' },
  v10: { light: '#fda4af', c: '#fb7185', deep: '#7f1d2c' },
}

/** Map a V-grade string ('V0'..'V17') to a tier id. V10+ collapses to 'v10'. */
export function vGradeToTier(grade) {
  const m = /^V(\d{1,2})$/.exec(grade || '')
  if (!m) return null
  const n = Math.min(Number(m[1]), 10)
  return `v${n}`
}

/** YDS → tier map per the design chart. */
const YDS_TO_TIER = {
  '5.6':'v0','5.7':'v0','5.8':'v0','5.9':'v0',
  '5.10a':'v0','5.10b':'v0','5.10c':'v0','5.10d':'v0',
  '5.11a':'v1',
  '5.11b':'v2','5.11c':'v2',
  '5.11d':'v3',
  '5.12a':'v4','5.12b':'v4',
  '5.12c':'v5','5.12d':'v5',
  '5.13a':'v6',
  '5.13b':'v7',
  '5.13c':'v8',
  '5.13d':'v9',
  '5.14a':'v10','5.14b':'v10','5.14c':'v10','5.14d':'v10',
  '5.15a':'v10','5.15b':'v10','5.15c':'v10','5.15d':'v10',
}

export function ydsToTier(grade) {
  return YDS_TO_TIER[grade] || null
}

/** Pick the higher of two tier ids; null-safe. */
export function maxTier(a, b) {
  if (!a) return b || 'v0'
  if (!b) return a
  return V_TIERS.indexOf(a) >= V_TIERS.indexOf(b) ? a : b
}

/** Given a hardest-grade dict { boulder, route }, return the working tier id. */
export function workingTierFromHardest(hardest) {
  const a = hardest?.boulder ? vGradeToTier(hardest.boulder) : null
  const b = hardest?.route   ? ydsToTier(hardest.route)      : null
  return maxTier(a, b) || 'v0'
}

/** Return the next-higher tier id, or null if already at v10. */
export function nextTier(tierId) {
  const idx = V_TIERS.indexOf(tierId)
  if (idx < 0 || idx >= V_TIERS.length - 1) return null
  return V_TIERS[idx + 1]
}
```

- [ ] **Step 2: Smoke test in dev server console**

After save, in the dev server JS console:

```js
import('/src/lib/tier.js').then(m => {
  console.log(m.workingTierFromHardest({boulder:'V7', route:'5.11a'}))  // 'v7'
  console.log(m.TIER_NAMES.v7)  // 'Cobalt'
  console.log(m.nextTier('v7')) // 'v8'
})
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/tier.js
git commit -m "feat(tier): frontend tier palette tokens + mapping helpers"
```

---

### Task 8: `<TierThemeRoot>` + `useTierTheme` hook

**Files:**
- Create: `frontend/src/hooks/useTierTheme.js`
- Create: `frontend/src/components/TierThemeRoot.jsx`

- [ ] **Step 1: Create the hook**

`frontend/src/hooks/useTierTheme.js`:

```jsx
import { useMemo } from 'react'
import { TIER_NAMES, TIER_TOKENS, V_TIERS, workingTierFromHardest } from '../lib/tier'

/**
 * Resolves the user's working tier + its color tokens.
 *
 * @param hardest  { boulder: string|null, route: string|null }
 *                 from useHubData / direct API. If undefined, defaults to v0.
 * @returns { tierId, tierName, tokens: { c, light, deep, glow } }
 */
export function useTierTheme(hardest) {
  return useMemo(() => {
    const tierId = workingTierFromHardest(hardest || {})
    const t = TIER_TOKENS[tierId]
    return {
      tierId,
      tierName: TIER_NAMES[tierId],
      tokens: {
        c: t.c,
        light: t.light,
        deep: t.deep,
        glow: `${t.c}38`,  // ~22% alpha (38 hex = 0x38 = 56/255 ≈ 22%)
      },
    }
  }, [hardest?.boulder, hardest?.route])
}
```

- [ ] **Step 2: Create the component**

`frontend/src/components/TierThemeRoot.jsx`:

```jsx
import { useEffect, useMemo } from 'react'
import { useTierTheme } from '../hooks/useTierTheme'

/**
 * Wraps a subtree and exposes the user's working-tier color tokens as
 * CSS custom properties.
 *
 *   <TierThemeRoot hardest={data.hardestSends}>
 *     <HubTab ... />
 *   </TierThemeRoot>
 *
 * Children read --tier-c / --tier-light / --tier-deep / --tier-glow.
 *
 * If `global` is true, sets the same vars on document.documentElement
 * so the nav active indicator (which lives outside the subtree) can
 * read them too.
 */
export default function TierThemeRoot({ hardest, global = false, children }) {
  const { tokens } = useTierTheme(hardest)

  const style = useMemo(() => ({
    '--tier-c':     tokens.c,
    '--tier-light': tokens.light,
    '--tier-deep':  tokens.deep,
    '--tier-glow':  tokens.glow,
  }), [tokens.c, tokens.light, tokens.deep, tokens.glow])

  useEffect(() => {
    if (!global) return
    const root = document.documentElement
    root.style.setProperty('--tier-c',     tokens.c)
    root.style.setProperty('--tier-light', tokens.light)
    root.style.setProperty('--tier-deep',  tokens.deep)
    root.style.setProperty('--tier-glow',  tokens.glow)
  }, [global, tokens.c, tokens.light, tokens.deep, tokens.glow])

  return <div style={style}>{children}</div>
}
```

- [ ] **Step 3: Verify build**

```bash
cd frontend && npx vite build 2>&1 | tail -5 && cd ..
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/hooks/useTierTheme.js frontend/src/components/TierThemeRoot.jsx
git commit -m "feat(tier): TierThemeRoot + useTierTheme hook"
```

---

### Task 9: `useHubData` exposes `hardestSends` (already does) + working tier hook usage

**Files:**
- Modify: `frontend/src/hooks/useHubData.js` (already exposes hardestSends from earlier climb-log feature; just verify shape)

- [ ] **Step 1: Verify current state**

```bash
grep -n "hardestSends" frontend/src/hooks/useHubData.js
```

Expected: already exposed (set in the existing climb-log feature, lines vary).

- [ ] **Step 2: No code change required**

`useHubData` already returns `hardestSends: { boulder, route }`. The new `useTierTheme(hardestSends)` hook from Task 8 reads it directly. Confirm and move on.

- [ ] **Step 3: Commit if any verification changes needed (otherwise skip)**

If verification showed `hardestSends` was named differently or missing, fix and commit:

```bash
git add frontend/src/hooks/useHubData.js
git commit -m "fix(hub-data): align hardestSends shape for tier theming"
```

Otherwise skip this commit.

---

### Task 10: `frontend/src/lib/hubGreeting.js` — variant selector

**Files:**
- Create: `frontend/src/lib/hubGreeting.js`

- [ ] **Step 1: Create the file**

```jsx
/**
 * Pure function: choose a greeting variant based on the user's recent
 * activity. Inputs are derived from useHubData + a couple of cheap
 * date checks. Returns a single line of text (the value of the 28pt
 * title in HubGreeting).
 */

function isSameWeekStart(iso, refDateMs) {
  // ISO weeks start Monday. Check whether the given YYYY-MM-DD is in the
  // same calendar week as the reference date.
  if (!iso) return false
  const d = new Date(iso + 'T00:00:00')
  const ref = new Date(refDateMs)
  ref.setHours(0, 0, 0, 0)
  // Snap both back to their week's Monday
  const snap = (date) => {
    const dow = (date.getDay() + 6) % 7  // 0=Mon..6=Sun
    const m = new Date(date)
    m.setDate(date.getDate() - dow)
    m.setHours(0,0,0,0)
    return m.getTime()
  }
  return snap(d) === snap(ref)
}

/**
 * @param state {
 *   streakDays:        number,
 *   lastLogIso:        string|null,    // YYYY-MM-DD of most recent log
 *   lastPrIso:         string|null,    // YYYY-MM-DD of most recent PR
 *   todayIso:          string,         // YYYY-MM-DD of today
 *   isFirstLogOfWeek:  boolean,        // last log was in a prior week
 *   isPlanRestDay:     boolean,
 * }
 * @returns string
 */
export function greetingFor(state) {
  const today = new Date(state.todayIso + 'T00:00:00').getTime()
  const yesterday = today - 86400000

  // Helper: was X yesterday?
  const wasYesterday = (iso) => {
    if (!iso) return false
    return new Date(iso + 'T00:00:00').getTime() === yesterday
  }
  const isToday = (iso) => iso === state.todayIso

  if (state.isFirstLogOfWeek) return 'New week, fresh starts.'
  if (wasYesterday(state.lastLogIso) && wasYesterday(state.lastPrIso)) {
    return 'Yesterday was a breakthrough.'
  }
  if (isToday(state.lastLogIso)) return 'Logged. Let it sink in.'
  if (state.streakDays >= 10)    return `${state.streakDays} days in. You're showing up.`
  if (state.streakDays >= 3)     return `Day ${state.streakDays} of a strong week.`
  if (state.isPlanRestDay)       return 'Recovery is training too.'
  if (state.lastLogIso) {
    const last = new Date(state.lastLogIso + 'T00:00:00').getTime()
    const daysAgo = Math.round((today - last) / 86400000)
    if (daysAgo >= 7) return 'Ready when you are.'
  }
  return 'Welcome back.'
}
```

- [ ] **Step 2: Smoke test**

In the dev server JS console:

```js
import('/src/lib/hubGreeting.js').then(m => {
  console.log(m.greetingFor({ streakDays: 12, lastLogIso: '2026-05-16', todayIso: '2026-05-17', isFirstLogOfWeek: false }))
  // "12 days in. You're showing up."
})
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/hubGreeting.js
git commit -m "feat(hub): context-aware greeting variant selector"
```

---

### Task 11: `frontend/src/lib/awardCatalog.js` + `getAwards` in api.js + `useAwards` hook

**Files:**
- Create: `frontend/src/lib/awardCatalog.js`
- Create: `frontend/src/hooks/useAwards.js`
- Modify: `frontend/src/api.js` (append `getAwards`)

- [ ] **Step 1: Create the catalog metadata**

`frontend/src/lib/awardCatalog.js`:

```jsx
import { Mountain, Flame, Check, Zap, Target, Lock } from 'lucide-react'

/**
 * Frontend mirror of src/awards_catalog.py — adds the visual metadata
 * (icon component, gradient tokens, display label) that the backend
 * doesn't care about.
 *
 * Keyed by `kind` so backend rows can be enriched at render time.
 */

const HONEY = { light: '#fbd470', c: '#f7b03a', deep: '#7c5a14' }
const CORAL = { light: '#fda4af', c: '#fb7185', deep: '#7f1d2c' }
const SKY   = { light: '#7cc3ff', c: '#3aa1ff', deep: '#0d3d70' }

import { TIER_TOKENS } from './tier'

function gradeMedal(grade) {
  const t = TIER_TOKENS[grade.toLowerCase()] || TIER_TOKENS.v0
  return { light: t.light, c: t.c, deep: t.deep, icon: Mountain, label: grade.toUpperCase() }
}

export const AWARD_META = {
  // Grade milestones
  first_send_v3:  { name: 'First V3', sub: 'Acid Lime', ...gradeMedal('v3') },
  first_send_v4:  { name: 'First V4', sub: 'Jade', ...gradeMedal('v4') },
  first_send_v5:  { name: 'First V5', sub: 'Teal', ...gradeMedal('v5') },
  first_send_v6:  { name: 'First V6', sub: 'Electric Sky', ...gradeMedal('v6') },
  first_send_v7:  { name: 'First V7', sub: 'Cobalt', ...gradeMedal('v7') },
  first_send_v8:  { name: 'First V8', sub: 'Iris', ...gradeMedal('v8') },
  first_send_v9:  { name: 'First V9', sub: 'Magenta', ...gradeMedal('v9') },
  first_send_v10: { name: 'First V10+', sub: 'Coral', ...gradeMedal('v10') },
  // Streak milestones
  streak_3d:   { name: '3-day streak',   sub: 'Consistency starts', ...HONEY, icon: Flame, label: '3d' },
  streak_10d:  { name: '10-day streak',  sub: "You're showing up",  ...HONEY, icon: Flame, label: '10d' },
  streak_30d:  { name: '30-day streak',  sub: 'A month in',         ...HONEY, icon: Flame, label: '30d' },
  streak_100d: { name: '100-day streak', sub: 'Pillar',             ...HONEY, icon: Flame, label: '100d' },
  // Volume milestones
  volume_10:  { name: '10 sends',  sub: 'Warming up',          ...CORAL, icon: Check, label: '×10'  },
  volume_30:  { name: '30 sends',  sub: 'Banked',              ...CORAL, icon: Check, label: '×30'  },
  volume_50:  { name: '50 sends',  sub: 'Half a hundred',      ...CORAL, icon: Check, label: '×50'  },
  volume_100: { name: '100 sends', sub: 'Century',             ...CORAL, icon: Check, label: '×100' },
  volume_500: { name: '500 sends', sub: 'Volume specialist',   ...CORAL, icon: Check, label: '×500' },
  // Style milestones
  first_flash: { name: 'First flash', sub: 'First-go send', ...SKY, icon: Zap, label: null },
}

export const LOCKED_META = { icon: Lock }
```

- [ ] **Step 2: Add the API helper**

In `frontend/src/api.js`, after the existing `getPyramid` helper, append:

```jsx
export const getAwards = () => request('GET', '/api/awards')
```

- [ ] **Step 3: Create the hook**

`frontend/src/hooks/useAwards.js`:

```jsx
import { useEffect, useState, useCallback } from 'react'
import { getAwards } from '../api'

/**
 * Fetch + cache the user's awards. Returns:
 *   { loading, earned: [...], locked: [...], refresh }
 *
 * Earned entries are backend rows: { id, kind, payload, earned_at }.
 * Locked entries are backend stubs: { kind, label, category }.
 * Consumers enrich with frontend AWARD_META at render time.
 */
export function useAwards(user) {
  const [data, setData] = useState({ loading: true, earned: [], locked: [] })

  const refresh = useCallback(() => {
    if (!user) {
      setData({ loading: false, earned: [], locked: [] })
      return
    }
    setData((d) => ({ ...d, loading: true }))
    getAwards()
      .then(({ earned, locked }) => setData({ loading: false, earned, locked }))
      .catch(() => setData({ loading: false, earned: [], locked: [] }))
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  return { ...data, refresh }
}
```

- [ ] **Step 4: Verify build**

```bash
cd frontend && npx vite build 2>&1 | tail -5 && cd ..
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/awardCatalog.js frontend/src/hooks/useAwards.js frontend/src/api.js
git commit -m "feat(awards): frontend catalog metadata + useAwards hook + api"
```

---

## Phase 3 — Hub redesign

### Task 12: Rebuild `HubGreeting` — variants + tier pill + avatar

**Files:**
- Modify: `frontend/src/components/HubGreeting.jsx` (replace existing)

- [ ] **Step 1: Replace the file entirely**

```jsx
import { useMemo } from 'react'
import { greetingFor } from '../lib/hubGreeting'
import { TIER_NAMES } from '../lib/tier'

const DOW_LONG = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function avatarInitial(displayName, email) {
  const s = (displayName || email || 'C').trim()
  return s.charAt(0).toUpperCase()
}

export default function HubGreeting({ user, data, tierId }) {
  const today  = todayIso()
  const now    = new Date()
  const dowMon = `${DOW_LONG[now.getDay()]} · ${MONTH_SHORT[now.getMonth()]} ${now.getDate()}`

  // Derive greeting input from data
  const greeting = useMemo(() => {
    const lastLog = data?.recentLogs?.[0]?.date ?? null
    const lastPr  = null  // PRs aren't surfaced on data yet; pass null for now
    return greetingFor({
      streakDays:        data?.streakDays ?? 0,
      lastLogIso:        lastLog,
      lastPrIso:         lastPr,
      todayIso:          today,
      isFirstLogOfWeek:  Boolean(data?.isFirstLogOfWeek),
      isPlanRestDay:     Boolean(data?.isPlanRestDay),
    })
  }, [data?.recentLogs, data?.streakDays, data?.isFirstLogOfWeek, data?.isPlanRestDay, today])

  const tierName = tierId ? TIER_NAMES[tierId] : null

  return (
    <div className="px-1 pt-1 pb-4 flex items-start justify-between">
      <div className="min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{dowMon}</div>
        <h1
          className="text-2xl sm:text-[28px] font-bold text-text -tracking-[0.025em] mt-1"
          style={{ textShadow: '0 0 14px var(--tier-glow)' }}
        >
          {greeting}
        </h1>
        {tierId && (
          <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-[11px] font-semibold text-text"
               style={{
                 background: 'color-mix(in srgb, var(--tier-c) 18%, transparent)',
                 border: '0.5px solid color-mix(in srgb, var(--tier-c) 45%, transparent)',
               }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--tier-c)', boxShadow: '0 0 6px var(--tier-c)' }} />
            {tierId === 'v10' ? 'V10+' : tierId.toUpperCase()} · {tierName} · working
          </div>
        )}
      </div>
      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-bg shrink-0"
           style={{ background: 'linear-gradient(135deg, var(--tier-light), var(--tier-deep))', boxShadow: '0 0 12px var(--tier-glow)' }}>
        {avatarInitial(user?.display_name, user?.email)}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd frontend && npx vite build 2>&1 | tail -5 && cd ..
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/HubGreeting.jsx
git commit -m "feat(hub): HubGreeting variants + tier pill + avatar"
```

---

### Task 13: `HubRingsCard` — rings + streak chip

**Files:**
- Create: `frontend/src/components/HubRingsCard.jsx`

- [ ] **Step 1: Create the component**

```jsx
import { Flame } from 'lucide-react'

/**
 * Today's three rings + streak chip header.
 *
 * Props:
 *   sends:        { done, goal }    — count of sends logged this week vs goal
 *   climbDays:    { done, goal }    — distinct logged days this week vs goal
 *   pushAttempts: { done, goal }    — push-grade attempts this week vs goal
 *   streakDays:   number
 */
export default function HubRingsCard({ sends, climbDays, pushAttempts, streakDays }) {
  const sendsArc = arcDash(sends)
  const daysArc  = arcDash(climbDays)
  const pushArc  = arcDash(pushAttempts)

  return (
    <div className="relative rounded-2xl overflow-hidden p-4"
         style={{
           background: 'rgba(0,0,0,0.35)',
           border: '0.5px solid rgba(255,255,255,0.1)',
           backdropFilter: 'blur(8px)',
         }}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] font-bold uppercase tracking-[0.08em]"
             style={{ color: 'var(--tier-light)' }}>
          Today
        </div>
        {streakDays > 0 && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: 'rgba(251,191,36,0.16)',
                  color: '#fcd34d',
                  border: '0.5px solid rgba(251,191,36,0.35)',
                }}>
            <Flame size={12} />
            {streakDays} day streak
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <svg width="116" height="116" viewBox="0 0 116 116" className="shrink-0">
          {/* Sends (outer, tier color) */}
          <circle cx="58" cy="58" r="52" fill="none"
                  stroke="color-mix(in srgb, var(--tier-c) 15%, transparent)" strokeWidth="9"/>
          <circle cx="58" cy="58" r="52" fill="none"
                  stroke="var(--tier-c)" strokeWidth="9"
                  strokeDasharray={sendsArc} strokeLinecap="round"
                  transform="rotate(-90 58 58)"/>
          {/* Climb days (middle, coral) */}
          <circle cx="58" cy="58" r="38" fill="none"
                  stroke="rgba(251,113,133,0.15)" strokeWidth="9"/>
          <circle cx="58" cy="58" r="38" fill="none"
                  stroke="#fb7185" strokeWidth="9"
                  strokeDasharray={daysArc} strokeLinecap="round"
                  transform="rotate(-90 58 58)"/>
          {/* Push grade (inner, gold) */}
          <circle cx="58" cy="58" r="24" fill="none"
                  stroke="rgba(251,191,36,0.15)" strokeWidth="9"/>
          <circle cx="58" cy="58" r="24" fill="none"
                  stroke="#fbbf24" strokeWidth="9"
                  strokeDasharray={pushArc} strokeLinecap="round"
                  transform="rotate(-90 58 58)"/>
        </svg>

        <div className="flex-1 flex flex-col gap-2">
          <RingLine label="Sends"      value={sends} />
          <RingLine label="Climb days" value={climbDays} />
          <RingLine label="Push grade" value={pushAttempts} />
        </div>
      </div>
    </div>
  )
}

function RingLine({ label, value }) {
  return (
    <div className="flex items-baseline gap-2 pb-2 border-b border-white/5 last:border-0 last:pb-0">
      <span className="flex-1 text-[11px] uppercase tracking-[0.05em] font-semibold text-muted">
        {label}
      </span>
      <span className="text-[17px] font-bold text-text tabular-nums -tracking-[0.02em]">
        {value.done}
        <span className="text-muted/60 font-medium">/{value.goal}</span>
      </span>
    </div>
  )
}

/** Build an SVG strokeDasharray for `done/goal` on a circle of given circumference. */
function arcDash(value) {
  const circumference = 2 * Math.PI * 52   // outer ring; close enough for all three at this scale
  const frac = Math.min(1, value.done / Math.max(1, value.goal))
  const filled = frac * circumference
  return `${filled} ${circumference - filled}`
}
```

- [ ] **Step 2: Verify build**

```bash
cd frontend && npx vite build 2>&1 | tail -5 && cd ..
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/HubRingsCard.jsx
git commit -m "feat(hub): HubRingsCard with tier-themed rings + streak chip"
```

---

### Task 14: `HubProjectCard` — current project with try-by-try dots

**Files:**
- Create: `frontend/src/components/HubProjectCard.jsx`

- [ ] **Step 1: Create the component**

```jsx
import { ChevronRight } from 'lucide-react'

/**
 * Current-project card. Coral-themed, fixed (does NOT re-tier).
 *
 * Props:
 *   project: {
 *     name:           string,     // 'The Sentinel'
 *     grade:          string,     // 'V8'
 *     failedTries:    number,     // historical tap-outs
 *     hasCurrentTry:  boolean,    // whether to show the current dot
 *     futureTryCount: number,     // optional visual budget for upcoming tries
 *   } | null
 *   onContinue:  () => void
 *
 * If project === null, the card renders nothing (caller hides the section).
 */
export default function HubProjectCard({ project, onContinue }) {
  if (!project) return null

  const dots = []
  for (let i = 0; i < project.failedTries; i++) {
    dots.push('failed')
  }
  if (project.hasCurrentTry) dots.push('current')
  for (let i = 0; i < (project.futureTryCount || 0); i++) {
    dots.push('future')
  }

  return (
    <div className="rounded-2xl p-4"
         style={{
           background: 'linear-gradient(135deg, rgba(251,113,133,0.16), rgba(251,113,133,0.04))',
           border: '0.5px solid rgba(251,113,133,0.32)',
           boxShadow: 'inset 0 0 24px rgba(251,113,133,0.06)',
         }}>
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-accent2">
        Current project
      </div>
      <div className="text-base font-bold text-text -tracking-[0.02em] mt-1 mb-2.5">
        {project.name} · {project.grade}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {dots.map((kind, i) => (
            <span key={i} className="w-2.5 h-2.5 rounded-full border-[1.5px]"
                  style={{
                    background:
                      kind === 'failed' ? 'rgba(251,113,133,0.35)' :
                      kind === 'current' ? 'rgba(251,191,36,0.45)' :
                      'transparent',
                    borderColor:
                      kind === 'failed' ? '#fb7185' :
                      kind === 'current' ? '#fbbf24' :
                      'rgba(255,255,255,0.18)',
                    boxShadow: kind === 'current' ? '0 0 6px rgba(251,191,36,0.5)' : 'none',
                  }} />
          ))}
        </div>
        <button onClick={onContinue}
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-accent2/90 hover:text-accent2">
          Try {project.failedTries + 1}
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build check + commit**

```bash
cd frontend && npx vite build 2>&1 | tail -5 && cd ..
git add frontend/src/components/HubProjectCard.jsx
git commit -m "feat(hub): HubProjectCard with try-by-try dots"
```

---

### Task 15: `HubWeekStrip` — Mon–Sun calendar

**Files:**
- Create: `frontend/src/components/HubWeekStrip.jsx`

- [ ] **Step 1: Create the component**

```jsx
const DOW = ['M','T','W','T','F','S','S']

/**
 * Mon–Sun horizontal week strip with logged-day dots and today highlight.
 *
 * Props:
 *   loggedDates: Set<string>   — set of YYYY-MM-DD logged this week
 *   todayIso:    string        — YYYY-MM-DD of today, must be within the week
 */
export default function HubWeekStrip({ loggedDates, todayIso }) {
  const week = buildWeek(todayIso)

  return (
    <div className="rounded-2xl p-4"
         style={{
           background: 'rgba(0,0,0,0.35)',
           border: '0.5px solid rgba(255,255,255,0.1)',
           backdropFilter: 'blur(8px)',
         }}>
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted mb-3">
        This week
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {week.map(({ iso, dom, dowIdx }) => {
          const isToday = iso === todayIso
          const isLogged = loggedDates.has(iso)
          return (
            <div key={iso}
                 className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl"
                 style={isToday ? {
                   background: 'linear-gradient(180deg, color-mix(in srgb, var(--tier-c) 30%, transparent), color-mix(in srgb, var(--tier-c) 8%, transparent))',
                   border: '0.5px solid color-mix(in srgb, var(--tier-c) 50%, transparent)',
                 } : undefined}>
              <span className="text-[10px] font-semibold uppercase tracking-[0.05em]"
                    style={{ color: isToday ? 'var(--tier-light)' : 'rgba(255,255,255,0.4)' }}>
                {DOW[dowIdx]}
              </span>
              <span className="text-[15px] font-semibold text-text tabular-nums -tracking-[0.02em]">
                {dom}
              </span>
              <span className="w-[5px] h-[5px] rounded-full"
                    style={{
                      background: isLogged ? 'var(--tier-c)' : 'rgba(255,255,255,0.12)',
                      boxShadow:  isLogged ? '0 0 5px var(--tier-c)' : 'none',
                    }} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function buildWeek(todayIso) {
  const today = new Date(todayIso + 'T00:00:00')
  // Snap to Monday
  const dow = (today.getDay() + 6) % 7
  const monday = new Date(today)
  monday.setDate(today.getDate() - dow)
  const out = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    out.push({
      iso: d.toISOString().slice(0,10),
      dom: d.getDate(),
      dowIdx: i,
    })
  }
  return out
}
```

- [ ] **Step 2: Build + commit**

```bash
cd frontend && npx vite build 2>&1 | tail -5 && cd ..
git add frontend/src/components/HubWeekStrip.jsx
git commit -m "feat(hub): HubWeekStrip Mon-Sun calendar with today highlight"
```

---

### Task 16: `HubFeedCard` — recent climbs with per-grade chips

**Files:**
- Create: `frontend/src/components/HubFeedCard.jsx`

- [ ] **Step 1: Create the component**

```jsx
import { ChevronRight } from 'lucide-react'
import { vGradeToTier, ydsToTier, TIER_TOKENS } from '../lib/tier'

/**
 * Recent climbs feed. Each row's grade chip is colored by THAT grade's
 * tier (not the user's working tier).
 *
 * Props:
 *   items: [{
 *     id:        number,
 *     grade:     string,        // 'V5' or '5.11a'
 *     discipline:'boulder' | 'route',
 *     kind:      'send' | 'flash' | 'project',
 *     count:     number,        // for "V5 × 2"
 *     dateLabel: string,        // 'Wed · Session 3 of this week'
 *   }]
 */
export default function HubFeedCard({ items }) {
  if (!items.length) {
    return (
      <div className="rounded-2xl p-4 text-center text-sm text-muted/80"
           style={{ background: 'rgba(0,0,0,0.35)', border: '0.5px solid rgba(255,255,255,0.1)' }}>
        No climbs logged yet. Log a session in Train to start your feed.
      </div>
    )
  }

  return (
    <div className="rounded-2xl overflow-hidden"
         style={{ background: 'rgba(0,0,0,0.35)', border: '0.5px solid rgba(255,255,255,0.1)' }}>
      <div className="px-4 pt-4 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
        Recent climbs
      </div>
      <div>
        {items.map((it, idx) => <FeedRow key={it.id} item={it} first={idx === 0} />)}
      </div>
    </div>
  )
}

function FeedRow({ item, first }) {
  const tierId = item.discipline === 'boulder' ? vGradeToTier(item.grade) : ydsToTier(item.grade)
  const tk = TIER_TOKENS[tierId] || TIER_TOKENS.v0
  const isFlash = item.kind === 'flash'
  const title = (
    item.kind === 'project' ? `${item.grade} project tries` :
    item.count > 1         ? `${item.grade} × ${item.count} sends` :
    `${item.grade} send`
  )

  return (
    <div className={`flex items-center gap-3 px-4 py-3.5 ${first ? '' : 'border-t border-white/5'}`}>
      <div className="w-9 h-9 rounded-[11px] flex items-center justify-center text-[12px] font-extrabold tabular-nums shrink-0 text-white"
           style={{
             background: `linear-gradient(135deg, ${tk.light}, ${tk.c}, ${tk.deep})`,
             boxShadow:  `0 0 12px ${tk.c}55`,
           }}>
        {item.grade}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold text-text -tracking-[0.01em] flex items-baseline gap-1.5">
          {title}
          {isFlash && (
            <span className="text-[9px] font-extrabold uppercase tracking-[0.08em] px-1.5 py-[1px] rounded text-white"
                  style={{ background: 'var(--tier-c)', boxShadow: '0 0 8px var(--tier-glow)' }}>
              Flash
            </span>
          )}
        </div>
        <div className="text-[11px] text-muted/70 mt-0.5">{item.dateLabel}</div>
      </div>
      <ChevronRight size={14} className="text-muted/40 shrink-0" />
    </div>
  )
}
```

- [ ] **Step 2: Build + commit**

```bash
cd frontend && npx vite build 2>&1 | tail -5 && cd ..
git add frontend/src/components/HubFeedCard.jsx
git commit -m "feat(hub): HubFeedCard with per-grade colored chips"
```

---

### Task 17: Rebuild `HubTab.jsx` — compose new components, drop tool cards + HubProgressCard

**Files:**
- Modify: `frontend/src/components/HubTab.jsx` (replace entirely)
- Delete: `frontend/src/components/HubProgressCard.jsx`
- Modify: `frontend/src/hooks/useHubData.js` (add fields: streakDays, isFirstLogOfWeek, isPlanRestDay, weekLoggedDates, currentProject, feedItems, ringSends, ringClimbDays, ringPushAttempts)

The new HubTab consumes a richer `data` object. We extend `useHubData` to compute everything client-side from the existing fetches (sessions, training logs, plan).

- [ ] **Step 1: Extend `useHubData.js`**

Replace `useHubData.js` with:

```jsx
import { useEffect, useState } from 'react'
import {
  getSessions, getActivePlan, getTrainingStats, getTrainingLogs,
  getLeaderboard, getPyramid,
} from '../api'

const todayIsoDate = () => new Date().toISOString().slice(0, 10)

function planSessionForToday(activePlan) {
  if (!activePlan?.plan_data?.sessions?.length || !activePlan.start_date) return null
  const start = new Date(activePlan.start_date + 'T00:00:00')
  const dpw = activePlan.plan_data.days_per_week || 3
  const today = new Date(); today.setHours(0,0,0,0)
  const dayOffset = Math.floor((today - start) / 86400000)
  for (const s of activePlan.plan_data.sessions) {
    const off = (s.week - 1) * 7 + Math.round((s.day_in_week - 1) * (7 / dpw))
    if (off === dayOffset) return s
  }
  return null
}

function weekStartIso(iso) {
  const d = new Date(iso + 'T00:00:00')
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow)
  return d.toISOString().slice(0,10)
}

function buildFeedItems(logs) {
  const items = []
  for (const log of logs.slice(0, 8)) {
    const climbs = log.climbs || {}
    for (const discipline of ['boulder', 'route']) {
      const grades = climbs[discipline] || {}
      for (const [grade, c] of Object.entries(grades)) {
        if (c.s > 0 || c.f > 0) {
          items.push({
            id: `${log.id}-${discipline}-${grade}`,
            grade,
            discipline,
            kind: c.f > 0 ? 'flash' : 'send',
            count: c.s,
            dateLabel: log.date,
          })
        } else if (c.p > 0) {
          items.push({
            id: `${log.id}-${discipline}-${grade}-proj`,
            grade,
            discipline,
            kind: 'project',
            count: c.p,
            dateLabel: log.date,
          })
        }
      }
    }
  }
  return items.slice(0, 8)
}

function computeStreakDays(logs, todayIso) {
  const dates = new Set(logs.map(l => l.date))
  let streak = 0
  let cursor = new Date(todayIso + 'T00:00:00')
  while (dates.has(cursor.toISOString().slice(0,10))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

function computeRings(logs, todayIso, workingTierId) {
  const ws = weekStartIso(todayIso)
  const inWeek = logs.filter(l => l.date >= ws && l.date <= todayIso)
  let sends = 0
  for (const log of inWeek) {
    for (const discipline of ['boulder','route']) {
      for (const c of Object.values((log.climbs || {})[discipline] || {})) {
        sends += (c.s || 0) + (c.f || 0)
      }
    }
  }
  const climbDays = new Set(inWeek.map(l => l.date)).size
  // Push attempts: any log with p>0 at a grade above the working tier
  let pushAttempts = 0
  for (const log of inWeek) {
    for (const [grade, c] of Object.entries((log.climbs || {}).boulder || {})) {
      if (c.p > 0) {
        const m = /^V(\d+)$/.exec(grade)
        if (m && Number(m[1]) > tierOrdinal(workingTierId)) pushAttempts += c.p
      }
    }
  }
  return {
    ringSends:        { done: sends,        goal: 10 },
    ringClimbDays:    { done: climbDays,    goal: 4 },
    ringPushAttempts: { done: pushAttempts, goal: 3 },
  }
}

function tierOrdinal(id) {
  return parseInt(String(id || 'v0').slice(1), 10)
}

function pickCurrentProject(logs, workingTierId) {
  // Heuristic: hardest project (any climb with p>0) above the working tier
  // within the last 14 days. Returns null if none.
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 14)
  const cutoffIso = cutoff.toISOString().slice(0,10)
  const tries = []
  for (const log of logs) {
    if (log.date < cutoffIso) continue
    for (const [grade, c] of Object.entries((log.climbs || {}).boulder || {})) {
      if (c.p > 0) tries.push({ grade, log })
    }
  }
  if (!tries.length) return null
  // Pick highest grade
  tries.sort((a,b) => tierOrdinal(`v${parseInt(a.grade.slice(1),10)}`) - tierOrdinal(`v${parseInt(b.grade.slice(1),10)}`))
  const top = tries[tries.length - 1]
  const failedTries = logs.reduce((sum, l) => {
    const c = (l.climbs || {}).boulder?.[top.grade]
    return sum + (c?.p || 0)
  }, 0)
  return {
    name: 'Current project',  // No project-name UI in v1; placeholder until project spec ships
    grade: top.grade,
    failedTries,
    hasCurrentTry: true,
    futureTryCount: 0,
  }
}

export function useHubData(user) {
  const [data, setData] = useState({
    loading: true,
    lastTriage: null, activePlan: null, todaySession: null, todayLogged: false,
    stats: null, rank: null,
    hardestSends: { boulder: null, route: null },
    pyramidPreview: [],
    // NEW fields:
    streakDays: 0,
    weekLoggedDates: new Set(),
    isFirstLogOfWeek: false,
    isPlanRestDay: false,
    feedItems: [],
    currentProject: null,
    recentLogs: [],
    ringSends:        { done: 0, goal: 10 },
    ringClimbDays:    { done: 0, goal: 4  },
    ringPushAttempts: { done: 0, goal: 3  },
  })

  useEffect(() => {
    if (!user) { setData(d => ({ ...d, loading: false })); return }
    let cancelled = false

    Promise.allSettled([
      getSessions(1),
      getActivePlan(),
      getTrainingStats(),
      getTrainingLogs(30),   // bigger window for streak + project detection
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
      const todayLogged = logs.some(l => l.date === today)
      const todaySession = planSessionForToday(activePlan)
      const hardestSends = {
        boulder: pyramid?.boulder?.hardest_send || null,
        route:   pyramid?.route?.hardest_send   || null,
      }
      const workingTierId = (() => {
        // local import would create a cycle in some builders; inline a tiny version
        if (hardestSends.boulder) {
          const n = parseInt(/V(\d+)/.exec(hardestSends.boulder)?.[1] || '0', 10)
          return `v${Math.min(n, 10)}`
        }
        return 'v0'
      })()
      const streakDays = computeStreakDays(logs, today)
      const ws = weekStartIso(today)
      const weekLoggedDates = new Set(logs.filter(l => l.date >= ws && l.date <= today).map(l => l.date))
      const lastLog = logs[0]?.date
      const isFirstLogOfWeek = !lastLog || lastLog < ws
      const rings = computeRings(logs, today, workingTierId)
      const feedItems = buildFeedItems(logs)
      const currentProject = pickCurrentProject(logs, workingTierId)
      const primary = pyramid?.boulder?.grades?.length ? pyramid.boulder.grades : (pyramid?.route?.grades || [])
      const pyramidPreview = [...primary].reverse().slice(0,3)
      const isPlanRestDay = !!(activePlan && !todaySession)

      setData({
        loading: false,
        lastTriage: sessions[0] || null,
        activePlan, todaySession, todayLogged,
        stats, rank: lb?.me || null,
        hardestSends, pyramidPreview,
        streakDays, weekLoggedDates, isFirstLogOfWeek, isPlanRestDay,
        feedItems, currentProject, recentLogs: logs,
        ...rings,
      })
    })

    return () => { cancelled = true }
  }, [user])

  return data
}
```

- [ ] **Step 2: Replace `HubTab.jsx` entirely**

```jsx
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useHubData } from '../hooks/useHubData'
import { workingTierFromHardest } from '../lib/tier'
import TierThemeRoot from './TierThemeRoot'
import HubGreeting from './HubGreeting'
import HubRingsCard from './HubRingsCard'
import HubProjectCard from './HubProjectCard'
import HubWeekStrip from './HubWeekStrip'
import HubFeedCard from './HubFeedCard'

export default function HubTab({ user }) {
  const navigate = useNavigate()
  const data = useHubData(user)
  const tierId = workingTierFromHardest(data.hardestSends)
  const today = new Date().toISOString().slice(0,10)

  if (data.loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={20} className="text-accent animate-spin" />
      </div>
    )
  }

  return (
    <TierThemeRoot hardest={data.hardestSends} global>
      <div className="relative px-4 py-6 md:py-8 max-w-2xl mx-auto"
           style={{
             background:
               'radial-gradient(circle at 50% -10%, color-mix(in srgb, var(--tier-c) 28%, transparent) 0%, transparent 55%)',
           }}>
        <HubGreeting user={user} data={data} tierId={tierId} />

        <div className="space-y-3">
          <HubRingsCard
            sends={data.ringSends}
            climbDays={data.ringClimbDays}
            pushAttempts={data.ringPushAttempts}
            streakDays={data.streakDays}
          />
          {data.currentProject && (
            <HubProjectCard
              project={data.currentProject}
              onContinue={() => navigate('/train')}
            />
          )}
          <HubWeekStrip
            loggedDates={data.weekLoggedDates}
            todayIso={today}
          />
          <HubFeedCard items={data.feedItems} />
        </div>
      </div>
    </TierThemeRoot>
  )
}
```

- [ ] **Step 3: Delete `HubProgressCard.jsx`**

```bash
git rm frontend/src/components/HubProgressCard.jsx
```

- [ ] **Step 4: Build, smoke-test, commit**

```bash
cd frontend && npx vite build 2>&1 | tail -5 && cd ..
git add frontend/src/hooks/useHubData.js frontend/src/components/HubTab.jsx
git commit -m "feat(hub): rebuild Hub around rings + project + week + feed; drop tool cards"
```

---

## Phase 4 — Progress redesign

### Task 18: `AwardMedal` component (reusable, size variants 40 / 84 / 168)

**Files:**
- Create: `frontend/src/components/AwardMedal.jsx`

- [ ] **Step 1: Create the component**

```jsx
import { Lock } from 'lucide-react'

/**
 * Reusable medal. Three size variants:
 *   size='sm' → 40px, used in toasts
 *   size='md' → 84px, used in awards strip
 *   size='lg' → 168px, used in tier-promotion takeover
 *
 * Props:
 *   size:     'sm' | 'md' | 'lg'
 *   light:    hex (top of gradient)
 *   mid:      hex (main color)
 *   deep:     hex (bottom of gradient)
 *   icon:     lucide component (e.g., Mountain)
 *   label:    string | null    — small label below the icon (e.g., 'V7', '10d')
 *   locked:   boolean          — render the locked variant
 */
export default function AwardMedal({ size = 'md', light, mid, deep, icon: Icon, label, locked = false }) {
  const px = size === 'sm' ? 40 : size === 'lg' ? 168 : 84
  const iconPx = size === 'sm' ? 18 : size === 'lg' ? 36 : 22
  const labelFs = size === 'sm' ? 11 : size === 'lg' ? 28 : 14

  if (locked) {
    return (
      <div className="relative rounded-full flex items-center justify-center"
           style={{
             width: px, height: px,
             background: 'rgba(255,255,255,0.04)',
             border: '0.5px dashed rgba(255,255,255,0.2)',
             color: 'rgba(255,255,255,0.3)',
           }}>
        <Lock size={iconPx} />
      </div>
    )
  }

  return (
    <div className="relative rounded-full flex items-center justify-center"
         style={{
           width: px, height: px,
           background: `
             radial-gradient(ellipse 50% 40% at 50% 18%, rgba(255,255,255,0.55), rgba(255,255,255,0) 70%),
             linear-gradient(180deg, ${light} 0%, ${mid} 45%, ${deep} 100%)
           `,
           boxShadow: `
             0 6px 18px -2px ${mid}99,
             0 2px 4px rgba(0,0,0,0.4),
             inset 0 -3px 6px rgba(0,0,0,0.4),
             inset 0 2px 3px rgba(255,255,255,0.35)
           `,
         }}>
      {/* Bezel ring */}
      <div className="absolute rounded-full pointer-events-none"
           style={{
             inset: size === 'lg' ? 12 : size === 'sm' ? 4 : 6,
             border: '0.5px solid rgba(255,255,255,0.25)',
             background: 'radial-gradient(ellipse 60% 50% at 50% 25%, rgba(255,255,255,0.15), rgba(255,255,255,0) 70%)',
             boxShadow: 'inset 0 0 8px rgba(0,0,0,0.25)',
           }} />
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-white"
           style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
        <Icon size={iconPx} strokeWidth={2.2} />
        {label && (
          <div className="font-extrabold tabular-nums -tracking-[0.02em] mt-[1px]"
               style={{ fontSize: labelFs }}>
            {label}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build + commit**

```bash
cd frontend && npx vite build 2>&1 | tail -5 && cd ..
git add frontend/src/components/AwardMedal.jsx
git commit -m "feat(awards): AwardMedal reusable component with sm/md/lg variants"
```

---

### Task 19: `ProgressTierHero` — tier name + promotion progress

**Files:**
- Create: `frontend/src/components/ProgressTierHero.jsx`

- [ ] **Step 1: Create the component**

```jsx
import { TIER_NAMES, nextTier } from '../lib/tier'

/**
 * Tier hero card on the Progress page.
 *
 * Props:
 *   tierId:               'v0'..'v10'
 *   metaLine:             string   — e.g. "Hardest send last 30 days · 4 V7s · 2 V8 attempts"
 *   promotionProgress:    { current: number, goal: number } | null
 *     // null at v10 (apex) — show "Apex tier" message instead
 */
export default function ProgressTierHero({ tierId, metaLine, promotionProgress }) {
  const nextId = nextTier(tierId)
  const tierName = TIER_NAMES[tierId]
  const nextName = nextId ? TIER_NAMES[nextId] : null
  const isApex = !nextId
  const frac = promotionProgress
    ? Math.min(1, promotionProgress.current / Math.max(1, promotionProgress.goal))
    : 0
  const remaining = promotionProgress ? Math.max(0, promotionProgress.goal - promotionProgress.current) : 0

  return (
    <div className="relative rounded-2xl p-4 overflow-hidden"
         style={{
           background: 'linear-gradient(135deg, color-mix(in srgb, var(--tier-c) 22%, transparent), color-mix(in srgb, var(--tier-c) 6%, transparent))',
           border: '0.5px solid color-mix(in srgb, var(--tier-c) 45%, transparent)',
           boxShadow: 'inset 0 0 32px color-mix(in srgb, var(--tier-c) 18%, transparent)',
         }}>
      <div className="text-[11px] font-bold uppercase tracking-[0.08em]"
           style={{ color: 'var(--tier-light)' }}>
        Current tier
      </div>
      <div className="text-2xl font-bold text-text -tracking-[0.025em] mt-1 mb-0.5"
           style={{ textShadow: '0 0 14px var(--tier-glow)' }}>
        {tierId === 'v10' ? 'V10+' : tierId.toUpperCase()} · {tierName}
      </div>
      <div className="text-xs text-muted/80 mb-3">{metaLine}</div>

      {isApex ? (
        <div className="text-xs text-muted/70 italic">Apex tier — V10+ Coral.</div>
      ) : (
        <>
          <div className="flex items-baseline justify-between text-[11px] mb-1.5">
            <span className="text-muted uppercase tracking-[0.05em] font-semibold">
              Promotion to {nextId.toUpperCase()} · {nextName}
            </span>
            <span className="text-text font-bold tabular-nums -tracking-[0.01em]">
              {promotionProgress.current}
              <span className="text-muted/40 font-medium">/{promotionProgress.goal}</span>
            </span>
          </div>
          <div className="h-[5px] rounded-full overflow-hidden"
               style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div className="h-full rounded-full"
                 style={{
                   width: `${Math.round(frac * 100)}%`,
                   background: 'linear-gradient(90deg, var(--tier-c), var(--tier-light))',
                   boxShadow: '0 0 8px var(--tier-c)',
                 }} />
          </div>
          <div className="text-[11px] text-muted/70 mt-2">
            {remaining} more {nextId.toUpperCase()} send{remaining === 1 ? '' : 's'} within 30 days to advance to {nextName}
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Build + commit**

```bash
cd frontend && npx vite build 2>&1 | tail -5 && cd ..
git add frontend/src/components/ProgressTierHero.jsx
git commit -m "feat(progress): ProgressTierHero with promotion progress"
```

---

### Task 20: `AwardsStrip` — horizontal-scroll awards (earned + locked)

**Files:**
- Create: `frontend/src/components/AwardsStrip.jsx`

- [ ] **Step 1: Create the component**

```jsx
import { useAwards } from '../hooks/useAwards'
import { AWARD_META } from '../lib/awardCatalog'
import AwardMedal from './AwardMedal'

/**
 * Horizontal-scroll awards strip on the Progress page.
 * Earned medals come first (newest first), then up to N locked.
 *
 * Props:
 *   user:    current user (passed to useAwards)
 *   maxLocked: number  — cap on locked-tier shown (default 4)
 */
export default function AwardsStrip({ user, maxLocked = 4 }) {
  const { loading, earned, locked } = useAwards(user)

  return (
    <div className="rounded-2xl p-4"
         style={{ background: 'rgba(0,0,0,0.35)', border: '0.5px solid rgba(255,255,255,0.1)' }}>
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted mb-3">
        Awards
      </div>
      {loading ? (
        <div className="text-xs text-muted">Loading…</div>
      ) : earned.length === 0 && locked.length === 0 ? (
        <div className="text-xs text-muted/70 italic">No awards yet — log a session to start earning.</div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
          {earned.map((a) => {
            const meta = AWARD_META[a.kind] || {}
            return (
              <AwardTile key={a.kind} meta={meta} sub={meta.sub || formatDate(a.earned_at)} />
            )
          })}
          {locked.slice(0, maxLocked).map((a) => {
            const meta = AWARD_META[a.kind] || { name: a.label || a.kind }
            return <AwardTile key={a.kind} meta={meta} locked sub="Locked" />
          })}
        </div>
      )}
    </div>
  )
}

function AwardTile({ meta, locked = false, sub }) {
  return (
    <div className="shrink-0 w-24 text-center">
      <AwardMedal size="md"
        light={meta.light} mid={meta.c} deep={meta.deep}
        icon={meta.icon} label={meta.label} locked={locked} />
      <div className={`text-[11px] font-semibold mt-2 -tracking-[0.01em] ${locked ? 'text-muted' : 'text-text'}`}>
        {meta.name}
      </div>
      <div className="text-[10px] text-muted/50 mt-0.5">{sub}</div>
    </div>
  )
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const days = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (days < 1) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days/7)}w ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
```

- [ ] **Step 2: Build + commit**

```bash
cd frontend && npx vite build 2>&1 | tail -5 && cd ..
git add frontend/src/components/AwardsStrip.jsx
git commit -m "feat(awards): AwardsStrip with earned + locked tiles"
```

---

### Task 21: `ProgressTrendGraph` — 8-week stacked grade-colored bars

**Files:**
- Create: `frontend/src/components/ProgressTrendGraph.jsx`

- [ ] **Step 1: Create the component**

```jsx
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { getTrainingLogs } from '../api'
import { vGradeToTier, TIER_TOKENS, V_TIERS } from '../lib/tier'

/**
 * 8-week trend graph. Each column is a stacked bar where every segment
 * is colored by V-tier — so the user can SEE their stack shift up over
 * time toward harder grades.
 */
export default function ProgressTrendGraph() {
  const [loading, setLoading] = useState(true)
  const [weeks, setWeeks] = useState([])  // [{label, segments: [{tierId, count}]}]

  useEffect(() => {
    getTrainingLogs(200).then((logs) => {
      setWeeks(buildWeeks(logs))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  return (
    <div className="rounded-2xl p-4"
         style={{ background: 'rgba(0,0,0,0.35)', border: '0.5px solid rgba(255,255,255,0.1)' }}>
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted mb-2">
        Last 8 weeks
      </div>
      {loading ? (
        <div className="py-6 flex justify-center"><Loader2 size={16} className="animate-spin text-accent"/></div>
      ) : (
        <>
          <div className="flex items-end gap-1 h-[72px]">
            {weeks.map((w) => <WeekColumn key={w.label} week={w} />)}
          </div>
          <p className="text-[10px] text-muted/70 mt-2">
            Each segment is one V-tier — watch the stack shift up as you climb harder grades.
          </p>
        </>
      )}
    </div>
  )
}

function WeekColumn({ week }) {
  const total = week.segments.reduce((s, x) => s + x.count, 0) || 1
  const maxH = 56  // px
  return (
    <div className="flex-1 flex flex-col items-center gap-1">
      <div className="w-full flex flex-col-reverse gap-[1px]" style={{ height: maxH }}>
        {week.segments.map(({ tierId, count }) => {
          const h = Math.max(2, Math.round((count / total) * maxH))
          return (
            <span key={tierId}
                  className="rounded-[2px]"
                  style={{ height: h, background: TIER_TOKENS[tierId].c }} />
          )
        })}
      </div>
      <span className="text-[9px] text-muted/60">{week.label}</span>
    </div>
  )
}

function buildWeeks(logs) {
  // Group sends by week-start ISO date, then split by V-tier.
  const byWeek = {}
  for (const log of logs) {
    const ws = weekStart(log.date)
    byWeek[ws] = byWeek[ws] || {}
    for (const [grade, c] of Object.entries((log.climbs || {}).boulder || {})) {
      const sends = (c.s || 0) + (c.f || 0)
      if (sends === 0) continue
      const tier = vGradeToTier(grade)
      if (!tier) continue
      byWeek[ws][tier] = (byWeek[ws][tier] || 0) + sends
    }
  }
  const today = new Date(); today.setHours(0,0,0,0)
  const weeks = []
  for (let i = 7; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - (((today.getDay()+6)%7) + i*7))
    const ws = d.toISOString().slice(0,10)
    const bag = byWeek[ws] || {}
    const segments = V_TIERS
      .filter(t => bag[t])
      .map(t => ({ tierId: t, count: bag[t] }))
    weeks.push({ label: `W${8-i}`, segments })
  }
  return weeks
}

function weekStart(iso) {
  const d = new Date(iso + 'T00:00:00')
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow)
  return d.toISOString().slice(0,10)
}
```

- [ ] **Step 2: Build + commit**

```bash
cd frontend && npx vite build 2>&1 | tail -5 && cd ..
git add frontend/src/components/ProgressTrendGraph.jsx
git commit -m "feat(progress): ProgressTrendGraph with per-grade stacked bars"
```

---

### Task 22: Rebuild `ProgressTab.jsx`

**Files:**
- Modify: `frontend/src/components/ProgressTab.jsx` (replace)

- [ ] **Step 1: Replace the file**

```jsx
import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Trophy, LogIn, Loader2, Dumbbell, Plus } from 'lucide-react'
import { getProfile, getMe, getPyramid } from '../api'
import { workingTierFromHardest, nextTier } from '../lib/tier'
import TierThemeRoot from './TierThemeRoot'
import TrainingLogEntry from './TrainingLogEntry'
import ProgressTierHero from './ProgressTierHero'
import GradePyramidCard from './GradePyramidCard'
import AwardsStrip from './AwardsStrip'
import TrainLeaderboard from './TrainLeaderboard'
import ProgressTrendGraph from './ProgressTrendGraph'
import DisplayNamePromptModal from './DisplayNamePromptModal'

function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 py-16 space-y-5">
      <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/25 flex items-center justify-center">
        <Icon size={24} className="text-accent" />
      </div>
      <div>
        <p className="font-semibold text-text">{title}</p>
        <p className="text-sm text-muted mt-1 max-w-xs">{body}</p>
      </div>
      {action}
    </div>
  )
}

export default function ProgressTab({ user, onLoginClick }) {
  const navigate = useNavigate()
  const [state, setState] = useState('loading')
  const [error, setError] = useState(null)
  const [displayName, setDisplayName] = useState(user?.display_name ?? null)
  const [logOpen, setLogOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [pyramid, setPyramid] = useState(null)

  useEffect(() => { setDisplayName(user?.display_name ?? null) }, [user?.display_name])

  const load = useCallback(async () => {
    if (!user) { setState('no-auth'); return }
    setState('loading'); setError(null)
    try {
      const p = await getProfile().catch((err) => {
        if (err.message?.includes('404') || err.message?.includes('not set')) return null
        throw err
      })
      if (!p) { setState('no-profile'); return }
      if (!displayName) { setState('needs-name'); return }
      const pyr = await getPyramid({ window: 'month' }).catch(() => null)
      setPyramid(pyr)
      setState('ready')
    } catch (err) {
      setError(err.message); setState('error')
    }
  }, [user, displayName])

  useEffect(() => { load() }, [load, refreshKey])

  if (state === 'no-auth') {
    return (
      <EmptyState icon={Trophy} title="Sign in to see your progress"
        body="Track your tier, grade pyramid, awards, and how you stack up against other climbers."
        action={<button onClick={onLoginClick} className="btn-primary flex items-center gap-2"><LogIn size={15}/>Log in or create account</button>} />
    )
  }
  if (state === 'loading') {
    return <div className="flex items-center justify-center h-full py-24"><Loader2 size={24} className="text-accent animate-spin"/></div>
  }
  if (state === 'no-profile') {
    return (
      <EmptyState icon={Dumbbell} title="Set up your training profile first"
        body="Pop over to the Train tab to enter your experience level — then your stats and tier will appear here."
        action={<button onClick={() => navigate('/train')} className="btn-primary flex items-center gap-2"><Dumbbell size={15}/>Go to Train</button>} />
    )
  }
  if (state === 'error') {
    return <EmptyState icon={Trophy} title="Something went wrong" body={error||'Could not load your progress data.'}
      action={<button onClick={load} className="btn-secondary">Retry</button>} />
  }
  if (state === 'needs-name') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <DisplayNamePromptModal onDone={async (name) => { setDisplayName(name); try { await getMe() } catch {}; setState('ready') }} />
      </div>
    )
  }

  // state === 'ready'
  const hardest = {
    boulder: pyramid?.boulder?.hardest_send || null,
    route:   pyramid?.route?.hardest_send   || null,
  }
  const tierId = workingTierFromHardest(hardest)
  const nextId = nextTier(tierId)
  // Promotion progress: count sends at next tier this month (from pyramid grades)
  let promotionProgress = null
  if (nextId) {
    const nextV = nextId.toUpperCase()
    const row = (pyramid?.boulder?.grades || []).find(r => r.grade === nextV)
    const current = row ? (row.s + row.f) : 0
    promotionProgress = { current, goal: 5 }
  }
  const metaLine = `Hardest send last 30 days · ${
    hardest.boulder ? `${pyramid?.boulder?.grades?.find(g => g.grade === hardest.boulder)?.s || 0} ${hardest.boulder}s` : 'no boulder'
  }${nextId && promotionProgress ? ` · ${promotionProgress.current} ${nextId.toUpperCase()} attempts` : ''}`

  return (
    <TierThemeRoot hardest={hardest} global>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className="max-w-2xl mx-auto px-4 py-6 md:py-8 space-y-3"
        style={{
          background:
            'radial-gradient(circle at 50% -10%, color-mix(in srgb, var(--tier-c) 28%, transparent) 0%, transparent 55%)',
        }}>

        <div className="px-1 pt-1 pb-2">
          <h1 className="text-2xl sm:text-[28px] font-bold text-text -tracking-[0.025em]">Progress</h1>
          <p className="text-xs text-muted mt-1">Leaderboard, grade pyramid, and your stats</p>
        </div>

        <AnimatePresence mode="wait">
          {logOpen ? (
            <motion.div key="log-form" initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}}>
              <TrainingLogEntry
                onSave={() => { setLogOpen(false); setRefreshKey(k => k+1) }}
                onCancel={() => setLogOpen(false)} />
            </motion.div>
          ) : (
            <motion.button key="log-button" initial={{opacity:0}} animate={{opacity:1}}
              onClick={() => setLogOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold"
              style={{
                background: 'color-mix(in srgb, var(--tier-c) 14%, transparent)',
                border: '0.5px solid color-mix(in srgb, var(--tier-c) 40%, transparent)',
                color: 'var(--tier-light)',
              }}>
              <Plus size={15} /> Log a session
            </motion.button>
          )}
        </AnimatePresence>

        <ProgressTierHero
          tierId={tierId}
          metaLine={metaLine}
          promotionProgress={promotionProgress}
        />
        <GradePyramidCard key={refreshKey} />
        <AwardsStrip user={user} />
        <TrainLeaderboard cohort={null} />
        <ProgressTrendGraph />
      </motion.div>
    </TierThemeRoot>
  )
}
```

- [ ] **Step 2: Build + commit**

```bash
cd frontend && npx vite build 2>&1 | tail -5 && cd ..
git add frontend/src/components/ProgressTab.jsx
git commit -m "feat(progress): rebuild Progress around tier hero + awards + trend"
```

---

## Phase 5 — Live feedback

### Task 23: `AwardUnlockToast` + `TierPromotionTakeover` components

**Files:**
- Create: `frontend/src/components/AwardUnlockToast.jsx`
- Create: `frontend/src/components/TierPromotionTakeover.jsx`

- [ ] **Step 1: Create `AwardUnlockToast.jsx`**

```jsx
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import AwardMedal from './AwardMedal'
import { AWARD_META } from '../lib/awardCatalog'

/**
 * Slide-in toast for a newly-unlocked award.
 *
 * Props:
 *   award:    { kind, label, category }  — from POST /api/training new_awards
 *   onTap:    () => void
 *   onClose:  () => void
 */
export default function AwardUnlockToast({ award, onTap, onClose }) {
  const meta = AWARD_META[award.kind] || { name: award.label || award.kind }

  return (
    <motion.div
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -12, opacity: 0 }}
      transition={{ duration: 0.25 }}
      role="button"
      onClick={onTap}
      className="rounded-xl px-3 py-3 flex items-center gap-3 cursor-pointer"
      style={{
        background: 'rgba(20,20,28,0.92)',
        border: '0.5px solid rgba(255,255,255,0.14)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
        backdropFilter: 'blur(12px)',
      }}>
      <AwardMedal size="sm"
        light={meta.light} mid={meta.c} deep={meta.deep}
        icon={meta.icon} label={null} />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold text-text -tracking-[0.01em] flex items-baseline gap-1.5">
          {meta.name}
          <span className="text-[9px] font-extrabold uppercase tracking-[0.08em] px-1.5 py-[1px] rounded"
                style={{ color: meta.c, border: `0.5px solid ${meta.c}66` }}>
            Earned
          </span>
        </div>
        <div className="text-[11px] text-muted mt-0.5">
          {meta.sub} · tap to view
        </div>
      </div>
      <button type="button" onClick={(e) => { e.stopPropagation(); onClose() }}
              className="text-muted/40 text-sm">×</button>
    </motion.div>
  )
}
```

- [ ] **Step 2: Create `TierPromotionTakeover.jsx`**

```jsx
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Mountain } from 'lucide-react'
import AwardMedal from './AwardMedal'
import { TIER_NAMES, TIER_TOKENS } from '../lib/tier'

/**
 * Full-screen takeover when working tier advances.
 *
 * Props:
 *   from:    tier id (previous)
 *   to:      tier id (new)
 *   onClose: () => void
 */
export default function TierPromotionTakeover({ from, to, onClose }) {
  const t = TIER_TOKENS[to]
  const name = TIER_NAMES[to]

  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      role="button"
      onClick={onClose}
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center cursor-pointer"
      style={{
        background: `
          radial-gradient(circle at 50% 30%, ${t.c}88 0%, transparent 60%),
          linear-gradient(180deg, ${t.deep}cc 0%, #050509 100%)
        `,
      }}>
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="mb-7">
        <AwardMedal size="lg" light={t.light} mid={t.c} deep={t.deep}
                    icon={Mountain} label={to === 'v10' ? 'V10+' : to.toUpperCase()} />
      </motion.div>
      <div className="text-center max-w-[280px] px-6 relative z-10">
        <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/60 mb-1.5">
          New working tier
        </div>
        <div className="text-[30px] font-bold -tracking-[0.025em] text-white mb-2"
             style={{ textShadow: `0 0 22px ${t.c}99` }}>
          {name}
        </div>
        <div className="text-sm text-white/75 leading-snug mb-7">
          You've stepped into the {name} tier — the app's identity is now yours.
        </div>
        <div className="text-[11px] tracking-[0.05em] text-white/45">
          Tap to continue
        </div>
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 3: Build + commit**

```bash
cd frontend && npx vite build 2>&1 | tail -5 && cd ..
git add frontend/src/components/AwardUnlockToast.jsx frontend/src/components/TierPromotionTakeover.jsx
git commit -m "feat(live): AwardUnlockToast + TierPromotionTakeover components"
```

---

### Task 24: `App.jsx` — wire event listeners + restyle PR toast

**Files:**
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Add state + event listeners**

In `App.jsx`, find the existing `ct:new-pr` useEffect (the climb-log feature added it around line 146). After that, add two more useEffects and state:

```jsx
  // Award unlock queue (multiple may unlock in one log)
  const [awardQueue, setAwardQueue] = useState([])
  // Tier promotion state
  const [promotion, setPromotion] = useState(null)  // { from, to } | null

  useEffect(() => {
    const handler = (ev) => {
      const list = ev.detail?.awards || []
      if (list.length) setAwardQueue(q => [...q, ...list])
    }
    window.addEventListener('ct:award-unlocked', handler)
    return () => window.removeEventListener('ct:award-unlocked', handler)
  }, [])

  useEffect(() => {
    const handler = (ev) => {
      const { from, to } = ev.detail || {}
      if (from && to) setPromotion({ from, to })
    }
    window.addEventListener('ct:tier-promotion', handler)
    return () => window.removeEventListener('ct:tier-promotion', handler)
  }, [])

  // Pop the award queue every 5 seconds
  useEffect(() => {
    if (!awardQueue.length) return
    const t = setTimeout(() => setAwardQueue(q => q.slice(1)), 5000)
    return () => clearTimeout(t)
  }, [awardQueue])
```

- [ ] **Step 2: Render the toast queue + takeover in JSX**

Above the existing toast `<AnimatePresence>`, render the award queue + takeover:

```jsx
  {/* Award unlock toasts — queue, show first */}
  <AnimatePresence>
    {awardQueue.length > 0 && (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[210] max-w-sm w-[calc(100%-2rem)]">
        <AwardUnlockToast
          award={awardQueue[0]}
          onTap={() => { navigate('/progress'); setAwardQueue(q => q.slice(1)) }}
          onClose={() => setAwardQueue(q => q.slice(1))}
        />
      </div>
    )}
  </AnimatePresence>

  {/* Tier promotion takeover */}
  <AnimatePresence>
    {promotion && (
      <TierPromotionTakeover
        from={promotion.from}
        to={promotion.to}
        onClose={() => setPromotion(null)}
      />
    )}
  </AnimatePresence>
```

Add the imports at the top of `App.jsx`:

```jsx
import AwardUnlockToast from './components/AwardUnlockToast'
import TierPromotionTakeover from './components/TierPromotionTakeover'
```

- [ ] **Step 3: Restyle the PR celebration toast — remove emoji, add Trophy**

Find the existing toast `<div role="alert">` that handles `toast.kind === 'celebration'`. Replace its content with:

```jsx
{toast.kind === 'celebration' ? (
  <>
    <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'color-mix(in srgb, var(--tier-c) 28%, transparent)', color: 'var(--tier-light)' }}>
      <Trophy size={14} />
    </span>
    <span className="flex-1 leading-snug">
      {toast.message}
      {toast.link && <span className="ml-2 text-accent font-semibold">Tap to view ›</span>}
    </span>
  </>
) : (
  <span className="flex-1 leading-snug">
    {toast.message}
    {toast.link && <span className="ml-2 text-accent font-bold">Tap to view ›</span>}
  </span>
)}
```

(`Trophy` is already imported in `App.jsx`'s lucide-react bundle.)

Adjust the toast outer container style for celebration kind to include the tier gradient:

```jsx
className={`rounded-lg border px-4 py-3 text-sm shadow-lg backdrop-blur-sm flex items-start gap-3 ${
  toast.kind === 'error'
    ? 'bg-accent3/10 border-accent3/30 text-accent3'
    : toast.kind === 'celebration'
      ? 'cursor-pointer text-text'
      : 'bg-panel2 border-outline text-text'
}`}
style={toast.kind === 'celebration' ? {
  background: 'linear-gradient(135deg, color-mix(in srgb, var(--tier-c) 25%, transparent), rgba(251,113,133,0.15))',
  border: '0.5px solid color-mix(in srgb, var(--tier-c) 45%, transparent)',
  boxShadow: '0 8px 24px color-mix(in srgb, var(--tier-c) 30%, transparent)',
} : undefined}
```

- [ ] **Step 4: Build + commit**

```bash
cd frontend && npx vite build 2>&1 | tail -5 && cd ..
git add frontend/src/App.jsx
git commit -m "feat(live): wire award + tier-promotion events; restyle PR toast"
```

---

### Task 25: `TrainingLogEntry` — dispatch new events from response

**Files:**
- Modify: `frontend/src/components/TrainingLogEntry.jsx`

- [ ] **Step 1: Extend the save handler**

In `TrainingLogEntry.jsx`, locate the existing `handleSave` function. It already dispatches `ct:new-pr`. Replace the entire `try` block of `handleSave` with:

```jsx
    try {
      const res = await logTraining(form)
      // PR toast (existing)
      if (res?.new_prs && (res.new_prs.boulder || res.new_prs.route)) {
        window.dispatchEvent(new CustomEvent('ct:new-pr', { detail: res.new_prs }))
      }
      // Award unlock toasts (NEW)
      if (Array.isArray(res?.new_awards) && res.new_awards.length) {
        window.dispatchEvent(new CustomEvent('ct:award-unlocked', { detail: { awards: res.new_awards } }))
      }
      // Tier promotion takeover (NEW)
      if (res?.tier_change && res.tier_change.from !== res.tier_change.to) {
        window.dispatchEvent(new CustomEvent('ct:tier-promotion', { detail: res.tier_change }))
      }
      onSave?.()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
```

- [ ] **Step 2: Build + commit**

```bash
cd frontend && npx vite build 2>&1 | tail -5 && cd ..
git add frontend/src/components/TrainingLogEntry.jsx
git commit -m "feat(live): TrainingLogEntry dispatches award + tier-promotion events"
```

---

### Task 26: Nav active indicator uses tier color

**Files:**
- Modify: `frontend/src/App.jsx` (NavLink className for active state)

- [ ] **Step 1: Modify NavLink className blocks**

In `App.jsx`, find the desktop sidebar NavLink (~line 388) and the mobile bottom-nav NavLink (~line 642). Both pass a function-style className. Change the active-state class for `id === 'hub' || id === 'progress'` to use the tier CSS vars, while non-themed tabs (train/body/chat) keep their current `text-accent` and `bg-accent/15` styles.

The cleanest way: instead of switching per-tab, change the active styles globally so they use the tier vars — these vars default to teal via the existing CSS if no `TierThemeRoot.global` has set them. Update the NavLink in the sidebar:

Replace `'bg-accent/15 text-accent border border-accent/25 shadow-glow'` with a style prop:

```jsx
style={isActive ? {
  background: 'color-mix(in srgb, var(--tier-c, #14b8a6) 18%, transparent)',
  color: 'var(--tier-light, #5eead4)',
  borderColor: 'color-mix(in srgb, var(--tier-c, #14b8a6) 28%, transparent)',
  boxShadow: '0 0 12px var(--tier-glow, rgba(20,184,166,0.18))',
} : undefined}
```

Keep `className` for the layout-only parts (`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-100` + the `hover:` styles for inactive).

For the mobile bottom-nav, locate the existing `<motion.div layoutId="bottom-nav-indicator" .../>` (the thin colored bar under the active tab around line ~657). Change its `className` to drop `bg-accent` and add a `style` prop:

```jsx
<motion.div
  layoutId="bottom-nav-indicator"
  transition={{ duration: 0.12, ease: 'easeOut' }}
  className="absolute bottom-0 w-8 h-0.5 rounded-full"
  style={{ background: 'var(--tier-c, #14b8a6)' }}
/>
```

Also the bottom-nav active text color — change the active class from `'text-accent'` to use an inline style or a CSS-var-aware utility. Simplest: keep `text-accent` as fallback but add a style prop that overrides:

```jsx
className={({ isActive }) => `flex-1 min-w-0 flex flex-col items-center gap-1 py-3 text-[10px] sm:text-xs font-medium leading-tight transition-colors duration-100 ${
  isActive ? '' : 'text-muted'
}`}
style={({ isActive }) => isActive ? { color: 'var(--tier-light, #5eead4)' } : undefined}
```

(Note: NavLink does not pass `isActive` into `style` like it does to `className`. To avoid that asymmetry, render the indicator's color inside the render-prop child instead — the existing code already uses the `{({ isActive }) => …}` child pattern, so wrap the active text color inside that child:

```jsx
{({ isActive }) => (
  <>
    <Icon size={18} style={isActive ? { color: 'var(--tier-light, #5eead4)' } : undefined} />
    <span className="truncate max-w-full px-0.5"
          style={isActive ? { color: 'var(--tier-light, #5eead4)' } : undefined}>{label}</span>
    {isActive && (
      <motion.div ... />
    )}
  </>
)}
```

The fallback to teal (when `--tier-c` is unset) preserves the current look on routes that don't theme.

- [ ] **Step 2: Build + commit**

```bash
cd frontend && npx vite build 2>&1 | tail -5 && cd ..
git add frontend/src/App.jsx
git commit -m "feat(nav): active tab indicator picks up tier color"
```

---

## Phase 6 — Final integration

### Task 27: Full backend test sweep

- [ ] **Step 1: Run all backend tests**

```bash
python -m unittest discover tests -v 2>&1 | tail -20
```
Expected: all pass (existing 186 + ~22 new = ~208+).

- [ ] **Step 2: If anything fails, fix + recommit**

---

### Task 28: Manual end-to-end verification on phone

Restart vite if necessary:

```bash
lsof -ti :5173 | xargs kill 2>/dev/null
cd frontend && npx vite --host 0.0.0.0 --port 5173 --clearScreen false &
cd ..
```

- [ ] **Step 1: Smoke-test the Hub**

Open `http://10.50.157.135:5173/hub` on phone (hard-refresh first). Confirm:
- Greeting shows variant copy (e.g., "New week, fresh starts." or "X days in...")
- Tier pill in greeting shows current tier with correct color
- Rings card renders, sends ring color matches tier
- Project card appears if there's a recent `p > 0` log; otherwise hidden
- Week strip with today highlighted in tier color
- Recent climbs feed: each row's chip uses ITS grade's color

- [ ] **Step 2: Smoke-test the Progress page**

Navigate to `/progress`. Confirm:
- Page header + "Log a session" button
- Tier hero card with promotion progress bar
- Grade pyramid renders with tier colors
- Awards strip shows earned medals + locked silhouettes
- Leaderboard with your tier-highlighted row
- 8-week trend graph with stacked grade-colored bars

- [ ] **Step 3: Smoke-test live feedback**

Log a session that earns an award (e.g., a V5 send if you haven't sent V5 yet):
- 🏆 PR toast (new style, no emoji, tier-colored)
- Award unlock toast slides in from top
- If the tier changed: full-screen takeover for ~3 seconds

- [ ] **Step 4: Smoke-test nav active indicator on themed tabs**

Tap Hub then Progress — the active indicator should use the tier color. Tap Train then Body then Chat — those tabs keep their existing teal styling.

- [ ] **Step 5: Commit any fixes**

If verification surfaced bugs, commit fixes as scoped follow-ups.

---

## Spec coverage check

| Spec section | Tasks |
|---|---|
| Tier color system | 1, 7 |
| Working-tier derivation | 1, 7 |
| YDS → V-tier mapping | 1, 7 |
| Theme scope (Hub + Progress + nav) | 8, 17, 22, 26 |
| Hub greeting (variants + tier pill + avatar) | 10, 12 |
| Hub rings card | 13 |
| Hub project card | 14 |
| Hub week strip | 15 |
| Hub feed (per-grade chips) | 16 |
| Hub composition (remove tool cards) | 17 |
| Progress tier hero + promotion | 19, 22 |
| Progress pyramid (re-themed) | 22 (uses existing GradePyramidCard) |
| Progress awards strip | 20, 22 |
| Progress leaderboard | 22 (uses existing TrainLeaderboard) |
| Progress 8-week trend | 21, 22 |
| Award catalog + engine | 4 |
| Award medal v2 | 18 |
| Tier-promotion takeover | 23, 24, 25 |
| Award unlock toast | 23, 24, 25 |
| PR toast refresh | 24 |
| Greeting variants | 10, 12 |
| `awards` table | 2, 3 |
| `GET /api/awards` | 6 |
| POST /api/training extended response | 5 |
| useTierTheme + TierThemeRoot | 8, 17, 22 |
| Frontend tier.js mirror | 7 |
| useAwards + awardCatalog | 11 |
| hubGreeting.js | 10 |
| HubProgressCard removal | 17 |
| Backend test suite | 1, 2, 3, 4, 5, 6, 27 |
| Manual e2e | 28 |
