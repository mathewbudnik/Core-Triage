# Train Tab Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Train tab around a today-first hero, tier-themed glass surface, week strip, and bottom-sheet session detail — mirroring the Hub/Progress aesthetic.

**Architecture:** Replace the existing `TrainTab.jsx` + `PlanView.jsx` pair with a thin orchestrator (`TrainTab.jsx`) that mounts seven small Train-specific components under `frontend/src/components/train/`. Two pure-function helpers (`sessionType.js`, `trainSessions.js`) keep date math and color tokens out of the components. The orchestrator reuses `useHubData` for `streakDays`, `hardestSends`, and `weekLoggedDates` so Train and Hub stay in sync.

**Tech Stack:** React 18 + framer-motion 11 + lucide-react + TailwindCSS. The frontend has **no test runner** — verification is via `node` for pure helpers, `npx vite build` for components, and manual phone smoke tests for layout. Do not introduce Vitest; that's out of scope.

---

## Spec reference

Full spec: [docs/superpowers/specs/2026-05-17-train-tab-redesign-design.md](../specs/2026-05-17-train-tab-redesign-design.md)

## Conventions

- **No emojis.** Use lucide-react icons (`Flame`, `Sparkles`, `Check`, `ChevronRight`, `ChevronDown`, `Dumbbell`, `Loader2`, `X`). Confirmed user preference.
- **Tier theming.** All cards and accents derive from CSS custom properties `--tier-c`, `--tier-light`, `--tier-deep`, `--tier-glow` set by `<TierThemeRoot>`. Hardcode hex only inside `sessionType.js`.
- **Glass cards.** `bg-black/35 backdrop-blur-md rounded-2xl border-[0.5px] border-white/[0.10]` is the canonical card surface.
- **Tabular numerics.** Add `tabular-nums` to any element rendering digits.
- **Frequent commits.** One commit per task, after the verification step passes.

## Task overview

| # | Task | Files |
|---|---|---|
| 1 | `sessionType.js` — color tokens + helper | New + smoke test |
| 2 | `trainSessions.js` — date↔session math | New + smoke test |
| 3 | `TrainStreakChip.jsx` — Flame gold pill | New |
| 4 | `TrainPlanArcChip.jsx` — Week N of M chip | New |
| 5 | `TrainHeader.jsx` — eyebrow + Train. + tier pill + streak slot | New |
| 6 | `TrainWeekStrip.jsx` — 7-day tile strip | New |
| 7 | `TrainHeroCard.jsx` — dominant today/past/future/rest card | New |
| 8 | `TrainNextUpRow.jsx` — next-up footer row | New |
| 9 | `PlanArcSheet.jsx` — bottom sheet listing weeks 1-4 | New |
| 10 | `SessionDetailSheet.jsx` — exercise list + Log CTA in a bottom sheet | New |
| 11 | `TrainTab.jsx` — full rewrite, orchestrate everything | Modify |
| 12 | Delete `PlanView.jsx` + verify build | Delete |
| 13 | Manual phone verification on iPhone 13 mini width (375px) | None |

---

### Task 1: `sessionType.js` — color tokens + helper

**Files:**
- Create: `frontend/src/lib/sessionType.js`
- Create: `frontend/scripts/smoke-sessionType.mjs`

Pure-function module exporting `SESSION_TYPE_COLOR` and `getSessionTypeColor(type)`. Lives in `frontend/src/lib/` alongside `tier.js`. The smoke script under `frontend/scripts/` is run with `node` to verify behavior.

- [ ] **Step 1: Write the smoke script as the failing test**

Create `frontend/scripts/smoke-sessionType.mjs`:

```javascript
// Smoke verification for sessionType.js.
// Run: node frontend/scripts/smoke-sessionType.mjs
import { SESSION_TYPE_COLOR, getSessionTypeColor } from '../src/lib/sessionType.js'
import assert from 'node:assert/strict'

assert.equal(SESSION_TYPE_COLOR.Power.c, '#fb7185', 'Power maps to coral')
assert.equal(SESSION_TYPE_COLOR.Endurance.c, '#14b8a6', 'Endurance maps to teal')
assert.equal(SESSION_TYPE_COLOR.Strength.c, '#f7b03a', 'Strength maps to gold')
assert.equal(SESSION_TYPE_COLOR.Rest.c, 'transparent', 'Rest has transparent dot')

// Helper returns triple
const cove = getSessionTypeColor('Endurance')
assert.deepEqual(cove, { c: '#14b8a6', light: '#5eead4', deep: '#0a4f48' })

// Unknown type falls back to Endurance (the spec-mandated fallback)
const unknown = getSessionTypeColor('NotAType')
assert.equal(unknown.c, '#14b8a6', 'unknown type falls back to Endurance')

// Null / undefined safe
assert.equal(getSessionTypeColor(null).c, '#14b8a6')
assert.equal(getSessionTypeColor(undefined).c, '#14b8a6')

console.log('OK sessionType')
```

- [ ] **Step 2: Run smoke script to verify it fails**

Run: `node frontend/scripts/smoke-sessionType.mjs`
Expected: `ERR_MODULE_NOT_FOUND` for `../src/lib/sessionType.js`.

- [ ] **Step 3: Implement `sessionType.js`**

Create `frontend/src/lib/sessionType.js`:

```javascript
/**
 * Color tokens for session types. Each entry mirrors the V-tier palette so
 * Train's chromatic accents stay coherent with the rest of the app.
 *
 * Session-type color appears in exactly one place at runtime: the dot before
 * the eyebrow inside the hero card. Everything else uses the user's tier
 * color. See docs/superpowers/specs/2026-05-17-train-tab-redesign-design.md.
 */
export const SESSION_TYPE_COLOR = {
  Power:     { c: '#fb7185', light: '#fda4af', deep: '#7f1d2c' },   // v10 Phoenix
  Limit:     { c: '#ff7a3d', light: '#ffa97a', deep: '#802811' },   // v2 Ember
  Endurance: { c: '#14b8a6', light: '#5eead4', deep: '#0a4f48' },   // v5 Cove (fallback)
  Hangboard: { c: '#c5e637', light: '#d9f06a', deep: '#5a6810' },   // v3 Bramble
  Strength:  { c: '#f7b03a', light: '#fbd470', deep: '#7c5a14' },   // v1 Halo
  Mobility:  { c: '#8466ff', light: '#ad95ff', deep: '#3a2580' },   // v8 Veil
  Rest:      { c: 'transparent', light: 'transparent', deep: 'transparent' },
}

/**
 * Return { c, light, deep } for a session type. Falls back to Endurance
 * (Cove teal) for unknown / null / undefined inputs — the same fallback the
 * spec defines and the rest of the codebase already trusts.
 */
export function getSessionTypeColor(type) {
  return SESSION_TYPE_COLOR[type] || SESSION_TYPE_COLOR.Endurance
}
```

- [ ] **Step 4: Run smoke script to verify it passes**

Run: `node frontend/scripts/smoke-sessionType.mjs`
Expected: `OK sessionType`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/sessionType.js frontend/scripts/smoke-sessionType.mjs
git commit -m "$(cat <<'EOF'
feat(train): SESSION_TYPE_COLOR token table + getSessionTypeColor helper

Pure-function module mirroring the V-tier palette. Used by TrainHeroCard's
eyebrow dot — the single chromatic accent inside an otherwise tier-themed
hero. Unknown types fall back to Endurance (Cove teal).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `trainSessions.js` — date↔session math

**Files:**
- Create: `frontend/src/lib/trainSessions.js`
- Create: `frontend/scripts/smoke-trainSessions.mjs`

Three pure functions: `sessionForDay`, `dayStatusFor`, and `currentWeekDates`. The math mirrors the existing `planSessionForToday` in `useHubData.js` so Train and Hub agree on which session belongs to which date.

- [ ] **Step 1: Write the smoke script as the failing test**

Create `frontend/scripts/smoke-trainSessions.mjs`:

```javascript
// Smoke verification for trainSessions.js.
// Run: node frontend/scripts/smoke-trainSessions.mjs
import { sessionForDay, dayStatusFor, currentWeekDates } from '../src/lib/trainSessions.js'
import assert from 'node:assert/strict'

const plan = {
  start_date: '2026-05-11',  // a Monday
  duration_weeks: 4,
  plan_data: {
    days_per_week: 3,
    sessions: [
      { week: 1, day_in_week: 1, session_type: 'Power',     session_index: 0 },
      { week: 1, day_in_week: 2, session_type: 'Endurance', session_index: 1 },
      { week: 1, day_in_week: 3, session_type: 'Strength',  session_index: 2 },
      { week: 2, day_in_week: 1, session_type: 'Power',     session_index: 3 },
      { week: 2, day_in_week: 2, session_type: 'Endurance', session_index: 4 },
      { week: 2, day_in_week: 3, session_type: 'Strength',  session_index: 5 },
    ],
  },
}

// sessionForDay
const s1 = sessionForDay(plan, '2026-05-11')  // start: Mon week 1 day 1
assert.equal(s1?.session_type, 'Power', 'Mon w1 -> Power')
const s2 = sessionForDay(plan, '2026-05-13')  // Wed: maps to day_in_week 2 (Tue-Wed-Fri pattern compressed) — see math
assert.ok(s2, 'mid-week resolves to a session')
const sNo = sessionForDay(plan, '2026-05-15')  // Fri w1 — outside the 3 logged sessions
assert.equal(sNo, null, 'rest day returns null')
assert.equal(sessionForDay(null, '2026-05-11'), null, 'null plan returns null')
assert.equal(sessionForDay(plan, ''), null, 'empty iso returns null')

// dayStatusFor — pretend today is 2026-05-13 (Wed in week 1)
const today = '2026-05-13'
assert.equal(dayStatusFor('2026-05-11', plan, today), 'past',  'before today -> past')
assert.equal(dayStatusFor('2026-05-13', plan, today), 'today', 'equal -> today')
assert.equal(dayStatusFor('2026-05-15', plan, today), 'rest',  'no session that day -> rest')
assert.equal(dayStatusFor('2026-05-14', plan, today), 'future', 'after today, session -> future')

// currentWeekDates returns 7 Mon-Sun iso strings containing the given date
const week = currentWeekDates('2026-05-13')  // Wed
assert.equal(week.length, 7)
assert.equal(week[0], '2026-05-11', 'week starts Monday')
assert.equal(week[6], '2026-05-17', 'week ends Sunday')
assert.ok(week.includes('2026-05-13'), 'includes given date')

console.log('OK trainSessions')
```

- [ ] **Step 2: Run smoke script to verify it fails**

Run: `node frontend/scripts/smoke-trainSessions.mjs`
Expected: `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement `trainSessions.js`**

Create `frontend/src/lib/trainSessions.js`:

```javascript
/**
 * Train-tab helpers: map ISO dates to plan sessions, classify day status,
 * compute the Monday-Sunday week containing a given date.
 *
 * Date math mirrors useHubData.planSessionForToday so Train and Hub agree on
 * which calendar day a session belongs to.
 */

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Resolve the session scheduled for `isoDate` within `plan`, or null if the
 * date is a rest day (no session that day) or the plan is missing data.
 *
 * The mapping: dayOffset = (isoDate - plan.start_date) in whole days; a
 * session at (week, day_in_week) is scheduled at offset
 *   (week - 1) * 7 + Math.round((day_in_week - 1) * (7 / days_per_week)).
 */
export function sessionForDay(plan, isoDate) {
  if (!plan?.plan_data?.sessions?.length || !plan.start_date || !isoDate) return null
  const start = new Date(plan.start_date + 'T00:00:00')
  const date  = new Date(isoDate + 'T00:00:00')
  if (Number.isNaN(date.getTime())) return null
  const dayOffset = Math.floor((date - start) / 86400000)
  if (dayOffset < 0) return null
  const dpw = plan.plan_data.days_per_week || 3
  for (const s of plan.plan_data.sessions) {
    const off = (s.week - 1) * 7 + Math.round((s.day_in_week - 1) * (7 / dpw))
    if (off === dayOffset) return s
  }
  return null
}

/**
 * Classify a date relative to today and the plan. Returns 'past' | 'today' |
 * 'future' | 'rest'. `today` parameter is overridable for testing; defaults to
 * the actual current ISO date.
 */
export function dayStatusFor(isoDate, plan, today = todayIso()) {
  if (!isoDate) return 'rest'
  if (isoDate < today) return 'past'
  if (isoDate === today) return 'today'
  // future: only call it 'future' if a session exists; otherwise it's a rest day
  return sessionForDay(plan, isoDate) ? 'future' : 'rest'
}

/**
 * Seven ISO date strings (Mon-Sun) for the week containing `isoDate`.
 */
export function currentWeekDates(isoDate) {
  const d = new Date(isoDate + 'T00:00:00')
  const dow = (d.getDay() + 6) % 7  // 0 = Monday
  d.setDate(d.getDate() - dow)
  const out = []
  for (let i = 0; i < 7; i++) {
    out.push(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() + 1)
  }
  return out
}
```

- [ ] **Step 4: Run smoke script to verify it passes**

Run: `node frontend/scripts/smoke-trainSessions.mjs`
Expected: `OK trainSessions`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/trainSessions.js frontend/scripts/smoke-trainSessions.mjs
git commit -m "$(cat <<'EOF'
feat(train): sessionForDay / dayStatusFor / currentWeekDates helpers

Pure date math for the Train tab redesign. Mirrors useHubData's existing
planSessionForToday so Train and Hub agree on session-to-date mapping.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `TrainStreakChip.jsx` — Flame gold pill

**Files:**
- Create: `frontend/src/components/train/TrainStreakChip.jsx`

Tiny presentational component. Renders gold-tinted pill with `Flame` icon + day count. Returns `null` when `streakDays < 2` so the header just collapses.

- [ ] **Step 1: Verify build is clean before changes**

Run: `cd frontend && npx vite build`
Expected: build succeeds.

- [ ] **Step 2: Create the component**

Create `frontend/src/components/train/TrainStreakChip.jsx`:

```jsx
import { Flame } from 'lucide-react'

/**
 * Gold-tinted streak chip. Renders only when streakDays >= 2.
 * Sits in the right column of TrainHeader.
 *
 * Props:
 *   streakDays: number  — current consecutive-day count from useHubData
 */
export default function TrainStreakChip({ streakDays }) {
  if (!streakDays || streakDays < 2) return null
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                     text-[10.5px] font-extrabold tabular-nums tracking-[0.01em]
                     border-[0.5px]"
          style={{
            background: 'rgba(247,176,58,0.12)',
            borderColor: 'rgba(247,176,58,0.32)',
            color: '#fbd470',
          }}>
      <Flame size={12} strokeWidth={2.4} />
      <span>{streakDays}d</span>
    </span>
  )
}
```

- [ ] **Step 3: Verify the build still passes (the component is not yet imported anywhere, so this only confirms no syntax errors)**

Run: `cd frontend && npx vite build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/train/TrainStreakChip.jsx
git commit -m "$(cat <<'EOF'
feat(train): TrainStreakChip — gold Flame pill, hides under 2-day streak

Mirrors the Hub aesthetic (gold-tinted glass chip, lucide Flame icon,
tabular numerics). Returns null when streak < 2 so the header gracefully
collapses for new users.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `TrainPlanArcChip.jsx` — Week N of M chip

**Files:**
- Create: `frontend/src/components/train/TrainPlanArcChip.jsx`

Top-of-screen compact chip. Shows `Week 2 of 4 · Power phase ›`. Tap fires the `onOpen` callback (which the parent uses to open `PlanArcSheet`).

- [ ] **Step 1: Create the component**

Create `frontend/src/components/train/TrainPlanArcChip.jsx`:

