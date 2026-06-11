# Skill Prescription Loop — Design

> The diagnose→prescribe loop: turn the Pentagon gap ("Technique is your gap") into a
> committed, checkable weekly block of drills, surfaced on Home and visible/assignable
> by the coach. Read after `docs/superpowers/HANDOFF-2026-06-11.md` and the Almanac
> design system spec (`docs/superpowers/specs/2026-06-09-design-system-foundation-design.md`).

**Status:** approved 2026-06-11. Full-loop scope chosen by owner.

## Goal

The Pentagon already diagnoses what kind of climber you are. This feature closes the loop:
it **prescribes** concrete work for your weakest skill axis and tracks you doing it. A
**Skill Prescription** is a one-week block of ~3 drills targeting your gap axis. You check
drills off through the week; at 100% the block **completes** (XP + celebration) and the next
block auto-targets your new weakest axis. The coach can see a client's block and progress, and
can assign a custom block.

## Scope decisions (locked by owner, 2026-06-11)

- **Depth:** full loop — persisted prescription + per-drill check-off + Coach surface + completion tracking.
- **Unit:** a committed **weekly skill block** with a `start → progress → complete → re-target` lifecycle.
- **Coach:** **see + assign** — coach views gap/block/progress in the inbox and can author/send a block that overrides the auto one.
- **Train link:** **standalone** — the skill-Rx is its own lightweight thing on Home/Coach, NOT entangled with the 4-week plan generator.

## The model

- **Gap axis** = the weakest *present* Pentagon axis, strictly below the strongest (same rule as
  `frontend/src/lib/identity.js` `identityPhrase`). Canonical keys `power | crimp | dynamic | technique | mobility`.
  If no axis is strictly below the strongest → **no gap** → the card shows a balanced "rest" state.
- **Block** = 3 drills for the gap axis, drawn from a per-axis catalog. Each drill has a weekly
  `target` of check-offs (default **3**), so a full block = **9** check-offs. `block_progress = sum(done) / sum(target)`.
- **Completion** = progress reaches 100% → status flips to `completed`, `completed_at` stamped, XP granted.
  The next `GET /api/me/prescription` generates a fresh block for the current gap axis (rotating drills
  if the same axis is still weakest).
- **Honesty:** the Pentagon still moves **only** from logged style-tagged sends (`POST /api/training`).
  Drill check-offs track *doing the work*; they do NOT directly inflate the Pentagon. The card's "did it
  help" signal is the Pentagon rising over the following weeks (already visualized by the morph timeline).

## Data model — 2 new tables (mirror the proven `rehab_progress` pattern)

### `skill_prescriptions`
| column | type | notes |
|---|---|---|
| `id` | serial PK | |
| `user_id` | int FK | |
| `axis` | text | canonical gap axis key |
| `drills_json` | JSONB | array of 3 drill objects (snapshot of catalog entries + `target`) |
| `status` | text | `active` \| `completed` |
| `source` | text | `auto` \| `coach` |
| `assigned_by` | int null | coach user id when `source='coach'` |
| `week_start` | date | |
| `created_at` | timestamptz | |
| `completed_at` | timestamptz null | |

Invariant: **at most one `active` row per user** (generating/assigning a new active block marks any
prior active block `completed`, same as `save_plan`).

### `prescription_progress`
| column | type | notes |
|---|---|---|
| `id` | serial PK | |
| `user_id` | int FK | |
| `prescription_id` | int FK | |
| `drill_key` | text | catalog drill key |
| `completed_date` | date | |

UNIQUE `(user_id, prescription_id, drill_key, completed_date)` → idempotent daily check-off,
exactly like `rehab_progress`.

## Content — the skill→drill catalog (`src/prescriptions.py`)

New backend module. `AXIS_TO_DRILLS: dict[axis -> list[drill]]`, **5 drills per axis (25 total)** so a
3-drill block has variety and rotates on repeat. Drill shape:

```python
{
  "key": "tech_silent_feet",      # stable id, used as drill_key
  "name": "Silent feet",
  "detail": "Climb easy terrain placing every foot with no noise.",
  "sets": 3, "reps": "4 min",     # reps is a string (some are time-based)
  "target": 3,                     # weekly check-offs to clear this drill
  "equipment": "wall",            # wall | board | hangboard | none
  "level": "all"                  # all | intermediate | advanced
}
```

- **`crimp/technique` are canonical** (matching `skills.js`). Backend pentagon uses legacy
  `crimpy/technical`; this module aliases via a small `_canon()` helper (the existing `ALIASES`
  precedent in `identity.js:36`). One place to reconcile spelling.
- Drill content adapted from the existing `src/coach.py` pools (`_POWER_POOL`, `_HANGBOARD_POOL`≈crimp,
  `_FOOTWORK_POOL`≈technique, power/dyno entries≈dynamic) so sets/reps stay credible. **Mobility is
  authored fresh** (no mobility pool exists today) — shoulder/hip/wrist range drills appropriate for climbers.
