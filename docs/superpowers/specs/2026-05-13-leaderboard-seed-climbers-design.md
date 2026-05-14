# Leaderboard Seed Climbers — Design

**Date:** 2026-05-13
**Scope:** Bootstrap the Train tab leaderboard with 10 synthetic climber accounts so new real users see peers across cohorts instead of an empty board.
**Out of scope:** Public disclosure of seed status, AI-generated avatars, scraping third-party services, social features around seed climbers.

---

## Problem

The Train tab leaderboard joins `users` × `training_logs` filtered by cohort (experience_level) and time window (week/month/all). With zero registered users, the leaderboard renders empty. New users have no peers to compare against and no aspirational benchmark — the "create early demand to want to grow" goal of the leaderboard fails on day one.

This design adds 10 hand-curated synthetic climber accounts spread across the four experience cohorts. Seed climbers look identical to real users at the API and UI layer (the user picked the realistic-but-undisclosed approach in brainstorming), but are flagged internally so they can be excluded from business metrics and cleanly removed later. A daily cron keeps their activity fresh so the weekly leaderboard doesn't decay.

## Goals

- Populate the leaderboard so every cohort has ≥1 visible climber when a real user lands on the Train tab.
- Seed activity is realistic but **not dominant** — caps at ~8 hrs/week so motivated real users can outrank seed climbers (competition without intimidation).
- Daily tick keeps the "week" leaderboard alive (decays otherwise).
- Seed climbers are first-class rows in the existing `users` table — no parallel schema, no leaderboard query changes.
- Architecture supports clean teardown (`DELETE FROM users WHERE is_seed = TRUE CASCADE`) when real users reach critical mass.
- Initial history is ≤30 days per seed climber (per user requirement).
- Auth path naturally rejects seed accounts (no `password_hash`).

## Non-Goals

- No public statement or UI tag indicating seed status (undisclosed by design).
- No real-time generation of new seed personas — the 10 are static.
- No grade-progression simulation beyond mild monthly nudges.
- No scraping of real climbing platforms (Kaya, 27Crags, etc.) — IP/ToS/privacy non-starter.
- No avatar generation; seed climbers use the existing default avatar palette.
- No "AI coach replies as a seed climber" or other social-feature illusions.

---

## Architecture

```
DB (existing tables, one new column + one new index)
  users.is_seed BOOLEAN DEFAULT FALSE
  training_logs UNIQUE(user_id, date)    ← needed for idempotent daily tick

Module
  src/seed_climbers.py
    - SEED_PERSONAS: list[Persona] (10 entries, frozen module data)
    - generate_initial_history(persona) → list[TrainingLog]   (~30 days)
    - generate_today_session(persona) → Optional[TrainingLog]  (probabilistic)
    - apply_monthly_progression(persona, current_logs) → adjustments

Scripts
  scripts/seed_climbers_init.py
    - One-time idempotent insert. Run during deploy or by hand.
    - Inserts the 10 users + athlete_profiles + ~30 days of training_logs each.
    - Re-runs are safe: ON CONFLICT DO NOTHING on user email.

  scripts/seed_climbers_tick.py
    - Daily cron entrypoint (Railway scheduler or external cron).
    - For each persona, rolls per-day probability of training; if yes,
      inserts ONE training_log for today's date.
    - Idempotent: UNIQUE(user_id, date) means re-running same day is a no-op.
    - Monthly progression nudge runs on each climber's "anniversary" day.
```

---

## Section 1 — Database changes

### `users.is_seed`

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_seed BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS users_is_seed_idx ON users (is_seed) WHERE is_seed = TRUE;
```

- `NOT NULL DEFAULT FALSE` means existing real users get `FALSE` automatically.
- Partial index speeds up the `WHERE is_seed = TRUE` queries used by cleanup and exclusion logic.

### `training_logs` uniqueness

The daily tick must be idempotent — running it twice in one day must not double-insert. Add a unique index:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS training_logs_user_date_idx
  ON training_logs (user_id, date);
```

