# Triage → Recover Seam Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn a triage diagnosis into a persisted, trackable rehab plan with a felt "recovering" signal (streak + 7-day adherence) and an auto-handoff into Recover — without weakening any safety content and without touching the parallel agent's Log-a-climb surfaces.

**Architecture:** A new pure module (`src/rehab.py`) computes phase / streak / 7-day adherence (CI-safe, no DB). A new `rehab_plans` table persists the active injury; a `POST /api/rehab/plan` (called by the frontend only for **non-severe** diagnoses) creates/reuses it, and `GET /api/rehab/plan` returns `{plan, phase, streak, last7}`. The Recover hero gains a `RecoverRecoveringStrip` (phase ladder + streak + adherence). TriageTab auto-routes non-severe diagnoses into Recover after a short beat; severe diagnoses stay on the clinical-referral screen.

**Tech Stack:** Python/FastAPI + psycopg2 (Postgres), pytest/unittest; React 18 + Vite + Tailwind (Almanac tokens) + framer-motion, vitest + @testing-library/react.

**Conventions:** Tokens only, no emojis, lucide icons, `.ct-surface` field-cards, snappy motion (~0.16s), Almanac grep gate stays 0. The recovering signal is **adherence/effort, never a medical verdict**. Severe diagnoses NEVER auto-route into a self-managed plan. **Do not edit** the Log-a-climb avoid-list (see spec §"Avoid-list"); in shared files add new symbols only.

---

## File Structure

| File | Create/Modify | Responsibility |
|---|---|---|
| `src/rehab.py` | Create | Pure `rehab_phase`, `rehab_streak`, `rehab_last7` |
| `tests/test_rehab.py` | Create | Pure-function tests (no DB, CI-safe) |
| `database.py` | Modify | `rehab_plans` table + helpers (near `:471`) |
| `main.py` | Modify | `GET`/`POST /api/rehab/plan`, request model, serialization (add symbols only) |
| `tests/test_rehab_plan_api.py` | Create | Real-DB endpoint/helper tests |
| `frontend/src/api.js` | Modify | `getRehabPlan`, `createRehabPlan` (add only) |
| `frontend/src/components/RecoverRecoveringStrip.jsx` | Create | Phase ladder + streak + 7-day adherence |
| `frontend/src/components/RecoverRecoveringStrip.test.jsx` | Create | Component test |
| `frontend/src/components/RecoverTab.jsx` | Modify | Fetch the plan; pass `recovering` + plan-derived triage |
| `frontend/src/components/RecoverActiveView.jsx` | Modify | Use server phase; render the strip |
| `frontend/src/components/TriageTab.jsx` | Modify | Create plan (non-severe, signed-in) + auto-route non-severe |

---

## PHASE A — Backend

### Task 1: `src/rehab.py` — pure phase / streak / adherence

**Files:**
- Create: `src/rehab.py`
- Test: `tests/test_rehab.py`

- [ ] **Step 1: Write the failing tests**

Create `tests/test_rehab.py`:

```python
"""Pure-function tests for rehab phase / streak / adherence. No DB — CI-safe."""
from __future__ import annotations

import os
import sys
import unittest
from datetime import date

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.rehab import rehab_phase, rehab_streak, rehab_last7  # noqa: E402


class RehabPhaseTests(unittest.TestCase):
    def test_phase_boundaries(self):
        start = date(2026, 1, 1)
        self.assertEqual(rehab_phase(start, date(2026, 1, 1))["phase"], 1)   # day 0
        self.assertEqual(rehab_phase(start, date(2026, 1, 14))["phase"], 1)  # day 13
        self.assertEqual(rehab_phase(start, date(2026, 1, 15))["phase"], 2)  # day 14
        self.assertEqual(rehab_phase(start, date(2026, 2, 11))["phase"], 2)  # day 41
        self.assertEqual(rehab_phase(start, date(2026, 2, 12))["phase"], 3)  # day 42

    def test_day_in_phase_is_one_indexed(self):
        start = date(2026, 1, 1)
        p = rehab_phase(start, date(2026, 1, 1))
        self.assertEqual(p["day_in_phase"], 1)
        self.assertEqual(p["phase_length"], 14)

    def test_accepts_iso_strings_and_clamps_negative(self):
        self.assertEqual(rehab_phase("2026-01-01", "2026-01-20")["phase"], 2)
        # a future start clamps days to 0 -> phase 1
        self.assertEqual(rehab_phase(date(2026, 2, 1), date(2026, 1, 1))["days"], 0)

    def test_none_start_returns_none(self):
        self.assertIsNone(rehab_phase(None, date(2026, 1, 1)))


class RehabStreakTests(unittest.TestCase):
    def test_consecutive_days_including_today(self):
        dates = ["2026-06-11", "2026-06-10", "2026-06-09"]
        self.assertEqual(rehab_streak(dates, "2026-06-11"), 3)

    def test_grace_when_today_not_done_but_yesterday_is(self):
        dates = ["2026-06-10", "2026-06-09"]
        self.assertEqual(rehab_streak(dates, "2026-06-11"), 2)

    def test_zero_when_gap(self):
        dates = ["2026-06-08"]  # 3 days ago
        self.assertEqual(rehab_streak(dates, "2026-06-11"), 0)

    def test_dedupes_same_day_rows(self):
        dates = ["2026-06-11", "2026-06-11", "2026-06-10"]
        self.assertEqual(rehab_streak(dates, "2026-06-11"), 2)


class RehabLast7Tests(unittest.TestCase):
    def test_count_and_days_oldest_to_newest(self):
        # done today, yesterday, and 4 days ago
        dates = ["2026-06-11", "2026-06-10", "2026-06-07"]
        out = rehab_last7(dates, "2026-06-11")
        self.assertEqual(out["count"], 3)
        self.assertEqual(len(out["days"]), 7)
        self.assertTrue(out["days"][6])   # today (newest, last)
        self.assertTrue(out["days"][5])   # yesterday
        self.assertTrue(out["days"][2])   # 4 days ago (index 6-4)
        self.assertFalse(out["days"][0])  # 6 days ago

    def test_ignores_days_older_than_7(self):
        dates = ["2026-06-01"]  # 10 days ago
        out = rehab_last7(dates, "2026-06-11")
        self.assertEqual(out["count"], 0)
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd /Users/mathewbudnik/coretriage && pytest tests/test_rehab.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'src.rehab'`.

- [ ] **Step 3: Create `src/rehab.py`**

```python
"""Pure rehab progress math: phase estimate, check-off streak, 7-day adherence.

No DB, no FastAPI — unit-testable and safe to import anywhere. `rehab_phase`
mirrors the frontend `lib/rehabHeuristic.js` thresholds exactly:
  Phase 1: days 0-13 (length 14), Phase 2: 14-41 (length 28), Phase 3: 42+ (length 28).

The streak/adherence are ADHERENCE signals (did the climber show up), never a
clinical recovery claim.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta


def _to_date(v) -> date | None:
    if v is None:
        return None
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    s = str(v)
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).date()
    except Exception:
        try:
            return date.fromisoformat(s[:10])
        except Exception:
            return None


def rehab_phase(plan_started, today=None) -> dict | None:
    """Days-since-start phase estimate. Returns
    {phase, day_in_phase (1-indexed), phase_length, days} or None."""
    start = _to_date(plan_started)
    if start is None:
        return None
    t = _to_date(today) or date.today()
    days = max(0, (t - start).days)
    if days < 14:
        phase, di, plen = 1, days, 14
    elif days < 42:
        phase, di, plen = 2, days - 14, 28
    else:
        phase, di, plen = 3, days - 42, 28
    return {"phase": phase, "day_in_phase": di + 1, "phase_length": plen, "days": days}


def rehab_streak(checkoff_dates, today: str) -> int:
    """Consecutive calendar days ending today (or yesterday — a one-day grace so a
    not-yet-done today doesn't break the streak) that have >=1 check-off."""
    s = {str(d)[:10] for d in checkoff_dates}
    t = date.fromisoformat(today)
    cur = t if t.isoformat() in s else (t - timedelta(days=1))
    if cur.isoformat() not in s:
        return 0
    streak = 0
    while cur.isoformat() in s:
        streak += 1
        cur -= timedelta(days=1)
    return streak


def rehab_last7(checkoff_dates, today: str) -> dict:
    """{count, days:[bool x7]} for the last 7 days incl. today, oldest -> newest."""
    s = {str(d)[:10] for d in checkoff_dates}
    t = date.fromisoformat(today)
    days = [(t - timedelta(days=i)).isoformat() in s for i in range(6, -1, -1)]
    return {"count": sum(days), "days": days}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd /Users/mathewbudnik/coretriage && pytest tests/test_rehab.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add src/rehab.py tests/test_rehab.py
git -C /Users/mathewbudnik/coretriage commit -m "feat(recover): pure rehab phase + streak + 7-day adherence"
```

### Task 2: `rehab_plans` table + DB helpers

**Files:**
- Modify: `database.py` — table in `init_db()` (after the `rehab_progress` index block, ~line 471); helpers near the rehab helpers (~line 2513)
- Test: `tests/test_rehab_plan_api.py` (create; helper tests)

- [ ] **Step 1: Write the failing test**

