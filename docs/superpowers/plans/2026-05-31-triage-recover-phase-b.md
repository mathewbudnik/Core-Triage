# Triage Redesign · Phase B · Recover + Progression Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `RecoverActiveView.jsx` (currently a sticky-header + status-pills + checklist layout driven by `rehabHeuristic.js`'s calendar-only phase logic) with the redesigned 4-state Recover landing — *pre-check-in*, *normal day*, *phase advance ready*, *flare detected* — backed by a real progression engine that consumes daily check-ins and exercise completion to drive adaptive phase transitions.

**Architecture:**
- **Backend** — new `rehab_checkins` table, new `rehab_engine.py` module of pure rule functions, new endpoints (`POST/GET /api/rehab/checkins`, `GET /api/rehab/state`, `POST /api/rehab/advance`, `POST /api/rehab/regress`). Existing `/api/rehab/progress` (daily exercise checkoffs) stays unchanged.
- **Frontend** — new `useRehabEngine` hook + 9 new components under `frontend/src/components/redesign/recover/`. New `RecoverActiveViewRedesign` orchestrator replaces the existing `RecoverActiveView.jsx` at the import site in `RecoverTab.jsx`.

**Tech Stack:** FastAPI + Postgres (psycopg) backend, React 18 + Vite frontend, pytest for backend, Vitest 4 for frontend `lib/` unit tests. No `@testing-library` — components verified via dev server.

**Spec:** `docs/superpowers/specs/2026-05-31-triage-recover-redesign-design.md` (sections "Surface 3: Recover landing", "Progression engine", "Data model").

**Depends on:** Phase A plan completed — visual atoms (`StageFrame`, `ProgressGradientBar`, `ChipChoice`, `RowChoice`), motion constants (`lib/redesignMotion.js`), Tailwind tokens (`ct-moss-active`, `ct-amber-warm`, `ct-cream-warm`, `ct-forest-base`, `ct-forest-mid`, `ct-ember-shadow`).

---

## File Structure

### Created (backend)

| File | Responsibility |
|------|---------------|
| `rehab_engine.py` | Pure-function progression rules: advance / regress / per-exercise / streak |
| `tests/test_rehab_engine.py` | Unit tests for every rule + boundary case |
| `tests/test_rehab_checkins.py` | Integration tests for the new endpoints |

### Created (frontend)

| File | Responsibility |
|------|---------------|
| `frontend/src/hooks/useRehabEngine.js` | Fetches `/api/rehab/state`, refreshes on check-in / check-off |
| `frontend/src/components/redesign/recover/DailyCheckin.jsx` | 3-chip Better / Same / Worse |
| `frontend/src/components/redesign/recover/CheckinSummaryRow.jsx` | Collapsed post-checkin summary |
| `frontend/src/components/redesign/recover/DayHero.jsx` | "Day N / M" anchor with lede |
| `frontend/src/components/redesign/recover/ExerciseRow.jsx` | Single exercise with status dot + "Ready to progress" hint |
| `frontend/src/components/redesign/recover/RampHint.jsx` | Forecast text ("Two more 'Better' days...") |
| `frontend/src/components/redesign/recover/PhaseAdvancePrompt.jsx` | Moss-green prompt card |
| `frontend/src/components/redesign/recover/FlareWarning.jsx` | Terra-tinted warning card |
| `frontend/src/components/redesign/recover/StreakChip.jsx` | Amber top-right pill |
| `frontend/src/components/redesign/recover/RecoverActiveViewRedesign.jsx` | 4-state orchestrator |

### Modified

| File | Change |
|------|--------|
| `database.py` (lines ~425-445 area) | Add `CREATE TABLE IF NOT EXISTS rehab_checkins` block + index |
| `database.py` (end) | Add helpers: `insert_checkin`, `get_checkins_range`, `get_completion_count`, `get_recent_completion_by_key` |
| `main.py` | Add 5 new endpoints |
| `frontend/src/api.js` | Add client wrappers for the new endpoints |
| `frontend/src/components/RecoverTab.jsx` | Swap `RecoverActiveView` import for `RecoverActiveViewRedesign` |

---

## Task 1: rehab_checkins table

**Files:**
- Modify: `database.py` (~line 445, after the existing `rehab_progress` block)

Add the table inline in the existing `init_db()` schema-creation block. Pattern matches the existing tables.

- [ ] **Step 1: Add the table + index**

Open `database.py` and insert after the `rehab_progress` index block (line ~445), before the Stripe block (line ~447):

```python
            # ── Rehab daily check-ins (progression engine signal) ───────────
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS rehab_checkins (
                    id            SERIAL PRIMARY KEY,
                    user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    region        TEXT NOT NULL,
                    checkin_date  DATE NOT NULL,
                    status        TEXT NOT NULL CHECK (status IN ('better', 'same', 'worse')),
                    pain_score    SMALLINT CHECK (pain_score BETWEEN 0 AND 10),
                    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UNIQUE (user_id, region, checkin_date)
                );
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS rehab_checkins_user_date_idx
                ON rehab_checkins (user_id, checkin_date DESC);
                """
            )
```

- [ ] **Step 2: Restart the backend to apply**

Run: `pkill -f "uvicorn main:app" 2>/dev/null; uvicorn main:app --reload &` (or however the project usually starts it). Wait 2 seconds. Run: `psql $DATABASE_URL -c '\d rehab_checkins'`
Expected: table description shows the columns + constraint.

- [ ] **Step 3: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add database.py
git -C /Users/mathewbudnik/coretriage commit -m "feat(db): rehab_checkins table for daily check-in progression signal"
```

---

## Task 2: DB helpers — insert_checkin + get_checkins_range

**Files:**
- Modify: `database.py` (end of file, after the existing `uncheck_rehab_exercise` helper)
- Create: `tests/test_rehab_checkins_db.py`

- [ ] **Step 1: Write failing tests**

Create `tests/test_rehab_checkins_db.py`:

```python
"""Unit tests for the rehab_checkins DB helpers.

Uses the same fixtures as the rest of the test suite — creates a temp user,
inserts check-ins, asserts query behavior.
"""
import pytest
from datetime import date, timedelta

from database import (
    get_db_connection,
    insert_checkin,
    get_checkins_range,
    create_user,
)


@pytest.fixture
def user_id(db_clean):
    """Provision a temp user. db_clean is an existing fixture that wipes
    test data between tests — match the fixture used by tests/test_awards.py
    or similar. If your repo doesn't have db_clean, use the conftest fixture
    that exists."""
    uid = create_user(email='checkin-test@example.com', password_hash='x')
    return uid


def test_insert_checkin_records_status_and_pain(user_id):
    insert_checkin(user_id=user_id, region='Finger', checkin_date='2026-05-31', status='better', pain_score=3)
    rows = get_checkins_range(user_id=user_id, region='Finger', start_date='2026-05-31', end_date='2026-05-31')
    assert len(rows) == 1
    assert rows[0]['status'] == 'better'
    assert rows[0]['pain_score'] == 3


def test_insert_checkin_accepts_null_pain(user_id):
    insert_checkin(user_id=user_id, region='Finger', checkin_date='2026-05-31', status='same', pain_score=None)
    rows = get_checkins_range(user_id=user_id, region='Finger', start_date='2026-05-31', end_date='2026-05-31')
    assert rows[0]['pain_score'] is None


def test_insert_checkin_upserts_same_day(user_id):
    insert_checkin(user_id=user_id, region='Finger', checkin_date='2026-05-31', status='better', pain_score=2)
    insert_checkin(user_id=user_id, region='Finger', checkin_date='2026-05-31', status='worse', pain_score=7)
    rows = get_checkins_range(user_id=user_id, region='Finger', start_date='2026-05-31', end_date='2026-05-31')
    assert len(rows) == 1
    assert rows[0]['status'] == 'worse'
    assert rows[0]['pain_score'] == 7


def test_get_checkins_range_returns_in_date_desc_order(user_id):
    insert_checkin(user_id=user_id, region='Finger', checkin_date='2026-05-28', status='better')
    insert_checkin(user_id=user_id, region='Finger', checkin_date='2026-05-30', status='same')
    insert_checkin(user_id=user_id, region='Finger', checkin_date='2026-05-29', status='worse')
    rows = get_checkins_range(user_id=user_id, region='Finger', start_date='2026-05-28', end_date='2026-05-30')
    dates = [r['checkin_date'] for r in rows]
    assert dates == [date(2026, 5, 30), date(2026, 5, 29), date(2026, 5, 28)]


def test_get_checkins_range_scopes_to_region(user_id):
    insert_checkin(user_id=user_id, region='Finger', checkin_date='2026-05-31', status='better')
    insert_checkin(user_id=user_id, region='Wrist',  checkin_date='2026-05-31', status='worse')
    rows = get_checkins_range(user_id=user_id, region='Finger', start_date='2026-05-31', end_date='2026-05-31')
    assert len(rows) == 1
    assert rows[0]['status'] == 'better'


def test_get_checkins_range_scopes_to_user(user_id):
    other_uid = create_user(email='checkin-other@example.com', password_hash='x')
    insert_checkin(user_id=user_id,   region='Finger', checkin_date='2026-05-31', status='better')
    insert_checkin(user_id=other_uid, region='Finger', checkin_date='2026-05-31', status='worse')
    rows = get_checkins_range(user_id=user_id, region='Finger', start_date='2026-05-31', end_date='2026-05-31')
    assert len(rows) == 1
    assert rows[0]['status'] == 'better'