- **Generation** `select_block(axis, exclude_keys=[])`: pick 3 drills for the axis, preferring ones not in
  `exclude_keys` (the previous block's drills) so repeat blocks rotate; fall back to repeats if the pool is exhausted.

## Backend — gap exposure + endpoints

- **Gap exposure:** add `gap_axis` (canonical key or `null`) to `GET /api/me/state` (`main.py:969`),
  computed from the existing pentagon with the `identityPhrase` rule. Single source of truth shared by the
  Rx generator and any client copy. Helper `_compute_gap_axis(pentagon) -> str | None` near `_compute_current_pentagon`.
- `GET /api/me/prescription` → returns the active block + per-drill progress for today/this week. If none and a
  gap exists, generate + persist one (`source='auto'`). Returns `null`-ish payload with `gap_axis: null` when balanced.
- `POST /api/prescriptions/check` → body `{ drill_key }`; idempotent insert into `prescription_progress` for
  today; recomputes block progress; flips block to `completed` (+ stamps `completed_at`) at 100%. Returns updated
  block + `{ completed: bool, xp_awarded: int }`.
- `GET /api/coach/clients/{id}/prescription` → coach-role-gated; returns the client's gap, active block, progress %.
- `POST /api/coach/clients/{id}/prescription` → coach-role-gated; body `{ axis, drill_keys[] }`; creates a
  `source='coach'` block (assigned_by = coach id), marking any active block completed. Validates the coach owns
  that client relationship.

Tier gating mirrors existing patterns; auto-prescription is available to all signed-in users (it leans on the
free Pentagon). Coach assign is coach-role only.

## Frontend — Home surface

- **New** `frontend/src/components/hub/PrescriptionCard.jsx`. Props: the block payload (`axis`, `drills` with
  per-drill `done/target`, `progress`, `status`) + `onCheck(drillKey)`. Pure presentation; HubTab owns the fetch/state.
- **Placement:** top of `todaySection` in `HubTab.jsx` (`:95-100`), above `<TodaysQuestCard />`.
- **States** (per approved mockup, `.superpowers/brainstorm/.../prescription-card.html`):
  1. **Active** — skill-tinted Almanac field card, left accent in the axis color, eyebrow
     `PRESCRIBED · {Axis}`, Fraunces title + one-line why, 3 drill rows (check-circle, name, sets/reps,
     rep-dots), block progress bar. Tap a drill → optimistic check, server-confirmed.
  2. **Complete** — sage check badge, `+{xp} XP` chip, "Next focus: {newAxis}" line, CTA to start the next block.
  3. **Balanced** — dashed ring, "Well-rounded right now", ghost CTA to the Pentagon. No drills.
- **Data:** new `api.js` wrappers `getPrescription()`, `checkPrescriptionDrill(drillKey)`. HubTab fetches alongside
  `getMeState()` (the data is independent of the existing `state` fetch).
- **Tokens only**, no emojis, lucide icons, snappy motion (~0.16s) — Almanac conventions. The card must keep the
  grep gate at 0.

## Frontend — Coach surface

- In the existing coach **inbox** (`CoachInbox*` / `CoachInboxView`), each client row gains: gap axis chip +
  block title + `% complete`. Opening a client surfaces the block read-only plus an **"Assign a block"** action:
  pick an axis (defaults to the client's gap), accept the catalog's 3 drills (or drop one), send → `source='coach'`.
- New `api.js` wrappers `getClientPrescription(clientId)`, `assignClientPrescription(clientId, {axis, drillKeys})`.
- v1 keeps assign minimal: axis + the 3 catalog drills; no custom drill authoring.

## Gamification

- **Daily reward** = the progress bar filling on each check-off (no per-check XP in v1, to avoid client/server
  XP-dedup complexity).
- **Block completion** grants XP (default **+250**) and fires a completion toast (clay/sage Almanac styling,
  consistent with existing celebration toasts).
- **XP ownership stays client-side** (one source of truth: `lib/rewardEngine.js`). The server owns only the durable
  fact — the block's `status='completed'` + `completed_at`. The check-off response includes `{ completed: true }`;
  the client, on observing a *newly* completed block it has not yet celebrated, awards the XP through the reward
  engine and shows the toast. Dedup by the prescription `id` (persisted in reward-engine state, the same way the
  daily quest dedups by date) so a reload never re-awards.

## Build phasing (one spec → sequenced plan)

1. **Catalog + gap exposure** — `src/prescriptions.py` (`AXIS_TO_DRILLS`, `_canon`, `select_block`),
   `_compute_gap_axis`, add `gap_axis` to `/api/me/state`. Unit-tested pure functions.
2. **Persistence + endpoints** — 2 tables + DB helpers, `GET /api/me/prescription`, `POST /api/prescriptions/check`
   (generation, idempotent check-off, completion + XP).
3. **Home card** — `PrescriptionCard.jsx` + api wrappers + HubTab integration (all 3 states).
4. **Coach see + assign** — inbox enrichment, client block view, assign action, coach endpoints.
5. **Polish** — completion celebration/XP toast, balanced state, motion, grep gate, final verify.

## Non-goals (explicitly deferred)

- Per-drill XP; prescription history / streaks / analytics.
- Auto-handoff from triage → recover (separate Phase 2 item).
- Tying drill completion *directly* to Pentagon movement (the Pentagon stays send-driven — the honest signal).
- Coach authoring brand-new drills outside the catalog.
- Integrating the skill-Rx into the 4-week Train plan generator.

## Testing

- **Backend (pytest):** `_compute_gap_axis` (gap present / tie / balanced / empty pentagon); `_canon` spelling
  reconciliation; `select_block` (3 distinct, rotation via `exclude_keys`, pool-exhaustion fallback); check-off
  idempotency (same drill twice same day = one row); block auto-completion at 100% + XP granted once; coach
  assign marks prior active completed + validates relationship.
- **Frontend (vitest):** `PrescriptionCard` renders each state; optimistic check toggles then reconciles with the
  server payload; balanced state renders no drills.
- **Gate:** `cd frontend && npm run build && npx vitest run`, backend `pytest`, and the Almanac grep gate (0 hits).

## Key conventions

- Tokens only; no emojis; lucide icons; Almanac field-cards + skill colors + snappy motion.
- Visual-only polish rules do NOT apply here (this is net-new feature code), but the **paywall + safety content
  must remain untouched**, and new UI must pass the grep gate.
- Reconcile `crimp/technique` (canonical) vs `crimpy/technical` (backend) in exactly one place (`_canon`).
