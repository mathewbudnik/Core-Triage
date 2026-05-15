# Body Merge + IA Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate 8 nav tabs to 4 (Hub / Train / Body / Chat), merge Triage + Rehab into a state-aware Body tab with daily-reset per-exercise checkoff, and redirect retired routes so old bookmarks keep working.

**Architecture:** New `rehab_progress` Postgres table tracks per-user-per-day exercise completion. Three new endpoints under `/api/rehab/progress`. Six new frontend files (5 components + 1 hook) implement the Body tab against the existing `EXERCISES` library data; no changes to the triage wizard logic. Routing changes in `App.jsx` collapse the tab set and add redirects.

**Tech Stack:** Postgres + psycopg2 (existing), FastAPI (existing), React 18 + Vite + Tailwind + Framer Motion + lucide-react + React Router 6 (all existing).

**Spec:** [docs/superpowers/specs/2026-05-14-body-merge-ia-consolidation-design.md](../specs/2026-05-14-body-merge-ia-consolidation-design.md)

---

## File Structure

**New files:**
| Path | Responsibility |
|---|---|
| `frontend/src/hooks/useRehabProgress.js` | Loads today's checked exercises + optimistic `toggle()` |
| `frontend/src/components/BodyStatusPills.jsx` | Horizontal-scroll pill row (Active / Phase / Today's progress) |
| `frontend/src/components/BodyExerciseCard.jsx` | Single exercise card with checkbox, inline-expand, mobile-tactile press |
| `frontend/src/components/BodyEmptyView.jsx` | "Something hurts? Run a screen" hero + past triage list |
| `frontend/src/components/BodyActiveView.jsx` | Sticky header + today's exercise list + sticky off-ramp |
| `frontend/src/components/BodyTab.jsx` | Page-level: data fetch, state machine (active vs empty), mounts sub-views |
| `frontend/src/components/RehabRegionRedirect.jsx` | Tiny route component that un-slugs `/rehab/:region` → `/body?region=...` |

**Modified files:**
| Path | Change |
|---|---|
| `database.py` | Add `rehab_progress` table migration + 3 helpers |
| `main.py` | Add 3 endpoints under `/api/rehab/progress` |
| `frontend/src/api.js` | Add 3 new exports for the rehab-progress endpoints |
| `frontend/src/App.jsx` | Drop Triage/Rehab/Progress/History/About from `TABS`; add Body to `TABS`; add `/body/*`, `/rehab`, `/rehab/:region`, `/progress` routes |
| `frontend/src/components/TriageTab.jsx` | On submit success, navigate to `/body` instead of `/triage/results` |
| `frontend/src/components/Landing.jsx` | Collapse Injury Triage + Rehab Library feature cards into a single "Body" card |

**Note on the "Browse full library" link from the mockup**: deferred to a follow-up spec. The Body tab in v1 shows only today's prescribed Phase 1 exercises (or the appropriate phase per the days-since-triage heuristic). RehabProtocol.jsx is left in place but not mounted anywhere in v1; we'll decide whether to delete it once the library view is designed.

---

### Task 1: DB migration — `rehab_progress` table

**Files:**
- Modify: `database.py` (inside `init_db()`)

- [ ] **Step 1: Add the table migration**

In [database.py](database.py), inside `init_db()`, after the `coach_messages` table create block, add:

```python
            # ── Rehab progress (daily checkoff) ────────────────────────────
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS rehab_progress (
                    id             SERIAL PRIMARY KEY,
                    user_id        INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    exercise_key   TEXT NOT NULL,
                    region         TEXT NOT NULL,
                    phase          INT NOT NULL,
                    completed_date DATE NOT NULL,
                    completed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UNIQUE (user_id, exercise_key, completed_date)
                );
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS rehab_progress_user_date_idx
                ON rehab_progress (user_id, completed_date);
                """
            )
```

- [ ] **Step 2: Verify schema applied**

The backend `uvicorn` autoreload will apply the migration on next reload. Confirm with:

```bash
.venv/bin/python -c "
from dotenv import load_dotenv; load_dotenv()
from database import init_db, _connect
init_db()
with _connect() as conn:
    with conn.cursor() as cur:
        cur.execute(\"SELECT column_name, data_type FROM information_schema.columns WHERE table_name='rehab_progress' ORDER BY ordinal_position;\")
        for r in cur.fetchall(): print(r)
"
```

Expected: 7 columns (id, user_id, exercise_key, region, phase, completed_date, completed_at) with correct types.

- [ ] **Step 3: Commit**

```bash
git add database.py
git commit -m "feat(body): rehab_progress table — daily exercise checkoff persistence"
```

---

### Task 2: DB helpers — get/check/uncheck

**Files:**
- Modify: `database.py` (new section at end of "Training log helpers" or just before "Coach messaging helpers")

- [ ] **Step 1: Add three helpers**

Append to [database.py](database.py) (right before the `# ── Coach messaging helpers` comment block, or after `get_training_logs` — pick a location that follows the existing pattern):

```python
# ---------------------------------------------------------------------------
# Rehab progress helpers (daily checkoff)
# ---------------------------------------------------------------------------


def get_rehab_progress(user_id: int, date: str) -> List[Dict[str, Any]]:
    """Return rows checked off for the user on a given local date (YYYY-MM-DD)."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT exercise_key, region, phase, completed_at
                FROM rehab_progress
                WHERE user_id = %s AND completed_date = %s
                ORDER BY completed_at ASC;
                """,
                (int(user_id), date),
            )
            rows = cur.fetchall()
    return [
        {
            "exercise_key": r[0],
            "region":       r[1],
            "phase":        int(r[2]),
            "completed_at": str(r[3]),
        }
        for r in rows
    ]


def check_rehab_exercise(
    user_id: int,
    exercise_key: str,
    region: str,
    phase: int,
    date: str,
) -> Dict[str, Any]:
    """Insert a checkoff event. Idempotent via UNIQUE (user_id, exercise_key,
    completed_date). Returns {id, already_existed}."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO rehab_progress
                    (user_id, exercise_key, region, phase, completed_date)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (user_id, exercise_key, completed_date) DO NOTHING
                RETURNING id;
                """,
                (int(user_id), exercise_key, region, int(phase), date),
            )
            row = cur.fetchone()
            already_existed = row is None
            if already_existed:
                # Re-fetch to return the existing row's id.
                cur.execute(
                    """
                    SELECT id FROM rehab_progress
                    WHERE user_id = %s AND exercise_key = %s AND completed_date = %s;
                    """,
                    (int(user_id), exercise_key, date),
                )
                row = cur.fetchone()
        conn.commit()
    return {"id": int(row[0]) if row else None, "already_existed": already_existed}


def uncheck_rehab_exercise(user_id: int, exercise_key: str, date: str) -> bool:
    """Delete the user's checkoff row for an exercise on a given date.
    Returns True if a row was deleted, False if nothing matched."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM rehab_progress
                WHERE user_id = %s AND exercise_key = %s AND completed_date = %s;
                """,
                (int(user_id), exercise_key, date),
            )
            deleted = cur.rowcount > 0
        conn.commit()
    return deleted
```

- [ ] **Step 2: Smoke-test the helpers**

From the repo root:

```bash
.venv/bin/python -c "
from dotenv import load_dotenv; load_dotenv()
from database import check_rehab_exercise, get_rehab_progress, uncheck_rehab_exercise
# Use user_id=1 (or whatever exists in your dev DB)
print('check:',   check_rehab_exercise(1, 'Wrist:1:Tendon glides', 'Wrist', 1, '2026-05-14'))
print('check 2:', check_rehab_exercise(1, 'Wrist:1:Tendon glides', 'Wrist', 1, '2026-05-14'))
print('get:',     get_rehab_progress(1, '2026-05-14'))
print('uncheck:', uncheck_rehab_exercise(1, 'Wrist:1:Tendon glides', '2026-05-14'))
print('uncheck again:', uncheck_rehab_exercise(1, 'Wrist:1:Tendon glides', '2026-05-14'))
print('get after:', get_rehab_progress(1, '2026-05-14'))
"
```

Expected:
- `check:` returns `{id: N, already_existed: False}`
- `check 2:` returns `{id: N, already_existed: True}` (same id)
- `get:` returns one row
- `uncheck:` returns `True`
- `uncheck again:` returns `False`
- `get after:` returns `[]`

If `user_id=1` doesn't exist, substitute an existing id (run `SELECT id FROM users LIMIT 1;`).

- [ ] **Step 3: Commit**

```bash
git add database.py
git commit -m "feat(body): rehab_progress helpers — get/check/uncheck with idempotent ON CONFLICT"
```

---

### Task 3: API endpoints

**Files:**
- Modify: `main.py`

- [ ] **Step 1: Add the imports**

In [main.py](main.py), add to the existing `from database import (...)` block:

```python
    get_rehab_progress,
    check_rehab_exercise,
    uncheck_rehab_exercise,
```

(Insert in alphabetical order if the existing imports are alphabetized — otherwise just append before the closing `)`.)

- [ ] **Step 2: Add request models**

Find the section in [main.py](main.py) where other Pydantic request models are defined (look for `class TrainingLogRequest(BaseModel):` or similar). Add:

```python
# Body / rehab progress
_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


class RehabCheckRequest(BaseModel):
    exercise_key: str
    region: str
    phase: int
    date: str


class RehabUncheckRequest(BaseModel):
    exercise_key: str
    date: str
```

(`re` is already imported at the top of main.py.)

- [ ] **Step 3: Add the three endpoints**

Find the existing rate-limited endpoint block (something like `@app.get("/api/training")`) and add the three new endpoints right after the training-log endpoints (around line 970-1000 in current main.py):

```python
# ---------------------------------------------------------------------------
# Rehab progress endpoints (daily checkoff)
# ---------------------------------------------------------------------------


@app.get("/api/rehab/progress")
@limiter.limit("60/minute")
def fetch_rehab_progress(
    request: Request,
    date: str,
    user: Dict = Depends(get_current_user),
):
    """Return today's checked exercises for the current user. `date` must be
    the user's local ISO date (YYYY-MM-DD)."""
    if not _DATE_RE.match(date or ""):
        raise HTTPException(status_code=400, detail="date must be YYYY-MM-DD")
    rows = get_rehab_progress(user["id"], date)
    return {"date": date, "checked": rows}


@app.post("/api/rehab/progress/check")
@limiter.limit("60/minute")
def post_rehab_check(
    request: Request,
    req: RehabCheckRequest,
    user: Dict = Depends(get_current_user),
):
    """Mark an exercise complete for the user on the given local date.
    Idempotent — re-checking returns the existing row."""
    if not _DATE_RE.match(req.date or ""):
        raise HTTPException(status_code=400, detail="date must be YYYY-MM-DD")
    if req.phase not in (1, 2, 3):
        raise HTTPException(status_code=400, detail="phase must be 1, 2, or 3")
    if not req.exercise_key or len(req.exercise_key) > 200:
        raise HTTPException(status_code=400, detail="exercise_key invalid")
    if not req.region or len(req.region) > 50:
        raise HTTPException(status_code=400, detail="region invalid")
    result = check_rehab_exercise(
        user["id"], req.exercise_key, req.region, req.phase, req.date,
    )
    return result


@app.delete("/api/rehab/progress/check")
@limiter.limit("60/minute")
def delete_rehab_check(
    request: Request,
    req: RehabUncheckRequest,
    user: Dict = Depends(get_current_user),
):
    """Remove an exercise checkoff. Idempotent — returns {deleted: false} if
    nothing matched."""
    if not _DATE_RE.match(req.date or ""):
        raise HTTPException(status_code=400, detail="date must be YYYY-MM-DD")
    deleted = uncheck_rehab_exercise(user["id"], req.exercise_key, req.date)
    return {"deleted": deleted}
```

- [ ] **Step 4: Confirm backend reloads cleanly**

Uvicorn with `--reload` should pick up the changes. Tail the backend output and confirm there's no import error or syntax error. If it didn't auto-reload, restart it manually.

```bash
curl -s http://localhost:8000/api/health
```

Expected: `{"ok":true,"db_ready":true,"db_error":null}`.

- [ ] **Step 5: Commit**

```bash
git add main.py
git commit -m "feat(body): GET /api/rehab/progress + POST/DELETE /check endpoints"
```

---

### Task 4: Curl-test all three endpoints end-to-end

**Files:** none — verification only.

- [ ] **Step 1: Get a fresh auth token**

```bash
TS=$(date +%s) && EMAIL="bodytest-${TS}@example.com"
REGISTER=$(curl -s -X POST http://localhost:8000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"abc12345!\"}")
TOKEN=$(echo "$REGISTER" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
echo "$TOKEN" > /tmp/ct_body_token
echo "token saved"
```

- [ ] **Step 2: GET today's progress (empty)**

```bash
TOKEN=$(cat /tmp/ct_body_token)
TODAY=$(date +%Y-%m-%d)
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/rehab/progress?date=$TODAY" | python3 -m json.tool
```

Expected: `{"date": "YYYY-MM-DD", "checked": []}`.

- [ ] **Step 3: POST a checkoff**

```bash
TOKEN=$(cat /tmp/ct_body_token)
TODAY=$(date +%Y-%m-%d)
curl -s -X POST http://localhost:8000/api/rehab/progress/check \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"exercise_key\":\"Wrist:1:Tendon glides\",\"region\":\"Wrist\",\"phase\":1,\"date\":\"$TODAY\"}" \
  | python3 -m json.tool
```

Expected: `{"id": <int>, "already_existed": false}`.

- [ ] **Step 4: Re-POST same checkoff (idempotency)**

```bash
TOKEN=$(cat /tmp/ct_body_token)
TODAY=$(date +%Y-%m-%d)
curl -s -X POST http://localhost:8000/api/rehab/progress/check \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"exercise_key\":\"Wrist:1:Tendon glides\",\"region\":\"Wrist\",\"phase\":1,\"date\":\"$TODAY\"}" \
  | python3 -m json.tool
```

Expected: `{"id": <same int>, "already_existed": true}`.

- [ ] **Step 5: GET now shows one row**

```bash
TOKEN=$(cat /tmp/ct_body_token)
TODAY=$(date +%Y-%m-%d)
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/rehab/progress?date=$TODAY" | python3 -m json.tool
```

Expected: `{"date":"...","checked":[{"exercise_key":"Wrist:1:Tendon glides","region":"Wrist","phase":1,...}]}`.

- [ ] **Step 6: DELETE the checkoff**

```bash
TOKEN=$(cat /tmp/ct_body_token)
TODAY=$(date +%Y-%m-%d)
curl -s -X DELETE http://localhost:8000/api/rehab/progress/check \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"exercise_key\":\"Wrist:1:Tendon glides\",\"date\":\"$TODAY\"}" \
  | python3 -m json.tool
```

Expected: `{"deleted": true}`.

- [ ] **Step 7: DELETE again (idempotency)**

```bash
TOKEN=$(cat /tmp/ct_body_token)
TODAY=$(date +%Y-%m-%d)
curl -s -X DELETE http://localhost:8000/api/rehab/progress/check \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"exercise_key\":\"Wrist:1:Tendon glides\",\"date\":\"$TODAY\"}" \
  | python3 -m json.tool
```

Expected: `{"deleted": false}`.

- [ ] **Step 8: Validation errors**

```bash
TOKEN=$(cat /tmp/ct_body_token)
curl -s "http://localhost:8000/api/rehab/progress?date=NOT_A_DATE" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Expected: `{"detail":"date must be YYYY-MM-DD"}` with status 400.

```bash
curl -s -X POST http://localhost:8000/api/rehab/progress/check \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"exercise_key":"X","region":"Y","phase":99,"date":"2026-05-14"}' \
  | python3 -m json.tool
```

Expected: `{"detail":"phase must be 1, 2, or 3"}`.

If all steps return as expected, the backend is ready. No commit (verification only).

---

### Task 5: API client additions

**Files:**
- Modify: `frontend/src/api.js`

- [ ] **Step 1: Add three exports**

Find a logical section in [frontend/src/api.js](frontend/src/api.js) (e.g. after the training log exports, before billing). Append:

```js
// Rehab progress (daily checkoff)
export const getRehabProgress = (date) =>
  request('GET', `/api/rehab/progress?date=${encodeURIComponent(date)}`)
export const checkRehabExercise = ({ exercise_key, region, phase, date }) =>
  request('POST', '/api/rehab/progress/check', { exercise_key, region, phase, date })
export const uncheckRehabExercise = ({ exercise_key, date }) =>
  request('DELETE', '/api/rehab/progress/check', { exercise_key, date })
```

- [ ] **Step 2: Verify the build catches no errors**

```bash
cd frontend && npx vite build 2>&1 | tail -5
```

Expected: `✓ built in N.NNs` with no module-resolution errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api.js
git commit -m "feat(body): api.js — getRehabProgress / check / uncheck"
```

---

### Task 6: useRehabProgress hook

**Files:**
- Create: `frontend/src/hooks/useRehabProgress.js`

- [ ] **Step 1: Create the hook**

Create `frontend/src/hooks/useRehabProgress.js`:

```js
import { useEffect, useState, useCallback, useMemo } from 'react'
import { getRehabProgress, checkRehabExercise, uncheckRehabExercise } from '../api'

// Returns the user's local YYYY-MM-DD. `en-CA` always formats as ISO.
function localTodayIso() {
  return new Date().toLocaleDateString('en-CA')
}

/**
 * Loads today's rehab checkoff state and exposes an optimistic toggle.
 *
 * Returns:
 *   loading:  boolean
 *   checked:  Set<string>           — exercise_keys checked today
 *   toggle:   (exerciseKey, region, phase) => Promise<void>
 *   refetch:  () => void
 */
export function useRehabProgress(user) {
  const today = useMemo(localTodayIso, [])
  const [checked, setChecked] = useState(new Set())
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!user) { setLoading(false); return }
    setLoading(true)
    try {
      const data = await getRehabProgress(today)
      setChecked(new Set((data?.checked || []).map((r) => r.exercise_key)))
    } catch (_) {
      setChecked(new Set())
    } finally {
      setLoading(false)
    }
  }, [user, today])

  useEffect(() => { refetch() }, [refetch])

  // Optimistic toggle: flip locally first, then sync to the server. Revert on
  // failure. Returns the promise so callers can await if they want.
  const toggle = useCallback(async (exerciseKey, region, phase) => {
    const wasChecked = checked.has(exerciseKey)
    // Optimistic local update
    setChecked((prev) => {
      const next = new Set(prev)
      if (wasChecked) next.delete(exerciseKey)
      else next.add(exerciseKey)
      return next
    })
    try {
      if (wasChecked) {
        await uncheckRehabExercise({ exercise_key: exerciseKey, date: today })
      } else {
        await checkRehabExercise({ exercise_key: exerciseKey, region, phase, date: today })
      }
    } catch (_) {
      // Revert on error
      setChecked((prev) => {
        const next = new Set(prev)
        if (wasChecked) next.add(exerciseKey)
        else next.delete(exerciseKey)
        return next
      })
    }
  }, [checked, today])

  return { loading, checked, toggle, refetch }
}
```

- [ ] **Step 2: Verify it builds**

```bash
cd frontend && npx vite build 2>&1 | tail -3
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useRehabProgress.js
git commit -m "feat(body): useRehabProgress hook — optimistic toggle, local-date aware"
```

---

### Task 7: BodyStatusPills component

**Files:**
- Create: `frontend/src/components/BodyStatusPills.jsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/components/BodyStatusPills.jsx`:

```jsx
/**
 * Horizontal-scroll pill row. Used inside BodyActiveView's sticky header.
 *
 * Props:
 *   pills: Array<{ key, label, tone: 'teal'|'coral'|'gold'|'muted', live?: boolean }>
 */
const TONE_CLASSES = {
  teal:   'text-accent  border-accent/40  bg-accent/10',
  coral:  'text-accent2 border-accent2/40 bg-accent2/10',
  gold:   'text-accent3 border-accent3/40 bg-accent3/10',
  muted:  'text-muted   border-outline    bg-white/[0.04]',
}

const LIVE_DOT_TONE = {
  teal:  'bg-accent  shadow-[0_0_6px_rgba(20,184,166,0.7)]',
  coral: 'bg-accent2 shadow-[0_0_6px_rgba(251,113,133,0.7)]',
  gold:  'bg-accent3 shadow-[0_0_6px_rgba(251,191,36,0.7)]',
  muted: 'bg-muted',
}

export default function BodyStatusPills({ pills }) {
  return (
    <div
      className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-1
                 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
    >
      {pills.map((p) => (
        <span
          key={p.key}
          className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0
                      text-[10px] font-extrabold uppercase tracking-[0.06em]
                      px-2.5 py-1 rounded-full border ${TONE_CLASSES[p.tone]}`}
        >
          {p.live && <span className={`w-1.5 h-1.5 rounded-full ${LIVE_DOT_TONE[p.tone]}`} />}
          {p.label}
        </span>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/BodyStatusPills.jsx
