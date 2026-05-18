# Grade Pyramid Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `GradePyramidCard.jsx` as a tier-themed true pyramid (hardest grade at apex, easiest at base) where each row's bar is colored by the grade's tier from `TIER_TOKENS`, with gold reserved exclusively for highlighting flashes within the bar.

**Architecture:** Pure frontend rewrite. Single component file. Sub-components (`PyramidRow`, `PyramidColumn`) split out for readability. Tiny new `tokenForGrade` helper added to `frontend/src/lib/tier.js` to centralize the grade→tier color lookup. No backend changes, no new dependencies. Existing `getPyramid` API, response shape, and `Month | All` segmented control all preserved.

**Tech Stack:** React 18, Framer Motion (already in project), Tailwind utility classes + arbitrary values, existing `lucide-react` icons, existing tier token system at `frontend/src/lib/tier.js`.

**No frontend unit-test infrastructure exists** in this project — verification is `npm run build` (no warnings) plus a manual visual checklist after each task. The one pure-logic helper (`tokenForGrade`) is small enough to inspect by reading; don't introduce vitest/jest just for this work.

---

## File map

- **Modify**: `frontend/src/lib/tier.js` — add `tokenForGrade(grade)` adapter.
- **Modify** (effectively rewrite): `frontend/src/components/GradePyramidCard.jsx` — same export, new internals. Final file structure inside:
  - `tokenForGrade` is imported, not redefined.
  - `PyramidRow` — one row (grade label + bar + count + optional project chip).
  - `PyramidColumn` — column header + sorted rows.
  - `GradePyramidCard` (default export) — fetch + state + window toggle + two columns.

No other files change. No new files added.

---

## Task 1 — Add `tokenForGrade` helper

**Files:**
- Modify: `frontend/src/lib/tier.js`

- [ ] **Step 1: Add the helper at the bottom of the file**

Open `frontend/src/lib/tier.js` and append (after `nextTier`):

```js
/**
 * Resolve any climbing grade (V-grade or YDS) to its tier-token entry.
 * Falls back to v0 (Frost) for unrecognised inputs so callers can always
 * read `.c` / `.light` / `.deep` without guarding.
 */
export function tokenForGrade(grade) {
  const tierId = vGradeToTier(grade) ?? ydsToTier(grade) ?? 'v0'
  return TIER_TOKENS[tierId]
}
```

- [ ] **Step 2: Verify the helper compiles**

Run from repo root:
```bash
cd frontend && npm run build 2>&1 | tail -8
```
Expected: `✓ built in <time>` with no new warnings.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/tier.js
git commit -m "feat(tier): add tokenForGrade adapter (V-grade + YDS → TIER_TOKENS entry)"
```

---

## Task 2 — Implement `PyramidRow` sub-component

**Files:**
- Modify: `frontend/src/components/GradePyramidCard.jsx` (replace the existing inline `PyramidColumn`'s row markup with a dedicated component first)

This task introduces `PyramidRow` but does not yet wire it into the rewritten card — that comes in Task 4. Working in small steps keeps each commit reviewable.

- [ ] **Step 1: Open the file**

Read `frontend/src/components/GradePyramidCard.jsx`. Identify the existing `PyramidColumn` function — it'll be replaced wholesale in Task 3.

- [ ] **Step 2: Add the `PyramidRow` component above the existing `PyramidColumn`**

Insert this new function between the imports block and the existing `PyramidColumn`:

```jsx
/**
 * One row in the pyramid: tier-colored bar + grade label + count.
 *
 * Bar segmentation:
 *   - flash portion (gold)        — width = (f / s) of the bar
 *   - send  portion (tier color)  — width = ((s - f) / s) of the bar
 * The bar's overall width is `(s / maxRowTotal) * 100%`. Projects (p) do NOT
 * contribute to bar width — they only render as the footer chip.
 */