```jsx
import { ChevronRight } from 'lucide-react'

/**
 * Compact "Week N of M · phase" chip rendered above the Train header.
 * Tapping it opens the PlanArcSheet so the climber can jump weeks.
 *
 * Props:
 *   currentWeek: number   — 1-based, computed from today vs plan.start_date
 *   totalWeeks:  number   — plan.duration_weeks
 *   phase:       string   — plan.phase (e.g. 'Power')
 *   onOpen:      () => void
 */
export default function TrainPlanArcChip({ currentWeek, totalWeeks, phase, onOpen }) {
  if (!totalWeeks) return null
  const phaseLabel = phase ? `${phase[0].toUpperCase()}${phase.slice(1)} phase` : null
  return (
    <button
      type="button"
      onClick={onOpen}
      tabIndex={0}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                 text-[10.5px] font-bold uppercase tracking-[0.10em] tabular-nums
                 bg-white/[0.04] border-[0.5px] border-white/[0.08]
                 text-muted hover:text-text transition-colors"
    >
      <span>Week {currentWeek} of {totalWeeks}</span>
      {phaseLabel && <span className="text-white/30">·</span>}
      {phaseLabel && <span>{phaseLabel}</span>}
      <ChevronRight size={12} strokeWidth={2.4} className="opacity-70" />
    </button>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `cd frontend && npx vite build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/train/TrainPlanArcChip.jsx
git commit -m "$(cat <<'EOF'
feat(train): TrainPlanArcChip — compact 'Week N of M · phase' chip

Sits above the Train header. Tap fires onOpen so the parent can mount
PlanArcSheet for multi-week navigation. Renders nothing when there's no
plan yet.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `TrainHeader.jsx` — eyebrow + Train. + tier pill + streak slot

**Files:**
- Create: `frontend/src/components/train/TrainHeader.jsx`

The day-of-week eyebrow line, the "Train." title, the tier pill, and the streak chip slot. Tier pill text format: `V5 · Cove · Power phase` (V-grade, tier name, plan phase joined with `·`).

- [ ] **Step 1: Create the component**

Create `frontend/src/components/train/TrainHeader.jsx`:

```jsx
import { TIER_NAMES } from '../../lib/tier'
import TrainStreakChip from './TrainStreakChip'

const DOW_LONG  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function todayDowLabel() {
  const now = new Date()
  return `${DOW_LONG[now.getDay()]} · ${MONTH_SHORT[now.getMonth()]} ${now.getDate()}`
}

/**
 * Top header inside Train's `ready` state. Day-of-week eyebrow on top,
 * 'Train.' title, tier pill below, streak chip slotted on the right.
 *
 * Props:
 *   tierId:     string | null   — 'v0'..'v10', drives tier-pill text
 *   plan:       object | null   — only plan.phase is read (for the tier pill)
 *   streakDays: number          — passed through to TrainStreakChip
 */
export default function TrainHeader({ tierId, plan, streakDays }) {
  const dowMon = todayDowLabel()
  const tierName = tierId ? TIER_NAMES[tierId] : null
  const tierLabel = tierId === 'v10' ? 'V10+' : (tierId ? tierId.toUpperCase() : null)
  const phaseLabel = plan?.phase
    ? `${plan.phase[0].toUpperCase()}${plan.phase.slice(1)} phase`
    : null

  return (
    <div className="px-1 pt-2 pb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[11px] font-extrabold uppercase tracking-[0.10em] text-muted">
          {dowMon}
        </div>
        <h1
          className="text-[28px] sm:text-[30px] font-extrabold text-text -tracking-[0.025em] mt-1 leading-none"
          style={{ textShadow: '0 0 14px var(--tier-glow)' }}
        >
          Train.
        </h1>
        {tierId && (
          <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full
                          text-[11px] font-bold text-text"
               style={{
                 background: 'color-mix(in srgb, var(--tier-c) 12%, transparent)',
                 border: '0.5px solid color-mix(in srgb, var(--tier-c) 35%, transparent)',
               }}>
            <span className="w-1.5 h-1.5 rounded-full"
                  style={{ background: 'var(--tier-c)', boxShadow: '0 0 6px var(--tier-c)' }} />
            <span className="tabular-nums">{tierLabel}</span>
            {tierName && <><span className="text-white/30">·</span><span>{tierName}</span></>}
            {phaseLabel && <><span className="text-white/30">·</span><span>{phaseLabel}</span></>}
          </div>
        )}
      </div>
      <div className="shrink-0 mt-1">
        <TrainStreakChip streakDays={streakDays} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `cd frontend && npx vite build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/train/TrainHeader.jsx
git commit -m "$(cat <<'EOF'
feat(train): TrainHeader — eyebrow + 'Train.' + tier pill + streak slot

Mirrors HubGreeting's typography (SF Pro Display, -0.025em tracking, tier
glow text shadow) while owning the 'V5 · Cove · Power phase' tier-pill
format unique to Train.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: `TrainWeekStrip.jsx` — 7-day tile strip

**Files:**
- Create: `frontend/src/components/train/TrainWeekStrip.jsx`

Seven tiles in a `grid-cols-7` layout. Each tile shows day-letter / date-number / status dot. Active state is a tier-tinted gradient tile.

- [ ] **Step 1: Create the component**

Create `frontend/src/components/train/TrainWeekStrip.jsx`:

```jsx
import { sessionForDay } from '../../lib/trainSessions'

const DAY_LETTER = ['M','T','W','T','F','S','S']

function isToday(iso) {
  return iso === new Date().toISOString().slice(0, 10)
}

function isPast(iso) {
  return iso < new Date().toISOString().slice(0, 10)
}

/**
 * Monday-Sunday strip of seven day tiles. Tap a tile to call onSelectDay.
 *
 * Props:
 *   weekDates:   string[7]                 — ISO dates Mon..Sun for this week
 *   plan:        object | null             — used to know if a day has a session
 *   loggedDates: Set<string>               — ISO dates user has training_logs for
 *   selectedDay: string                    — the day currently in the hero
 *   onSelectDay: (iso: string) => void
 */
export default function TrainWeekStrip({ weekDates, plan, loggedDates, selectedDay, onSelectDay }) {
  return (
    <div className="grid grid-cols-7 gap-1.5 mt-1 mb-4">
      {weekDates.map((iso, i) => {
        const today    = isToday(iso)
        const past     = isPast(iso)
        const hasSess  = !!sessionForDay(plan, iso)
        const logged   = loggedDates?.has(iso)
        const active   = iso === selectedDay
        const isRest   = !hasSess && !logged

        const dayNumClass =
          active ? 'text-white' :
          past   ? 'text-text/55' :
          isRest ? 'text-text/30' :
                   'text-text/85'

        const dotStyle = (() => {
          if (active) return { background: 'var(--tier-light)', boxShadow: '0 0 0 3px color-mix(in srgb, var(--tier-light) 20%, transparent)' }
          if (logged) return { background: 'var(--tier-c)' }
          if (isRest) return { background: 'transparent' }
          return { background: 'rgba(255,255,255,0.14)' }
        })()

        const tileClass = [
          'flex flex-col items-center gap-1.5 py-2.5 rounded-2xl',
          'border-[0.5px] transition-colors min-h-[56px]',
          active ? 'border-[color:color-mix(in_srgb,var(--tier-c)_42%,transparent)]'
                 : 'border-transparent hover:bg-white/[0.03]',
        ].join(' ')

        const tileBg = active
          ? { background: 'linear-gradient(180deg, color-mix(in srgb, var(--tier-c) 18%, transparent), color-mix(in srgb, var(--tier-c) 4%, transparent))' }
          : {}

        const dayLetterClass = (today || active)
          ? 'font-extrabold' : 'font-bold'
        const dayLetterStyle = (today || active)
          ? { color: 'var(--tier-light)' }
          : { color: 'rgba(255,255,255,0.35)' }

        return (
          <button
            key={iso}
            type="button"
            onClick={() => onSelectDay(iso)}
            aria-label={`${DAY_LETTER[i]} ${iso}${today ? ' today' : ''}`}
            className={tileClass}
            style={tileBg}
          >
            <span className={`text-[10px] tracking-[0.05em] ${dayLetterClass}`} style={dayLetterStyle}>
              {DAY_LETTER[i]}
            </span>
            <span className={`text-[15px] font-extrabold leading-none tabular-nums ${dayNumClass}`}>
              {iso.slice(8, 10).replace(/^0/, '')}
            </span>
            <span className="w-[5px] h-[5px] rounded-full" style={dotStyle} />
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `cd frontend && npx vite build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/train/TrainWeekStrip.jsx
git commit -m "$(cat <<'EOF'
feat(train): TrainWeekStrip — 7-day tile row, tier-tinted active state