Create `tests/test_rehab_plan_api.py` (harness mirrors `tests/test_state_endpoint.py`; disable limiter in-process):

```python
"""Real-DB tests for the rehab-plan helpers + endpoints."""
from __future__ import annotations

import os
import sys
import unittest

from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import (  # noqa: E402
    _connect, init_db,
    save_session,
    create_or_reuse_rehab_plan,
    get_active_rehab_plan,
    get_rehab_checkoff_dates,
    check_rehab_exercise,
)
from main import app  # noqa: E402

app.state.limiter.enabled = False  # churn register/login without tripping the 5/min auth limit

_TEST_PASSWORD = "Rehab!Test1pw"


def _cleanup_user(email: str) -> None:
    with _connect() as conn, conn.cursor() as cur:
        cur.execute("DELETE FROM users WHERE email = %s;", (email,))
        conn.commit()


def _register_and_login(email: str) -> str:
    c = TestClient(app)
    r = c.post("/api/auth/register", json={"email": email, "password": _TEST_PASSWORD})
    assert r.status_code == 200, r.text
    r = c.post("/api/auth/login", json={"email": email, "password": _TEST_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["token"]


def _uid(email: str) -> int:
    with _connect() as conn, conn.cursor() as cur:
        cur.execute("SELECT id FROM users WHERE email = %s;", (email,))
        return cur.fetchone()[0]


class RehabPlanHelperTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()

    def setUp(self):
        self.email = "rehab_plan_db@coretriage.local"
        _cleanup_user(self.email)
        _register_and_login(self.email)
        self.uid = _uid(self.email)

    def tearDown(self):
        _cleanup_user(self.email)

    def test_create_and_get_active(self):
        plan = create_or_reuse_rehab_plan(self.uid, None, "Finger")
        self.assertEqual(plan["region"], "Finger")
        self.assertEqual(plan["status"], "active")
        active = get_active_rehab_plan(self.uid)
        self.assertEqual(active["id"], plan["id"])

    def test_same_region_reuses_and_preserves_start(self):
        first = create_or_reuse_rehab_plan(self.uid, None, "Finger")
        again = create_or_reuse_rehab_plan(self.uid, None, "Finger")
        self.assertEqual(first["id"], again["id"])
        self.assertEqual(first["plan_started_at"], again["plan_started_at"])

    def test_different_region_supersedes(self):
        first = create_or_reuse_rehab_plan(self.uid, None, "Finger")
        second = create_or_reuse_rehab_plan(self.uid, None, "Shoulder")
        self.assertNotEqual(first["id"], second["id"])
        active = get_active_rehab_plan(self.uid)
        self.assertEqual(active["id"], second["id"])
        self.assertEqual(active["region"], "Shoulder")

    def test_checkoff_dates_distinct_desc(self):
        check_rehab_exercise(self.uid, "Finger:1:A", "Finger", 1, "2026-06-10")
        check_rehab_exercise(self.uid, "Finger:1:B", "Finger", 1, "2026-06-10")  # same day
        check_rehab_exercise(self.uid, "Finger:1:A", "Finger", 1, "2026-06-11")
        dates = get_rehab_checkoff_dates(self.uid)
        self.assertEqual(dates, ["2026-06-11", "2026-06-10"])
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd /Users/mathewbudnik/coretriage && pytest tests/test_rehab_plan_api.py::RehabPlanHelperTests -v`
Expected: FAIL — `ImportError: cannot import name 'create_or_reuse_rehab_plan'`.

- [ ] **Step 3a: Add the table to `init_db()`**

In `database.py`, immediately after the `rehab_progress` index block (ends ~line 471, the `CREATE INDEX ... rehab_progress_user_date_idx` `cur.execute(...)`), add:

```python
            # ── Rehab plans (the active injury / recovery loop) ────────────
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS rehab_plans (
                    id               SERIAL PRIMARY KEY,
                    user_id          INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    session_id       INT REFERENCES sessions(id) ON DELETE SET NULL,
                    region           TEXT NOT NULL,
                    current_phase    INT NOT NULL DEFAULT 1,
                    plan_started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    status           TEXT NOT NULL DEFAULT 'active',
                    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                """
            )
            cur.execute(
                "CREATE INDEX IF NOT EXISTS rehab_plans_user_status_idx "
                "ON rehab_plans (user_id, status);"
            )
```

- [ ] **Step 3b: Add the helpers near the other rehab helpers**

In `database.py`, after `uncheck_rehab_exercise` (~line 2513), add:

```python
def _rehab_plan_row(row) -> dict[str, Any]:
    return {
        "id":               row[0],
        "user_id":          row[1],
        "session_id":       row[2],
        "region":           row[3],
        "current_phase":    int(row[4]),
        "plan_started_at":  str(row[5]),
        "status":           row[6],
        "last_activity_at": str(row[7]),
        "created_at":       str(row[8]),
    }


_REHAB_PLAN_COLS = ("id, user_id, session_id, region, current_phase, "
                    "plan_started_at, status, last_activity_at, created_at")


def get_active_rehab_plan(user_id: int) -> dict[str, Any] | None:
    """The user's single active rehab plan, or None."""
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            f"SELECT {_REHAB_PLAN_COLS} FROM rehab_plans "
            "WHERE user_id = %s AND status = 'active' "
            "ORDER BY created_at DESC LIMIT 1;",
            (int(user_id),),
        )
        row = cur.fetchone()
    return _rehab_plan_row(row) if row else None


def create_or_reuse_rehab_plan(
    user_id: int, session_id: int | None, region: str,
) -> dict[str, Any]:
    """Reuse the active plan if it's the SAME region (preserves plan_started_at +
    streak); otherwise abandon any active plan and create a fresh one."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id FROM rehab_plans "
                "WHERE user_id = %s AND status = 'active' AND region = %s "
                "ORDER BY created_at DESC LIMIT 1;",
                (int(user_id), region),
            )
            same = cur.fetchone()
            if same:
                cur.execute(
                    "UPDATE rehab_plans SET last_activity_at = NOW() WHERE id = %s;",
                    (same[0],),
                )
            else:
                cur.execute(
                    "UPDATE rehab_plans SET status = 'abandoned' "
                    "WHERE user_id = %s AND status = 'active';",
                    (int(user_id),),
                )
                cur.execute(
                    "INSERT INTO rehab_plans (user_id, session_id, region) "
                    "VALUES (%s, %s, %s);",
                    (int(user_id), int(session_id) if session_id is not None else None, region),
                )
        conn.commit()
    return get_active_rehab_plan(user_id)


def get_rehab_checkoff_dates(user_id: int) -> list[str]:
    """Distinct local dates (newest first) on which the user checked off >=1 exercise."""
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT DISTINCT completed_date FROM rehab_progress "
            "WHERE user_id = %s ORDER BY completed_date DESC;",
            (int(user_id),),
        )
        rows = cur.fetchall()
    return [str(r[0]) for r in rows]
```

(`json`/`Any` already imported at the top of `database.py`.)

- [ ] **Step 4: Run to verify it passes**

Run: `cd /Users/mathewbudnik/coretriage && pytest tests/test_rehab_plan_api.py::RehabPlanHelperTests -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add database.py tests/test_rehab_plan_api.py
git -C /Users/mathewbudnik/coretriage commit -m "feat(recover): rehab_plans table + create/reuse + checkoff-dates helpers"
```

### Task 3: `GET`/`POST /api/rehab/plan` endpoints

**Files:**
- Modify: `main.py` — import the new helpers + `src.rehab`; request model; two endpoints near the rehab endpoints (~line 1868)
- Test: `tests/test_rehab_plan_api.py` — add `RehabPlanEndpointTests`

- [ ] **Step 1: Write the failing test**

Append to `tests/test_rehab_plan_api.py`:

```python
class RehabPlanEndpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()

    def setUp(self):
        self.email = "rehab_plan_api@coretriage.local"
        _cleanup_user(self.email)
        self.token = _register_and_login(self.email)
        self.uid = _uid(self.email)
        self.client = TestClient(app)

    def tearDown(self):
        _cleanup_user(self.email)

    def _auth(self):
        return {"Authorization": f"Bearer {self.token}"}

    def test_no_plan_returns_nulls(self):
        r = self.client.get("/api/rehab/plan?date=2026-06-11", headers=self._auth())
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertIsNone(body["plan"])
        self.assertEqual(body["streak"], 0)
        self.assertEqual(body["last7"]["count"], 0)

    def test_create_then_get_plan_with_phase_and_streak(self):
        r = self.client.post("/api/rehab/plan", json={"region": "Finger"}, headers=self._auth())
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json()["plan"]["region"], "Finger")
        # one check-off today -> streak 1, last7 count 1
        check_rehab_exercise(self.uid, "Finger:1:A", "Finger", 1, "2026-06-11")
        r = self.client.get("/api/rehab/plan?date=2026-06-11", headers=self._auth())
        body = r.json()
        self.assertEqual(body["plan"]["region"], "Finger")
        self.assertEqual(body["phase"]["phase"], 1)   # brand-new plan -> phase 1
        self.assertEqual(body["streak"], 1)
        self.assertEqual(body["last7"]["count"], 1)
        self.assertTrue(body["last7"]["days"][6])      # today

    def test_requires_auth(self):
        r = TestClient(app).get("/api/rehab/plan?date=2026-06-11")
        self.assertIn(r.status_code, (401, 403))


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd /Users/mathewbudnik/coretriage && pytest tests/test_rehab_plan_api.py::RehabPlanEndpointTests -v`
Expected: FAIL — 404 (endpoints missing).

