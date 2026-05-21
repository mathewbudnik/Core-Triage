# RPG Climber — Phase 3: Progress redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin the Progress tab and its constituent panels to the RPG outdoor aesthetic established in Phases 0–2. Behavior and data layers stay intact. Add a new **`<StatTrends7Day>`** panel that reads from the reward engine's `state.sends` and shows per-day XP momentum — the first piece of Progress UI that surfaces engine-derived data instead of backend-derived data.

**Architecture:** Each existing panel (`ProgressTierHero`, `GradePyramidCard`, `AwardsStrip`, `ProgressTrendGraph`, `StyleMixSheet`) gets wrapped in the `<Surface>` primitive and refreshed with the `ct-*` typography/color tokens shipped in Phase 0. The new `<StatTrends7Day>` lives at `components/progress/StatTrends7Day.jsx` and consumes `useRewardEngine().state.sends`, bucketed by local-day. `ProgressTab.jsx` becomes a thin shell that composes these panels in a single max-w container — current order preserved, with `<StatTrends7Day>` inserted between the AwardsStrip and the 8-week ProgressTrendGraph so short-term and long-term momentum read side-by-side.

**Tech Stack:** React 18, Vite, Tailwind 3.4, Framer Motion 11, Vitest. No new deps.

---

## File structure

### New

- `frontend/src/components/progress/StatTrends7Day.jsx` — 7-day per-day XP bar chart driven by `useRewardEngine().state.sends`.
- `frontend/src/lib/sendBuckets.js` — pure helper: groups a sends array into per-day buckets with totals and the dominant style axis per day.
- `frontend/src/lib/sendBuckets.test.js` — unit tests for the bucketing math.

### Modified

- `frontend/src/components/ProgressTab.jsx` — restructure header + layout, swap ad-hoc panels for `<Surface>` wrappers, insert `<StatTrends7Day>`, refresh the Log-a-session CTA.
- `frontend/src/components/ProgressTierHero.jsx` — same behavior, refreshed chrome via `<Surface tier="hero">` + `ct-*` typography; tier-c CSS vars stay (drives the glow).
- `frontend/src/components/GradePyramidCard.jsx` — chrome only: wrap in `<Surface>`, refresh header `<Eyebrow>`, keep all pyramid math and animation intact.
- `frontend/src/components/AwardsStrip.jsx` — chrome only: wrap in `<Surface>`, refresh header `<Eyebrow>`, keep tile carousel intact.
- `frontend/src/components/ProgressTrendGraph.jsx` — chrome only: wrap in `<Surface>`, refresh header `<Eyebrow>`, rename internal header copy to "Last 8 weeks · climbing volume" so it reads as the long-window companion to the new 7-day panel.
- `frontend/src/components/StyleMixSheet.jsx` — chrome refresh (use `ct-*` tokens), no behavior changes; the data already iterates `STYLE_ORDER` so the Phase 2 5-chip migration carries through.

### Deleted

- Nothing in Phase 3.

---

## Task 1: `lib/sendBuckets.js` — per-day grouping helper

**Why first:** `<StatTrends7Day>` needs a pure function it can test independently. Bucketing logic doesn't depend on any React or engine specifics — just an array of `{ ts, gradeNum, stylePrimary, xpEarned? }` records.

**Files:**
- Create: `frontend/src/lib/sendBuckets.js`
- Create: `frontend/src/lib/sendBuckets.test.js`

- [ ] **Step 1: Write the failing test**

