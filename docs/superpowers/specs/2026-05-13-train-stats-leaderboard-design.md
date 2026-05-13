# Train tab — log visibility + stats dashboard + leaderboard (Phase 1)

**Date:** 2026-05-13
**Owner:** Mathew
**Status:** Approved (mockup v3 in `.superpowers/brainstorm/`)

## Problem

Two related complaints about the Train tab:

1. **Logs aren't visible.** Users can log sessions (`TrainingLogEntry` form inside `PlanView`), the data lands in the `training_logs` table, and there's even a recent training-logs view buried in the **History** tab — but the Train tab itself doesn't show any of it. After logging, the user gets no feedback that anything happened.
2. **No sense of progression.** A solo training app with zero comparison to others feels lonely. Users want to know "am I training enough?" relative to people like them, without it turning into a grade-bragging contest.

## Solution

Add a personal stats + leaderboard panel directly to the Train tab. Single metric (training hours), three time windows (this week / this month / all time), cohort = experience level. Public leaderboard with display names, opt-out privacy toggle. Recent sessions list at the bottom solves the visibility complaint.

Explicitly **not** in this phase: no follow graph, no activity feed, no kudos, no comments, no photos, no clubs, no notifications. We're shipping Strava-flavored stats, not a social network.

## Layout (mockup v3 locked)

Renders below the existing plan view in TrainTab. New sub-section, scoped to logged-in users with an athlete profile.

```
┌─────────────────────────────────────────────────┐
│ HERO                                            │
│   "THIS WEEK" pill                              │
│   4.5 hrs  (gradient teal→white→amber)          │
│   ▓▓▓▓▓▓▓░░░░░  73% percentile bar              │
│   Top 27% of intermediate climbers · 73rd %ile  │
├─────────────────────────────────────────────────┤
│ STAT TILES (3-up)                               │
│   🔥 12d Streak  │  ● 4 Sessions  │  ⬆ 38h All-time │
├─────────────────────────────────────────────────┤
│ TREND CHART (last 8 weeks)                      │
│   Your line (teal, gradient fill)               │
│   Peers avg dashed gray                         │
│   Latest dot highlighted                        │
├─────────────────────────────────────────────────┤
│ LEADERBOARD · intermediate · [Week|Month|All]   │
│   🥇 1  ProjectRagger     11.2h  (gold accent)  │
│   🥈 2  SkinCondition      9.8h  (silver accent)│
│   🥉 3  BetaDad            8.6h  (bronze accent)│
│   …                                             │
│   47    You · mathewb      4.5h  (teal accent)  │
├─────────────────────────────────────────────────┤
│ RECENT SESSIONS                                 │
│   ▍Project       Yesterday · 7:00 PM    1h 30m  │
│   ▍Hangboard     Tue · 6:30 AM            45m   │
│   ▍Power         Sun · 4:00 PM         2h 15m   │
│   ▍Strength      Fri · 7:30 PM            50m   │
└─────────────────────────────────────────────────┘
```

Time-window tabs at the top of the leaderboard switch the comparison: **This week** (rolling 7 days from now), **This month** (rolling 30 days), **All time** (lifetime totals). A small "Global" toggle next to the cohort name (intermediate) lets the user switch to the all-climbers view.

## Data model — schema additions

Two new columns on `users`. Migration via `_add_column_if_missing` (idempotent — matches existing pattern in `init_db()`).

```sql
ALTER TABLE users ADD COLUMN display_name TEXT;
ALTER TABLE users ADD COLUMN leaderboard_private BOOLEAN DEFAULT FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS users_display_name_lower_idx
  ON users (LOWER(display_name)) WHERE display_name IS NOT NULL;
```

- `display_name`: NULL until set. The signup flow makes it required for new accounts; existing users get prompted on next login. Case-insensitively unique. 3–20 chars; alphanumeric + `_` + `-`; basic profanity filter (hardcoded blocklist of ~30 obvious terms).
- `leaderboard_private`: when TRUE, leaderboard rows for this user show the literal string "Private climber" instead of their display name. Stats still aggregate into percentiles (so private users contribute to the comparison pool); their row in the leaderboard remains but identity is hidden.

