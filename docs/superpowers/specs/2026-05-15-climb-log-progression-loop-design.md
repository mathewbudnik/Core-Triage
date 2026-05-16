# Climb log + progression loop (v1)

**Date:** 2026-05-15
**Owner:** Mathew
**Status:** Approved (sections 1–4 in brainstorm)

## Problem

The Hub's "See leaderboard ›" button currently navigates to `/progress`, which redirects to `/train` — but the Train tab doesn't render `TrainStatsPanel`, so the user lands on a page with no leaderboard, no stats, no progress. The IA consolidation in [2026-05-14-body-merge-ia-consolidation-design.md](2026-05-14-body-merge-ia-consolidation-design.md) wired up the redirect but never moved the stats panel — half-done consolidation.

Beneath the broken button there's a bigger gap: CoreTriage tracks **session hours** (Strava-style activity log) but not **climbing progression**. The existing `training_logs.grades_sent` column is free-text — useless for a grade pyramid, send-rate, or PR detection. A climber who logs sessions for three months has nothing to look at that says "you're climbing harder than you were."

This spec adds session-level structured climb logging (sends / flashes / projects per grade) and a grade-pyramid progression view, while restoring `/progress` as a real destination. The interactive loop: **log → instant pyramid update + PR celebration → Hub pulls you back next session**.

## Solution

Three changes that fit together:

1. **Structured climb data on `training_logs`** — one JSONB column `climbs` capturing sends/flashes/projects per grade, per discipline (boulder / route).
2. **Grade Pyramid view** on the existing (orphaned) `ProgressTab`, with a celebration toast on new PRs.
3. **Hub hook upgrade** — fold leaderboard rank, PR badges, and a mini pyramid preview into one card that replaces the current `HubSocialStrip`, and add a PR pill to the welcome line.

Plus: restore `/progress` as a real route, so the existing Strava-style page (week hero, leaderboard, trend, PRs) is reachable again — augmented with the new pyramid section.

Explicitly **not** in this spec: climb-level (per-problem) logging, outdoor vs gym distinction, Font/Euro grade conversion, grade-based leaderboard, Mountain Project / 27Crags / Kaya import, push notifications, grade-pyramid share images.

## Data model

### Migration: add `climbs` JSONB to `training_logs`

```sql
ALTER TABLE training_logs ADD COLUMN IF NOT EXISTS climbs JSONB NOT NULL DEFAULT '{}'::jsonb;
```

Added via the existing `_add_column_if_missing` pattern in [database.py](database.py) `init_db()`. Idempotent.

Shape:

```json
{
  "boulder": {
    "V5": { "s": 3, "f": 1, "p": 0 },
    "V6": { "s": 1, "f": 0, "p": 0 }
  },
  "route": {
    "5.11a": { "s": 1, "f": 0, "p": 0 },
    "5.11c": { "s": 0, "f": 0, "p": 2 }
  }
}
```