```js
// frontend/src/lib/sendBuckets.test.js
import { describe, it, expect } from 'vitest'
import { bucketSendsByDay, lastNDays } from './sendBuckets.js'

const day = (iso, hour = 12) => new Date(`${iso}T${String(hour).padStart(2,'0')}:00:00`).getTime()

describe('lastNDays', () => {
  it('returns N consecutive ISO date strings ending at today', () => {
    const today = new Date('2026-05-20T12:00:00')
    const days = lastNDays(7, today)
    expect(days).toHaveLength(7)
    expect(days[6]).toBe('2026-05-20')
    expect(days[0]).toBe('2026-05-14')
  })
})

describe('bucketSendsByDay', () => {
  it('returns N buckets even when there are no sends', () => {
    const today = new Date('2026-05-20T12:00:00')
    const buckets = bucketSendsByDay([], 7, today)
    expect(buckets).toHaveLength(7)
    expect(buckets.every(b => b.totalXP === 0 && b.sends.length === 0)).toBe(true)
  })

  it('groups sends by their local-day timestamp', () => {
    const today = new Date('2026-05-20T12:00:00')
    const sends = [
      { ts: day('2026-05-20', 9),  stylePrimary: 'powerful', xpEarned: 100 },
      { ts: day('2026-05-20', 15), stylePrimary: 'crimpy',   xpEarned: 50 },
      { ts: day('2026-05-18', 18), stylePrimary: 'powerful', xpEarned: 200 },
    ]
    const buckets = bucketSendsByDay(sends, 7, today)
    const may20 = buckets.find(b => b.date === '2026-05-20')
    const may18 = buckets.find(b => b.date === '2026-05-18')
    expect(may20.totalXP).toBe(150)
    expect(may20.sends).toHaveLength(2)
    expect(may18.totalXP).toBe(200)
  })

  it('tags each bucket with its dominant style axis (most XP earned)', () => {
    const today = new Date('2026-05-20T12:00:00')
    const sends = [
      { ts: day('2026-05-20'), stylePrimary: 'powerful', xpEarned: 50 },
      { ts: day('2026-05-20'), stylePrimary: 'crimpy',   xpEarned: 200 },
      { ts: day('2026-05-20'), stylePrimary: 'mobility', xpEarned: 30 },
    ]
    const buckets = bucketSendsByDay(sends, 7, today)
    const may20 = buckets.find(b => b.date === '2026-05-20')
    expect(may20.dominantStyle).toBe('crimpy')
  })

  it('drops sends older than the window', () => {
    const today = new Date('2026-05-20T12:00:00')
    const sends = [
      { ts: day('2026-05-10'), stylePrimary: 'powerful', xpEarned: 999 },
      { ts: day('2026-05-19'), stylePrimary: 'powerful', xpEarned: 50 },
    ]
    const buckets = bucketSendsByDay(sends, 7, today)
    const totalInWindow = buckets.reduce((s, b) => s + b.totalXP, 0)
    expect(totalInWindow).toBe(50)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npm test -- --run sendBuckets`
Expected: FAIL with "Cannot find module './sendBuckets.js'"

- [ ] **Step 3: Implement**

```js
// frontend/src/lib/sendBuckets.js

function toLocalDateString(ts) {
  const d = new Date(ts)
  const y  = d.getFullYear()
  const m  = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export function lastNDays(n, now = new Date()) {
  const result = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    result.push(toLocalDateString(d))
  }
  return result
}

export function bucketSendsByDay(sends, n, now = new Date()) {
  const days = lastNDays(n, now)
  const byDate = Object.fromEntries(days.map((d) => [d, { date: d, sends: [], totalXP: 0, dominantStyle: null }]))
  for (const s of sends || []) {
    if (!s || typeof s.ts !== 'number') continue
    const d = toLocalDateString(s.ts)
    const bucket = byDate[d]
    if (!bucket) continue
    bucket.sends.push(s)
    bucket.totalXP += s.xpEarned || 0
  }
  for (const bucket of Object.values(byDate)) {
    if (bucket.sends.length === 0) continue
    const byStyle = {}
    for (const s of bucket.sends) {
      const key = s.stylePrimary
      if (!key) continue
      byStyle[key] = (byStyle[key] || 0) + (s.xpEarned || 0)
    }
    let bestKey = null
    let bestXP  = -1
    for (const [k, v] of Object.entries(byStyle)) {
      if (v > bestXP) { bestXP = v; bestKey = k }
    }
    bucket.dominantStyle = bestKey
  }
  return days.map((d) => byDate[d])
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test -- --run sendBuckets`
Expected: 5/5 PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/sendBuckets.js frontend/src/lib/sendBuckets.test.js
git commit -m "feat(progress): sendBuckets — per-day grouping for stat trends"
```

---

## Task 2: Persist `xpEarned` on each send so trends can read it

**Why:** `bucketSendsByDay` sums `s.xpEarned`. Today's `rewardEngine.addSend` returns the events `{ xpEarned, leveledUp, ... }` but the send record pushed onto `state.sends` does NOT store the XP value — only `{ ts, grade, gradeNum, stylePrimary, modality, outcome, isDeepLog, isPersonalRecord }`. We need to add `xpEarned` to the persisted record so the 7-day panel can read it back without re-running the formula.

This is a tiny additive change. It does NOT modify the formula or any other engine semantics.

**Files:**
- Modify: `frontend/src/lib/rewardEngine.js`

- [ ] **Step 1: Add `xpEarned` to the `sendRecord` object**

Find the `sendRecord` construction in `addSend` (around line 125–135). Add an `xpEarned` field set to the computed value:

```js
const sendRecord = {
  ts: send.ts ?? Date.now(),
  grade: send.grade,
  gradeNum,
  stylePrimary: send.stylePrimary,
  modality: send.modality,
  outcome: send.outcome,
  isDeepLog: !!send.isDeepLog,
  isPersonalRecord,
  xpEarned,
}
```

- [ ] **Step 2: Run the test suite**

Run: `cd frontend && npm test -- --run`
Expected: still 75/75 pass (the existing engine tests don't assert on this field; we're only adding it).

If a test fails because it deep-equals a sendRecord shape, update that test to include `xpEarned`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/rewardEngine.js
git commit -m "feat(engine): persist xpEarned on send records for stat trends"
```

