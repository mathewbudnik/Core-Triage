# RPG Climber — Phase 1: Hub Redesign + Reward Engine Wiring

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the reward engine to real send/training logs, persist its state in localStorage, and rebuild the Hub as the new identity surface — Hero (greeting + tier badge + stat radar + level meter + style strip), today's quest, tools grid, recent sends. Existing Hub tiles that don't fit the RPG theme are scrapped. The stat radar's semantics shift from "30-day rolling mean" to "max V-grade per style" — numbers map directly to V-grades and only go up.

**Architecture:** Three layers. (1) Engine refactor: `deriveStatShape()` returns max V-grade per style; new `rewardEngine.js` module persists state in localStorage and exposes `addSend()` that returns events (xp earned, level-up, PR, stat shape delta). (2) UI primitive tweaks: StatStrip displays "V{n}", StatRadar handles null axes. (3) Hub rewrite: new layout in [src/components/hub/](frontend/src/components/hub/) (new directory), wired to engine state via a `useRewardEngine()` hook. Logging in TrainingLogEntry routes through the engine after save, firing celebrations on PRs and level-ups.

**Tech Stack:** React 18, Vite, Tailwind, Framer Motion, Vitest, lucide-react, @phosphor-icons/react. All already installed.

**Branch:** `redesign/rpg-climber` (already checked out).

**Verification approach:** Vitest for engine + helper logic. Smoke via `/design-system` showcase updates + dev-server walk of the new Hub. Preservation contract: existing TriageTab, RecoverTab, ProgressTab, ChatTab, BodyDiagram, GradePyramidCard, TrainingLogEntry, AwardsStrip, ProgressTierHero — all untouched in behavior; only the Hub changes shape and the logging path gets a new side effect.

---

## File structure

**New files:**
- `frontend/src/lib/rewardEngine.js` — state schema, persistence, `addSend()`, `useRewardEngine()` hook (Tasks 3-5)
- `frontend/src/lib/__tests__/rewardEngine.test.js` — engine unit tests
- `frontend/src/lib/gradeUtil.js` — `gradeStringToNum('V6') ↔ 6`, `formatGrade(6) → 'V6'`, edge cases (Task 2)
- `frontend/src/lib/__tests__/gradeUtil.test.js`
- `frontend/src/components/hub/HubHero.jsx` — top hero panel (Tasks 9-11)
- `frontend/src/components/hub/HubStyleStrip.jsx` — extracted/restyled from HubStyleMixCard (Task 11)
- `frontend/src/components/hub/TodaysQuestCard.jsx` — wraps QuestCard primitive with engine state (Task 13)
- `frontend/src/components/hub/HubToolsGrid.jsx` — Recover/Train/Chat tiles (Task 14)
- `frontend/src/components/hub/HubProjectTile.jsx` — RPG-enhanced "today's project" (Task 15)
- `frontend/src/components/hub/HubRecentSends.jsx` — last 5 sends + XP per row (Task 16)

**Modified files:**
- `frontend/src/lib/stats.js` — rewrite `deriveStatShape()` (Task 1)
- `frontend/src/lib/__tests__/stats.test.js` — update test assertions (Task 1)
- `frontend/src/components/ui/StatStrip.jsx` — V-grade display (Task 6)
- `frontend/src/components/ui/StatRadar.jsx` — null axis handling (Task 7)
- `frontend/src/components/HubTab.jsx` — rewrite as scaffolding for new layout (Task 8); remove imports of scrapped tiles
- `frontend/src/components/TrainingLogEntry.jsx` — call `rewardEngine.addSend()` on save, fire celebration (Task 17)
- `frontend/src/components/DesignSystem.jsx` — add a "Reward engine · live state" section that consumes useRewardEngine (Task 5)

