# Personalised Training Exercise Library — Design

**Date:** 2026-05-11
**Status:** Approved, ready for implementation plan

---

## Problem

The training-plan generator at [src/coach.py](src/coach.py) prescribes the same exercise library to everyone of a given experience level. A V10+ boulderer reviewed a generated plan and flagged that "Max-weight pinch hangs" was niche — useful for specific power-pinch training, but not appropriate as a default for someone whose goal is general progression or sport-climbing endurance.

More broadly: the library is small (~14 exercises) and pitched too narrowly. The plan generator already branches on `goal`, `experience`, and injury flags, but ignores `primary_discipline` and `equipment` entirely — both of which are collected on the user profile.

Every exercise now carries a Watch demo button linking to a YouTube search. That makes "is this exercise common enough to YouTube successfully" a hard requirement for any new entry. Niche entries with poor search-results coverage are a worse user experience than common alternatives.

## Goal

Personalise the exercise prescription on **discipline** and **equipment**, while expanding the library so every climber gets a plan composed of common, well-documented exercises appropriate to their goals and gear.

## Non-goals

- Weakness-driven block emphasis (the `weaknesses` profile field). Deferred to a separate plan — would require selector logic that touches *which* blocks get scheduled per week, not just *which exercises* fill a block.
- Goal-grade → intensity zone mapping (using `max_grade_boulder` vs `goal_grade` to scale absolute weights). Out of scope.
- Frontend UI changes. The plan already renders whatever the backend returns; no React work needed.
- AI-generated exercises. Library stays hand-curated.
- Adding new disciplines or equipment values. Use exactly what `ProfileSetup.jsx` already collects.

## Profile values in scope

