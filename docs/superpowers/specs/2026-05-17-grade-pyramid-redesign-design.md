# Grade Pyramid Redesign — Design

## Context

The current `GradePyramidCard` is a functional but flat horizontal-stacked-bar chart per grade. It doesn't read as a trophy and doesn't reinforce the tier system that drives the rest of the app's visual language (Hub greeting, Progress hero, nav accent, etc.). Users want it to feel like a "look at what I've climbed" showcase on par with 8a.nu and the board-app communities (Kilter / Moonboard / Tension).

This redesign keeps the underlying data and API exactly as they are. It's a pure frontend reshape of the existing component, swapping the visual treatment to a tier-themed true pyramid with the hardest grade at the apex.

## Goals

1. **Showcase first.** The chart should feel like a trophy — screenshot-worthy, instantly readable as "this is how hard I've climbed."
2. **Visual continuity.** Each row's color comes from the tier the grade belongs to (V2 = Ember orange, V5 = Cove teal, V6 = Atlas blue, V7 = Vault violet, etc.). The user's working-tier glow already pervades Hub / Progress / Train — the pyramid now joins that family.
3. **Flashes get their moment.** Gold is the only non-tier color allowed on the bar and always means "flash."
4. **Projects don't dilute the trophy.** Projects exist (still counted) but live in a small footer chip so the bar stays celebratory.

## Visual design

Per column (`BOULDER` / `ROUTE`):

```
BOULDER                                hardest V6
                                       └── colored by V6's tier (Atlas blue)

   V7                                          — · +1 proj
                          ▓
   V6                  ████████                1
                       └── Atlas blue, glow halo
   V5             ▓▓▓▓████████████             6 · ✦3
                  └── gold flashes  └── Cove teal sends
   V4         ▓▓▓▓████████████████             5 · ✦2
   V3      ▓▓▓▓██████████████████████          7 · ✦3
   V2  ▓██████████████████████████████████     12 · ✦1

   ■ flash · tier color = grade tier
```

- Hardest grade at the apex (top, narrow), easiest at the base (bottom, wide). Rows are sorted by grade descending.
- Each bar lives in a full-width row container with `justify-content: center` so bars sit centered regardless of their width.
- Each bar is a single `rounded-md` element split into `[flash gold | send tier-color]`.
- Each bar carries a subtle outer halo: `box-shadow: 0 0 12px {TIER_TOKENS[tier].c}66`.
- Grade label color = same tier color as the bar.
- Row footer to the right: `{sends} · ✦{flashes}` in muted text. Projects appear as a small `+{N} proj` chip after the count, only if `projects > 0`.

### Color anchors

Already defined in `frontend/src/lib/tier.js` — no new tokens needed:

| Tier | id  | `c` (main bar color) |
|------|-----|----------------------|
| Frost   | v0  | `#e8e6dc` |
| Halo    | v1  | `#f7b03a` |
| Ember   | v2  | `#ff7a3d` |
| Bramble | v3  | `#c5e637` |
| Reef    | v4  | `#2dd4a5` |
| Cove    | v5  | `#14b8a6` |
| Atlas   | v6  | `#3aa1ff` |
| Vault   | v7  | `#5b5ff2` |
| Veil    | v8  | `#8466ff` |
| Vivid   | v9  | `#d946ef` |
| Phoenix | v10 (V10+) | `#fb7185` |

Flash gold: `#fbbf24` (the existing `accent3`).

### Animation

- Entry: rows fade in with `staggerChildren: 0.04`, `y: 6 → 0`. Matches existing motion grammar in `HubRingsCard` and `ProgressTrendGraph`.
- Bar fill: animated width on first paint and on time-window toggle (`duration: 0.22, ease: 'easeOut'`).
- Hover (pointer devices only): brighten the tier-color glow ~15%. No effect on touch.

## Architecture

Pure frontend. No new dependencies, no backend changes.

```
GET /api/training/pyramid?window=month|all          (unchanged)
        │
        ▼
{ window, boulder: { hardest_send, hardest_flash, grades: [{ grade, s, f, p }] },
           route:   { ... same shape ... } }
        │
        ▼
GradePyramidCard
  ├─ TimeWindowToggle (Month | All) — existing behavior
  ├─ PyramidColumn (label="Boulder", data={data.boulder})
  └─ PyramidColumn (label="Route",   data={data.route})

PyramidColumn
  ├─ ColumnHeader { label, hardest_send, hardest_flash }
  └─ For each grade (sorted hardest→easiest, descending):
       PyramidRow { grade, sends, flashes, projects, maxRowTotal }

PyramidRow
  ├─ grade label (colored by gradeToTier(grade))
  ├─ bar (centered, width = s / maxRowTotal × 100%)
  │    ├─ flash segment (gold,       proportion = f / s)
  │    └─ send segment  (tier color, proportion = (s - f) / s)
  ├─ count text ("6 · ✦3")
  └─ project chip ("+1 proj") — only when projects > 0

where:
  s = total sends at this grade (includes flashes per backend invariant)
  f = flashes at this grade  (f ≤ s)
  maxRowTotal = max(s) across the rows in this column, floor 1.

Projects (p) DO NOT contribute to bar width. They only render as the
footer chip so they don't dilute the trophy visual.
```