---

## Task 3: `<StatTrends7Day>` — the new short-window panel

**Why:** Spec §16 calls for a new "Stat trends · 7 day" panel on Progress. This is the first Progress component that surfaces reward-engine data instead of backend data, so it shows a different angle than the existing 8-week grade-volume chart.

**Files:**
- Create: `frontend/src/components/progress/StatTrends7Day.jsx`

- [ ] **Step 1: Implement**

```jsx
// frontend/src/components/progress/StatTrends7Day.jsx
import { useMemo } from 'react'
import Surface from '../ui/Surface'
import Eyebrow from '../ui/Eyebrow'
import { useRewardEngine } from '../../lib/rewardEngine'
import { bucketSendsByDay } from '../../lib/sendBuckets'
import { STYLE_COLOR } from '../../lib/styleColors'

const NEUTRAL_BAR = 'rgba(255,255,255,0.10)'
const DAY_LABEL = ['S','M','T','W','T','F','S']

export default function StatTrends7Day() {
  const { state } = useRewardEngine()
  const { buckets, totalXP, dominantStyle } = useMemo(() => {
    const b = bucketSendsByDay(state?.sends || [], 7)
    let total = 0
    const byStyle = {}
    for (const bucket of b) {
      total += bucket.totalXP
      if (bucket.dominantStyle) {
        byStyle[bucket.dominantStyle] = (byStyle[bucket.dominantStyle] || 0) + bucket.totalXP
      }
    }
    let topStyle = null
    let topXP = -1
    for (const [k, v] of Object.entries(byStyle)) {
      if (v > topXP) { topXP = v; topStyle = k }
    }
    return { buckets: b, totalXP: total, dominantStyle: topStyle }
  }, [state?.sends])

  const maxXP = Math.max(1, ...buckets.map((b) => b.totalXP))

  return (
    <Surface tier="default" padding="md" rounded="rounded-2xl">
      <div className="flex items-baseline justify-between mb-3">
        <Eyebrow>Stat trends · 7 day</Eyebrow>
        <p className="ct-tnum text-sm font-bold text-ct-cream">
          +{totalXP.toLocaleString()} XP
        </p>
      </div>
      <div className="flex items-end gap-1.5 h-[64px]">
        {buckets.map((b, i) => {
          const heightPct = b.totalXP > 0 ? Math.max(6, (b.totalXP / maxXP) * 100) : 4
          const color = b.dominantStyle ? STYLE_COLOR[b.dominantStyle]?.c : NEUTRAL_BAR
          const today = new Date(b.date + 'T00:00:00')
          const dayLabel = DAY_LABEL[today.getDay()]
          return (
            <div key={b.date} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-md transition-colors"
                style={{
                  height: `${heightPct}%`,
                  background: color,
                  opacity: b.totalXP > 0 ? 1 : 0.25,
                }}
                aria-label={`${b.date}: ${b.totalXP} XP`}
              />
              <span className="text-[9px] text-ct-cream/50 font-bold uppercase">{dayLabel}</span>
            </div>
          )
        })}
      </div>
      <p className="ct-meta mt-2">
        {totalXP > 0
          ? `Top axis this week · ${capitalize(dominantStyle || 'mixed')}`
          : 'No sends in the last 7 days.'}
      </p>
    </Surface>
  )
}

function capitalize(s) {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}
```

