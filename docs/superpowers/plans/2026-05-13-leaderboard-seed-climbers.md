# Leaderboard Seed Climbers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap the Train tab leaderboard with 10 hand-curated synthetic climber accounts spread across cohorts (3 beginner / 3 intermediate / 3 advanced / 1 elite), kept fresh by a daily cron, capped at ~8 hrs/week so real users can outrank them.

**Architecture:** Bottom-up: DB column + index migrations → persona module → activity generator → init/tick scripts → auth/business-metric exclusion paths → end-to-end test. Seed users are full `users` table rows with `is_seed=TRUE`, an un-loginable bcrypt hash, and `display_name` set. Existing leaderboard query is unchanged — seed climbers surface naturally.

**Tech Stack:** Python 3 + psycopg2 (existing pattern in `database.py`), FastAPI handlers in `main.py`, `unittest` for tests. No frontend changes.

**Spec:** [docs/superpowers/specs/2026-05-13-leaderboard-seed-climbers-design.md](docs/superpowers/specs/2026-05-13-leaderboard-seed-climbers-design.md)

---

## File map

**Created:**
- `src/seed_climbers.py` — persona dataclass + SEED_PERSONAS list + activity generator helpers
- `scripts/seed_climbers_init.py` — idempotent one-time init script
- `scripts/seed_climbers_tick.py` — daily cron entry point
- `tests/test_seed_climbers.py` — unit tests for personas + generators + idempotency + login block
- `docs/runbook/seed_climbers.md` — operational runbook (run order, Railway cron config, teardown command)

**Modified:**
- `database.py` — three migrations: `is_seed` column on `users`, unique index on `training_logs(user_id, date)` (with pre-flight check, partial-index fallback), `seed_progression` side table
- `main.py` — defense-in-depth early return in login handler for `is_seed` users

**Not changed:**
- Any frontend file — `TrainLeaderboard.jsx`, `TrainTab.jsx`, etc. are untouched (per spec)
- `src/triage.py` (out of scope)
- Existing user-facing API contracts

---

## Task 1 — DB migration: `is_seed` column on users

**Files:**
- Modify: `database.py` (inside `init_db()`, near the existing `_add_column_if_missing(cur, "users", ...)` block around line 162)
- Test: `tests/test_seed_climbers.py` (new file)

- [ ] **Step 1: Create the new test file with a column-presence check**

Create `tests/test_seed_climbers.py`:

```python
"""Tests for the leaderboard seed climbers feature.
Covers: schema migration, persona definitions, activity generator,
idempotency, auth block, leaderboard surfacing, and cleanup."""
from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import _connect, init_db  # noqa: E402


class SchemaMigrationTests(unittest.TestCase):
    """Ensure the migrations needed for seed climbers run cleanly."""

    @classmethod
    def setUpClass(cls):
        # Make sure migrations have run (idempotent).
        init_db()

    def test_users_has_is_seed_column(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """SELECT data_type, column_default, is_nullable
                       FROM information_schema.columns
                       WHERE table_name = 'users' AND column_name = 'is_seed';"""
                )
                row = cur.fetchone()
                self.assertIsNotNone(row, "users.is_seed column missing")
                data_type, default, nullable = row
                self.assertEqual(data_type, "boolean")
                self.assertEqual(nullable, "NO")
                # Default should resolve to FALSE
                self.assertIn("false", (default or "").lower(),
                              f"expected FALSE default, got {default!r}")
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `.venv/bin/python -m unittest tests.test_seed_climbers.SchemaMigrationTests.test_users_has_is_seed_column -v`
Expected: FAIL — `users.is_seed column missing`.

- [ ] **Step 3: Add the column migration**

In `database.py`, find the block of `_add_column_if_missing(cur, "users", ...)` calls (around lines 117-164). After the last user-table column migration (likely `avatar_color`), add:

```python
            # Train tab — seed climbers (synthetic accounts for leaderboard
            # bootstrap). is_seed=TRUE marks an account that's not a real user;
            # they're excluded from business metrics and visible only on the
            # leaderboard. See docs/superpowers/specs/2026-05-13-leaderboard-seed-climbers-design.md.
            _add_column_if_missing(cur, "users", "is_seed",
                "BOOLEAN NOT NULL DEFAULT FALSE")
            cur.execute("CREATE INDEX IF NOT EXISTS users_is_seed_idx ON users (is_seed) WHERE is_seed = TRUE;")
```

- [ ] **Step 4: Run test to confirm PASS**

Run: `.venv/bin/python -m unittest tests.test_seed_climbers.SchemaMigrationTests.test_users_has_is_seed_column -v`
Expected: PASS.

- [ ] **Step 5: Run all existing tests to confirm no regression**

Run: `.venv/bin/python -m unittest tests.test_bucket tests.test_bucket_content tests.test_triage_calibration tests.test_finger_triage 2>&1 | tail -5`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add database.py tests/test_seed_climbers.py
git commit -m "DB migration: add users.is_seed column for leaderboard seed climbers"
```

---

## Task 2 — DB migration: `training_logs (user_id, date)` unique index

**Files:**
- Modify: `database.py` (inside `init_db()`, near the `training_logs` CREATE TABLE around line 230)
- Test: `tests/test_seed_climbers.py` (append)

This index makes the daily tick idempotent. The migration must handle existing real-user data that may already have multiple rows per (user_id, date).

- [ ] **Step 1: Append a failing test**

Append to `tests/test_seed_climbers.py`:

```python
    def test_training_logs_has_user_date_unique_index(self):
        """One of: full unique index, or partial-on-is_seed unique index.
        Either is acceptable per the migration safety logic."""
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """SELECT indexname, indexdef FROM pg_indexes
                       WHERE tablename = 'training_logs' AND indexdef ILIKE '%user_id%date%' AND indexdef ILIKE '%UNIQUE%';"""
                )
                rows = cur.fetchall()
                self.assertGreater(len(rows), 0,
                                   "expected a UNIQUE index on training_logs (user_id, date)")
```

- [ ] **Step 2: Run, confirm FAIL**

Run: `.venv/bin/python -m unittest tests.test_seed_climbers.SchemaMigrationTests.test_training_logs_has_user_date_unique_index -v`
Expected: FAIL — no UNIQUE index matching the pattern.

- [ ] **Step 3: Add the migration with pre-flight + fallback**

In `database.py`, find the `CREATE TABLE IF NOT EXISTS training_logs` block (around line 230). Immediately AFTER that CREATE TABLE statement (and any related migrations), add:

```python
            # Idempotency support for the seed-climbers daily tick: the tick
            # script inserts at most one training_log per (user_id, date), so
            # we need a unique index to make ON CONFLICT DO NOTHING work.
            #
            # Real users *may* already have multiple rows per (user_id, date)
            # (two-a-day sessions). Check first — if duplicates exist, scope
            # the unique constraint to seed users only via a partial index.
            cur.execute(
                """SELECT COUNT(*) FROM (
                       SELECT user_id, date FROM training_logs
                       GROUP BY user_id, date HAVING COUNT(*) > 1
                   ) dup;"""
            )
            duplicate_count = cur.fetchone()[0]
            if duplicate_count == 0:
                cur.execute(
                    "CREATE UNIQUE INDEX IF NOT EXISTS training_logs_user_date_idx "
                    "ON training_logs (user_id, date);"
                )
            else:
                # Partial unique index — only seed users get the (user_id, date)
                # uniqueness constraint. Real users keep their multi-session days.
                cur.execute(
                    "CREATE UNIQUE INDEX IF NOT EXISTS training_logs_seed_user_date_idx "
                    "ON training_logs (user_id, date) "
                    "WHERE user_id IN (SELECT id FROM users WHERE is_seed = TRUE);"
                )
```

- [ ] **Step 4: Run, confirm PASS**

Run: `.venv/bin/python -m unittest tests.test_seed_climbers.SchemaMigrationTests.test_training_logs_has_user_date_unique_index -v`
Expected: PASS.

- [ ] **Step 5: Run all tests for regression**

Run: `.venv/bin/python -m unittest tests.test_bucket tests.test_bucket_content tests.test_triage_calibration tests.test_finger_triage tests.test_seed_climbers 2>&1 | tail -5`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add database.py tests/test_seed_climbers.py
git commit -m "DB migration: unique index on training_logs(user_id, date) with pre-flight fallback"
```

---

## Task 3 — DB migration: `seed_progression` side table

**Files:**
- Modify: `database.py` (inside `init_db()`, after the `training_logs` CREATE TABLE block)
- Test: `tests/test_seed_climbers.py` (append)

- [ ] **Step 1: Append a failing test**

Append to `tests/test_seed_climbers.py`:

```python
    def test_seed_progression_table_exists(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """SELECT column_name, data_type FROM information_schema.columns
                       WHERE table_name = 'seed_progression'
                       ORDER BY ordinal_position;"""
                )
                cols = {name: dtype for name, dtype in cur.fetchall()}
                self.assertIn("user_id", cols)
                self.assertIn("intensity_bump", cols)
                self.assertIn("extra_grades", cols)
                self.assertIn("last_progressed_at", cols)
                self.assertEqual(cols["intensity_bump"], "real")
```

- [ ] **Step 2: Run, confirm FAIL**

Run: `.venv/bin/python -m unittest tests.test_seed_climbers.SchemaMigrationTests.test_seed_progression_table_exists -v`
Expected: FAIL — table missing.

- [ ] **Step 3: Add the CREATE TABLE**

In `database.py`, after the `training_logs` block and before the `coach_threads` block (around line 244), add:

```python
            # Seed-climber progression side table — stores per-seed nudges
            # (intensity bump, extra grades) that accumulate over time so
            # the activity generator can produce gradual improvement.
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS seed_progression (
                    user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                    intensity_bump REAL NOT NULL DEFAULT 0.0,
                    extra_grades TEXT[] NOT NULL DEFAULT '{}',
                    last_progressed_at TIMESTAMPTZ NULL
                );
                """
            )
```

- [ ] **Step 4: Run, confirm PASS**

Run: `.venv/bin/python -m unittest tests.test_seed_climbers.SchemaMigrationTests.test_seed_progression_table_exists -v`
Expected: PASS.

- [ ] **Step 5: Run all tests for regression**

Run: `.venv/bin/python -m unittest tests.test_seed_climbers 2>&1 | tail -5`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add database.py tests/test_seed_climbers.py
git commit -m "DB migration: seed_progression side table"
```

---

## Task 4 — Persona module: SEED_PERSONAS dataclass + 10 entries

**Files:**
- Create: `src/seed_climbers.py`
- Test: `tests/test_seed_climbers.py` (append)

- [ ] **Step 1: Append failing tests**

Append to `tests/test_seed_climbers.py`:

```python
class PersonaDefinitionTests(unittest.TestCase):
    """The 10 personas are the contract between the spec and the runtime."""

    def test_exactly_10_personas(self):
        from src.seed_climbers import SEED_PERSONAS
        self.assertEqual(len(SEED_PERSONAS), 10)

    def test_cohort_distribution_3_3_3_1(self):
        from src.seed_climbers import SEED_PERSONAS
        cohorts = [p.cohort for p in SEED_PERSONAS]
        self.assertEqual(cohorts.count("beginner"), 3)
        self.assertEqual(cohorts.count("intermediate"), 3)
        self.assertEqual(cohorts.count("advanced"), 3)
        self.assertEqual(cohorts.count("elite"), 1)

    def test_handles_unique(self):
        from src.seed_climbers import SEED_PERSONAS
        handles = [p.handle for p in SEED_PERSONAS]
        self.assertEqual(len(handles), len(set(handles)), "handles must be unique")

    def test_handles_dont_match_pattern_style(self):
        """No 'SnowyClimber42' / 'Crusher99' style names."""
        from src.seed_climbers import SEED_PERSONAS
        import re
        # Reject anything ending in 2+ digits or containing common climbing words
        bad_endings = re.compile(r"\d{2,}$")
        bad_words = ("Climber", "Crusher", "Sender", "Beast", "King", "Queen")
        for p in SEED_PERSONAS:
            self.assertIsNone(bad_endings.search(p.handle), f"{p.handle} ends in digits")
            for w in bad_words:
                self.assertNotIn(w, p.handle, f"{p.handle} contains '{w}'")

    def test_weekly_hours_capped_below_9(self):
        """'Not too competitive' — even the elite seed maxes around 8 hrs/week."""
        from src.seed_climbers import SEED_PERSONAS
        for p in SEED_PERSONAS:
            # avg_session_min × sessions_per_week / 60 ≤ 9
            avg_session_min = (p.session_min_range[0] + p.session_min_range[1]) / 2
            avg_hrs = (p.sessions_per_week * avg_session_min) / 60
            self.assertLessEqual(avg_hrs, 9.0,
                                 f"{p.handle} avg ~{avg_hrs:.1f} hrs/week exceeds 9-hr cap")

    def test_grade_pools_cohort_appropriate(self):
        """Beginner has no V5+; elite has no V0/V1."""
        from src.seed_climbers import SEED_PERSONAS
        for p in SEED_PERSONAS:
            if p.cohort == "beginner":
                for g in p.grade_pool:
                    if g.startswith("V"):
                        self.assertLess(int(g[1:]), 4, f"beginner {p.handle} has hard grade {g}")
            elif p.cohort == "elite":
                for g in p.grade_pool:
                    if g.startswith("V"):
                        self.assertGreaterEqual(int(g[1:]), 7, f"elite {p.handle} has easy grade {g}")
```

- [ ] **Step 2: Run, confirm FAIL**

Run: `.venv/bin/python -m unittest tests.test_seed_climbers.PersonaDefinitionTests -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'src.seed_climbers'`.

- [ ] **Step 3: Create the persona module**

Create `src/seed_climbers.py`:

```python
"""Synthetic climber accounts used to bootstrap the Train-tab leaderboard.

