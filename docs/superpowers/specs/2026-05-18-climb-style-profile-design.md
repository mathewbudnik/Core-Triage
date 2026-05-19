# Climb-Style Profile Design

**Date:** 2026-05-18
**Status:** Design — pending user review

## Problem

The training wizard asks every user the same questions about goals and weaknesses regardless of how much they've already logged. A user who's logged 30 sessions has rich evidence of how they climb; the wizard ignores it. Worse, the plan generator builds programs from the wizard's coarse `weaknesses` checklist (8 generic items) instead of the user's actual climbing pattern.

Goal: capture each climb's **style** at log time, derive a style profile from the user's training_logs, surface the profile on Hub, pre-fill the wizard from it, and bias plan generation toward shoring up under-developed styles.

## The vocabulary

Lean 4 (locked in brainstorm):
- **Power** — explosive, contact-strength climbs (campus moves, big throws to small holds, short hard sequences)
- **Dynamic** — committing, momentum-based climbs (dynos, deadpoints, swings)
- **Technical** — body-position-dependent climbs (slab, balance, drop-knees, heel hooks, sequence-finding)
- **Endurance** — sustained or pumpy climbs (long routes, low-intensity volume, traverses)

These four are stored as enum values in lowercase: `power | dynamic | technical | endurance`.

## Data model

The existing `training_logs.climbs` JSONB shape:

```jsonc
{
  "boulder": {
    "V3": { "s": 2, "f": 1, "p": 0 },
    "V4": { "s": 0, "f": 0, "p": 3 }
  },
  "route":   { /* same shape */ }
}
```

Each grade-counter dict gains a sibling `styles` map:

```jsonc
"V3": {
  "s": 2, "f": 1, "p": 0,
  "styles": { "power": 2, "dynamic": 0, "technical": 1, "endurance": 0 }
}
```

**Invariant:** `sum(styles.values()) == s + f + p` when `styles` is present. When `styles` is missing (legacy logs), readers treat the climbs as "untagged" and exclude them from the style profile.

Why a sibling field instead of nested-by-style: existing readers (`useHubData`, leaderboard, pyramid) read `c.s`, `c.f`, `c.p` directly. Adding a sibling field doesn't break them; nesting would.

**No DB schema change.** The `climbs` column is already JSONB.

## UI: TrainingLogEntry style picker

A sticky row of 4 style chips at the top of the log form. One chip is always active (default `power`, persisted across sessions in localStorage as `lastStyle`).

```
[ ⚡ Power ]  [ → Dynamic ]  [ ✦ Technical ]  [ ⏱ Endurance ]
                                                ↑ active chip
   V3   [ - 3 + ]   [ - 1 + ]   [ - 0 + ]
        sends       flash       project

   V4   [ - 0 + ]   [ - 0 + ]   [ - 2 + ]
```

Each `+` increment also bumps the counter for the **currently-active style** under that grade's `styles` map. Tapping a different chip changes the active style; subsequent increments tag with the new style. The chip strip is sticky at the top of the form so it's always visible while scrolling through grades.