From [frontend/src/components/ProfileSetup.jsx:13-30](frontend/src/components/ProfileSetup.jsx#L13-L30):

**Disciplines:** `bouldering`, `sport`, `trad`, `competition`.
**Equipment:** `hangboard`, `home_wall`, `gym_membership`, `outdoor_crag`, `campus_board`, `system_wall`.
**Experience levels** (existing): `beginner`, `intermediate`, `advanced`, `elite`.

## Exercise schema — extend with tags

Every exercise dict in the library gets three new fields:

```python
{
    "exercise": "Max-weight pinch hangs",
    "detail": "Pinch block or wide pinch on board, add weight",
    "sets": 5,
    "reps": "10s on / 50s off",
    "rest_seconds": 180,
    "effort_note": "Target ≥ 120% body weight across all grip positions over the mesocycle",
    "benchmark": "Elite: pinch at bodyweight is the baseline — train beyond",
    # NEW tag fields:
    "disciplines": ["bouldering", "competition"],   # subset of profile values
    "min_experience": "advanced",                    # required; one of levels
    "max_experience": "elite",                       # optional; defaults to "elite" if absent
    "equipment_needed": ["hangboard"],              # any-of; [] = universal
}
```

**`disciplines`** lists every discipline this exercise is appropriate for. Must include at least one. The user's `primary_discipline` must appear in this list for the exercise to qualify.

**`min_experience`** is required. Climbers below this level don't see the exercise.

**`max_experience`** is optional. Climbers above this level don't see the exercise — useful for tagging beginner-only intros so advanced climbers get harder defaults. Defaults to `"elite"` when omitted (= no upper bound).

**`equipment_needed`** is any-of semantics. Empty list means the exercise works regardless of gear. A list like `["hangboard", "home_wall"]` means either piece of equipment is sufficient.

## Block selector signatures

Replace existing signatures — every block normalizes to the same triple:

| Block | Before | After |
|---|---|---|
| `_hangboard_block` | `(experience)` | `(experience, discipline, equipment)` |
| `_power_block` | `(experience)` | `(experience, discipline, equipment)` |
| `_strength_block` | `(experience)` | `(experience, discipline, equipment)` |
| `_endurance_block` | `(experience)` | `(experience, discipline, equipment)` |
| `_footwork_block` | `()` | `(experience, discipline, equipment)` |
| `_mental_block` | `()` | `(experience, discipline, equipment)` |

Uniform signatures let every block use the same `_filter_exercises` helper and the same coverage tests, with no special-casing. Footwork and mental exercises just get tagged with `disciplines: ["bouldering", "sport", "trad", "competition"]` (universal) where they apply broadly, or a narrower list (e.g. gear-placement drill → `["trad"]`).

Each block holds its full tagged exercise pool inline as a `list[dict]` at the top of the function (or as a module-level constant), then calls the shared `_filter` helper and picks the top N matching entries.

`experience` is the canonical lowercase string. `discipline` is the canonical lowercase string. `equipment` is `list[str]` of canonical values (matching profile values verbatim).

## Selector logic

A single shared helper near the top of `src/coach.py`:

```python
_EXPERIENCE_LEVELS = ["beginner", "intermediate", "advanced", "elite"]

def _filter_exercises(
    pool: list[dict],
    experience: str,
    discipline: str,
    equipment: list[str],
) -> list[dict]:
    """Return entries from `pool` that match all four constraints.

    Order is preserved (pool author controls priority). If filtering produces
    zero matches, callers must provide a fallback — never raise empty up to
    the plan generator."""
    user_idx = _EXPERIENCE_LEVELS.index(experience)
    out = []
    for ex in pool:
        min_idx = _EXPERIENCE_LEVELS.index(ex["min_experience"])
        max_idx = _EXPERIENCE_LEVELS.index(ex.get("max_experience", "elite"))
        if not (min_idx <= user_idx <= max_idx):
            continue
        if discipline not in ex["disciplines"]:
            continue
        needed = ex.get("equipment_needed", [])
        if needed and not any(e in equipment for e in needed):
            continue
        out.append(ex)
    return out
```

### Empty-result fallback

Each block guarantees ≥1 returned exercise. If `_filter_exercises` returns empty for the user's exact (experience × discipline × equipment) combination, the block falls back to:

1. Re-filter with `equipment=[]` semantics relaxed (treat all entries as if they were `equipment_needed=[]`). This handles the no-gear edge case — if a user with no equipment somehow has no universal exercises returned, drop the equipment filter.
2. If still empty, drop the discipline filter and retry. The user gets a generic exercise they can still benefit from.
3. If still empty (shouldn't happen with a well-stocked pool), return the first entry that matches `experience` only. Defensive — guarantees never returning empty.

Each block has a unit test that asserts this fallback chain produces ≥1 entry for every (experience × discipline × equipment) combination.

## Plumbing through `generate_plan` and `_pick_session`

[`generate_plan(profile, injury_flags, openai_client)`](src/coach.py#L646) extracts:

```python
discipline = profile.get("primary_discipline") or "bouldering"
equipment = profile.get("equipment", []) or []
```

`primary_discipline` defaults to `"bouldering"` if missing (most common climber category — matches existing behaviour where the system implicitly assumes a boulderer). `equipment` defaults to empty list — exercises that need specific gear are then filtered out, and the fallback chain ensures the plan still generates.

`_pick_session` signature extended:

```python
def _pick_session(
    goal: str, day: int, total_days: int,
    week: int, is_deload: bool,
    experience: str, finger_ok: bool, shoulder_ok: bool,
    injury_flags: list[str],
    discipline: str,            # NEW
    equipment: list[str],       # NEW
) -> tuple[str, list[dict]]:
```

Every `lambda: _hangboard_block(experience)` in the schedule dictionaries becomes `lambda: _hangboard_block(experience, discipline, equipment)`, and similarly for the other blocks. Same change in all four goal branches (`grade_progression`, `route_endurance`, `competition`, `injury_prevention`) and the `general` fallback.

## Library expansion

Target ~30 entries total (currently ~14). Every new entry must be common enough that a YouTube search returns useful results — this is a hard authoring constraint.

Per block, additions to draft:

**Hangboard** (existing 6 → target 10):
- Repeaters (7s on / 3s off × 6 reps): sport + trad bias, intermediate+
- 10s endurance hangs at 50–60% body weight: sport + trad bias, intermediate+
- Bodyweight dead hangs on 20mm: universal, beginner-only (max_experience: intermediate)
- Two-arm offset hangs: universal, intermediate+

**Power** (existing 4 → target 8):
- Dynamic moves on the wall (no campus required): universal, beginner+
- No-foot moves on overhang: sport + boulder + competition, intermediate+
- Frog hops / matched moves on the moonboard or system board: boulder + competition, intermediate+
- Reactive pull-ups (explosive): universal, intermediate+

**Strength** (existing 3 → target 6):
- High-rep pull-ups (3×15+): sport + trad bias, intermediate+
- Weighted lock-offs at 90° / 120°: boulder + competition, intermediate+
- Ring rows / inverted rows: universal, beginner+ (no equipment beyond a bar)
- Hanging leg raises: universal, intermediate+

**Endurance** (existing 3 → target 5):
- 6×4-min on routes (Boulder Power Endurance): boulder + competition, advanced+
- Climbing intervals (3 on / 3 off × 5): sport + trad, intermediate+

**Footwork** (existing 2 → target 4):
- Edging precision drill (toe placement on small holds): universal, beginner+
- Dual-tex drill (rotate between shoe rubber types): universal, intermediate+

**Mental** (existing 2 → target 5):
- Redpoint visualisation: sport + trad, intermediate+
- Gear-placement drill on toprope: trad-only, intermediate+
- Commitment dyno (controlled exposure to falling): boulder + competition, intermediate+

Every existing exercise also gets tagged. Highlights of the tagging decisions:

- **Max-weight pinch hangs** → `disciplines: ["bouldering", "competition"]`, `min_experience: "advanced"`. Stays in the library; never surfaces for sport/trad climbers or anyone below advanced. Sport climbers at the same level get repeaters instead.
- **Campus board 1-5-8** → `disciplines: ["bouldering", "competition"]`, `min_experience: "advanced"`, `equipment_needed: ["campus_board"]`.
- **Double dynos** → `disciplines: ["bouldering", "competition"]`, `min_experience: "intermediate"`, `equipment_needed: ["campus_board"]`.
- **One-arm lock-off hangs** → `disciplines: ["bouldering", "competition"]`, `min_experience: "elite"`, `equipment_needed: ["hangboard"]`.
- **4×4s** → universal `disciplines`, `equipment_needed: []` (works on any wall).
- **ARCing** → `disciplines: ["sport", "trad", "competition"]` (boulderers don't need it), `min_experience: "advanced"`.

## Testing

New test file `tests/test_coach.py`. The plan generator has no existing test coverage, so this is greenfield.

### Schema validation tests

```python
def test_every_exercise_has_required_tag_fields(self):
    """All entries across all pools must have disciplines + min_experience."""
```

Enumerate every pool used by every block and assert each entry has:
- `disciplines` (non-empty list of valid values)
- `min_experience` (one of `_EXPERIENCE_LEVELS`)
- `max_experience` either absent or a valid level
- `equipment_needed` either absent, empty, or a list of valid equipment values

### Coverage sweep

```python
def test_every_block_returns_nonempty_for_every_combination(self):
    """Sweep experience × discipline × equipment subsets. Each block must
    return ≥1 exercise. Guards against the fallback chain leaking."""
```

Iterate over:
- 4 experience levels
- 4 disciplines
- A representative subset of equipment lists: `[]`, `["hangboard"]`, `["gym_membership"]`, `["hangboard", "campus_board", "gym_membership"]`

For each (level, discipline, equipment) combination, call each block selector. Assert `len(result) >= 1`.

### Differentiation tests

```python
def test_boulderer_and_sport_climber_get_different_power_blocks(self):
    """Same experience + equipment, different discipline → different output."""
```

```python
def test_pinch_hangs_only_surface_for_boulder_or_competition_advanced_plus(self):
    """Anti-regression for the original user complaint."""
```

```python
def test_no_equipment_returns_no_equipment_required_exercises(self):
    """Equipment gating actually filters."""
```

### Regression test for generate_plan

```python
def test_generate_plan_runs_end_to_end_for_default_profile(self):
    """Smoke test that generate_plan still produces a valid plan structure
    given a default profile dict."""
```

Doesn't assert specific exercises — just that the plan dict has the expected shape (sessions list, each with `main` blocks of >0 exercises, each exercise with the canonical fields).

## Phasing

**Phase 1 — Schema + wiring + tag existing exercises** (this plan):

1. Add `_filter_exercises` helper
2. Tag every existing exercise with appropriate `disciplines` / `min_experience` / `equipment_needed`
3. Refactor 6 block selectors to the new signature
4. Plumb `discipline` + `equipment` through `generate_plan` → `_pick_session` → block calls
5. Add `tests/test_coach.py` with schema validation + coverage sweep + the differentiation tests above
6. **Ship and stop for user review.** At this point, existing exercises now correctly scope by discipline. Pinch hangs no longer surface for sport climbers. But the library is still small.

**Phase 2 — Library expansion** (follow-on plan):

Author the ~16 new exercises listed above in commit batches per block. Each commit: one block's new exercises, content only, no code changes. User reviews each batch.

**Phase 3 — Refinements** (later):

Weakness-driven emphasis, goal-grade intensity mapping. Each its own spec.

## Files touched

| File | Change |
|---|---|
| `src/coach.py` | Add `_filter_exercises` helper; refactor 6 block selectors; thread profile fields through `generate_plan` and `_pick_session`; tag existing exercises with `disciplines` / `min_experience` / `equipment_needed` |
| `tests/test_coach.py` | NEW — schema validation, coverage sweep, differentiation tests, generate_plan smoke test |

No frontend files. No database migrations.

## Open questions resolved

- **Personalise on what?** Discipline + equipment for Phase 1.
- **Where do tags live?** Inline on each exercise dict — same shape as the existing entries with new fields added.
- **What if filtering returns empty?** Three-level fallback chain (relax equipment → relax discipline → relax everything below experience). Each block guarantees ≥1 return.
- **Default discipline?** `"bouldering"` when profile is incomplete (matches existing implicit behaviour).
- **Where do new exercises come from?** I draft from common training-knowledge baseline, user reviews. Every entry must be YouTube-searchable.
- **Library expansion in this plan?** No — Phase 1 is structural only. Phase 2 adds content in reviewable batches.
- **Frontend changes?** None.
