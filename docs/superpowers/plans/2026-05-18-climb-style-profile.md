# Climb-Style Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture per-increment climb style (power / dynamic / technical / endurance) at log time, derive a style profile from the user's training_logs, surface it on Hub, pre-fill the wizard's weaknesses step, and bias plan generation toward under-developed styles.

**Architecture:** Sibling `styles: {power, dynamic, technical, endurance}` map added to each grade-counter dict on `training_logs.climbs` (JSONB column — no schema change). Frontend's `ClimbLogSection` gains a sticky style-chip strip; every `+` increment on `GradeCounterRow` also bumps the active style. Two new pure-function helpers (`styleColors.js`, `styleProfile.js`) drive a Hub card, the adaptive wizard step, and the plan-generator's session-emphasis bias.

**Tech Stack:** React 18 + framer-motion + lucide-react · TailwindCSS · FastAPI + Pydantic v2 · PostgreSQL JSONB. No new dependencies.

---

## Spec reference

Full spec: [docs/superpowers/specs/2026-05-18-climb-style-profile-design.md](../specs/2026-05-18-climb-style-profile-design.md)

## Conventions

- **No emojis in UI or commit messages.** Use lucide-react icons (`Flame`, `Zap`, `Compass`, `Timer`).
- **No DB schema change.** All persistence lands inside the existing `training_logs.climbs` JSONB column.
- **Backward-compat invariant:** legacy logs (no `styles` map) MUST continue to work. Helpers treat them as "untagged" and exclude them from profile aggregation.
- **Frequent commits.** One commit per task after verification.
- **No frontend test framework.** Pure helpers get a Node smoke test under `frontend/scripts/`; components verify via `npx vite build`.

## Task overview

| # | Task | Files |
|---|---|---|
| 1 | `styleColors.js` — tokens + helper | New + smoke |
| 2 | `styleProfile.js` — derive profile from logs | New + smoke |
| 3 | `StyleChipStrip.jsx` — sticky 4-chip selector | New |
| 4 | `GradeCounterRow` — accept active style + emit style-aware updates | Modify |
| 5 | `ClimbLogSection` — render `StyleChipStrip`, merge style into `climbs` | Modify |
| 6 | Backend `TrainingLogRequest` — accept `styles` sub-map | Modify |
| 7 | `HubStyleMixCard.jsx` — stacked-bar summary | New |
| 8 | `StyleMixSheet.jsx` — drill-down bottom sheet | New |
| 9 | `useHubData` — expose `styleProfile` | Modify |
| 10 | `HubTab` — mount `HubStyleMixCard` | Modify |
| 11 | `ProfileSetup` — adaptive weaknesses step | Modify |
| 12 | `coach.py` — bias `_pick_session` by style profile, freeze into `plan_data` | Modify |
| 13 | Manual phone verification | — |

---

### Task 1: `styleColors.js` — color tokens + helpers

**Files:**
- Create: `frontend/src/lib/styleColors.js`
- Create: `frontend/scripts/smoke-styleColors.mjs`

Pure module exporting `STYLE_COLOR`, `getStyleColor(style)`, `getStyleLabel(style)`, `STYLE_ORDER`. Mirrors the shape of `sessionType.js`.

- [ ] **Step 1: Write the smoke script as the failing test**

Create `frontend/scripts/smoke-styleColors.mjs`:

```javascript
// Smoke verification for styleColors.js.
// Run: node frontend/scripts/smoke-styleColors.mjs
import { STYLE_COLOR, STYLE_ORDER, getStyleColor, getStyleLabel } from '../src/lib/styleColors.js'
import assert from 'node:assert/strict'

// All four styles present
assert.deepEqual(STYLE_ORDER, ['power', 'dynamic', 'technical', 'endurance'])

// Color tokens
assert.equal(STYLE_COLOR.power.c, '#fb7185')
assert.equal(STYLE_COLOR.dynamic.c, '#f97316')
assert.equal(STYLE_COLOR.technical.c, '#8b5cf6')
assert.equal(STYLE_COLOR.endurance.c, '#2dd4bf')

// Lookup helper is case-insensitive
assert.equal(getStyleColor('power').c,   '#fb7185')
assert.equal(getStyleColor('POWER').c,   '#fb7185')
assert.equal(getStyleColor('unknown').c, '#fb7185', 'unknown falls back to power')
assert.equal(getStyleColor(null).c,      '#fb7185')

// Labels
assert.equal(getStyleLabel('power'),     'Power')
assert.equal(getStyleLabel('endurance'), 'Endurance')
assert.equal(getStyleLabel(null),        null)

console.log('OK styleColors')
```

- [ ] **Step 2: Run the smoke script to verify it fails**

Run from `/Users/mathewbudnik/coretriage`: `node frontend/scripts/smoke-styleColors.mjs`
Expected: `ERR_MODULE_NOT_FOUND` for `../src/lib/styleColors.js`.

- [ ] **Step 3: Implement `styleColors.js`**

Create `frontend/src/lib/styleColors.js`:

```javascript
/**
 * Color tokens + display labels for the four climb styles. Mirrors the V-tier
 * palette so the style chips, Hub stacked bar, and plan-gen logs all share
 * the same vocabulary.
 *
 * Lean 4 (per spec):
 *   power      — explosive, contact-strength climbs
 *   dynamic    — committing, momentum-based climbs
 *   technical  — body-position-dependent climbs
 *   endurance  — sustained, pumpy climbs
 *
 * Order matters: STYLE_ORDER drives the chip strip and the stacked bar so
 * both surfaces read identically.
 */
export const STYLE_ORDER = ['power', 'dynamic', 'technical', 'endurance']

export const STYLE_COLOR = {
  power:     { c: '#fb7185', light: '#fda4af', deep: '#7f1d2c' },   // Phoenix coral
  dynamic:   { c: '#f97316', light: '#fb923c', deep: '#7c2d12' },   // Coral orange
  technical: { c: '#8b5cf6', light: '#a78bfa', deep: '#4c1d95' },   // Amethyst violet
  endurance: { c: '#2dd4bf', light: '#5eead4', deep: '#115e59' },   // Aquamarine teal
}

const STYLE_LABEL = {
  power:     'Power',
  dynamic:   'Dynamic',
  technical: 'Technical',
  endurance: 'Endurance',
}

/**
 * Case-insensitive lookup of color tokens. Unknown / null / undefined input
 * falls back to power so callers never crash on a missing field.
 */
export function getStyleColor(style) {
  const key = (style || '').toString().toLowerCase()
  return STYLE_COLOR[key] || STYLE_COLOR.power
}

/**
 * Title-cased display label. Returns null when the input is empty so callers
 * can render conditionally (e.g. "{label && <span>{label}</span>}").
 */
export function getStyleLabel(style) {
  if (!style) return null
  return STYLE_LABEL[String(style).toLowerCase()] || null
}
```

- [ ] **Step 4: Run the smoke script to verify it passes**

Run: `node frontend/scripts/smoke-styleColors.mjs`
Expected: `OK styleColors`

- [ ] **Step 5: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/lib/styleColors.js frontend/scripts/smoke-styleColors.mjs
git diff --cached --stat   # confirm ONLY these two files staged
git commit -m "feat(style-profile): STYLE_COLOR tokens + getStyleColor/getStyleLabel helpers

Lean 4-style palette mirroring tier tokens — used by the climb-log style
chips, Hub style-mix card, and plan-gen logging. Pure module + smoke
test. Unknown / null input falls back to power so callers never crash."
```

---

### Task 2: `styleProfile.js` — derive profile from training_logs

**Files:**
- Create: `frontend/src/lib/styleProfile.js`
- Create: `frontend/scripts/smoke-styleProfile.mjs`

Pure function reading `trainingLogs[].climbs[discipline][grade].styles` and producing the profile object the spec defines (counts / pct / dominant / weakest / confidence).

- [ ] **Step 1: Write the smoke script as the failing test**

Create `frontend/scripts/smoke-styleProfile.mjs`:

```javascript
// Smoke verification for styleProfile.js.
// Run: node frontend/scripts/smoke-styleProfile.mjs
import { deriveStyleProfile } from '../src/lib/styleProfile.js'
import assert from 'node:assert/strict'