These accounts are inserted into the `users` table with is_seed=TRUE. They
have un-loginable bcrypt hashes (random bytes, no recoverable password) and
no working email. They appear naturally on the leaderboard via the existing
query — no special-casing in the API layer.

Spec: docs/superpowers/specs/2026-05-13-leaderboard-seed-climbers-design.md

EXCLUSION POINTS (where is_seed users must NOT appear):
- Login flow (defense-in-depth early return in main.py auth handler)
- Coach messaging routing (skip seed users — no inbox)
- Email sending (verification, password reset, marketing)
- User-count business metrics (admin dashboards, billing aggregates)
- Stripe / billing code paths (no seed user reaches them — no login)

TEARDOWN: `DELETE FROM users WHERE is_seed = TRUE;` cascades to
athlete_profiles, training_logs, seed_progression via FK.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Tuple, Dict, List


@dataclass(frozen=True)
class Persona:
    handle: str                            # display_name
    cohort: str                            # beginner | intermediate | advanced | elite
    avatar_icon: str                       # one of the existing avatar preset keys
    avatar_color: str                      # one of the existing palette swatches
    sessions_per_week: float               # avg, used for daily-tick probability
    session_min_range: Tuple[int, int]     # min/max duration_min per session
    intensity_weights: Dict[int, float]    # 1..5 → relative probability
    grade_pool: List[str]                  # grades_sent draws from this list
    session_types: List[Tuple[str, float]] # (type, weight)
    rest_week_probability: float           # 0..1 chance a whole week is off


# Avatar preset/color keys reused from the existing profile customization
# (see _add_column_if_missing for users.avatar_icon and users.avatar_color
# around database.py:161-164). The exact keys here must match the frontend
# avatar palette — if you add a new preset and want it on a seed climber,
# add the key here.
_DEFAULT_SESSION_TYPES = [
    ("bouldering", 3.0),
    ("route_climbing", 2.0),
    ("hangboard", 1.0),
    ("antagonist", 1.0),
]

_HEAVY_BOULDERING = [
    ("bouldering", 4.0),
    ("hangboard", 2.0),
    ("antagonist", 1.0),
]


SEED_PERSONAS: List[Persona] = [
    # ── Beginners (3) ────────────────────────────────────────────────────
    Persona(
        handle="Mira K.",       cohort="beginner",
        avatar_icon="flame",    avatar_color="teal",
        sessions_per_week=2.0,  session_min_range=(45, 75),
        intensity_weights={1: 1, 2: 3, 3: 4, 4: 1, 5: 0},
        grade_pool=["V0", "V1", "V2", "5.7", "5.8"],
        session_types=_DEFAULT_SESSION_TYPES,
        rest_week_probability=0.10,
    ),
    Persona(
        handle="Reza A.",       cohort="beginner",
        avatar_icon="mountain", avatar_color="amber",
        sessions_per_week=2.0,  session_min_range=(45, 70),
        intensity_weights={1: 2, 2: 3, 3: 3, 4: 1, 5: 0},
        grade_pool=["V0", "V1", "V2", "5.8", "5.9"],
        session_types=_DEFAULT_SESSION_TYPES,
        rest_week_probability=0.10,
    ),
    Persona(
        handle="Lior B.",       cohort="beginner",
        avatar_icon="leaf",     avatar_color="green",
        sessions_per_week=2.5,  session_min_range=(50, 80),
        intensity_weights={1: 1, 2: 3, 3: 4, 4: 2, 5: 0},
        grade_pool=["V1", "V2", "V3", "5.8", "5.9"],
        session_types=_DEFAULT_SESSION_TYPES,
        rest_week_probability=0.08,
    ),
    # ── Intermediates (3) ────────────────────────────────────────────────
    Persona(
        handle="Eshan P.",      cohort="intermediate",
        avatar_icon="bolt",     avatar_color="indigo",
        sessions_per_week=3.0,  session_min_range=(60, 90),
        intensity_weights={1: 1, 2: 2, 3: 4, 4: 3, 5: 1},
        grade_pool=["V3", "V4", "V5", "5.10a", "5.10b"],
        session_types=_DEFAULT_SESSION_TYPES,
        rest_week_probability=0.07,
    ),
    Persona(
        handle="Yuki H.",       cohort="intermediate",
        avatar_icon="wave",     avatar_color="cyan",
        sessions_per_week=3.0,  session_min_range=(65, 95),
        intensity_weights={1: 0, 2: 2, 3: 4, 4: 3, 5: 1},
        grade_pool=["V3", "V4", "V5", "5.10b", "5.10c"],
        session_types=_DEFAULT_SESSION_TYPES,
        rest_week_probability=0.07,
    ),
    Persona(
        handle="Tomi V.",       cohort="intermediate",
        avatar_icon="anchor",   avatar_color="rose",
        sessions_per_week=3.0,  session_min_range=(70, 100),
        intensity_weights={1: 0, 2: 1, 3: 4, 4: 4, 5: 1},
        grade_pool=["V4", "V5", "V6", "5.10c", "5.10d"],
        session_types=_DEFAULT_SESSION_TYPES,
        rest_week_probability=0.05,
    ),
    # ── Advanced (3) ─────────────────────────────────────────────────────
    Persona(
        handle="Ariadne L.",    cohort="advanced",
        avatar_icon="diamond",  avatar_color="violet",
        sessions_per_week=3.5,  session_min_range=(75, 100),
        intensity_weights={1: 0, 2: 1, 3: 3, 4: 4, 5: 2},
        grade_pool=["V5", "V6", "V7", "5.11a", "5.11b"],
        session_types=_HEAVY_BOULDERING,
        rest_week_probability=0.05,
    ),
    Persona(
        handle="Linnea S.",     cohort="advanced",
        avatar_icon="star",     avatar_color="gold",
        sessions_per_week=3.5,  session_min_range=(80, 105),
        intensity_weights={1: 0, 2: 1, 3: 3, 4: 4, 5: 2},
        grade_pool=["V5", "V6", "V7", "5.11b", "5.11c"],
        session_types=_HEAVY_BOULDERING,
        rest_week_probability=0.05,
    ),
    Persona(
        handle="Beck M.",       cohort="advanced",
        avatar_icon="compass",  avatar_color="slate",
        sessions_per_week=4.0,  session_min_range=(75, 95),
        intensity_weights={1: 0, 2: 1, 3: 3, 4: 5, 5: 2},
        grade_pool=["V6", "V7", "V8", "5.11c", "5.11d"],
        session_types=_HEAVY_BOULDERING,
        rest_week_probability=0.04,
    ),
    # ── Elite (1) ────────────────────────────────────────────────────────
    Persona(
        handle="Jasper M.",     cohort="elite",
        avatar_icon="crown",    avatar_color="crimson",
        sessions_per_week=5.0,  session_min_range=(80, 105),
        intensity_weights={1: 0, 2: 0, 3: 2, 4: 5, 5: 4},
        grade_pool=["V7", "V8", "V9", "5.12a", "5.12b"],
        session_types=_HEAVY_BOULDERING,
        rest_week_probability=0.03,
    ),
]
```

- [ ] **Step 4: Run tests to confirm PASS**

Run: `.venv/bin/python -m unittest tests.test_seed_climbers.PersonaDefinitionTests -v`
Expected: PASS — all 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/seed_climbers.py tests/test_seed_climbers.py
git commit -m "Persona module: 10 SEED_PERSONAS spread 3/3/3/1 across cohorts"
```