- Keys: `boulder` and `route` (only those two disciplines in v1).
- Inner keys: grade strings using V-scale (`V0`–`V17`) or YDS (`5.6`, `5.7`, ..., `5.15d`). Validation handled server-side; bad grades 400.
- Per-grade object: `s` (sends), `f` (flashes), `p` (projects/attempts that didn't send). All non-negative integers. `f ≤ s` enforced server-side.
- Empty `{}` is the default for sessions with no climbs logged.
- JSONB so adding new grades or a third discipline never requires `ALTER TABLE`.

### Existing `grades_sent` TEXT column

Kept for backward compat. On every `INSERT`/`UPDATE` that includes `climbs`, the server generates a human-readable summary and writes it to `grades_sent`:

```
"Boulder: V5×3 (1 flash), V6×1. Route: 5.11a×1, 5.11c projecting (2 tries)."
```

A future migration can drop the column once all readers move to `climbs`. v1 leaves it in place — anything currently reading `grades_sent` (the AI chat context, the recent-activity feed if it shows it) keeps working unchanged.

### Validation rules (server-side)

| Rule | 400 message |
|---|---|
| `climbs` is not an object | "climbs must be a JSON object" |
| Top-level key not in `{boulder, route}` | "discipline must be boulder or route" |
| Boulder grade doesn't match `^V([0-9]|1[0-7])$` | "invalid V-scale grade: {grade}" |
| Route grade doesn't match `^5\.(([6-9])|(1[0-5][a-d]?))$` | "invalid YDS grade: {grade}" |
| `s`/`f`/`p` not non-negative integers | "counts must be non-negative integers" |
| `f > s` | "flashes cannot exceed sends for {grade}" |

## API endpoints

### `POST /api/training` — existing endpoint, extended

Request body adds one optional field:

```json
{
  "date": "2026-05-15",
  "session_type": "bouldering",
  "duration_min": 90,
  "intensity": 7,
  "notes": "Felt strong on slab",
  "climbs": {
    "boulder": { "V6": { "s": 2, "f": 1, "p": 0 } }
  }
}
```

If `climbs` is omitted or `{}`, behavior is unchanged. If present and valid, the row is stored with the JSONB plus an auto-generated `grades_sent` summary. Response includes a `new_prs` field:

```json
{
  "id": 1234,
  "new_prs": { "boulder": "V6", "route": null }
}
```

`new_prs.boulder` / `new_prs.route` is the new hardest-send grade if this session set one, otherwise `null`. Used by the frontend to fire the celebration toast.

PR detection runs at write time inside the same transaction: `SELECT MAX(grade) before insert; after insert, compare`. Grade comparison uses an ordering helper (V0 < V1 < ... < V17; 5.6 < 5.7 < 5.8 < 5.9 < 5.10a < 5.10b < ... < 5.15d).

### `GET /api/training/pyramid?window=month` — new

Query params:
- `window`: `month` (default) | `all` — `month` = last 30 days rolling, `all` = lifetime.

Response:

```json
{
  "window": "month",
  "boulder": {
    "hardest_send":  "V7",
    "hardest_flash": "V5",
    "grades": [
      { "grade": "V5", "s": 4, "f": 1, "p": 0 },
      { "grade": "V6", "s": 2, "f": 0, "p": 1 },
      { "grade": "V7", "s": 1, "f": 0, "p": 3 }
    ]
  },
  "route": {
    "hardest_send":  "5.11c",
    "hardest_flash": "5.10b",
    "grades": [ ... ]
  }
}
```

`grades` is sorted ascending. Only grades the user has data for are returned (no zero rows). `hardest_send` / `hardest_flash` are `null` when no data.

### Reuses existing endpoints
- `GET /api/training` — unchanged. The Recent Activity feed renders the auto-generated `grades_sent` summary as today.
- `GET /api/training/stats` — unchanged.
- `GET /api/training/leaderboard` — unchanged (still ranks by hours).

## Frontend changes

### New components

```
frontend/src/components/
├─ ClimbLogSection.jsx       (collapsible section appended to the existing session-log form)
├─ GradeCounterRow.jsx       (one grade row: −/+/+ counters for sends/flashes/projects)
├─ GradePyramidCard.jsx      (full pyramid for ProgressTab — both disciplines, time selector)
├─ HubProgressCard.jsx       (replaces HubSocialStrip — rank + PRs + mini pyramid + CTA)
└─ PRCelebrationToast.jsx    (post-log toast: "New PR — V7 boulder!")
```

### Modified files

| Path | Change |
|---|---|
| `database.py` | `_add_column_if_missing(climbs, JSONB, '{}')`. Add `insert_training_log` overload accepting `climbs`. Add `get_pyramid(user_id, window)` helper. Add grade-ordering helper module-local. |
| `main.py` | `TrainingLogRequest` Pydantic model gains optional `climbs: dict`. Validate against rules above. PR detection in same transaction. Add `GET /api/training/pyramid`. |
| `frontend/src/api.js` | Add `getPyramid({ window })`. `logTraining` request type already accepts arbitrary fields; document `climbs` shape inline. |
| `frontend/src/components/TrainingLogEntry.jsx` | Append `<ClimbLogSection />` controlled by component state, conditioned on `session_type ∈ {bouldering, routes, outdoor, other}`. Wire its value into the `logTraining()` payload as `climbs`. On submit success, if `new_prs.boulder` or `new_prs.route` is set, fire `<PRCelebrationToast />` via the existing App-level toast slot. |
| `frontend/src/components/ProgressTab.jsx` | Insert `<GradePyramidCard />` between the existing leaderboard section and the 8-week trend chart. |
| `frontend/src/components/HubTab.jsx` | Replace `<HubSocialStrip rank={data.rank} />` with `<HubProgressCard rank={data.rank} hardestSends={data.hardestSends} pyramidPreview={data.pyramidPreview} />`. |
| `frontend/src/components/HubGreeting.jsx` | Add PR pill rendering when `data.hardestSends?.boulder` or `data.hardestSends?.route` is set. Falls back to existing copy when no PRs. |
| `frontend/src/hooks/useHubData.js` | Fetch pyramid (month window) alongside the existing fetches; expose `hardestSends` + `pyramidPreview` (top 3 rows of boulder pyramid) on the returned data object. |
| `frontend/src/App.jsx` | Drop the `/progress → /train` redirect; restore `<Route path="/progress" element={<ProgressTab ... />} />`. |
| `frontend/src/components/HubSocialStrip.jsx` | Removed (replaced by `HubProgressCard`). |

### ClimbLogSection layout

```
┌─────────────────────────────────────┐
│ Log climbs (optional)          [⌄] │  ← collapsed by default
└─────────────────────────────────────┘

— expanded —
┌─────────────────────────────────────┐
│ Log climbs                     [⌃] │
│ [ Boulder ][ Route ]                │  ← sub-tabs
│                                       │
│ V3   − 0 +    − 0 +    − 0 +       │
│        sends   flashes  projects     │
│ V4   − 0 +    − 0 +    − 0 +       │
│ V5   − 2 +    − 1 +    − 0 +       │
│ V6   − 1 +    − 0 +    − 0 +       │
│ + harder                            │  ← reveals V7/V8/...
└─────────────────────────────────────┘
```

- Default visible range: V0–V5 boulder; 5.6–5.11a route. `+ harder` button reveals additional rows on demand.
- `−` is disabled when count is 0. Flashes capped to current sends (UI prevents `f > s`).
- Tab choice (Boulder/Route) persists in `localStorage` under `ct_climb_tab` so the user doesn't re-tap every session.
- Mobile: counters are 44px tap targets; numeric label is the count.

### GradePyramidCard layout (ProgressTab)

```
┌─────────────────────────────────────┐
│ Grade Pyramid       [ Month | All ] │
│                                       │
│ Boulder · V7 send · V5 flash         │
│ V3 ████░░░░░░ 4 sends                │
│ V4 ███░░░░░░░ 3 sends · 1 flash      │
│ V5 ██░░░░░░░░ 2 sends                │
│ V6 █░░░░░░░░░ 1 send · 1 project     │
│ V7 ░░░░░░░░░░ 0 · 3 projects         │
│                                       │
│ Route · 5.11c send · 5.10b flash     │
│ 5.10a ██░░░░░░░░  2 sends            │
│ 5.10b █░░░░░░░░░  1 send · 1 flash   │
│ 5.11c ░░░░░░░░░░  0 · 2 projects     │
└─────────────────────────────────────┘
```

- Each row's bar is a horizontal stacked bar: **green** = flashes, **teal** = sends-non-flash, **gold** = projects. Width relative to the row's largest count, not the overall max — so visual emphasis is on the spread within a grade.
- Hardest send / flash badges sit above each discipline column.
- Time window pill: `Month` (last 30d rolling) default, `All` switches to lifetime. Selection persists in `localStorage`.
- On mobile, disciplines stack vertically.
- Empty state (no climbs logged ever): "No climbs logged yet. Log a session in Train to see your pyramid grow." with a button to `/train`.

### HubProgressCard layout

```
┌─────────────────────────────────────┐
│ 🏆 Ranked #N this week              │
│                       V7 · 5.11c    │ ← PR badges, top-right
│ ─── This month ───                  │
│ V5 ████░  V6 ██░░░  V7 ░░░░░        │
│                       See progress ›│
└─────────────────────────────────────┘
```

- Top-left: leaderboard rank (existing behavior — preserves the `🏆 Ranked #N` line from `HubSocialStrip`).
- Top-right: PR badges, one per discipline. Hidden per-discipline if `hardest_send` is null.
- Bottom row: top 3 grades from this month's boulder pyramid (or route if no boulder data; or nothing if neither). Just the grade label + a 5-block sparkline showing total send count (capped at 5).
- Whole card is tappable → `/progress`. CTA "See progress ›" is the affordance.
- Empty state (no rank, no climbs): keeps current copy "Log your first session to see how you stack up." with a CTA → `/train`.

### HubGreeting PR pill

The greeting today reads:

> Welcome back, MistaCrimpa
> Friday · Day 3 of wrist rehab

With this change, if `data.hardestSends?.boulder` is set, the subtitle becomes:

> Friday · V7 boulder · Day 3 of wrist rehab

If route is set but not boulder: `Friday · 5.11c route · Day 3 of wrist rehab`. If both: only boulder shown (avoid clutter — boulder is the primary discipline for the V13 audience). If no rehab: `Friday · V7 boulder`.

### PR celebration toast

Renders for 4 seconds after a successful session log when `new_prs.boulder` or `new_prs.route` is non-null:

```
🎉  New PR — V7 boulder!     Tap to view ›
```

Tap → `/progress`. Tapping also dismisses. Uses the existing toast slot in `App.jsx` (which currently shows session-expired / error toasts) — single concurrent toast, the celebration replaces any in-flight one.

If both disciplines set a new PR in one session, the toast shows both: `"New PR — V7 boulder + 5.11c route!"`.

## Routing

| Path | Before | After |
|---|---|---|
| `/progress` | Redirects to `/train` (broken: Train has no stats) | Renders `ProgressTab` (Strava-style page) |
| `/train` | Plan + profile only | Unchanged. Climb-log section is **appended to the session-log form** within Train, not a separate route. |
| `/hub` | Unchanged | Unchanged — but `HubProgressCard` replaces `HubSocialStrip` |
| `/body`, `/chat`, etc. | Unchanged | Unchanged |

Bottom nav remains 4 tabs (Hub · Train · Body · Chat). Progress is not added back to the nav.

## ProgressTab section order

Top → bottom (the user sees the social hit before the personal-progression hit):

1. Hardest-send badges + week summary hero — *existing*
2. Leaderboard — *existing*
3. **Grade Pyramid** — *new*
4. 8-week hours trend — *existing*
5. Recent activity — *existing* (renders `grades_sent` auto-summaries on session rows)
6. Personal records grid (hours-based) — *existing*

## The interactive loop

```
                ┌─────────────────────────┐
                │  Open Hub                │
                │  see rank + PR + pyramid│
                └────────────┬────────────┘
                             │ tap See progress
                             ▼
                ┌─────────────────────────┐
                │  ProgressTab            │
                │  full pyramid + history │
                └────────────┬────────────┘
                             │ "I want to push V7"
                             ▼
                ┌─────────────────────────┐
                │  Train tab              │
                │  log session + climbs   │
                └────────────┬────────────┘
                             │ submit
                             ▼
                ┌─────────────────────────┐
                │  Celebration toast      │
                │  "New PR — V7 boulder!" │
                └────────────┬────────────┘
                             │ tap
                             ▼
                       back to ProgressTab
```

Every loop iteration the pyramid grows. Hub on next open reflects the new state, pulling them back.

## Mobile-specific patterns

- ClimbLogSection collapsed by default — climbing-irrelevant session types (hangboard / strength / rest) never see it.
- All `−` `+` buttons are 44×44px minimum tap targets.
- `+ harder` button avoids the 18-row scroll wall for a beginner who only climbs V3–V5.
- GradePyramidCard stacks disciplines vertically below 640px.
- HubProgressCard fits in a single mobile width without horizontal overflow — short bars plus 1-character grade labels.

## Out of scope (v2+)

- **Climb-level logging** (per-problem rows: name, location, beta) — natural v2.
- **Outdoor vs gym tag** per session/climb.
- **Font / 8a / European grade input + conversion**.
- **Grade-based leaderboard** ("hardest sender this week"). Conflicts with the low-pressure framing from the seed-climbers spec; revisit only if engagement data later argues for it.
- **Editing past climbs** — v1 climbs are write-once at session-log time. If a session-edit screen exists later, it should gain the climb fields.
- **Import from Mountain Project / 27Crags / Kaya** — scraping ruled out; OAuth is large work.
- **Push / email reminders** ("you haven't logged in 5 days").
- **Streak across logging days** — easy to compute from the same data; defer.
- **Grade pyramid PDF / share-image export** — Strava-style shareable card.
- **AI commentary on pyramid** ("your V6 send rate jumped 30% — try a V7 project") — interesting but defer; the chat tab can already answer this on demand.

## Open questions

None. The session-log form is `TrainingLogEntry.jsx` (verified via grep — used by `PlanView.jsx` inside Train and by `HistoryTab.jsx`). Implementation details (toast animation timing, exact grade-ordering helper location, time-window pill styling) are downstream of writing-plans.