Single-color dots (tier color when logged, neutral otherwise) — the
session-type-colored-dots prototype was rejected as too busy. 56px min
tap target satisfies Apple HIG.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: `TrainHeroCard.jsx` — dominant today/past/future/rest card

**Files:**
- Create: `frontend/src/components/train/TrainHeroCard.jsx`

The biggest, most opinionated component in this redesign. Owns:
- Type-dotted eyebrow line
- Two-line h1 title
- Subtitle (duration + description)
- CTA per `dayStatus`
- "no plan yet" variant (when `plan === null` but the user is set up)

- [ ] **Step 1: Create the component**

Create `frontend/src/components/train/TrainHeroCard.jsx`:

```jsx
import { motion } from 'framer-motion'
import { ArrowRight, Check, Sparkles, Loader2 } from 'lucide-react'
import { getSessionTypeColor } from '../../lib/sessionType'

const DOW_LONG = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const DOW_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function dayOfWeek(iso) {
  return new Date(iso + 'T00:00:00').getDay()
}

function eyebrowText(dayStatus, isoDate, sessionType) {
  if (dayStatus === 'today') {
    return `Today · ${sessionType || 'Plan'}`
  }
  if (dayStatus === 'past') {
    return `${DOW_SHORT[dayOfWeek(isoDate)]} · Completed`
  }
  if (dayStatus === 'rest') {
    return `${DOW_LONG[dayOfWeek(isoDate)]} · Rest day`
  }
  // future
  return `${DOW_LONG[dayOfWeek(isoDate)]} · ${sessionType || 'Session'}`
}

const TIER_BG = `
  radial-gradient(circle at 28% 0%, color-mix(in srgb, var(--tier-c) 40%, transparent) 0%, transparent 60%),
  radial-gradient(circle at 95% 100%, color-mix(in srgb, var(--tier-light) 16%, transparent) 0%, transparent 70%),
  linear-gradient(180deg, color-mix(in srgb, var(--tier-c) 10%, transparent), color-mix(in srgb, var(--tier-deep) 20%, transparent))
`.trim()

const REST_BG = `
  radial-gradient(circle at 30% 0%, rgba(255,255,255,0.08) 0%, transparent 65%),
  linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0))
`.trim()

const TIER_BORDER = '0.5px solid color-mix(in srgb, var(--tier-c) 22%, transparent)'
const REST_BORDER = '0.5px solid rgba(255,255,255,0.10)'

/**
 * The dominant card. One per Train render.
 *
 * Props:
 *   session:   object | null  — null when rest or noPlan
 *   dayStatus: 'past' | 'today' | 'future' | 'rest'
 *   isoDate:   string         — used for the eyebrow's day name
 *   onStart:   () => void     — fires when the user taps the CTA
 *   noPlan:    boolean        — render the 'Generate my plan' variant
 *   onGenerate:() => void     — fires when noPlan CTA is tapped
 *   generating:boolean        — shows spinner while generating
 *   planError: string | null  — inline error under the noPlan CTA
 */
export default function TrainHeroCard({
  session, dayStatus, isoDate, onStart,
  noPlan = false, onGenerate, generating = false, planError = null,
}) {
  if (noPlan) {
    return (
      <div
        className="rounded-2xl px-5 py-6 border"
        style={{ background: TIER_BG, border: TIER_BORDER }}
      >
        <div className="flex items-center gap-2.5 mb-2">
          <Sparkles size={16} className="text-[var(--tier-light)]" />
          <span className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-[var(--tier-light)]">
            Ready when you are
          </span>
        </div>
        <h2 className="text-[26px] font-extrabold -tracking-[0.025em] leading-tight mb-2">
          Ready to build<br/>your plan
        </h2>
        <p className="text-[12.5px] font-semibold text-text/70 leading-snug mb-4">
          We'll generate a 4-week personalised plan based on your profile and
          adapt it around any injuries in your history.
        </p>
        {planError && (
          <p className="text-[11.5px] font-semibold text-[#fb7185] mb-3">{planError}</p>
        )}
        <motion.button
          type="button"
          onClick={onGenerate}
          disabled={generating}
          whileTap={generating ? undefined : { scale: 0.97 }}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl
                     font-extrabold text-[12.5px] -tracking-[0.01em] disabled:opacity-60"
          style={{ background: 'var(--tier-c)', color: 'var(--bg, #06120f)' }}
        >
          {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {generating ? 'Generating…' : 'Generate my plan'}
        </motion.button>
      </div>
    )
  }

  const rest    = dayStatus === 'rest'
  const today   = dayStatus === 'today'
  const past    = dayStatus === 'past'
  const future  = dayStatus === 'future'

  const sessionType = session?.session_type || (rest ? 'Rest' : 'Endurance')
  const typeColors  = getSessionTypeColor(sessionType)
  const durationMin = session?.duration_minutes || session?.duration_min || null
  const description = session?.description || session?.summary || null

  const title = rest
    ? <>Rest<br/>day</>
    : <>{sessionType}<br/>session</>

  const subtitle = rest
    ? 'Mobility + sleep are the work today.'
    : [durationMin ? `${durationMin} min` : null, description].filter(Boolean).join(' · ') || 'See exercises'

  return (
    <div
      className="rounded-2xl px-5 py-5 border"
      style={{
        background: rest ? REST_BG : TIER_BG,
        border:     rest ? REST_BORDER : TIER_BORDER,
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        {!rest && (
          <span className="w-[7px] h-[7px] rounded-full shrink-0"
                style={{ background: typeColors.c }} />
        )}
        <span
          className="text-[10px] font-extrabold uppercase tracking-[0.13em]"
          style={{ color: rest ? 'rgba(255,255,255,0.55)' : 'var(--tier-light)' }}
        >
          {eyebrowText(dayStatus, isoDate, sessionType)}
        </span>
      </div>

      <h2 className="text-[28px] font-extrabold -tracking-[0.025em] leading-[1.05] mb-2.5">
        {title}
      </h2>
      <p className="text-[12.5px] font-semibold text-text/72 leading-snug mb-5">
        {subtitle}
      </p>

      {!rest && (
        <div className="flex items-center gap-3">
          <motion.button
            type="button"
            onClick={onStart}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl
                       font-extrabold text-[12.5px] -tracking-[0.01em]"
            style={today
              ? { background: 'var(--tier-c)', color: 'var(--bg, #06120f)' }
              : { background: 'rgba(255,255,255,0.06)', color: '#e8e8ec', border: '0.5px solid rgba(255,255,255,0.14)' }
            }
          >
            {today ? 'Start session' : 'View session'}
            <ArrowRight size={14} strokeWidth={2.4} />
          </motion.button>
          {past && (
            <span className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold tracking-[0.06em]"
                  style={{ color: 'var(--tier-light)' }}>
              <Check size={12} strokeWidth={2.8} />
              COMPLETED
            </span>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `cd frontend && npx vite build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/train/TrainHeroCard.jsx
git commit -m "$(cat <<'EOF'
feat(train): TrainHeroCard — dominant tier-themed hero with 4 day-states

One card serves today/past/future/rest plus a 'no plan yet' variant. The
single session-type accent is a 7px colored dot before the eyebrow;
everything else uses the user's tier color. Rest days drop the tier glow
to mark the mode shift.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: `TrainNextUpRow.jsx` — next-up footer row

**Files:**
- Create: `frontend/src/components/train/TrainNextUpRow.jsx`