- [ ] **Step 2: Verify `<Eyebrow>` exists**

Run: `grep -l "export default" frontend/src/components/ui/Eyebrow.jsx`
Expected: file exists. If `<Eyebrow>` doesn't take a `children` prop, look at its actual signature and adjust the usage.

- [ ] **Step 3: Smoke render in `/design-system`**

Add a `<StatTrends7Day />` block to `frontend/src/components/DesignSystem.jsx`. Confirm build is clean.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/progress/StatTrends7Day.jsx frontend/src/components/DesignSystem.jsx
git commit -m "feat(progress): StatTrends7Day — per-day XP bars from reward engine"
```

---

## Task 4: `ProgressTierHero` re-skin

**Files:**
- Modify: `frontend/src/components/ProgressTierHero.jsx`

- [ ] **Step 1: Wrap the outer button in `<Surface tier="hero">`**

Replace the existing outer `<button className="relative rounded-2xl p-4 overflow-hidden w-full text-left ..." style={{ background: 'linear-gradient(...)', ... }}>` with:

```jsx
<Surface
  as="button"
  tier="hero"
  padding="md"
  rounded="rounded-2xl"
  type="button"
  onClick={() => navigate('/progress/awards')}
  aria-label="View all tiers and achievements"
  className="w-full text-left transition-transform hover:scale-[1.005] active:scale-[0.995]"
  style={{
    background: 'linear-gradient(135deg, color-mix(in srgb, var(--tier-c) 22%, transparent), color-mix(in srgb, var(--tier-c) 6%, transparent))',
    borderColor: 'color-mix(in srgb, var(--tier-c) 45%, transparent)',
    boxShadow: 'inset 0 0 32px color-mix(in srgb, var(--tier-c) 18%, transparent)',
  }}
>
```

(Note: `<Surface>` already applies `relative overflow-hidden`; the existing `<DiamondShimmer>` + child content stays the same.)

- [ ] **Step 2: Replace the inline "Current tier" eyebrow with `<Eyebrow>`**

Find:
```jsx
<div className="text-[11px] font-bold uppercase tracking-[0.08em]"
     style={{ color: 'var(--tier-light)' }}>
  Current tier
</div>
```

Replace with:
```jsx
<p className="ct-eyebrow" style={{ color: 'var(--tier-light)' }}>Current tier</p>
```

(Using the raw `ct-eyebrow` class here — `<Eyebrow>` doesn't forward inline `style` and we need the tier-light color override. Keep this single `<p>` rather than extending the primitive's API for one consumer.)

Add the import: `import Surface from './ui/Surface'`.

- [ ] **Step 3: Build check**

Run: `cd frontend && npm run build`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ProgressTierHero.jsx
git commit -m "feat(progress): ProgressTierHero wraps Surface + Eyebrow primitives"
```

---

## Task 5: `GradePyramidCard` chrome re-skin (data untouched)

**Files:**
- Modify: `frontend/src/components/GradePyramidCard.jsx`

- [ ] **Step 1: Find the outer container**

The component renders the pyramid inside a top-level `<div className="rounded-2xl p-4" style={{ background: 'rgba(0,0,0,0.35)', border: '0.5px solid rgba(255,255,255,0.1)' }}>` (or similar). Locate it.

- [ ] **Step 2: Replace with `<Surface>`**

```jsx
<Surface tier="default" padding="md" rounded="rounded-2xl">
  {/* existing children unchanged */}
</Surface>
```

Add `import Surface from './ui/Surface'` at the top.

- [ ] **Step 3: Replace any "Grade pyramid" header text wrapper with `<Eyebrow>`**

If the card has a header like `<div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">Grade pyramid</div>`, swap it for `<Eyebrow>Grade pyramid</Eyebrow>`. Import Eyebrow.

- [ ] **Step 4: Do NOT touch the PyramidRow component, the bar math, or the data-fetch logic.**

All Framer Motion animations, `tokenForGrade()` calls, and bar percentage math are preserved as-is.

- [ ] **Step 5: Run tests + build**

