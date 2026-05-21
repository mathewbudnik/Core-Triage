# RPG Climber — Phase 2: Logging UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing climb-counter form with two complementary logging surfaces — `<LogSendQuick>` (single-climb, primary entry) and `<LogSendDeep>` (multi-grade counters, behind an expander). Wire `<RewardPreview>` live into both. Replace the prior "last meaningful celebration" handling with a session-summary overlay that correctly attributes every level-up and PR across a multi-send batch. As foundational work, reconcile the legacy 4-chip style vocabulary (`power, dynamic, technical, endurance`) with the spec-§7.3 5-chip vocabulary (`powerful, crimpy, dynamic, technical, mobility`) so the reward engine actually sees the user's style selection.

**Architecture:** Style taxonomy is reconciled first (Tasks 1–3): one source of truth in `lib/styleColors.js` with 5 chips, plus a small migration shim in `lib/styleStore.js` that promotes legacy localStorage values on first read. With that locked, `<LogSendQuick>` is a single-card form (grade picker, outcome pills, style chip, modality auto-derived from `session_type`) that calls `calculateSendXP()` on every render to drive a live `<RewardPreview>`. Submit runs the same `logTraining()` POST + `logSends()` engine pipeline today's form uses, just with a one-send payload. `<LogSendDeep>` is the existing `ClimbLogSection` lifted into its own component with a `<RewardPreview>` summary row that totals the in-progress climbs. `TrainingLogEntry` becomes a thin shell: session metadata at top, mode toggle (Quick · Deep) in the middle, the active surface below, submit at the bottom. Multi-send celebrations get a `<SessionSummaryOverlay>` that lists every send + every level-up + every PR in one mounted dialog instead of cherry-picking "the last interesting event."

**Tech Stack:** React 18, Vite, Tailwind 3.4, Framer Motion 11, Vitest. No new deps.

---

## File structure (new + modified)

### New files

- `frontend/src/lib/styleStore.js` — single source of truth for the active climb-style chip (localStorage-backed, with one-shot legacy migration).
- `frontend/src/lib/styleStore.test.js` — get/set/migration tests.
- `frontend/src/components/ui/LogSendQuick.jsx` — primary single-climb logging surface.
- `frontend/src/components/ui/LogSendQuick.test.jsx` — interaction + reward-preview tests.
- `frontend/src/components/ui/LogSendDeep.jsx` — wraps `ClimbLogSection` + adds `RewardPreview` total row.
- `frontend/src/components/ui/SessionSummaryOverlay.jsx` — full-session celebration (replaces the single-event overlay path for multi-send saves).
- `frontend/src/components/ui/LogModeToggle.jsx` — small Quick · Deep segmented control.
- `frontend/src/lib/sendPreview.js` — pure helper that takes a partial draft + engine state → returns `{ xp, breakdown }` for `RewardPreview`.
- `frontend/src/lib/sendPreview.test.js` — unit tests for the preview helper.

### Modified files

- `frontend/src/lib/styleColors.js` — extend `STYLE_ORDER` from 4 → 5 chips (drop `endurance`, add `crimpy`, add `mobility`; rename `power` → `powerful` for symmetry with engine; keep `dynamic`/`technical`).
- `frontend/src/components/StyleChipStrip.jsx` — icon map gains `crimpy`/`mobility`; loses `endurance`; layout grows to 5 columns.
- `frontend/src/components/ClimbLogSection.jsx` — reads/writes via `styleStore` instead of touching localStorage directly; default chip becomes `'powerful'`.
- `frontend/src/components/GradeCounterRow.jsx` — STYLE_ORDER reads pick up the new entries automatically; verify the counter-drain logic still works with 5 chips.
- `frontend/src/components/HubStyleMixCard.jsx`, `frontend/src/components/StyleMixSheet.jsx`, `frontend/src/components/hub/HubStyleStrip.jsx`, `frontend/src/lib/styleProfile.js` — touch only to the extent that `STYLE_ORDER` length is now 5 (mostly free — the maps already iterate `STYLE_ORDER`).
- `frontend/src/components/TrainingLogEntry.jsx` — major restructure: session metadata stays, the inline `ClimbLogSection` is replaced with a `<LogModeToggle>` + the active surface. The existing climbs-walk → `logSends()` save path is preserved but routed through both Quick and Deep payloads.
- `frontend/src/lib/rewardEngine.js` — additive only: expose a derived `selectorComputeStatShape(state)` so `<LogSendQuick>` can preview gap multipliers without re-reaching into engine internals.
- `frontend/src/index.css` — one new `@keyframes` for the summary overlay's row stagger if Framer can't carry it inline (only if needed; default is to do it in Framer).

### Deleted

- Nothing in Phase 2. The legacy chip key `'endurance'` is migrated, not deleted from history — old localStorage entries map to `'mobility'` (closest semantic match: sustained joint-loading climbing) on read.

---

## Task 1: Reconcile `styleColors.js` to the 5-chip vocabulary