// ── No logs ──────────────────────────────────────────────────────────────
const empty = deriveStyleProfile([])
assert.deepEqual(empty.counts, { power: 0, dynamic: 0, technical: 0, endurance: 0 })
assert.equal(empty.total, 0)
assert.equal(empty.confidence, 'low')
assert.equal(empty.dominant, null)
assert.equal(empty.weakest, null)

// ── Untagged logs only (legacy) — also low confidence ───────────────────
const legacy = deriveStyleProfile([
  { climbs: { boulder: { V3: { s: 2, f: 0, p: 0 } } } },
  { climbs: { boulder: { V4: { s: 1, f: 1, p: 0 } } } },
])
assert.equal(legacy.total, 0, 'untagged climbs do not count toward total')
assert.equal(legacy.confidence, 'low')

// ── Low confidence (< 6 tagged) ──────────────────────────────────────────
const low = deriveStyleProfile([
  { climbs: { boulder: { V3: { s: 2, f: 0, p: 0, styles: { power: 2, dynamic: 0, technical: 0, endurance: 0 } } } } },
])
assert.equal(low.total, 2)
assert.equal(low.confidence, 'low')

// ── Medium confidence (6-19 tagged) ──────────────────────────────────────
const med = deriveStyleProfile([
  { climbs: { boulder: { V3: { s: 5, f: 0, p: 0, styles: { power: 5, dynamic: 0, technical: 0, endurance: 0 } } } } },
  { climbs: { boulder: { V4: { s: 3, f: 0, p: 0, styles: { power: 0, dynamic: 0, technical: 3, endurance: 0 } } } } },
])
assert.equal(med.total, 8)
assert.equal(med.confidence, 'medium')
assert.equal(med.dominant, 'power')
assert.equal(med.weakest, 'dynamic')   // power=5 tech=3 dyn=0 end=0; tie at zero broken alphabetically
assert.equal(med.pct.power, 63)        // 5/8 = 62.5 -> rounded 63
assert.equal(med.pct.technical, 37)

// ── High confidence (>= 20 tagged) ───────────────────────────────────────
const hi = deriveStyleProfile([
  { climbs: { boulder: {
      V3: { s: 10, f: 0, p: 0, styles: { power: 10, dynamic: 0, technical: 0, endurance: 0 } },
      V4: { s: 6,  f: 0, p: 0, styles: { power: 0, dynamic: 6, technical: 0, endurance: 0 } },
      V5: { s: 4,  f: 0, p: 0, styles: { power: 0, dynamic: 0, technical: 4, endurance: 0 } },
  } } },
])
assert.equal(hi.total, 20)
assert.equal(hi.confidence, 'high')
assert.equal(hi.dominant, 'power')
assert.equal(hi.weakest, 'endurance')

// ── Routes count too ─────────────────────────────────────────────────────
const routes = deriveStyleProfile([
  { climbs: { route: { '5.11a': { s: 8, f: 0, p: 0, styles: { power: 0, dynamic: 0, technical: 0, endurance: 8 } } } } },
])
assert.equal(routes.total, 8)
assert.equal(routes.dominant, 'endurance')

// ── Mixed sums must equal totals (invariant) ─────────────────────────────
const inv = deriveStyleProfile([
  { climbs: { boulder: { V4: { s: 2, f: 1, p: 0, styles: { power: 2, dynamic: 1, technical: 0, endurance: 0 } } } } },
])
assert.equal(inv.total, 3, 'sum of style counts equals s+f+p')
assert.equal(inv.counts.power + inv.counts.dynamic + inv.counts.technical + inv.counts.endurance, 3)

console.log('OK styleProfile')
```

- [ ] **Step 2: Run smoke script to verify it fails**

Run: `node frontend/scripts/smoke-styleProfile.mjs`
Expected: `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement `styleProfile.js`**

Create `frontend/src/lib/styleProfile.js`:

```javascript
import { STYLE_ORDER } from './styleColors'

/**
 * Walk an array of training_logs and aggregate per-style counts from each
 * log's climbs.<discipline>.<grade>.styles map. Logs without a styles map
 * are "untagged" and skipped — they don't contribute to the profile.
 *
 * Returns:
 *   {
 *     counts:     { power, dynamic, technical, endurance },
 *     pct:        { power, dynamic, technical, endurance },   // 0..100 ints
 *     total:      number,
 *     dominant:   'power' | 'dynamic' | ... | null,
 *     weakest:    'power' | 'dynamic' | ... | null,           // only when total >= 6
 *     confidence: 'low' | 'medium' | 'high',
 *   }
 *
 * Confidence gates:
 *   low    — total < 6
 *   medium — 6 <= total < 20
 *   high   — total >= 20
 *
 * Ties broken in STYLE_ORDER (power → dynamic → technical → endurance) for
 * dominant, and reverse STYLE_ORDER for weakest.
 */
export function deriveStyleProfile(trainingLogs) {
  const counts = { power: 0, dynamic: 0, technical: 0, endurance: 0 }

  for (const log of trainingLogs || []) {
    const climbs = log?.climbs || {}
    for (const discipline of ['boulder', 'route']) {
      const grades = climbs[discipline] || {}
      for (const grade of Object.keys(grades)) {
        const entry = grades[grade] || {}
        const styles = entry.styles
        if (!styles || typeof styles !== 'object') continue
        for (const s of STYLE_ORDER) {
          counts[s] += Number(styles[s] || 0)
        }
      }
    }
  }

  const total = STYLE_ORDER.reduce((sum, s) => sum + counts[s], 0)

  const confidence =
    total >= 20 ? 'high' :
    total >= 6  ? 'medium' :
                  'low'

  const pct = { power: 0, dynamic: 0, technical: 0, endurance: 0 }
  if (total > 0) {
    for (const s of STYLE_ORDER) {
      pct[s] = Math.round((counts[s] / total) * 100)
    }
  }

  // Tie-break: STYLE_ORDER for dominant (first wins on equal counts), reverse
  // STYLE_ORDER for weakest (last wins).
  let dominant = null
  let weakest  = null
  if (total > 0) {
    let domCount = -1
    let weakCount = Infinity
    for (const s of STYLE_ORDER) {
      if (counts[s] > domCount)  { domCount = counts[s];  dominant = s }
    }
    for (let i = STYLE_ORDER.length - 1; i >= 0; i--) {
      const s = STYLE_ORDER[i]
      if (counts[s] < weakCount) { weakCount = counts[s]; weakest = s }
    }
  }
  // Suppress weakest when we don't have enough data to trust it.
  if (total < 6) weakest = null

  return { counts, pct, total, dominant, weakest, confidence }
}
```

- [ ] **Step 4: Run smoke script to verify it passes**

Run: `node frontend/scripts/smoke-styleProfile.mjs`
Expected: `OK styleProfile`

- [ ] **Step 5: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/lib/styleProfile.js frontend/scripts/smoke-styleProfile.mjs
git diff --cached --stat
git commit -m "feat(style-profile): deriveStyleProfile helper + smoke test

Aggregates per-style counts across all logs, computes percentages,
dominant/weakest styles, and a 3-tier confidence flag (low/medium/high
gated by total tagged climbs). Untagged legacy logs are skipped so the
helper is safe to call on any user, even pre-feature."
```

---

### Task 3: `StyleChipStrip.jsx` — sticky 4-chip selector

**Files:**
- Create: `frontend/src/components/StyleChipStrip.jsx`

A sticky horizontal strip of 4 toggleable chips (Power / Dynamic / Technical / Endurance). One always active. Active style is read/written from localStorage as `ct_climb_style`.

- [ ] **Step 1: Create the component**

Create `frontend/src/components/StyleChipStrip.jsx`:

```jsx
import { Zap, Wind, Compass, Timer } from 'lucide-react'
import { STYLE_ORDER, STYLE_COLOR, getStyleLabel } from '../lib/styleColors'