Visual: each chip is 36px tall (mobile tap target), 2-column-grid on phones (8 chips wouldn't fit one row but 4 do). Active chip uses a style-specific color (see Color tokens below). Inactive chips are neutral.

**Color tokens for the styles** (re-using sessionType.js entries):
- Power → `var(--style-power-c)` = `#fb7185` (coral, Phoenix-tier red)
- Dynamic → `var(--style-dynamic-c)` = `#f97316` (orange, Coral-tier)
- Technical → `var(--style-technical-c)` = `#8b5cf6` (violet, Amethyst-tier)
- Endurance → `var(--style-endurance-c)` = `#2dd4bf` (teal, Aquamarine-tier)

These will be added to `frontend/src/lib/styleColors.js` as a tiny module similar to `sessionType.js`.

## Style profile derivation

A new helper `frontend/src/lib/styleProfile.js`:

```javascript
// Reads training_logs[].climbs[].*.styles and returns:
//   {
//     counts: { power: 12, dynamic: 4, technical: 8, endurance: 2 },
//     pct:    { power: 46, dynamic: 15, technical: 31, endurance: 8 },
//     total:  26,
//     dominant: 'power',     // highest pct
//     weakest:  'endurance', // lowest pct (only when total >= 6)
//     confidence: 'medium',  // 'low' (<6) | 'medium' (6-19) | 'high' (20+)
//   }
export function deriveStyleProfile(trainingLogs) { ... }
```

`confidence` gates downstream behavior:
- `low` — too little data, wizard doesn't pre-fill, Hub card hidden
- `medium` — pre-fill but show the wizard step for confirmation
- `high` — allow skip with "Looks right ✓"

## Hub: Style mix card

A new `HubStyleMixCard` between `HubRingsCard` and `HubTipCard`. Only renders when `confidence !== 'low'`.

Layout:
```
STYLE MIX        Last 30 days

[██████ Power 46% ][████ Tech 31% ][██ Dyn 15% ][▌ End 8%]

Mostly Power. Endurance is your gap — your plan emphasises it.
```

A single horizontal stacked bar (12px tall, rounded ends) split into 4 segments colored by style, each segment widthed by `pct`. Below: a short copy line summarizing the mix + the under-developed style.

Tap the card → opens a `StyleMixSheet` bottom sheet with:
- Bigger version of the bar
- Per-style count + % + grade range ("Your hardest Power send: V5; hardest Technical: V3")
- "Refresh from logs" button (re-derives)

## Wizard: adaptive weaknesses step

The existing step 8 (Weaknesses) currently shows 8 generic checkboxes. Re-shaped to:

1. If `confidence === 'low'` → show the existing 8-chip multi-select unchanged.
2. If `confidence === 'medium'` → show a banner above the chips:
   > Based on **N** logged climbs, your weakest style looks like **Endurance**. We've pre-checked it — adjust if you disagree.
   The relevant chip(s) are auto-checked. User can edit.
3. If `confidence === 'high'` → show a single line + skip CTA:
   > Style mix from **30 logged sessions**: **Power**-heavy, **Endurance** is your gap.
   > [ Looks right ✓ ] [ Edit weaknesses ]
   Tapping "Looks right" auto-fills `form.weaknesses = ['endurance']` and advances to next step. Tapping "Edit weaknesses" drops to the chip multi-select.

The style-to-weakness mapping (since the existing `weaknesses` taxonomy uses different terms):
- `power` style under-developed → `weaknesses.push('power')`
- `dynamic` → `weaknesses.push('power')` (dynamic falls under power in the existing taxonomy)
- `technical` → `weaknesses.push('technique')`
- `endurance` → `weaknesses.push('endurance')`

Note the existing taxonomy doesn't have a 1:1 match for "dynamic" — it folds into power. Acceptable lossy mapping for v1; future work could expand the taxonomy.

## Plan generator: style-aware session emphasis

The current `_pick_session` in `src/coach.py` uses a static schedule by goal + day. We add a `style_profile` parameter that biases the schedule:

```python
def _pick_session(
    goal, day, total_days, week, is_deload,
    experience, finger_ok, shoulder_ok, injury_flags,
    discipline, equipment,
    style_profile=None,  # NEW: {power: 0.46, dynamic: 0.15, technical: 0.31, endurance: 0.08}
):
```

Bias rule (only applies when `style_profile.confidence != 'low'`):

For the goal's default schedule, swap **one weekly slot** for the style that's most under-developed:
- If `endurance < 15%` of total climbs → swap one slot for `endurance` work.
- Else if `technical < 15%` → swap for `technique`.
- Else if `power < 15%` → swap for `power`.
- Else: no swap (well-rounded profile, keep the goal-default schedule).

Which slot gets swapped: the one that overlaps least with the goal. e.g., for `grade_progression` (heavy on power + hangboard), swap day 5 (`endurance`) only if it isn't already an endurance day. Concretely, walk the goal's schedule and replace the **first non-priority** session that isn't already the target style.

Plan freezing: the swap is computed at generation time and frozen into `plan_data.sessions`. Subsequent log changes don't reshuffle an active plan (consistent with the training-days picker behavior).

The style profile is also stored on `plan_data.style_profile` so the user can see "this plan was built when you were Power-heavy and weak on Endurance."

## Backend API changes

`POST /api/training-logs` (existing endpoint) — the request body's `climbs` field already accepts the nested grade-counter dict. Frontend now includes the `styles` sub-map per grade. No Pydantic schema changes needed because `TrainingLogRequest.climbs` is typed as `Dict[str, Dict[str, Dict[str, int]]]` which already accepts any int-valued sub-dict.

Actually checking: the current type is 3-deep but the new structure adds a 4th level under `styles`. Let me re-check — the existing schema may need updating to:

```python
climbs: Dict[str, Dict[str, Dict[str, Any]]] = {}
```

Or more precisely:

```python
class GradeCounters(BaseModel):
    s: int = 0
    f: int = 0
    p: int = 0
    styles: Optional[Dict[str, int]] = None
```

and:

```python
climbs: Dict[str, Dict[str, GradeCounters]] = {}
```

This change is backwards-compatible — legacy payloads without `styles` continue to work since the field is Optional.

Plan generation reads `profile.training_logs` style aggregates already exposed via the climb data on the user's logs. The coach's `generate_training_plan` accepts an existing `profile` arg; we extend it to also accept (or compute) `style_profile` from recent logs.

## Files touched

**Frontend create:**
- `frontend/src/lib/styleColors.js` — 4-style token map + helper
- `frontend/src/lib/styleProfile.js` — derive profile from logs
- `frontend/scripts/smoke-styleProfile.mjs` — Node smoke test
- `frontend/src/components/HubStyleMixCard.jsx`
- `frontend/src/components/StyleMixSheet.jsx`

**Frontend modify:**
- `frontend/src/components/TrainingLogEntry.jsx` — add sticky style-chip row at top, increment style counters on +/-
- `frontend/src/components/HubTab.jsx` — mount HubStyleMixCard
- `frontend/src/hooks/useHubData.js` — expose `styleProfile` field
- `frontend/src/components/ProfileSetup.jsx` — adaptive Weaknesses step

**Backend modify:**
- `main.py` — `TrainingLogRequest.climbs` to allow the new `styles` sub-map
- `src/coach.py` — read style profile, bias `_pick_session`, freeze profile into `plan_data`
- `database.py` — no schema change; the JSONB column already holds the new shape

## Tests

- `frontend/scripts/smoke-styleProfile.mjs` — assertion sweep covering low/medium/high confidence, percent math, dominant/weakest extraction.
- Manual phone verification across the wizard's three adaptive states (low/medium/high) and a log-cycle that flips Power → Technical mid-session.

## Out of scope (future)

- Style breakdown by grade ("you fail Technical V5+ but send V3 fine") — would require richer per-attempt data.
- Per-climb (per-attempt) tagging — the spec settles on per-increment tagging (each `+` adds 1 to the active style under that grade). True per-attempt would need an attempt-history table.
- New session types tied to specific styles (e.g., dedicated "dynamic" sessions). For now we map dynamic → power for plan-gen.
- Style-aware leaderboards.

## Success criteria

- A user with 20+ logged sessions opens the wizard's Weaknesses step and sees a "looks right" CTA pre-filled from their actual data.
- The generated plan visibly reflects under-developed styles (e.g., a Power-heavy climber gets an extra Endurance / Technique day swapped in).
- The Hub's Style Mix card renders within 50ms (data is already in `useHubData`'s logs payload — no extra fetch).
- Existing logs without style data continue to work (no migration required); the profile derivation just excludes them.