**Why first:** Every downstream piece (Quick log, Deep log, RewardPreview, the engine's gap multiplier) reads from `STYLE_ORDER`. Locking the canonical list before touching consumers prevents two flavors of breakage.

**Files:**
- Modify: `frontend/src/lib/styleColors.js` (full rewrite of the 4 exports)

- [ ] **Step 1: Replace the file contents**

```js
/**
 * Color tokens + display labels for the five climb styles. Mirrors the
 * five stat axes in lib/stats.js so chips, stat radar, HubStyleStrip,
 * and the reward engine all read identically.
 *
 *   powerful   — explosive, contact-strength climbs
 *   crimpy     — finger-tension dominant climbs
 *   dynamic    — committing, momentum-based climbs
 *   technical  — body-position-dependent climbs
 *   mobility   — range / flexibility dominant climbs
 */
export const STYLE_ORDER = ['powerful', 'crimpy', 'dynamic', 'technical', 'mobility']

export const STYLE_COLOR = {
  powerful:  { c: '#fb7185', light: '#fda4af', deep: '#7f1d2c' },   // Phoenix coral
  crimpy:    { c: '#94a3b8', light: '#cbd5e1', deep: '#334155' },   // Granite slate
  dynamic:   { c: '#f97316', light: '#fb923c', deep: '#7c2d12' },   // Coral orange
  technical: { c: '#8b5cf6', light: '#a78bfa', deep: '#4c1d95' },   // Amethyst violet
  mobility:  { c: '#86efac', light: '#bbf7d0', deep: '#14532d' },   // Sage green
}

const STYLE_LABEL = {
  powerful:  'Powerful',
  crimpy:    'Crimpy',
  dynamic:   'Dynamic',
  technical: 'Technical',
  mobility:  'Mobility',
}

export function getStyleLabel(key) {
  return STYLE_LABEL[key] ?? key
}
```

- [ ] **Step 2: Run the existing test suite to confirm what breaks**

Run: `cd frontend && npm test -- --run`
Expected: tests pass that don't touch chip vocabulary; any test referencing `power` / `endurance` chip ids fails or is unaffected. Note the failure list before moving on.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/styleColors.js
git commit -m "feat(styles): reconcile chip vocabulary to 5-chip RPG taxonomy"
```

---

## Task 2: Update `StyleChipStrip` for 5 chips

**Files:**
- Modify: `frontend/src/components/StyleChipStrip.jsx` (icon map + grid columns)

- [ ] **Step 1: Update icon imports + map**

Replace the lucide-react import line and `STYLE_ICON` object:

```jsx
import { Zap, Grip, Wind, Compass, StretchHorizontal } from 'lucide-react'

const STYLE_ICON = {
  powerful:  Zap,
  crimpy:    Grip,
  dynamic:   Wind,
  technical: Compass,
  mobility:  StretchHorizontal,
}
```

- [ ] **Step 2: Change the grid to 5 columns**

Find the `<div className="grid grid-cols-4 gap-1.5">` line. Change `grid-cols-4` to `grid-cols-5`. Reduce `gap-1.5` to `gap-1` so 5 chips fit on a 360px-wide phone.

- [ ] **Step 3: Update the JSDoc `value` union**

Find the `* Props:` block. Update the value union to:

```jsx
 *   value:     'powerful' | 'crimpy' | 'dynamic' | 'technical' | 'mobility'
 *   onChange:  (next: string) => void
```

- [ ] **Step 4: Run the dev server and eyeball the strip**

Run: `cd frontend && npm run dev`
Manually: open Train tab, expand "Log climbs", confirm 5 chips render with icons, taps switch active chip.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/StyleChipStrip.jsx
git commit -m "feat(styles): StyleChipStrip renders 5 chips with new icons"
```

---

## Task 3: Build `lib/styleStore.js` with legacy migration

**Why:** Centralizes localStorage access for the active chip. Migrates old `'power'` → `'powerful'` and `'endurance'` → `'mobility'` on first read so existing climbers don't start fresh with the chip defaulted away from their habit.

**Files:**
- Create: `frontend/src/lib/styleStore.js`
- Create: `frontend/src/lib/styleStore.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// frontend/src/lib/styleStore.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { getActiveStyle, setActiveStyle, STYLE_STORAGE_KEY } from './styleStore.js'

describe('styleStore', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      _data: {},
      getItem(k) { return this._data[k] ?? null },
      setItem(k, v) { this._data[k] = String(v) },
      removeItem(k) { delete this._data[k] },
    }
  })

  it('returns the default "powerful" when nothing is stored', () => {
    expect(getActiveStyle()).toBe('powerful')
  })

  it('returns a valid stored chip key unchanged', () => {
    localStorage.setItem(STYLE_STORAGE_KEY, 'crimpy')
    expect(getActiveStyle()).toBe('crimpy')
  })

  it('migrates legacy "power" → "powerful" and rewrites storage', () => {
    localStorage.setItem(STYLE_STORAGE_KEY, 'power')
    expect(getActiveStyle()).toBe('powerful')
    expect(localStorage.getItem(STYLE_STORAGE_KEY)).toBe('powerful')
  })

  it('migrates legacy "endurance" → "mobility" and rewrites storage', () => {
    localStorage.setItem(STYLE_STORAGE_KEY, 'endurance')
    expect(getActiveStyle()).toBe('mobility')
    expect(localStorage.getItem(STYLE_STORAGE_KEY)).toBe('mobility')
  })

  it('falls back to "powerful" on a junk value and rewrites storage', () => {
    localStorage.setItem(STYLE_STORAGE_KEY, 'banana')
    expect(getActiveStyle()).toBe('powerful')
    expect(localStorage.getItem(STYLE_STORAGE_KEY)).toBe('powerful')
  })

  it('setActiveStyle accepts a valid key and rejects junk', () => {
    setActiveStyle('mobility')
    expect(localStorage.getItem(STYLE_STORAGE_KEY)).toBe('mobility')
    setActiveStyle('banana')
    expect(localStorage.getItem(STYLE_STORAGE_KEY)).toBe('mobility')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npm test -- --run styleStore`
Expected: FAIL with "Cannot find module './styleStore.js'"

- [ ] **Step 3: Implement the module**

```js
// frontend/src/lib/styleStore.js
import { STYLE_ORDER } from './styleColors.js'

export const STYLE_STORAGE_KEY = 'ct_climb_style'
const DEFAULT_STYLE = 'powerful'

const LEGACY_MIGRATIONS = {
  power:     'powerful',
  endurance: 'mobility',
}

function safeRead() {
  try { return globalThis.localStorage?.getItem(STYLE_STORAGE_KEY) ?? null }
  catch { return null }
}

function safeWrite(value) {
  try { globalThis.localStorage?.setItem(STYLE_STORAGE_KEY, value) }
  catch { /* ignore */ }
}

export function getActiveStyle() {
  const raw = safeRead()
  if (raw && STYLE_ORDER.includes(raw)) return raw
  if (raw && LEGACY_MIGRATIONS[raw]) {
    const migrated = LEGACY_MIGRATIONS[raw]
    safeWrite(migrated)
    return migrated
  }
  if (raw !== null && raw !== DEFAULT_STYLE) safeWrite(DEFAULT_STYLE)
  return DEFAULT_STYLE
}

export function setActiveStyle(key) {
  if (!STYLE_ORDER.includes(key)) return
  safeWrite(key)
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test -- --run styleStore`
Expected: 6/6 PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/styleStore.js frontend/src/lib/styleStore.test.js
git commit -m "feat(styles): styleStore — localStorage-backed chip with legacy migration"
```

---

## Task 4: Route `ClimbLogSection` through `styleStore`

**Why:** Removes a direct `localStorage` touch from a component, and means the legacy migration happens automatically the first time a returning climber opens the Train tab.

**Files:**
- Modify: `frontend/src/components/ClimbLogSection.jsx`

- [ ] **Step 1: Replace the manual localStorage code**

Find at top of file:

```jsx
import { STYLE_ORDER } from '../lib/styleColors'

const STYLE_STORAGE_KEY = 'ct_climb_style'
```

Replace with:

```jsx
import { STYLE_ORDER } from '../lib/styleColors'
import { getActiveStyle, setActiveStyle } from '../lib/styleStore'
```

- [ ] **Step 2: Replace the useState initializer**

Find inside `ClimbLogSection`:

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

Replace with:

```jsx
const [activeStyle, _setActiveStyle] = useState(getActiveStyle)

function changeStyle(next) {
  _setActiveStyle(next)
  setActiveStyle(next)
}
```

Then update the `<StyleChipStrip>` instance from `onChange={setActiveStyle}` to `onChange={changeStyle}`.

- [ ] **Step 3: Run the dev server and confirm Train tab still works**

Run: `cd frontend && npm run dev`
Manually: open Train tab, expand "Log climbs", switch chip, reload — selection persists.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ClimbLogSection.jsx
git commit -m "refactor(climb-log): route active style through styleStore"
```

---

## Task 5: Replace the `'power'`-string fallback in `TrainingLogEntry`

**Why:** The Phase 1 handler reads `localStorage.getItem('ct_climb_style')` directly with `'powerful'` as a fallback. With Task 4 done, this becomes a single call into `styleStore`.

**Files:**
- Modify: `frontend/src/components/TrainingLogEntry.jsx`

- [ ] **Step 1: Replace the raw localStorage block**

Find lines 220–225 in `TrainingLogEntry.jsx`:

```jsx
// Style is tracked locally in ClimbLogSection and persisted in localStorage.
let stylePrimary = 'powerful'
try {
  const storedStyle = localStorage.getItem('ct_climb_style')
  if (storedStyle) stylePrimary = storedStyle
} catch { /* ignore */ }
```

Replace with:

```jsx
import { getActiveStyle } from '../lib/styleStore'
// ...inside performSave, replace the block:
const stylePrimary = getActiveStyle()
```

(Move the import to the top with the others.)

- [ ] **Step 2: Run the test suite**

Run: `cd frontend && npm test -- --run`
Expected: all prior 62 tests still pass; no new failures.

- [ ] **Step 3: Manual smoke**

Open Train, log a single boulder send (V3, 1 send, style: crimpy), save. Open the Hub. Confirm the stat radar's `crimpy` axis incremented (not `powerful`).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/TrainingLogEntry.jsx
git commit -m "refactor(train): TrainingLogEntry reads active style via styleStore"
```

---

## Task 6: `lib/sendPreview.js` — pure XP-preview helper

**Why:** Both Quick and Deep surfaces will call `calculateSendXP()` plus the PR check and modality derivation. Pulling it into one pure function keeps the component code thin and gives us a single place to unit-test the preview math against the engine.

**Files:**
- Create: `frontend/src/lib/sendPreview.js`
- Create: `frontend/src/lib/sendPreview.test.js`

- [ ] **Step 1: Write the failing test**

```js
// frontend/src/lib/sendPreview.test.js
import { describe, it, expect } from 'vitest'
import { previewSendXP, modalityFromSessionType } from './sendPreview.js'
import { getInitialState } from './rewardEngine.js'

describe('modalityFromSessionType', () => {
  it('maps outdoor session to outdoor modality', () => {
    expect(modalityFromSessionType('outdoor')).toBe('outdoor')
  })
  it('maps indoor session types to indoor modality', () => {
    expect(modalityFromSessionType('bouldering')).toBe('indoor')
    expect(modalityFromSessionType('routes')).toBe('indoor')
  })
  it('maps non-climb session types to indoor (no effect on null grade)', () => {
    expect(modalityFromSessionType('hangboard')).toBe('indoor')
  })
})

describe('previewSendXP', () => {
  const state = getInitialState()

  it('returns 0 + empty breakdown when grade is missing', () => {
    const { xp, breakdown } = previewSendXP({
      grade: null, outcome: 'redpoint', stylePrimary: 'powerful',
      sessionType: 'bouldering',
    }, state)
    expect(xp).toBe(0)
    expect(breakdown).toBe('')
  })

  it('matches calculateSendXP for a V3 flash indoor', () => {
    const { xp, breakdown } = previewSendXP({
      grade: 'V3', outcome: 'flash', stylePrimary: 'powerful',
      sessionType: 'bouldering',
    }, state)
    // V3 base 55, indoor 1.0, flash 2.0, no PR (no prior sends), gap 1.0, deep 1.0
    expect(xp).toBe(110)
    expect(breakdown).toContain('V3')
    expect(breakdown).toContain('flash')
    expect(breakdown).toContain('indoor')
  })

  it('flags PR multiplier when grade exceeds bestPerStyle', () => {
    const stateWithBest = {
      ...getInitialState(),
      bestPerStyle: { powerful: 2, crimpy: null, dynamic: null, technical: null, mobility: null },
    }
    const { xp, breakdown } = previewSendXP({
      grade: 'V4', outcome: 'redpoint', stylePrimary: 'powerful',
      sessionType: 'outdoor',
    }, stateWithBest)
    // V4 base 80, outdoor 1.5, redpoint 1.0, PR 1.5, gap (powerful is bottom of empty shape) — 
    // since all axes are 0, ordering by value puts powerful first → gap 1.5
    // Floor(80 × 1.5 × 1.0 × 1.5 × 1.5) = Floor(270) = 270
    expect(xp).toBe(270)
    expect(breakdown).toContain('PR')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npm test -- --run sendPreview`
Expected: FAIL with "Cannot find module './sendPreview.js'"

- [ ] **Step 3: Implement the helper**

```js
// frontend/src/lib/sendPreview.js
import { calculateSendXP } from './xp.js'
import { gradeStringToNum } from './gradeUtil.js'
import { deriveStatShape } from './stats.js'

export function modalityFromSessionType(sessionType) {
  if (sessionType === 'outdoor') return 'outdoor'
  return 'indoor'
}

function isPersonalRecordFor(grade, stylePrimary, state) {
  const num = gradeStringToNum(grade)
  if (num === null) return false
  const best = state?.bestPerStyle?.[stylePrimary]
  if (best === null || best === undefined) return true
  return num > best
}

export function previewSendXP(draft, state) {
  const { grade, outcome, stylePrimary, sessionType, isDeepLog = false } = draft
  if (!grade) return { xp: 0, breakdown: '' }

  const modality = modalityFromSessionType(sessionType)
  const isPersonalRecord = isPersonalRecordFor(grade, stylePrimary, state)
  const climberStatShape = deriveStatShape(state?.sends ?? [])
  const xp = calculateSendXP({
    grade, modality, outcome, stylePrimary, isPersonalRecord,
    climberStatShape, isDeepLog, sessionPosition: 0,
  })

  const parts = [grade]
  if (outcome === 'flash')    parts.push('flash')
  if (outcome === 'redpoint') parts.push('redpoint')
  if (outcome === 'project')  parts.push('project')
  parts.push(modality)
  if (isPersonalRecord) parts.push('PR')
  return { xp, breakdown: parts.join(' · ') }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test -- --run sendPreview`
Expected: 6/6 PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/sendPreview.js frontend/src/lib/sendPreview.test.js
git commit -m "feat(engine): sendPreview pure helper for live XP estimates"
```

---

## Task 7: `<LogSendQuick>` — the new primary logging surface

**Files:**
- Create: `frontend/src/components/ui/LogSendQuick.jsx`

- [ ] **Step 1: Implement the component**

```jsx
// frontend/src/components/ui/LogSendQuick.jsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import StyleChipStrip from '../StyleChipStrip'
import RewardPreview from './RewardPreview'
import { getActiveStyle, setActiveStyle } from '../../lib/styleStore'
import { previewSendXP } from '../../lib/sendPreview'
import { TRANSITIONS, useReducedTransition } from '../../lib/motion'

const QUICK_GRADES_BOULDER = ['V0','V1','V2','V3','V4','V5','V6','V7','V8','V9','V10']

const OUTCOMES = [
  { id: 'flash',    label: 'Flash',    helper: 'First try' },
  { id: 'redpoint', label: 'Redpoint', helper: 'Worked it' },
  { id: 'project',  label: 'Project',  helper: 'Sessions of work' },
]

/**
 * Single-climb logging surface. The primary entry point on Train.
 *
 * Props:
 *   sessionType: string — passed from TrainingLogEntry (drives modality)
 *   engineState: object — current rewardEngine state (for PR + gap preview)
 *   onCommit:    ({ grade, outcome, stylePrimary }) => void — single-send draft to add to the parent's climbs payload
 */
export default function LogSendQuick({ sessionType, engineState, onCommit }) {
  const [grade, setGrade]       = useState(null)
  const [outcome, setOutcome]   = useState('redpoint')
  const [style, setStyle]       = useState(getActiveStyle)
  const tap = useReducedTransition(TRANSITIONS.chip_tap)

  const draft = { grade, outcome, stylePrimary: style, sessionType }
  const { xp, breakdown } = previewSendXP(draft, engineState)

  function commitStyle(next) {
    setStyle(next)
    setActiveStyle(next)
  }

  function handleAdd() {
    if (!grade) return
    onCommit({ grade, outcome, stylePrimary: style })
    setGrade(null)
  }

  return (
    <div className="space-y-3">
      <p className="ct-eyebrow">Log a send</p>

      <div className="overflow-x-auto -mx-3 px-3 no-scrollbar">
        <div className="flex gap-2 min-w-max">
          {QUICK_GRADES_BOULDER.map((g) => {
            const active = g === grade
            return (
              <motion.button
                key={g}
                type="button"
                onClick={() => setGrade(g)}
                whileTap={{ scale: 0.94 }}
                transition={tap}
                aria-pressed={active}
                className={[
                  'px-3 py-2 rounded-xl text-sm font-bold border',
                  active
                    ? 'bg-ct-terracotta/15 border-ct-terracotta/45 text-ct-terra-soft'
                    : 'bg-transparent border-ct-hairline text-ct-cream/70',
                ].join(' ')}
              >
                {g}
              </motion.button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {OUTCOMES.map((o) => {
          const active = o.id === outcome
          return (
            <motion.button
              key={o.id}
              type="button"
              onClick={() => setOutcome(o.id)}
              whileTap={{ scale: 0.96 }}
              transition={tap}
              aria-pressed={active}
              className={[
                'flex flex-col items-start px-3 py-2 rounded-xl border text-left',
                active
                  ? 'bg-ct-moss/15 border-ct-moss/40 text-ct-cream'
                  : 'bg-transparent border-ct-hairline text-ct-cream/70',
              ].join(' ')}
            >
              <span className="text-sm font-bold">{o.label}</span>
              <span className="text-[10px] opacity-70">{o.helper}</span>
            </motion.button>
          )
        })}
      </div>

      <StyleChipStrip value={style} onChange={commitStyle} />

      <RewardPreview xp={xp} breakdown={breakdown || 'Pick a grade'} />

      <button
        type="button"
        disabled={!grade}
        onClick={handleAdd}
        className={[
          'w-full py-2.5 rounded-xl text-sm font-bold',
          grade
            ? 'bg-ct-terracotta text-white'
            : 'bg-ct-cream/10 text-ct-cream/40 cursor-not-allowed',
        ].join(' ')}
      >
        {grade ? `Add ${grade}` : 'Pick a grade'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Smoke render in `/design-system`**

Add to `frontend/src/components/DesignSystem.jsx` a `<LogSendQuick sessionType="bouldering" engineState={getInitialState()} onCommit={console.log} />` block under a "Logging UX" heading. Run dev server, open `/design-system`, confirm the grade strip, outcome row, style chips, reward preview, and commit button all render and interact correctly.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/LogSendQuick.jsx frontend/src/components/DesignSystem.jsx
git commit -m "feat(log): LogSendQuick — single-climb logging surface"
```

---

## Task 8: `<LogSendDeep>` — multi-grade counters with live XP total

**Why:** Deep mode is the existing `ClimbLogSection` plus a live XP-total row at the top so users can see how their counter taps roll up to a session XP estimate.

**Files:**
- Create: `frontend/src/components/ui/LogSendDeep.jsx`

- [ ] **Step 1: Implement**

```jsx
// frontend/src/components/ui/LogSendDeep.jsx
import { useMemo } from 'react'
import ClimbLogSection from '../ClimbLogSection'
import RewardPreview from './RewardPreview'
import { getActiveStyle } from '../../lib/styleStore'
import { previewSendXP } from '../../lib/sendPreview'

/**
 * Multi-grade session logging surface. Wraps ClimbLogSection and shows a live
 * XP roll-up across every counter.
 *
 * Props:
 *   value:       { boulder?: {...}, route?: {...} } — current climbs dict
 *   onChange:    (next) => void
 *   sessionType: string
 *   engineState: object
 */
export default function LogSendDeep({ value, onChange, sessionType, engineState }) {
  const { totalXP, totalSends } = useMemo(() => {
    const style = getActiveStyle()
    let xpSum = 0
    let count = 0
    for (const discipline of ['boulder', 'route']) {
      const gradeMap = value?.[discipline] || {}
      for (const [grade, counters] of Object.entries(gradeMap)) {
        if (!counters) continue
        for (let i = 0; i < (counters.s || 0); i++) {
          xpSum += previewSendXP({ grade, outcome: 'redpoint', stylePrimary: style, sessionType }, engineState).xp
          count += 1
        }
        for (let i = 0; i < (counters.f || 0); i++) {
          xpSum += previewSendXP({ grade, outcome: 'flash', stylePrimary: style, sessionType }, engineState).xp
          count += 1
        }
      }
    }
    return { totalXP: xpSum, totalSends: count }
  }, [value, sessionType, engineState])

  return (
    <div className="space-y-3">
      <p className="ct-eyebrow">Log a session</p>
      <RewardPreview
        xp={totalXP}
        breakdown={totalSends > 0 ? `${totalSends} send${totalSends === 1 ? '' : 's'}` : 'No climbs yet'}
        label="SESSION TOTAL"
      />
      <ClimbLogSection value={value} onChange={onChange} />
    </div>
  )
}
```

- [ ] **Step 2: Smoke render in `/design-system`**

Add a `<LogSendDeep value={{boulder:{V3:{s:1,f:0,p:0}}}} onChange={console.log} sessionType="bouldering" engineState={getInitialState()} />` block. Confirm the XP total updates when you tap counters inside the expanded `ClimbLogSection`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/LogSendDeep.jsx frontend/src/components/DesignSystem.jsx
git commit -m "feat(log): LogSendDeep — session logging with live XP roll-up"
```

---

## Task 9: `<LogModeToggle>` — Quick · Deep segmented control

**Files:**
- Create: `frontend/src/components/ui/LogModeToggle.jsx`

- [ ] **Step 1: Implement**

```jsx
// frontend/src/components/ui/LogModeToggle.jsx
const MODES = [
  { id: 'quick', label: 'Quick', helper: 'One send' },
  { id: 'deep',  label: 'Deep',  helper: 'Full session' },
]

export default function LogModeToggle({ value, onChange }) {
  return (
    <div className="flex bg-ct-forest-deep/60 rounded-xl p-1 border border-ct-hairline">
      {MODES.map((m) => {
        const active = m.id === value
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            aria-pressed={active}
            className={[
              'flex-1 flex flex-col items-center py-2 rounded-lg transition-colors',
              active
                ? 'bg-ct-terracotta/15 text-ct-terra-soft'
                : 'text-ct-cream/60',
            ].join(' ')}
          >
            <span className="text-xs font-bold">{m.label}</span>
            <span className="text-[9px] opacity-70">{m.helper}</span>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/ui/LogModeToggle.jsx
git commit -m "feat(log): LogModeToggle — Quick · Deep segmented control"
```

---

## Task 10: `<SessionSummaryOverlay>` — multi-send celebration

**Why:** Phase 1's celebration logic picks "the last interesting event" — if an early send levels you up and a later send is a PR, the level-up celebration is silently dropped. The overlay enumerates every meaningful event so nothing gets eaten.

**Files:**
- Create: `frontend/src/components/ui/SessionSummaryOverlay.jsx`

- [ ] **Step 1: Implement**

```jsx
// frontend/src/components/ui/SessionSummaryOverlay.jsx
import { motion, AnimatePresence } from 'framer-motion'
import { TRANSITIONS, useReducedTransition } from '../../lib/motion'

/**
 * Full-session celebration. Renders a list of meaningful events for one save.
 *
 * Props:
 *   open:    bool
 *   onClose: () => void
 *   events:  Array<{ kind: 'send'|'levelUp'|'pr', label: string, sublabel?: string, xp?: number }>
 *   totalXP: number
 */
export default function SessionSummaryOverlay({ open, onClose, events = [], totalXP = 0 }) {
  const t = useReducedTransition(TRANSITIONS.dialog_in)
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-ct-forest-deep/70 backdrop-blur-md p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={t}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md bg-ct-forest border border-ct-hairline rounded-3xl p-5"
            initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}
            transition={t}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="ct-eyebrow">Session logged</p>
            <p className="ct-display mt-1">+{totalXP.toLocaleString()} XP</p>
            <ul className="mt-4 space-y-2">
              {events.map((e, i) => (
                <motion.li
                  key={`${e.kind}-${i}`}
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ ...t, delay: 0.05 + i * 0.06 }}
                  className="flex justify-between items-center text-sm"
                >
                  <span className="text-ct-cream/90">
                    {e.label}
                    {e.sublabel && <span className="ml-2 text-ct-cream/50 text-xs">{e.sublabel}</span>}
                  </span>
                  {typeof e.xp === 'number' && (
                    <span className="ct-tnum text-ct-terra-soft font-bold">+{e.xp}</span>
                  )}
                </motion.li>
              ))}
            </ul>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full py-2.5 rounded-xl bg-ct-terracotta text-white text-sm font-bold"
            >
              Clean send
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 2: Verify `TRANSITIONS.dialog_in` exists in `lib/motion.js`**

Run: `grep "dialog_in\|chip_tap" frontend/src/lib/motion.js`
Expected: at least `chip_tap` should already exist from Phase 0; `dialog_in` may need to be added.

- [ ] **Step 3: If `dialog_in` is missing, add it**

Open `frontend/src/lib/motion.js`. In the `TRANSITIONS` block, add:

```js
dialog_in: { duration: DURATIONS.med, ease: EASE.out },
```

- [ ] **Step 4: Smoke render in `/design-system`**

Add a button that toggles `<SessionSummaryOverlay>` with three fake events (a send, a level-up, a PR). Confirm the cascade plays cleanly.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/SessionSummaryOverlay.jsx frontend/src/lib/motion.js frontend/src/components/DesignSystem.jsx
git commit -m "feat(log): SessionSummaryOverlay — multi-event celebration surface"
```

---

## Task 11: Restructure `TrainingLogEntry` around Quick + Deep

**Why:** This is the integration step — `<TrainingLogEntry>` becomes a shell hosting session metadata, the mode toggle, the active surface, and a single save action that consumes both Quick's committed-sends list and Deep's `climbs` dict.

**Files:**
- Modify: `frontend/src/components/TrainingLogEntry.jsx` (significant restructure of the JSX body and `performSave`)

- [ ] **Step 1: Replace the `INITIAL_FORM` block and add Quick mode state**

Find the `useState` that creates `form`. Update to:

```jsx
const [form, setForm] = useState({
  date: today,
  session_type: prefillType || 'bouldering',
  duration_min: 90,
  intensity: 7,
  grades_sent: '',
  notes: '',
  climbs: {},
})
const [logMode, setLogMode] = useState('quick')  // 'quick' | 'deep'
const [quickSends, setQuickSends] = useState([]) // [{ grade, outcome, stylePrimary }]
const [summaryOpen, setSummaryOpen] = useState(false)
const [summary, setSummary] = useState({ totalXP: 0, events: [] })
const { state: engineState } = useRewardEngine()
```

(Keep the existing `logSends` destructure; expand the hook destructure to include `state`.)

- [ ] **Step 2: Replace the in-JSX `<ClimbLogSection>` with the mode toggle + active surface**

Find where `<ClimbLogSection>` is rendered (around line 410). Replace that block with:

```jsx
{showClimbSection && (
  <div className="space-y-3">
    <LogModeToggle value={logMode} onChange={setLogMode} />
    {logMode === 'quick' && (
      <>
        <LogSendQuick
          sessionType={form.session_type}
          engineState={engineState}
          onCommit={(s) => setQuickSends((prev) => [...prev, s])}
        />
        {quickSends.length > 0 && (
          <div className="rounded-xl border border-ct-hairline p-3 space-y-1">
            <p className="ct-eyebrow">Pending</p>
            {quickSends.map((s, i) => (
              <p key={i} className="text-xs text-ct-cream/80 flex justify-between">
                <span>{s.grade} · {s.outcome} · {s.stylePrimary}</span>
                <button
                  type="button"
                  onClick={() => setQuickSends((prev) => prev.filter((_, j) => j !== i))}
                  className="text-ct-cream/40 hover:text-ct-cream"
                >×</button>
              </p>
            ))}
          </div>
        )}
      </>
    )}
    {logMode === 'deep' && (
      <LogSendDeep
        value={form.climbs}
        onChange={(next) => set('climbs', next)}
        sessionType={form.session_type}
        engineState={engineState}
      />
    )}
  </div>
)}
```

Add the imports at the top of the file:

```jsx
import LogModeToggle from './ui/LogModeToggle'
import LogSendQuick from './ui/LogSendQuick'
import LogSendDeep from './ui/LogSendDeep'
import SessionSummaryOverlay from './ui/SessionSummaryOverlay'
```

- [ ] **Step 3: Replace `performSave`'s engine-side block**

Find the block in `performSave` (currently lines 218–274) that builds `allSends` and dispatches `setCelebration`. Replace with:

```jsx
const stylePrimary = getActiveStyle()
const modality = modalityFromSessionType(form.session_type)

// Quick sends (already individual entries) + Deep sends (walked from climbs dict)
const allSends = []
const now = Date.now()
for (const s of quickSends) {
  allSends.push({
    grade: s.grade, modality, outcome: s.outcome,
    stylePrimary: s.stylePrimary, isDeepLog: false, ts: now,
  })
}
for (const discipline of ['boulder', 'route']) {
  const gradeMap = payload.climbs?.[discipline] || {}
  for (const [grade, counters] of Object.entries(gradeMap)) {
    if (!counters) continue
    for (let i = 0; i < (counters.s || 0); i++) {
      allSends.push({ grade, modality, outcome: 'redpoint', stylePrimary, isDeepLog: true, ts: now })
    }
    for (let i = 0; i < (counters.f || 0); i++) {
      allSends.push({ grade, modality, outcome: 'flash', stylePrimary, isDeepLog: true, ts: now })
    }
  }
}

if (allSends.length === 0) {
  setQuickSends([])
  return
}

const allEvents = logSends(allSends)
const summaryEvents = []
let totalXP = 0
let highestLevel = null
for (let i = 0; i < allEvents.length; i++) {
  const ev = allEvents[i]
  const send = allSends[i]
  if (ev.xpEarned > 0) {
    summaryEvents.push({
      kind: 'send',
      label: `${send.grade} ${send.outcome}`,
      sublabel: send.stylePrimary,
      xp: ev.xpEarned,
    })
    totalXP += ev.xpEarned
  }
  if (ev.isPersonalRecord) {
    summaryEvents.push({ kind: 'pr', label: `New ${send.stylePrimary} PR · ${send.grade}` })
  }
  if (ev.leveledUp) {
    summaryEvents.push({ kind: 'levelUp', label: `Reached Lv ${ev.level}` })
    if (highestLevel === null || ev.level > highestLevel) highestLevel = ev.level
  }
}
setSummary({ totalXP, events: summaryEvents })
setSummaryOpen(true)
setQuickSends([])
```

Add the imports at top of the file:

```jsx
import { modalityFromSessionType } from '../lib/sendPreview'
```

- [ ] **Step 4: Mount the overlay in the component's return**

Right before the closing fragment of `TrainingLogEntry`, add:

```jsx
<SessionSummaryOverlay
  open={summaryOpen}
  onClose={() => { setSummaryOpen(false); onSave?.() }}
  events={summary.events}
  totalXP={summary.totalXP}
/>
```

Remove the old `<CelebrationOverlay>` mount in this component (it's now subsumed by the summary overlay). Phase 1's other celebration callers (tier promotion, etc.) keep using `CelebrationOverlay` — only this component's local single-event call is removed.

- [ ] **Step 5: Validate the save button enables for either path**

Find the disabled-state logic on the save button. Update it to enable when EITHER `quickSends.length > 0` OR `Object.keys(form.climbs).length > 0` OR the session is non-climbing (hangboard/strength/rest, which save without climbs).

- [ ] **Step 6: Run the full test suite**

Run: `cd frontend && npm test -- --run`
Expected: all prior tests still pass; no new regressions.

- [ ] **Step 7: Manual end-to-end smoke**

1. Open Train, default mode = Quick.
2. Tap V4, Flash, "powerful" chip. Confirm reward preview shows non-zero XP and a `V4 · flash · indoor` breakdown.
3. Tap "Add V4". A pending row appears.
4. Switch to Deep. Confirm the existing climb-log expander renders with the XP-total row on top.
5. Switch back to Quick. Add one more send (V3 redpoint crimpy).
6. Tap Save. Confirm the SessionSummaryOverlay renders with both sends listed and the total XP equals the engine's reported `+xp`.
7. Confirm the Hub stat radar updates after dismiss.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/TrainingLogEntry.jsx
git commit -m "feat(train): TrainingLogEntry hosts Quick · Deep modes + summary overlay"
```

---

## Task 12: Wire `useRewardEngine` to expose `state`

**Why:** `<LogSendQuick>` and `<LogSendDeep>` need access to the current engine state to compute live previews. The hook currently returns `{ state, logSend, logSends, reset }` (per `rewardEngine.js`); confirm that and surface it cleanly.

**Files:**
- Verify: `frontend/src/lib/rewardEngine.js` already exposes `state` from `useRewardEngine()`. Per Phase 1 summary, it does.

- [ ] **Step 1: Confirm**

Run: `grep -n "return.*state" frontend/src/lib/rewardEngine.js`
Expected: a line in `useRewardEngine` returning an object with a `state` field.

- [ ] **Step 2: If `state` is not yet returned, add it**

If absent, modify the hook return to include `state`. No commit needed unless this changes.

---

## Task 13: Migrate `HubFeedCard` / `useHubData` consumers that read `STYLE_ORDER`

**Why:** Tasks 1–2 widened `STYLE_ORDER` to 5 entries. Files iterating it (`HubStyleMixCard.jsx`, `StyleMixSheet.jsx`, `hub/HubStyleStrip.jsx`, `lib/styleProfile.js`, `GradeCounterRow.jsx`) should already pick up the new entries without code changes since they all iterate, not enumerate. Verify on each.

**Files (verify only):**
- `frontend/src/components/HubStyleMixCard.jsx`
- `frontend/src/components/StyleMixSheet.jsx`
- `frontend/src/components/hub/HubStyleStrip.jsx`
- `frontend/src/lib/styleProfile.js`
- `frontend/src/components/GradeCounterRow.jsx`

- [ ] **Step 1: Smoke check each surface**

Run dev server. Open Hub → confirm the stacked style bar renders 5 segments. Open Progress → confirm StyleMixSheet shows 5 chips. Open Train → confirm GradeCounterRow's drain logic still works (tap a counter up, then back down; no console errors).

- [ ] **Step 2: If `styleProfile.js` makes any hardcoded 4-chip assumption, fix it**

Read `styleProfile.js`. The summary said it uses `STYLE_ORDER` for ordering. Confirm no `length === 4` or `.slice(0, 4)` exists. If found, replace with `STYLE_ORDER.length` semantics.

- [ ] **Step 3: Commit if any change was needed**

```bash
git add <files>
git commit -m "fix(styles): style-mix consumers handle 5-chip STYLE_ORDER"
```

(If nothing changed, no commit.)

---

## Task 14: Run the full Phase 2 regression sweep

**Files:** None modified.

- [ ] **Step 1: All tests**

Run: `cd frontend && npm test -- --run`
Expected: 100% pass.

- [ ] **Step 2: Build clean**

Run: `cd frontend && npm run build`
Expected: no errors, no warnings about unresolved imports.

- [ ] **Step 3: Manual top-to-bottom walk**

- Hub renders. Stat radar shows 5 axes.
- Triage tab loads (untouched, but verify no regression).
- Recover, Train, Chat, Progress all load.
- Train default mode = Quick. Log a V5 flash indoor → +210 XP preview (V5 base 105 × flash 2.0 × indoor 1.0 × no PR · no gap = 210). Add, save, summary overlay renders.
- Switch Deep. Add 2× V3, 1× V4 flash. Confirm XP total updates live. Save. Summary overlay enumerates all 3 sends.
- Reload. Hub still reflects updated stats and total XP.

- [ ] **Step 4: Append a Phase 2 retrospective stub to the spec**

Open `docs/superpowers/specs/2026-05-20-rpg-climber-design.md`. At the end, add:

```markdown
## Phase 2 retrospective (added after implementation)

Phase 2 shipped on YYYY-MM-DD — N commits on `redesign/rpg-climber` since the Phase 2 plan, build green, M/M tests passing.

- [findings to be filled in by the implementer or reviewer]
```

Leave the bullet list empty for now; it gets populated during code review.

- [ ] **Step 5: Commit the retrospective stub**

```bash
git add docs/superpowers/specs/2026-05-20-rpg-climber-design.md
git commit -m "docs(spec): Phase 2 retrospective stub"
```

---

## Critical invariants

- The reward engine module (`lib/rewardEngine.js`, `lib/xp.js`, `lib/stats.js`, `lib/quests.js`) is **not modified** in this phase except for the additive helper exposed in Task 12 (if needed).
- `lib/styleStore.js` is the only place outside ClimbLogSection that touches the `ct_climb_style` localStorage key directly.
- Existing 4-chip localStorage values are migrated transparently on read (Task 3); climbers don't see "your selection reset" on first open.
- `TrainingLogEntry`'s POST payload to `logTraining()` is unchanged — Quick mode and Deep mode produce equivalent `form.climbs` shapes for the backend. Quick sends are accumulated in component state and merged into `form.climbs` at save time so the backend keeps seeing the existing shape.
- Reduced-motion preference disables `LogSendQuick` chip springs, `SessionSummaryOverlay` cascade, and all Framer transitions.
- Phase 2 changes are purely client-side; `src/triage.py`, `src/training.py`, and any other backend modules are untouched.

---

## Out of scope for Phase 2

- `<AnimatedIcon>` primitive (deferred to Phase 4 chrome re-skin pass if needed).
- Backend sync of XP / stats / quest state.
- Route-grade conversion in `xp.js` (currently boulder-grade only; routes save via Deep but earn 0 XP). Tracking this as a follow-up; not blocking Phase 2.
- Quest progress updates on Quick-mode sends (the engine already handles it through `logSends`; no UI changes needed in Phase 2).
- Tier-themed celebration surface variants (Phase 5).