```

- [ ] **Step 2: Run tests to verify failure**

Run: `pytest tests/test_rehab_checkins_db.py -v`
Expected: FAIL — `ImportError: cannot import name 'insert_checkin' from 'database'`.

- [ ] **Step 3: Implement the helpers**

Append to `database.py` (after `uncheck_rehab_exercise`):

```python
def insert_checkin(
    *,
    user_id: int,
    region: str,
    checkin_date: str,
    status: str,
    pain_score: int | None = None,
) -> None:
    """Upsert a daily check-in for (user, region, date).

    `status` must be one of 'better' | 'same' | 'worse' — enforced by the CHECK
    constraint. `pain_score` is optional (0–10 if provided).
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO rehab_checkins (user_id, region, checkin_date, status, pain_score)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (user_id, region, checkin_date)
                DO UPDATE SET status = EXCLUDED.status,
                              pain_score = EXCLUDED.pain_score,
                              created_at = NOW();
                """,
                (user_id, region, checkin_date, status, pain_score),
            )
        conn.commit()


def get_checkins_range(
    *,
    user_id: int,
    region: str,
    start_date: str,
    end_date: str,
) -> list[dict[str, Any]]:
    """Return check-ins for (user, region) in [start_date, end_date] inclusive.

    Rows ordered by checkin_date DESC. Each row dict: { checkin_date,
    status, pain_score, created_at }.
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT checkin_date, status, pain_score, created_at
                FROM rehab_checkins
                WHERE user_id = %s AND region = %s
                  AND checkin_date BETWEEN %s AND %s
                ORDER BY checkin_date DESC;
                """,
                (user_id, region, start_date, end_date),
            )
            return [
                {
                    'checkin_date': r[0],
                    'status':       r[1],
                    'pain_score':   r[2],
                    'created_at':   r[3],
                }
                for r in cur.fetchall()
            ]
```

- [ ] **Step 4: Run tests to verify pass**

Run: `pytest tests/test_rehab_checkins_db.py -v`
Expected: PASS — `6 passed`.

- [ ] **Step 5: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add database.py tests/test_rehab_checkins_db.py
git -C /Users/mathewbudnik/coretriage commit -m "feat(db): insert_checkin + get_checkins_range helpers + 6 tests"
```

---

## Task 3: DB helper — get_completion_count

**Files:**
- Modify: `database.py` (after `get_checkins_range`)
- Modify: `tests/test_rehab_checkins_db.py` (append more tests)

A helper the engine needs: count of distinct dates the user completed *at least one* exercise in `[start, end]` for a region. Also: count of times a specific `exercise_key` was completed in that window. Engine uses both.

- [ ] **Step 1: Add tests**

Append to `tests/test_rehab_checkins_db.py`:

```python
from database import get_completion_count, get_exercise_completion_streak, check_rehab_exercise


def test_get_completion_count_returns_distinct_dates_with_any_completion(user_id):
    check_rehab_exercise(user_id=user_id, exercise_key='Finger:1:Wrist flexor stretch', region='Finger', phase=1, date='2026-05-28')
    check_rehab_exercise(user_id=user_id, exercise_key='Finger:1:Wrist circles',        region='Finger', phase=1, date='2026-05-28')  # same day
    check_rehab_exercise(user_id=user_id, exercise_key='Finger:1:Wrist flexor stretch', region='Finger', phase=1, date='2026-05-29')
    n = get_completion_count(user_id=user_id, region='Finger', start_date='2026-05-28', end_date='2026-05-31')
    assert n == 2  # two distinct dates with any completion


def test_get_completion_count_scopes_to_region(user_id):
    check_rehab_exercise(user_id=user_id, exercise_key='Finger:1:A', region='Finger', phase=1, date='2026-05-28')
    check_rehab_exercise(user_id=user_id, exercise_key='Wrist:1:B',  region='Wrist',  phase=1, date='2026-05-28')
    n = get_completion_count(user_id=user_id, region='Finger', start_date='2026-05-28', end_date='2026-05-31')
    assert n == 1


def test_get_exercise_completion_streak_counts_consecutive_days_back_from_today(user_id):
    today = '2026-05-31'
    for d in ['2026-05-27', '2026-05-28', '2026-05-29', '2026-05-30', '2026-05-31']:
        check_rehab_exercise(user_id=user_id, exercise_key='Finger:1:X', region='Finger', phase=1, date=d)
    n = get_exercise_completion_streak(user_id=user_id, exercise_key='Finger:1:X', today=today)
    assert n == 5


def test_get_exercise_completion_streak_breaks_on_gap(user_id):
    for d in ['2026-05-29', '2026-05-30', '2026-05-31']:
        check_rehab_exercise(user_id=user_id, exercise_key='Finger:1:X', region='Finger', phase=1, date=d)
    # gap on 2026-05-28
    check_rehab_exercise(user_id=user_id, exercise_key='Finger:1:X', region='Finger', phase=1, date='2026-05-27')
    n = get_exercise_completion_streak(user_id=user_id, exercise_key='Finger:1:X', today='2026-05-31')
    assert n == 3
```

- [ ] **Step 2: Run, verify fail**

Run: `pytest tests/test_rehab_checkins_db.py::test_get_completion_count_returns_distinct_dates_with_any_completion -v`
Expected: FAIL — `cannot import name 'get_completion_count'`.

- [ ] **Step 3: Implement helpers**

Append to `database.py`:

```python
def get_completion_count(
    *,
    user_id: int,
    region: str,
    start_date: str,
    end_date: str,
) -> int:
    """Return the count of distinct dates in [start, end] where the user
    completed at least one rehab_progress row for the given region."""
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT COUNT(DISTINCT completed_date)
                FROM rehab_progress
                WHERE user_id = %s AND region = %s
                  AND completed_date BETWEEN %s AND %s;
                """,
                (user_id, region, start_date, end_date),
            )
            return cur.fetchone()[0]


def get_exercise_completion_streak(
    *,
    user_id: int,
    exercise_key: str,
    today: str,
) -> int:
    """Return the consecutive-days streak of completing `exercise_key`,
    counting backwards from `today` (inclusive). 0 if today wasn't completed."""
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # Fetch all completion dates for this key, descending. Walk them to
            # count the contiguous run from `today` backwards.
            cur.execute(
                """
                SELECT completed_date
                FROM rehab_progress
                WHERE user_id = %s AND exercise_key = %s
                ORDER BY completed_date DESC;
                """,
                (user_id, exercise_key),
            )
            rows = [r[0] for r in cur.fetchall()]
    from datetime import date, timedelta
    if not rows: return 0
    cursor_date = date.fromisoformat(today)
    streak = 0
    for d in rows:
        if d == cursor_date:
            streak += 1
            cursor_date -= timedelta(days=1)
        elif d < cursor_date:
            # Gap → streak ends. We may still have older rows but they're
            # irrelevant for this streak.
            break
        # If d > cursor_date, skip — shouldn't happen given DESC sort + today
        # being the most recent we consider.
    return streak
```

- [ ] **Step 4: Verify tests pass**

Run: `pytest tests/test_rehab_checkins_db.py -v`
Expected: PASS — all tests now pass (10 total).

- [ ] **Step 5: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add database.py tests/test_rehab_checkins_db.py
git -C /Users/mathewbudnik/coretriage commit -m "feat(db): get_completion_count + get_exercise_completion_streak helpers"
```

---

## Task 4: rehab_engine.py — phase advancement rule

**Files:**
- Create: `rehab_engine.py`
- Create: `tests/test_rehab_engine.py`

Pure functions, no DB access. The engine module is fed pre-computed inputs (check-ins list, completion count, etc.) and returns decisions. This keeps it dead-simple to test and reason about.

- [ ] **Step 1: Write tests**

Create `tests/test_rehab_engine.py`:

```python
"""Unit tests for the pure-function progression engine.

Engine functions take pre-computed inputs (check-ins, completion stats) and
return decisions. No DB access. Boundary cases covered explicitly.
"""
from datetime import date

from rehab_engine import (
    phase_can_advance,
    PHASE_MIN_DAYS,
)


# Helpers to build fixture check-ins ────────────────────────────────────────────
def _checkins(*statuses_with_dates):
    """Convert a list of (status, 'YYYY-MM-DD') tuples into engine-ready dicts."""
    return [
        {'status': s, 'checkin_date': date.fromisoformat(d), 'pain_score': None}
        for s, d in statuses_with_dates
    ]


# phase_can_advance ────────────────────────────────────────────────────────────
def test_phase_can_advance_returns_false_when_below_min_days():
    # Phase 1 min days = 10. User is on day 8.
    assert phase_can_advance(
        phase=1, day_in_phase=8,
        checkins_last_7d=_checkins(*[('better', '2026-05-25')] * 4),
        completion_count_last_7d=6,
    ) is False


def test_phase_can_advance_returns_false_when_completion_below_70pct():
    # User on day 12 of phase 1 (above min). 7-day window expects ~28 completions
    # (4 exercises × 7 days). 70% threshold = 19.6 → need >= 20. Pass 15.
    assert phase_can_advance(
        phase=1, day_in_phase=12,
        checkins_last_7d=_checkins(('better', '2026-05-31'), ('better', '2026-05-30'), ('better', '2026-05-29')),
        completion_count_last_7d=4,  # only 4 days had any completion → way below 70%
    ) is False


def test_phase_can_advance_returns_false_with_fewer_than_3_better_checkins():
    assert phase_can_advance(
        phase=1, day_in_phase=12,
        checkins_last_7d=_checkins(('better', '2026-05-30'), ('better', '2026-05-29')),
        completion_count_last_7d=6,
    ) is False


def test_phase_can_advance_returns_false_with_a_worse_in_last_3_days():
    assert phase_can_advance(
        phase=1, day_in_phase=12,
        checkins_last_7d=_checkins(
            ('better', '2026-05-31'),
            ('worse',  '2026-05-30'),   # within 3 days
            ('better', '2026-05-29'),
            ('better', '2026-05-25'),
        ),
        completion_count_last_7d=6,
    ) is False