### Helpers

Use what's already there:

- `vGradeToTier(grade)` from `frontend/src/lib/tier.js` for V-grades.
- `ydsToTier(grade)` from `frontend/src/lib/tier.js` for route grades.
- `TIER_TOKENS[tierId].c` for the bar color and grade-label color.

Add a single tiny adapter:

```js
// Returns the TIER_TOKENS entry for any grade (V-grade or YDS), or the v0
// fallback when the grade isn't recognised. Used for bar color, label color,
// and glow halo.
function tokenForGrade(grade) {
  const tierId = vGradeToTier(grade) ?? ydsToTier(grade) ?? 'v0'
  return TIER_TOKENS[tierId]
}
```

### Data invariant

The backend's `s` field already includes flashes (`f <= s`). Bar segmentation must therefore split `s` into `flashes` (gold) and `s - flashes` (tier color) — never stack `f` on top of `s` or you double-count. The existing component already does this correctly; preserve the invariant.

## Edge cases

| State | Behavior |
|---|---|
| No climbs logged in window | Existing empty copy: "No climbs logged yet." per column. Same as today. |
| One climb at one grade | Single-row pyramid renders; bar at 100% width. Still recognisable as a (tiny) pyramid. |
| Grade with `p > 0`, `s == 0` (project only) | Row renders, bar is invisible (zero width), only the `+1 proj` chip shows. Grade label muted. |
| `hardest_send` null | Column header drops the "hardest Vn" stat entirely (avoid awkward "hardest —"). |
| V10+ grades (V11, V12…) | All collapse to `v10` tier (Phoenix coral). Existing `vGradeToTier` behavior. |
| YDS grades on Route | Bar uses `ydsToTier` mapping, same color system. |
| Time window toggle | Existing Month/All segmented control kept; bars animate width on switch. |

## Out of scope

- No new charts (trend graph stays as its own component).
- No per-attempt breakdown — backend rolls up per session.
- No tier-level grouping (we picked grade-level for showcase clarity over "Phoenix tier · 1 send" abstraction).
- No "active vs abandoned project" — data doesn't support it.
- No share / export image (could come later as a "save trophy as image" feature).

## Files to modify

- `frontend/src/components/GradePyramidCard.jsx` — rewrite. Split internal `PyramidColumn` + `PyramidRow` sub-components for readability.

No other files change. No new files added.

## Verification

### Manual

1. **Visual hierarchy.** Open Progress tab with a real log. Confirm hardest grade renders at the apex (top), easiest at the base. Bars centered.
2. **Tier color mapping.** Log climbs across V2, V4, V5, V6, V7. Each row's bar + grade label should match its tier's `c` color (orange / green / teal / blue / violet respectively).
3. **Flash gold.** A grade with flashes shows a gold portion on the left of its bar. Width proportional to flash count.
4. **Project chip.** Log a project-only at V8. Row renders with no bar, only the `+1 proj` chip. Log mixed sends + projects at V5: bar shows sends, chip shows `+N proj`.
5. **Empty.** New account / no logs: column shows "No climbs logged yet." copy.
6. **Toggle.** Switch Month ↔ All; bars animate width smoothly; `localStorage` persists choice across refresh.
7. **Route column.** Log a `5.12c` route send → row shows in route column with Cove teal (5.12c → v5).
8. **V10+ collapse.** Log a hypothetical V11 / V12 — they appear at the V10 tier color (Phoenix coral) and label.
9. **Hover/glow on desktop.** Pointer over a row brightens its glow. No effect on tap.
10. **No regressions on Hub.** `GradePyramidCard` is preloaded for Hub via `useHubData` — confirm Hub renders without errors after the rewrite.

### Build

- `npm run build` in `frontend/` — clean, no new warnings.

## Critical invariants

- `s` already includes flashes. Don't double-count. Send segment width must use `s - f`, not `s`.
- `frontend/src/lib/tier.js` is the only source of tier color truth. No inline hex except gold (`#fbbf24` for flash) and the muted project-chip token (`text-muted` / `bg-text/8`).
- Backend `GET /api/training/pyramid` and the response shape are unchanged.
- Existing `Month | All` segmented control + `localStorage` key (`ct_pyramid_window`) preserved.