- [ ] **Step 3a: Imports + request model in `main.py`**

Add to the `from database import (...)` block in `main.py`:

```python
    create_or_reuse_rehab_plan,
    get_active_rehab_plan,
    get_rehab_checkoff_dates,
```

Add near the other `src.*` imports:

```python
from src.rehab import rehab_phase, rehab_streak, rehab_last7
```

Add the request model near `RehabUncheckRequest` (main.py:508):

```python
class CreateRehabPlanRequest(BaseModel):
    region: str
    session_id: int | None = None
```

- [ ] **Step 3b: Add the endpoints after `delete_rehab_check` (main.py:1868)**

```python
@app.get("/api/rehab/plan")
@limiter.limit("60/minute")
def get_rehab_plan(request: Request, date: str, user: dict = Depends(get_current_user)):
    """The user's active rehab plan + date-derived phase + check-off streak +
    7-day adherence. `date` is the user's local ISO date (YYYY-MM-DD)."""
    if not _DATE_RE.match(date or ""):
        raise HTTPException(status_code=400, detail="date must be YYYY-MM-DD")
    plan = get_active_rehab_plan(user["id"])
    if plan is None:
        return {"plan": None, "phase": None, "streak": 0,
                "last7": {"count": 0, "days": [False] * 7}}
    checkoff_dates = get_rehab_checkoff_dates(user["id"])
    return {
        "plan":   plan,
        "phase":  rehab_phase(plan["plan_started_at"], date),
        "streak": rehab_streak(checkoff_dates, date),
        "last7":  rehab_last7(checkoff_dates, date),
    }


@app.post("/api/rehab/plan")
@limiter.limit("30/minute")
def post_rehab_plan(
    request: Request,
    req: CreateRehabPlanRequest,
    user: dict = Depends(get_current_user),
):
    """Create/reuse the active rehab plan for a region. The frontend calls this
    only for NON-severe diagnoses (severe stays a clinical referral)."""
    if not req.region or len(req.region) > 50:
        raise HTTPException(status_code=400, detail="region invalid")
    plan = create_or_reuse_rehab_plan(user["id"], req.session_id, req.region)
    return {"plan": plan}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd /Users/mathewbudnik/coretriage && pytest tests/test_rehab_plan_api.py -v`
Expected: PASS (helper + endpoint tests).

- [ ] **Step 5: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add main.py tests/test_rehab_plan_api.py
git -C /Users/mathewbudnik/coretriage commit -m "feat(recover): GET/POST /api/rehab/plan (phase + streak + adherence)"
```

---

## PHASE B — Frontend

### Task 4: `api.js` wrappers

**Files:**
- Modify: `frontend/src/api.js`

- [ ] **Step 1: Add the wrappers**

In `frontend/src/api.js`, after the rehab progress wrappers (the `uncheckRehabExercise` line, ~106), add:

```js
// Rehab plan (the recover loop: persisted active injury + recovering signal)
export const getRehabPlan = (date) =>
  request('GET', `/api/rehab/plan?date=${encodeURIComponent(date)}`)
export const createRehabPlan = ({ region, session_id }) =>
  request('POST', '/api/rehab/plan', { region, session_id })
```

- [ ] **Step 2: Verify the build compiles**

Run: `cd /Users/mathewbudnik/coretriage/frontend && npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/api.js
git -C /Users/mathewbudnik/coretriage commit -m "feat(recover): api.js wrappers for rehab plan fetch + create"
```

### Task 5: `RecoverRecoveringStrip.jsx`

**Files:**
- Create: `frontend/src/components/RecoverRecoveringStrip.jsx`
- Test: `frontend/src/components/RecoverRecoveringStrip.test.jsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/RecoverRecoveringStrip.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import RecoverRecoveringStrip from './RecoverRecoveringStrip'

const serverPhase = { phase: 2, day_in_phase: 5, phase_length: 28, days: 18 }
const last7 = { count: 5, days: [true, true, false, true, true, false, true] }