def test_phase_can_advance_returns_true_when_all_gates_pass():
    assert phase_can_advance(
        phase=1, day_in_phase=12,
        checkins_last_7d=_checkins(
            ('better', '2026-05-31'),
            ('better', '2026-05-30'),
            ('better', '2026-05-29'),
            ('same',   '2026-05-26'),
        ),
        completion_count_last_7d=6,
    ) is True


def test_phase_can_advance_phase_3_never_auto_advances():
    # Phase 3 is ongoing; engine never returns True for it.
    assert phase_can_advance(
        phase=3, day_in_phase=28,
        checkins_last_7d=_checkins(*[('better', '2026-05-25')] * 5),
        completion_count_last_7d=6,
    ) is False


def test_phase_min_days_constants_match_spec():
    assert PHASE_MIN_DAYS[1] == 10
    assert PHASE_MIN_DAYS[2] == 21
    assert PHASE_MIN_DAYS[3] is None  # ongoing, no advance
```

- [ ] **Step 2: Run, verify fail**

Run: `pytest tests/test_rehab_engine.py -v`
Expected: FAIL — `ImportError: cannot import name 'phase_can_advance' from 'rehab_engine'`.

- [ ] **Step 3: Implement**

Create `rehab_engine.py`:

```python
"""Adaptive rehab progression engine — pure rules.

Inputs are pre-computed by the caller (HTTP endpoint) from the DB. Engine
functions return decisions: whether to advance phase, regress phase, surface
flare warnings, surface per-exercise progression hints, and the current streak.

Spec: docs/superpowers/specs/2026-05-31-triage-recover-redesign-design.md
section "Progression engine".
"""
from datetime import date, timedelta
from typing import Iterable

# Per-phase floor for auto-advance. Phase 3 is ongoing — no auto-advance.
PHASE_MIN_DAYS = {1: 10, 2: 21, 3: None}

# Completion rate floor for advance: 70% of *days* in the last 7 with at least
# one exercise completed. Spec phrasing is rate of *exercises* but the engine
# uses days-with-completion as the proxy (each completed day implies the user
# engaged with the plan that day).
COMPLETION_DAYS_REQUIRED = 5  # >= 5 of last 7 days had a completion (~71%)

# Check-in streak required to advance: 3 'better' in last 7 days, 0 'worse' in 3.
ADVANCE_BETTER_COUNT = 3
ADVANCE_WORSE_WINDOW = 3


def _count_status(checkins: Iterable[dict], status: str) -> int:
    return sum(1 for c in checkins if c['status'] == status)


def _has_status_within(checkins: Iterable[dict], status: str, days_back: int, today: date) -> bool:
    cutoff = today - timedelta(days=days_back - 1)
    return any(
        c['status'] == status and c['checkin_date'] >= cutoff
        for c in checkins
    )


def phase_can_advance(
    *,
    phase: int,
    day_in_phase: int,
    checkins_last_7d: list[dict],
    completion_count_last_7d: int,
) -> bool:
    """Return True iff all advancement gates are met."""
    min_days = PHASE_MIN_DAYS.get(phase)
    if min_days is None:
        return False  # Phase 3 has no auto-advance
    if day_in_phase < min_days:
        return False
    if completion_count_last_7d < COMPLETION_DAYS_REQUIRED:
        return False
    if _count_status(checkins_last_7d, 'better') < ADVANCE_BETTER_COUNT:
        return False
    # Zero 'worse' in last 3 days. Use today = max date in checkins, else date.today().
    today = max((c['checkin_date'] for c in checkins_last_7d), default=date.today())
    if _has_status_within(checkins_last_7d, 'worse', ADVANCE_WORSE_WINDOW, today):
        return False
    return True
```

- [ ] **Step 4: Run, verify pass**

Run: `pytest tests/test_rehab_engine.py -v`
Expected: PASS — `7 passed`.

- [ ] **Step 5: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add rehab_engine.py tests/test_rehab_engine.py
git -C /Users/mathewbudnik/coretriage commit -m "feat(engine): phase_can_advance rule + 7 unit tests"
```

---

## Task 5: rehab_engine.py — flare detection (phase_should_regress)

**Files:**
- Modify: `rehab_engine.py` (append)
- Modify: `tests/test_rehab_engine.py` (append)

- [ ] **Step 1: Add tests**

Append to `tests/test_rehab_engine.py`:

```python
from rehab_engine import phase_should_regress

# phase_should_regress ──────────────────────────────────────────────────────────
def test_phase_should_regress_true_when_3_worse_in_5_days():
    out = phase_should_regress(
        checkins_last_5d=_checkins(
            ('worse',  '2026-05-31'),
            ('worse',  '2026-05-30'),
            ('worse',  '2026-05-28'),
            ('same',   '2026-05-29'),
        ),
        pain_score_today=None,
        pain_baseline_7d=None,
    )
    assert out['regress'] is True
    assert 'worse_in_5d' in out['reason']


def test_phase_should_regress_false_with_only_2_worse_in_5_days():
    out = phase_should_regress(
        checkins_last_5d=_checkins(
            ('worse',  '2026-05-30'),
            ('worse',  '2026-05-28'),
            ('better', '2026-05-31'),
        ),
        pain_score_today=None,
        pain_baseline_7d=None,
    )
    assert out['regress'] is False


def test_phase_should_regress_true_when_pain_spikes_3_over_baseline():
    out = phase_should_regress(
        checkins_last_5d=_checkins(('same', '2026-05-31')),
        pain_score_today=7,
        pain_baseline_7d=3.0,
    )
    assert out['regress'] is True
    assert 'pain_spike' in out['reason']


def test_phase_should_regress_false_when_pain_within_2():
    out = phase_should_regress(
        checkins_last_5d=_checkins(('same', '2026-05-31')),
        pain_score_today=5,
        pain_baseline_7d=3.0,
    )
    assert out['regress'] is False


def test_phase_should_regress_false_when_pain_baseline_is_none_and_low_worse_count():
    out = phase_should_regress(
        checkins_last_5d=_checkins(('same', '2026-05-31')),
        pain_score_today=8,
        pain_baseline_7d=None,
    )
    assert out['regress'] is False
```

- [ ] **Step 2: Run, verify fail**

Run: `pytest tests/test_rehab_engine.py -v -k phase_should_regress`
Expected: FAIL — `cannot import name 'phase_should_regress'`.

- [ ] **Step 3: Implement**

Append to `rehab_engine.py`:

```python
REGRESS_WORSE_THRESHOLD = 3   # 3 'worse' in last 5 days
REGRESS_PAIN_SPIKE      = 3   # pain delta vs 7-day baseline

def phase_should_regress(
    *,
    checkins_last_5d: list[dict],
    pain_score_today: int | None,
    pain_baseline_7d: float | None,
) -> dict:
    """Return { 'regress': bool, 'reason': str | None } indicating whether to
    surface the flare warning and which rule fired.

    Reasons (when regress=True):
      'worse_in_5d' — 3 or more 'worse' check-ins in last 5 days
      'pain_spike'  — today's pain score is 3+ above 7-day baseline
    """
    worse_count = _count_status(checkins_last_5d, 'worse')
    if worse_count >= REGRESS_WORSE_THRESHOLD:
        return {'regress': True, 'reason': 'worse_in_5d'}
    if (
        pain_score_today is not None
        and pain_baseline_7d is not None
        and (pain_score_today - pain_baseline_7d) >= REGRESS_PAIN_SPIKE
    ):
        return {'regress': True, 'reason': 'pain_spike'}
    return {'regress': False, 'reason': None}
```

- [ ] **Step 4: Run, verify pass**

Run: `pytest tests/test_rehab_engine.py -v`
Expected: PASS — 12 passed.

- [ ] **Step 5: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add rehab_engine.py tests/test_rehab_engine.py
git -C /Users/mathewbudnik/coretriage commit -m "feat(engine): phase_should_regress + flare detection + 5 tests"
```

---

## Task 6: rehab_engine.py — per-exercise progression check

**Files:**
- Modify: `rehab_engine.py` (append)
- Modify: `tests/test_rehab_engine.py` (append)

Per spec Open Question #5: progression_trigger strings in exercises.js are natural-language. For Phase B v1 we use the default rule "5 consecutive painless completion days" for every exercise — i.e., 5-day streak AND no 'worse' check-in in last 3 days.

- [ ] **Step 1: Add tests**

Append to `tests/test_rehab_engine.py`:

```python
from rehab_engine import per_exercise_ready_keys, EXERCISE_PROGRESSION_DAYS

def test_exercise_progression_days_constant_is_5():
    assert EXERCISE_PROGRESSION_DAYS == 5

def test_per_exercise_ready_returns_keys_with_5plus_streak_and_no_worse_in_3d():
    out = per_exercise_ready_keys(
        exercise_streaks={'Finger:1:flexor stretch': 5, 'Finger:1:wrist circles': 3},
        checkins_last_3d=_checkins(('better', '2026-05-31'), ('same', '2026-05-30')),
    )
    assert out == ['Finger:1:flexor stretch']

def test_per_exercise_ready_drops_all_when_worse_in_last_3d():
    out = per_exercise_ready_keys(
        exercise_streaks={'Finger:1:flexor stretch': 7, 'Finger:1:wrist circles': 6},
        checkins_last_3d=_checkins(('worse', '2026-05-31')),
    )
    assert out == []

def test_per_exercise_ready_returns_empty_when_no_streak_qualifies():
    out = per_exercise_ready_keys(
        exercise_streaks={'a': 4, 'b': 2, 'c': 0},
        checkins_last_3d=_checkins(('better', '2026-05-31')),
    )
    assert out == []

def test_per_exercise_ready_returns_keys_in_stable_order():
    out = per_exercise_ready_keys(
        exercise_streaks={'z': 5, 'a': 6, 'm': 7},
        checkins_last_3d=_checkins(('better', '2026-05-31')),
    )
    # Sorted alphabetically for deterministic frontend rendering.
    assert out == ['a', 'm', 'z']