const STYLE_ICON = {
  power:     Zap,
  dynamic:   Wind,
  technical: Compass,
  endurance: Timer,
}

/**
 * Sticky 4-chip style selector. One chip is always active; tapping a
 * different chip changes the active style. Subsequent +/- increments in the
 * climb-log section will attribute to whichever style is active here.
 *
 * Props:
 *   value:     'power' | 'dynamic' | 'technical' | 'endurance'
 *   onChange:  (next: string) => void
 */
export default function StyleChipStrip({ value, onChange }) {
  return (
    <div className="sticky top-0 z-10 -mx-3 px-3 py-2
                    bg-[#0a0a0c]/85 backdrop-blur-md
                    border-b-[0.5px] border-white/[0.06]">
      <p className="text-[9.5px] font-extrabold uppercase tracking-[0.12em]
                    text-text/45 mb-2 px-0.5">
        Style of these climbs
      </p>
      <div className="grid grid-cols-4 gap-1.5">
        {STYLE_ORDER.map((s) => {
          const Icon = STYLE_ICON[s]
          const active = s === value
          const tone = STYLE_COLOR[s]
          return (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              aria-pressed={active}
              className="flex flex-col items-center justify-center gap-1
                         py-2 rounded-2xl border-[0.5px] min-h-[52px]
                         transition-colors"
              style={active
                ? {
                    background: `color-mix(in srgb, ${tone.c} 18%, transparent)`,
                    borderColor: `color-mix(in srgb, ${tone.c} 45%, transparent)`,
                    color: tone.light,
                  }
                : {
                    background: 'transparent',
                    borderColor: 'rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.55)',
                  }
              }
            >
              <Icon size={14} strokeWidth={2.4} />
              <span className="text-[10.5px] font-extrabold uppercase tracking-[0.04em]">
                {getStyleLabel(s)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run from `/Users/mathewbudnik/coretriage`: `cd frontend && npx vite build`
Expected: build succeeds. The component is not yet imported anywhere.

- [ ] **Step 3: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/components/StyleChipStrip.jsx
git commit -m "feat(style-profile): StyleChipStrip — sticky 4-chip style selector

Power / Dynamic / Technical / Endurance chips with lucide icons (Zap /
Wind / Compass / Timer). Active chip uses the style's color tokens; the
strip is sticky inside its scroll container so it stays in view while
the user scrolls through grade rows. 52px min tap target."
```

---

### Task 4: `GradeCounterRow` — accept active style + emit style-aware updates

**Files:**
- Modify: `frontend/src/components/GradeCounterRow.jsx`

Existing `onChange(next)` emits `{ s, f, p }`. We add an `activeStyle` prop. Every counter change also emits an updated `styles` map (incrementing/decrementing the active style by the same delta as the s/f/p counter). The component signature becomes `onChange({ s, f, p, styles })`.

- [ ] **Step 1: Replace `bump` and the `onChange` shape**

Replace the whole file at `frontend/src/components/GradeCounterRow.jsx`:

```jsx
import { Minus, Plus } from 'lucide-react'
import { STYLE_ORDER } from '../lib/styleColors'

const EMPTY_STYLES = { power: 0, dynamic: 0, technical: 0, endurance: 0 }

function normalizeStyles(styles) {
  if (!styles || typeof styles !== 'object') return { ...EMPTY_STYLES }
  return STYLE_ORDER.reduce((acc, s) => {
    acc[s] = Math.max(0, Number(styles[s] || 0))
    return acc
  }, {})
}

/**
 * One grade's three counters: Sends · Flashes · Projects.
 * Each +/- also bumps the active style under a sibling `styles` map.
 *
 * Props:
 *   grade:        string
 *   counters:     { s: number, f: number, p: number, styles?: {...} }
 *   activeStyle:  'power' | 'dynamic' | 'technical' | 'endurance'
 *   onChange:     (next) => void  — receives { s, f, p, styles }
 */
export default function GradeCounterRow({ grade, counters, activeStyle, onChange }) {
  const { s, f, p } = counters
  const styles = normalizeStyles(counters.styles)

  function bump(key, delta) {
    let nextS = s, nextF = f, nextP = p
    if (key === 's') nextS = Math.max(0, s + delta)
    if (key === 'f') nextF = Math.max(0, f + delta)
    if (key === 'p') nextP = Math.max(0, p + delta)
    // Invariant: flashes <= sends. If sends drops below flashes, clamp flashes.
    if (nextF > nextS) nextF = nextS

    // Style attribution: only when active style is one of the 4 known keys.
    // Decrement (delta < 0) attempts to remove from the active style first;
    // if that style has 0, fall through to whichever style has the largest
    // count so the styles map stays in sync with the totals.
    const nextStyles = { ...styles }
    const totalNext = nextS + nextF + nextP
    const totalPrev = s + f + p
    const styleDelta = totalNext - totalPrev
    if (styleDelta > 0 && STYLE_ORDER.includes(activeStyle)) {
      nextStyles[activeStyle] = (nextStyles[activeStyle] || 0) + styleDelta
    } else if (styleDelta < 0) {
      let remaining = -styleDelta
      // Try active style first
      const tryDrain = (key) => {
        const have = nextStyles[key] || 0
        const take = Math.min(have, remaining)
        nextStyles[key] = have - take
        remaining -= take
      }
      if (STYLE_ORDER.includes(activeStyle)) tryDrain(activeStyle)
      // Drain remaining from the largest bucket so the invariant holds
      while (remaining > 0) {
        let largestKey = STYLE_ORDER[0]
        for (const s of STYLE_ORDER) {
          if ((nextStyles[s] || 0) > (nextStyles[largestKey] || 0)) largestKey = s
        }
        if ((nextStyles[largestKey] || 0) === 0) break  // nothing left to drain
        tryDrain(largestKey)
      }
    }

    onChange({ s: nextS, f: nextF, p: nextP, styles: nextStyles })
  }

  return (
    <div className="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-1 sm:gap-2 py-1.5">
      <span className="text-sm font-bold text-text">{grade}</span>
      {[['s', s, 'sends'], ['f', f, 'flashes'], ['p', p, 'projects']].map(([k, val, label]) => (
        <div key={k} className="flex items-center justify-center gap-0.5 sm:gap-1 min-w-0">
          <button
            type="button"
            onClick={() => bump(k, -1)}
            disabled={val === 0}
            aria-label={`decrement ${label} for ${grade}`}
            className="w-9 h-9 sm:w-11 sm:h-11 shrink-0 inline-flex items-center justify-center rounded-lg
                       border border-outline text-muted hover:text-text
                       disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Minus size={14} />
          </button>
          <span className="text-sm font-bold text-text tabular-nums w-5 sm:w-6 text-center">
            {val}
          </span>
          <button
            type="button"
            onClick={() => bump(k, +1)}
            aria-label={`increment ${label} for ${grade}`}
            className="w-9 h-9 sm:w-11 sm:h-11 shrink-0 inline-flex items-center justify-center rounded-lg
                       border border-outline text-muted hover:text-text"
          >
            <Plus size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `cd frontend && npx vite build`
Expected: build succeeds. `ClimbLogSection` still passes the old `(counters)` callback shape — that's fine because the new `next` is a superset (`s/f/p` still present); we'll update the caller in Task 5.

- [ ] **Step 3: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/components/GradeCounterRow.jsx
git commit -m "feat(style-profile): GradeCounterRow propagates active style via styles map

Each +/- now mutates a sibling 'styles' map under the same grade's counter
object — incrementing the active style on +1 and draining from the active
style (with overflow to the largest bucket) on -1, so the sum-of-styles
invariant matches s+f+p at all times. New activeStyle prop; onChange now
emits { s, f, p, styles }."
```

---

### Task 5: `ClimbLogSection` — render the chip strip, wire active style

**Files:**
- Modify: `frontend/src/components/ClimbLogSection.jsx`

Add a `useState` for `activeStyle` initialized from localStorage (key `ct_climb_style`, default `power`), render `<StyleChipStrip>` at the top of the expanded body, pass `activeStyle` down to each `GradeCounterRow`. `updateCounter` now receives `{ s, f, p, styles }` and stores the whole object.

- [ ] **Step 1: Update imports + state**

Edit the imports and the component body so they look like this. Find the existing `import GradeCounterRow from './GradeCounterRow'` line and replace the imports block at the top of `frontend/src/components/ClimbLogSection.jsx`:

```jsx
import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp } from 'lucide-react'
import GradeCounterRow from './GradeCounterRow'
import StyleChipStrip from './StyleChipStrip'
import { STYLE_ORDER } from '../lib/styleColors'

const STYLE_STORAGE_KEY = 'ct_climb_style'
```

Inside `ClimbLogSection` (right after the existing `setExtraRoute` state), add:

```jsx
  const [activeStyle, setActiveStyle] = useState(() => {
    try {
      const v = localStorage.getItem(STYLE_STORAGE_KEY)
      return STYLE_ORDER.includes(v) ? v : 'power'
    } catch { return 'power' }
  })

  useEffect(() => {
    try { localStorage.setItem(STYLE_STORAGE_KEY, activeStyle) } catch {}
  }, [activeStyle])
```

- [ ] **Step 2: Update `updateCounter` to preserve styles**

Replace the existing `updateCounter` with:

```jsx
  function updateCounter(discipline, grade, counters) {
    // counters is the full payload from GradeCounterRow: { s, f, p, styles }
    const next = {
      ...value,
      [discipline]: {
        ...(value?.[discipline] || {}),
        [grade]: counters,
      },
    }
    // Strip fully-zero rows to keep the JSONB compact.
    if (counters.s === 0 && counters.f === 0 && counters.p === 0) {
      delete next[discipline][grade]
    }
    if (Object.keys(next[discipline] || {}).length === 0) {
      delete next[discipline]
    }
    onChange(next)
  }
```

- [ ] **Step 3: Render the chip strip + pass activeStyle into each row**

Find both `<GradeCounterRow ...>` invocations in this file. Each currently looks like:

```jsx
<GradeCounterRow
  grade={g}
  counters={value?.boulder?.[g] || { s: 0, f: 0, p: 0 }}
  onChange={(c) => updateCounter('boulder', g, c)}
/>
```

Update each to:

```jsx
<GradeCounterRow
  grade={g}
  counters={value?.boulder?.[g] || { s: 0, f: 0, p: 0 }}
  activeStyle={activeStyle}
  onChange={(c) => updateCounter('boulder', g, c)}
/>
```

(Same change for the route variant — swap `'boulder'` → `'route'`.)

Then locate the opening of the expanded body — find the line that reads `Log climbs` and the chevron button. Immediately AFTER the outer expand `<button>` and inside the `AnimatePresence` block, before the tab switcher, insert the chip strip:

```jsx
{open && (
  <motion.div ...>
    <StyleChipStrip value={activeStyle} onChange={setActiveStyle} />
    {/* existing tab switcher and grade lists */}
    ...
  </motion.div>
)}
```

(Look at the existing JSX around lines 75-150 in the file to find the right insertion point. The chip strip should appear at the top of the expanded body, before the tabs.)

- [ ] **Step 4: Verify build**

Run: `cd frontend && npx vite build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/components/ClimbLogSection.jsx
git commit -m "feat(style-profile): ClimbLogSection renders StyleChipStrip + threads activeStyle

Chip strip lives at the top of the expanded log body, sticky inside the
section so it stays visible while the user scrolls through grade rows.
Active style persists in localStorage as ct_climb_style so it survives
across sessions. updateCounter now stores the full { s, f, p, styles }
payload from each row."
```

---

### Task 6: Backend — accept `styles` sub-map in `TrainingLogRequest`

**Files:**
- Modify: `main.py:440-447`

The current type is `climbs: Dict[str, Dict[str, Dict[str, int]]] = {}` which only allows int-valued sub-dicts. The new shape adds a `styles` key whose value is itself a dict — Pydantic rejects this. Loosen the inner type so both legacy and styled payloads pass.

- [ ] **Step 1: Verify the current schema rejects the new payload (probe)**

Run from `/Users/mathewbudnik/coretriage`:

```bash
python -c "
from main import TrainingLogRequest
TrainingLogRequest(
    session_type='bouldering',
    duration_min=60,
    intensity=7,
    climbs={'boulder': {'V3': {'s': 1, 'f': 0, 'p': 0, 'styles': {'power': 1, 'dynamic': 0, 'technical': 0, 'endurance': 0}}}}
)
"
```

Expected: a Pydantic `ValidationError` mentioning the inner dict can't validate as `int`.

- [ ] **Step 2: Loosen the inner climb-counter type**

Find this block in `/Users/mathewbudnik/coretriage/main.py` (around line 440):

```python
class TrainingLogRequest(BaseModel):
    date: Optional[str] = None
    session_type: str
    duration_min: int
    intensity: int
    grades_sent: str = ""
    notes: str = ""
    climbs: Dict[str, Dict[str, Dict[str, int]]] = {}
```

Replace the `climbs` line with:

```python
    # Inner dict mixes int counters (s/f/p) with an optional dict-valued
    # `styles` map. Typed as Dict[str, Any] to accept both legacy and styled
    # payloads. save logic handles the shape; we don't validate further here.
    climbs: Dict[str, Dict[str, Dict[str, Any]]] = {}
```

Confirm `Any` is in the imports at the top of the file: `from typing import Any, Dict, List, Literal, Optional` — it already is (verified during plan-writing).

- [ ] **Step 3: Verify the probe now passes**

Run the same Python snippet from Step 1.
Expected: NO error. The block prints nothing and exits 0.

- [ ] **Step 4: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add main.py
git commit -m "fix(api): widen TrainingLogRequest.climbs to accept dict-valued styles sub-map

Inner counters were typed Dict[str, int] which rejected the new
styles: {power, dynamic, technical, endurance} sub-map. Loosened to
Dict[str, Any] so both legacy and styled payloads pass validation."
```

---

### Task 7: `HubStyleMixCard.jsx` — stacked-bar summary

**Files:**
- Create: `frontend/src/components/HubStyleMixCard.jsx`

Glass card. Shows a single horizontal stacked bar split into 4 segments colored per style, percentages on hover/tap, and a single descriptive line. Hidden when `profile.confidence === 'low'`.

- [ ] **Step 1: Create the component**

Create `frontend/src/components/HubStyleMixCard.jsx`:

```jsx
import { ChevronRight } from 'lucide-react'
import { STYLE_ORDER, STYLE_COLOR, getStyleLabel } from '../lib/styleColors'

/**
 * Hub card showing the user's style mix as a single stacked bar plus a
 * one-line summary. Hidden entirely when profile.confidence is 'low'
 * (caller is responsible for the conditional render).
 *
 * Props:
 *   profile: { pct, counts, total, dominant, weakest, confidence }
 *   onOpen:  () => void   — fires when the user taps the card to drill in
 */
export default function HubStyleMixCard({ profile, onOpen }) {
  if (!profile || profile.confidence === 'low') return null

  const summary = (() => {
    const dom = getStyleLabel(profile.dominant)
    const weak = getStyleLabel(profile.weakest)
    if (dom && weak && profile.dominant !== profile.weakest) {
      return <>Mostly <b>{dom}</b>. <b>{weak}</b> is your gap — your plan can emphasise it.</>
    }
    if (dom) return <>Mostly <b>{dom}</b>. Keep mixing styles to see your gap.</>
    return null
  })()

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left rounded-2xl bg-black/35 backdrop-blur-md
                 border-[0.5px] border-white/[0.10] p-4 mb-3
                 hover:bg-black/40 transition-colors"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.12em]
                      text-[var(--tier-light)]">
          Style mix
        </p>
        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-text/45 inline-flex items-center gap-0.5">
          Last 30 days
          <ChevronRight size={11} strokeWidth={2.4} className="opacity-70" />
        </span>
      </div>

      <div className="flex h-3 rounded-full overflow-hidden bg-white/[0.04] mb-3">
        {STYLE_ORDER.map((s) => (
          <div
            key={s}
            className="h-full"
            style={{ width: `${profile.pct[s]}%`, background: STYLE_COLOR[s].c }}
            aria-label={`${getStyleLabel(s)} ${profile.pct[s]} percent`}
          />
        ))}
      </div>

      <div className="grid grid-cols-4 gap-1 mb-2">
        {STYLE_ORDER.map((s) => (
          <div key={s} className="flex items-center gap-1.5 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: STYLE_COLOR[s].c }} />
            <span className="text-[9.5px] font-bold uppercase tracking-[0.04em] text-text/55 truncate">
              {getStyleLabel(s)}
            </span>
            <span className="text-[10px] font-extrabold tabular-nums ml-auto"
                  style={{ color: STYLE_COLOR[s].light }}>
              {profile.pct[s]}%
            </span>
          </div>
        ))}
      </div>

      {summary && (
        <p className="text-[11.5px] font-semibold text-text/60 leading-snug mt-2">
          {summary}
        </p>
      )}
    </button>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `cd frontend && npx vite build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/components/HubStyleMixCard.jsx
git commit -m "feat(style-profile): HubStyleMixCard — stacked-bar style summary

Single horizontal bar split into Power/Dynamic/Technical/Endurance
segments with the same color tokens as the chip strip. 4-up legend
below the bar with percentages. One-line copy summarising dominant vs
weakest. Hidden when confidence is 'low'."
```

---

### Task 8: `StyleMixSheet.jsx` — drill-down bottom sheet

**Files:**
- Create: `frontend/src/components/StyleMixSheet.jsx`

Reuses the responsive sheet pattern from `train/SessionDetailSheet`. Shows a bigger version of the bar, per-style count + %, and the hardest send per style.

- [ ] **Step 1: Create the component**

Create `frontend/src/components/StyleMixSheet.jsx`:

```jsx
import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { STYLE_ORDER, STYLE_COLOR, getStyleLabel } from '../lib/styleColors'
import { useIsDesktop } from '../hooks/useIsDesktop'

const REDUCE_MOTION = typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Drill-down sheet for the Hub style-mix card.
 *
 * Props:
 *   open:    boolean
 *   profile: { pct, counts, total, dominant, weakest, confidence }
 *   onClose: () => void
 */
export default function StyleMixSheet({ open, profile, onClose }) {
  const isDesktop = useIsDesktop()

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const sheetClass = isDesktop
    ? `fixed top-[6vh] left-1/2 -translate-x-1/2 z-50
       w-full max-w-md max-h-[88vh] flex flex-col overflow-hidden
       bg-[#0a0a0c] border-[0.5px] border-white/[0.10] rounded-3xl px-4 pt-3`
    : `fixed bottom-0 inset-x-0 z-50
       bg-[#0a0a0c] border-t-[0.5px] border-white/[0.10]
       rounded-t-3xl px-4 pt-3 flex flex-col max-h-[88vh]`
  const enter = isDesktop ? { opacity: 1, scale: 1 } : { y: 0 }
  const exit  = isDesktop ? { opacity: 0, scale: 0.96 } : { y: '100%' }
  const init  = isDesktop ? { opacity: 0, scale: 0.96 } : { y: '100%' }
  const enableDrag = !isDesktop && !REDUCE_MOTION

  if (!profile && !open) return null

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: REDUCE_MOTION ? 0 : 0.18 }}
            onClick={onClose}
          />
          <motion.div
            key="sheet"
            className={sheetClass}
            initial={init} animate={enter} exit={exit}
            transition={{ duration: REDUCE_MOTION ? 0 : 0.22, ease: 'easeOut' }}
            drag={enableDrag ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => { if (info.offset.y > 80) onClose() }}
            role="dialog" aria-modal="true" aria-label="Style mix detail"
          >
            {!isDesktop && (
              <div className="flex justify-center pb-2">
                <div className="w-10 h-1 rounded-full bg-white/15" />
              </div>
            )}
            <div className="flex items-start justify-between gap-3 mb-3 px-1">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-[var(--tier-light)]">
                  Style mix
                </p>
                <h3 className="text-[19px] font-extrabold -tracking-[0.02em] mt-0.5">
                  Last 30 days
                </h3>
                <p className="text-[11.5px] font-bold text-muted mt-1 tabular-nums">
                  {profile?.total || 0} tagged climb{(profile?.total || 0) === 1 ? '' : 's'}
                </p>
              </div>
              <button onClick={onClose} aria-label="Close"
                      className="p-1.5 -mr-1 rounded-full hover:bg-white/[0.06]">
                <X size={16} className="text-muted" />
              </button>
            </div>

            <div className="flex-1 overflow-auto pb-4">
              <div className="flex h-5 rounded-full overflow-hidden bg-white/[0.04] mb-5">
                {STYLE_ORDER.map((s) => (
                  <div key={s} className="h-full"
                       style={{ width: `${profile?.pct[s] || 0}%`, background: STYLE_COLOR[s].c }} />
                ))}
              </div>

              <ul className="space-y-1.5">
                {STYLE_ORDER.map((s) => {
                  const tone = STYLE_COLOR[s]
                  return (
                    <li key={s}
                        className="flex items-center justify-between gap-3 px-3.5 py-3
                                   rounded-2xl bg-black/35 backdrop-blur-md
                                   border-[0.5px] border-white/[0.10]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ background: tone.c }} />
                        <span className="text-[13.5px] font-extrabold leading-tight"
                              style={{ color: tone.light }}>
                          {getStyleLabel(s)}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-[13.5px] font-extrabold tabular-nums">
                          {profile?.pct[s] || 0}%
                        </p>
                        <p className="text-[10px] font-bold text-muted tabular-nums">
                          {profile?.counts[s] || 0} climb{(profile?.counts[s] || 0) === 1 ? '' : 's'}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `cd frontend && npx vite build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/components/StyleMixSheet.jsx
git commit -m "feat(style-profile): StyleMixSheet — drill-down bottom sheet for style mix

Reuses the responsive sheet shell (mobile bottom-anchored, desktop
centered modal) from the Train sheets. Shows a larger stacked bar plus
a 4-row breakdown with per-style count and percent."
```

---

### Task 9: `useHubData` — expose `styleProfile`

**Files:**
- Modify: `frontend/src/hooks/useHubData.js`

Derive the profile once per fetch using `deriveStyleProfile(logs)` and expose it on the hook's return shape so HubTab can read it without doing the math itself.

- [ ] **Step 1: Add the import + computation**

In `/Users/mathewbudnik/coretriage/frontend/src/hooks/useHubData.js`, find the existing `import { sessionForDay } from '../lib/trainSessions'` line and add a sibling import:

```javascript
import { sessionForDay } from '../lib/trainSessions'
import { deriveStyleProfile } from '../lib/styleProfile'
```

Then inside the `useEffect`'s `.then` block, find where the other derived values are computed (`const streakDays = computeStreakDays(logs, today)` etc.) and add:

```javascript
const styleProfile = deriveStyleProfile(logs)
```

Finally, find the `setData({ ... })` call near the bottom of that block and add `styleProfile` to the returned object. The existing block looks like:

```javascript
setData({
  loading: false,
  lastTriage: sessions[0] || null,
  activePlan, todaySession, todayLogged,
  stats,
  hardestSends, pyramidPreview,
  streakDays, weekLoggedDates, isFirstLogOfWeek, isPlanRestDay,
  feedItems, currentProject, recentLogs: logs,
  ...rings,
})
```

Update to:

```javascript
setData({
  loading: false,
  lastTriage: sessions[0] || null,
  activePlan, todaySession, todayLogged,
  stats,
  hardestSends, pyramidPreview,
  streakDays, weekLoggedDates, isFirstLogOfWeek, isPlanRestDay,
  feedItems, currentProject, recentLogs: logs,
  styleProfile,
  ...rings,
})
```

Also update the `EMPTY_HUB_DATA` constant (top of the file) so consumers reading from the cached/empty case don't get `undefined`. Add this entry to the object:

```javascript
styleProfile: { counts: { power:0, dynamic:0, technical:0, endurance:0 }, pct: { power:0, dynamic:0, technical:0, endurance:0 }, total: 0, dominant: null, weakest: null, confidence: 'low' },
```

- [ ] **Step 2: Verify build**

Run: `cd frontend && npx vite build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/hooks/useHubData.js
git commit -m "feat(style-profile): useHubData exposes derived styleProfile

Computes the profile once per fetch and adds it to the hook's return
shape so HubTab can read profile.confidence and profile.pct directly.
EMPTY_HUB_DATA gets a low-confidence placeholder so first-paint
consumers don't see undefined."
```

---

### Task 10: `HubTab` — mount `HubStyleMixCard` + `StyleMixSheet`

**Files:**
- Modify: `frontend/src/components/HubTab.jsx`

Render the card between `HubRingsCard` and `HubTipCard`. Wire up a state-managed sheet for the drill-down.

- [ ] **Step 1: Add imports + state**

Edit `/Users/mathewbudnik/coretriage/frontend/src/components/HubTab.jsx`. Add these imports near the existing component imports:

```jsx
import HubStyleMixCard from './HubStyleMixCard'
import StyleMixSheet from './StyleMixSheet'
import { useState } from 'react'
```

(Keep `useState` import deduplicated if it's already imported. Verify whether `useState` is already imported and only add it if it's not.)

Inside the `HubTab` function body, add:

```jsx
  const [styleSheetOpen, setStyleSheetOpen] = useState(false)
```

- [ ] **Step 2: Render the card + sheet**

Inside the existing render, the current structure is roughly:

```jsx
<HubGreeting user={user} data={data} tierId={tierId} />

<div className="space-y-3">
  <HubRingsCard ... />
  <HubTipCard tip={tip} onDismiss={dismiss} />
  ...
</div>
```

Insert `<HubStyleMixCard>` between `HubRingsCard` and `HubTipCard`:

```jsx
<div className="space-y-3">
  <HubRingsCard
    sends={data.ringSends}
    climbDays={data.ringClimbDays}
    pushAttempts={data.ringPushAttempts}
    streakDays={data.streakDays}
  />
  <HubStyleMixCard
    profile={data.styleProfile}
    onOpen={() => setStyleSheetOpen(true)}
  />
  <HubTipCard tip={tip} onDismiss={dismiss} />
  ...
</div>
```

After the closing `</TierThemeRoot>` of the `HubTab` return, mount the sheet so it overlays everything:

Locate the very end of the `HubTab` return — the structure is something like:

```jsx
return (
  <TierThemeRoot hardest={data.hardestSends} global>
    <div className="...">
      ...
    </div>
  </TierThemeRoot>
)
```

Wrap the `TierThemeRoot` in a fragment and mount the sheet alongside it:

```jsx
return (
  <TierThemeRoot hardest={data.hardestSends} global>
    <div className="...">
      ...
    </div>
    <StyleMixSheet
      open={styleSheetOpen}
      profile={data.styleProfile}
      onClose={() => setStyleSheetOpen(false)}
    />
  </TierThemeRoot>
)
```

(The sheet uses `fixed` positioning so it's fine for it to render inside the TierThemeRoot — the tier CSS vars stay scoped.)

- [ ] **Step 3: Verify build**

Run: `cd frontend && npx vite build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/components/HubTab.jsx
git commit -m "feat(style-profile): mount HubStyleMixCard + StyleMixSheet on Hub

Card sits between rings and tip card. Tapping it opens StyleMixSheet
with the larger breakdown. The card returns null when confidence is
'low' so brand-new users (no tagged climbs) don't see an empty bar."
```

---

### Task 11: `ProfileSetup` — adaptive Weaknesses step

**Files:**
- Modify: `frontend/src/components/ProfileSetup.jsx`

The current case-7 step renders an 8-chip multi-select. We add a banner / skip CTA based on `styleProfile.confidence`. The profile is computed from logs the wizard fetches at mount.

- [ ] **Step 1: Add a logs fetch + derived profile to wizard state**

In `/Users/mathewbudnik/coretriage/frontend/src/components/ProfileSetup.jsx`, find the existing imports at the top and add:

```jsx
import { useMemo, useState, useEffect } from 'react'
import { getTrainingLogs } from '../api'
import { deriveStyleProfile } from '../lib/styleProfile'
import { getStyleLabel } from '../lib/styleColors'
```

(Adjust the existing `import { useMemo, useState } from 'react'` line to include `useEffect`.)

Inside the `ProfileSetup` function body, right after the `const [error, setError] = useState(null)` line, add:

```jsx
  const [logs, setLogs] = useState(null)   // null = not loaded; [] = loaded empty
  useEffect(() => {
    let cancelled = false
    getTrainingLogs(60)
      .then((data) => { if (!cancelled) setLogs(data || []) })
      .catch(() => { if (!cancelled) setLogs([]) })
    return () => { cancelled = true }
  }, [])

  const styleProfile = useMemo(
    () => logs ? deriveStyleProfile(logs) : null,
    [logs],
  )
```

- [ ] **Step 2: Pre-fill weaknesses on first high/medium profile read**

Right after the `styleProfile` `useMemo`, add a follow-up effect that pre-checks the weakness once the profile arrives:

```jsx
  useEffect(() => {
    if (!styleProfile || styleProfile.confidence === 'low') return
    if (!styleProfile.weakest) return
    const map = { power: 'power', dynamic: 'power', technical: 'technique', endurance: 'endurance' }
    const w = map[styleProfile.weakest]
    if (!w) return
    setForm((f) =>
      f.weaknesses.includes(w) ? f : { ...f, weaknesses: [...f.weaknesses, w] }
    )
  }, [styleProfile])
```

- [ ] **Step 3: Replace case 7 with the adaptive variant**

Find the existing `case 7:` block in the `stepBody` switch and replace it with:

```jsx
      case 7: {
        const conf = styleProfile?.confidence
        const weakLabel = getStyleLabel(styleProfile?.weakest)
        const domLabel  = getStyleLabel(styleProfile?.dominant)
        return (
          <>
            <StepHeader stepIndex={step} totalSteps={TOTAL_STEPS}
                        title="What do you want to improve?"
                        subtitle="Optional. Sessions will lean into these areas." />

            {conf === 'medium' && weakLabel && (
              <div className="mb-4 px-3.5 py-3 rounded-2xl
                              bg-[color:color-mix(in_srgb,var(--tier-c)_8%,transparent)]
                              border-[0.5px] border-[color:color-mix(in_srgb,var(--tier-c)_22%,transparent)]">
                <p className="text-[11.5px] font-semibold text-text/85 leading-snug">
                  Based on <b className="tabular-nums">{styleProfile.total}</b> tagged climbs, your
                  weakest style looks like <b style={{ color: 'var(--tier-light)' }}>{weakLabel}</b>.
                  We've pre-checked it — adjust if you disagree.
                </p>
              </div>
            )}

            {conf === 'high' && weakLabel && domLabel && (
              <div className="mb-4 px-3.5 py-3 rounded-2xl
                              bg-[color:color-mix(in_srgb,var(--tier-c)_8%,transparent)]
                              border-[0.5px] border-[color:color-mix(in_srgb,var(--tier-c)_22%,transparent)]">
                <p className="text-[11.5px] font-semibold text-text/85 leading-snug mb-2">
                  From <b className="tabular-nums">{styleProfile.total}</b> tagged climbs:
                  <b style={{ color: 'var(--tier-light)' }}> {domLabel}</b>-heavy,
                  <b style={{ color: 'var(--tier-light)' }}> {weakLabel}</b> is your gap.
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {WEAKNESSES.map((w) => (
                <MultiPill key={w.value} label={w.label}
                           selected={form.weaknesses.includes(w.value)}
                           onClick={() => toggleList('weaknesses', w.value)} />
              ))}
            </div>
          </>
        )
      }
```

(Replace the existing curly-brace-less case-7 body — the version with `return (...)` directly — with the version above, which wraps the case in `{ ... }` so the local `conf`/`weakLabel`/`domLabel` consts have a scope.)

- [ ] **Step 4: Verify build**

Run: `cd frontend && npx vite build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/components/ProfileSetup.jsx
git commit -m "feat(style-profile): adaptive Weaknesses step in wizard

Fetches the last 60 days of training_logs at mount, derives the style
profile, and pre-checks the under-developed weakness mapped onto the
existing taxonomy (dynamic → power, technical → technique, endurance →
endurance). Banner reflects medium vs high confidence with the relevant
counts; low-confidence users see the original 8-chip step unchanged."
```

---

### Task 12: `coach.py` — bias session emphasis + freeze profile

**Files:**
- Modify: `src/coach.py`

The plan generator currently calls `_pick_session(...)` per day from `_goal_template`. We add an optional `style_profile` argument and bias the schedule when one weekly slot can be swapped for an under-developed style. We also freeze the profile snapshot into `plan_data.style_profile`.

Caller side: `generate_training_plan` already accepts `profile` and `injury_flags`. We add an `existing_logs` parameter (callers pass the user's recent training_logs) and compute the profile inline.

- [ ] **Step 1: Add a profile derivation helper at module top**

Open `/Users/mathewbudnik/coretriage/src/coach.py`. Near the top, after the existing imports, add a new helper:

```python
def _derive_style_profile(training_logs):
    """
    Aggregate per-style counts from a list of training_logs records.
    Mirrors the frontend's deriveStyleProfile() exactly so plan-gen and the
    Hub agree on confidence + weakest.

    Returns:
        dict with keys: counts, pct, total, dominant, weakest, confidence
    """
    STYLE_ORDER = ('power', 'dynamic', 'technical', 'endurance')
    counts = {s: 0 for s in STYLE_ORDER}

    for log in training_logs or []:
        climbs = log.get('climbs') or {}
        for discipline in ('boulder', 'route'):
            grades = climbs.get(discipline) or {}
            for entry in grades.values():
                if not isinstance(entry, dict):
                    continue
                styles = entry.get('styles')
                if not isinstance(styles, dict):
                    continue
                for s in STYLE_ORDER:
                    counts[s] += int(styles.get(s) or 0)

    total = sum(counts.values())
    if total >= 20:
        confidence = 'high'
    elif total >= 6:
        confidence = 'medium'
    else:
        confidence = 'low'

    pct = {s: (round((counts[s] / total) * 100) if total else 0) for s in STYLE_ORDER}

    dominant = None
    weakest = None
    if total > 0:
        # First-wins on ties for dominant; last-wins for weakest (mirrors JS).
        dom_count = -1
        for s in STYLE_ORDER:
            if counts[s] > dom_count:
                dom_count = counts[s]
                dominant = s
        weak_count = float('inf')
        for s in reversed(STYLE_ORDER):
            if counts[s] < weak_count:
                weak_count = counts[s]
                weakest = s
    if total < 6:
        weakest = None

    return {
        'counts': counts, 'pct': pct, 'total': total,
        'dominant': dominant, 'weakest': weakest, 'confidence': confidence,
    }
```

- [ ] **Step 2: Add the slot-swap helper**

Below `_derive_style_profile`, add:

```python
# Maps the under-developed style to the session_type we'd swap one slot for.
# Dynamic folds into power (same taxonomy choice as the wizard mapping).
_STYLE_TO_SWAP_SESSION = {
    'endurance': 'endurance',
    'technical': 'technique',
    'power':     'power',
    'dynamic':   'power',
}

# Session types we won't displace — these carry the goal's core stimulus.
_PROTECTED_SESSION_TYPES = ('hangboard', 'project', 'power')

def _apply_style_bias(sessions, style_profile):
    """
    If the climber has a clearly under-developed style (pct < 15) and the
    weekly schedule has a non-protected slot that isn't already that style,
    swap that slot's session_type for the target style. Mutates `sessions`
    in place. Only swaps in the first week — the rest of the plan inherits
    via the existing week-rotation logic in _pick_session.
    """
    if not style_profile or style_profile.get('confidence') == 'low':
        return
    weakest = style_profile.get('weakest')
    if not weakest:
        return
    pct = style_profile.get('pct') or {}
    if pct.get(weakest, 100) >= 15:
        return
    target = _STYLE_TO_SWAP_SESSION.get(weakest)
    if not target:
        return

    # Find the first non-protected week-1 session that isn't already the
    # target type, and swap its session_type. We DON'T regenerate the main
    # block content — the existing block is left intact; only the label
    # changes. UX consequence: the user sees a session labelled e.g.
    # 'endurance' that uses the original goal's main blocks. Acceptable
    # for v1 since the under-developed style still gets explicit airtime.
    for session in sessions:
        if session.get('week') != 1:
            continue
        cur = session.get('type')
        if cur in _PROTECTED_SESSION_TYPES or cur == target:
            continue
        session['type'] = target
        return
```

- [ ] **Step 3: Wire the bias into `generate_training_plan`**

Find `generate_training_plan` in `src/coach.py` (around line 1010). Its current signature is:

```python
def generate_training_plan(
    profile: Dict[str, Any],
    injury_flags: List[str],
    openai_client: Any = None,
) -> Dict[str, Any]:
```

Extend it to accept `existing_logs`:

```python
def generate_training_plan(
    profile: Dict[str, Any],
    injury_flags: List[str],
    openai_client: Any = None,
    existing_logs: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
```

Add `Optional` to the imports if it isn't already (`from typing import Any, Dict, List, Optional`).

Inside the function, after `sessions = _goal_template(...)`, before `if openai_client:`, add:

```python
    style_profile = _derive_style_profile(existing_logs or [])
    _apply_style_bias(sessions, style_profile)
```

And in the returned dict, add `style_profile` to `plan_data`:

```python
    return {
        "name": f"{GOAL_NAMES.get(goal, 'Custom')} — {experience.title()} Plan",
        "phase": GOAL_PHASES.get(goal, "base"),
        "duration_weeks": 4,
        "start_date": str(date.today()),
        "plan_data": {
            "sessions": sessions,
            "week_meta": week_meta,
            "injury_note": injury_note,
            "goal": goal,
            "experience": experience,
            "days_per_week": days,
            "training_days": training_days,
            "style_profile": style_profile,
        },
    }
```

- [ ] **Step 4: Make the caller pass `existing_logs`**

Find the existing `generate_training_plan(...)` call in `main.py` (search for the function name). It's invoked from the `POST /api/plans/generate` handler. Around the call site, look for where the user's training logs would already be available, OR add a fetch:

```bash
grep -n "generate_training_plan" /Users/mathewbudnik/coretriage/main.py
```

Update the call site to pass `existing_logs=get_training_logs(user["id"], limit=60)`. Look for the existing `get_training_logs` import at the top of `main.py` — if it's already imported you just need to pass it:

```python
existing_logs = get_training_logs(user["id"], limit=60)
plan = generate_training_plan(
    profile,
    injury_flags,
    openai_client=_openai_client,
    existing_logs=existing_logs,
)
```

If `get_training_logs` isn't imported at the top of `main.py`, add it to the existing `from database import ...` line.

- [ ] **Step 5: Probe the new shape**

Run from `/Users/mathewbudnik/coretriage`:

```bash
python -c "
from src.coach import _derive_style_profile, _apply_style_bias
logs = [
    {'climbs': {'boulder': {'V3': {'s': 10, 'styles': {'power': 10, 'dynamic': 0, 'technical': 0, 'endurance': 0}}}}},
    {'climbs': {'boulder': {'V4': {'s': 8,  'styles': {'power': 0, 'dynamic': 0, 'technical': 8, 'endurance': 0}}}}},
    {'climbs': {'boulder': {'V5': {'s': 3,  'styles': {'power': 0, 'dynamic': 3, 'technical': 0, 'endurance': 0}}}}},
]
p = _derive_style_profile(logs)
print('total:', p['total'], 'weakest:', p['weakest'], 'confidence:', p['confidence'])

# Synthetic week-1 schedule with a non-protected slot
sessions = [
    {'week': 1, 'day_in_week': 1, 'type': 'hangboard'},
    {'week': 1, 'day_in_week': 2, 'type': 'strength'},
    {'week': 1, 'day_in_week': 3, 'type': 'project'},
]
_apply_style_bias(sessions, p)
print('after bias:', [s['type'] for s in sessions])
"
```

Expected: total 21, weakest 'endurance', confidence 'high'. After bias: `['hangboard', 'endurance', 'project']` — the strength slot was swapped for endurance.

- [ ] **Step 6: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add src/coach.py main.py
git commit -m "feat(style-profile): plan-gen biases session emphasis by under-developed style

_derive_style_profile mirrors the frontend helper. _apply_style_bias
swaps one non-protected week-1 slot for the target style when the
weakest style is < 15% of tagged climbs and confidence isn't low.
generate_training_plan now accepts existing_logs and freezes the
profile snapshot into plan_data.style_profile so plans stay stable
even as the user logs more climbs."
```

---

### Task 13: Manual phone verification

**Files:**
- None (verification only)

Walk through the new surfaces at iPhone 13 mini width (375px). Frontend has no Vitest, so this is the integration gate.

- [ ] **Step 1: Start the dev server**

Run: `cd frontend && npm run dev`
Expected: `http://localhost:5173` starts.

- [ ] **Step 2: Walk through each scenario**

In DevTools at 375px width, exercise each row below. Tick the row when it passes.

| Scenario | Expected |
|---|---|
| **Brand-new user (no logs)** opens Hub | `HubStyleMixCard` is hidden (confidence === 'low'). |
| **Log a session** with 8 climbs all tagged Power | `useHubData` re-fetch shows `styleProfile.total === 8`, dominant === 'power'. Card now visible on Hub. |
| **Tap a different chip** mid-session (Power → Technical) | Subsequent +/- increments attribute to Technical. Stored in the `styles` map under the relevant grade. |
| **Hit -1 on a Power V3 send** | The styles map's `power` count decrements by 1; sum-of-styles still equals s+f+p. |
| **Open Hub stacked bar** | 4 colored segments matching `pct`. Tap the card → StyleMixSheet opens. |
| **Wizard with < 6 tagged climbs** | Step 7 shows the existing 8-chip multi-select with no banner. |
| **Wizard with 6–19 tagged climbs** | Banner appears: "Based on N tagged climbs, your weakest style looks like X. We've pre-checked it…" — relevant chip is pre-checked. |
| **Wizard with ≥ 20 tagged climbs** | Banner reads "From N tagged climbs: <dom>-heavy, <weak> is your gap." Chip is pre-checked. |
| **Generate a plan with a heavy Power profile (Endurance < 15%)** | At least one week-1 session in `plan_data.sessions` is type 'endurance'. |
| **Generate a plan with a balanced profile** | No swap happens (all pct values >= 15). |
| **Plan data freezes** | After regenerating the plan with a different style mix, the OLD plan still has its original `plan_data.style_profile` — only the new plan reflects the new mix. |
| **Tap targets** | All chips, +/-, and sheet handles are >= 44×44px. |
| **No emojis** | Inspect every text node — only lucide icons. |

- [ ] **Step 3: Run all smoke tests**

Run from `/Users/mathewbudnik/coretriage`:

```bash
node frontend/scripts/smoke-styleColors.mjs
node frontend/scripts/smoke-styleProfile.mjs
node frontend/scripts/smoke-trainSessions.mjs
node frontend/scripts/smoke-sessionType.mjs
```

Expected: each prints `OK ...`.

- [ ] **Step 4: Final build**

Run: `cd frontend && npx vite build`
Expected: clean build, no warnings related to style-profile files.

- [ ] **Step 5: Commit (only if any small fixes landed)**

If no changes during verification, skip. Otherwise:

```bash
cd /Users/mathewbudnik/coretriage
git add -p
git commit -m "fix(style-profile): post-verification tweaks

[describe any specific fixes]"
```

---

## Self-review

**1. Spec coverage**

| Spec requirement | Plan task |
|---|---|
| Lean 4 vocabulary | Task 1 (STYLE_ORDER + STYLE_COLOR) |
| Sibling `styles` map on grade counters | Task 4 |
| Sticky style-chip strip | Task 3 |
| Active-style persistence (localStorage) | Task 5 |
| TrainingLogRequest accepts new shape | Task 6 |
| Profile derivation helper + confidence gate | Task 2 |
| Hub stacked-bar card | Task 7 |
| Drill-down sheet | Task 8 |
| useHubData exposes profile | Task 9 |
| HubTab mounts card + sheet | Task 10 |
| Adaptive wizard step (low/medium/high) | Task 11 |
| Style→weakness mapping | Task 11 (`map` literal in pre-fill effect) |
| Plan-gen bias by under-developed style | Task 12 |
| Profile frozen into plan_data | Task 12 |
| Backwards-compat with legacy logs | Task 2 (untagged logs skipped); Task 6 (Optional shape) |
| Color tokens dedicated module | Task 1 |
| Manual phone verification | Task 13 |

All spec sections have a task.

**2. Placeholder scan**

- No `TBD`, `TODO`, or "implement later" strings.
- Task 13 has one explicit `[describe any specific fixes]` placeholder inside an _optional_ commit message — clearly marked as fill-in.
- Every code-touching step shows the actual code or command. No "similar to Task N" cross-references.

**3. Type consistency**

- `STYLE_ORDER` is `['power', 'dynamic', 'technical', 'endurance']` — used identically in Task 1 (JS), Task 2 (smoke), Task 12 (`STYLE_ORDER = ('power', 'dynamic', 'technical', 'endurance')` Python tuple).
- `STYLE_COLOR[s].c` / `.light` / `.deep` keys are consistent across Task 1, Task 3, Task 7, Task 8.
- `deriveStyleProfile` returns `{counts, pct, total, dominant, weakest, confidence}` — same fields read in Task 7, Task 8, Task 9, Task 11.
- `_derive_style_profile` (Python) returns the same dict keys for consistency with the JS version.
- Grade-counter payload `{ s, f, p, styles }` flows from Task 4 (GradeCounterRow) → Task 5 (ClimbLogSection.updateCounter) → Task 6 (TrainingLogRequest accepts `Dict[str, Any]`).
- `STYLE_TO_SWAP_SESSION` keys match the four `STYLE_ORDER` values. Target values (`endurance`/`technique`/`power`) match the keys in coach.py's existing schedule maps.

Plan is consistent.
