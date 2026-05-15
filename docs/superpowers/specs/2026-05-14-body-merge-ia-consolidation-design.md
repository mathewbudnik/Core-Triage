# Body merge + IA consolidation (v1)

**Date:** 2026-05-14
**Owner:** Mathew
**Status:** Approved (mockups in `.superpowers/brainstorm/37195-1778815912/content/`)

## Problem

The sidebar has eight tabs (Hub, Triage, Rehab, Train, Progress, Chat, History, About). For an app being repositioned as a climbing progression tool, this is too many — the IA feels like a feature inventory, not a focused product. Symptoms:

- **Progress** is a thin wrapper around `TrainStatsPanel`, which already renders on Train. Duplicate surface.
- **Triage** and **Rehab** are two separate tabs for what is functionally one user flow ("something hurts → screen me → here's a plan → do the exercises"). A user mid-rehab has to bounce between tabs to see their state vs. their exercises.
- The **Rehab library is read-only** — there's no way for a user to track which exercises they've completed today. The library tells them what to do but doesn't remember anything they actually did.
- **History** and **About** are secondary — they don't deserve top-level nav slots in a thumb-reach mobile bottom bar.

## Solution

Consolidate eight tabs down to four primary surfaces, merge Triage + Rehab into one state-aware **Body** tab, and add daily-reset per-exercise checkoff so Body becomes a place users return to (not just a catalog they consult). Mobile-first design throughout.

The four primary tabs after consolidation:

```
Hub        ← right-now view (already shipped)
Train      ← plans + stats + leaderboard (absorbs Progress)
Body       ← Triage + Rehab merged, state-aware, with daily checkoff
Chat       ← AI + knowledge base
```

History and About move out of the nav into the footer / account menu. Old routes redirect.

Explicitly **not** in this spec: send log, grade pyramid, coach insights, hangboard tool, automatic phase advancement, sub-tabs inside Body. Each of those gets its own spec.

## IA changes

| Tab today | Where it goes | Routes |
|---|---|---|
| Hub | Stays | `/hub` |
| Triage | Folded into Body | `/triage` redirects to `/body` (preserves SEO + bookmarks); wizard flow becomes Body's "Run a screen" entry |
| Rehab | Folded into Body | `/rehab` redirects to `/body`; `/rehab/:region` redirects to `/body?region=:region` |
| Train | Stays + absorbs `TrainStatsPanel` content fully | `/train` |
| Progress | Removed | `/progress` redirects to `/train` |
| Chat | Stays | `/chat` |
| History | Moves to account menu | `/history` redirects to `/account/history` (or just `/history` left accessible but de-navved — see Routing below) |
| About | Moves to footer | `/about` stays accessible, removed from sidebar `TABS` |

New `TABS` constant in [App.jsx](frontend/src/App.jsx):

```js
const TABS = [
  { id: 'hub',   label: 'Hub',   icon: Home,          subtitle: 'Your climbing dashboard' },
  { id: 'train', label: 'Train', icon: Dumbbell,      subtitle: 'Plans, stats, and how you stack up' },
  { id: 'body',  label: 'Body',  icon: Stethoscope,   subtitle: 'Screen issues + work through rehab' },
  { id: 'chat',  label: 'Chat',  icon: MessageSquare, subtitle: 'Ask the climbing-trained assistant' },
]
```

Mobile bottom nav uses the same `TABS` array — 4 cells, perfect thumb-reach.

## Body tab design (mockup v3 locked)

The Body tab is **state-aware** (option A from the brainstorm): what it shows depends on whether the user has an active triage. Two primary states, one shared shell.

### Active state — user has triage within last 90 days, region exists in `EXERCISES`