---

## Task 5 — Activity generator: backfill + today-session helpers

**Files:**
- Modify: `src/seed_climbers.py` (append helper functions)
- Test: `tests/test_seed_climbers.py` (append)

- [ ] **Step 1: Append failing tests**

Append to `tests/test_seed_climbers.py`:

```python
class ActivityGeneratorTests(unittest.TestCase):
    def test_generate_initial_history_returns_dated_rows(self):
        from src.seed_climbers import SEED_PERSONAS, generate_initial_history
        from datetime import date, timedelta
        persona = SEED_PERSONAS[0]
        rows = generate_initial_history(persona, days=30, today=date(2026, 5, 13))
        # Returns a list of dicts with the expected keys
        self.assertIsInstance(rows, list)
        self.assertGreater(len(rows), 0)
        for row in rows:
            self.assertIn("date", row)
            self.assertIn("session_type", row)
            self.assertIn("duration_min", row)
            self.assertIn("intensity", row)
            self.assertIn("grades_sent", row)
            # All dates within the last 30 days, not in the future
            self.assertLessEqual(row["date"], date(2026, 5, 13))
            self.assertGreaterEqual(row["date"], date(2026, 5, 13) - timedelta(days=30))

    def test_generate_initial_history_respects_session_min_range(self):
        from src.seed_climbers import SEED_PERSONAS, generate_initial_history
        from datetime import date
        for persona in SEED_PERSONAS:
            rows = generate_initial_history(persona, days=30, today=date(2026, 5, 13))
            for row in rows:
                self.assertGreaterEqual(row["duration_min"], persona.session_min_range[0])
                self.assertLessEqual(row["duration_min"], persona.session_min_range[1])

    def test_generate_initial_history_respects_grade_pool(self):
        from src.seed_climbers import SEED_PERSONAS, generate_initial_history
        from datetime import date
        for persona in SEED_PERSONAS:
            rows = generate_initial_history(persona, days=30, today=date(2026, 5, 13))
            pool_set = set(persona.grade_pool)
            for row in rows:
                # grades_sent is a comma-separated string; every grade must be in the pool
                for grade in row["grades_sent"].split(","):
                    g = grade.strip()
                    if g:
                        self.assertIn(g, pool_set, f"{persona.handle} sent {g} outside pool {persona.grade_pool}")

    def test_generate_initial_history_unique_dates(self):
        """One session per day max (matches the UNIQUE index)."""
        from src.seed_climbers import SEED_PERSONAS, generate_initial_history
        from datetime import date
        for persona in SEED_PERSONAS:
            rows = generate_initial_history(persona, days=30, today=date(2026, 5, 13))
            dates = [r["date"] for r in rows]
            self.assertEqual(len(dates), len(set(dates)),
                             f"{persona.handle} has duplicate dates in initial history")

    def test_generate_today_session_returns_dict_or_none(self):
        from src.seed_climbers import SEED_PERSONAS, generate_today_session
        from datetime import date
        # Deterministic: with seed=42 and persona.sessions_per_week>=2 the
        # probability that *every* call returns None across 10 personas is tiny,
        # but the function may return None for any single one.
        for persona in SEED_PERSONAS:
            session = generate_today_session(persona, today=date(2026, 5, 13), rng_seed=42)
            self.assertTrue(session is None or isinstance(session, dict),
                            f"{persona.handle} returned wrong shape: {session!r}")
            if session is not None:
                self.assertIn("date", session)
                self.assertIn("duration_min", session)
                self.assertEqual(session["date"], date(2026, 5, 13))
```

- [ ] **Step 2: Run, confirm FAIL**

Run: `.venv/bin/python -m unittest tests.test_seed_climbers.ActivityGeneratorTests -v`
Expected: FAIL — `ImportError: cannot import name 'generate_initial_history'`.

- [ ] **Step 3: Append helpers to `src/seed_climbers.py`**

Append to `src/seed_climbers.py`:

```python
import random
from datetime import date, timedelta
from typing import Optional


def _weighted_choice(weights: Dict[int, float], rng: random.Random) -> int:
    """Pick a key from a weight-dict (key → relative weight)."""
    keys = list(weights.keys())
    w = [weights[k] for k in keys]
    return rng.choices(keys, weights=w, k=1)[0]


def _weighted_type(types: List[Tuple[str, float]], rng: random.Random) -> str:
    return rng.choices([t for t, _ in types], weights=[w for _, w in types], k=1)[0]


def _pick_grades(grade_pool: List[str], rng: random.Random) -> str:
    """1-2 grades from the pool, comma-joined. Climbers usually log
    a couple of sends per session, not a full pyramid."""
    n = rng.choice([1, 1, 1, 2])  # weighted toward 1
    picks = rng.sample(grade_pool, k=min(n, len(grade_pool)))
    return ", ".join(picks)


def _per_day_probability(persona: Persona) -> float:
    """Daily probability of training, capped at 0.95 to avoid certainty."""
    return min(0.95, persona.sessions_per_week / 7.0)


def generate_initial_history(
    persona: Persona,
    days: int = 30,
    today: Optional[date] = None,
    rng_seed: Optional[int] = None,
) -> List[Dict]:
    """Generate ~`days` days of training_logs for a persona, walking back from `today`.

    Returns a list of dicts ready to be inserted into the training_logs table.
    Each dict has: date, session_type, duration_min, intensity, grades_sent, notes.

    Idempotent in the sense that any (user_id, date) deduplication happens at
    the SQL layer (UNIQUE INDEX) — the generator itself yields at most one
    session per day.
    """
    if today is None:
        today = date.today()
    # Use a deterministic seed per-persona-per-window so re-running yields
    # the same backfill (avoids stochastic drift between runs).
    seed = rng_seed if rng_seed is not None else hash((persona.handle, days, today.toordinal())) & 0xFFFFFFFF
    rng = random.Random(seed)

    rows: List[Dict] = []
    per_day_p = _per_day_probability(persona)

    # Determine "rest weeks" up front so the pattern is realistic.
    rest_weeks = set()
    week_count = (days // 7) + 1
    for wk in range(week_count):
        if rng.random() < persona.rest_week_probability:
            rest_weeks.add(wk)

    for offset in range(days):
        d = today - timedelta(days=offset)
        week_index = offset // 7
        if week_index in rest_weeks:
            continue
        if rng.random() > per_day_p:
            continue
        duration = rng.randint(persona.session_min_range[0], persona.session_min_range[1])
        intensity = _weighted_choice(persona.intensity_weights, rng)
        stype = _weighted_type(persona.session_types, rng)
        grades = _pick_grades(persona.grade_pool, rng)
        rows.append({
            "date": d,
            "session_type": stype,
            "duration_min": duration,
            "intensity": intensity,
            "grades_sent": grades,
            "notes": "",
        })
    return rows


def generate_today_session(
    persona: Persona,
    today: Optional[date] = None,
    rng_seed: Optional[int] = None,
) -> Optional[Dict]:
    """Probabilistically generate ONE training_log for today, or None if
    today is a rest day for this persona. Used by the daily tick script."""
    if today is None:
        today = date.today()
    # Deterministic per-persona-per-day seed so re-running the tick same day
    # makes the same choice (helps with idempotency even before the SQL
    # UNIQUE-INDEX layer kicks in).
    seed = rng_seed if rng_seed is not None else hash((persona.handle, today.toordinal())) & 0xFFFFFFFF
    rng = random.Random(seed)

    if rng.random() > _per_day_probability(persona):
        return None

    return {
        "date": today,
        "session_type": _weighted_type(persona.session_types, rng),
        "duration_min": rng.randint(persona.session_min_range[0], persona.session_min_range[1]),
        "intensity": _weighted_choice(persona.intensity_weights, rng),
        "grades_sent": _pick_grades(persona.grade_pool, rng),
        "notes": "",
    }
```