No new tables. The leaderboard is a query over `users + athlete_profiles + training_logs`.

## API endpoints

All three under `/api/training`. Auth required (no anonymous access — leaderboard logic depends on user identity).

### `GET /api/training/stats`

Returns the personal-dashboard payload for the current user.

```json
{
  "this_week": { "hours": 4.5, "sessions": 4 },
  "this_month": { "hours": 18.2, "sessions": 14 },
  "all_time": { "hours": 38.1, "sessions": 31 },
  "current_streak_days": 12,
  "trend_8_weeks": [
    { "week_start": "2026-03-23", "hours": 3.2, "peer_avg_hours": 3.5 },
    /* … 7 more weeks, oldest first … */
  ],
  "percentile_this_week": 73,
  "cohort": "intermediate",
  "personal_records": {
    "longest_streak_days": 18,
    "most_hours_in_week": 7.2,
    "most_sessions_in_week": 6
  }
}
```

- "Percentile" is computed against users in the same `experience_level` cohort, ranked by hours in the same window.
- "Peer avg" in the trend is the mean of the user's cohort's hours in the same week.
- Trend returns exactly 8 weeks (back-fill zeros for weeks the user didn't log).

### `GET /api/training/leaderboard?window=week&cohort=intermediate&limit=10`

Returns the leaderboard for the requested window + cohort.

- `window`: `week` | `month` | `all` (default `week`)
- `cohort`: `beginner` | `intermediate` | `advanced` | `elite` | `global` (default = current user's cohort)
- `limit`: top N (default 10, max 50)

```json
{
  "window": "week",
  "cohort": "intermediate",
  "top": [
    { "rank": 1, "display_name": "ProjectRagger", "hours": 11.2, "is_private": false, "user_id": 42 },
    /* … */
  ],
  "me": { "rank": 47, "display_name": "mathewb", "hours": 4.5, "is_private": false, "user_id": 123 }
}
```

The `me` object always reflects the current user's row regardless of where it falls in the top N. Private users still rank but their `display_name` field is the literal string `"Private climber"`.

### `PATCH /api/auth/me/display-name`

Sets or updates the user's display name. Validates length, character set, uniqueness, profanity blocklist. Returns the new value or a 400 with a specific reason.

### `PATCH /api/auth/me/leaderboard-private`

Body: `{ "private": true | false }`. Toggles the privacy flag.

## Computation details

### Hours-per-window query

```sql
-- Hours this week for one user
SELECT COALESCE(SUM(duration_min), 0) / 60.0
FROM training_logs
WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days';
```

Same pattern for month (30 days) and all-time (no date filter).

### Leaderboard query

```sql
SELECT
  u.id, u.display_name, u.leaderboard_private,
  COALESCE(SUM(tl.duration_min), 0) / 60.0 AS hours
FROM users u
JOIN athlete_profiles p ON p.user_id = u.id
LEFT JOIN training_logs tl
  ON tl.user_id = u.id
  AND tl.created_at >= NOW() - INTERVAL '7 days'   -- swap for month/all
WHERE u.display_name IS NOT NULL                    -- exclude un-named users
  AND p.experience_level = $1                       -- skip when cohort=global
GROUP BY u.id
HAVING SUM(tl.duration_min) > 0                     -- exclude inactive users
ORDER BY hours DESC
LIMIT $2;
```

At launch scale (low hundreds of users) this runs in single-digit ms. If the user count grows past ~10k or the leaderboard gets heavily trafficked, swap to a materialized view refreshed every 5–10 min. Out of scope for v1.

### Streak

A user's "current streak" is the count of consecutive calendar days ending today (or yesterday if no entry today) where at least one `training_log` exists. Computed inline in the stats endpoint.

### Personal records

- `longest_streak_days`: max historical streak (run the streak algorithm over the user's full log history)
- `most_hours_in_week`: max of weekly hour sums across all weeks the user has logged
- `most_sessions_in_week`: max of weekly session counts across all weeks

Computed on-demand in the stats endpoint. Cheap at small scale.

## Anti-abuse / validation

Server-side validation in `log_training`:

- `duration_min` capped at 720 (12 hours per session). Reject with 400 above that.
- `date` cannot be in the future. Reject with 400 if so.
- `intensity` clamped to 1–10.
- (Existing) all fields go through `sanitize_input` to strip HTML/whitespace.

Display name profanity: a hardcoded blocklist in `src/profanity.py` of obvious slurs/profanity. Case-insensitive substring match. If matched, return 400 "That display name isn't allowed. Try another." This is a starter list, not exhaustive; abuse reports get handled manually for v1.

## Frontend changes

### New components

```
frontend/src/components/
├─ TrainStatsPanel.jsx          (the whole new section — hero + tiles + chart + leaderboard + sessions)
├─ TrainStatsHero.jsx           (hero card with gradient number + percentile bar)
├─ TrainStatTiles.jsx           (3-up tile row: streak / sessions / all-time)
├─ TrainTrendChart.jsx          (SVG sparkline with your line + peers dashed)
├─ TrainLeaderboard.jsx         (window tabs + podium-styled top N + your row)
├─ TrainRecentSessions.jsx      (type-colored left border per session)
└─ DisplayNamePromptModal.jsx   (the migration prompt for existing users)
```

`TrainTab.jsx` mounts `TrainStatsPanel` below the existing plan view, only when:
- User is signed in
- User has an athlete profile (has set up via ProfileSetup)
- User has a display name (otherwise show the prompt modal first)

### API client additions (`api.js`)

```js
export const getTrainingStats     = ()               => request('GET',   '/api/training/stats')
export const getLeaderboard       = ({ window, cohort, limit }) =>
  request('GET',   `/api/training/leaderboard?window=${window}&cohort=${cohort}&limit=${limit ?? 10}`)
export const setDisplayName       = (name)           => request('PATCH', '/api/auth/me/display-name',       { display_name: name })
export const setLeaderboardPrivate = (priv)          => request('PATCH', '/api/auth/me/leaderboard-private', { private: priv })
```

### Display-name migration

`DisplayNamePromptModal` is a non-dismissible modal that appears the first time an existing user lands on Train (or any tab if we go further), gated on `user.display_name === null`. The modal:

- Header: "Pick a display name"
- Body: "Your training shows up on leaderboards alongside other climbers. This is the name they'll see — pick something you're happy with. You can change it later in settings."
- Input: 3–20 chars, alphanumeric/`_`/`-`. Live validation with debounced availability check.
- "Save & continue" button. No skip / dismiss path.

For brand-new signups, `RegisterForm` (or wherever the existing form lives) gets a `display_name` field added so they pick during account creation — no migration modal needed.

### Privacy toggle

Lives in `ProfileSetup.jsx`'s edit mode for v1 (no separate Settings page yet). Simple checkbox: "☐ Show me as 'Private climber' on leaderboards (my stats still count)". Calls `setLeaderboardPrivate(true|false)` on toggle.

### Recent sessions

`TrainRecentSessions` shows the **most recent 5** entries from `training_logs` for the current user, ordered by `created_at DESC`. Each row: type-colored left border (3px), small uppercase type pill, relative date ("Yesterday · 7:00 PM"), duration ("1h 30m"). No detail-view / edit affordance in v1 — read-only summary. The full list lives in the existing History → Training sub-tab.

### Trend chart

`TrainTrendChart` renders 8 weeks of data as an inline SVG sparkline. No x-axis labels (the shape is the information). Your line uses `#7dd3c0` with a 35%→0% gradient fill underneath; the peers' average is `#8a93a6` dashed at 60% opacity. Latest data point dotted with a 3.5px circle in the brand teal. Chart height ~80px on mobile.

## Out of scope (Phase 2+, not designed here)

- Follow / unfollow other climbers
- Activity feed (who-trained-what-when)
- Kudos / reactions
- Comments
- Photos per session
- Push / email notifications
- Clubs or groups
- Gym-based / region-based cohorts
- Hangboard PRs / specific-test PRs
- Goal-based comparison (vs other "first V5 project" users)
- Charts beyond the 8-week trend (year view, all-time graph, etc.)

## Open questions

None — design fully approved across the brainstorm flow. Profanity blocklist content and exact streak edge cases (timezone handling) are implementation details, not design decisions.