function PyramidRow({ grade, s, f, p, maxRowTotal }) {
  const token = tokenForGrade(grade)
  const total = Math.max(0, s)
  const flashPct = total > 0 ? (f / total) * 100 : 0
  const sendPct  = total > 0 ? ((total - f) / total) * 100 : 0
  const barPct   = maxRowTotal > 0 ? (total / maxRowTotal) * 100 : 0
  const hasBar   = barPct > 0
  return (
    <div className="flex items-center gap-2.5 my-1">
      <span
        className="w-9 text-[12px] font-extrabold text-right tabular-nums tracking-tight"
        style={{ color: hasBar ? token.c : 'rgba(232,238,252,0.45)' }}
      >
        {grade}
      </span>
      <div className="flex-1 flex justify-center">
        {hasBar && (
          <div
            className="h-[18px] rounded-[5px] flex overflow-hidden"
            style={{
              width: `${barPct}%`,
              boxShadow: `0 0 12px ${token.c}66`,
            }}
          >
            {f > 0 && (
              <span
                className="h-full"
                style={{ width: `${flashPct}%`, background: '#fbbf24' }}
                aria-label={`${f} flash${f === 1 ? '' : 'es'}`}
              />
            )}
            <span
              className="h-full"
              style={{ width: `${sendPct}%`, background: token.c }}
              aria-label={`${total - f} send${total - f === 1 ? '' : 's'}`}
            />
          </div>
        )}
      </div>
      <span className="text-[11px] text-muted tabular-nums whitespace-nowrap min-w-[64px] text-left">
        {hasBar ? (
          <>
            {total}
            {f > 0 && <span className="text-accent3"> · ✦{f}</span>}
          </>
        ) : (
          <span className="text-muted/60">—</span>
        )}
        {p > 0 && (
          <span className="ml-1.5 inline-flex items-center text-[10px] text-muted/80 bg-white/[0.06] border border-white/10 px-1.5 py-[1px] rounded-full">
            +{p} proj
          </span>
        )}
      </span>
    </div>
  )
}
```

- [ ] **Step 3: Add the `tokenForGrade` import**

At the top of `frontend/src/components/GradePyramidCard.jsx`, replace:

```js
import { getPyramid } from '../api'
```

with:

```js
import { getPyramid } from '../api'
import { tokenForGrade } from '../lib/tier'
```

- [ ] **Step 4: Verify build still passes**

```bash
cd frontend && npm run build 2>&1 | tail -6
```
Expected: clean build, no warnings. `PyramidRow` is unused at this point — that's fine; Vite tree-shakes unused exports without complaining.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/GradePyramidCard.jsx
git commit -m "feat(progress): add PyramidRow component (tier-colored bar + flash gold)"
```

---

## Task 3 — Implement `PyramidColumn` sub-component

**Files:**
- Modify: `frontend/src/components/GradePyramidCard.jsx`

- [ ] **Step 1: Replace the existing `PyramidColumn` function entirely**

Delete the existing `function PyramidColumn({ label, data }) { ... }` block. Insert in its place:

```jsx
/**
 * One discipline's pyramid (boulder OR route). Sorts grades hardest→easiest
 * so the hardest sits at the apex of the visible pyramid. The header line
 * doubles as the legend: "hardest V6" with V6 painted its own tier color.
 */
function PyramidColumn({ label, data }) {
  if (!data || (!data.grades?.length && !data.hardest_send && !data.hardest_flash)) {
    return (
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-muted mb-2">
          {label}
        </p>
        <p className="text-xs text-muted/70 italic">No climbs logged yet.</p>
      </div>
    )
  }

  // Sort hardest first. grade_order from the backend is implicit in the
  // returned order (ascending V0→V10+, 5.6→5.15d). Reverse to put hardest
  // at the top of the rendered pyramid.
  const rowsTopDown = [...data.grades].reverse()

  // Bar width is normalised against the largest send-count in the column.
  // Projects (`p`) intentionally do not contribute — the bar represents
  // completed climbs only.
  const maxRowTotal = Math.max(1, ...data.grades.map((g) => g.s))

  const hardestSendToken  = data.hardest_send  ? tokenForGrade(data.hardest_send)  : null
  const hardestFlashToken = data.hardest_flash ? tokenForGrade(data.hardest_flash) : null

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-muted">
          {label}
        </p>
        <p className="text-[11px] text-muted">
          {data.hardest_send && (
            <>
              hardest{' '}
              <span className="font-extrabold" style={{ color: hardestSendToken?.c }}>
                {data.hardest_send}
              </span>
            </>
          )}
          {data.hardest_send && data.hardest_flash && data.hardest_flash !== data.hardest_send && (
            <>
              <span className="text-muted/40"> · </span>
              flash{' '}
              <span className="font-extrabold" style={{ color: hardestFlashToken?.c }}>
                {data.hardest_flash}
              </span>
            </>
          )}
        </p>
      </div>
      <div>
        {rowsTopDown.map((g) => (
          <PyramidRow
            key={g.grade}
            grade={g.grade}
            s={g.s}
            f={g.f}
            p={g.p}
            maxRowTotal={maxRowTotal}
          />
        ))}
      </div>
      <p className="text-[10px] text-muted/60 mt-3 pt-2 border-t border-white/[0.06]">
        <span className="inline-block w-2 h-2 bg-accent3 rounded-sm mr-1.5 align-middle" />
        flash · row color reflects grade tier
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Verify build still passes**

```bash
cd frontend && npm run build 2>&1 | tail -6
```
Expected: clean build. The default-exported `GradePyramidCard` still consumes `PyramidColumn` with the same `{ label, data }` interface, so nothing downstream breaks.

- [ ] **Step 3: Run the dev server and visually verify**

```bash
cd frontend && npm run dev
```

In the browser at the Progress tab, confirm:
- Bars now appear in tier colors (V5 row in teal, V2 row in orange, etc.) instead of all-accent
- Hardest grade sits at the TOP of each column (apex)
- "hardest V6" in the header is painted with V6's tier color
- Projects show as a `+N proj` chip after the count; the bar itself never contains a project segment
- A column with no climbs still shows the "No climbs logged yet." copy

Stop the dev server (Ctrl+C) when done verifying.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/GradePyramidCard.jsx
git commit -m "feat(progress): tier-colored true pyramid — hardest at apex, flash gold"
```