```

- [ ] **Step 2: Run, verify fail**

Run: `pytest tests/test_rehab_engine.py -v -k per_exercise`
Expected: FAIL.

- [ ] **Step 3: Implement**

Append to `rehab_engine.py`:

```python
EXERCISE_PROGRESSION_DAYS = 5   # default trigger: 5 consecutive painless completion days
EXERCISE_NO_WORSE_WINDOW  = 3   # zero 'worse' in last N days

def per_exercise_ready_keys(
    *,
    exercise_streaks: dict[str, int],
    checkins_last_3d: list[dict],
) -> list[str]:
    """Return the sorted list of exercise_keys whose progression trigger has
    fired AND no 'worse' check-in has been logged in the last 3 days.

    `exercise_streaks` is { exercise_key: consecutive_completion_days }.
    """
    if _count_status(checkins_last_3d, 'worse') > 0:
        return []
    qualified = [
        key for key, streak in exercise_streaks.items()
        if streak >= EXERCISE_PROGRESSION_DAYS
    ]
    return sorted(qualified)
```

- [ ] **Step 4: Run, verify pass**

Run: `pytest tests/test_rehab_engine.py -v`
Expected: PASS — 17 passed.

- [ ] **Step 5: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add rehab_engine.py tests/test_rehab_engine.py
git -C /Users/mathewbudnik/coretriage commit -m "feat(engine): per_exercise_ready_keys + 5 tests"
```

---

## Task 7: rehab_engine.py — streak calculation

**Files:**
- Modify: `rehab_engine.py` (append)
- Modify: `tests/test_rehab_engine.py` (append)

- [ ] **Step 1: Add tests**

Append:

```python
from rehab_engine import streak_count

def test_streak_zero_when_today_missing_checkin():
    assert streak_count(
        today=date(2026, 5, 31),
        checkins=[],
        completion_days={date(2026, 5, 31): True},
    ) == 0

def test_streak_zero_when_today_completion_below_80pct():
    assert streak_count(
        today=date(2026, 5, 31),
        checkins=_checkins(('better', '2026-05-31')),
        completion_days={date(2026, 5, 31): False},
    ) == 0

def test_streak_one_when_today_qualifies():
    assert streak_count(
        today=date(2026, 5, 31),
        checkins=_checkins(('better', '2026-05-31')),
        completion_days={date(2026, 5, 31): True},
    ) == 1

def test_streak_extends_back_consecutive_days():
    days = ['2026-05-27', '2026-05-28', '2026-05-29', '2026-05-30', '2026-05-31']
    assert streak_count(
        today=date(2026, 5, 31),
        checkins=_checkins(*[('better', d) for d in days]),
        completion_days={date.fromisoformat(d): True for d in days},
    ) == 5

def test_streak_breaks_on_missing_checkin():
    assert streak_count(
        today=date(2026, 5, 31),
        checkins=_checkins(
            ('better', '2026-05-31'),
            ('better', '2026-05-30'),
            # 2026-05-29 missing
            ('better', '2026-05-28'),
        ),
        completion_days={
            date(2026, 5, 31): True, date(2026, 5, 30): True,
            date(2026, 5, 29): True, date(2026, 5, 28): True,
        },
    ) == 2  # today + yesterday only
```

- [ ] **Step 2: Run fail**

Run: `pytest tests/test_rehab_engine.py -v -k streak`
Expected: FAIL.

- [ ] **Step 3: Implement**

Append to `rehab_engine.py`:

```python
def streak_count(
    *,
    today: date,
    checkins: list[dict],
    completion_days: dict[date, bool],
) -> int:
    """Count of consecutive days (back from `today`, inclusive) where BOTH:
      - a check-in exists for that date
      - completion_days[date] is True (>= 80% of prescribed exercises completed)

    `checkins` and `completion_days` should cover at least the last 30 days
    so we don't undercount.
    """
    checkin_dates = {c['checkin_date'] for c in checkins}
    streak = 0
    cursor = today
    while True:
        if cursor in checkin_dates and completion_days.get(cursor, False):
            streak += 1
            cursor -= timedelta(days=1)
        else:
            break
    return streak
```

- [ ] **Step 4: Run, verify pass**

Run: `pytest tests/test_rehab_engine.py -v`
Expected: PASS — 22 passed.

- [ ] **Step 5: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add rehab_engine.py tests/test_rehab_engine.py
git -C /Users/mathewbudnik/coretriage commit -m "feat(engine): streak_count + 5 tests"
```

---

## Task 8: POST /api/rehab/checkins endpoint

**Files:**
- Modify: `main.py` (after the existing rehab endpoints, ~line 1400)
- Create: `tests/test_rehab_checkins_endpoint.py`

- [ ] **Step 1: Add endpoint tests**

Create `tests/test_rehab_checkins_endpoint.py`:

```python
"""Integration tests for the new rehab check-in endpoints.

Uses the existing FastAPI TestClient pattern from other tests in this suite.
"""
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


@pytest.fixture
def auth_headers(signed_in_user):
    """signed_in_user is the existing fixture that returns a valid auth header
    dict. Match the fixture name used by other endpoint tests in this repo."""
    return signed_in_user


def test_post_checkin_persists(auth_headers):
    resp = client.post('/api/rehab/checkins', headers=auth_headers, json={
        'region': 'Finger', 'status': 'better', 'pain_score': 3,
    })
    assert resp.status_code == 200
    body = resp.json()
    assert body['ok'] is True


def test_post_checkin_rejects_invalid_status(auth_headers):
    resp = client.post('/api/rehab/checkins', headers=auth_headers, json={
        'region': 'Finger', 'status': 'meh', 'pain_score': 3,
    })
    assert resp.status_code == 422  # pydantic validation


def test_post_checkin_rejects_pain_above_10(auth_headers):
    resp = client.post('/api/rehab/checkins', headers=auth_headers, json={
        'region': 'Finger', 'status': 'better', 'pain_score': 11,
    })
    assert resp.status_code == 422


def test_post_checkin_allows_null_pain(auth_headers):
    resp = client.post('/api/rehab/checkins', headers=auth_headers, json={
        'region': 'Finger', 'status': 'same',
    })
    assert resp.status_code == 200


def test_post_checkin_upserts_same_day(auth_headers):
    client.post('/api/rehab/checkins', headers=auth_headers, json={'region': 'Finger', 'status': 'better'})
    client.post('/api/rehab/checkins', headers=auth_headers, json={'region': 'Finger', 'status': 'worse', 'pain_score': 6})
    # Range fetch should show only one row for today.
    today_iso = client.get('/api/rehab/checkins', headers=auth_headers, params={'region': 'Finger', 'from': '2026-05-31', 'to': '2026-05-31'}).json()
    assert len(today_iso['checkins']) == 1
    assert today_iso['checkins'][0]['status'] == 'worse'
```

- [ ] **Step 2: Run, verify fail**

Run: `pytest tests/test_rehab_checkins_endpoint.py -v`
Expected: FAIL — endpoint doesn't exist (404).

- [ ] **Step 3: Implement**

Add to `main.py` (locate the existing rehab endpoints block at ~line 1344-1400, add after them). First update the imports at top:

```python
from database import (
    ...,  # existing imports
    insert_checkin,
    get_checkins_range,
)
```

Then add the endpoint:

```python
from pydantic import BaseModel, Field
from typing import Literal


class CheckinRequest(BaseModel):
    region:     str
    status:     Literal['better', 'same', 'worse']
    pain_score: int | None = Field(default=None, ge=0, le=10)


@app.post('/api/rehab/checkins')
def post_checkin(
    body: CheckinRequest,
    user: dict = Depends(require_user),
) -> dict:
    """Upsert today's daily check-in for (user, region).
    Date is server-local YYYY-MM-DD (mirrors the existing /api/rehab/progress
    pattern). Frontend never passes the date.
    """
    today = datetime.now().strftime('%Y-%m-%d')
    insert_checkin(
        user_id=user['id'],
        region=body.region,
        checkin_date=today,
        status=body.status,
        pain_score=body.pain_score,
    )
    return {'ok': True, 'checkin_date': today, 'status': body.status, 'pain_score': body.pain_score}


@app.get('/api/rehab/checkins')
def list_checkins(
    region: str,
    from_: str = Query(..., alias='from'),
    to:    str = Query(...),
    user: dict = Depends(require_user),
) -> dict:
    rows = get_checkins_range(
        user_id=user['id'], region=region, start_date=from_, end_date=to,
    )
    return {'checkins': [
        {
            'checkin_date': r['checkin_date'].isoformat(),
            'status':       r['status'],
            'pain_score':   r['pain_score'],
        }
        for r in rows
    ]}
```

If the existing main.py doesn't use `require_user` / `Depends(require_user)`, swap to whatever auth dependency pattern is already used by `fetch_rehab_progress`. Read the existing pattern at line 1344 first.

- [ ] **Step 4: Run, verify pass**

Run: `pytest tests/test_rehab_checkins_endpoint.py -v`
Expected: PASS — 5 passed.

- [ ] **Step 5: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add main.py tests/test_rehab_checkins_endpoint.py
git -C /Users/mathewbudnik/coretriage commit -m "feat(api): POST/GET /api/rehab/checkins + 5 endpoint tests"
```

---

## Task 9: GET /api/rehab/state endpoint

**Files:**
- Modify: `main.py` (after the checkins endpoints)
- Modify: `tests/test_rehab_checkins_endpoint.py` (append)

The big one — composes the engine output. Calls into rehab_engine + DB helpers.

- [ ] **Step 1: Add tests**

Append to `tests/test_rehab_checkins_endpoint.py`:

```python
def test_get_state_returns_initial_for_fresh_user(auth_headers):
    resp = client.get('/api/rehab/state', headers=auth_headers, params={'region': 'Finger'})
    assert resp.status_code == 200
    body = resp.json()
    assert body['phase'] == 1
    assert body['day_in_phase'] >= 1
    assert body['can_advance'] is False
    assert body['flare']['detected'] is False
    assert body['streak'] == 0
    assert body['ready_to_progress'] == []
    assert 'checkin_today' in body  # None for fresh user

def test_get_state_includes_today_checkin_after_post(auth_headers):
    client.post('/api/rehab/checkins', headers=auth_headers, json={'region': 'Finger', 'status': 'better', 'pain_score': 2})
    body = client.get('/api/rehab/state', headers=auth_headers, params={'region': 'Finger'}).json()
    assert body['checkin_today'] == {'status': 'better', 'pain_score': 2}
```

- [ ] **Step 2: Verify fail**

Run: `pytest tests/test_rehab_checkins_endpoint.py -v -k get_state`
Expected: FAIL — endpoint doesn't exist.

- [ ] **Step 3: Implement**

Add to `main.py`:

```python
from rehab_engine import (
    phase_can_advance,
    phase_should_regress,
    per_exercise_ready_keys,
    streak_count,
)


def _compute_phase_day(triage_created_at) -> tuple[int, int]:
    """Mirror frontend rehabHeuristic.js for now — calendar-based.
    Phase 1: 0–13 days, Phase 2: 14–41, Phase 3: 42+.
    Returns (phase, day_in_phase) — 1-indexed for human display.
    """
    days = (datetime.now() - triage_created_at).days
    if days < 14:  return (1, days + 1)
    if days < 42:  return (2, days - 14 + 1)
    return (3, days - 42 + 1)


@app.get('/api/rehab/state')
def get_rehab_state(
    region: str,
    user: dict = Depends(require_user),
) -> dict:
    """Engine state for (user, region). Drives the Recover landing's
    4-state render decision."""
    today = datetime.now().date()
    today_iso = today.strftime('%Y-%m-%d')
    seven_ago = (today - timedelta(days=7)).strftime('%Y-%m-%d')
    five_ago  = (today - timedelta(days=5)).strftime('%Y-%m-%d')
    three_ago = (today - timedelta(days=3)).strftime('%Y-%m-%d')

    # Locate the user's active triage to compute phase/day.
    triage = get_latest_triage_for_region(user['id'], region)
    if triage is None:
        # No active triage → engine has nothing to evaluate.
        return {
            'phase': 1, 'day_in_phase': 1, 'can_advance': False,
            'flare': {'detected': False, 'reason': None},
            'streak': 0, 'ready_to_progress': [],
            'checkin_today': None,
        }
    phase, day_in_phase = _compute_phase_day(triage['created_at'])

    checkins_7d = get_checkins_range(user_id=user['id'], region=region, start_date=seven_ago, end_date=today_iso)
    checkins_5d = [c for c in checkins_7d if c['checkin_date'] >= today - timedelta(days=5)]
    checkins_3d = [c for c in checkins_7d if c['checkin_date'] >= today - timedelta(days=3)]

    completion_7d_days = get_completion_count(
        user_id=user['id'], region=region, start_date=seven_ago, end_date=today_iso,
    )

    today_checkin = next((c for c in checkins_7d if c['checkin_date'] == today), None)
    pain_today = today_checkin['pain_score'] if today_checkin else None
    pains = [c['pain_score'] for c in checkins_7d if c['pain_score'] is not None]
    pain_baseline_7d = (sum(pains) / len(pains)) if pains else None

    # Per-exercise streaks: fetch streaks for all exercises currently prescribed
    # for the user's phase. Exercise definitions live in the frontend; the API
    # accepts a list via query param in v2. For v1 we compute streaks for every
    # exercise_key the user has ever completed in this region — frontend filters
    # to the visible list.
    streaks_query = {}  # placeholder — populated from DB in a follow-up if needed
    ready_keys = per_exercise_ready_keys(exercise_streaks=streaks_query, checkins_last_3d=checkins_3d)

    can_adv = phase_can_advance(
        phase=phase, day_in_phase=day_in_phase,
        checkins_last_7d=checkins_7d,
        completion_count_last_7d=completion_7d_days,
    )
    flare = phase_should_regress(
        checkins_last_5d=checkins_5d,
        pain_score_today=pain_today,
        pain_baseline_7d=pain_baseline_7d,
    )

    # Streak: build completion_days dict from last 30 days.
    thirty_ago = today - timedelta(days=30)
    streak_days = {}
    for offset in range((today - thirty_ago).days + 1):
        d = thirty_ago + timedelta(days=offset)
        streak_days[d] = get_completion_count(user_id=user['id'], region=region, start_date=d.isoformat(), end_date=d.isoformat()) >= 1
    streak = streak_count(today=today, checkins=checkins_7d, completion_days=streak_days)

    return {
        'phase': phase,
        'day_in_phase': day_in_phase,
        'can_advance': can_adv,
        'flare': flare,
        'streak': streak,
        'ready_to_progress': ready_keys,
        'checkin_today': (
            {'status': today_checkin['status'], 'pain_score': today_checkin['pain_score']}
            if today_checkin else None
        ),
    }
```

Note: `get_latest_triage_for_region` is a helper that may need to be added to `database.py` if it doesn't exist. Look in database.py first — if a similar query (e.g., `get_recent_sessions`) is already there, reuse it. Otherwise add a small helper that returns the most recent session for (user, region) with its created_at.

- [ ] **Step 4: Verify pass**

Run: `pytest tests/test_rehab_checkins_endpoint.py -v -k get_state`
Expected: PASS — 2 passed.

- [ ] **Step 5: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add main.py tests/test_rehab_checkins_endpoint.py database.py
git -C /Users/mathewbudnik/coretriage commit -m "feat(api): GET /api/rehab/state composes engine + helpers"
```

---

## Task 10: POST /api/rehab/advance + POST /api/rehab/regress

**Files:**
- Modify: `main.py`
- Modify: `database.py` — add `record_phase_transition` helper + `rehab_phase_transitions` table
- Modify: `tests/test_rehab_checkins_endpoint.py`

- [ ] **Step 1: Add phase transitions table**

In `database.py` `init_db()` block, near the other rehab tables:

```python
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS rehab_phase_transitions (
                    id            SERIAL PRIMARY KEY,
                    user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    region        TEXT NOT NULL,
                    direction     TEXT NOT NULL CHECK (direction IN ('advance', 'regress')),
                    from_phase    INT NOT NULL,
                    to_phase      INT NOT NULL,
                    reason        TEXT,
                    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS rehab_phase_transitions_user_idx
                ON rehab_phase_transitions (user_id, region, created_at DESC);
                """
            )
```

- [ ] **Step 2: Add helper to database.py**

```python
def record_phase_transition(
    *,
    user_id: int,
    region: str,
    direction: str,
    from_phase: int,
    to_phase: int,
    reason: str | None = None,
) -> None:
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO rehab_phase_transitions (user_id, region, direction, from_phase, to_phase, reason)
                VALUES (%s, %s, %s, %s, %s, %s);
                """,
                (user_id, region, direction, from_phase, to_phase, reason),
            )
        conn.commit()
```

- [ ] **Step 3: Add endpoint tests**

Append to `tests/test_rehab_checkins_endpoint.py`:

```python
def test_post_advance_writes_transition(auth_headers):
    resp = client.post('/api/rehab/advance', headers=auth_headers, json={'region': 'Finger', 'to_phase': 2})
    assert resp.status_code == 200
    assert resp.json() == {'ok': True, 'phase': 2}

def test_post_advance_rejects_invalid_phase(auth_headers):
    resp = client.post('/api/rehab/advance', headers=auth_headers, json={'region': 'Finger', 'to_phase': 5})
    assert resp.status_code == 422  # only 1/2/3 allowed

def test_post_regress_writes_transition_with_reason(auth_headers):
    resp = client.post('/api/rehab/regress', headers=auth_headers, json={'region': 'Finger', 'reason': 'worse_in_5d'})
    assert resp.status_code == 200
```

- [ ] **Step 4: Implement endpoints in main.py**

```python
class AdvanceRequest(BaseModel):
    region: str
    to_phase: Literal[1, 2, 3]


class RegressRequest(BaseModel):
    region: str
    reason: str | None = None


@app.post('/api/rehab/advance')
def post_advance(body: AdvanceRequest, user: dict = Depends(require_user)) -> dict:
    """User-confirmed phase advance. Engine recommends; user accepts here."""
    triage = get_latest_triage_for_region(user['id'], body.region)
    if triage is None: raise HTTPException(404, 'no active triage')
    from_phase, _ = _compute_phase_day(triage['created_at'])
    record_phase_transition(
        user_id=user['id'], region=body.region,
        direction='advance', from_phase=from_phase, to_phase=body.to_phase, reason=None,
    )
    return {'ok': True, 'phase': body.to_phase}


@app.post('/api/rehab/regress')
def post_regress(body: RegressRequest, user: dict = Depends(require_user)) -> dict:
    """Step back to lighter exercises (Phase 1). Records the flare reason."""
    triage = get_latest_triage_for_region(user['id'], body.region)
    if triage is None: raise HTTPException(404, 'no active triage')
    from_phase, _ = _compute_phase_day(triage['created_at'])
    record_phase_transition(
        user_id=user['id'], region=body.region,
        direction='regress', from_phase=from_phase, to_phase=1, reason=body.reason,
    )
    return {'ok': True, 'phase': 1}
```

- [ ] **Step 5: Run, verify pass**

Run: `pytest tests/test_rehab_checkins_endpoint.py -v`
Expected: PASS — 10 passed.

- [ ] **Step 6: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add database.py main.py tests/test_rehab_checkins_endpoint.py
git -C /Users/mathewbudnik/coretriage commit -m "feat(api): POST /api/rehab/advance + /regress + transitions table"
```