Run: `cd frontend && npm test -- --run && npm run build`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/GradePyramidCard.jsx
git commit -m "feat(progress): GradePyramidCard wraps Surface + Eyebrow primitives"
```

---

## Task 6: `AwardsStrip` chrome re-skin

**Files:**
- Modify: `frontend/src/components/AwardsStrip.jsx`

- [ ] **Step 1: Replace outer container with `<Surface>` + `<Eyebrow>`**

Find:
```jsx
<div className="rounded-2xl p-4"
     style={{ background: 'rgba(0,0,0,0.35)', border: '0.5px solid rgba(255,255,255,0.1)' }}>
  <div className="flex items-center justify-between mb-3">
    <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
      Awards
    </div>
```

Replace with:
```jsx
<Surface tier="default" padding="md" rounded="rounded-2xl">
  <div className="flex items-center justify-between mb-3">
    <Eyebrow>Awards</Eyebrow>
```

Add imports for `Surface` and `Eyebrow` from `./ui/`.

- [ ] **Step 2: Close the wrapper correctly**

Make sure the final `</div>` (the outer one) becomes `</Surface>`.

- [ ] **Step 3: Run tests + build**

Run: `cd frontend && npm test -- --run && npm run build`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/AwardsStrip.jsx
git commit -m "feat(progress): AwardsStrip wraps Surface + Eyebrow primitives"
```

---

## Task 7: `ProgressTrendGraph` chrome re-skin

**Files:**
- Modify: `frontend/src/components/ProgressTrendGraph.jsx`

- [ ] **Step 1: Replace outer container with `<Surface>` + `<Eyebrow>`**

Find:
```jsx
<div className="rounded-2xl p-4"
     style={{ background: 'rgba(0,0,0,0.35)', border: '0.5px solid rgba(255,255,255,0.1)' }}>
  <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted mb-2">
    Last 8 weeks
  </div>
```

Replace with:
```jsx
<Surface tier="default" padding="md" rounded="rounded-2xl">
  <Eyebrow className="mb-2">Last 8 weeks · climbing volume</Eyebrow>
```

Add imports. Close the wrapper as `</Surface>`.

- [ ] **Step 2: Run tests + build**

Run: `cd frontend && npm test -- --run && npm run build`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ProgressTrendGraph.jsx
git commit -m "feat(progress): ProgressTrendGraph wraps Surface + Eyebrow primitives"
```

---

## Task 8: `StyleMixSheet` chrome refresh (no behavior changes)

**Files:**
- Modify: `frontend/src/components/StyleMixSheet.jsx`

- [ ] **Step 1: Update the eyebrow + heading typography**

Find:
```jsx
<p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-[var(--tier-light)]">
  Style mix
</p>
<h3 className="text-[19px] font-extrabold -tracking-[0.02em] mt-0.5">
  Last 30 days
</h3>
```

Replace with:
```jsx
<p className="ct-eyebrow" style={{ color: 'var(--tier-light)' }}>Style mix</p>
<h3 className="ct-display mt-0.5">Last 30 days</h3>
```

(Using the raw `ct-eyebrow` class here for the same reason as Task 4 — tier-light color override.)

- [ ] **Step 2: Refresh the per-row list-item background**

Find:
```jsx
className="flex items-center justify-between gap-3 px-3.5 py-3
           rounded-2xl bg-black/35 backdrop-blur-md
           border-[0.5px] border-white/[0.10]"
```

Replace the background/border with `<Surface tier="flat">` semantics — wrap each `<li>` in `<Surface as="li" tier="flat" padding="sm" rounded="rounded-2xl" ...>` instead. Or change the className to match the `ct-surface-flat` style by referencing the existing CSS class:

```jsx
className="ct-surface-flat flex items-center justify-between gap-3 px-3.5 py-3 rounded-2xl"
```

The simpler form (using the class directly) avoids restructuring the JSX. Either approach is acceptable — pick the one with smaller diff.

- [ ] **Step 3: Build check**

Run: `cd frontend && npm run build`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/StyleMixSheet.jsx
git commit -m "feat(progress): StyleMixSheet chrome refresh"
```

---

## Task 9: Restructure `ProgressTab` around the new layout

**Files:**
- Modify: `frontend/src/components/ProgressTab.jsx`

- [ ] **Step 1: Add the import**

```jsx
import StatTrends7Day from './progress/StatTrends7Day'
```

- [ ] **Step 2: Refresh the header**