---

## Task 4 — Add entry animation (stagger fade-up)

**Files:**
- Modify: `frontend/src/components/GradePyramidCard.jsx`

- [ ] **Step 1: Add the framer-motion import**

At the top of `frontend/src/components/GradePyramidCard.jsx`, add to the existing imports:

```js
import { motion } from 'framer-motion'
```

(If `framer-motion` is already imported in the file, skip this step — it ships with the project.)

- [ ] **Step 2: Wrap `PyramidRow`'s outer `<div>` with `motion.div`**

In the `PyramidRow` function from Task 2, change the outer return wrapper:

```jsx
// Was:
<div className="flex items-center gap-2.5 my-1">

// To:
<motion.div
  className="flex items-center gap-2.5 my-1"
  initial={{ opacity: 0, y: 6 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
>
```

And close it with `</motion.div>` instead of `</div>`.

- [ ] **Step 3: Animate the bar fill on first paint and window toggle**

Inside `PyramidRow`'s bar block, change:

```jsx
<div
  className="h-[18px] rounded-[5px] flex overflow-hidden"
  style={{
    width: `${barPct}%`,
    boxShadow: `0 0 12px ${token.c}66`,
  }}
>
```

to:

```jsx
<motion.div
  className="h-[18px] rounded-[5px] flex overflow-hidden"
  style={{ boxShadow: `0 0 12px ${token.c}66` }}
  initial={{ width: 0 }}
  animate={{ width: `${barPct}%` }}
  transition={{ duration: 0.32, ease: 'easeOut' }}
>
```

And close it with `</motion.div>` instead of `</div>`.

- [ ] **Step 4: Stagger across rows in `PyramidColumn`**

In the `PyramidColumn` function from Task 3, change the rows container:

```jsx
// Was:
<div>
  {rowsTopDown.map((g) => (
    <PyramidRow ... />
  ))}
</div>

// To:
<motion.div
  initial="hidden"
  animate="visible"
  variants={{
    hidden:  { opacity: 1 },
    visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
  }}
>
  {rowsTopDown.map((g) => (
    <PyramidRow
      key={g.grade}
      grade={g.grade}
      s={g.s}
      f={g.f}
      p={g.p}
      maxRowTotal={maxRowTotal}
    />
  ))}
</motion.div>
```

The stagger works because each `PyramidRow` is a `motion.div` (from Step 2) — when wrapped in a parent variants container, children with their own initial/animate run on the parent's stagger schedule.

To make stagger work, change `PyramidRow`'s wrapper from explicit `initial`/`animate` props to consuming the parent's variants:

```jsx
// Inside PyramidRow, change:
<motion.div
  className="flex items-center gap-2.5 my-1"
  initial={{ opacity: 0, y: 6 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
>

// To:
<motion.div
  className="flex items-center gap-2.5 my-1"
  variants={{
    hidden:  { opacity: 0, y: 6 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.2, 0.7, 0.2, 1] } },
  }}
>
```

- [ ] **Step 5: Verify build + visual smoke test**

```bash
cd frontend && npm run build 2>&1 | tail -6
```
Expected: clean build.

