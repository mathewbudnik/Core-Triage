# Triage → Recover Seam — Design (Phase 2, sub-project 1)

> Make a triage diagnosis flow into a persisted, trackable rehab plan with a felt sense of
> recovering — the injury-side mirror of the shipped diagnose→prescribe loop. Read after
> `docs/superpowers/HANDOFF-2026-06-11.md` and the design-system spec
> (`docs/superpowers/specs/2026-06-09-design-system-foundation-design.md`).

**Status:** approved 2026-06-11 (model + Recover-hero visual approved by owner).

## Goal

Today a triage diagnosis is **stateless**: it's re-derived client-side, "phase" is pure calendar
math, and the daily exercise check-off resets at midnight with no streak, history, or sense of
progress. This sub-project gives recovery a **durable plan object**, an **auto-handoff** from
diagnosis, and a **"recovering" signal** (streak + 7-day adherence) built from the check-offs we
already record — without making any clinical "you're healed / advance phase" claim.

## Scope decisions (locked by owner, 2026-06-11)

- **Depth:** persisted rehab-plan object + a real "recovering" signal (streak + 7-day adherence) +
  auto-handoff. **Phase stays date-derived** for v1 (no completion-driven advancement). 
- **Handoff:** auto-route **non-severe** diagnoses into Recover (no manual CTA). **Severe** diagnoses
  stay on the clinical-referral screen and are **never** auto-routed into a self-managed plan.
- **Tracking:** **signed-in only.** Signed-out users still get the full diagnosis + exercise list (via
  the existing sessionStorage self-heal), just no cross-day tracking.

## The model

- A **Rehab Plan** is a first-class "active injury" row created when a signed-in user completes a
  **non-severe** diagnosis. One active plan per user.
- **Re-triage of the same region** reuses the existing active plan (preserves `plan_started_at` and the
  streak). Re-triage of a **different region** marks the old plan `abandoned` and creates a new one.
- Recover loads **your plan** (`GET /api/rehab/plan`) instead of re-deriving it from `getSessions(5)` +
  a 90-day date scan + sessionStorage.
- The daily exercise check-off (`rehab_progress`) is unchanged; its recorded rows now also feed a
  **streak** and **7-day adherence** shown in the Recover hero.

## Auto-handoff (with the safety branch intact)

- **Non-severe diagnosis:** the diagnosis still reveals **inline** (no loss of the reading moment); the
  existing `openRehabPlan` navigation **auto-fires** after the reveal settles (≈1.2s, with a visible
  "Continue to your recovery plan" affordance that also lets the user go immediately). Implementation
  reuses `TriageTab.jsx openRehabPlan` (`navigate('/recover', { state })`) — no `TriageWizard` surgery.
- **Severe diagnosis** (`severity.level === 'severe'`): **no auto-route.** The clinical-referral screen
  (`TriageHero.jsx` severe branch, "See a clinician / Find urgent care") is shown exactly as today.
- **Signed-out / fresh:** the existing sessionStorage self-heal (`lastTriage.js`, `RecoverTab.jsx:48`)
  still surfaces the diagnosis on `/recover`; no plan is persisted (no tracking).

## Data model (1 new table)

### `rehab_plans`
| column | type | notes |
|---|---|---|
| `id` | serial PK | |
| `user_id` | int FK→users ON DELETE CASCADE | |
| `session_id` | int FK→sessions ON DELETE SET NULL | the screening row this plan came from |
| `region` | text | injury region (matches `EXERCISES` keys / `REHAB_REGIONS`) |
| `current_phase` | int default 1 | v1: informational; phase is recomputed on read from the heuristic |
| `plan_started_at` | timestamptz default NOW() | the durable anchor the phase heuristic uses |
| `status` | text default 'active' | `active` \| `resolved` \| `abandoned` |
| `last_activity_at` | timestamptz default NOW() | bumped on check-off |
| `created_at` | timestamptz default NOW() | |

Created in `init_db()` next to `rehab_progress` (`database.py:454`). Invariant: **at most one `active`
plan per user.** `status` ships now; **resolution UI is v2** (the plan simply stays `active`).

**No `plan_id` FK on `rehab_progress` in v1** — the streak/adherence aggregates at the user level
(one active plan, so equivalent), avoiding any change to the check-off write path. That FK is a v2
addition for per-injury history.

## Backend (new endpoints + helpers only — `POST /api/training` / `log_training` untouched)

- **Create-on-diagnose** (signed-in only): extend the existing save path used by `POST /api/sessions`
  (`save_session`, `database.py:1084`; `main.py` handler) so that, after the screening row is written, a
  rehab plan is created/reused:
  - if an `active` plan exists for the **same region** → reuse it (bump `last_activity_at`), return its id;
  - else mark any `active` plan `abandoned`, insert a new `active` plan, return its id.
  - **Skip plan creation for severe diagnoses** (severe is a clinical referral, not a self-managed plan).
  New DB helpers `create_or_reuse_rehab_plan(user_id, session_id, region)`, `get_active_rehab_plan(user_id)`,
  `abandon_active_rehab_plans(user_id)`.