**Note on phase computation:** Tasks 9+10 use `_compute_phase_day` which is still calendar-based. The intent is that *user-confirmed* advance/regress eventually persists the new phase to a `rehab_user_phase` table that overrides the calendar. That table addition is deferred to a v1.1 follow-up; for now phase advancement is recorded but the displayed phase still derives from calendar. Frontend will treat the latest `rehab_phase_transitions` row as the source of truth for the displayed phase if present; otherwise fall back to calendar.

---

## Task 11: API client wrappers

**Files:**
- Modify: `frontend/src/api.js`

- [ ] **Step 1: Add wrappers**

Locate the existing `getRehabProgress` / `checkRehabExercise` / `uncheckRehabExercise` block in `frontend/src/api.js`. Add alongside:

```js
export async function postRehabCheckin({ region, status, pain_score = null }) {
  const r = await fetch('/api/rehab/checkins', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ region, status, pain_score }),
  })
  if (!r.ok) throw new Error(`postRehabCheckin failed: ${r.status}`)
  return r.json()
}

export async function getRehabState(region) {
  const r = await fetch(`/api/rehab/state?region=${encodeURIComponent(region)}`, {
    credentials: 'include',
  })
  if (!r.ok) throw new Error(`getRehabState failed: ${r.status}`)
  return r.json()
}

export async function postRehabAdvance({ region, to_phase }) {
  const r = await fetch('/api/rehab/advance', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ region, to_phase }),
  })
  if (!r.ok) throw new Error(`postRehabAdvance failed: ${r.status}`)
  return r.json()
}

export async function postRehabRegress({ region, reason = null }) {
  const r = await fetch('/api/rehab/regress', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ region, reason }),
  })
  if (!r.ok) throw new Error(`postRehabRegress failed: ${r.status}`)
  return r.json()
}
```

- [ ] **Step 2: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/api.js
git -C /Users/mathewbudnik/coretriage commit -m "feat(api-client): postRehabCheckin + getRehabState + advance/regress wrappers"
```

---

## Task 12: useRehabEngine hook

**Files:**
- Create: `frontend/src/hooks/useRehabEngine.js`

- [ ] **Step 1: Create the hook**

```jsx
import { useState, useEffect, useCallback } from 'react'
import { getRehabState, postRehabCheckin, postRehabAdvance, postRehabRegress } from '../api'

/**
 * Engine state + mutation helpers for the Recover landing.
 *
 * Returns:
 *   loading:   boolean
 *   state:     { phase, day_in_phase, can_advance, flare, streak, ready_to_progress, checkin_today } | null
 *   submitCheckin: ({ status, pain_score? }) => Promise
 *   advance:   (to_phase) => Promise
 *   regress:   (reason) => Promise
 *   refetch:   () => Promise
 *
 * Auto-refetches state after every mutation.
 */
export function useRehabEngine(region) {
  const [loading, setLoading] = useState(true)
  const [state, setState] = useState(null)

  const refetch = useCallback(async () => {
    if (!region) { setLoading(false); return }
    setLoading(true)
    try {
      const s = await getRehabState(region)
      setState(s)
    } catch (_) {
      setState(null)
    } finally {
      setLoading(false)
    }
  }, [region])

  useEffect(() => { refetch() }, [refetch])

  const submitCheckin = useCallback(async ({ status, pain_score = null }) => {
    await postRehabCheckin({ region, status, pain_score })
    await refetch()
  }, [region, refetch])

  const advance = useCallback(async (to_phase) => {
    await postRehabAdvance({ region, to_phase })
    await refetch()
  }, [region, refetch])

  const regress = useCallback(async (reason) => {
    await postRehabRegress({ region, reason })
    await refetch()
  }, [region, refetch])

  return { loading, state, submitCheckin, advance, regress, refetch }
}
```

- [ ] **Step 2: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/hooks/useRehabEngine.js
git -C /Users/mathewbudnik/coretriage commit -m "feat(hooks): useRehabEngine — state + mutations + auto-refetch"
```

---

## Task 13: DailyCheckin component

**Files:**
- Create: `frontend/src/components/redesign/recover/DailyCheckin.jsx`

Three tonal chips: Better (moss-green) / Same (cream) / Worse (terra).

- [ ] **Step 1: Create the component**

```jsx
import { motion, useReducedMotion } from 'framer-motion'
import { DUR, EASE_OUT_GENTLE, chipPopKeyframes } from '../../../lib/redesignMotion'

const OPTIONS = [
  { value: 'better', label: 'Better', glyph: '↑', tone: 'moss' },
  { value: 'same',   label: 'Same',   glyph: '→', tone: 'cream' },
  { value: 'worse',  label: 'Worse',  glyph: '↓', tone: 'terra' },
]

const TONE_CLS = {
  moss:  'shadow-[0_0_0_0.5px_#6b9a7a,0_0_16px_rgba(107,154,122,0.28)] bg-[rgba(107,154,122,0.10)] text-ct-moss-active',
  cream: 'shadow-[0_0_0_0.5px_#efe7d6,0_0_16px_rgba(239,231,214,0.18)] bg-[rgba(239,231,214,0.08)] text-ct-cream-warm',
  terra: 'shadow-[0_0_0_0.5px_#d97757,0_0_16px_rgba(217,119,87,0.32)] bg-[rgba(217,119,87,0.12)] text-ct-terracotta',
}

export default function DailyCheckin({ dayContext, onSelect }) {
  const reduce = useReducedMotion()
  return (
    <section className="py-6">
      <div className="text-[11.5px] font-extrabold uppercase tracking-[0.16em] text-ct-cream-warm/45 mb-3">
        {dayContext}
      </div>
      <h2 className="text-[28px] font-extrabold leading-[1.1] -tracking-[0.025em] text-ct-cream-warm">
        How does the hand feel <span className="text-ct-terracotta">today?</span>
      </h2>
      <p className="text-[13px] leading-[1.5] text-ct-cream-warm/55 mt-3 max-w-[290px]">
        Quick read — used to pace your plan. Honest answers help us adapt.
      </p>
      <div className="flex gap-2.5 mt-5">
        {OPTIONS.map((opt) => (
          <motion.button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            whileTap={reduce ? undefined : { scale: 0.97 }}
            className="flex-1 px-3.5 py-3.5 rounded-2xl bg-white/[0.025] shadow-[0_0_0_0.5px_rgba(239,231,214,0.16)] text-center transition-[color,background,box-shadow] duration-200 hover:bg-white/[0.05]"
            aria-label={`Check in: ${opt.label}`}
          >
            <div className="text-[13px] font-extrabold text-ct-cream-warm/80">{opt.label}</div>
            <div className="text-[10.5px] font-extrabold tracking-[0.04em] uppercase text-ct-cream-warm/45 mt-1">{opt.glyph}</div>
          </motion.button>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Visual smoke test**

Temporarily render `<DailyCheckin dayContext="Day 5 of 14" onSelect={(v) => console.log(v)} />` in a forest-bg dev surface. Tap chips → console logs the value. Revert.

- [ ] **Step 3: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/components/redesign/recover/DailyCheckin.jsx
git -C /Users/mathewbudnik/coretriage commit -m "feat(recover): DailyCheckin Better/Same/Worse with tonal hover"
```

---

## Task 14: CheckinSummaryRow component

**Files:**
- Create: `frontend/src/components/redesign/recover/CheckinSummaryRow.jsx`

Collapsed post-checkin one-liner with "Change" affordance.

- [ ] **Step 1: Create**

```jsx
const STATUS_LABEL = { better: 'Better', same: 'Same', worse: 'Worse' }
const STATUS_TONE  = { better: 'text-ct-moss-active', same: 'text-ct-cream-warm', worse: 'text-ct-terracotta' }

export default function CheckinSummaryRow({ status, dayLabel, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex items-center justify-between gap-3 py-3 w-full text-left border-b border-white/[0.06] transition-[padding-left] duration-200 hover:pl-1"
    >
      <span>
        <span className="block text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-ct-cream-warm/45">Today's check-in</span>
        <span className={`block text-[13.5px] font-bold mt-0.5 ${STATUS_TONE[status]}`}>
          {STATUS_LABEL[status]} · day {dayLabel}
        </span>
      </span>
      <span className="text-[11px] font-bold tracking-wide text-ct-terracotta/60">Change</span>
    </button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/components/redesign/recover/CheckinSummaryRow.jsx
git -C /Users/mathewbudnik/coretriage commit -m "feat(recover): CheckinSummaryRow"
```

---

## Task 15: DayHero component

**Files:**
- Create: `frontend/src/components/redesign/recover/DayHero.jsx`

Big "Day N / M" anchor with lede.

- [ ] **Step 1: Create**

```jsx
export default function DayHero({ day, total, lede }) {
  return (
    <div className="py-5">
      <div className="text-[64px] font-extrabold leading-[0.92] -tracking-[0.045em] text-ct-cream-warm flex items-baseline">
        Day {day}
        <span className="text-[19px] font-semibold text-ct-cream-warm/45 ml-2 -tracking-[0.01em]">/ {total}</span>
      </div>
      <p className="text-[13.5px] text-ct-cream-warm/55 mt-3.5 leading-[1.5]">
        {lede}
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/components/redesign/recover/DayHero.jsx
git -C /Users/mathewbudnik/coretriage commit -m "feat(recover): DayHero anchor"
```

---

## Task 16: ExerciseRow with progression hint

**Files:**
- Create: `frontend/src/components/redesign/recover/ExerciseRow.jsx`

- [ ] **Step 1: Create**