Then `npm run dev` and confirm in browser:
- Rows fade in from below with a slight stagger when the Progress tab mounts.
- Toggling Month ↔ All animates the bar widths smoothly (not a hard cut).
- `prefers-reduced-motion` (system Accessibility setting) makes the motions effectively instant — Framer Motion's defaults handle this automatically.

Stop the dev server when done.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/GradePyramidCard.jsx
git commit -m "feat(progress): stagger entry + bar-width animation on grade pyramid"
```

---

## Task 5 — Final visual verification

This task has no code changes — it's the manual checklist the spec calls for. If any item fails, that's a bug to fix before declaring the work done.

**Files:** none modified.

- [ ] **Step 1: Run dev server**

```bash
cd frontend && npm run dev
```

- [ ] **Step 2: Walk the verification checklist**

Open the app, navigate to the Progress tab, and confirm each:

1. **Visual hierarchy.** Hardest grade renders at the TOP of each column. Easiest at the bottom (widest bar).
2. **Tier color mapping.** Log a session containing V2 + V4 + V5 + V6 + V7 sends. Each row's bar AND its grade label should match its tier's `c`:
   - V2 → Ember orange `#ff7a3d`
   - V4 → Reef green `#2dd4a5`
   - V5 → Cove teal `#14b8a6`
   - V6 → Atlas blue `#3aa1ff`
   - V7 → Vault violet `#5b5ff2`
3. **Flash gold.** Any grade with `f > 0` shows a gold portion on the LEFT of its bar. The "✦N" suffix in the row count is gold.
4. **Project chip.** A grade with `p > 0` and `s == 0` (project only) renders with no bar segment; only the `+1 proj` chip appears. A grade with mixed sends + projects shows the bar AND the chip.
5. **Empty state.** With no climbs in the window, each column shows "No climbs logged yet." (unchanged behaviour).
6. **Time window toggle.** Switching Month ↔ All animates bar widths smoothly. Persist the choice in `localStorage` across a refresh (`ct_pyramid_window` key — existing behaviour preserved).
7. **Route column.** A logged `5.12c` route appears in the route column with V5/Cove teal (5.12c → v5 via existing `ydsToTier`).
8. **V10+ collapse.** A V11 grade appears with Phoenix coral (`#fb7185`) — tier collapses at v10.
9. **Hardest header.** "hardest V6" in the column header is painted with V6's tier color. If `hardest_send` is null, the entire stat is omitted (no awkward "hardest —").
10. **No Hub regressions.** Navigate to Hub. It still renders without errors — `GradePyramidCard` is preloaded via `useHubData` but only mounts on Progress.

- [ ] **Step 3: Stop the dev server (Ctrl+C)**

- [ ] **Step 4: If everything looks right, no commit needed.** If any visual issue surfaced, fix it inline and commit the fix with a message starting `fix(progress): ...`.

---

## Self-review checklist (done by plan author, kept here for execution-time sanity)

- ✅ Spec section "Goals" covered by Tasks 3 (true pyramid, hardest-at-apex) and 4 (motion polish).
- ✅ Spec section "Visual design" covered by Tasks 2 (bar markup, gold-on-left, footer chip) and 3 (column header + legend).
- ✅ Spec section "Color anchors" — Task 1 ships `tokenForGrade` which centralises the lookup; no hardcoded hex elsewhere except the flash gold `#fbbf24` (spec explicitly allows this).
- ✅ Spec section "Animation" covered by Task 4.
- ✅ Spec section "Edge cases" — every row in the table is in Task 5's checklist.
- ✅ Spec invariant "s already includes flashes; don't double-count" — Task 2 splits `f` (gold) and `s - f` (tier color), and explicit comment notes this.
- ✅ Spec invariant "Projects never on the bar" — Task 2 PyramidRow comment + Task 3 PyramidColumn `maxRowTotal` calc both reflect this.
- ✅ No backend or API changes.
- ✅ No new dependencies.

---

## Critical reminders

- **Flash gold is the only non-tier color allowed on the bar.** Don't reintroduce coral / muted-gray fills for projects — they live in the footer chip only.
- **`f <= s` is a backend invariant**, don't double-count. Bar segments use `f` and `s - f`, never `s + f`.
- **Don't touch the existing `getPyramid` API or its response shape.** The redesign is frontend-only.
- **`tokenForGrade` is the single source of grade→color truth** after Task 1. Don't introduce another mapping inline.