**Files imported-out (kept on disk, no behavior change, just stop being rendered):**
- `HubGreeting.jsx`, `HubFeedCard.jsx`, `HubTipCard.jsx`, `HubPatterns.jsx`, `HubFeaturedCard.jsx`, `HubRingsCard.jsx`, `HubStyleMixCard.jsx`, `HubWeekStrip.jsx` — removed from HubTab.jsx imports. Files stay (deletion is a later cleanup phase once we've confirmed no regression).

---

## Pre-flight

- [ ] **Step 0: Confirm branch and clean tree**

Run: `cd /Users/mathewbudnik/coretriage && git rev-parse --abbrev-ref HEAD && git status --short`
Expected: branch is `redesign/rpg-climber`; only ignorable files dirty.

- [ ] **Step 0.1: Confirm all Phase 0 tests still pass before starting**

Run: `cd /Users/mathewbudnik/coretriage/frontend && npm test`
Expected: 35/35 tests pass. If anything is broken from prior work, fix before starting.

---

## Task 1: Refactor `deriveStatShape` to max-V-grade semantics

**Files:**
- Modify: `frontend/src/lib/stats.js`
- Modify: `frontend/src/lib/__tests__/stats.test.js`

Spec reference: §5.1 (brand voice), §8 (stat system), user direction "Stat axis value = max V-grade sent in that style."

- [ ] **Step 1.1: Rewrite the stats.test.js suite for new semantics**

Replace the entire contents of `frontend/src/lib/__tests__/stats.test.js` with:

```js
import { describe, it, expect } from 'vitest'
import {
  STYLE_CHIP_TO_STATS,
  styleChipToStats,
  deriveStatShape,
  AXES,
} from '../stats.js'

describe('STYLE_CHIP_TO_STATS', () => {
  it('every chip is a 5-axis object', () => {
    for (const key of ['powerful', 'crimpy', 'dynamic', 'technical', 'mobility']) {
      expect(STYLE_CHIP_TO_STATS[key]).toMatchObject({
        power: expect.any(Number),
        crimpy: expect.any(Number),
        dynamic: expect.any(Number),
        technical: expect.any(Number),
        mobility: expect.any(Number),
      })
    }
  })

  it("each chip's primary stat is the largest value", () => {
    expect(STYLE_CHIP_TO_STATS.powerful.power).toBeGreaterThanOrEqual(3)
    expect(STYLE_CHIP_TO_STATS.crimpy.crimpy).toBeGreaterThanOrEqual(3)
    expect(STYLE_CHIP_TO_STATS.dynamic.dynamic).toBeGreaterThanOrEqual(3)
    expect(STYLE_CHIP_TO_STATS.technical.technical).toBeGreaterThanOrEqual(3)
    expect(STYLE_CHIP_TO_STATS.mobility.mobility).toBeGreaterThanOrEqual(3)
  })
})

describe('styleChipToStats', () => {
  it('returns the chip mapping when known', () => {
    expect(styleChipToStats('crimpy')).toEqual(STYLE_CHIP_TO_STATS.crimpy)
  })
  it('returns a zero map for unknown chips', () => {
    expect(styleChipToStats('unknown')).toEqual({
      power: 0, crimpy: 0, dynamic: 0, technical: 0, mobility: 0,
    })
  })
})

describe('deriveStatShape (max V-grade per style)', () => {
  it('empty log returns all nulls', () => {
    const shape = deriveStatShape([])
    AXES.forEach((axis) => expect(shape[axis]).toBeNull())
  })

  it('one V6 crimpy send sets crimpy to 6, others null', () => {
    const shape = deriveStatShape([
      { stylePrimary: 'crimpy', gradeNum: 6 },
    ])
    expect(shape.crimpy).toBe(6)
    expect(shape.power).toBeNull()
    expect(shape.dynamic).toBeNull()
    expect(shape.technical).toBeNull()
    expect(shape.mobility).toBeNull()
  })

  it('multiple sends in one style keep the max', () => {
    const shape = deriveStatShape([
      { stylePrimary: 'crimpy', gradeNum: 3 },
      { stylePrimary: 'crimpy', gradeNum: 6 },
      { stylePrimary: 'crimpy', gradeNum: 4 },
    ])
    expect(shape.crimpy).toBe(6)
  })

  it('different styles are tracked independently', () => {
    const shape = deriveStatShape([
      { stylePrimary: 'powerful', gradeNum: 7 },
      { stylePrimary: 'mobility', gradeNum: 3 },
    ])
    expect(shape.power).toBe(7)
    expect(shape.mobility).toBe(3)
    expect(shape.crimpy).toBeNull()
  })

  it('"powerful" chip maps to "power" axis', () => {
    const shape = deriveStatShape([
      { stylePrimary: 'powerful', gradeNum: 5 },
    ])
    expect(shape.power).toBe(5)
  })

  it('ignores sends with missing fields', () => {
    const shape = deriveStatShape([
      { stylePrimary: 'crimpy', gradeNum: 6 },
      { stylePrimary: 'crimpy' }, // no gradeNum
      { gradeNum: 8 }, // no stylePrimary
      null,
      undefined,
    ])
    expect(shape.crimpy).toBe(6)
  })

  it('V10+ caps at 10', () => {
    const shape = deriveStatShape([
      { stylePrimary: 'powerful', gradeNum: 15 },
    ])
    expect(shape.power).toBe(10)
  })

  it('returns all five axes even when only some have data', () => {
    const shape = deriveStatShape([
      { stylePrimary: 'crimpy', gradeNum: 6 },
    ])
    AXES.forEach((axis) => expect(shape).toHaveProperty(axis))
  })
})
```

- [ ] **Step 1.2: Run tests to verify they fail**

Run: `cd /Users/mathewbudnik/coretriage/frontend && npm test`
Expected: stats tests fail (deriveStatShape returns wrong shape). xp.test and quests.test still pass.

- [ ] **Step 1.3: Rewrite `deriveStatShape` in stats.js**

In `frontend/src/lib/stats.js`, REPLACE the existing `deriveStatShape` function and its constants (`WINDOW_DAYS`, `SCALE_FACTOR`) with:

```js
const NULL_SHAPE = Object.freeze({
  power: null, crimpy: null, dynamic: null, technical: null, mobility: null,
})

// Style chip → primary stat axis. Note: "powerful" chip maps to "power" axis.
const STYLE_TO_AXIS = {
  powerful:  'power',
  crimpy:    'crimpy',
  dynamic:   'dynamic',
  technical: 'technical',
  mobility:  'mobility',
}

const V_GRADE_CAP = 10  // V10+ all cap at 10

/**
 * Compute the climber's stat shape — the max V-grade ticked in each style.
 *
 * @param {Array} sends — array of { stylePrimary: string, gradeNum: number }
 * @returns {object} { power, crimpy, dynamic, technical, mobility } — each is
 *   the max V-grade number sent in that style, or null if no sends in that style.
 *   Values are capped at 10 (V10+ all read as 10).
 */
export function deriveStatShape(sends) {
  if (!Array.isArray(sends) || sends.length === 0) return { ...NULL_SHAPE }
  const shape = { ...NULL_SHAPE }
  for (const send of sends) {
    if (!send || typeof send !== 'object') continue
    const axis = STYLE_TO_AXIS[send.stylePrimary]
    if (!axis) continue
    if (typeof send.gradeNum !== 'number' || !Number.isFinite(send.gradeNum)) continue
    const capped = Math.max(0, Math.min(V_GRADE_CAP, Math.floor(send.gradeNum)))
    if (shape[axis] === null || capped > shape[axis]) {
      shape[axis] = capped
    }
  }
  return shape
}
```

Keep `STYLE_CHIP_TO_STATS`, `styleChipToStats`, and `AXES` exports unchanged — Tasks 3-5 still reference them.

- [ ] **Step 1.4: Run tests to verify they pass**

Run: `npm test`
Expected: all 35+ tests pass (stats reflects new semantics; xp and quests still pass).

- [ ] **Step 1.5: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/lib/stats.js frontend/src/lib/__tests__/stats.test.js
git commit -m "$(cat <<'EOF'
feat(engine): stats — max V-grade per style semantics

Phase 1, Task 1. Rewrites deriveStatShape to compute max V-grade per
style (numbers map directly to V-grades, only go up) instead of the
previous 30-day rolling mean. Returns null for axes with no sends so
brand-new climbers display "—" instead of zero.

V10+ caps at 10. Test suite updated for the new shape — empty log returns
nulls, one V6 crimpy send sets crimpy=6, multiple sends keep the max.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Grade utility — `gradeStringToNum`, `formatGrade`

**Files:**
- Create: `frontend/src/lib/gradeUtil.js`
- Create: `frontend/src/lib/__tests__/gradeUtil.test.js`

- [ ] **Step 2.1: Write the failing tests**

Create `frontend/src/lib/__tests__/gradeUtil.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { gradeStringToNum, formatGrade } from '../gradeUtil.js'

describe('gradeStringToNum', () => {
  it('parses V-grades', () => {
    expect(gradeStringToNum('V0')).toBe(0)
    expect(gradeStringToNum('V6')).toBe(6)
    expect(gradeStringToNum('V10')).toBe(10)
    expect(gradeStringToNum('V15')).toBe(15)
  })

  it('returns null for non-V-grades', () => {
    expect(gradeStringToNum('5.12')).toBeNull()
    expect(gradeStringToNum('garbage')).toBeNull()
    expect(gradeStringToNum('')).toBeNull()
    expect(gradeStringToNum(null)).toBeNull()
    expect(gradeStringToNum(undefined)).toBeNull()
    expect(gradeStringToNum(6)).toBeNull()
  })

  it('handles lowercase', () => {
    expect(gradeStringToNum('v6')).toBe(6)
  })
})

describe('formatGrade', () => {
  it('formats integers as V-grades', () => {
    expect(formatGrade(0)).toBe('V0')
    expect(formatGrade(6)).toBe('V6')
    expect(formatGrade(10)).toBe('V10')
  })

  it('caps display at V10+', () => {
    expect(formatGrade(11)).toBe('V10+')
    expect(formatGrade(15)).toBe('V10+')
  })

  it('returns "—" for null / undefined / invalid', () => {
    expect(formatGrade(null)).toBe('—')
    expect(formatGrade(undefined)).toBe('—')
    expect(formatGrade(NaN)).toBe('—')
  })

  it('handles 0 as V0 (not "—")', () => {
    expect(formatGrade(0)).toBe('V0')
  })
})
```

- [ ] **Step 2.2: Run tests — expect import-resolution failure**

Run: `npm test`
Expected: failures for the gradeUtil import.

- [ ] **Step 2.3: Implement gradeUtil.js**

Create `frontend/src/lib/gradeUtil.js`:

```js
/**
 * V-grade parsing and display helpers.
 * V-grades are integer-valued ("V0" through "V10+").
 * Route grades (5.x) are handled separately via lib/tier.js's ydsToTier.
 */

/**
 * Parse a V-grade string ("V6") into its integer value (6).
 * Returns null for anything that isn't a V-grade string.
 */
export function gradeStringToNum(g) {
  if (typeof g !== 'string') return null
  const m = g.trim().toLowerCase().match(/^v(\d+)$/)
  if (!m) return null
  const n = parseInt(m[1], 10)
  return Number.isFinite(n) ? n : null
}

/**
 * Format an integer V-grade number for display.
 * 0..10 → "V0"..."V10"
 * 11+ → "V10+"
 * null/undefined/NaN → "—"
 */
export function formatGrade(n) {
  if (n === null || n === undefined) return '—'
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—'
  if (n >= 11) return 'V10+'
  return `V${Math.floor(n)}`
}
```

- [ ] **Step 2.4: Run tests — verify pass**

Run: `npm test`
Expected: all gradeUtil tests pass, all previous tests still pass.

- [ ] **Step 2.5: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/lib/gradeUtil.js frontend/src/lib/__tests__/gradeUtil.test.js
git commit -m "$(cat <<'EOF'
feat(engine): gradeUtil — V-grade parsing + display formatting

Phase 1, Task 2. Helpers for converting between V-grade strings ("V6")
and integer values (6), plus formatGrade() which renders integers as
"V0"..."V10", "V10+" for 11+, or "—" for null/invalid. Used by the
stat radar / strip display and the reward engine when accepting sends.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Reward engine — state schema + persistence

**Files:**
- Create: `frontend/src/lib/rewardEngine.js`
- Create: `frontend/src/lib/__tests__/rewardEngine.test.js`

This task creates the persistent state layer only. Mutation logic (addSend) and the React hook come in Tasks 4-5.

- [ ] **Step 3.1: Write failing tests for state primitives**

Create `frontend/src/lib/__tests__/rewardEngine.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest'
import {
  getInitialState,
  loadState,
  saveState,
  STORAGE_KEY,
  STATE_VERSION,
} from '../rewardEngine.js'

// Minimal in-memory localStorage shim for Node test env
class MemoryStorage {
  constructor() { this.store = {} }
  getItem(k) { return this.store[k] ?? null }
  setItem(k, v) { this.store[k] = String(v) }
  removeItem(k) { delete this.store[k] }
  clear() { this.store = {} }
}

beforeEach(() => {
  globalThis.localStorage = new MemoryStorage()
})

describe('getInitialState', () => {
  it('returns a fresh state object', () => {
    const s = getInitialState()
    expect(s.version).toBe(STATE_VERSION)
    expect(s.totalXP).toBe(0)
    expect(s.sends).toEqual([])
    expect(s.bestPerStyle).toEqual({
      powerful: null, crimpy: null, dynamic: null, technical: null, mobility: null,
    })
    expect(s.streak).toEqual({ days: 0, best: 0, lastActiveDate: null })
    expect(s.quest).toEqual({ id: null, generatedDate: null, progress: { current: 0, target: 0 } })
  })
})

describe('saveState / loadState', () => {
  it('round-trips state via localStorage', () => {
    const s = getInitialState()
    s.totalXP = 250
    s.sends.push({ ts: 1700000000000, stylePrimary: 'crimpy', gradeNum: 6 })
    saveState(s)
    const loaded = loadState()
    expect(loaded.totalXP).toBe(250)
    expect(loaded.sends).toHaveLength(1)
    expect(loaded.sends[0].stylePrimary).toBe('crimpy')
  })

  it('returns initial state if nothing is stored', () => {
    const loaded = loadState()
    expect(loaded.version).toBe(STATE_VERSION)
    expect(loaded.totalXP).toBe(0)
  })

  it('returns initial state if stored JSON is invalid', () => {
    globalThis.localStorage.setItem(STORAGE_KEY, 'not json')
    const loaded = loadState()
    expect(loaded.totalXP).toBe(0)
  })

  it('returns initial state if stored version mismatches', () => {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 999, totalXP: 9999, sends: [],
    }))
    const loaded = loadState()
    expect(loaded.totalXP).toBe(0)
    expect(loaded.version).toBe(STATE_VERSION)
  })

  it('saveState writes to the configured key', () => {
    const s = getInitialState()
    s.totalXP = 100
    saveState(s)
    expect(globalThis.localStorage.getItem(STORAGE_KEY)).toContain('"totalXP":100')
  })
})
```

- [ ] **Step 3.2: Run tests — expect failures**

Run: `npm test`
Expected: import resolution failures for rewardEngine.

- [ ] **Step 3.3: Implement state primitives in rewardEngine.js**

Create `frontend/src/lib/rewardEngine.js`:

```js
/**
 * Reward engine — persistent state for XP, stats, streak, and the
 * current daily quest. All state lives client-side in localStorage;
 * backend sync is deferred to a later phase per spec.
 */

export const STORAGE_KEY = 'ct_reward_engine_v1'
export const STATE_VERSION = 1

const NULL_BEST_PER_STYLE = Object.freeze({
  powerful: null, crimpy: null, dynamic: null, technical: null, mobility: null,
})

/**
 * Fresh state for a brand-new climber.
 */
export function getInitialState() {
  return {
    version:       STATE_VERSION,
    totalXP:       0,
    sends:         [],
    bestPerStyle:  { ...NULL_BEST_PER_STYLE },
    streak:        { days: 0, best: 0, lastActiveDate: null },
    quest:         { id: null, generatedDate: null, progress: { current: 0, target: 0 } },
  }
}

/**
 * Read state from localStorage. Returns fresh state if nothing stored,
 * if the JSON is invalid, or if the stored version doesn't match
 * STATE_VERSION (future migrations can promote old versions here).
 */
export function loadState() {
  try {
    const raw = (globalThis.localStorage ?? null)?.getItem(STORAGE_KEY)
    if (!raw) return getInitialState()
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.version !== STATE_VERSION) return getInitialState()
    return parsed
  } catch {
    return getInitialState()
  }
}

/**
 * Persist state to localStorage. Silent on failure (storage may be disabled).
 */
export function saveState(state) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}
```

- [ ] **Step 3.4: Run tests — verify pass**

Run: `npm test`
Expected: all rewardEngine state tests pass.

- [ ] **Step 3.5: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/lib/rewardEngine.js frontend/src/lib/__tests__/rewardEngine.test.js
git commit -m "$(cat <<'EOF'
feat(engine): rewardEngine — state schema + localStorage persistence

Phase 1, Task 3. Defines the reward engine state shape (totalXP, sends,
bestPerStyle, streak, quest) and load/save primitives backed by
localStorage with key ct_reward_engine_v1. Versioned schema (v1) so
future migrations can promote old versions cleanly. Returns fresh state
on missing/corrupt/version-mismatch — no crashes on bad data.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Reward engine — `addSend()` mutation

**Files:**
- Modify: `frontend/src/lib/rewardEngine.js`
- Modify: `frontend/src/lib/__tests__/rewardEngine.test.js`

This task adds the core mutation that takes a send and updates all derived state (XP totals, level, stat shape, streak, quest progress) and returns an events object describing what happened.

- [ ] **Step 4.1: Append failing tests for addSend**

Append to `frontend/src/lib/__tests__/rewardEngine.test.js` (after the existing `describe` blocks):

```js
import { addSend } from '../rewardEngine.js'

describe('addSend', () => {
  beforeEach(() => {
    globalThis.localStorage = new MemoryStorage()
  })

  const baseSend = {
    grade: 'V6',
    modality: 'indoor',
    outcome: 'redpoint',
    stylePrimary: 'crimpy',
    isDeepLog: false,
    ts: Date.parse('2026-05-20T18:00:00Z'),
  }

  it('returns xpEarned > 0 for a valid send', () => {
    const state = getInitialState()
    const { events, state: next } = addSend(state, baseSend)
    expect(events.xpEarned).toBeGreaterThan(0)
    expect(next.totalXP).toBe(events.xpEarned)
  })

  it('detects a personal record on first send at a grade', () => {
    const state = getInitialState()
    const { events } = addSend(state, baseSend)
    expect(events.isPersonalRecord).toBe(true)
  })

  it('does NOT mark a PR when the grade was already ticked', () => {
    let state = getInitialState()
    state = addSend(state, baseSend).state
    const second = addSend(state, baseSend)
    expect(second.events.isPersonalRecord).toBe(false)
  })

  it('updates bestPerStyle to track max grade per style', () => {
    let state = getInitialState()
    state = addSend(state, { ...baseSend, grade: 'V3' }).state
    state = addSend(state, { ...baseSend, grade: 'V6' }).state
    state = addSend(state, { ...baseSend, grade: 'V4' }).state
    expect(state.bestPerStyle.crimpy).toBe(6)
  })

  it('detects level-up when XP crosses the threshold', () => {
    let state = getInitialState()
    state.totalXP = 95  // 5 XP below level 2 threshold (100)
    const { events } = addSend(state, baseSend)
    expect(events.leveledUp).toBe(true)
    expect(events.level).toBeGreaterThanOrEqual(2)
  })

  it('does NOT mark level-up when XP stays in the same level', () => {
    let state = getInitialState()
    state.totalXP = 5
    const { events } = addSend(state, baseSend)
    expect(events.leveledUp).toBe(false)
  })

  it('appends the send to the sends array', () => {
    const state = getInitialState()
    const { state: next } = addSend(state, baseSend)
    expect(next.sends).toHaveLength(1)
    expect(next.sends[0].stylePrimary).toBe('crimpy')
    expect(next.sends[0].gradeNum).toBe(6)
  })

  it('rejects sends with missing or invalid grade gracefully', () => {
    const state = getInitialState()
    const result = addSend(state, { ...baseSend, grade: 'garbage' })
    expect(result.events.xpEarned).toBe(0)
    expect(result.state).toEqual(state)
  })

  it('initializes streak on first send', () => {
    const state = getInitialState()
    const { state: next } = addSend(state, baseSend)
    expect(next.streak.days).toBe(1)
    expect(next.streak.best).toBe(1)
    expect(next.streak.lastActiveDate).toBeTruthy()
  })

  it('does not increment streak for multiple sends on the same day', () => {
    let state = getInitialState()
    state = addSend(state, baseSend).state
    state = addSend(state, { ...baseSend, ts: baseSend.ts + 3600 * 1000 }).state
    expect(state.streak.days).toBe(1)
  })

  it('increments streak on next-day sends', () => {
    let state = getInitialState()
    state = addSend(state, baseSend).state
    const nextDay = baseSend.ts + 24 * 60 * 60 * 1000
    state = addSend(state, { ...baseSend, ts: nextDay }).state
    expect(state.streak.days).toBe(2)
  })
})
```

- [ ] **Step 4.2: Run tests — expect failures**

Run: `npm test`
Expected: addSend tests fail (function not yet exported).

- [ ] **Step 4.3: Implement addSend in rewardEngine.js**

In `frontend/src/lib/rewardEngine.js`, add at the top:

```js
import { calculateSendXP, levelFromTotalXP } from './xp.js'
import { gradeStringToNum } from './gradeUtil.js'
import { deriveStatShape } from './stats.js'
```

Then add at the bottom of the file (after `saveState`):

```js
function toLocalDateString(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function daysBetween(prevDateStr, currDateStr) {
  if (!prevDateStr) return Infinity
  const prev = new Date(prevDateStr + 'T00:00:00Z').getTime()
  const curr = new Date(currDateStr + 'T00:00:00Z').getTime()
  return Math.round((curr - prev) / (24 * 60 * 60 * 1000))
}

/**
 * Apply a single send to the engine state. Returns:
 *   { state: nextState, events: { xpEarned, totalXP, level, xpInLevel, xpForNext,
 *                                 leveledUp, isPersonalRecord, statShape, prevStatShape } }
 *
 * The send arg:
 *   { grade: 'V6', modality: 'indoor', outcome: 'redpoint',
 *     stylePrimary: 'crimpy', isDeepLog: false, ts: <ms since epoch> }
 *
 * Invalid sends (missing/unparseable grade) return state unchanged and
 * an events object with xpEarned: 0.
 */
export function addSend(state, send) {
  const gradeNum = gradeStringToNum(send?.grade)
  if (gradeNum === null) {
    const lvl = levelFromTotalXP(state.totalXP)
    return {
      state,
      events: {
        xpEarned: 0, totalXP: state.totalXP, ...lvl,
        leveledUp: false, isPersonalRecord: false,
        statShape: deriveStatShape(state.sends),
        prevStatShape: deriveStatShape(state.sends),
      },
    }
  }

  // Personal record = no prior send at this grade in this style
  const isPersonalRecord = !state.sends.some(
    (s) => s.stylePrimary === send.stylePrimary && s.gradeNum === gradeNum,
  )

  // Session position = sends already today
  const todayStr = toLocalDateString(send.ts ?? Date.now())
  const sessionPosition = state.sends.filter(
    (s) => toLocalDateString(s.ts) === todayStr,
  ).length

  // Compute XP using existing xp.js formula
  const prevStatShape = deriveStatShape(state.sends)
  const xpEarned = calculateSendXP({
    grade: send.grade,
    modality: send.modality,
    outcome: send.outcome,
    isPersonalRecord,
    stylePrimary: send.stylePrimary,
    climberStatShape: prevStatShape,
    isDeepLog: !!send.isDeepLog,
    sessionPosition,
  })

  // Append send to history
  const sendRecord = {
    ts: send.ts ?? Date.now(),
    grade: send.grade,
    gradeNum,
    modality: send.modality,
    outcome: send.outcome,
    stylePrimary: send.stylePrimary,
    isDeepLog: !!send.isDeepLog,
    xpEarned,
  }
  const nextSends = [...state.sends, sendRecord]

  // Update bestPerStyle
  const nextBestPerStyle = { ...state.bestPerStyle }
  const cappedGrade = Math.max(0, Math.min(10, gradeNum))
  if (
    nextBestPerStyle[send.stylePrimary] === null ||
    cappedGrade > nextBestPerStyle[send.stylePrimary]
  ) {
    nextBestPerStyle[send.stylePrimary] = cappedGrade
  }

  // Update streak
  const lastActive = state.streak.lastActiveDate
  const gap = daysBetween(lastActive, todayStr)
  let nextStreakDays = state.streak.days
  if (gap === 0) {
    // same day as last send, no increment
    if (nextStreakDays < 1) nextStreakDays = 1
  } else if (gap === 1) {
    nextStreakDays = state.streak.days + 1
  } else {
    // gap > 1 means missed days; start over
    nextStreakDays = 1
  }
  const nextStreak = {
    days: nextStreakDays,
    best: Math.max(state.streak.best, nextStreakDays),
    lastActiveDate: todayStr,
  }

  // Update XP totals
  const nextTotalXP = state.totalXP + xpEarned
  const prevLevel = levelFromTotalXP(state.totalXP).level
  const lvl = levelFromTotalXP(nextTotalXP)
  const leveledUp = lvl.level > prevLevel

  const nextState = {
    ...state,
    totalXP:      nextTotalXP,
    sends:        nextSends,
    bestPerStyle: nextBestPerStyle,
    streak:       nextStreak,
  }

  return {
    state: nextState,
    events: {
      xpEarned,
      totalXP:          nextTotalXP,
      level:            lvl.level,
      xpInLevel:        lvl.xpInLevel,
      xpForNext:        lvl.xpForNext,
      leveledUp,
      isPersonalRecord,
      statShape:        deriveStatShape(nextSends),
      prevStatShape,
    },
  }
}
```

- [ ] **Step 4.4: Run tests — verify pass**

Run: `npm test`
Expected: all addSend tests pass.

- [ ] **Step 4.5: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/lib/rewardEngine.js frontend/src/lib/__tests__/rewardEngine.test.js
git commit -m "$(cat <<'EOF'
feat(engine): rewardEngine.addSend — main mutation with events

Phase 1, Task 4. The keystone reward-engine mutation. Takes a send,
calculates XP (via calculateSendXP from xp.js), detects personal record,
updates bestPerStyle, updates streak (day-based, resets on gap > 1 day),
and returns both nextState and an events object (xpEarned, leveledUp,
isPersonalRecord, statShape, prevStatShape) for the UI to consume.

Invalid sends (unparseable grade) return state unchanged with xpEarned: 0
so callers don't need pre-validation.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: `useRewardEngine()` React hook

**Files:**
- Modify: `frontend/src/lib/rewardEngine.js`
- Modify: `frontend/src/components/DesignSystem.jsx`

- [ ] **Step 5.1: Add useRewardEngine hook in rewardEngine.js**

In `frontend/src/lib/rewardEngine.js`, add at the top:

```js
import { useCallback, useEffect, useState } from 'react'
```

Then append at the bottom:

```js
/**
 * React hook returning current engine state plus a stable logSend(send)
 * function that applies addSend and persists. logSend returns the events
 * object so callers can drive celebrations.
 *
 * Loads state from localStorage on mount; persists on every successful logSend.
 */
export function useRewardEngine() {
  const [state, setState] = useState(() => loadState())

  // Re-load if storage is cleared externally (e.g., devtools, theme reset).
  // No-op safety so hot reload during dev doesn't lose state.
  useEffect(() => {
    // initial mount: state already loaded above
  }, [])

  const logSend = useCallback((send) => {
    const { state: next, events } = addSend(state, send)
    if (events.xpEarned > 0) {
      setState(next)
      saveState(next)
    }
    return events
  }, [state])

  const reset = useCallback(() => {
    const fresh = getInitialState()
    setState(fresh)
    saveState(fresh)
  }, [])

  return { state, logSend, reset }
}
```

- [ ] **Step 5.2: Wire a small live demo into the design-system showcase**

In `frontend/src/components/DesignSystem.jsx`, find the "Reward engine" section (currently shows the static calculation snapshot). Add `useRewardEngine` to the imports near the top:

```js
import { useRewardEngine } from '../lib/rewardEngine'
```

Add a new sub-component (defined OUTSIDE `DesignSystem`, since it uses hooks):

```jsx
function EngineLiveDemo() {
  const { state, logSend, reset } = useRewardEngine()
  const handleSend = () => {
    logSend({
      grade: 'V6', modality: 'indoor', outcome: 'flash',
      stylePrimary: 'crimpy', isDeepLog: false, ts: Date.now(),
    })
  }
  return (
    <div className="mt-4 space-y-2 text-sm">
      <p className="ct-body-soft">
        Total XP: <strong className="text-ct-terra-soft">{state.totalXP}</strong>
        {' · '}Streak: <strong className="text-ct-terra-soft">{state.streak.days} days</strong>
        {' · '}Sends: <strong className="text-ct-terra-soft">{state.sends.length}</strong>
      </p>
      <p className="ct-body-soft">
        Crimpy best: <strong className="text-ct-terra-soft">
          {state.bestPerStyle.crimpy === null ? '—' : `V${state.bestPerStyle.crimpy}`}
        </strong>
      </p>
      <div className="flex gap-2 mt-2">
        <button type="button" onClick={handleSend}
          className="px-3 py-1.5 rounded-md bg-ct-terracotta text-ct-forest text-xs font-bold">
          Log V6 crimpy flash
        </button>
        <button type="button" onClick={reset}
          className="px-3 py-1.5 rounded-md border border-ct-hairline text-ct-cream text-xs font-bold">
          Reset engine
        </button>
      </div>
    </div>
  )
}
```

Then in the existing "Reward engine" section in the showcase (where you currently render the static `calculateSendXP` / `levelFromTotalXP` / `generateDailyQuest` snippets), append at the end (inside the same Surface, after the existing paragraphs):

```jsx
<EngineLiveDemo />
```

- [ ] **Step 5.3: Verify build + dev render**

Run: `cd frontend && npm run build` — expect clean.
Run: `cd frontend && npm run dev &` (background). Visit `/design-system`. Scroll to the Reward engine section. Confirm:
- The live demo renders (Total XP: 0, Streak: 0 days, Sends: 0, Crimpy best: —)
- Click "Log V6 crimpy flash" — Total XP jumps, Sends increments, Crimpy best becomes V6
- Click "Reset engine" — all back to zero
- Refresh page — clicks persist (XP, sends count, best grade are recovered from localStorage)

Kill dev server.

- [ ] **Step 5.4: Verify tests still pass**

Run: `npm test`
Expected: all tests still pass (no regression).

- [ ] **Step 5.5: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/lib/rewardEngine.js frontend/src/components/DesignSystem.jsx
git commit -m "$(cat <<'EOF'
feat(engine): useRewardEngine hook + showcase live demo

Phase 1, Task 5. React hook that loads engine state from localStorage on
mount, exposes a stable logSend(send) function that mutates and persists,
and a reset() for development. Showcase gets a live demo: log a V6 crimpy
flash, see XP/streak/bestPerStyle update, watch state persist across
page refreshes.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: StatStrip — V-grade display

**Files:**
- Modify: `frontend/src/components/ui/StatStrip.jsx`
- Modify: `frontend/src/components/DesignSystem.jsx`

- [ ] **Step 6.1: Update StatStrip to format values via gradeUtil**

In `frontend/src/components/ui/StatStrip.jsx`, add an import at the top:

```jsx
import { formatGrade } from '../../lib/gradeUtil'
```

Replace the cell render line that currently does `{stats[key] ?? 0}` with:

```jsx
<p className="ct-stat-num text-[16px] leading-none">{formatGrade(stats[key])}</p>
```

That single substitution is the entire change.

- [ ] **Step 6.2: Update DesignSystem.jsx StatStrip showcase to demo null axes**

In `frontend/src/components/DesignSystem.jsx`, find the StatStrip section. Replace its current single example with a two-card example so null axes are visible:

```jsx
<div className="grid grid-cols-2 gap-4">
  <Surface tier="default" padding="lg">
    <Eyebrow divider className="mb-3">Sample stats</Eyebrow>
    <StatStrip stats={{ power: 7, crimpy: 6, dynamic: 4, technical: 5, mobility: 3 }} />
  </Surface>
  <Surface tier="default" padding="lg">
    <Eyebrow divider className="mb-3">Brand new — no sends yet</Eyebrow>
    <StatStrip stats={{ power: null, crimpy: null, dynamic: null, technical: null, mobility: null }} />
  </Surface>
</div>
```

- [ ] **Step 6.3: Verify**

Run: `cd frontend && npm run build` — clean.
Visit `/design-system`. StatStrip section:
- First card: cells show "V7", "V6", "V4", "V5", "V3"
- Second card: cells show "—", "—", "—", "—", "—"

- [ ] **Step 6.4: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/components/ui/StatStrip.jsx frontend/src/components/DesignSystem.jsx
git commit -m "$(cat <<'EOF'
feat(ui): StatStrip — V-grade display via formatGrade

Phase 1, Task 6. Cells now render "V6"/"V4"/"—" instead of bare numbers.
Maps directly to the new stat semantics (max V-grade per style) so the
strip is a literal V-grade-per-style readout. Brand-new climbers with
null axes see "—" instead of "0". Showcase demos both populated and
null states.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: StatRadar — null axis handling + starter pentagon tune

**Files:**
- Modify: `frontend/src/components/ui/StatRadar.jsx`

The existing radar treats stats as 0-10 numbers. We need it to handle null axes (don't plot a vertex there) and refine the starter pentagon for brand-new climbers (all null) to render a uniform pentagon at V3-equivalent radius.

- [ ] **Step 7.1: Update StatRadar to handle null axes**

In `frontend/src/components/ui/StatRadar.jsx`, replace the existing implementation (keeping the imports, AXES, AXIS_ANGLES, pointAt, gridPolygon helpers intact) with a refined version that handles nulls:

Find the section starting with `// Starter pentagon for brand-new climbers` (added in the earlier Phase 0 fix) and the lines using `total / AXES.length < 1.5`. REPLACE that whole block with:

```jsx
  // Starter pentagon for brand-new climbers: when every axis is null
  // (no sends logged in any style), render a uniform pentagon at value 3
  // so the radar looks intentional, not broken. Otherwise honor real values
  // and treat null as 0 in the polygon path so the vertex sits at center.
  const allNull = AXES.every((axis) => stats[axis] === null || stats[axis] === undefined)
  const renderStats = allNull
    ? { power: 3, crimpy: 3, dynamic: 3, technical: 3, mobility: 3 }
    : AXES.reduce((acc, axis) => {
        acc[axis] = stats[axis] === null || stats[axis] === undefined ? 0 : stats[axis]
        return acc
      }, {})
```

Then change the `points = statPolygon(renderStats, cx, cy, radius)` line — it should already use `renderStats` from the prior fix. If not, ensure it does.

Update the vertex-dot rendering at the bottom of the SVG so axes that are explicitly null on a real climber (i.e., NOT the starter case) don't render a dot:

```jsx
      {/* Vertex dots: skip null axes on real climbers; show all 5 in starter mode */}
      <g fill="#f0a875">
        {AXES.map((axis, i) => {
          const isNull = stats[axis] === null || stats[axis] === undefined
          if (isNull && !allNull) return null
          const [x, y] = pointAt(renderStats[axis], AXIS_ANGLES[i], cx, cy, radius)
          return <circle key={axis} cx={x} cy={y} r="2.5" />
        })}
      </g>
```

- [ ] **Step 7.2: Update the DesignSystem.jsx StatRadar showcase**

In `frontend/src/components/DesignSystem.jsx`, find the StatRadar section. Update the three example tiles' stats to demonstrate the new behavior:

```jsx
<div className="grid grid-cols-3 gap-4">
  <Surface tier="default" padding="lg">
    <Eyebrow divider className="mb-3">Asymmetric</Eyebrow>
    <StatRadar stats={{ power: 7, crimpy: 6, dynamic: 4, technical: 5, mobility: 3 }} size={130} />
  </Surface>
  <Surface tier="default" padding="lg">
    <Eyebrow divider className="mb-3">Mixed — some null</Eyebrow>
    <StatRadar stats={{ power: 6, crimpy: 4, dynamic: null, technical: 3, mobility: null }} size={130} />
  </Surface>
  <Surface tier="default" padding="lg">
    <Eyebrow divider className="mb-3">Brand new — all null</Eyebrow>
    <StatRadar stats={{ power: null, crimpy: null, dynamic: null, technical: null, mobility: null }} size={130} />
  </Surface>
</div>
```

- [ ] **Step 7.3: Verify build + visual**

Run: `npm run build` — clean.
Visit `/design-system`. Three pentagons:
- Asymmetric — irregular shape, all 5 dots visible (unchanged from before)
- Mixed — only 3 dots visible (power, crimpy, technical); the polygon's dynamic and mobility axes are at center (value 0)
- Brand new — clean small uniform pentagon at value 3; all 5 dots visible

- [ ] **Step 7.4: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/components/ui/StatRadar.jsx frontend/src/components/DesignSystem.jsx
git commit -m "$(cat <<'EOF'
fix(ui): StatRadar — null axis handling

Phase 1, Task 7. Real climbers with mixed-null axes (e.g., never sent a
dyno) now render with the null axis vertex at center (no dot, polygon
pinched). Brand-new climbers (all null) still render the uniform starter
pentagon at value 3 with all 5 dots — looks intentional, not broken.
Showcase updated to demo all three states.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Rewrite `HubTab.jsx` — scaffold the new layout

**Files:**
- Modify: `frontend/src/components/HubTab.jsx`

This task rewrites HubTab to a clean scaffold that imports the new hub/* components. Sub-components are stubbed in this task (just placeholder text) and filled in by Tasks 9-16. Imports of the scrapped tiles are removed entirely.

- [ ] **Step 8.1: Read the current HubTab.jsx to understand its current structure**

Read `frontend/src/components/HubTab.jsx` — note what hooks/state/routing it uses today. Identify any data-loading hooks (e.g., for the style profile that feeds HubStyleMixCard). The new HubTab will keep the same routing position and any necessary data hooks.

- [ ] **Step 8.2: Create the hub/ directory**

```bash
mkdir -p /Users/mathewbudnik/coretriage/frontend/src/components/hub
```

- [ ] **Step 8.3: Stub the seven sub-component files**

Create each of these as minimal placeholder components (real implementations come in Tasks 9-16):

`frontend/src/components/hub/HubHero.jsx`:
```jsx
export default function HubHero() {
  return <div className="ct-surface rounded-lg p-4 mb-3 text-ct-cream-soft text-sm">HubHero — Task 9-11</div>
}
```

`frontend/src/components/hub/HubStyleStrip.jsx`:
```jsx
export default function HubStyleStrip() {
  return <div className="text-ct-meta text-xs mt-3">StyleStrip — Task 11</div>
}
```

`frontend/src/components/hub/TodaysQuestCard.jsx`:
```jsx
export default function TodaysQuestCard() {
  return <div className="ct-surface rounded-lg p-4 mb-3 text-ct-cream-soft text-sm">TodaysQuestCard — Task 13</div>
}
```

`frontend/src/components/hub/HubToolsGrid.jsx`:
```jsx
export default function HubToolsGrid() {
  return <div className="ct-surface rounded-lg p-4 mb-3 text-ct-cream-soft text-sm">HubToolsGrid — Task 14</div>
}
```

`frontend/src/components/hub/HubProjectTile.jsx`:
```jsx
export default function HubProjectTile() {
  return <div className="ct-surface rounded-lg p-4 mb-3 text-ct-cream-soft text-sm">HubProjectTile — Task 15</div>
}
```

`frontend/src/components/hub/HubRecentSends.jsx`:
```jsx
export default function HubRecentSends() {
  return <div className="ct-surface rounded-lg p-4 mb-3 text-ct-cream-soft text-sm">HubRecentSends — Task 16</div>
}
```

- [ ] **Step 8.4: Rewrite HubTab.jsx to use the new scaffolds**

REPLACE the entire contents of `frontend/src/components/HubTab.jsx` with:

```jsx
import HubHero from './hub/HubHero'
import TodaysQuestCard from './hub/TodaysQuestCard'
import HubToolsGrid from './hub/HubToolsGrid'
import HubProjectTile from './hub/HubProjectTile'
import HubRecentSends from './hub/HubRecentSends'

/**
 * Hub — the climber's home screen. Identity + reward-engine surface.
 *
 * Layout (top to bottom):
 *   1. HubHero — greeting + name + tier badge + stat radar + level meter + streak + style strip
 *   2. TodaysQuestCard — today's daily quest with progress
 *   3. HubProjectTile — your active project (the boss climb)
 *   4. HubToolsGrid — Recover / Train / Ask coach
 *   5. HubRecentSends — last 5 sends with XP earned per row
 */
export default function HubTab() {
  return (
    <div className="min-h-screen bg-ct-forest text-ct-cream p-4 pb-24 max-w-md mx-auto">
      <HubHero />
      <TodaysQuestCard />
      <HubProjectTile />
      <HubToolsGrid />
      <HubRecentSends />
    </div>
  )
}
```

- [ ] **Step 8.5: Verify build + dev-server render**

Run: `npm run build` — expect clean.
Run: `npm run dev &`. Open the dev URL at the Hub route (probably `/`).
Expected: page renders with five labeled placeholder cards, all in the new chrome (forest background, cream text, hairline borders). No console errors. No old Hub tiles visible.

Kill dev server.

- [ ] **Step 8.6: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/components/HubTab.jsx frontend/src/components/hub/
git commit -m "$(cat <<'EOF'
refactor(hub): scaffold new Hub layout

Phase 1, Task 8. Rewrites HubTab.jsx to import a new set of focused
sub-components from src/components/hub/. Removes imports of the old
tiles (HubGreeting, HubFeedCard, HubTipCard, HubPatterns, HubFeaturedCard,
HubRingsCard, HubStyleMixCard, HubWeekStrip) — they stay on disk as dead
code for now; Tasks 9-16 fill in the new sub-component implementations.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: HubHero — greeting + name + tier badge

**Files:**
- Modify: `frontend/src/components/hub/HubHero.jsx`

- [ ] **Step 9.1: Implement the top row of HubHero**

REPLACE the contents of `frontend/src/components/hub/HubHero.jsx` with:

```jsx
import Surface from '../ui/Surface'
import TierBadge from '../ui/TierBadge'
import { useRewardEngine } from '../../lib/rewardEngine'
import { vGradeToTier } from '../../lib/tier'
import { formatGrade } from '../../lib/gradeUtil'

/**
 * Top hero panel — greeting + name + V-grade tier badge.
 * Stat radar + level meter + streak + style strip added in Tasks 10-11.
 */
export default function HubHero() {
  const { state } = useRewardEngine()

  // Highest grade across all styles drives the tier badge.
  const bestGrade = Math.max(
    -1,
    ...Object.values(state.bestPerStyle).filter((v) => v !== null && v !== undefined),
  )
  const hasAnySend = bestGrade >= 0
  const tier = hasAnySend ? vGradeToTier(`V${Math.min(bestGrade, 10)}`) : null

  return (
    <Surface tier="hero" padding="lg" className="mb-3">
      <div className="flex justify-between items-start">
        <div>
          <p className="ct-meta">Welcome back</p>
          <h1 className="text-[22px] font-extrabold text-ct-cream leading-tight tracking-[-0.02em] mt-1">
            Climb Clean.
          </h1>
        </div>
        {tier && <TierBadge name={tier.name} color={tier.c} />}
      </div>
    </Surface>
  )
}
```

Note: this assumes `vGradeToTier` returns an object with at least `name` (e.g., `'EMBER'`) and `c` (hex color). If the existing tier.js exports a different shape, adapt the property names accordingly when implementing. If `vGradeToTier` does not exist by that exact name, search lib/tier.js for the equivalent helper (likely `tokenForGrade` returns the tier object).

- [ ] **Step 9.2: Verify build + dev**

Run: `npm run build` — clean.
Run dev server. Visit Hub route. Confirm:
- Top hero card renders with "Welcome back" eyebrow + "Climb Clean." title
- No tier badge (since the engine has no sends yet)
- Trigger a send via the `/design-system` live demo (log a V6 crimpy flash), navigate back to Hub. Tier badge should now appear (EMBER for V6 per the existing tier system).

- [ ] **Step 9.3: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/components/hub/HubHero.jsx
git commit -m "$(cat <<'EOF'
feat(hub): HubHero — greeting + name + V-grade tier badge

Phase 1, Task 9. First slice of the Hero panel. Pulls bestPerStyle from
the engine, takes the max across styles, and surfaces the matching
V-grade tier badge (Frost/Slatehold/Ember/Phoenix per lib/tier.js).
Title is the brand North Star "Climb Clean." Subsequent tasks (10-11)
fill in the radar, level meter, streak, and style strip.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: HubHero — stat radar + level meter

**Files:**
- Modify: `frontend/src/components/hub/HubHero.jsx`

- [ ] **Step 10.1: Add the radar + level meter row to HubHero**

In `frontend/src/components/hub/HubHero.jsx`, add imports:

```jsx
import StatRadar from '../ui/StatRadar'
import LevelMeter from '../ui/LevelMeter'
import StatStrip from '../ui/StatStrip'
import { levelFromTotalXP } from '../../lib/xp'
import { deriveStatShape } from '../../lib/stats'
```

Inside the component, compute the shape and level from state:

```jsx
  const shape = deriveStatShape(state.sends)
  const { level, xpInLevel, xpForNext } = levelFromTotalXP(state.totalXP)
```

After the existing top row (the `<div>` containing greeting + tier badge), insert a new section before the closing `</Surface>`:

```jsx
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-ct-hairline">
        <StatRadar stats={shape} size={110} />
        <div className="flex-1 min-w-0">
          <LevelMeter
            level={level}
            xpInLevel={xpInLevel}
            xpForNext={xpForNext}
            animateOnMount
          />
        </div>
      </div>

      <div className="mt-4">
        <StatStrip stats={shape} />
      </div>
```

- [ ] **Step 10.2: Verify build + visual**

Run: `npm run build` — clean.
Visit Hub:
- Below the greeting+tier row, see the stat radar (left, ~110px) + LevelMeter (right, fills remaining width)
- Below that, the 5-cell stat strip showing V-grades or "—"
- After logging sends via design-system, both update on Hub re-render

- [ ] **Step 10.3: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/components/hub/HubHero.jsx
git commit -m "$(cat <<'EOF'
feat(hub): HubHero — stat radar + level meter + stat strip

Phase 1, Task 10. Hero now surfaces the climber identity: radar
pentagon (left), level meter with XP-to-next bar (right), and the
5-cell stat strip showing V-grade per style underneath. All three read
from engine state — change on every logged send.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: HubStyleStrip — merged from HubStyleMixCard

**Files:**
- Create: `frontend/src/components/hub/HubStyleStrip.jsx` (overwrite the stub)
- Modify: `frontend/src/components/hub/HubHero.jsx`

This task extracts the bar + insight pattern from the existing HubStyleMixCard and restyles it for the new chrome, folding it into the bottom of HubHero.

- [ ] **Step 11.1: Read the existing HubStyleMixCard to understand its data shape**

Open `frontend/src/components/HubStyleMixCard.jsx`. Note the `profile` prop shape — fields like `profile.pct`, `profile.dominant`, `profile.weakest`, `profile.confidence`. Note where the parent component (the old HubTab, now gone) was getting `profile` from. There's likely a hook or API call in another file (possibly `useStyleProfile()` or a similar helper). Search the repo for `profile.dominant` or `useStyleProfile` to identify the data source.

If the data source is a backend API call, keep using it. If it derives from local state, keep that logic intact.

- [ ] **Step 11.2: Implement HubStyleStrip with the new chrome**

REPLACE `frontend/src/components/hub/HubStyleStrip.jsx` with:

```jsx
import { STYLE_ORDER, STYLE_COLOR, getStyleLabel } from '../../lib/styleColors'

/**
 * Compact style-mix strip — stacked horizontal bar showing what styles
 * the climber has been doing, plus a setter-voice insight line.
 *
 * Folded into HubHero (was a standalone card pre-Phase-1). Hidden when
 * profile.confidence is 'low' (insufficient data).
 *
 * Props:
 *   profile: { pct, counts, total, dominant, weakest, confidence }
 */
export default function HubStyleStrip({ profile }) {
  if (!profile || profile.confidence === 'low') return null

  const insight = (() => {
    const dom = getStyleLabel(profile.dominant)
    const weak = getStyleLabel(profile.weakest)
    if (dom && weak && profile.dominant !== profile.weakest) {
      return <>Mostly <b className="text-ct-cream">{dom}</b>. <b className="text-ct-terra-soft">{weak}</b> is the gap.</>
    }
    if (dom) return <>Mostly <b className="text-ct-cream">{dom}</b>. Keep mixing.</>
    return null
  })()

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <p className="ct-meta">STYLE · LAST 30D</p>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-white/[0.04]">
        {STYLE_ORDER.map((s) => (
          <div
            key={s}
            className="h-full"
            style={{ width: `${profile.pct[s]}%`, background: STYLE_COLOR[s].c }}
            aria-label={`${getStyleLabel(s)} ${profile.pct[s]} percent`}
          />
        ))}
      </div>
      {insight && (
        <p className="text-[11px] text-ct-cream-soft leading-snug mt-2">
          {insight}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 11.3: Wire HubStyleStrip into HubHero**

In `frontend/src/components/hub/HubHero.jsx`, identify how `profile` was previously obtained (per Step 11.1). If there's an existing hook (e.g., `useStyleProfile()`), import and use it. If the data source is a backend API and not yet exposed as a hook, defer that hook creation to the implementer and have HubStyleStrip receive a null profile for now (which makes it hide).

Add the import:

```jsx
import HubStyleStrip from './HubStyleStrip'
```

If a hook exists (e.g., `useStyleProfile` from `../../hooks/`):

```jsx
import { useStyleProfile } from '../../hooks/useStyleProfile'
```

Inside the component, after `const shape = ...`:

```jsx
  const styleProfile = useStyleProfile()  // returns profile object or null
```

After the `<StatStrip>` block, insert:

```jsx
      <div className="mt-5 pt-4 border-t border-ct-hairline">
        <HubStyleStrip profile={styleProfile} />
      </div>
```

If NO hook exists, document this gap in the commit message and pass `profile={null}` for now (which makes HubStyleStrip render nothing — graceful no-op until Phase 1.5 wires the data).

- [ ] **Step 11.4: Verify build + visual**

Run: `npm run build` — clean.
Visit Hub:
- If hook exists and you have style data: see the stacked bar + insight line at the bottom of the hero
- If no hook / no data: hero bottom border just doesn't render the strip (gracefully)

- [ ] **Step 11.5: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/components/hub/HubStyleStrip.jsx frontend/src/components/hub/HubHero.jsx
git commit -m "$(cat <<'EOF'
feat(hub): HubStyleStrip — style mix merged into Hero

Phase 1, Task 11. Extracts the stacked-bar + setter-insight pattern from
HubStyleMixCard and folds it into the bottom of HubHero with the new
chrome. The old standalone HubStyleMixCard is no longer imported by
HubTab — its data hook lives on, the visualization just moved into the
Hero panel where it belongs (your style profile is part of your
identity, not a separate tile).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: StreakEmblem on Hub (new slot)

**Files:**
- Modify: `frontend/src/components/hub/HubHero.jsx`

The brainstorm mockup showed StreakEmblem as a separate panel between the Hero and TodaysQuestCard. The simpler integration is to place it inside the Hero, just below the level meter row. This keeps the Hero as the single identity panel and avoids another card divider.

- [ ] **Step 12.1: Add StreakEmblem to HubHero**

In `frontend/src/components/hub/HubHero.jsx`, add the import:

```jsx
import StreakEmblem from '../ui/StreakEmblem'
```

Find the existing radar+level row. Just BEFORE the `<div className="mt-4"><StatStrip stats={shape} /></div>` block, insert:

```jsx
      {(state.streak.days > 0 || state.streak.best > 0) && (
        <div className="mt-4">
          <StreakEmblem days={state.streak.days} best={state.streak.best} />
        </div>
      )}
```

The conditional renders nothing if the climber has zero streak history (cleaner first-load).

- [ ] **Step 12.2: Verify build + visual**

Run: `npm run build` — clean.
Visit Hub. Trigger a send via design-system, return to Hub. Streak emblem appears with "1 day streak / Personal best: 1 days" and "0 TO PB" disappears (since days === best).

- [ ] **Step 12.3: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/components/hub/HubHero.jsx
git commit -m "$(cat <<'EOF'
feat(hub): StreakEmblem wired into Hero

Phase 1, Task 12. Adds the streak emblem to the Hero panel, sourced
from engine state. Hidden until the climber has any streak history,
so brand-new climbers don't see a "0 day streak" message that says
nothing.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: TodaysQuestCard — wires QuestCard primitive to engine

**Files:**
- Modify: `frontend/src/components/hub/TodaysQuestCard.jsx`
- Modify: `frontend/src/lib/rewardEngine.js`

A daily quest needs to be generated once per day. We add a helper on the engine that ensures today's quest is set, then TodaysQuestCard renders it via the QuestCard primitive.

- [ ] **Step 13.1: Add `ensureDailyQuest` helper in rewardEngine.js**

In `frontend/src/lib/rewardEngine.js`, add an import for the quest generator and stats deriver if not already present:

```js
import { generateDailyQuest } from './quests.js'
```

Append at the bottom (after addSend):

```js
function todayDateString() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Ensure today's quest is generated. If state.quest.generatedDate is
 * already today's date, returns state unchanged. Otherwise generates a
 * fresh quest using the climber's current stat shape, replaces the
 * quest field, and returns the new state.
 */
export function ensureDailyQuest(state) {
  const today = todayDateString()
  if (state.quest.generatedDate === today && state.quest.id) return state
  const shape = deriveStatShape(state.sends)
  const lastSend = state.sends[state.sends.length - 1]
  const lastTrainingType = lastSend ? 'climbing' : null
  const lastTrainingDaysAgo = lastSend
    ? Math.floor((Date.now() - lastSend.ts) / (24 * 60 * 60 * 1000))
    : 99
  // For Phase 1 we don't yet track outdoor/grade trends, so pass reasonable defaults.
  const quest = generateDailyQuest({
    statShape: shape,
    lastTrainingType,
    lastTrainingDaysAgo,
    hasOutdoorIn30d: state.sends.some((s) => s.modality === 'outdoor'),
    averageSendGrade: lastSend ? lastSend.grade : 'V0',
    recentSendsAtGrade: false,
    seed: Date.parse(today),
  })
  return {
    ...state,
    quest: {
      id: quest.id,
      generatedDate: today,
      progress: { current: 0, target: quest.target },
    },
  }
}
```

Then update `useRewardEngine()` to call `ensureDailyQuest` on mount. In the `useState(() => loadState())` initializer, wrap with ensureDailyQuest, and persist if changed:

```jsx
export function useRewardEngine() {
  const [state, setState] = useState(() => {
    const loaded = loadState()
    const withQuest = ensureDailyQuest(loaded)
    if (withQuest !== loaded) saveState(withQuest)
    return withQuest
  })

  // ... (rest unchanged: logSend, reset)
}
```

- [ ] **Step 13.2: Implement TodaysQuestCard**

REPLACE `frontend/src/components/hub/TodaysQuestCard.jsx` with:

```jsx
import QuestCard from '../ui/QuestCard'
import { useRewardEngine } from '../../lib/rewardEngine'
import { QUEST_TYPES } from '../../lib/quests'

/**
 * Wraps the QuestCard primitive with engine state — surfaces today's
 * quest and its progress. If no quest (unlikely after ensureDailyQuest
 * runs), renders nothing.
 */
export default function TodaysQuestCard() {
  const { state } = useRewardEngine()
  const quest = QUEST_TYPES.find((q) => q.id === state.quest.id)
  if (!quest) return null

  return (
    <QuestCard
      title={quest.title}
      why={quest.why}
      xp={quest.xp}
      progress={{
        current: state.quest.progress.current,
        target:  state.quest.progress.target,
      }}
      className="mb-3"
    />
  )
}
```

- [ ] **Step 13.3: Verify build + visual**

Run: `npm run build` — clean.
Visit Hub. After the Hero, the TodaysQuestCard should render with one of the QUEST_TYPES titles (e.g., "Find something slabby" — picked by `generateDailyQuest`).

If you reset the engine via design-system, then return to Hub, a new quest should be regenerated (since `generatedDate` is now null).

- [ ] **Step 13.4: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/lib/rewardEngine.js frontend/src/components/hub/TodaysQuestCard.jsx
git commit -m "$(cat <<'EOF'
feat(hub): TodaysQuestCard + engine ensureDailyQuest

Phase 1, Task 13. Adds ensureDailyQuest(state) helper that generates a
quest once per local day (keyed by date string), seeded by the date so
multiple opens of the app on the same day all see the same quest.
useRewardEngine runs ensureDailyQuest on mount and persists any
generated quest. TodaysQuestCard pulls the quest from state and renders
the QuestCard primitive — quest copy already in setter voice from Phase 0.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: HubToolsGrid — Recover / Train / Ask coach

**Files:**
- Modify: `frontend/src/components/hub/HubToolsGrid.jsx`

The existing app uses lucide icons for tab navigation. Reuse those + the existing `useNavigate` pattern.

- [ ] **Step 14.1: Implement HubToolsGrid**

REPLACE `frontend/src/components/hub/HubToolsGrid.jsx` with:

```jsx
import { useNavigate } from 'react-router-dom'
import { Stethoscope, Dumbbell, MessageSquare } from 'lucide-react'
import AnimatedIcon from '../ui/AnimatedIcon'

/**
 * Three small navigation tiles for Recover / Train / Chat. Smaller
 * footprint than they had in the old Hub — the RPG layer is now the
 * centerpiece; these are tools you reach for.
 */
const TOOLS = [
  { key: 'recover', label: 'RECOVER',   icon: Stethoscope,    color: '#7dd3c0', route: '/recover' },
  { key: 'train',   label: 'TRAIN',     icon: Dumbbell,       color: '#a78bfa', route: '/train' },
  { key: 'chat',    label: 'ASK COACH', icon: MessageSquare,  color: '#f0a875', route: '/chat' },
]

export default function HubToolsGrid() {
  const navigate = useNavigate()
  return (
    <div className="grid grid-cols-3 gap-2 mb-3">
      {TOOLS.map((tool) => (
        <button
          key={tool.key}
          type="button"
          onClick={() => navigate(tool.route)}
          className="ct-surface rounded-lg p-3 text-center hover:border-ct-rim transition-colors"
        >
          <AnimatedIcon as={tool.icon} interaction="hover-settle" size={22} color={tool.color} />
          <p className="text-[9px] tracking-[0.18em] uppercase font-extrabold text-ct-moss mt-2">
            {tool.label}
          </p>
        </button>
      ))}
    </div>
  )
}
```

Note: route paths assume `/recover`, `/train`, `/chat` exist in the existing App.jsx route table. If route names are different, update the `route` field in TOOLS to match.

- [ ] **Step 14.2: Verify build + nav**

Run: `npm run build` — clean.
Visit Hub. Three small tiles render (cyan stethoscope, violet dumbbell, gold message square). Tap each — should navigate to the existing tab.

- [ ] **Step 14.3: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/components/hub/HubToolsGrid.jsx
git commit -m "$(cat <<'EOF'
feat(hub): HubToolsGrid — Recover / Train / Ask coach navigation tiles

Phase 1, Task 14. Three small lucide-icon tiles for Recover, Train,
and Ask coach (Chat). Smaller footprint than the old Hub design — the
RPG layer (Hero, quest, project) is the centerpiece now; these are
tools you reach for, not the main attraction.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: HubProjectTile — RPG-enhanced from HubProjectCard

**Files:**
- Modify: `frontend/src/components/hub/HubProjectTile.jsx`

User direction: preserve HubProjectCard's value but re-frame in the RPG theme — "today's project" with setter voice. Read the existing HubProjectCard for its data shape and behavior, then build a new component in the new chrome.

- [ ] **Step 15.1: Read existing HubProjectCard**

Open `frontend/src/components/HubProjectCard.jsx`. Note its props (likely a project object with name, grade, attempts, gym, etc.), its data source (likely a hook or prop drilled from old HubTab), and any actions (set project, log attempt, etc.).

- [ ] **Step 15.2: Implement HubProjectTile in new chrome**

REPLACE `frontend/src/components/hub/HubProjectTile.jsx` with a wrapped version that fits the new chrome. The exact internal shape depends on what HubProjectCard's data source looks like — if it accepts a `project` prop and an `onClick`, this is a minimal stylistic wrap. Pseudo-template:

```jsx
import Surface from '../ui/Surface'
import Eyebrow from '../ui/Eyebrow'
import { formatGrade } from '../../lib/gradeUtil'

/**
 * Your project — the climb you're working. Re-framed from the old
 * HubProjectCard in the new chrome with setter voice ("THE PROJECT").
 *
 * Props (from existing useProject hook or similar — wire to existing data source):
 *   project: { name, grade, attempts, gym, lastTried } | null
 */
export default function HubProjectTile({ project }) {
  if (!project) {
    // Empty state — climber has no active project
    return (
      <Surface tier="default" padding="lg" className="mb-3">
        <Eyebrow>The project</Eyebrow>
        <p className="text-[14px] text-ct-cream-soft mt-2">
          No project picked. Find a problem you can't send and work it.
        </p>
      </Surface>
    )
  }

  return (
    <Surface tier="default" padding="lg" className="mb-3">
      <div className="flex justify-between items-baseline">
        <Eyebrow>The project</Eyebrow>
        <p className="text-[10px] text-ct-moss tracking-[0.10em]">
          {project.attempts} attempt{project.attempts === 1 ? '' : 's'}
        </p>
      </div>
      <p className="text-[16px] font-bold text-ct-cream mt-2 tracking-[-0.01em]">
        {project.name}
      </p>
      <p className="text-[12px] text-ct-terra-soft mt-1 font-extrabold">
        {formatGrade(project.gradeNum ?? null)} · {project.gym || 'gym'}
      </p>
    </Surface>
  )
}
```

If the project data needs to come from a hook (e.g., `useActiveProject()`), wire it inside HubProjectTile itself rather than passing as a prop:

```jsx
// At top of file
import { useActiveProject } from '../../hooks/useActiveProject'  // adapt to actual hook name

// In component:
const project = useActiveProject()
// then `if (!project) return ...`
```

- [ ] **Step 15.3: Verify build + visual**

Run: `npm run build` — clean.
Visit Hub. HubProjectTile renders:
- If no project: empty state with setter voice copy
- If project: name + grade + attempts in new chrome

- [ ] **Step 15.4: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/components/hub/HubProjectTile.jsx
git commit -m "$(cat <<'EOF'
feat(hub): HubProjectTile — RPG-themed project tile

Phase 1, Task 15. Replaces the old HubProjectCard with a tile re-styled
to the new chrome and re-framed in setter voice ("THE PROJECT" / "No
project picked. Find a problem you can't send and work it."). Wires to
the existing project data source. Logs of attempts on the project will
flow through the reward engine naturally via the standard send-logging
path in Task 17.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 16: HubRecentSends — last 5 sends with XP

**Files:**
- Modify: `frontend/src/components/hub/HubRecentSends.jsx`

- [ ] **Step 16.1: Implement HubRecentSends**

REPLACE `frontend/src/components/hub/HubRecentSends.jsx` with:

```jsx
import Surface from '../ui/Surface'
import Eyebrow from '../ui/Eyebrow'
import { useRewardEngine } from '../../lib/rewardEngine'
import { formatGrade } from '../../lib/gradeUtil'

/**
 * Last 5 sends, newest first. Each row shows the grade badge, name or
 * style descriptor, and XP earned. Climbers see the reward loop close —
 * "I logged that V6, I got 180 XP, it's right there in my history."
 */
export default function HubRecentSends() {
  const { state } = useRewardEngine()
  const recent = [...state.sends].reverse().slice(0, 5)

  if (recent.length === 0) {
    return (
      <Surface tier="default" padding="lg" className="mb-3">
        <Eyebrow>Recent sends</Eyebrow>
        <p className="text-[13px] text-ct-cream-soft mt-2">
          Nothing logged. Send something.
        </p>
      </Surface>
    )
  }

  return (
    <Surface tier="default" padding="lg" className="mb-3">
      <Eyebrow divider className="mb-3">Recent sends</Eyebrow>
      <ul className="space-y-2">
        {recent.map((s, i) => (
          <li key={s.ts ?? i}
              className="flex items-center justify-between text-[12px]">
            <span className="flex items-center gap-2 min-w-0 flex-1">
              <span className="bg-ct-terracotta text-ct-forest px-2 py-0.5 rounded text-[11px] font-extrabold tracking-[0.04em]">
                {formatGrade(s.gradeNum)}
              </span>
              <span className="text-ct-cream truncate">
                {s.outcome === 'flash' ? 'flash' : s.outcome === 'project' ? 'project' : 'redpoint'}
                {' · '}
                {s.stylePrimary}
              </span>
            </span>
            <span className="text-ct-terra-soft font-extrabold tabular-nums shrink-0">
              +{s.xpEarned} XP
            </span>
          </li>
        ))}
      </ul>
    </Surface>
  )
}
```

- [ ] **Step 16.2: Verify build + visual**

Run: `npm run build` — clean.
Visit Hub:
- Empty state: "Nothing logged. Send something."
- After logging via design-system or via the live engine demo: rows appear (newest first) with grade badge, outcome+style, and XP earned

- [ ] **Step 16.3: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/components/hub/HubRecentSends.jsx
git commit -m "$(cat <<'EOF'
feat(hub): HubRecentSends — last 5 sends with XP earned per row

Phase 1, Task 16. Closes the reward loop visibly — climbers see each
recent send + the XP it earned. Empty state in setter voice: "Nothing
logged. Send something." Newest first, capped at 5; tap-to-expand is
deferred (sends history is also surfaced in the existing HistoryTab).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 17: Wire `TrainingLogEntry` to addSend + fire celebration

**Files:**
- Modify: `frontend/src/components/TrainingLogEntry.jsx`

The existing TrainingLogEntry saves sends to the backend. After a successful save, we ALSO route the saved sends through the reward engine and fire CelebrationOverlay on a level-up or PR.

- [ ] **Step 17.1: Read TrainingLogEntry to find the save callback**

Open `frontend/src/components/TrainingLogEntry.jsx`. Identify the function that runs after a successful save (the success path of the API call). This is where to insert the reward engine call. Also note the existing form state shape so we can build the `send` object correctly.

- [ ] **Step 17.2: Wire reward engine + celebration overlay**

In `frontend/src/components/TrainingLogEntry.jsx`, add imports:

```jsx
import { useState } from 'react'  // already imported probably; ensure present
import { useRewardEngine } from '../lib/rewardEngine'
import CelebrationOverlay from './ui/CelebrationOverlay'
```

Inside the component, declare hooks near the existing useState calls:

```jsx
  const { logSend } = useRewardEngine()
  const [celebration, setCelebration] = useState(null)  // { title, subtitle } or null
```

Find the success handler — the function that runs after a successful save. After the existing success-path code, add:

```jsx
      // Route the saved send through the reward engine
      if (form.climbs && Array.isArray(form.climbs)) {
        let lastEvents = null
        for (const climb of form.climbs) {
          const send = {
            grade:        climb.grade,
            modality:     form.session_type === 'outdoor' ? 'outdoor' : 'indoor',
            outcome:      climb.outcome || 'redpoint',
            stylePrimary: climb.stylePrimary || 'powerful',
            isDeepLog:    !!climb.isDeepLog,
            ts:           Date.now(),
          }
          const events = logSend(send)
          if (events.xpEarned > 0) lastEvents = events
        }
        if (lastEvents?.leveledUp) {
          setCelebration({
            title:    `Lv ${lastEvents.level}. Keep moving.`,
            subtitle: `+${lastEvents.xpEarned} XP`,
          })
        } else if (lastEvents?.isPersonalRecord) {
          setCelebration({
            title:    `Clean send. ${form.climbs[form.climbs.length - 1].grade}.`,
            subtitle: `+${lastEvents.xpEarned} XP`,
          })
        }
      }
```

Note: The exact form fields (`form.climbs`, `form.session_type`, etc.) must match the actual shape of TrainingLogEntry's state. Read the file to confirm — if the form does not have an array called `climbs`, adapt to whatever the actual field is (e.g., `form.grades_sent` parsing). If the form supports a single send rather than a batch, simplify the loop to a single `logSend` call. The intent is: ANY logged send should flow through the reward engine.

Just before the component's return, render the celebration:

```jsx
  return (
    <>
      <CelebrationOverlay
        open={!!celebration}
        title={celebration?.title}
        subtitle={celebration?.subtitle}
        onClose={() => setCelebration(null)}
      />
      {/* existing component JSX */}
    </>
  )
```

(Adapt the JSX wrapping to integrate without breaking the existing root element. If the existing root is already a fragment, just slot CelebrationOverlay before its children.)

- [ ] **Step 17.3: Verify build + dev**

Run: `npm run build` — clean.
Run dev server. Navigate to the Train tab → log a climb session with at least one send (e.g., a V6 crimpy flash). On save:
- CelebrationOverlay fires with "Clean send. V6." + "+180 XP"
- Navigate to Hub — see updated level, radar, recent sends, etc.
- Refresh — state persists

- [ ] **Step 17.4: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/components/TrainingLogEntry.jsx
git commit -m "$(cat <<'EOF'
feat(engine): wire TrainingLogEntry to reward engine + celebrations

Phase 1, Task 17. After a successful save, each logged climb is routed
through useRewardEngine().logSend(). Level-ups fire the
CelebrationOverlay with "Lv N. Keep moving."; personal records fire
"Clean send. {grade}." Both in setter voice (Phase 0 brand voice spec).
Existing save behavior unchanged — engine is purely additive.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 18: Tier badge tunes its color from the climber's current PR

**Files:**
- Modify: `frontend/src/components/hub/HubHero.jsx`

This task is a polish: Task 9 set up the tier badge but with a placeholder for the color helper. Verify that the color actually comes through correctly and that the existing tier color tokens (Frost, Slatehold, Ember, Phoenix) map cleanly.

- [ ] **Step 18.1: Verify the tier color is sourced correctly**

In `frontend/src/components/hub/HubHero.jsx`, the existing HubHero from Task 9 already imports `vGradeToTier`. Confirm that `vGradeToTier(grade)` returns an object with the tier name and color. If the actual export is a different shape (e.g., `tokenForGrade(grade).c`), adapt:

```jsx
import { tokenForGrade } from '../../lib/tier'  // or whatever helper exists

// inside component:
const tier = hasAnySend ? tokenForGrade(`V${Math.min(bestGrade, 10)}`) : null

// pass to TierBadge:
{tier && <TierBadge name={tier.name?.toUpperCase() || tier.label || 'CLIMBER'} color={tier.c || tier.color || '#d97757'} />}
```

The defensive fallbacks let the exact tier.js export shape vary without breaking the tile.

- [ ] **Step 18.2: Sanity-check all four tier ranges**

In the design-system live engine demo, log sends at different grades:
- V1 → tier should be Frost (cool blue)
- V3 → tier should be Slatehold (gray)
- V5 → tier should be Ember (warm orange — current default)
- V8 → tier should be Phoenix (fire gold)

Navigate to Hub between each, confirm the badge color shifts.

- [ ] **Step 18.3: Commit (if changes were needed)**

If Step 18.1 required edits:

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/components/hub/HubHero.jsx
git commit -m "$(cat <<'EOF'
fix(hub): tier badge uses correct tier.js helper

Phase 1, Task 18. Verifies the tier badge in HubHero correctly resolves
to the right TIER_TOKENS color from the climber's current max V-grade
across styles. Tests Frost → Slatehold → Ember → Phoenix ranges
manually via the design-system live demo.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

If no changes were needed, skip the commit — the prior commit already covers this.

---

## Task 19: Phase 1 smoke verification

**No new files.** Final smoke before declaring Phase 1 complete.

- [ ] **Step 19.1: Run full test suite**

Run: `cd /Users/mathewbudnik/coretriage/frontend && npm test`
Expected: all tests pass. Should be in the range of 50+ tests now (35 from Phase 0 + ~15 new).

- [ ] **Step 19.2: Verify production build**

Run: `cd frontend && npm run build`
Expected: clean. No new chunk-size warnings beyond what existed.

- [ ] **Step 19.3: Walk the new Hub end-to-end**

Run dev server. Navigate to Hub:
- Hero panel renders with "Welcome back" / "Climb Clean." / Tier badge (if any sends) / Radar / LevelMeter / StatStrip / Streak (if any) / StyleStrip (if data)
- TodaysQuestCard renders with one of the QUEST_TYPES titles
- HubProjectTile renders (project or empty state)
- HubToolsGrid renders three tiles — tap each, navigate works
- HubRecentSends — empty state OR populated with recent sends

Trigger a send via TrainingLogEntry:
- Celebration overlay fires
- Navigate back to Hub — all state updated

Reload the page. Confirm state persists from localStorage.

Set OS prefers-reduced-motion to "reduce". Reload. Confirm:
- LevelMeter bar still fills (at end position, no animation)
- StatRadar polygon still renders (no fade)
- CelebrationOverlay still fires but instantly

Reset prefers-reduced-motion.

- [ ] **Step 19.4: Preservation contract check**

Visit each existing route and confirm no behavior regression:
- `/triage` — SmartTriageCard still works
- `/recover` and `/body` — Body diagram, exercise list, rehab protocol all work
- `/train` — TrainingLogEntry saves correctly + now fires engine
- `/chat` — Chat tab works
- `/progress` — Grade Pyramid + Tier Hero + Awards Strip all unchanged

If anything has regressed, identify the culprit task and fix.

- [ ] **Step 19.5: Verify scrapped Hub tiles don't render anywhere**

Grep for the scrapped tile imports across the codebase:

```bash
cd /Users/mathewbudnik/coretriage/frontend
grep -rn "HubGreeting\|HubFeedCard\|HubTipCard\|HubPatterns\|HubFeaturedCard\|HubRingsCard\|HubStyleMixCard\|HubWeekStrip" src/ --include='*.jsx' --include='*.js' | grep -v __tests__
```

Expected: only matches are the source files themselves (no import statements bringing them into rendered components). If any other file still imports them, decide whether to keep the import (component is rendered elsewhere) or remove it (dead reference).

- [ ] **Step 19.6: Commit any preservation-contract fixes**

If Step 19.4 or 19.5 surfaced issues, commit fixes here. Otherwise skip.

---

## Task 20: Phase 1 retrospective

**No new files** other than appending to the spec.

- [ ] **Step 20.1: Append Phase 1 retrospective to the spec**

In `docs/superpowers/specs/2026-05-20-rpg-climber-design.md`, append at the BOTTOM (after the existing Phase 0 retrospective section) a new section:

```markdown
## Phase 1 retrospective (added after implementation)

[3-6 bullets capturing:
- Any spec deviations and why
- Friction points
- Behavioral observations from the engine — does the level curve feel right? Are quests landing? Do PR celebrations feel earned or annoying?
- What Phase 2 (Logging UX) needs to take into account based on Phase 1 reality]
```

- [ ] **Step 20.2: Commit retrospective**

```bash
cd /Users/mathewbudnik/coretriage
git add docs/superpowers/specs/2026-05-20-rpg-climber-design.md
git commit -m "$(cat <<'EOF'
docs(spec): Phase 1 retrospective notes

Captures deviations, friction, and engine-tuning observations from
Phase 1. Informs Phase 2 (Logging UX — Quick + Deep modes) planning.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 1 complete

When all 20 tasks check off:
- The reward engine state lives in localStorage and persists across sessions.
- `deriveStatShape` now returns max V-grade per style — stats only go up.
- StatStrip displays V-grades ("V6" / "—"); StatRadar handles null axes gracefully.
- HubTab is rewritten as a clean 5-section layout — Hero (greeting + tier + radar + level + streak + style strip), TodaysQuestCard, HubProjectTile, HubToolsGrid, HubRecentSends.
- Eight legacy Hub tiles are no longer rendered (HubGreeting, HubFeedCard, HubTipCard, HubPatterns, HubFeaturedCard, HubRingsCard, HubStyleMixCard, HubWeekStrip). Files stay on disk for safety; deletion is a later cleanup phase.
- HubProjectCard is re-styled as HubProjectTile in setter voice.
- TrainingLogEntry routes saved sends through the reward engine; level-ups and PRs fire the CelebrationOverlay in setter voice.
- The `/design-system` live engine demo proves end-to-end engine behavior.
- Branch `redesign/rpg-climber` is ~20 commits ahead of where Phase 1 started.

**Next:** Phase 2 (Logging UX) — Quick + Deep logging modes added to TrainingLogEntry as the primary entry. Separate implementation plan, written after Phase 1 ships and the retrospective is captured.