```jsx
import { motion, useReducedMotion } from 'framer-motion'
import { EASE_OUT_SPRINGY } from '../../../lib/redesignMotion'

/**
 * Single exercise row with status dot, completion toggle, and an optional
 * "Ready to progress" hint when the engine flags it.
 *
 * Props:
 *   index:        number  — 1-based index (rendered as roman: i, ii, iii, iv)
 *   title:        string
 *   sub:          string  — "3 × 30s · 2–3× daily"
 *   done:         boolean
 *   readyToProgress: boolean
 *   onToggle:     () => void
 *   onOpen:       () => void  — tap body to open exercise detail
 */
const ROMAN = ['', 'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii']

export default function ExerciseRow({ index, title, sub, done, readyToProgress, onToggle, onOpen }) {
  const reduce = useReducedMotion()
  return (
    <div
      className="flex items-center gap-3.5 py-4 border-t border-white/[0.06] last:border-b last:border-b-white/[0.06] cursor-pointer transition-[padding-left] duration-200 hover:pl-1"
      onClick={onOpen}
    >
      <span className={`text-[13px] font-extrabold w-5 tabular-nums -tracking-[0.01em] transition-colors duration-300 ${done ? 'text-ct-terracotta' : 'text-ct-cream-warm/40'}`}>
        {ROMAN[index] ?? index}
      </span>
      <div className="flex-1 min-w-0">
        <div className={`text-[15px] font-bold leading-[1.2] transition-colors duration-300 ${done ? 'text-ct-cream-warm/50 line-through decoration-ct-cream-warm/30' : 'text-ct-cream-warm'}`}>
          {title}
        </div>
        <div className="text-[11.5px] text-ct-cream-warm/45 mt-0.5">{sub}</div>
        {readyToProgress && !done && (
          <div className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-extrabold text-ct-moss-active tracking-[0.04em]">
            <span aria-hidden="true" className="w-[5px] h-[5px] rounded-full bg-ct-moss-active shadow-[0_0_8px_#6b9a7a]" />
            Ready to progress →
          </div>
        )}
      </div>
      <motion.button
        type="button"
        aria-label={done ? 'Mark not done' : 'Mark done'}
        aria-pressed={done}
        onClick={(e) => { e.stopPropagation(); onToggle() }}
        className={`w-2 h-2 rounded-full shrink-0 ${done ? 'bg-ct-terracotta shadow-[0_0_0_1px_#d97757_inset,0_0_0_4px_rgba(217,119,87,0.20),0_0_14px_rgba(217,119,87,0.35)]' : 'shadow-[0_0_0_1px_rgba(239,231,214,0.22)_inset]'}`}
        transition={reduce ? { duration: 0 } : { duration: 0.32, ease: EASE_OUT_SPRINGY }}
      />
      <span className="text-ct-cream-warm/30 text-[14px]">›</span>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/components/redesign/recover/ExerciseRow.jsx
git -C /Users/mathewbudnik/coretriage commit -m "feat(recover): ExerciseRow with progression hint"
```

---

## Task 17: Small atoms — RampHint + PhaseAdvancePrompt + FlareWarning + StreakChip

Bundled together because each is small (15-40 lines) and they're independent.

**Files:**
- Create: `frontend/src/components/redesign/recover/RampHint.jsx`
- Create: `frontend/src/components/redesign/recover/PhaseAdvancePrompt.jsx`
- Create: `frontend/src/components/redesign/recover/FlareWarning.jsx`
- Create: `frontend/src/components/redesign/recover/StreakChip.jsx`

- [ ] **Step 1: Create RampHint**

```jsx
export default function RampHint({ children }) {
  return (
    <div className="mt-3.5 px-3.5 py-3 rounded-xl bg-[rgba(107,154,122,0.06)] shadow-[0_0_0_0.5px_rgba(107,154,122,0.22)] text-[12.5px] text-ct-cream-warm/80 leading-[1.4]">
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Create PhaseAdvancePrompt**

```jsx
import { motion, useReducedMotion } from 'framer-motion'
import { riseVariant } from '../../../lib/redesignMotion'

export default function PhaseAdvancePrompt({ toPhase, headline, body, onAdvance, onDefer }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : 'initial'}
      animate={reduce ? false : 'animate'}
      variants={reduce ? undefined : riseVariant}
      className="mt-4 p-4 rounded-2xl bg-[linear-gradient(180deg,rgba(107,154,122,0.10)_0%,rgba(107,154,122,0.04)_100%)] shadow-[0_0_0_0.5px_rgba(107,154,122,0.30),0_8px_22px_rgba(107,154,122,0.15)]"
    >
      <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-ct-moss-active">Phase advance ready</div>
      <div className="text-[17px] font-extrabold text-ct-cream-warm mt-1 leading-[1.25] -tracking-[0.015em]">
        {headline ?? `Ready for Phase ${toPhase}.`}
      </div>
      {body && (
        <div className="text-[12px] text-ct-cream-warm/55 mt-1.5 leading-[1.5]">{body}</div>
      )}
      <div className="flex gap-2 mt-3.5">
        <button type="button" onClick={onAdvance} className="flex-1 px-3.5 py-2.5 rounded-full bg-ct-moss-active text-ct-forest-base font-extrabold text-[13px]">
          Start Phase {toPhase} →
        </button>
        <button type="button" onClick={onDefer} className="px-3.5 py-2.5 rounded-full bg-white/[0.06] text-ct-cream-warm/80 font-bold text-[13px]">
          Stay on Phase {toPhase - 1}
        </button>
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 3: Create FlareWarning**