git commit -m "feat(body): BodyStatusPills — horizontal-scroll status chip row"
```

---

### Task 8: BodyExerciseCard component

**Files:**
- Create: `frontend/src/components/BodyExerciseCard.jsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/components/BodyExerciseCard.jsx`:

```jsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, AlertTriangle, Zap, ChevronRight } from 'lucide-react'

/**
 * Mobile-tuned exercise card.
 * - Tap card → expand inline detail
 * - Tap checkbox → toggle checked
 * - 28px checkbox in a 60px-tall card (well above 44pt min target)
 * - :active scale-down for tactile press feedback
 *
 * Props:
 *   exercise: { name, area, sets, reps, frequency, feel, red_flags, progression_trigger }
 *   checked:  boolean
 *   onToggle: () => void
 */
export default function BodyExerciseCard({ exercise, checked, onToggle }) {
  const [open, setOpen] = useState(false)

  const handleCheckboxClick = (e) => {
    e.stopPropagation()      // don't expand the card when tapping the checkbox
    onToggle?.()
  }

  return (
    <motion.div
      onClick={() => setOpen((o) => !o)}
      whileTap={{ scale: 0.985 }}
      className={`flex items-start gap-3 px-3.5 py-4 rounded-2xl border min-h-[60px]
                  cursor-pointer transition-opacity select-none
                  ${checked
                    ? 'opacity-55 bg-accent/[0.04] border-accent/20'
                    : open
                      ? 'bg-[linear-gradient(180deg,rgba(20,184,166,0.06),rgba(20,184,166,0.02))] border-accent/35'
                      : 'bg-panel/45 border-outline'}`}
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={handleCheckboxClick}
        aria-label={checked ? 'Mark as not done' : 'Mark as done'}
        aria-pressed={checked}
        className={`w-7 h-7 rounded-[10px] shrink-0 inline-flex items-center justify-center
                    border-[1.5px] transition-all
                    ${checked
                      ? 'bg-accent border-accent shadow-[0_0_10px_rgba(20,184,166,0.5)]'
                      : 'bg-panel/60 border-text/25'}`}
      >
        {checked && <Check size={14} strokeWidth={3} className="text-bg" />}
      </button>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold leading-tight ${
          checked ? 'text-text line-through decoration-text/40' : 'text-text'
        }`}>
          {exercise.name}
        </p>
        <p className="text-[12px] text-muted mt-1">
          {exercise.sets} sets × {exercise.reps}{exercise.frequency ? ` · ${exercise.frequency}` : ''}
        </p>

        <AnimatePresence initial={false}>
          {open && !checked && (
            <motion.div
              key="detail"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="mt-2.5 pt-2.5 border-t border-outline/60 space-y-1.5">
                {exercise.feel && (
                  <p className="flex items-start gap-2 text-[12px] text-muted leading-snug">
                    <Check size={12} strokeWidth={2.4} className="text-accent shrink-0 mt-0.5" />
                    <span>
                      <span className="text-accent font-bold uppercase text-[10px] tracking-[0.08em] mr-1">Should feel:</span>
                      {exercise.feel}
                    </span>
                  </p>
                )}
                {exercise.red_flags && (
                  <p className="flex items-start gap-2 text-[12px] text-muted leading-snug">
                    <AlertTriangle size={12} strokeWidth={2.4} className="text-accent2 shrink-0 mt-0.5" />
                    <span>
                      <span className="text-accent2 font-bold uppercase text-[10px] tracking-[0.08em] mr-1">Stop if:</span>
                      {exercise.red_flags}
                    </span>
                  </p>
                )}
                {exercise.progression_trigger && (
                  <p className="flex items-start gap-2 text-[12px] text-muted leading-snug">
                    <Zap size={12} strokeWidth={2.4} className="text-accent3 shrink-0 mt-0.5" />
                    <span>
                      <span className="text-accent3 font-bold uppercase text-[10px] tracking-[0.08em] mr-1">Progress when:</span>
                      {exercise.progression_trigger}
                    </span>
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!open && !checked && (
        <ChevronRight size={14} strokeWidth={2.4} className="text-text/25 shrink-0 self-center" />
      )}
    </motion.div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/BodyExerciseCard.jsx
git commit -m "feat(body): BodyExerciseCard — checkbox + inline detail expand, 60px touch target"
```

---

### Task 9: BodyEmptyView component

**Files:**
- Create: `frontend/src/components/BodyEmptyView.jsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/components/BodyEmptyView.jsx`:

```jsx
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Activity, ArrowRight, Clock } from 'lucide-react'

/**
 * Body tab when the user has no active triage.
 *
 * Props:
 *   pastTriage: Array<{ id, injury_area, created_at }>  (most recent first, max 5)
 */
export default function BodyEmptyView({ pastTriage = [] }) {
  const navigate = useNavigate()

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="px-4 pt-6 pb-24 max-w-2xl mx-auto"
    >
      {/* Header */}
      <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-accent2 mb-1">
        Body
      </p>
      <h1 className="text-[22px] font-extrabold leading-tight tracking-tight mb-1">
        All clear right now
      </h1>
      <p className="text-xs text-muted mb-5">No active triage or rehab plan.</p>

      {/* Hero CTA */}
      <div
        className="relative overflow-hidden rounded-2xl p-6
                   bg-[linear-gradient(135deg,rgba(251,113,133,0.20),rgba(251,113,133,0.04))]
                   border border-accent2/40 shadow-[0_0_36px_rgba(251,113,133,0.14)]
                   text-center mb-4"
      >
        <div className="inline-flex w-[54px] h-[54px] rounded-2xl items-center justify-center mb-3
                        bg-[linear-gradient(135deg,rgba(251,113,133,0.30),rgba(251,113,133,0.08))]
                        border border-accent2/50 text-accent2
                        shadow-[0_0_18px_rgba(251,113,133,0.30)]">
          <Activity size={26} strokeWidth={2} />
        </div>
        <h2 className="text-[19px] font-extrabold mb-2">Something hurts?</h2>
        <p className="text-[13px] text-muted leading-relaxed mb-4 max-w-[280px] mx-auto">
          5-question screen — red-flag warnings, likely injury patterns, and a phase-based rehab plan.
        </p>
        <button
          type="button"
          onClick={() => navigate('/triage')}
          className="w-full inline-flex items-center justify-center gap-2
                     px-5 py-3 rounded-xl bg-accent2 text-bg text-sm font-bold
                     hover:brightness-110 active:brightness-95 transition"
        >
          Run a screen
          <ArrowRight size={14} strokeWidth={2.6} />
        </button>
      </div>

      <p className="text-center text-xs text-muted mb-8">
        Or browse exercises for prehab + mobility — no injury required.{' '}
        <button onClick={() => navigate('/triage')} className="text-accent font-bold hover:underline">
          Start triage
        </button>
      </p>

      {/* Past triage */}
      {pastTriage.length > 0 && (
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-muted mb-2">
            Past triage
          </p>
          <div className="space-y-2">
            {pastTriage.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 px-3.5 py-3 rounded-2xl
                           bg-panel/45 border border-outline opacity-80"
              >
                <span className="w-7 h-7 rounded-[10px] bg-accent2/10 border border-accent2/30
                                 inline-flex items-center justify-center text-accent2">
                  <Clock size={14} strokeWidth={2} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold leading-tight">{t.injury_area}</p>
                  <p className="text-[11px] text-muted mt-0.5">
                    {new Date(t.created_at).toLocaleDateString(undefined, {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/BodyEmptyView.jsx
git commit -m "feat(body): BodyEmptyView — coral hero + past triage list"
```

---

### Task 10: BodyActiveView component

**Files:**
- Create: `frontend/src/components/BodyActiveView.jsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/components/BodyActiveView.jsx`:

```jsx
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { EXERCISES } from '../data/exercises'
import { rehabProgress } from '../lib/rehabHeuristic'
import BodyStatusPills from './BodyStatusPills'
import BodyExerciseCard from './BodyExerciseCard'

/**
 * Renders when the user has an active triage. Sticky header with greeting +
 * status pills + today's progress bar, scrollable exercise list, sticky
 * bottom off-ramp for "something new hurts?".
 *
 * Props:
 *   triage:    { id, injury_area, created_at }
 *   checked:   Set<string>                — exercise_keys checked today
 *   onToggle:  (exerciseKey, region, phase) => void
 */
export default function BodyActiveView({ triage, checked, onToggle }) {
  const navigate = useNavigate()
  const region = triage.injury_area
  const rp = rehabProgress(triage.created_at)
  const phase = rp?.phase ?? 1

  // The exercise list for the user's current phase. Composite key per exercise:
  // "<region>:<phase>:<name>" — same shape stored in rehab_progress.
  const exercises = useMemo(() => {
    const list = EXERCISES[region]?.[phase] || []
    return list.map((ex) => ({
      ...ex,
      _key: `${region}:${phase}:${ex.name}`,
    }))
  }, [region, phase])

  const doneCount = exercises.filter((e) => checked.has(e._key)).length
  const totalCount = exercises.length || 1
  const pctDone = doneCount / totalCount

  const pills = [
    { key: 'active',   label: 'Active',                  tone: 'coral', live: true },
    { key: 'phase',    label: `Phase ${phase} · D${rp?.dayInPhase ?? 1}`, tone: 'teal' },
    { key: 'progress', label: `${doneCount} / ${exercises.length} today`, tone: 'gold' },
  ]
  if (phase === 1 && rp) {
    pills.push({ key: 'left', label: `${Math.max(0, rp.phaseLength - rp.dayInPhase)} days left`, tone: 'muted' })
  }

  return (
    <div className="max-w-2xl mx-auto pb-32">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 -mt-px
                      bg-[linear-gradient(180deg,rgba(11,18,32,1)_0%,rgba(11,18,32,0.96)_70%,rgba(11,18,32,0.85)_100%)]
                      backdrop-blur-md border-b border-outline/60 px-4 pt-5 pb-3">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-accent mb-1">Body</p>
        <h1 className="text-[22px] font-extrabold leading-tight tracking-tight mb-1">
          {region} · Phase {phase}
        </h1>
        <p className="text-xs text-muted mb-3">
          Day {rp?.dayInPhase ?? 1} of {rp?.phaseLength ?? 14} · pain at or below 3/10.
        </p>

        <BodyStatusPills pills={pills} />

        <div className="mt-3 px-3 py-2.5 rounded-xl bg-panel2/60 border border-outline/60">
          <div className="flex justify-between text-[11px] text-muted mb-1.5">
            <span>Today's progress</span>
            <strong className="text-text font-bold">{doneCount} / {exercises.length}</strong>
          </div>
          <div className="w-full h-[5px] rounded-full bg-text/10 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(pctDone * 100)}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-accent to-[#7dd3c0]
                         shadow-[0_0_12px_rgba(20,184,166,0.6)]"
            />
          </div>
        </div>
      </div>

      {/* Exercise list */}
      <div className="px-4 pt-4">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-muted mb-2.5">
          Today · resets at midnight
        </p>
        <div className="space-y-2">
          {exercises.map((ex) => (
            <BodyExerciseCard
              key={ex._key}
              exercise={ex}
              checked={checked.has(ex._key)}
              onToggle={() => onToggle(ex._key, region, phase)}
            />
          ))}
        </div>

        {exercises.length === 0 && (
          <p className="text-center text-sm text-muted py-8">
            No exercises configured for {region} · Phase {phase} yet.
          </p>
        )}
      </div>

      {/* Sticky off-ramp at the bottom */}
      <div className="fixed bottom-16 left-0 right-0 z-20 px-4
                      pb-[calc(0.5rem+env(safe-area-inset-bottom))] pointer-events-none">
        <div className="max-w-2xl mx-auto pointer-events-auto">
          <button
            type="button"
            onClick={() => navigate('/triage')}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl
                       bg-accent2/[0.10] border border-accent2/30 backdrop-blur-md
                       hover:bg-accent2/[0.14] transition text-left"
          >
            <span>
              <span className="block text-[13px] font-bold text-text">Something new hurts?</span>
              <span className="block text-[11px] text-muted mt-0.5">
                Quick screen — keeps your current plan.
              </span>
            </span>
            <span className="inline-flex items-center gap-1 text-[12px] font-bold text-accent2 shrink-0">
              Screen <ArrowRight size={13} strokeWidth={2.6} />
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/BodyActiveView.jsx
git commit -m "feat(body): BodyActiveView — sticky header, exercise list, sticky off-ramp"
```

---

### Task 11: BodyTab page assembly

**Files:**
- Create: `frontend/src/components/BodyTab.jsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/components/BodyTab.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { getSessions } from '../api'
import { useRehabProgress } from '../hooks/useRehabProgress'
import { REHAB_REGIONS } from '../lib/pickFeatured'
import { rehabProgress } from '../lib/rehabHeuristic'
import BodyActiveView from './BodyActiveView'
import BodyEmptyView from './BodyEmptyView'

/**
 * State machine:
 *   loading → fetching last triage
 *   active  → has triage within last 90 days AND region is in EXERCISES
 *   empty   → no qualifying active triage
 *
 * The active/empty decision mirrors the same `hasTriageWithin(data, 90)`
 * logic used by the Hub. Kept inline (small fn) to avoid an extra import.
 */
function isActiveTriage(triage) {
  if (!triage) return false
  if (!REHAB_REGIONS.has(triage.injury_area)) return false
  const rp = rehabProgress(triage.created_at)
  // 90-day cutoff: Phase 1 (14d) + Phase 2 (28d) + Phase 3 cap (~48d more) = ~90 days
  return !!rp && rp.days <= 90
}

export default function BodyTab({ user }) {
  const [loading, setLoading] = useState(true)
  const [recent, setRecent] = useState([])   // most recent triages, used for both active + empty
  const { checked, toggle } = useRehabProgress(user)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    let cancelled = false
    getSessions(5)
      .then((data) => { if (!cancelled) setRecent(data || []) })
      .catch(() => { if (!cancelled) setRecent([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={20} className="text-accent animate-spin" />
      </div>
    )
  }

  const activeTriage = recent.find(isActiveTriage)

  if (activeTriage) {
    return (
      <BodyActiveView
        triage={activeTriage}
        checked={checked}
        onToggle={toggle}
      />
    )
  }

  return <BodyEmptyView pastTriage={recent} />
}
```

- [ ] **Step 2: Verify the build picks it up**

```bash
cd /Users/mathewbudnik/coretriage/frontend && npx vite build 2>&1 | tail -3
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/BodyTab.jsx
git commit -m "feat(body): BodyTab — state machine routes between active and empty views"
```

---

### Task 12: RehabRegionRedirect component

**Files:**
- Create: `frontend/src/components/RehabRegionRedirect.jsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/components/RehabRegionRedirect.jsx`:

```jsx
import { Navigate, useParams } from 'react-router-dom'

/**
 * Redirects /rehab/:slug → /body?region=<Title Case Region>.
 * Preserves bookmarks to specific regions.
 *
 *   /rehab/finger      → /body?region=Finger
 *   /rehab/lower-back  → /body?region=Lower%20Back
 */
export default function RehabRegionRedirect() {
  const { region } = useParams()
  if (!region) return <Navigate to="/body" replace />
  const titleCase = region
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
  return <Navigate to={`/body?region=${encodeURIComponent(titleCase)}`} replace />
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/RehabRegionRedirect.jsx
git commit -m "feat(body): RehabRegionRedirect — /rehab/:slug → /body?region=..."
```

---

### Task 13: App.jsx wiring — TABS shrink, Body route, redirects

**Files:**
- Modify: `frontend/src/App.jsx`

This task touches a file that may have concurrent changes from other agents. Read the current state first; apply edits by intent, not by exact match.

- [ ] **Step 1: Add new lazy imports + Navigate**

Locate the existing lazy-import block (around `const TriageTab = lazy(...)`). Add:

```js
const BodyTab              = lazy(() => import('./components/BodyTab'))
const RehabRegionRedirect  = lazy(() => import('./components/RehabRegionRedirect'))
```

Ensure `Navigate` is imported from `react-router-dom` (it likely already is from prior Hub work). If not:

```js
import { Routes, Route, NavLink, useNavigate, useLocation, Navigate } from 'react-router-dom'
```

- [ ] **Step 2: Update the TABS array**

Find the `const TABS = [...]` definition. Replace it with the 4-tab consolidation:

```js
const TABS = [
  { id: 'hub',   label: 'Hub',   icon: Home,          subtitle: 'Your climbing dashboard' },
  { id: 'train', label: 'Train', icon: Dumbbell,      subtitle: 'Plans, stats, and how you stack up' },
  { id: 'body',  label: 'Body',  icon: Stethoscope,   subtitle: 'Screen issues + work through rehab' },
  { id: 'chat',  label: 'Chat',  icon: MessageSquare, subtitle: 'Ask the climbing-trained assistant' },
]
```

(Drop Triage, Rehab, Progress, History, About. If the parallel agent added something else, preserve only what's necessary — this is the 4-tab final shape.)

- [ ] **Step 3: Update the `<Routes>` block**

Find the `<Routes>` block. Edits:
1. Add the new `/body/*` route as the first route after `/hub/*`
2. Add redirect routes for `/rehab`, `/rehab/:region`, `/progress`
3. **Keep** `/triage`, `/history`, `/about` routes (they're still reachable, just not in TABS)
4. Catch-all stays `<Navigate to="/hub" replace />`

Target result:

```jsx
<Routes>
  <Route path="/hub/*"        element={<HubTab user={user} />} />
  <Route path="/body/*"       element={<BodyTab user={user} />} />
  <Route path="/triage/*"     element={<TriageTab k={k} user={user} />} />
  <Route path="/rehab"        element={<Navigate to="/body" replace />} />
  <Route path="/rehab/:region" element={<RehabRegionRedirect />} />
  <Route path="/train"        element={<TrainTab user={user} dbReady={dbReady} onLoginClick={() => setShowAuth(true)} />} />
  <Route path="/progress"     element={<Navigate to="/train" replace />} />
  <Route path="/chat"         element={<ChatTab k={k} user={user} onLoginClick={() => setShowAuth(true)} />} />
  <Route path="/history/*"    element={<HistoryTab dbReady={dbReady} user={user} onLoginClick={() => setShowAuth(true)} />} />
  <Route path="/about"        element={<AboutTab />} />
  <Route path="*"             element={<Navigate to="/hub" replace />} />
</Routes>
```

(If the parallel agent added other routes like avatar/account, preserve them.)

- [ ] **Step 4: Build to verify routing changes**

```bash
cd /Users/mathewbudnik/coretriage/frontend && npx vite build 2>&1 | tail -8
```

Expected: clean build. If a module fails to resolve (e.g. `./components/BodyTab` missing), check Task 11.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat(body): App.jsx wiring — 4-tab TABS, /body route, redirects for /rehab/*, /progress"
```

---

### Task 14: TriageTab redirect to /body on success

**Files:**
- Modify: `frontend/src/components/TriageTab.jsx`

The triage wizard currently navigates to `/triage/results` on submit. We want it to navigate to `/body` instead, so the user lands on their new active rehab state.

- [ ] **Step 1: Read the current submit handler**

```bash
grep -nE "navigate\(.*results|stepToPath\(.*results|/triage/results" /Users/mathewbudnik/coretriage/frontend/src/components/TriageTab.jsx
```

Note the exact lines and context. The existing handler is `handleSubmit` and it calls something like `navigate(stepToPath('results'))`. The plan changes the post-submit navigation to `/body`.

- [ ] **Step 2: Update handleSubmit's success branch**

In [frontend/src/components/TriageTab.jsx](frontend/src/components/TriageTab.jsx), find the `handleSubmit` function. Inside its `try` block, after `setResult(data)`, replace the navigate-to-results call:

```jsx
  // BEFORE: navigate(stepToPath('results'))
  // AFTER:
  navigate('/body')
```

If `stepToPath('results')` is called elsewhere (like a "View results again" link), leave those calls alone — they only fire when the user already has a result loaded. For the post-submit path, the new behavior is "go to Body."

- [ ] **Step 3: Build to verify nothing broke**

```bash
cd /Users/mathewbudnik/coretriage/frontend && npx vite build 2>&1 | tail -3
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/TriageTab.jsx
git commit -m "feat(body): TriageTab — on submit success, navigate to /body instead of /triage/results"
```

---

### Task 15: Landing.jsx — collapse Triage + Rehab into a single Body card

**Files:**
- Modify: `frontend/src/components/Landing.jsx`

- [ ] **Step 1: Read the current FEATURES array**

```bash
grep -nE "FEATURES = |Injury Triage|Rehab Library" /Users/mathewbudnik/coretriage/frontend/src/components/Landing.jsx
```

The FEATURES array has four entries (Training Plans, Injury Triage, Rehab Library, AI Assistant). We're collapsing the two middle ones into one "Body" card.

- [ ] **Step 2: Update FEATURES**

In [frontend/src/components/Landing.jsx](frontend/src/components/Landing.jsx), replace the FEATURES array with three entries (Training Plans, Body, AI Assistant):

```js
const FEATURES = [
  {
    icon: Dumbbell,
    color: 'text-accent',
    bg: 'bg-accent/10 border-accent/20',
    glow: 'hover:border-accent/50 hover:bg-accent/15',
    title: 'Training Plans',
    desc: 'Personalised 4-week climbing plans built around your goals, current grades, available days, and injury history. Adapts as you progress — from base-building to projecting.',
    tab: 'train',
    cta: 'Build my plan',
  },
  {
    icon: Stethoscope,
    color: 'text-accent2',
    bg: 'bg-accent2/10 border-accent2/20',
    glow: 'hover:border-accent2/50 hover:bg-accent2/15',
    title: 'Body',
    desc: 'Quick injury screen and phase-based rehab in one place. Daily-reset checkoffs so the plan stays alive between sessions — open the app, see today\'s exercises, tick them off.',
    tab: 'body',
    cta: 'Run a screen',
  },
  {
    icon: MessageSquare,
    color: 'text-accent3',
    bg: 'bg-accent3/10 border-accent3/20',
    glow: 'hover:border-accent3/40 hover:bg-accent3/12',
    title: 'AI Assistant',
    desc: 'Ask anything about training, climbing injuries, load management, or recovery — backed by a curated climbing-specific knowledge base.',
    tab: 'chat',
    cta: 'Ask a question',
  },
]
```

Make sure `Stethoscope` is in the lucide-react import at the top of Landing.jsx (it likely is — search for it).

- [ ] **Step 3: Update the injury area chips at the bottom of Landing**

Find the chips list (`['Fingers', 'Wrist', 'Elbow', ...]`) and the onclick. Currently they navigate to `/triage`; change them to `/body` so a click on "Fingers" routes the user to the Body tab:

```jsx
<button
  key={area}
  onClick={() => onEnter('body')}
  ...
```

(Look for `onClick={() => onEnter('triage')}` and replace `'triage'` with `'body'`.)

- [ ] **Step 4: Build to verify**

```bash
cd /Users/mathewbudnik/coretriage/frontend && npx vite build 2>&1 | tail -3
```

Expected: clean build.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Landing.jsx
git commit -m "feat(body): Landing — collapse Triage + Rehab cards into one Body card; chips → /body"
```

---

### Task 16: Final build + manual smoke test

**Files:** none — verification only.

- [ ] **Step 1: Final clean build**

```bash
cd /Users/mathewbudnik/coretriage/frontend && npx vite build 2>&1 | tail -8
```

Expected: `✓ built in N.NNs`, no errors.

- [ ] **Step 2: Backend health check**

```bash
curl -s http://localhost:8000/api/health
```

Expected: `{"ok":true,"db_ready":true,"db_error":null}`.

- [ ] **Step 3: Start dev server**

In a separate terminal (or background):

```bash
cd /Users/mathewbudnik/coretriage/frontend && npm run dev
```

- [ ] **Step 4: Browser smoke test** (record results below)

Open `http://localhost:5173/` and walk through:

| # | Step | Expected |
|---|---|---|
| 1 | Sign in as existing user | Lands on `/hub` |
| 2 | Sidebar nav | Shows exactly 4 tabs: Hub / Train / Body / Chat (no Triage/Rehab/Progress/History/About) |
| 3 | Click "Body" tab | Lands on `/body`. If you have no recent triage in last 90d → empty state with coral hero. If you do → active state with sticky header + exercise list + checkboxes |
| 4 | Click "Run a screen" from empty state | Navigates to `/triage` (wizard) |
| 5 | Complete triage submit | Lands on `/body` (not `/triage/results`). Body tab now shows active state with exercises for the new region |
| 6 | Tap an exercise card | Card expands inline showing "Should feel / Stop if / Progress when" |
| 7 | Tap an exercise checkbox | Checkbox fills with teal glow, name strikes through, card fades to 55% opacity, "today's progress" bar advances |
| 8 | Refresh the page | Checked exercises stay checked. GET /api/rehab/progress?date=YYYY-MM-DD returns the correct rows |
| 9 | Tap a checked checkbox | Unchecks. Bar regresses |
| 10 | Visit `/rehab` directly | Redirects to `/body` |
| 11 | Visit `/rehab/finger` directly | Redirects to `/body?region=Finger` |
| 12 | Visit `/progress` directly | Redirects to `/train` |
| 13 | Resize browser to <768px | Layout still works: sticky header pinned, pill row scrolls horizontally, sticky bottom off-ramp + bottom nav both reachable |
| 14 | On mobile width, tap the floor of the screen | Bottom nav has 4 cells with proper safe-area-inset spacing |
| 15 | From Landing (sign out + visit `/`) | Three feature cards: Training Plans / Body / AI Assistant. "Body" card description mentions daily checkoffs |

- [ ] **Step 5: Commit any cleanup discovered during smoke test**

```bash
git status
# If anything is modified, fix the issue and:
git add -A
git commit -m "fix(body): smoke-test cleanup"
```

If nothing changed, skip the commit.

---

## Self-review checklist (DONE — for reference)

**Spec coverage:**
- [x] DB migration → Task 1
- [x] DB helpers → Task 2
- [x] Three API endpoints → Tasks 3 + 4
- [x] api.js additions → Task 5
- [x] useRehabProgress hook → Task 6
- [x] BodyStatusPills → Task 7
- [x] BodyExerciseCard with mobile patterns (28px checkbox, inline expand, :active press) → Task 8
- [x] BodyEmptyView with hero + past triage → Task 9
- [x] BodyActiveView with sticky header + sticky off-ramp + safe-area-inset → Task 10
- [x] BodyTab state machine → Task 11
- [x] /rehab/:region redirect → Task 12
- [x] App.jsx TABS shrink + new routes + redirects → Task 13
- [x] TriageTab → /body on submit → Task 14
- [x] Landing.jsx feature-card collapse → Task 15
- [x] Mobile smoke test → Task 16

**Placeholder scan:** No TBDs/TODOs. Every code step shows actual code; every command shows expected output.

**Type consistency:**
- `exercise_key` shape `"<Region>:<Phase>:<Name>"` consistent across DB schema (Task 1), helpers (Task 2), endpoints (Task 3), hook (Task 6), and components (Tasks 8 + 10).
- `date` parameter is always YYYY-MM-DD (user's local) across hook (Task 6), API client (Task 5), and endpoints (Task 3).
- `toggle(exerciseKey, region, phase)` signature is identical in `useRehabProgress` return type (Task 6) and consumer in `BodyActiveView` (Task 10).

**Explicit deferrals** (out of v1, called out so the next planner knows):
- "Browse full library" link from the mockup — not implemented in v1
- RehabProtocol.jsx left in place but unused — decision deferred
- Send log + grade pyramid — separate spec
- Coach Insights — separate spec
- Hangboard tool — separate spec
- Push/email notifications when daily checkoffs are incomplete — out of v1