```
┌─────────────────────────────────────┐
│  BODY (eyebrow, teal)                │
│  Wrist · Phase 1                     │
│  Day 3 of 14 · pain at or below 3/10 │
│                                       │
│  [● Active] [Phase 1 · D3] [2/4 today]│
│                                       │
│  ┌─────────────────────────────────┐ │
│  │ Today's progress  ▓▓▓░░  2 / 4 │ │
│  └─────────────────────────────────┘ │
│                                       │
│  TODAY · RESETS AT MIDNIGHT          │
│  ☑ Wrist rotation flexibility (done) │
│  ☑ Tendon glides (done)              │
│  ☐ Isometric wrist holds  [expanded] │
│      Should feel: …                  │
│      Stop if: …                      │
│  ☐ Forearm extensor strengthening    │
│                                       │
│  [Browse full exercise library ›]    │
│                                       │
│  ──────────── sticky ────────────    │
│  ┌─────────────────────────────────┐ │
│  │ Something new hurts?  [Screen ›]│ │
│  └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

- **Sticky header** (top): eyebrow + title + subtitle + status pills (horizontal-scroll) + today's progress bar. Frosted-blur backdrop on scroll.
- **Status pills** (horizontal scrollable on mobile): `● Active` (coral, live dot), `Phase N · D{X}` (teal), `{X}/{Y} today` (gold), optionally `{N} days left` if Phase 1.
- **Today's progress bar**: `{checked}/{total}` count + gradient-filled bar. Bar gets a celebratory glow when checked===total.
- **Exercise list**: ordered by Phase 1 exercises for the active region (read from existing [exercises.js](frontend/src/data/exercises.js)). Each card:
  - 28px checkbox on the left, big hit area, accent-teal when checked
  - Name + sets/reps inline
  - Tap card → inline expand showing `feel`, `red_flags`, `progression_trigger` from exercises.js
  - Tap checkbox → mark complete (or unmark if already complete)
  - Completed cards fade to 55% opacity with strikethrough on the name
- **Browse full library link** (dashed, muted): jumps to the existing library view for the active region — for users who want to look beyond today's prescribed set
- **Sticky off-ramp at bottom**: coral "Something new hurts? Run a screen" with explicit assurance ("keeps your current plan"). Always thumb-reachable.

### Empty state — no active triage

```
┌─────────────────────────────────────┐
│  BODY (eyebrow, coral)               │
│  All clear right now                 │
│  No active triage or rehab plan.     │
│                                       │
│  ┌─────────────────────────────────┐ │
│  │  [icon]  Something hurts?       │ │
│  │  5-question screen — red-flag   │ │
│  │  warnings + likely patterns +   │ │
│  │  a phase-based rehab plan.      │ │
│  │  [ Run a screen → ]             │ │
│  └─────────────────────────────────┘ │
│                                       │
│  Or browse exercises for prehab +    │
│  mobility — no injury required.      │
│                                       │
│  PAST TRIAGE                         │
│  ⊙ Wrist · resolved                  │
│    2 months ago · Phase 3 completed  │
└─────────────────────────────────────┘
```

- **Coral hero card** with "Something hurts?" CTA — the primary path
- **Secondary path** to the prehab library: "no injury required" copy explicitly invites healthy climbers
- **Past triage list** below: small read-only cards showing previous triages with their resolution state, sorted newest-first, max 5 items, "see all" link below if more

### Triage → Body transition

When the user completes a triage screen (today flow at `/triage`), the result is saved to `sessions` as today. The success page (currently `TriageReport`) now ends with a primary CTA "Open my rehab plan" → navigates to `/body`. The newly-saved triage immediately becomes the active triage, and the Body tab renders the active state with Phase 1 exercises for the identified region.

The triage wizard itself stays at `/triage` but is reachable from Body's empty-state hero ("Run a screen") or active-state off-ramp ("Something new hurts? Run a screen"). The wizard implementation is unchanged.

## Data model

### New table: `rehab_progress`

```sql
CREATE TABLE IF NOT EXISTS rehab_progress (
  id             SERIAL PRIMARY KEY,
  user_id        INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_key   TEXT NOT NULL,             -- "Wrist:1:Tendon glides" composite
  region         TEXT NOT NULL,             -- "Wrist"
  phase          INT NOT NULL,              -- 1 | 2 | 3
  completed_date DATE NOT NULL,             -- user's local YYYY-MM-DD, sent by client
  completed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, exercise_key, completed_date)
);
CREATE INDEX rehab_progress_user_date_idx ON rehab_progress (user_id, completed_date);
```

- **Tracks daily completion**, not a full event log. Each `(user_id, exercise_key, completed_date)` row represents "this user marked this exercise complete on this day." The unique constraint makes checks idempotent.
- `exercise_key` is `region:phase:exercise_name` — derived from the existing `EXERCISES` data, no IDs change in `exercises.js`.
- `completed_date` is the **user's local YYYY-MM-DD**, sent by the client at check time. This avoids the timezone ambiguity that would arise from inferring "today" server-side — a user in PST tapping at 11pm local on May 14 sends `2026-05-14`, even though the server's UTC clock has rolled over.
- `completed_at` is the UTC timestamp, kept for analytics ("what time of day do people rehab?") but not used in any business logic.
- Historical adherence queries are O(1) — `WHERE user_id = X AND completed_date = Y` returns that day's checked exercises.

### Migration

Add via the existing `_add_column_if_missing` pattern in [database.py](database.py) `init_db()`. Idempotent.

## API endpoints

All require auth.

### `GET /api/rehab/progress?date=YYYY-MM-DD`

Required `date` query param (user's local ISO date). Returns the rows for that date.

```json
{
  "date": "2026-05-14",
  "checked": [
    { "exercise_key": "Wrist:1:Tendon glides",              "completed_at": "..." },
    { "exercise_key": "Wrist:1:Wrist rotation flexibility", "completed_at": "..." }
  ]
}
```

400 if `date` is missing or not `YYYY-MM-DD`.

### `POST /api/rehab/progress/check`

Body: `{ exercise_key: string, region: string, phase: int, date: "YYYY-MM-DD" }`. Inserts `(user_id, exercise_key, region, phase, completed_date=date, completed_at=NOW())` with `ON CONFLICT (user_id, exercise_key, completed_date) DO NOTHING` — idempotent. Returns `{ id, already_existed: boolean }`.

### `DELETE /api/rehab/progress/check`

Body: `{ exercise_key: string, date: "YYYY-MM-DD" }`. Deletes the row matching `(user_id, exercise_key, completed_date=date)`. Idempotent — deleting when nothing is checked is a no-op 200 with `{ deleted: false }`.

### Reuses existing endpoints

- `/api/sessions?limit=1` — most recent triage (drives Body's active/empty state and the region inference)
- `/api/sessions` — list for the "past triage" section in empty state
- `/api/auth/me` — user object passed via prop from App.jsx

## Routing

| Path | Behavior |
|---|---|
| `/body` | New — renders BodyTab |
| `/body?region=Wrist` | Renders BodyTab with the region forced to Wrist (used by triage→rehab handoff and library-browse links) |
| `/triage` | Unchanged — the wizard still lives here. On completion, navigates to `/body` instead of showing the in-place TriageReport (TriageReport content becomes the Body active state) |
| `/triage/results` | Removed — replaced by `/body` post-triage |
| `/rehab` | Redirects to `/body` |
| `/rehab/:region` | Redirects to `/body?region=:region` |
| `/progress` | Redirects to `/train` |
| `/history` | Stays accessible (linked from account menu) but removed from `TABS` |
| `/about` | Stays accessible (linked from footer) but removed from `TABS` |

Old URLs keep working — no 404s for SEO traffic.

The `TABS` array in App.jsx drops from 8 entries to 4 (Hub, Train, Body, Chat). Sidebar nav and mobile bottom nav both render from this array, so both shrink to 4 cells.

## Mobile-specific patterns

- **Sticky header** (status pills + progress bar) with backdrop-blur so it stays visible while scrolling the exercise list
- **Horizontal-scroll pill row** so status context fits without wrapping (`overflow-x: auto` + hidden scrollbar)
- **Touch targets**: 28px checkbox inside a 60px-tall card. Apple's minimum is 44pt; we exceed it by treating the whole card as the expand-toggle and the checkbox as a separate target
- **Sticky bottom stack**: the off-ramp card and the 4-tab bottom nav both pinned via `position: absolute; bottom: 0`, padded with `env(safe-area-inset-bottom)` for iOS home-indicator clearance
- **Tactile press feedback**: `:active { transform: scale(0.985) }` on cards for the "this is a real button" feel
- **Inline expansion** for exercise details, never modal or navigation — keeps the daily-checkoff flow unbroken
- **Skeleton loaders** instead of spinners on initial load (cleaner perceived perf)

### Mobile features explicitly **not** in v1

- Swipe gestures (swipe-to-check, swipe-to-expand) — bad discoverability without tutorial
- Pull-to-refresh — server state doesn't change behind the user; not useful here
- Haptic feedback — defer; Android-only via `navigator.vibrate()`, iOS web has no API. If we add later, it's one line + feature-detect

## Frontend changes

### New components

```
frontend/src/components/
├─ BodyTab.jsx                  (page-level, state machine, mounts active or empty)
├─ BodyActiveView.jsx           (sticky header + exercise list + sticky off-ramp)
├─ BodyEmptyView.jsx            (coral hero + secondary library link + past triage list)
├─ BodyExerciseCard.jsx         (checkbox + name + inline expand)
└─ BodyStatusPills.jsx          (horizontal-scroll pill row with active/phase/progress)