- [ ] **Step 4: Run tests, confirm PASS**

Run: `.venv/bin/python -m unittest tests.test_seed_climbers.ActivityGeneratorTests -v`
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/seed_climbers.py tests/test_seed_climbers.py
git commit -m "Persona module: deterministic generate_initial_history + generate_today_session"
```

---

## Task 6 — Init script: `scripts/seed_climbers_init.py`

**Files:**
- Create: `scripts/seed_climbers_init.py`
- Create: `scripts/__init__.py` (empty marker)
- Test: `tests/test_seed_climbers.py` (append)

- [ ] **Step 1: Create scripts/__init__.py and append failing tests**

Create empty `scripts/__init__.py`:

```bash
mkdir -p scripts
touch scripts/__init__.py
```

Append to `tests/test_seed_climbers.py`:

```python
class InitScriptTests(unittest.TestCase):
    """End-to-end: running the init script inserts 10 users + history,
    is idempotent on re-run, and seed users have un-loginable hashes."""

    def setUp(self):
        # Clean any prior seed state
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM users WHERE is_seed = TRUE;")
                conn.commit()

    def tearDown(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM users WHERE is_seed = TRUE;")
                conn.commit()

    def _count_seed_users(self) -> int:
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM users WHERE is_seed = TRUE;")
                return cur.fetchone()[0]

    def _count_seed_training_logs(self) -> int:
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """SELECT COUNT(*) FROM training_logs tl
                       JOIN users u ON u.id = tl.user_id
                       WHERE u.is_seed = TRUE;"""
                )
                return cur.fetchone()[0]

    def test_init_creates_10_seed_users(self):
        from scripts.seed_climbers_init import main
        main()
        self.assertEqual(self._count_seed_users(), 10)

    def test_init_creates_training_logs(self):
        from scripts.seed_climbers_init import main
        main()
        # ~30 days × 10 personas with varying probability. Should be > 50.
        count = self._count_seed_training_logs()
        self.assertGreater(count, 50, f"only {count} training logs generated")

    def test_init_is_idempotent(self):
        """Re-running init does not duplicate users or training_logs."""
        from scripts.seed_climbers_init import main
        main()
        first_users = self._count_seed_users()
        first_logs = self._count_seed_training_logs()
        main()
        self.assertEqual(self._count_seed_users(), first_users)
        self.assertEqual(self._count_seed_training_logs(), first_logs)

    def test_init_creates_athlete_profiles(self):
        from scripts.seed_climbers_init import main
        main()
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """SELECT COUNT(*) FROM athlete_profiles ap
                       JOIN users u ON u.id = ap.user_id
                       WHERE u.is_seed = TRUE;"""
                )
                self.assertEqual(cur.fetchone()[0], 10)

    def test_seed_users_have_unloginable_password_hash(self):
        from scripts.seed_climbers_init import main
        main()
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT password_hash FROM users WHERE is_seed = TRUE LIMIT 1;"
                )
                pw_hash = cur.fetchone()[0]
        # Hash is a real bcrypt hash (not NULL — schema requires NOT NULL),
        # but the underlying password is random bytes nobody knows.
        self.assertIsNotNone(pw_hash)
        self.assertTrue(pw_hash.startswith("$2"), f"not a bcrypt hash: {pw_hash[:10]}...")
```

- [ ] **Step 2: Run, confirm FAIL**

Run: `.venv/bin/python -m unittest tests.test_seed_climbers.InitScriptTests -v 2>&1 | tail -20`
Expected: FAIL — `ModuleNotFoundError: No module named 'scripts.seed_climbers_init'`.

- [ ] **Step 3: Write the init script**

Create `scripts/seed_climbers_init.py`:

```python
"""One-time idempotent seed for leaderboard synthetic climbers.

Run with:
    .venv/bin/python -m scripts.seed_climbers_init

Safe to re-run: skips users that already exist (by email) and skips
training_logs that already exist (by user_id+date UNIQUE INDEX).

See docs/superpowers/specs/2026-05-13-leaderboard-seed-climbers-design.md
"""
from __future__ import annotations

import secrets
import sys
import os
from datetime import datetime, timedelta

# Make the project root importable when running as `python -m`
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import bcrypt

from database import _connect, init_db
from src.seed_climbers import SEED_PERSONAS, generate_initial_history


def _unloginable_hash() -> str:
    """A real bcrypt hash of random bytes nobody can know."""
    return bcrypt.hashpw(secrets.token_bytes(32), bcrypt.gensalt(rounds=4)).decode()