**Risk:** existing real users may already have multiple `training_logs` rows for the same `(user_id, date)` (the schema doesn't currently prevent two-a-day sessions). The migration must handle this safely:

```sql
-- Pre-flight check before creating the unique index:
-- SELECT user_id, date, COUNT(*) FROM training_logs GROUP BY 1, 2 HAVING COUNT(*) > 1;
-- If any rows exist, abort migration and require manual data cleanup.
```

**If real users have multi-session days,** scope the unique constraint to seed users only via a partial index:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS training_logs_seed_user_date_idx
  ON training_logs (user_id, date)
  WHERE user_id IN (SELECT id FROM users WHERE is_seed = TRUE);
```

The seed scripts use idempotency on `(user_id, date)`; real-user behavior is unchanged.

Implementation note: the migration script must run the pre-flight count first and pick the right index variant. Default to the partial index if any duplicates exist.

---

## Section 2 — Persona definitions

Static, declarative data in `src/seed_climbers.py`:

```python
@dataclass(frozen=True)
class Persona:
    handle: str              # user-facing display name
    cohort: str              # beginner | intermediate | advanced | elite
    avatar_icon: str         # one of the existing icon set
    avatar_color: str        # one of the existing color set
    sessions_per_week: float # avg, used for daily-tick probability
    session_min_range: tuple[int, int]   # min/max duration_min per session
    intensity_weights: dict[int, float]  # 1..5 → relative probability
    grade_pool: list[str]    # grades_sent draws from this list
    session_types: list[tuple[str, float]]  # (type, weight) for rotation
    rest_week_probability: float  # 0..1, chance any given week is fully off

SEED_PERSONAS: list[Persona] = [
    # Beginners (3)
    Persona(handle="Mira K.",     cohort="beginner",     ...),
    Persona(handle="Reza A.",     cohort="beginner",     ...),
    Persona(handle="Lior B.",     cohort="beginner",     ...),
    # Intermediates (3)
    Persona(handle="Eshan P.",    cohort="intermediate", ...),
    Persona(handle="Yuki H.",     cohort="intermediate", ...),
    Persona(handle="Tomi V.",     cohort="intermediate", ...),
    # Advanced (3)
    Persona(handle="Ariadne L.",  cohort="advanced",     ...),
    Persona(handle="Linnea S.",   cohort="advanced",     ...),
    Persona(handle="Beck M.",     cohort="advanced",     ...),
    # Elite (1)
    Persona(handle="Jasper M.",   cohort="elite",        ...),
]
```

### Concrete tuning per cohort

| Cohort | Sessions/wk | Duration/session | Avg hrs/wk | Grade pool (example) |
|---|---|---|---|---|
| Beginner | 2.0–2.5 | 45–75 min | 2–4 hrs | V0, V1, V2 / 5.7–5.9 |
| Intermediate | 3.0 | 60–90 min | 4–6 hrs | V3, V4, V5 / 5.10a–5.10d |
| Advanced | 3.5 | 75–105 min | 5–7 hrs | V5, V6, V7 / 5.11a–5.11d |
| Elite | 5.0 | 90–110 min | 7–8 hrs | V7, V8, V9 / 5.12a–5.12c |

Caps are intentional: even the elite seed maxes around 8 hrs/week — well below real-world elite climbers (15–25 hrs/wk) so motivated real users can outrank.

### Avatars

Reuse the existing icon/color palette already shown elsewhere on the app. Each persona gets a fixed (icon, color) so they read as distinct on the leaderboard.

---

## Section 3 — Initial backfill (`scripts/seed_climbers_init.py`)

```python
def main():
    """One-time idempotent seed.

    1. For each persona:
       a. Insert user row (ON CONFLICT email DO NOTHING)
       b. Insert athlete_profile row (ON CONFLICT DO NOTHING)
       c. Generate ~30 days of training_logs based on persona pattern
       d. Insert training_logs (ON CONFLICT user_id+date DO NOTHING)
    2. Print summary: N personas seeded, M total training_logs created.
    """
```

### User row shape

```python
{
    "email":           f"seed+{i+1}@coretriage.local",
    "password_hash":   None,                  # un-loginable
    "email_verified":  False,
    "is_seed":         True,
    "display_name":    persona.handle,
    "avatar_icon":     persona.avatar_icon,
    "avatar_color":    persona.avatar_color,
    "leaderboard_private": False,
    "tier":            "free",
    "disclaimer_accepted": True,              # avoid disclaimer-modal logic edge cases
    "disclaimer_accepted_at": datetime.utcnow(),
    "created_at":      datetime.utcnow() - timedelta(days=30),
}
```

### Activity backfill — 30 days

For each persona, walk back 30 days. For each day:

1. Roll per-day probability = `sessions_per_week / 7`
2. If a "rest week" is in progress (rolled at the start of the week), skip
3. If yes: generate one `training_log` with:
   - `date = today - X`
   - `session_type` = weighted random from persona's pool
   - `duration_min` = uniform in persona's range
   - `intensity` = weighted random from persona's intensity_weights
   - `grades_sent` = 1-2 grades sampled from persona's grade_pool, comma-joined
   - `notes` = empty (more realistic than fake notes)

### Idempotency

- `users.email` has unique constraint → re-run insert is no-op
- `athlete_profiles.user_id` is unique → no-op
- `training_logs (user_id, date)` unique index from Section 1 → no-op

Re-running `seed_climbers_init.py` is safe and only fills missing days.

---

## Section 4 — Daily tick (`scripts/seed_climbers_tick.py`)

```python
def main():
    """Daily cron entrypoint.

    For each seed persona:
      1. Roll per-day probability of training
      2. If yes, insert a training_log for today's date (idempotent)
      3. If today is the persona's monthly anniversary, apply a small
         progression nudge to their persona record (in-memory only — the
         persona definition file itself is frozen).
    """
```

### Per-day session generation

Same logic as backfill (Section 3) but for today only. Uses the same `generate_today_session(persona)` helper from `src/seed_climbers.py`.

### Monthly progression nudge

Once every ~30 days per climber, apply a small upward bump:
- Slightly raise the intensity weight distribution (e.g., shift 0.1 probability from intensity 3 → 4)
- Optionally add one harder grade to the climber's `grade_pool`
- Cap progressions so beginners never end up logging V7 — each cohort has a ceiling

Implementation: rather than mutating the persona file, store progression state in a tiny side table:

```sql
CREATE TABLE IF NOT EXISTS seed_progression (
    user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    intensity_bump REAL NOT NULL DEFAULT 0.0,
    extra_grades TEXT[] NOT NULL DEFAULT '{}',
    last_progressed_at TIMESTAMPTZ
);
```

The session generator reads this on each tick to apply current adjustments. `ON DELETE CASCADE` means deleting the seed user cleans this up.

### Scheduling

- **Production:** Railway has a scheduled-task feature — add a daily entry pointing to `python scripts/seed_climbers_tick.py` at 06:00 UTC.
- **Local dev:** Can be invoked manually; the script is fast (~10 inserts max per run).
- **Failure handling:** Script logs and exits non-zero on DB errors; missing a day produces no visible regression (just a real-looking "rest day" for those climbers).

---

## Section 5 — Auth + safety paths

### Login

Existing auth flow calls `bcrypt.checkpw(password, user.password_hash)`. With `password_hash = NULL`, the check raises `TypeError` or returns `False` depending on driver. The route returns 401 either way — seed accounts cannot log in.

Add an explicit early-return in the login handler for defense-in-depth:

```python
if user.is_seed:
    raise HTTPException(status_code=401, detail="Invalid credentials")
```

### Registration with a colliding email

Real user tries to register `seed+1@coretriage.local`. The unique email constraint rejects it with the usual "email already registered" error. Indistinguishable from any normal collision — no information leak.

### Exclusion from business metrics

- User counts ("X registered climbers", admin dashboards) → `WHERE NOT is_seed`
- Coach messaging routing → skip seed users (no inbox)
- Email sending (verification, password reset, marketing) → skip seed users
- Stripe / billing → no seed user ever reaches a Stripe code path (no login means no checkout)

Document these in `src/seed_climbers.py` module docstring.

### Profile lookups

`/api/users/me` is auth-gated. Seed users can't reach it (no login). `/api/training/leaderboard` returns them with normal user fields — that's the intended exposure.

### Cleanup / teardown

```sql
DELETE FROM users WHERE is_seed = TRUE;
-- Cascades to athlete_profiles, training_logs, seed_progression via FK.
```

One command, full removal. The leaderboard returns to whatever real-user state exists at that moment.

---

## Section 6 — Frontend impact

**None.** The existing `TrainLeaderboard.jsx` consumes `/api/training/leaderboard` rows as-is. Seed climbers appear naturally as additional rows. No conditional rendering, no "seed" badge, no client-side filtering.

The only frontend-visible change: the leaderboard isn't empty on a fresh install.

---

## Section 7 — Tests

`tests/test_seed_climbers.py` (new file):

| Test | Asserts |
|---|---|
| `test_personas_count_and_distribution` | Exactly 10 personas; 3/3/3/1 across cohorts |
| `test_persona_caps_respected` | Elite max hours/week ≤ 9; beginner ≤ 5 |
| `test_grade_pools_are_cohort_appropriate` | Beginner pool has no V5+; elite has no V0 |
| `test_generate_initial_history_idempotent` | Run twice → same set of (user_id, date) rows |
| `test_generate_today_session_returns_none_or_log` | Probabilistic but valid shape when returned |
| `test_tick_inserts_at_most_one_session_per_day_per_climber` | Run tick twice same day → 0 new rows on second run |
| `test_monthly_progression_caps_dont_exceed_cohort_ceiling` | Progression nudges respect grade ceiling |
| `test_seed_user_cannot_login` | POST /api/auth/login with seed email → 401 |
| `test_leaderboard_query_returns_seed_climbers_naturally` | Existing leaderboard query surfaces seed climbers |
| `test_cleanup_removes_all_seed_data` | DELETE WHERE is_seed cascades cleanly |

Plus a calibration test: confirm the `tests/test_triage_calibration.py` and other existing suites are unaffected (seed data shouldn't bleed into triage scenarios).

---

## Section 8 — Migration story

1. **Pre-deploy:** Run the pre-flight check: `SELECT user_id, date, COUNT(*) FROM training_logs GROUP BY 1, 2 HAVING COUNT(*) > 1`. If empty, use the full unique index. If non-empty, use the partial-on-is_seed index.
2. **Deploy:** The `is_seed` column migration runs automatically via `init_db()` (existing convention in `database.py`).
3. **One-time seed:** Run `python scripts/seed_climbers_init.py` once manually (or as a deploy step). Idempotent — safe to re-run.
4. **Schedule cron:** Add Railway scheduled task for `python scripts/seed_climbers_tick.py` at daily 06:00 UTC.
5. **Verify:** Open `/api/training/leaderboard?window=week&cohort=intermediate` → expect 3 intermediate seed climbers populating the board.

Rollback: `DELETE FROM users WHERE is_seed = TRUE`; remove the cron schedule.

---

## Section 9 — Open considerations (non-blocking)

- **Naming pool exhaustion:** 10 fixed personas means anyone reading the seed file once knows all the names. Mitigation: don't share the seed file publicly. Future iteration: rotate or extend the persona pool.
- **Geographic / demographic distribution:** The 10 names skew slightly varied (Mira/Reza/Lior/Eshan/Yuki/Tomi/Ariadne/Linnea/Beck/Jasper) but aren't internationally exhaustive. Acceptable for a bootstrap; revisit if early-user feedback flags it.
- **Reading-out-loud detection:** If a real user logs ~3 hrs every Mon/Wed/Fri exactly, they could deduce a bot pattern. The activity generator uses probability + jitter (rest weeks, skipped days, varied durations) to make patterns less mechanical.
- **Leaderboard private toggle for seed climbers:** Set `leaderboard_private = FALSE` for all seed climbers (default). They must be visible — they exist *for* visibility.
- **Scaling past 10:** If the user wants more variety later (say 25 climbers), `SEED_PERSONAS` is a simple list to extend. Generator code requires no changes.

---

## Acceptance criteria

1. After running `seed_climbers_init.py` on a fresh DB, `/api/training/leaderboard?window=all` returns ≥10 climbers (the 10 seed users).
2. After running the daily tick, today's date appears in `training_logs` for some subset of seed climbers (probabilistic).
3. Re-running `seed_climbers_init.py` produces no duplicate rows.
4. Re-running `seed_climbers_tick.py` same day produces no duplicate rows.
5. POST `/api/auth/login` with `seed+1@coretriage.local` returns 401.
6. `DELETE FROM users WHERE is_seed = TRUE` removes all seed users + their training_logs + athlete_profiles + seed_progression rows.
7. Existing `tests/test_triage_calibration.py` and `tests/test_finger_triage.py` continue to pass (seed work touches no triage code).
8. All cohorts (beginner/intermediate/advanced/elite) have ≥1 visible climber in the leaderboard.
9. Maximum weekly hours across all seed climbers ≤ 9 (preserves "not too competitive" property).
10. No frontend code changes — `TrainLeaderboard.jsx` and related components are untouched.