describe('RecoverRecoveringStrip', () => {
  it('renders the phase caption, streak, and adherence', () => {
    render(<RecoverRecoveringStrip serverPhase={serverPhase} streak={6} last7={last7} />)
    expect(screen.getByText(/Phase 2 of 3/i)).toBeTruthy()
    expect(screen.getByText(/day 5/i)).toBeTruthy()
    expect(screen.getByText('6')).toBeTruthy()        // streak value
    expect(screen.getByText(/5/)).toBeTruthy()         // last7 count
    expect(screen.getByText(/of 7/i)).toBeTruthy()
  })

  it('renders nothing without phase data', () => {
    const { container } = render(<RecoverRecoveringStrip serverPhase={null} streak={0} last7={last7} />)
    expect(container.firstChild).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd /Users/mathewbudnik/coretriage/frontend && npx vitest run src/components/RecoverRecoveringStrip.test.jsx`
Expected: FAIL — cannot resolve `./RecoverRecoveringStrip`.

- [ ] **Step 3: Create the component**

Create `frontend/src/components/RecoverRecoveringStrip.jsx` (Almanac warm/sage injury palette, lucide icons, no emoji):

```jsx
import { Flame, RotateCcw } from 'lucide-react'

/**
 * The "recovering" strip for the Recover hero: a phase ladder + a streak tile +
 * a 7-day adherence tile. This is an ADHERENCE signal (did you show up), never a
 * clinical recovery verdict.
 *
 * Props:
 *   serverPhase: { phase, day_in_phase, phase_length, days } | null
 *   streak:      number  — consecutive days with >=1 check-off
 *   last7:       { count, days: [bool x7] }  — oldest -> newest
 */
export default function RecoverRecoveringStrip({ serverPhase, streak = 0, last7 }) {
  if (!serverPhase) return null
  const { phase, day_in_phase } = serverPhase
  const days = last7?.days ?? Array(7).fill(false)
  const count = last7?.count ?? 0

  return (
    <div className="mt-3">
      {/* phase ladder */}
      <div className="flex items-center gap-1.5">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={`flex-1 h-[5px] rounded-full ${
              n < phase ? 'bg-sage' : n === phase ? 'bg-sage-deep' : 'bg-[rgba(42,39,34,0.10)]'
            }`}
          />
        ))}
      </div>
      <p className="mt-1.5 text-[10px] font-mono uppercase tracking-[0.1em] text-ink-muted">
        Phase {phase} of 3 · day {day_in_phase}
      </p>

      {/* recovering stats */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="rounded-xl border border-ct-rim bg-paper px-3 py-2.5">
          <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-ink-muted">
            <Flame size={12} className="text-clay-deep" strokeWidth={2.2} /> Streak
          </span>
          <span className="block mt-0.5 font-serif font-semibold text-[21px] text-ink leading-none">
            {streak}<span className="text-[11px] font-sans font-semibold text-ink-muted ml-1">days</span>
          </span>
        </div>
        <div className="rounded-xl border border-ct-rim bg-paper px-3 py-2.5">
          <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-ink-muted">
            <RotateCcw size={12} className="text-sage-deep" strokeWidth={2.2} /> Last 7 days
          </span>
          <span className="block mt-0.5 font-serif font-semibold text-[21px] text-ink leading-none">
            {count}<span className="text-[11px] font-sans font-semibold text-ink-muted ml-1">of 7</span>
          </span>
          <span className="flex gap-1 mt-1.5">
            {days.map((on, i) => (
              <span
                key={i}
                className={`w-[8px] h-[8px] rounded-full ${
                  on ? 'bg-sage-deep' : 'border-[1.5px] border-ct-rim'
                }`}
              />
            ))}
          </span>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd /Users/mathewbudnik/coretriage/frontend && npx vitest run src/components/RecoverRecoveringStrip.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/components/RecoverRecoveringStrip.jsx frontend/src/components/RecoverRecoveringStrip.test.jsx
git -C /Users/mathewbudnik/coretriage commit -m "feat(recover): RecoverRecoveringStrip (phase ladder + streak + adherence)"
```

### Task 6: Wire the plan into `RecoverTab` + `RecoverActiveView`

**Files:**
- Modify: `frontend/src/components/RecoverTab.jsx`, `frontend/src/components/RecoverActiveView.jsx`

- [ ] **Step 1: `RecoverTab.jsx` — fetch the plan, derive `recovering` + a plan-triage**

In `RecoverTab.jsx`, add `getRehabPlan` to the api import:

```jsx
import { getSessions, getRehabPlan } from '../api'
```

Add state + a local-today helper near the other hooks (after `const { checked, toggle } = useRehabProgress(user)`):

```jsx
  const [recovering, setRecovering] = useState(null) // { phase, streak, last7 } | null
  const [planTriage, setPlanTriage] = useState(null) // { id, injury_area, created_at } | null
```

Extend the signed-in fetch `useEffect` (the one calling `getSessions(5)`) to also load the plan:

```jsx
  useEffect(() => {
    if (!user) { setLoading(false); return }
    let cancelled = false
    const today = new Date().toLocaleDateString('en-CA')
    Promise.all([
      getSessions(5).catch(() => []),
      getRehabPlan(today).catch(() => null),
    ])
      .then(([sessions, plan]) => {
        if (cancelled) return
        setRecent(sessions || [])
        if (plan?.plan) {
          setRecovering({ phase: plan.phase, streak: plan.streak, last7: plan.last7 })
          setPlanTriage({
            id: plan.plan.id,
            injury_area: plan.plan.region,
            created_at: plan.plan.plan_started_at,
          })
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user])
```

Make `activeTriage` prefer in-memory (just-submitted) then the durable plan then the scan, and pass `recovering` down. Replace the `activeTriage` line + the `RecoverActiveView` render:

```jsx
  const activeTriage = inMemoryTriage ?? planTriage ?? recent.find(isActiveTriage)

  if (activeTriage) {
    return (
      <RecoverActiveView
        triage={activeTriage}
        diagnosis={diagnosis}
        diagnosisForm={diagnosisForm}
        savedSessionId={savedSessionId}
        signedIn={!!user}
        onLoginClick={onLoginClick}
        checked={checked}
        onToggle={toggle}
        recovering={recovering}
      />
    )
  }
```

- [ ] **Step 2: `RecoverActiveView.jsx` — use server phase + render the strip**

Add the import:

```jsx
import RecoverRecoveringStrip from './RecoverRecoveringStrip'
```

Accept the new prop (add `recovering` to the destructured props) and prefer the server phase. Replace:

```jsx
  const region = triage.injury_area
  const rp = rehabProgress(triage.created_at)
  const phase = rp?.phase ?? 1
```

with:

```jsx
  const region = triage.injury_area
  const rp = rehabProgress(triage.created_at)
  const serverPhase = recovering?.phase ?? null            // { phase, day_in_phase, ... } | null
  const phase = serverPhase?.phase ?? rp?.phase ?? 1
```

In the `hero` JSX, replace the `<RecoverStatusPills pills={pills} />` line with the pills **plus** the recovering strip (the strip renders only when `recovering` is present):

```jsx
      <RecoverStatusPills pills={pills} />
      {recovering && (
        <RecoverRecoveringStrip
          serverPhase={serverPhase}
          streak={recovering.streak}
          last7={recovering.last7}
        />
      )}
```

(Leave the rest of the hero — the "Today's progress" bar — unchanged. The existing `phase` pill now agrees with the server-derived phase.)

- [ ] **Step 3: Verify build + tests**

Run: `cd /Users/mathewbudnik/coretriage/frontend && npm run build && npx vitest run`
Expected: build green; all vitest pass (incl. the new strip test).

- [ ] **Step 4: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/components/RecoverTab.jsx frontend/src/components/RecoverActiveView.jsx
git -C /Users/mathewbudnik/coretriage commit -m "feat(recover): load durable plan + render recovering strip in Recover hero"
```

### Task 7: Auto-handoff in `TriageTab.jsx` (non-severe only)

**Files:**
- Modify: `frontend/src/components/TriageTab.jsx`

- [ ] **Step 1: Create the plan for non-severe signed-in diagnoses**

In `TriageTab.jsx`, add `createRehabPlan` to the api import:

```jsx
import { triageIntake, saveSession, createRehabPlan } from '../api'
```

In `handleSubmit`, right after the `saveSession` block (after `savedSessionId` is set, before `saveLastTriage(...)`), add the plan creation — **non-severe + signed-in only**:

```jsx
      // Persist a durable rehab plan for signed-in, non-severe diagnoses so
      // Recover loads it on its own (cross-device). Severe diagnoses are a
      // clinical referral, NOT a self-managed plan — never create one.
      const isSevere = data?.severity?.level === 'severe'
      if (user && !isSevere) {
        try {
          await createRehabPlan({ region: form.region, session_id: savedSessionId })
        } catch (_) { /* swallowed — sessionStorage fallback still works */ }
      }
```

- [ ] **Step 2: Auto-route non-severe diagnoses into Recover**

Add a `useEffect` after `openRehabPlan` is defined (it reads `result`, so place it below the `openRehabPlan` useCallback). The diagnosis reveals inline first; non-severe auto-advances after a short beat; severe stays put:

```jsx
  // Auto-handoff: once a non-severe diagnosis has revealed inline, advance to the
  // Recover plan after a short readable beat. Severe diagnoses stay on the
  // clinical-referral screen and are never auto-routed into a self-managed plan.
  useEffect(() => {
    if (!result) return
    if (result?.severity?.level === 'severe') return
    const t = setTimeout(openRehabPlan, 1200)
    return () => clearTimeout(t)
  }, [result, openRehabPlan])
```

Ensure `useEffect` is imported in `TriageTab.jsx` (it uses `useCallback`/`useState` already; add `useEffect` to the React import if not present).

- [ ] **Step 3: Verify build + tests + manual reasoning**

Run: `cd /Users/mathewbudnik/coretriage/frontend && npm run build && npx vitest run`
Expected: build green; all vitest pass. (The auto-route is timer-based UI behavior; it is covered by manual smoke in Task 8, not a unit test — the existing `openRehabPlan` navigation is unchanged.)

- [ ] **Step 4: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/components/TriageTab.jsx
git -C /Users/mathewbudnik/coretriage commit -m "feat(recover): auto-route non-severe diagnoses into Recover + create durable plan"
```

---

## PHASE C — Verify

### Task 8: Full verification gate

- [ ] **Step 1: Backend tests**

Run: `cd /Users/mathewbudnik/coretriage && pytest tests/test_rehab.py tests/test_rehab_plan_api.py -v`
Expected: all PASS. (`test_rehab.py` is CI-safe; `test_rehab_plan_api.py` needs a reachable Postgres.)

- [ ] **Step 2: No regressions in the existing rehab/triage paths**

Run: `cd /Users/mathewbudnik/coretriage && pytest tests/test_state_endpoint.py -v`
Expected: PASS (sanity that the app still boots + core endpoints work).

- [ ] **Step 3: Frontend build + tests**

Run: `cd /Users/mathewbudnik/coretriage/frontend && npm run build && npx vitest run`
Expected: build green; all suites pass.

- [ ] **Step 4: Almanac grep gate (must be 0)**

Run from `frontend/`:

```bash
cd /Users/mathewbudnik/coretriage/frontend && grep -rnE "217,119,87|#d97757|#f0a875|#1c2520|#243530|#1f2924|#f0f5ed|#c8d3c4|#14b8a6|#fb7185|#fbbf24|#95a698|#7dd3c0|#a78bfa|text-white|rgba\(255,255,255" src --include="*.jsx" --include="*.js" | grep -vE "\.test\.|__tests__"
```

Expected: no output.

- [ ] **Step 5: Lint the new/changed backend**

Run: `cd /Users/mathewbudnik/coretriage && ruff check src/rehab.py main.py database.py`
Expected: no NEW errors from this work (the pre-existing `UP017` at `main.py:1120` is unrelated — leave it).

- [ ] **Step 6: Manual smoke (recommended — covers the timer-based auto-handoff)**

Start the app (`cd frontend && npm run dev` + backend `uvicorn main:app --reload --port 8000`), signed in. Run a **non-severe** triage → confirm it auto-advances to Recover after ~1.2s, the recovering strip shows (phase ladder + streak + last-7 dots), and checking an exercise then re-loading keeps the streak. Run a **severe** triage (e.g. trigger a red flag) → confirm it stays on "Find urgent care" and does **not** auto-route or create a plan.

- [ ] **Step 7: Final commit (if polish fixes were needed)**

```bash
git -C /Users/mathewbudnik/coretriage add -A
git -C /Users/mathewbudnik/coretriage commit -m "chore(recover): verification gate — build/tests/grep green"
```

---

## Self-Review (reconciled against the spec)

- **Spec coverage:** persisted plan (Task 2), auto-handoff non-severe / severe→referral (Task 7), signed-in-only tracking (the endpoints require auth; anon falls back to sessionStorage), `GET /api/rehab/plan` + phase/streak/last7 (Task 1+3), recovering-strip hero (Task 5+6). All spec sections map to a task.
- **Safety:** `triage.py`, `TriageHero.jsx` severe branch, `DisclaimerModal.jsx`, `legal.js` are NOT in any task's file list. Severe is gated out of both plan creation and auto-route by `data.severity?.level === 'severe'`.
- **Avoid-list:** no task touches `Header.jsx`, `TrainingLogEntry`, `ui/LogSend*`, `useSessionLog`, `POST /api/training`, or `log_training`. `api.js`/`main.py`/`database.py` get **added symbols only**.
- **Type consistency:** the GET payload shape `{ plan, phase:{phase,day_in_phase,phase_length,days}, streak:int, last7:{count,days[7]} }` is identical across `get_rehab_plan` (Task 3), the `recovering` prop in `RecoverTab` (Task 6), and `RecoverRecoveringStrip` props (Task 5). `create_or_reuse_rehab_plan` returns the row dict used by `get_active_rehab_plan` (Task 2).
- **Deferred to v2 (not in this plan):** pain check-ins, completion-driven advancement, graduation/resolution UI, `plan_id` FK on `rehab_progress`, anonymous persistence.