Thin tappable row below the hero. Walks forward from the selected day to the next non-rest non-past day in the same week (or shows the end-of-week message).

- [ ] **Step 1: Create the component**

Create `frontend/src/components/train/TrainNextUpRow.jsx`:

```jsx
import { sessionForDay, dayStatusFor } from '../../lib/trainSessions'

const DOW_LONG = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

function dayOfWeek(iso) {
  return new Date(iso + 'T00:00:00').getDay()
}

function findNext(weekDates, fromDay, plan) {
  const idx = weekDates.indexOf(fromDay)
  if (idx < 0) return null
  for (let i = idx + 1; i < weekDates.length; i++) {
    const iso = weekDates[i]
    const status = dayStatusFor(iso, plan)
    if (status === 'future' || status === 'today') {
      return { iso, session: sessionForDay(plan, iso) }
    }
  }
  return null
}

/**
 * Single-line "Next: Thursday · Endurance · 75 min ›" footer.
 * Tap selects that day in the parent.
 *
 * Props:
 *   weekDates:   string[7]
 *   plan:        object | null
 *   fromDay:     string
 *   onSelectDay: (iso: string) => void
 */
export default function TrainNextUpRow({ weekDates, plan, fromDay, onSelectDay }) {
  const next = findNext(weekDates, fromDay, plan)
  if (!next) {
    return (
      <p className="mt-3 px-1 text-[11.5px] font-semibold text-text/40 italic">
        End of the week — review your plan ›
      </p>
    )
  }
  const dur = next.session?.duration_minutes || next.session?.duration_min
  const label = [
    DOW_LONG[dayOfWeek(next.iso)],
    next.session?.session_type,
    dur ? `${dur} min` : null,
  ].filter(Boolean).join(' · ')
  return (
    <button
      type="button"
      onClick={() => onSelectDay(next.iso)}
      className="mt-3 px-1 text-left text-[11.5px] font-semibold text-text/45 hover:text-text transition-colors"
    >
      Next: <span className="font-bold text-text/85">{label}</span> ›
    </button>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `cd frontend && npx vite build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/train/TrainNextUpRow.jsx
git commit -m "$(cat <<'EOF'
feat(train): TrainNextUpRow — tappable next-session preview

Walks forward from the selected day, skips rest + past. End-of-week shows
italic 'review your plan' line. No colored swatch (per v5 minimalist
direction).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: `PlanArcSheet.jsx` — bottom sheet listing weeks 1-4

**Files:**
- Create: `frontend/src/components/train/PlanArcSheet.jsx`

Bottom sheet that slides up from the bottom. Lists each week with a small completion indicator and lets the user tap to jump that week.

- [ ] **Step 1: Create the component**

Create `frontend/src/components/train/PlanArcSheet.jsx`:

```jsx
import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Circle, X } from 'lucide-react'

const REDUCE_MOTION = typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function isoFromWeekStart(startIso, weekIndex0) {
  const d = new Date(startIso + 'T00:00:00')
  d.setDate(d.getDate() + weekIndex0 * 7)
  return d.toISOString().slice(0, 10)
}

function weekStatus(plan, weekIndex0, todayIso) {
  if (!plan?.start_date) return 'future'
  const weekStart = isoFromWeekStart(plan.start_date, weekIndex0)
  const weekEnd   = isoFromWeekStart(plan.start_date, weekIndex0 + 1)
  if (todayIso >= weekEnd)   return 'past'
  if (todayIso >= weekStart) return 'current'
  return 'future'
}

/**
 * Bottom sheet listing the plan's weeks. Tap a week to call onSelectWeek
 * with the Monday-ISO of that week.
 *
 * Props:
 *   open:          boolean
 *   plan:          object | null
 *   onClose:       () => void
 *   onSelectWeek:  (mondayIso: string) => void
 */
export default function PlanArcSheet({ open, plan, onClose, onSelectWeek }) {
  // Escape closes the sheet
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const totalWeeks = plan?.duration_weeks || 0
  const todayIso = new Date().toISOString().slice(0, 10)

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
            className="fixed bottom-0 inset-x-0 z-50
                       bg-[#0a0a0c] border-t-[0.5px] border-white/[0.10]
                       rounded-t-3xl px-4 pt-3
                       pb-[calc(1.5rem+env(safe-area-inset-bottom))]
                       max-h-[88vh] overflow-auto"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: REDUCE_MOTION ? 0 : 0.22, ease: 'easeOut' }}
            drag={REDUCE_MOTION ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => { if (info.offset.y > 80) onClose() }}
            role="dialog" aria-modal="true" aria-label="Plan weeks"
          >
            <div className="flex justify-center pb-2">
              <div className="w-10 h-1 rounded-full bg-white/15" />
            </div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-[15px] font-extrabold -tracking-[0.01em]">Your plan</h3>
              <button onClick={onClose} aria-label="Close" className="p-1.5 -mr-1 rounded-full hover:bg-white/[0.06]">
                <X size={16} className="text-muted" />
              </button>
            </div>
            {plan?.phase && (
              <p className="text-[11px] font-bold uppercase tracking-[0.10em] text-muted mb-3 px-1">
                {plan.duration_weeks}-week {plan.phase} phase
              </p>
            )}
            <ul className="space-y-1.5">
              {Array.from({ length: totalWeeks }, (_, i) => i).map((wi) => {
                const status = weekStatus(plan, wi, todayIso)
                const weekStartIso = isoFromWeekStart(plan.start_date, wi)
                const icon = status === 'past'
                  ? <Check size={14} strokeWidth={2.8} className="text-[var(--tier-light)]" />
                  : status === 'current'
                    ? <span className="w-2.5 h-2.5 rounded-full"
                            style={{ background: 'var(--tier-c)', boxShadow: '0 0 8px var(--tier-c)' }} />
                    : <Circle size={12} strokeWidth={2.2} className="text-white/30" />
                const isDeload = (wi + 1) === totalWeeks
                return (
                  <li key={wi}>
                    <button
                      type="button"
                      onClick={() => { onSelectWeek(weekStartIso); onClose() }}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl
                                  bg-black/35 backdrop-blur-md border-[0.5px] border-white/[0.08]
                                  hover:bg-white/[0.04] transition-colors text-left ${status === 'current' ? 'ring-1 ring-[color:color-mix(in_srgb,var(--tier-c)_32%,transparent)]' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center justify-center w-6 h-6">{icon}</span>
                        <div>
                          <p className="text-[13.5px] font-extrabold leading-tight">Week {wi + 1}</p>
                          <p className="text-[10.5px] font-bold text-muted mt-0.5 uppercase tracking-[0.08em]">
                            {isDeload ? 'Deload week' : status === 'current' ? 'This week' : status === 'past' ? 'Complete' : 'Upcoming'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10.5px] font-bold text-muted tabular-nums">
                        {new Date(weekStartIso + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
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
git add frontend/src/components/train/PlanArcSheet.jsx
git commit -m "$(cat <<'EOF'
feat(train): PlanArcSheet — bottom sheet for multi-week navigation

Replaces the old PlanView week-chevrons. Drag down to dismiss, Escape
key works, backdrop tap closes. Honors prefers-reduced-motion.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: `SessionDetailSheet.jsx` — exercises + Log CTA

**Files:**
- Create: `frontend/src/components/train/SessionDetailSheet.jsx`

Bottom sheet for the session-detail view. Lists the session's exercises as glass cards and has a sticky "Log this session" CTA. Uses the existing `TrainingLogEntry` component for logging — when the user taps "Log this session", swap the sheet body for the entry form.

- [ ] **Step 1: Inspect existing exercise shape from PlanView**

Read `frontend/src/components/PlanView.jsx` lines 50-180 to see what `ExerciseCard` and `SessionDetail` consume. The session shape is:
- `session.session_type` — string
- `session.duration_minutes` (or `duration_min`)
- `session.rpe` — number 1-10
- `session.exercises` — array of `{ name, sets, reps, notes? }` or similar
- `session.description` / `session.summary` — string

- [ ] **Step 2: Create the component**

Create `frontend/src/components/train/SessionDetailSheet.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, ArrowRight } from 'lucide-react'
import TrainingLogEntry from '../TrainingLogEntry'