- **`GET /api/rehab/plan`** → `{ plan, phase, streak, last7 }`:
  - `plan`: the active `rehab_plans` row (or `null`).
  - `phase`: `1|2|3` computed from `plan_started_at` via the **existing** date heuristic (days<14→1,
    <42→2, ≥42→3) — ported server-side as `_rehab_phase(plan_started_at)` (mirrors `rehabHeuristic.js`).
  - `streak`: consecutive calendar days ending today (or yesterday, so a not-yet-done today doesn't break
    it) with ≥1 `rehab_progress` row for this user.
  - `last7`: count of distinct days in the last 7 (incl. today) with ≥1 check-off (0–7), plus the per-day
    booleans for the dot row.
  - Backed by a new helper `get_rehab_checkoff_dates(user_id, since_date)` returning distinct
    `completed_date`s (a `SELECT DISTINCT completed_date ... GROUP BY` over `rehab_progress`, reusing the
    existing `(user_id, completed_date)` index). Streak/last7 computed in Python.

## Frontend — Recover hero ("recovering" strip)

- `RecoverTab.jsx`: when signed-in, load `GET /api/rehab/plan` first; fall back to the existing
  `location.state` / sessionStorage / `getSessions(5)` derivation for anon/fresh. Pass the plan +
  `{phase, streak, last7}` into `RecoverActiveView`.
- `RecoverActiveView.jsx`: replace the call to `rehabProgress(triage.created_at)` with the server `phase`
  when a plan is present (keep the heuristic as the anon fallback). Render the **recovering strip** in the
  hero (per the approved mockup):
  - **Phase ladder** — 3 rungs, current highlighted; caption "Phase 2 of 3 · rebuild · day N".
  - **Streak** stat tile — lucide `Flame` (no emoji), "6 days".
  - **Last 7 days** stat tile — "5 of 7" + a 7-dot row marking which days were done.
  - The existing **"Today · N of M done"** section + per-exercise check-off below are unchanged.
- New `api.js` wrapper `getRehabPlan()` (added symbol only — `logTraining`/training wrappers untouched).
- Almanac styling; warm clay/sage injury palette (consistent with the current Recover tab); streak in
  clay-deep, adherence in sage-deep. Tokens only, no emojis, grep gate stays 0.

## Framing & safety (preserve verbatim — never weaken)

- The recovering strip is **adherence/effort, not a medical verdict** ("you've shown up 5 of 7 days").
  No copy implies CoreTriage is treating, diagnosing, or certifying recovery.
- **Severe clinical branch** (`triage.py` severity, `TriageHero.jsx` severe callout, "Find urgent care"),
  **red-flag generation/copy** (`triage.py` `red_flags`/`get_urgent_flags`), the **non-dismissible
  disclaimer gate** (`DisclaimerModal.jsx`, `App.jsx`), and **"not medical advice"** copy (`legal.js`,
  download footer) are **untouched**.
- Phase is date-derived and explicitly **not** a clinical advancement signal in v1; no "you've healed /
  advance" claim is made.

## Avoid-list (parallel agent owns Log-a-climb — zero edits)

`shell/Header.jsx` (+ Log a climb), `shell/AppShell.jsx` log wiring, `App.jsx` log handler/toast lines,
`TrainingLogEntry.jsx`, `ui/LogModeToggle/LogSendQuick/LogSendDeep/SessionSummaryOverlay`,
`PlausibilityConfirmModal.jsx`, `ClimbLogSection/GradeCounterRow/StyleMixSheet/StyleChipStrip`,
`hooks/useSessionLog.js`, `lib/rewardEngine.js`, `POST /api/training`, `log_training`. In shared files
(`api.js`, `main.py`, `database.py`) **add new symbols only**; never edit the flagged training lines.

## Testing

- **Backend (pytest, real-DB pattern from `test_state_endpoint.py`; disable limiter in-process):**
  `_rehab_phase` boundaries (13/14/41/42 days); `create_or_reuse_rehab_plan` (same-region reuse preserves
  `plan_started_at`; different-region abandons + creates; one active plan invariant); severe diagnosis
  creates **no** plan; `GET /api/rehab/plan` shape; streak (consecutive incl. today/yesterday grace) and
  last7 (distinct days, deduped across multiple same-day exercise check-offs) from seeded `rehab_progress`.
- **Frontend (vitest + testing-library):** `RecoverActiveView` renders the recovering strip (phase ladder,
  streak, last7 dots) from props; anon fallback still renders with the date-heuristic phase and no crash.
- **Gate:** `cd frontend && npm run build && npx vitest run`; backend `pytest`; Almanac grep gate 0.

## Non-goals (v2 — its own sub-project later)

Pain/readiness daily check-ins (`rehab_checkins` table); completion-driven phase **advancement**
(evaluating each exercise's unused `progression_trigger`); graduation **celebration**; explicit
**"recovered" resolution** view + `status` transitions UI; `plan_id` FK on `rehab_progress` +
per-injury history; **anonymous** plan persistence.

## Primary files

`frontend/src/components/RecoverTab.jsx`, `RecoverActiveView.jsx`, `TriageTab.jsx`,
`frontend/src/api.js` (new wrapper only), `main.py` (new endpoints/helpers only),
`database.py` (new `rehab_plans` table + helpers near `:454`). **Preserve untouched:** `triage.py`
red-flag logic, `TriageHero.jsx` severe branch, `DisclaimerModal.jsx`, `legal.js`, and the entire
Log-a-climb avoid-list.