Find:
```jsx
<div className="px-1 pt-1 pb-2">
  <h1 className="text-2xl sm:text-[28px] font-bold text-text -tracking-[0.025em]">Progress</h1>
  <p className="text-xs text-muted mt-1">Leaderboard, grade pyramid, and your stats</p>
</div>
```

Replace with:
```jsx
<div className="px-1 pt-1 pb-2">
  <h1 className="ct-display">Progress</h1>
  <p className="ct-meta mt-1">Grade pyramid, awards, and your XP trend</p>
</div>
```

- [ ] **Step 3: Refresh the "Log a session" button styling to match the RPG aesthetic**

The current button is fine functionally but uses tier-color theming inline. Keep that — but verify it still reads cleanly against the new panel chrome. No structural change needed unless it looks visually awkward; if so, swap the inner span styles to use `ct-cream` / `ct-terracotta` tokens.

- [ ] **Step 4: Insert `<StatTrends7Day>` between `<AwardsStrip>` and `<ProgressTrendGraph>`**

Find the JSX block at the bottom of the component:

```jsx
<ProgressTierHero ... />
<GradePyramidCard ... />
<AwardsStrip ... />
<ProgressTrendGraph />
```

Insert:

```jsx
<ProgressTierHero ... />
<GradePyramidCard ... />
<AwardsStrip ... />
<StatTrends7Day />
<ProgressTrendGraph />
```

- [ ] **Step 5: Run tests + build + manual smoke**

Run: `cd frontend && npm test -- --run && npm run build`
Expected: clean.

Manually: open `/progress`, confirm panels render in order, no console errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/ProgressTab.jsx
git commit -m "feat(progress): ProgressTab restructure + insert StatTrends7Day"
```

---

## Task 10: Phase 3 retrospective stub + regression sweep

**Files:**
- Modify: `docs/superpowers/specs/2026-05-20-rpg-climber-design.md`

- [ ] **Step 1: Run the full sweep**

Run: `cd frontend && npm test -- --run && npm run build`
Expected: tests stay green (≥80/80 after the 5 new sendBuckets tests added in Task 1), build clean, no console errors on `/progress`.

- [ ] **Step 2: Append a Phase 3 retrospective stub to the spec**

Open `docs/superpowers/specs/2026-05-20-rpg-climber-design.md`. At the end, add:

```markdown
## Phase 3 retrospective (added after implementation)

Phase 3 shipped on YYYY-MM-DD — N commits on `redesign/rpg-climber` since the Phase 3 plan, build green, M/M tests passing.

- [findings to be filled in by the implementer or reviewer]
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-05-20-rpg-climber-design.md
git commit -m "docs(spec): Phase 3 retrospective stub"
```

---

## Critical invariants

- **Data layer is untouched.** `getProfile`, `getPyramid`, `getTrainingLogs`, `useAwards`, `useRewardEngine`, all backend events (`ct:new-pr`, `ct:award-unlocked`, `ct:tier-promotion`) keep firing exactly as today.
- **Tier theming preserved.** `TierThemeRoot` still wraps `ProgressTab`. Tier-c CSS vars continue to drive `ProgressTierHero`'s glow and the "Log a session" button accent. Phase 5 will introduce theme-switching; Phase 3 only refreshes chrome.
- **Pyramid math, animations, and color tokens** in `GradePyramidCard.PyramidRow` are not modified.
- **`StyleMixSheet`'s drill-in remains functional** wherever it's mounted (Hub re-mounted it in Phase 1 if applicable; the Progress drill-down stays the same).
- **Reward engine semantics are not changed.** The only addition is `xpEarned` on `sendRecord` (additive field, no consumers were relying on its absence).
- All motion respects `prefers-reduced-motion` — the new `<StatTrends7Day>` uses `transition-colors` which honors the OS setting via Tailwind defaults.

---

## Out of scope for Phase 3

- Tier theme switching (Phase 5).
- Backend sync of XP / stat / streak state (deferred per spec).
- Awards detail page (`/progress/awards`) re-chrome — covered when we touch `AwardsPage.jsx` later, likely as part of Phase 6.
- ProfileSetup's lingering 4-chip references (still Phase 6).
- Replacing `ProgressTrendGraph` with the engine-driven stat trends — the 8-week graph remains as the long-window companion; the new `<StatTrends7Day>` is additive.