const REDUCE_MOTION = typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function ExerciseRow({ ex }) {
  return (
    <li className="px-3.5 py-3 rounded-2xl bg-black/35 backdrop-blur-md
                   border-[0.5px] border-white/[0.10]">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13px] font-extrabold leading-tight">{ex.name}</p>
        {(ex.sets || ex.reps) && (
          <p className="text-[11px] font-bold text-text/70 tabular-nums shrink-0">
            {[ex.sets && `${ex.sets}×`, ex.reps].filter(Boolean).join('')}
          </p>
        )}
      </div>
      {ex.notes && (
        <p className="text-[11.5px] font-semibold text-text/55 mt-1 leading-snug">
          {ex.notes}
        </p>
      )}
    </li>
  )
}

/**
 * Bottom sheet showing one session's exercise list, with a sticky CTA to
 * launch the existing TrainingLogEntry form pre-filled with the session
 * type.
 *
 * Props:
 *   open:    boolean
 *   session: object | null
 *   onClose: () => void
 *   onLogged: () => void   — fires when the user successfully logs from here
 */
export default function SessionDetailSheet({ open, session, onClose, onLogged }) {
  const [logging, setLogging] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Reset to detail view whenever the sheet reopens
  useEffect(() => { if (open) setLogging(false) }, [open])

  if (!session && !open) return null

  const exercises = session?.exercises || []
  const dur = session?.duration_minutes || session?.duration_min
  const rpe = session?.rpe

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
            className="fixed bottom-0 inset-x-0 z-50
                       bg-[#0a0a0c] border-t-[0.5px] border-white/[0.10]
                       rounded-t-3xl px-4 pt-3 flex flex-col
                       max-h-[88vh]"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ duration: REDUCE_MOTION ? 0 : 0.22, ease: 'easeOut' }}
            drag={REDUCE_MOTION ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => { if (info.offset.y > 80) onClose() }}
            role="dialog" aria-modal="true" aria-label="Session detail"
          >
            <div className="flex justify-center pb-2">
              <div className="w-10 h-1 rounded-full bg-white/15" />
            </div>
            <div className="flex items-start justify-between gap-3 mb-3 px-1">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-[var(--tier-light)]">
                  {session?.session_type || 'Session'}
                </p>
                <h3 className="text-[19px] font-extrabold -tracking-[0.02em] mt-0.5">
                  {session?.session_type || 'Session'} session
                </h3>
                <p className="text-[11.5px] font-bold text-muted mt-1 tabular-nums">
                  {[dur ? `${dur} min` : null, rpe ? `RPE ${rpe}` : null].filter(Boolean).join(' · ')}
                </p>
              </div>
              <button onClick={onClose} aria-label="Close"
                      className="p-1.5 -mr-1 rounded-full hover:bg-white/[0.06]">
                <X size={16} className="text-muted" />
              </button>
            </div>

            <div className="flex-1 overflow-auto pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
              {!logging && (
                <>
                  {exercises.length === 0 ? (
                    <p className="px-1 py-6 text-center text-[12px] font-semibold text-muted">
                      No exercise detail captured for this session.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {exercises.map((ex, i) => <ExerciseRow key={i} ex={ex} />)}
                    </ul>
                  )}
                </>
              )}
              {logging && (
                <TrainingLogEntry
                  sessionType={session?.session_type?.toLowerCase() || 'bouldering'}
                  onSave={() => { setLogging(false); onLogged?.(); onClose() }}
                  onCancel={() => setLogging(false)}
                />
              )}
            </div>

            {!logging && (
              <div className="sticky bottom-0 inset-x-0 -mx-4 px-4 pt-3
                              pb-[calc(0.75rem+env(safe-area-inset-bottom))]
                              bg-[#0a0a0c]/95 backdrop-blur-md
                              border-t-[0.5px] border-white/[0.08]">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setLogging(true)}
                  className="w-full inline-flex items-center justify-center gap-2
                             px-5 py-3.5 rounded-2xl
                             font-extrabold text-[13px] -tracking-[0.01em]"
                  style={{ background: 'var(--tier-c)', color: 'var(--bg, #06120f)' }}
                >
                  Log this session
                  <ArrowRight size={14} strokeWidth={2.4} />
                </motion.button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 3: Verify build**

Run: `cd frontend && npx vite build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/train/SessionDetailSheet.jsx
git commit -m "$(cat <<'EOF'
feat(train): SessionDetailSheet — exercise list + TrainingLogEntry in-sheet

Bottom sheet swaps between the exercise-list view and the existing
TrainingLogEntry form on 'Log this session' tap. Drag-down dismisses,
Escape closes, prefers-reduced-motion respected.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: `TrainTab.jsx` — full rewrite, orchestrate everything

**Files:**
- Modify: `frontend/src/components/TrainTab.jsx`

Full rewrite. Keeps the state machine, swaps the visual treatment, and adds the selected-day state + sheet wiring. Uses `useHubData` for streak / hardestSends / weekLoggedDates.

- [ ] **Step 1: Capture the current TrainTab so the diff is reviewable**

Run: `git log -1 --pretty=%H -- frontend/src/components/TrainTab.jsx`
Note the SHA — useful if anyone needs to compare.

- [ ] **Step 2: Replace `TrainTab.jsx` contents in full**

Replace the entire file with:

```jsx
import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dumbbell, LogIn, Loader2, RefreshCw } from 'lucide-react'
import { getProfile, getActivePlan, generatePlan } from '../api'
import { useHubData } from '../hooks/useHubData'
import { workingTierFromHardest } from '../lib/tier'
import { currentWeekDates, dayStatusFor, sessionForDay } from '../lib/trainSessions'
import TierThemeRoot from './TierThemeRoot'
import ProfileSetup from './ProfileSetup'
import TrainHeader from './train/TrainHeader'
import TrainPlanArcChip from './train/TrainPlanArcChip'
import TrainWeekStrip from './train/TrainWeekStrip'
import TrainHeroCard from './train/TrainHeroCard'
import TrainNextUpRow from './train/TrainNextUpRow'
import PlanArcSheet from './train/PlanArcSheet'
import SessionDetailSheet from './train/SessionDetailSheet'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function currentWeekNumber(plan, todayDate = new Date()) {
  if (!plan?.start_date || !plan?.duration_weeks) return 1
  const start = new Date(plan.start_date + 'T00:00:00')
  const diff = Math.floor((todayDate - start) / 86400000)
  return Math.max(1, Math.min(plan.duration_weeks, Math.floor(diff / 7) + 1))
}

function friendlyPlanError(msg) {
  if (!msg) return 'Could not generate your plan.'
  if (msg.includes('plan_tier_required')) {
    return 'AI training plans unlock during your 14-day trial and stay unlocked with a $7.99/mo subscription. Tap "View plans & pricing" in the sidebar to subscribe.'
  }
  if (msg.includes('plan_limit_reached')) {
    return 'You already have an active plan. Generate a new one only when you\'re ready to start fresh.'
  }
  return msg
}

function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-8 py-16 space-y-5">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
           style={{
             background: 'color-mix(in srgb, var(--tier-c) 12%, transparent)',
             border: '0.5px solid color-mix(in srgb, var(--tier-c) 32%, transparent)',
           }}>
        <Icon size={22} className="text-[var(--tier-light)]" />
      </div>
      <div>
        <p className="text-[15px] font-extrabold text-text -tracking-[0.01em]">{title}</p>
        <p className="text-[12.5px] font-semibold text-muted mt-1 max-w-xs leading-snug">{body}</p>
      </div>
      {action}
    </div>
  )
}

export default function TrainTab({ user, dbReady, onLoginClick }) {
  const [state, setState] = useState('loading') // loading | no-auth | setup | generating | ready | error
  const [profile, setProfile] = useState(null)
  const [plan, setPlan] = useState(null)
  const [error, setError] = useState(null)
  const [generating, setGenerating] = useState(false)

  const [selectedDay, setSelectedDay] = useState(() => todayIso())
  const [sheetOpen, setSheetOpen] = useState(false)
  const [planSheetOpen, setPlanSheetOpen] = useState(false)

  const hub = useHubData(user)
  const tierId = workingTierFromHardest(hub.hardestSends)

  const load = useCallback(async () => {
    if (!user) { setState('no-auth'); return }
    setState('loading')
    setError(null)
    try {
      const p = await getProfile().catch((err) => {
        if (err.message?.includes('404') || err.message?.includes('not set')) return null
        throw err
      })
      if (!p) { setState('setup'); return }
      setProfile(p)
      const activePlan = await getActivePlan().catch((err) => {
        if (err.message?.includes('404') || err.message?.includes('No active')) return null
        throw err
      })
      setPlan(activePlan)
      setState('ready')
    } catch (err) {
      setError(err.message)
      setState('error')
    }
  }, [user])

  useEffect(() => { load() }, [load])

  async function handleProfileComplete(savedProfile) {
    setProfile(savedProfile)
    setState('generating')
    setGenerating(true)
    setError(null)
    try {
      await generatePlan({ use_injury_data: true })
      const activePlan = await getActivePlan()
      setPlan(activePlan)
      setState('ready')
    } catch (err) {
      setError(friendlyPlanError(err.message))
      setState('ready')
    } finally {
      setGenerating(false)
    }
  }

  async function handleGeneratePlan() {
    setGenerating(true)
    setError(null)
    try {
      await generatePlan({ use_injury_data: true })
      const activePlan = await getActivePlan()
      setPlan(activePlan)
    } catch (err) {
      setError(friendlyPlanError(err.message))
    } finally {
      setGenerating(false)
    }
  }

  const weekDates = useMemo(() => currentWeekDates(selectedDay), [selectedDay])
  const session   = useMemo(() => sessionForDay(plan, selectedDay), [plan, selectedDay])
  const dayStatus = useMemo(() => dayStatusFor(selectedDay, plan), [plan, selectedDay])
  const curWeek   = useMemo(() => currentWeekNumber(plan), [plan])

  // ── Render branches ──────────────────────────────────────────────────────

  if (state === 'no-auth') {
    return (
      <TierThemeRoot hardest={hub.hardestSends} global>
        <div className="max-w-2xl mx-auto px-4 py-8">
          <EmptyState
            icon={Dumbbell}
            title="Sign in to access training"
            body="Your training plan and progress are private. Create a free account to get started."
            action={
              <button onClick={onLoginClick}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-extrabold text-[12.5px]"
                      style={{ background: 'var(--tier-c)', color: 'var(--bg, #06120f)' }}>
                <LogIn size={14} />
                Log in or create account
              </button>
            }
          />
        </div>
      </TierThemeRoot>
    )
  }

  if (state === 'loading') {
    return (
      <TierThemeRoot hardest={hub.hardestSends} global>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 size={22} className="text-[var(--tier-light)] animate-spin" />
        </div>
      </TierThemeRoot>
    )
  }

  if (state === 'setup') {
    return (
      <TierThemeRoot hardest={hub.hardestSends} global>
        <AnimatePresence>
          <motion.div key="setup" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <ProfileSetup user={user} onComplete={handleProfileComplete} />
          </motion.div>
        </AnimatePresence>
      </TierThemeRoot>
    )
  }

  if (state === 'generating') {
    return (
      <TierThemeRoot hardest={hub.hardestSends} global>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center px-8">
          <Loader2 size={28} className="text-[var(--tier-light)] animate-spin" />
          <div>
            <p className="text-[15px] font-extrabold text-text -tracking-[0.01em]">Building your plan…</p>
            <p className="text-[12.5px] font-semibold text-muted mt-1">
              Personalising sessions based on your profile and injury history.
            </p>
          </div>
        </div>
      </TierThemeRoot>
    )
  }

  if (state === 'error') {
    return (
      <TierThemeRoot hardest={hub.hardestSends} global>
        <div className="max-w-2xl mx-auto px-4 py-8">
          <EmptyState
            icon={Dumbbell}
            title="Something went wrong"
            body={error || 'Could not load your training data.'}
            action={
              <button onClick={load}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl
                                 text-[12px] font-bold text-text
                                 bg-white/[0.04] border-[0.5px] border-white/[0.10]
                                 hover:bg-white/[0.06]">
                <RefreshCw size={13} />
                Retry
              </button>
            }
          />
        </div>
      </TierThemeRoot>
    )
  }

  // state === 'ready'
  return (
    <TierThemeRoot hardest={hub.hardestSends} global>
      <div className="relative max-w-2xl mx-auto px-4 py-6 md:py-8"
           style={{
             background:
               'radial-gradient(circle at 50% -10%, color-mix(in srgb, var(--tier-c) 22%, transparent) 0%, transparent 55%)',
           }}>

        {plan && (
          <div className="px-1 mb-1">
            <TrainPlanArcChip
              currentWeek={curWeek}
              totalWeeks={plan.duration_weeks}
              phase={plan.phase}
              onOpen={() => setPlanSheetOpen(true)}
            />
          </div>
        )}

        <TrainHeader tierId={tierId} plan={plan} streakDays={hub.streakDays} />

        <TrainWeekStrip
          weekDates={weekDates}
          plan={plan}
          loggedDates={hub.weekLoggedDates}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
        />

        {plan ? (
          <TrainHeroCard
            session={session}
            dayStatus={dayStatus}
            isoDate={selectedDay}
            onStart={() => setSheetOpen(true)}
          />
        ) : (
          <TrainHeroCard
            noPlan
            onGenerate={handleGeneratePlan}
            generating={generating}
            planError={error}
          />
        )}

        {plan && (
          <TrainNextUpRow
            weekDates={weekDates}
            plan={plan}
            fromDay={selectedDay}
            onSelectDay={setSelectedDay}
          />
        )}

        <button
          onClick={() => setState('setup')}
          className="mt-6 px-1 text-[11px] font-bold text-muted hover:text-text transition-colors"
        >
          Edit profile ›
        </button>

        <PlanArcSheet
          open={planSheetOpen}
          plan={plan}
          onClose={() => setPlanSheetOpen(false)}
          onSelectWeek={(mondayIso) => setSelectedDay(mondayIso)}
        />

        <SessionDetailSheet
          open={sheetOpen}
          session={session}
          onClose={() => setSheetOpen(false)}
          onLogged={load}
        />
      </div>
    </TierThemeRoot>
  )
}
```

- [ ] **Step 3: Verify build**

Run: `cd frontend && npx vite build`
Expected: build succeeds. The bundle for TrainTab will shrink because PlanView is no longer imported, but PlanView itself still exists (deleted in Task 12).

- [ ] **Step 4: Verify the import of `useHubData` still works (no circular deps)**

Run: `cd frontend && node -e "console.log(require.resolve('./src/hooks/useHubData.js'))" 2>&1 | head -3`
Expected: prints the resolved path. (Note: the project is ESM-only; this command may fail with `Cannot use import statement outside a module` — if so, skip this step; vite build already verified the imports.)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/TrainTab.jsx
git commit -m "$(cat <<'EOF'
feat(train): rewrite TrainTab around today-first hero + tier theme

Replaces the week-1-of-4 chevron model with a Mon-Sun strip, hero card,
and PlanArcSheet for multi-week nav. State machine is preserved; only
the visual treatment + selected-day state are new. Reuses useHubData so
Train and Hub agree on streak, hardest sends, and logged dates.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: Delete `PlanView.jsx` + verify build

**Files:**
- Delete: `frontend/src/components/PlanView.jsx`

The new `SessionDetailSheet` replaces `PlanView`'s in-component exercise list and session detail. The current `PlanView` was the only consumer of the legacy week-chevron model.

- [ ] **Step 1: Confirm nothing else imports PlanView**

Run: `grep -rn "PlanView" frontend/src --include="*.jsx" --include="*.js"`
Expected: only matches inside `PlanView.jsx` itself (self-references) or zero matches.

If anything else imports it, STOP and report — the spec says PlanView is the only consumer. Investigate before proceeding.

- [ ] **Step 2: Delete the file**

Run: `git rm frontend/src/components/PlanView.jsx`

- [ ] **Step 3: Verify build**

Run: `cd frontend && npx vite build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
chore(train): delete PlanView.jsx — superseded by train/* components

PlanView's responsibilities are now split across TrainTab (orchestration),
TrainWeekStrip (week navigation), TrainHeroCard (today's session), and
SessionDetailSheet (exercise list + log). No callers remain.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 13: Manual phone verification

**Files:**
- None (verification only)

The frontend has no automated test runner. Verify the redesign by hand at iPhone 13 mini width (375px) in DevTools or on a real device.

- [ ] **Step 1: Start the dev server**

Run: `cd frontend && npm run dev`
Expected: server starts on `http://localhost:5173` (or similar).

- [ ] **Step 2: Open the app in a browser at 375px width**

In Chrome / Safari DevTools, toggle device toolbar (Cmd+Shift+M on Mac) and pick "iPhone 13 mini" or set width to 375px manually.

- [ ] **Step 3: Walk through every Train tab state and confirm behavior**

For each row below, navigate to that state and confirm the expected behavior. Tick the row if it passes.

| Scenario | Setup | Expected |
|---|---|---|
| **No auth** | Log out, click Train | "Sign in to access training" centered, tier-colored Dumbbell icon, "Log in or create account" CTA in tier color. |
| **Setup (no profile)** | Log in as a new user. | ProfileSetup renders inside the tier backdrop. |
| **Ready, no plan** | New user just completed profile but plan not generated yet. | TrainHeader + WeekStrip render. Hero shows "Ready to build your plan" with Sparkles icon and tier-color CTA. |
| **Ready, generating** | Tap "Generate my plan". | CTA shows spinner + "Generating…", disabled. |
| **Ready, today is a session** | Active plan exists, today maps to a session. | Hero is tier-glow, eyebrow has a type-colored dot, "Start session" CTA in tier color. |
| **Ready, today is a rest day** | Active plan exists, today has no session. | Hero loses tier glow, copy reads "Mobility + sleep are the work." No CTA. |
| **Tap a past day** | Tap a Mon/Tue tile that has a logged session. | Hero updates inline — eyebrow says "Mon · Completed", title is the past session, CTA is ghost "View session", "✓ COMPLETED" badge to its right. |
| **Tap a future day** | Tap Thu / Sat tile. | Hero updates — eyebrow shows full day name + type, ghost "View session" CTA. |
| **Tap a future rest day** | Tap Fri / Sun tile with no session. | Hero shows "Rest day" copy, no CTA. |
| **Open plan-arc sheet** | Tap "Week N of 4 · phase ›" chip. | Bottom sheet slides up, lists all weeks, current week is ringed. Tap a week → strip jumps to that week's Monday + sheet closes. |
| **Open session detail sheet** | Tap "Start session" on today. | Bottom sheet slides up. Exercise list visible. Sticky "Log this session" CTA at bottom in tier color. |
| **Drag down to dismiss** | On either sheet, drag the drag-handle down ~80px. | Sheet dismisses. |
| **Press Escape** | With a sheet open. | Sheet dismisses. |
| **Edit profile** | Tap "Edit profile ›" link at bottom. | Returns to setup view. |
| **Streak chip** | Have a 0-1 day streak. | Streak chip is hidden. With ≥ 2 day streak, gold Flame pill renders. |
| **Tap targets** | Try tapping each week tile and CTA. | All tap targets ≥ 44×44px. No mis-taps. |
| **No horizontal overflow at 375px** | Scroll the page. | No horizontal scroll bar. |
| **No emojis anywhere** | Inspect every text node. | Only lucide icons; no emoji glyphs in any rendered text. |

- [ ] **Step 4: Type-check via build (final gate)**

Run: `cd frontend && npx vite build`
Expected: build succeeds, no warnings about unused imports beyond pre-existing ones.

- [ ] **Step 5: Smoke-run the pure-function tests one more time**

Run: `node frontend/scripts/smoke-sessionType.mjs && node frontend/scripts/smoke-trainSessions.mjs`
Expected: both print `OK ...`.

- [ ] **Step 6: Commit (only if any small fixes landed during verification)**

If no changes during this task, skip the commit. Otherwise:

```bash
git add -p   # interactively review every change
git commit -m "$(cat <<'EOF'
fix(train): post-verification tweaks

[summarize the specific tweaks made during manual phone verification]

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-review

Quick pass against the spec.

**1. Spec coverage:**

| Spec requirement | Plan task |
|---|---|
| Visual baseline (radial backdrop, glass cards, tabular nums) | Tasks 5-11 (each component) + Task 11 wraps in TierThemeRoot |
| `TrainTab.jsx` orchestrator | Task 11 |
| `TrainHeader.jsx` (eyebrow + title + tier pill + streak slot) | Task 5 |
| `TrainStreakChip.jsx` | Task 3 |
| `TrainWeekStrip.jsx` | Task 6 |
| `TrainHeroCard.jsx` (4 day-status variants + noPlan) | Task 7 |
| `SessionDetailSheet.jsx` | Task 10 |
| `TrainNextUpRow.jsx` | Task 8 |
| `TrainPlanArcChip.jsx` | Task 4 |
| `PlanArcSheet.jsx` | Task 9 |
| `frontend/src/lib/sessionType.js` | Task 1 |
| `frontend/src/lib/trainSessions.js` | Task 2 |
| Modify TrainTab.jsx | Task 11 |
| Delete PlanView.jsx | Task 12 |
| State machine (loading/no-auth/setup/generating/ready/error) | Task 11 |
| Data flow (useHubData reuse, sessionForDay, dayStatusFor) | Tasks 2, 11 |
| Mobile interaction details (44px tap targets, whileTap, sheet snap) | Tasks 6, 7, 9, 10 |
| Accessibility (aria-label on tiles, focus, prefers-reduced-motion) | Tasks 6, 9, 10 |
| Manual phone verification | Task 13 |

All spec sections have a task. The spec mentions "Testing — Component tests (Vitest + Testing Library)" but the frontend has no test runner; this plan substitutes pure-function smoke tests (Tasks 1, 2) + manual phone verification (Task 13), matching the codebase's existing testing posture. This is the only intentional deviation from the spec.

**2. Placeholder scan:** No `TBD`/`TODO`/"implement later". Every step shows the exact code or command. Task 13 has one explicit `[summarize the specific tweaks ...]` placeholder, but it's inside an _optional_ commit message and is clearly marked as a fill-in for the engineer if and only if they made changes.

**3. Type consistency:**
- `SESSION_TYPE_COLOR` exported from Task 1, consumed by `getSessionTypeColor` in Task 1 and `TrainHeroCard` in Task 7. ✓
- `sessionForDay`, `dayStatusFor`, `currentWeekDates` from Task 2, consumed by `TrainTab` (Task 11), `TrainWeekStrip` (Task 6), `TrainNextUpRow` (Task 8). ✓
- `TrainStreakChip` exports `default` and is imported by `TrainHeader` in Task 5. ✓
- `useHubData` returns `{ streakDays, hardestSends, weekLoggedDates }` — confirmed from the existing hook in `frontend/src/hooks/useHubData.js`. ✓
- `workingTierFromHardest` returns `'v0'..'v10'` — confirmed from `frontend/src/lib/tier.js`. ✓
- `TIER_NAMES[tierId]` from `lib/tier.js` is used in TrainHeader (Task 5). ✓
- Session shape (`session_type`, `duration_minutes`/`duration_min`, `exercises`) consumed consistently across HeroCard, NextUpRow, SessionDetailSheet. ✓
- `TrainingLogEntry` prop signature `{ sessionType, onSave, onCancel }` — confirmed from the existing component. ✓

Plan looks tight.