def main() -> None:
    # Ensure migrations are in place before we insert anything.
    init_db()

    inserted_users = 0
    inserted_logs = 0

    with _connect() as conn:
        with conn.cursor() as cur:
            for i, persona in enumerate(SEED_PERSONAS, start=1):
                email = f"seed+{i}@coretriage.local"
                pw_hash = _unloginable_hash()
                created_at = datetime.utcnow() - timedelta(days=30)

                # 1. Insert user (ON CONFLICT email DO NOTHING)
                cur.execute(
                    """
                    INSERT INTO users (
                        email, password_hash, is_seed, display_name,
                        avatar_icon, avatar_color, leaderboard_private, tier,
                        disclaimer_accepted, disclaimer_accepted_at,
                        email_verified, created_at
                    )
                    VALUES (%s, %s, TRUE, %s, %s, %s, FALSE, 'free',
                            TRUE, NOW(), FALSE, %s)
                    ON CONFLICT (email) DO NOTHING
                    RETURNING id;
                    """,
                    (email, pw_hash, persona.handle, persona.avatar_icon,
                     persona.avatar_color, created_at),
                )
                row = cur.fetchone()
                if row is None:
                    # User already exists — look up id
                    cur.execute("SELECT id FROM users WHERE email = %s;", (email,))
                    user_id = cur.fetchone()[0]
                else:
                    user_id = row[0]
                    inserted_users += 1

                # 2. Insert athlete_profile (ON CONFLICT user_id DO NOTHING)
                cur.execute(
                    """
                    INSERT INTO athlete_profiles (user_id, experience_level)
                    VALUES (%s, %s)
                    ON CONFLICT (user_id) DO NOTHING;
                    """,
                    (user_id, persona.cohort),
                )

                # 3. Backfill training_logs (ON CONFLICT user_id+date DO NOTHING)
                history = generate_initial_history(persona, days=30)
                for row in history:
                    cur.execute(
                        """
                        INSERT INTO training_logs
                            (user_id, date, session_type, duration_min, intensity, grades_sent, notes)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (user_id, date) DO NOTHING;
                        """,
                        (user_id, row["date"], row["session_type"],
                         row["duration_min"], row["intensity"],
                         row["grades_sent"], row["notes"]),
                    )
                    if cur.rowcount > 0:
                        inserted_logs += 1

        conn.commit()

    print(f"Seed climbers init complete: {inserted_users} new users, {inserted_logs} new training_logs.")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run tests, confirm PASS**

Run: `.venv/bin/python -m unittest tests.test_seed_climbers.InitScriptTests -v 2>&1 | tail -20`
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Run a smoke test (manual invocation)**

Run: `.venv/bin/python -m scripts.seed_climbers_init`
Expected: prints `Seed climbers init complete: 0 new users, 0 new training_logs.` (since the tests already populated and cleaned).

- [ ] **Step 6: Commit**

```bash
git add scripts/__init__.py scripts/seed_climbers_init.py tests/test_seed_climbers.py
git commit -m "Init script: idempotent seed climbers + 30-day training_logs backfill"
```

---

## Task 7 — Tick script: `scripts/seed_climbers_tick.py`

**Files:**
- Create: `scripts/seed_climbers_tick.py`
- Test: `tests/test_seed_climbers.py` (append)

- [ ] **Step 1: Append failing tests**

Append to `tests/test_seed_climbers.py`:

```python
class TickScriptTests(unittest.TestCase):
    """Daily tick: probabilistically inserts at most one session per
    seed climber per day. Idempotent on re-run same day."""

    def setUp(self):
        # Start with a clean seed set, then init.
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM users WHERE is_seed = TRUE;")
                conn.commit()
        from scripts.seed_climbers_init import main as init_main
        init_main()

    def tearDown(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM users WHERE is_seed = TRUE;")
                conn.commit()

    def _count_today_seed_logs(self):
        from datetime import date
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """SELECT COUNT(*) FROM training_logs tl
                       JOIN users u ON u.id = tl.user_id
                       WHERE u.is_seed = TRUE AND tl.date = %s;""",
                    (date.today(),),
                )
                return cur.fetchone()[0]

    def test_tick_inserts_some_sessions_today(self):
        from scripts.seed_climbers_tick import main as tick_main
        # First clear any "today" rows that the init backfill happened to insert
        # for date.today() so we measure the tick's effect cleanly.
        with _connect() as conn:
            with conn.cursor() as cur:
                from datetime import date
                cur.execute(
                    """DELETE FROM training_logs WHERE user_id IN
                       (SELECT id FROM users WHERE is_seed = TRUE) AND date = %s;""",
                    (date.today(),),
                )
                conn.commit()
        tick_main()
        # Probabilistic — expect at least 1 of 10 climbers trained today
        # (deterministic per persona+today seed, so this is repeatable).
        count = self._count_today_seed_logs()
        self.assertGreaterEqual(count, 1,
                                f"expected at least 1 seed log today, got {count}")
        self.assertLessEqual(count, 10,
                             f"expected at most 10 seed logs today, got {count}")

    def test_tick_is_idempotent_same_day(self):
        from scripts.seed_climbers_tick import main as tick_main
        tick_main()
        first = self._count_today_seed_logs()
        tick_main()
        self.assertEqual(self._count_today_seed_logs(), first,
                         "tick is not idempotent on re-run same day")
```

- [ ] **Step 2: Run, confirm FAIL**

Run: `.venv/bin/python -m unittest tests.test_seed_climbers.TickScriptTests -v 2>&1 | tail -20`
Expected: FAIL — `ModuleNotFoundError: No module named 'scripts.seed_climbers_tick'`.

- [ ] **Step 3: Write the tick script**

Create `scripts/seed_climbers_tick.py`:

```python
"""Daily cron entrypoint for seed climbers.

Run with:
    .venv/bin/python -m scripts.seed_climbers_tick

For each seed persona, probabilistically inserts ONE training_log for today.
Idempotent: UNIQUE(user_id, date) on training_logs makes re-runs a no-op.

Schedule via Railway scheduled tasks (or any cron):
    0 6 * * *   .venv/bin/python -m scripts.seed_climbers_tick

See docs/superpowers/specs/2026-05-13-leaderboard-seed-climbers-design.md
"""
from __future__ import annotations

import sys
import os
from datetime import date

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import _connect
from src.seed_climbers import SEED_PERSONAS, generate_today_session


def main() -> None:
    today = date.today()
    inserted = 0
    skipped_rest = 0

    with _connect() as conn:
        with conn.cursor() as cur:
            for i, persona in enumerate(SEED_PERSONAS, start=1):
                email = f"seed+{i}@coretriage.local"

                # Look up user_id; skip if persona row doesn't exist yet
                # (this can happen if tick runs before init).
                cur.execute("SELECT id FROM users WHERE email = %s AND is_seed = TRUE;",
                            (email,))
                row = cur.fetchone()
                if row is None:
                    continue
                user_id = row[0]

                session = generate_today_session(persona, today=today)
                if session is None:
                    skipped_rest += 1
                    continue

                cur.execute(
                    """
                    INSERT INTO training_logs
                        (user_id, date, session_type, duration_min, intensity, grades_sent, notes)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (user_id, date) DO NOTHING;
                    """,
                    (user_id, session["date"], session["session_type"],
                     session["duration_min"], session["intensity"],
                     session["grades_sent"], session["notes"]),
                )
                if cur.rowcount > 0:
                    inserted += 1

        conn.commit()

    print(f"Seed climbers tick complete: {inserted} new logs, {skipped_rest} rest days.")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run tests, confirm PASS**

Run: `.venv/bin/python -m unittest tests.test_seed_climbers.TickScriptTests -v 2>&1 | tail -10`
Expected: PASS — both tests green.

- [ ] **Step 5: Commit**

```bash
git add scripts/seed_climbers_tick.py tests/test_seed_climbers.py
git commit -m "Tick script: daily idempotent training_log insertion for seed climbers"
```

---

## Task 8 — Auth defense-in-depth: block seed user login

**Files:**
- Modify: `main.py` (inside the `/api/auth/login` handler around line 545)
- Test: `tests/test_seed_climbers.py` (append)

- [ ] **Step 1: Append failing test**

Append to `tests/test_seed_climbers.py`:

```python
class SeedLoginBlockedTests(unittest.TestCase):
    """A seed user must never authenticate, even if someone discovers the
    sentinel email pattern. The password_hash is unguessable random bytes,
    but defense-in-depth adds an explicit early return."""

    def setUp(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM users WHERE is_seed = TRUE;")
                conn.commit()
        from scripts.seed_climbers_init import main as init_main
        init_main()

    def tearDown(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM users WHERE is_seed = TRUE;")
                conn.commit()

    def test_login_with_seed_email_returns_401(self):
        from fastapi.testclient import TestClient
        from main import app
        client = TestClient(app)
        resp = client.post(
            "/api/auth/login",
            json={"email": "seed+1@coretriage.local", "password": "guess"},
        )
        self.assertEqual(resp.status_code, 401, f"expected 401, got {resp.status_code}: {resp.text}")
```

- [ ] **Step 2: Run, confirm FAIL (or possibly pass-by-accident)**

Run: `.venv/bin/python -m unittest tests.test_seed_climbers.SeedLoginBlockedTests -v 2>&1 | tail -10`
Expected: FAIL OR PASS — the random bcrypt hash means `verify_password("guess", hash)` returns False naturally, so login should already 401. But we want defense-in-depth in case anyone ever resets a seed user's password. The test still locks in the contract.

If it passes already: skip Step 3 → Step 4 (still commit the test).

- [ ] **Step 3: Add the defense-in-depth early return**

In `main.py`, find the `/api/auth/login` handler (around line 529-560). Inside the handler, after the user row is fetched but before `verify_password`, add an early return for seed users. The exact insertion depends on the existing code; look for the `verify_password` call (around line 545) and add immediately BEFORE it:

```python
    # Defense in depth: seed climbers have unguessable random password_hashes
    # but we add an explicit reject in case someone resets one.
    if user and len(user) > 6 and user[6]:  # is_seed column (index depends on get_user_by_email return shape)
        raise HTTPException(status_code=401, detail="Invalid email or password")
```

**IMPORTANT**: The exact column index depends on `get_user_by_email`'s return tuple. Open `database.py` (around line 305) and check what tuple shape `get_user_by_email` returns. If the function doesn't currently return `is_seed`, you have two options:
- (A) Extend `get_user_by_email` to include `is_seed` and update all callers
- (B) Do a separate `SELECT is_seed FROM users WHERE id = %s` call in the auth handler

Option B is less risky (no caller-update domino). Use this code instead:

```python
    # Defense in depth: seed climbers have unguessable random password_hashes
    # but we add an explicit reject in case someone resets one.
    if user:
        from database import _connect
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT is_seed FROM users WHERE email = %s;", (req.email,))
                row = cur.fetchone()
                if row and row[0] is True:
                    raise HTTPException(status_code=401, detail="Invalid email or password")
```

Place this AFTER `user = get_user_by_email(req.email)` and BEFORE the `verify_password` call.

- [ ] **Step 4: Run test, confirm PASS**

Run: `.venv/bin/python -m unittest tests.test_seed_climbers.SeedLoginBlockedTests -v 2>&1 | tail -10`
Expected: PASS.

- [ ] **Step 5: Run full auth/integration suite to confirm no regression**

Run: `.venv/bin/python -m unittest tests.test_seed_climbers tests.test_bucket tests.test_bucket_content tests.test_finger_triage tests.test_triage_calibration 2>&1 | tail -10`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add main.py tests/test_seed_climbers.py
git commit -m "Auth: defense-in-depth — explicit 401 for is_seed users on login"
```

---

## Task 9 — End-to-end: leaderboard surfaces seed climbers

**Files:**
- Test: `tests/test_seed_climbers.py` (append)

No production code change in this task — purely a verification test that the existing leaderboard query naturally returns seed climbers without any modifications.

- [ ] **Step 1: Append the end-to-end test**

Append to `tests/test_seed_climbers.py`:

```python
class LeaderboardSeedSurfaceTests(unittest.TestCase):
    """End-to-end: the existing leaderboard query returns seed climbers
    naturally. No code changes to database.get_leaderboard or the API."""

    def setUp(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM users WHERE is_seed = TRUE;")
                conn.commit()
        from scripts.seed_climbers_init import main as init_main
        init_main()

    def tearDown(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM users WHERE is_seed = TRUE;")
                conn.commit()

    def test_leaderboard_all_window_returns_seed_climbers(self):
        from database import get_leaderboard
        # Create a viewer user so the leaderboard has a "viewer_user_id"
        # — they'll just be unranked since they have no training_logs.
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """INSERT INTO users (email, password_hash, display_name)
                       VALUES ('viewer@test.local', 'x', 'Viewer')
                       ON CONFLICT (email) DO UPDATE SET display_name = 'Viewer'
                       RETURNING id;"""
                )
                viewer_id = cur.fetchone()[0]
                # Give viewer an intermediate cohort
                cur.execute(
                    """INSERT INTO athlete_profiles (user_id, experience_level)
                       VALUES (%s, 'intermediate')
                       ON CONFLICT (user_id) DO UPDATE SET experience_level = 'intermediate';""",
                    (viewer_id,),
                )
                conn.commit()

        result = get_leaderboard(viewer_user_id=viewer_id, window="all",
                                 cohort="global", limit=20)
        top = result.get("top", [])
        # At least 10 seed climbers (real users may also exist; that's fine)
        seed_names = {p.handle for p in __import__("src.seed_climbers", fromlist=["SEED_PERSONAS"]).SEED_PERSONAS}
        surfaced = [r for r in top if r["display_name"] in seed_names]
        self.assertGreaterEqual(len(surfaced), 1,
                                f"expected ≥1 seed climber in global leaderboard; got: {[r['display_name'] for r in top]}")

    def test_leaderboard_per_cohort_each_has_at_least_one(self):
        """Every cohort with personas should see at least 1 climber."""
        from database import get_leaderboard
        # Viewer setup — same as above, plus 1 viewer per cohort.
        from src.seed_climbers import SEED_PERSONAS
        for cohort in {p.cohort for p in SEED_PERSONAS}:
            with _connect() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """INSERT INTO users (email, password_hash, display_name)
                           VALUES (%s, 'x', 'CohortViewer')
                           ON CONFLICT (email) DO UPDATE SET display_name = 'CohortViewer'
                           RETURNING id;""",
                        (f"viewer-{cohort}@test.local",),
                    )
                    viewer_id = cur.fetchone()[0]
                    cur.execute(
                        """INSERT INTO athlete_profiles (user_id, experience_level)
                           VALUES (%s, %s)
                           ON CONFLICT (user_id) DO UPDATE SET experience_level = EXCLUDED.experience_level;""",
                        (viewer_id, cohort),
                    )
                    conn.commit()

            result = get_leaderboard(viewer_user_id=viewer_id, window="all",
                                     cohort=cohort, limit=10)
            self.assertGreater(len(result.get("top", [])), 0,
                               f"cohort {cohort} leaderboard is empty")
```

- [ ] **Step 2: Run tests, confirm PASS**

Run: `.venv/bin/python -m unittest tests.test_seed_climbers.LeaderboardSeedSurfaceTests -v 2>&1 | tail -15`
Expected: PASS — both tests green.

- [ ] **Step 3: Commit**

```bash
git add tests/test_seed_climbers.py
git commit -m "Test: end-to-end leaderboard surfaces seed climbers across all cohorts"
```

---

## Task 10 — Operational runbook

**Files:**
- Create: `docs/runbook/seed_climbers.md`

This is documentation only — no code, no tests. Captures the run order and Railway cron config for the human operator.

- [ ] **Step 1: Create the runbook**

```bash
mkdir -p docs/runbook
```

Create `docs/runbook/seed_climbers.md`:

```markdown
# Seed Climbers Runbook

Bootstraps the Train tab leaderboard with 10 synthetic climber accounts so
new real users have peers to compare against. See the design spec:
[docs/superpowers/specs/2026-05-13-leaderboard-seed-climbers-design.md](../superpowers/specs/2026-05-13-leaderboard-seed-climbers-design.md).

## First-time setup

After the DB migrations land (they run automatically via `init_db()` on app
startup), run the init script ONCE on production:

```bash
.venv/bin/python -m scripts.seed_climbers_init
```

Expected output:

```
Seed climbers init complete: 10 new users, ~50-90 new training_logs.
```

This is idempotent — safe to re-run if something goes wrong. Re-running on a
fully-seeded DB outputs `0 new users, 0 new training_logs.`

## Daily cron (Railway)

Add a scheduled task in the Railway dashboard:

| Field | Value |
|---|---|
| Schedule | `0 6 * * *` (06:00 UTC daily) |
| Command | `python -m scripts.seed_climbers_tick` |
| Service | (same service that runs the FastAPI backend) |

The tick is idempotent — running it twice in one day is a no-op. Missing a
day produces no visible regression; the seed climbers just look like they
took a rest day.

## Verification

Open `/api/training/leaderboard?window=all&cohort=global` (authenticated)
and confirm seed climbers appear in the response. Per cohort:

- `cohort=beginner` → 3 seed climbers (Mira K., Reza A., Lior B.)
- `cohort=intermediate` → 3 (Eshan P., Yuki H., Tomi V.)
- `cohort=advanced` → 3 (Ariadne L., Linnea S., Beck M.)
- `cohort=elite` → 1 (Jasper M.)

## Teardown

When real users reach critical mass and seed climbers are no longer needed:

```sql
DELETE FROM users WHERE is_seed = TRUE;
```

Cascades to `athlete_profiles`, `training_logs`, `seed_progression` via FK.
Disable the Railway scheduled task. The leaderboard returns to whatever
real-user state exists at that moment.

## Adding or rotating personas

Edit `src/seed_climbers.py` and modify `SEED_PERSONAS`. Re-run
`seed_climbers_init.py` — new personas get inserted; existing ones unchanged.

**Do NOT** rename an existing persona — the email sentinel
(`seed+N@coretriage.local`) keys to the list index. Renaming would orphan
the prior account. To safely rename: bump the persona to a new index, then
manually delete the old `seed+N@` user from the DB.
```

- [ ] **Step 2: Commit**

```bash
git add docs/runbook/seed_climbers.md
git commit -m "Runbook: seed climbers operational guide (init, cron, teardown)"
```

---

## Task 11 — End-to-end verification + push

**Files:** None modified. Verification + final push.

- [ ] **Step 1: Run the full Python test suite**

Run: `.venv/bin/python -m unittest tests.test_bucket tests.test_bucket_content tests.test_triage_calibration tests.test_finger_triage tests.test_seed_climbers 2>&1 | tail -10`
Expected: all green. Report counts and any failures.

- [ ] **Step 2: Run a fresh init + tick locally**

```bash
.venv/bin/python -c "from database import _connect; conn = _connect(); cur = conn.cursor(); cur.execute('DELETE FROM users WHERE is_seed = TRUE;'); conn.commit(); print('clean.')"
.venv/bin/python -m scripts.seed_climbers_init
.venv/bin/python -m scripts.seed_climbers_tick
```

Expected output:
```
clean.
Seed climbers init complete: 10 new users, ~50-90 new training_logs.
Seed climbers tick complete: X new logs, Y rest days. (X+Y == 10)
```

- [ ] **Step 3: Hit the leaderboard endpoint with a real curl**

Start the backend if not already running:
```bash
uvicorn main:app --port 8000 &
```

Then create a viewer user and hit the leaderboard. (Use the existing register endpoint.) A simpler shortcut is to call the DB helper directly:

```bash
.venv/bin/python -c "
from database import _connect, get_leaderboard
with _connect() as conn:
    with conn.cursor() as cur:
        cur.execute('SELECT id FROM users WHERE is_seed = TRUE LIMIT 1;')
        viewer_id = cur.fetchone()[0]
result = get_leaderboard(viewer_user_id=viewer_id, window='all', cohort='global', limit=15)
for row in result['top']:
    print(f\"  #{row['rank']:>2} {row['display_name']:<15} {row['hours']:>5.1f} hrs\")
"
```

Expected: prints ranked seed climbers with hours.

- [ ] **Step 4: Confirm git is clean and push**

```bash
git status
git log --oneline origin/main..HEAD
git push origin main
```

Expected: 11 task commits + the spec/plan commits push cleanly to `origin/main`.

---

## Self-review checklist (for the implementing engineer)

After all tasks land, confirm:

1. ✅ `is_seed BOOLEAN NOT NULL DEFAULT FALSE` column exists on `users`.
2. ✅ Unique index on `training_logs (user_id, date)` exists — either full or partial.
3. ✅ `seed_progression` table exists with the 4 required columns.
4. ✅ `SEED_PERSONAS` in `src/seed_climbers.py` has exactly 10 entries, 3/3/3/1 across cohorts.
5. ✅ `generate_initial_history()` and `generate_today_session()` produce dicts with `date / session_type / duration_min / intensity / grades_sent / notes`.
6. ✅ `scripts/seed_climbers_init.py` is idempotent (re-run inserts 0 new rows).
7. ✅ `scripts/seed_climbers_tick.py` is idempotent (re-run same day inserts 0 new rows).
8. ✅ Seed users have un-loginable bcrypt hashes; login returns 401.
9. ✅ `/api/training/leaderboard` returns seed climbers in all four cohorts.
10. ✅ All existing test suites continue to pass.
11. ✅ Runbook published at `docs/runbook/seed_climbers.md`.
12. ✅ Frontend unchanged.