```jsx
import { motion, useReducedMotion } from 'framer-motion'
import { riseVariant } from '../../../lib/redesignMotion'

const REASON_BODY = {
  worse_in_5d:
    "3 'Worse' check-ins in last 5 days. Stepping back is the right move — if it's a new issue, re-screen instead.",
  pain_spike:
    "Pain trending up 3+ points vs your baseline. Step back to lighter exercises, or re-screen if something changed.",
}

export default function FlareWarning({ reason, onStepBack, onRescreen }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : 'initial'}
      animate={reduce ? false : 'animate'}
      variants={reduce ? undefined : riseVariant}
      className="mt-4 p-4 rounded-2xl bg-[linear-gradient(180deg,rgba(217,119,87,0.14)_0%,rgba(217,119,87,0.05)_100%)] shadow-[0_0_0_0.5px_rgba(217,119,87,0.40),0_8px_22px_rgba(217,119,87,0.18)]"
    >
      <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-ct-terracotta">Symptoms flared</div>
      <div className="text-[17px] font-extrabold text-ct-cream-warm mt-1 leading-[1.25] -tracking-[0.015em]">
        Step back to lighter exercises for 5 days?
      </div>
      <div className="text-[12px] text-ct-cream-warm/55 mt-1.5 leading-[1.5]">
        {REASON_BODY[reason] ?? REASON_BODY.worse_in_5d}
      </div>
      <div className="flex gap-2 mt-3.5">
        <button type="button" onClick={onStepBack} className="flex-1 px-3.5 py-2.5 rounded-full bg-ct-terracotta text-[#1a1410] font-extrabold text-[13px]">
          Step back to lighter set
        </button>
        <button type="button" onClick={onRescreen} className="px-3.5 py-2.5 rounded-full bg-white/[0.06] text-ct-cream-warm/80 font-bold text-[13px]">
          Re-screen instead
        </button>
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 4: Create StreakChip**

```jsx
export default function StreakChip({ days }) {
  if (!days || days < 1) return null
  return (
    <span className="inline-flex items-center gap-1 text-[10.5px] font-extrabold tracking-[0.06em] text-ct-amber-warm">
      <span aria-hidden="true" className="w-[7px] h-[7px] rounded-sm bg-[linear-gradient(180deg,#f4b53c_0%,#d97757_100%)]" />
      {days}d
    </span>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/components/redesign/recover/RampHint.jsx frontend/src/components/redesign/recover/PhaseAdvancePrompt.jsx frontend/src/components/redesign/recover/FlareWarning.jsx frontend/src/components/redesign/recover/StreakChip.jsx
git -C /Users/mathewbudnik/coretriage commit -m "feat(recover): RampHint + PhaseAdvancePrompt + FlareWarning + StreakChip atoms"
```

---

## Task 18: RecoverActiveViewRedesign orchestrator

**Files:**
- Create: `frontend/src/components/redesign/recover/RecoverActiveViewRedesign.jsx`

The 4-state composition. Reads engine state from `useRehabEngine`, exercise list from `EXERCISES[region][phase]`, daily checkoffs from `useRehabProgress`. Renders the right state.

- [ ] **Step 1: Create**

```jsx
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import StageFrame from '../StageFrame'
import ProgressGradientBar from '../ProgressGradientBar'
import DailyCheckin from './DailyCheckin'
import CheckinSummaryRow from './CheckinSummaryRow'
import DayHero from './DayHero'
import ExerciseRow from './ExerciseRow'
import RampHint from './RampHint'
import PhaseAdvancePrompt from './PhaseAdvancePrompt'
import FlareWarning from './FlareWarning'
import StreakChip from './StreakChip'
import { useRehabEngine } from '../../../hooks/useRehabEngine'
import { useRehabProgress } from '../../../hooks/useRehabProgress'
import { EXERCISES } from '../../../data/exercises'

/**
 * Recover landing — 4 states:
 *   1. Pre-check-in (no checkin for today): DailyCheckin is the hero
 *   2. Normal day (checkin submitted, no advance/flare): Day anchor + exercises
 *   3. Phase advance ready (engine.can_advance === true)
 *   4. Flare detected (engine.flare.detected === true)
 *
 * Props:
 *   user:           the user object (for useRehabProgress)
 *   region:         string — from the active triage
 *   diagnosisName:  string — from the active triage's diagnosis
 *   diagnosisLabel: string — e.g. "Moderate"
 *   onRescreen:     () => void
 */
export default function RecoverActiveViewRedesign({ user, region, diagnosisName, diagnosisLabel, onRescreen }) {
  const navigate = useNavigate()
  const engine = useRehabEngine(region)
  const progress = useRehabProgress(user)

  // Until the engine returns, render a blank stage. Avoid hydration jitter.
  if (engine.loading || !engine.state) {
    return <StageFrame><div className="max-w-[440px] mx-auto px-5 py-12" /></StageFrame>
  }

  const { phase, day_in_phase, can_advance, flare, streak, ready_to_progress, checkin_today } = engine.state
  const exercises = useMemo(() => {
    const list = EXERCISES[region]?.[phase] || []
    return list.map((ex) => ({ ...ex, _key: `${region}:${phase}:${ex.name}` }))
  }, [region, phase])

  const doneCount = exercises.filter((e) => progress.checked.has(e._key)).length
  const pct = exercises.length ? (doneCount / exercises.length) * 100 : 0

  // State decision:
  //   if flare.detected → State 4
  //   else if can_advance → State 3
  //   else if !checkin_today → State 1
  //   else → State 2
  const renderState = flare.detected ? 4 : can_advance ? 3 : !checkin_today ? 1 : 2

  return (
    <StageFrame>
      <div className="max-w-[440px] mx-auto flex flex-col min-h-screen">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 pt-5 pb-1">
          <span className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-ct-cream-warm/45">
            Phase {phase} · Recover
          </span>
          <div className="flex items-center gap-2.5">
            <StreakChip days={streak} />
            {phase === 1 && (
              <span className="text-[11px] font-bold tracking-wide text-ct-cream-warm/45">
                {Math.max(0, 14 - day_in_phase)} days left
              </span>
            )}
          </div>
        </div>

        <div className="px-5 flex-1">
          {/* State 1 — pre-check-in */}
          {renderState === 1 && (
            <DailyCheckin
              dayContext={`Day ${day_in_phase} of ${phase === 1 ? 14 : 28}`}
              onSelect={(status) => engine.submitCheckin({ status })}
            />
          )}

          {/* States 2, 3, 4 share the check-in summary at top */}
          {renderState !== 1 && checkin_today && (
            <CheckinSummaryRow
              status={checkin_today.status}
              dayLabel={day_in_phase}
              onChange={() => {/* opens a re-check-in sheet — v1: no-op */}}
            />
          )}

          {/* State 3 — phase advance prompt */}
          {renderState === 3 && (
            <>
              <DayHero day={day_in_phase} total={phase === 1 ? 14 : 28} lede="You've hit your progression triggers." />
              <PhaseAdvancePrompt
                toPhase={phase + 1}
                headline={`Ready for Phase ${phase + 1}.`}
                body={`${countBetter(engine)} "Better" check-ins this week, ${Math.round(pct)}% completion today.`}
                onAdvance={() => engine.advance(phase + 1)}
                onDefer={() => {/* v1: no-op — engine re-evaluates next day */}}
              />
            </>
          )}

          {/* State 4 — flare */}
          {renderState === 4 && (
            <>
              <FlareWarning
                reason={flare.reason}
                onStepBack={() => engine.regress(flare.reason)}
                onRescreen={onRescreen}
              />
              <div className="opacity-60 mt-4">
                <div className="text-[32px] font-extrabold leading-[0.92] -tracking-[0.045em] text-ct-cream-warm">
                  Day {day_in_phase}<span className="text-[18px] font-semibold text-ct-cream-warm/45 ml-1.5">/ {phase === 1 ? 14 : 28}</span>
                </div>
                <p className="text-[13px] text-ct-cream-warm/55 mt-3 leading-[1.5]">Plan paused until you choose how to proceed.</p>
              </div>
            </>
          )}

          {/* State 2 — normal day */}
          {renderState === 2 && (
            <>
              <DayHero
                day={day_in_phase}
                total={phase === 1 ? 14 : 28}
                lede={
                  <>
                    {exercises.length} exercises · about 12 minutes. Working through{' '}
                    <span className="text-ct-terracotta font-bold">{diagnosisName}</span>.
                  </>
                }
              />
              <div className="flex items-center gap-3.5 py-4">
                <ProgressGradientBar pct={pct} className="flex-1" />
                <span className="text-[11.5px] font-extrabold tracking-wide text-ct-cream-warm/45 tabular-nums">
                  <span className="text-ct-terracotta">{doneCount}</span> / {exercises.length} today
                </span>
              </div>
              <div>
                {exercises.map((ex, i) => (
                  <ExerciseRow
                    key={ex._key}
                    index={i + 1}
                    title={ex.name}
                    sub={ex.dosage ?? ex.sub ?? ''}
                    done={progress.checked.has(ex._key)}
                    readyToProgress={ready_to_progress.includes(ex._key)}
                    onToggle={() => progress.toggle(ex._key, region, phase)}
                    onOpen={() => navigate(`/exercise/${encodeURIComponent(ex._key)}`)}
                  />
                ))}
              </div>
              <RampHint>
                {can_advance
                  ? <>Hit your progression triggers — advance prompt active above.</>
                  : <>Stay consistent — your plan adapts based on these check-ins.</>}
              </RampHint>
            </>
          )}
        </div>

        {/* Re-screen footer */}
        <div className="px-5 pt-3.5 pb-6">
          <button
            type="button"
            onClick={onRescreen}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-[rgba(217,119,87,0.06)] shadow-[0_0_0_0.5px_rgba(217,119,87,0.20)] text-ct-terracotta font-bold text-[13px] hover:bg-[rgba(217,119,87,0.10)] transition-colors duration-200"
          >
            Something new hurts? <span className="opacity-70">Re-screen</span>
          </button>
        </div>
      </div>
    </StageFrame>
  )
}

function countBetter(engine) {
  // The engine returns at most 7 days of check-ins via state — but we don't
  // expose them yet. For v1 we just say "several" via the template; tighten in v1.1.
  return 'Several'
}
```

- [ ] **Step 2: Visual smoke test**

Temporarily mount at a debug route. Click between the 4 states by overriding `engine.state` (or by submitting check-ins to drive the real engine). Walk through:
- State 1: Submit "Better" → state transitions to 2 (or 3 if eligible).
- Toggle exercises → progress bar tweens, "Ready to progress" hints appear/hide per the engine response.

Revert temp mount.

- [ ] **Step 3: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/components/redesign/recover/RecoverActiveViewRedesign.jsx
git -C /Users/mathewbudnik/coretriage commit -m "feat(recover): RecoverActiveViewRedesign 4-state orchestrator"
```

---

## Task 19: Wire into RecoverTab

**Files:**
- Modify: `frontend/src/components/RecoverTab.jsx`

Swap the import. Keep the same active/empty decision logic.

- [ ] **Step 1: Read the existing RecoverTab**

Open `frontend/src/components/RecoverTab.jsx`. Identify the `<RecoverActiveView ... />` render block (~line 90-101). Note all the props passed.

- [ ] **Step 2: Swap the import + render**

Replace the `import RecoverActiveView` line at the top with:

```jsx
import RecoverActiveViewRedesign from './redesign/recover/RecoverActiveViewRedesign'
```

Replace the existing `<RecoverActiveView ... />` block with:

```jsx
<RecoverActiveViewRedesign
  user={user}
  region={activeTriage.injury_area}
  diagnosisName={diagnosis?.buckets?.[0]?.label ?? 'your injury'}
  diagnosisLabel={diagnosis?.buckets?.[0]?.severity ?? 'Moderate'}
  onRescreen={() => navigate('/triage')}
/>
```

(Keep the old `import RecoverActiveView` removed — it's no longer used.)

- [ ] **Step 3: End-to-end manual test**

Run: `cd frontend && npm run dev`. Walk:
1. Triage → get a diagnosis → land on Recover.
2. State 1: see the check-in hero. Submit "Better".
3. State 2: see the day anchor + exercises. Toggle some.
4. To test State 3: in DB, insert enough qualifying check-ins (3 "better" in 7d, 5 completion days, day_in_phase >= 10).
5. To test State 4: insert 3 "worse" in 5d.

- [ ] **Step 4: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/components/RecoverTab.jsx
git -C /Users/mathewbudnik/coretriage commit -m "feat(recover): swap RecoverActiveView for RecoverActiveViewRedesign"
```

---

## Task 20: A11y + reduced-motion pass

Mirror Phase A's a11y task. Verify ARIA, focus order, tap targets, prefers-reduced-motion.

- [ ] **Step 1: Run the same checks from Phase A Task 17** on the new recover/* components.
- [ ] **Step 2: Verify the check-in chips are reachable by keyboard** (Tab navigates, Enter activates).
- [ ] **Step 3: Verify the phase advance + flare prompts trap focus appropriately** (they're inline panels not modals, so no trap; ensure primary CTA gets focus when prompt appears via `autoFocus` if needed).
- [ ] **Step 4: Commit any fixes.**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/components/redesign/recover/
git -C /Users/mathewbudnik/coretriage commit -m "fix(a11y): Recover redesign tap targets + focus + reduced-motion"
```

---

## Phase B complete

After Task 20:
- Recover landing renders the 4-state pattern driven by real engine state.
- `rehab_checkins` table accumulates daily signal.
- Phase transitions logged via `rehab_phase_transitions`.
- `useRehabProgress` (daily checkoffs) untouched.
- `progression_trigger` strings in exercises.js are not yet parsed — Phase B v1 uses the hardcoded 5-day rule for all exercises. v1.1 follow-up: structured `trigger_kind` field on each exercise.

**v1.1 deferred items** (out of scope for this plan, surface in a follow-up):
- Persist user-confirmed phase advancement (read latest `rehab_phase_transitions` row as source-of-truth, override calendar)
- Parse `progression_trigger` strings into structured rules
- Per-exercise streak query (currently empty in `/api/rehab/state` — `ready_to_progress` always `[]`)
- "Defer" path on phase advance prompt (re-eval after 3 days)
- Optional pain slider on check-in
- Streak celebrations at 7d / 30d milestones

Phase C (screen-new sheet) is the last remaining plan.