frontend/src/hooks/
└─ useRehabProgress.js          (loads today's checked exercises, mutates on check/uncheck, optimistic UI)
```

### Modified files

| Path | Change |
|---|---|
| `frontend/src/App.jsx` | Drop Triage/Rehab/Progress/History/About from `TABS`. Add Body. Add `/body/*` route. Add redirect routes for `/rehab`, `/rehab/:region`, `/progress`. Update the `isLandingRoute` fallback to use `/hub` (already done). |
| `frontend/src/components/TriageTab.jsx` | On submit success, navigate to `/body` instead of showing in-place TriageReport. |
| `frontend/src/components/RehabProtocol.jsx` | Used in v1 unchanged inside BodyActiveView for the exercise list. Future iteration: collapse into BodyExerciseCard if RehabProtocol's exercise rendering becomes redundant. |
| `frontend/src/components/Landing.jsx` | Feature cards row: drop separate "Injury Triage" + "Rehab Library" cards, replace with one "Body" card. Description updates to "Screen issues and work through rehab — daily progress tracked." |
| `frontend/src/components/AboutTab.jsx` | Reachable via footer link only; remove sidebar entry. No code change inside the file. |
| `frontend/src/api.js` | Add `getRehabProgress`, `checkRehabExercise`, `uncheckRehabExercise`. |
| `database.py` | Add `rehab_progress` table migration + helpers (`get_rehab_progress`, `check_rehab_exercise`, `uncheck_rehab_exercise`). |
| `main.py` | Add three new endpoints under `/api/rehab/progress`. |

### API client additions (`api.js`)

```js
// All three accept/return the user's local ISO date (YYYY-MM-DD).
export const getRehabProgress = (date) =>
  request('GET', `/api/rehab/progress?date=${encodeURIComponent(date)}`)
export const checkRehabExercise = ({ exercise_key, region, phase, date }) =>
  request('POST', '/api/rehab/progress/check', { exercise_key, region, phase, date })
export const uncheckRehabExercise = ({ exercise_key, date }) =>
  request('DELETE', '/api/rehab/progress/check', { exercise_key, date })
```

### Hook contract

```ts
useRehabProgress(region: string | null) → {
  loading:  boolean,
  checked:  Set<string>,                                 // exercise_keys checked today
  toggle:   (exerciseKey, region, phase) => Promise<void>, // optimistic; reverts on server error
  refetch:  () => void,
}
```

- The hook computes today's date once at mount as `new Date().toLocaleDateString('en-CA')` (which returns `YYYY-MM-DD` in the user's local TZ) and passes it to every endpoint call.
- **Optimistic UI**: `toggle` flips the in-memory `checked` set immediately; the network call happens in the background. On error, revert and toast. The hook owns the in-memory state; `BodyExerciseCard` consumes via prop.

## Out of scope (v2+)

- **Send log + grade pyramid** — separate spec, comes next
- **Coach Insights / pattern observations** — separate spec
- **Hangboard tool** — separate spec, biggest of the v2 builds
- **Automatic phase advancement** based on adherence (e.g. "5 days of Phase 1 complete → unlock Phase 2"). Current Phase 2/3 gating stays tier-based.
- **Notifications** when a daily checkoff is incomplete (push or email)
- **Streaks across rehab days** — possible v2 metric. Backend event log already supports the query.
- **Side-by-side comparison** of past triages (e.g. "your last wrist took 6 weeks; this one is on day 3")
- **History tab redesign** — leaves the nav, but the page content stays as-is. Future cleanup pass.

## Open questions

None. Design fully resolved across mockups v1–v3 and the mobile sketch pass. Implementation details (Framer Motion timing on the check animation, exact skeleton layout, whether to vibrate on Android) are downstream of writing-plans.
