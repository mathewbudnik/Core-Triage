# Hub Home Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `/hub` route that becomes the default post-login destination, featuring an asymmetric layout with a state-adaptive featured card, three compact tool cards, a streak pill, and a social strip. Mobile-responsive at `<md` (768px).

**Architecture:** A new HubTab component loads 5 existing API endpoints in parallel, computes a "featured tool" pick from user state via a pure function, and renders an asymmetric grid using Tailwind responsive classes. No backend changes. Seven new files (six components + one config) and two modified files (`App.jsx`, `Landing.jsx`).

**Tech Stack:** React 18, Vite, Tailwind CSS, Framer Motion, lucide-react, React Router 6. All already in use.

**Spec:** [docs/superpowers/specs/2026-05-13-hub-home-screen-design.md](../specs/2026-05-13-hub-home-screen-design.md)

**Frontend test framework note:** This codebase has no frontend test runner today. The plan adds plain JS helpers (pickFeatured, rehabProgress) as testable pure functions — but verification is via manual smoke-test in the running dev server, not unit tests. Adding vitest is out of scope. If a developer wants to test the pure helpers, they can run them via `node --input-type=module -e '...'` ad-hoc.

---

## File Structure

**New files:**
| Path | Responsibility |
|---|---|
| `frontend/src/data/hubTools.js` | Single source of truth for tool metadata (label, accent, icon, route, pattern, empty status) + accent → Tailwind class lookups |
| `frontend/src/lib/rehabHeuristic.js` | Pure function: triage date → `{ phase, dayInPhase, phaseLength, days }` |
| `frontend/src/lib/pickFeatured.js` | Pure function: HubData → `'triage' \| 'rehab' \| 'train' \| 'chat'` per spec priority table |
| `frontend/src/hooks/useHubData.js` | Loads 5 endpoints in parallel with graceful per-endpoint failure |
| `frontend/src/components/HubPatterns.jsx` | Four SVG pattern components (Pulse, Dots, Stripes, Speech), exported individually |
| `frontend/src/components/HubGreeting.jsx` | Gradient greeting + streak pill row |
| `frontend/src/components/HubToolCard.jsx` | Small status card — icon, label, status, optional live dot, optional progress bar, chevron, pattern bg |
| `frontend/src/components/HubFeaturedCard.jsx` | Large featured card — same accent as the active tool, rich content, primary CTA |
| `frontend/src/components/HubSocialStrip.jsx` | Bottom strip with rank line + "See leaderboard" link |
| `frontend/src/components/HubTab.jsx` | Page assembly: data loading, featured-pick, tap-to-swap state, mounts all sub-components |

**Modified files:**
| Path | Change |
|---|---|
| `frontend/src/App.jsx` | Add Hub to `TABS`, lazy-import + route `/hub/*`, redirect `/` → `/hub` for authed users, wrap sidebar logo in `<NavLink to="/hub">`, change unknown-path fallback to `/hub` |
| `frontend/src/components/Landing.jsx` | Change `onEnter()` default arg (no-arg call) to `'/hub'` |

---

### Task 1: Tool metadata config (hubTools.js)

**Files:**
- Create: `frontend/src/data/hubTools.js`

- [ ] **Step 1: Create the config file**

Create `frontend/src/data/hubTools.js`:

```js
import { Activity, Stethoscope, Dumbbell, MessageSquare } from 'lucide-react'

// Single source of truth for the four hub tools. Other Hub components import
// from here so a colour/icon/route change happens in one place.
export const TOOLS = {
  triage: {
    key: 'triage',
    label: 'Triage',
    accent: 'coral',       // maps to Tailwind accent2 in ACCENT_CLASSES below
    icon: Activity,
    route: '/triage',
    pattern: 'pulse',
    emptyStatus: 'No active triage',
  },
  rehab: {
    key: 'rehab',
    label: 'Rehab',
    accent: 'teal',        // maps to Tailwind accent
    icon: Stethoscope,
    route: '/rehab',
    pattern: 'dots',
    emptyStatus: 'No active rehab',
  },
  train: {
    key: 'train',
    label: 'Train',
    accent: 'teal',
    icon: Dumbbell,
    route: '/train',
    pattern: 'stripes',
    emptyStatus: 'Build a plan',
  },
  chat: {
    key: 'chat',
    label: 'Chat',
    accent: 'gold',        // maps to Tailwind accent3
    icon: MessageSquare,
    route: '/chat',
    pattern: 'speech',
    emptyStatus: 'Ask anything',
  },
}

export const TOOL_KEYS = ['triage', 'rehab', 'train', 'chat']

// Accent → Tailwind class lookup. Use these instead of inlining bg-accent/10
// everywhere, so we can swap a colour mapping in one place.
export const ACCENT_CLASSES = {
  teal: {
    text:        'text-accent',
    border:      'border-accent/40',
    borderSoft:  'border-accent/25',
    bgSoft:      'bg-accent/10',
    bgGradient:  'bg-[linear-gradient(135deg,rgba(20,184,166,0.12),rgba(20,184,166,0.02))]',
    iconBg:      'bg-[linear-gradient(135deg,rgba(20,184,166,0.25),rgba(20,184,166,0.06))]',
    glow:        'bg-accent/40',
    dotClass:    'bg-accent shadow-[0_0_6px_rgba(20,184,166,0.7)]',
    progressBar: 'bg-gradient-to-r from-accent to-[#7dd3c0] shadow-[0_0_12px_rgba(20,184,166,0.6)]',
  },
  coral: {
    text:        'text-accent2',
    border:      'border-accent2/40',
    borderSoft:  'border-accent2/25',
    bgSoft:      'bg-accent2/10',
    bgGradient:  'bg-[linear-gradient(135deg,rgba(251,113,133,0.12),rgba(251,113,133,0.02))]',
    iconBg:      'bg-[linear-gradient(135deg,rgba(251,113,133,0.25),rgba(251,113,133,0.06))]',
    glow:        'bg-accent2/40',
    dotClass:    'bg-accent2 shadow-[0_0_6px_rgba(251,113,133,0.7)]',
    progressBar: 'bg-gradient-to-r from-accent2 to-[#fda4af] shadow-[0_0_12px_rgba(251,113,133,0.6)]',
  },
  gold: {
    text:        'text-accent3',
    border:      'border-accent3/40',
    borderSoft:  'border-accent3/25',
    bgSoft:      'bg-accent3/10',
    bgGradient:  'bg-[linear-gradient(135deg,rgba(251,191,36,0.12),rgba(251,191,36,0.02))]',
    iconBg:      'bg-[linear-gradient(135deg,rgba(251,191,36,0.25),rgba(251,191,36,0.06))]',
    glow:        'bg-accent3/36',
    dotClass:    'bg-accent3 shadow-[0_0_6px_rgba(251,191,36,0.7)]',
    progressBar: 'bg-gradient-to-r from-accent3 to-[#fcd34d] shadow-[0_0_12px_rgba(251,191,36,0.6)]',
  },
}
```

- [ ] **Step 2: Verify the file parses**

```bash
cd frontend && node --input-type=module -e "import('./src/data/hubTools.js').then(m => console.log(Object.keys(m.TOOLS), m.TOOL_KEYS))"
```

Expected output: `[ 'triage', 'rehab', 'train', 'chat' ] [ 'triage', 'rehab', 'train', 'chat' ]`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/data/hubTools.js
git commit -m "feat(hub): add tool metadata config (label/accent/icon/pattern per tool)"
```

---

### Task 2: Rehab heuristic helper

**Files:**
- Create: `frontend/src/lib/rehabHeuristic.js`

- [ ] **Step 1: Create the helper**

Create `frontend/src/lib/rehabHeuristic.js`:

```js
// Pure helper: given the most recent triage's created_at ISO string, return a
// phase/day estimate. The app has no real rehab progress tracking yet; this
// is a days-since-triage proxy. See spec section "Rehab heuristic".
//
//   Phase 1: days 0-13   (length 14)
//   Phase 2: days 14-41  (length 28)
//   Phase 3: days 42+    (length 28, ongoing)

export function rehabProgress(triageCreatedAt) {
  if (!triageCreatedAt) return null
  const then = new Date(triageCreatedAt)
  if (Number.isNaN(then.getTime())) return null
  const days = Math.floor((Date.now() - then.getTime()) / 86400000)

  let phase, dayInPhase, phaseLength
  if (days < 14) {
    phase = 1; dayInPhase = days; phaseLength = 14
  } else if (days < 42) {
    phase = 2; dayInPhase = days - 14; phaseLength = 28
  } else {
    phase = 3; dayInPhase = days - 42; phaseLength = 28
  }

  // Display values are 1-indexed for human readability ("Day 1" not "Day 0")
  return {
    phase,
    dayInPhase: dayInPhase + 1,
    phaseLength,
    days,
    progress: Math.min(1, Math.max(0, (dayInPhase + 1) / phaseLength)),
  }
}
```

- [ ] **Step 2: Manual sanity check**

```bash
cd frontend && node --input-type=module -e "
import('./src/lib/rehabHeuristic.js').then(({ rehabProgress }) => {
  const now = Date.now()
  const day = (n) => new Date(now - n*86400000).toISOString()
  console.log('today:',    rehabProgress(day(0)))
  console.log('day 5:',    rehabProgress(day(5)))
  console.log('day 20:',   rehabProgress(day(20)))
  console.log('day 60:',   rehabProgress(day(60)))
  console.log('null:',     rehabProgress(null))
  console.log('bad str:',  rehabProgress('not-a-date'))
})
"
```

Expected: phase 1 day 1 (today), phase 1 day 6, phase 2 day 7, phase 3 day 19, null, null.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/rehabHeuristic.js
git commit -m "feat(hub): rehab heuristic — days-since-triage → phase/day"
```

---

### Task 3: pickFeatured function

**Files:**
- Create: `frontend/src/lib/pickFeatured.js`

- [ ] **Step 1: Create the helper**

Create `frontend/src/lib/pickFeatured.js`:

```js
// Pure function: select which tool gets the featured slot based on user state.
// Mirrors the priority table in the spec exactly. Recomputed on mount and
// after any user state change; not run after manual tap-to-swap.
//
// Input shape (HubData):
//   {
//     lastTriage: { id, injury_area, created_at } | null,
//     activePlan: { id, plan_data, ... }            | null,
//     todaySession: PlanSession                     | null,
//     todayLogged: boolean,
//   }

// Regions for which a rehab plan exists in frontend/src/data/exercises.js.
// Keep this in sync with EXERCISES keys. If exercises.js gains a new region,
// add it here too.
export const REHAB_REGIONS = new Set([
  'Finger', 'Wrist', 'Elbow', 'Shoulder', 'Knee', 'Hip', 'Ankle',
  'Chest', 'Abs', 'Neck', 'Triceps', 'Lats', 'Glutes', 'Hamstrings',
  'Calves', 'Lower Back', 'Upper Back', 'General',
])

function daysSince(isoString) {
  if (!isoString) return Infinity
  const t = new Date(isoString).getTime()
  if (Number.isNaN(t)) return Infinity
  return Math.floor((Date.now() - t) / 86400000)
}

export function hasTriageWithin(data, days) {
  const t = data?.lastTriage
  if (!t) return false
  if (!REHAB_REGIONS.has(t.injury_area)) return false
  return daysSince(t.created_at) <= days
}

export function pickFeatured(data) {
  const recent = hasTriageWithin(data, 14)
  const older  = !recent && hasTriageWithin(data, 90)
  const hasPlan = !!data?.activePlan

  if (recent) return 'rehab'
  if (hasPlan) return 'train'
  if (older) return 'rehab'
  return 'triage'
}
```

- [ ] **Step 2: Manual sanity check**

```bash
cd frontend && node --input-type=module -e "
import('./src/lib/pickFeatured.js').then(({ pickFeatured }) => {
  const now = new Date().toISOString()
  const old = new Date(Date.now() - 30*86400000).toISOString()
  console.log('new user:',         pickFeatured({}))
  console.log('recent triage:',    pickFeatured({ lastTriage: { injury_area: 'Finger', created_at: now } }))
  console.log('plan only:',        pickFeatured({ activePlan: { id: 1 } }))
  console.log('recent + plan:',    pickFeatured({ lastTriage: { injury_area: 'Finger', created_at: now }, activePlan: { id: 1 } }))
  console.log('older triage:',     pickFeatured({ lastTriage: { injury_area: 'Finger', created_at: old } }))
  console.log('unknown region:',   pickFeatured({ lastTriage: { injury_area: 'Eyeball', created_at: now } }))
})
"
```

Expected outputs (in order): `triage`, `rehab`, `train`, `rehab`, `rehab`, `triage`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/pickFeatured.js
git commit -m "feat(hub): pickFeatured — priority logic per spec table"
```

---

### Task 4: useHubData hook

**Files:**
- Create: `frontend/src/hooks/useHubData.js`

- [ ] **Step 1: Verify api.js exports are present**

```bash
grep -E "^export const (getSessions|getActivePlan|getTrainingStats|getTrainingLogs|getLeaderboard)" frontend/src/api.js
```

Expected: all 5 lines present. If any is missing, the hub plan can't proceed — flag and stop.

- [ ] **Step 2: Create the hook**

Create `frontend/src/hooks/useHubData.js`:

```js
import { useEffect, useState } from 'react'
import {
  getSessions,
  getActivePlan,
  getTrainingStats,
  getTrainingLogs,
  getLeaderboard,
} from '../api'

const todayIsoDate = () => new Date().toISOString().slice(0, 10)

// Compute the calendar date of a plan session using the same algorithm
// PlanView.jsx uses, so "today's session" is consistent across the app.
function planSessionForToday(activePlan) {
  if (!activePlan?.plan_data?.sessions?.length || !activePlan.start_date) return null
  const start = new Date(activePlan.start_date + 'T00:00:00')
  const dpw = activePlan.plan_data.days_per_week || 3
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dayOffset = Math.floor((today - start) / 86400000)

  for (const s of activePlan.plan_data.sessions) {
    const off = (s.week - 1) * 7 + Math.round((s.day_in_week - 1) * (7 / dpw))
    if (off === dayOffset) return s
  }
  return null
}

/**
 * Loads everything HubTab needs in parallel. Per-endpoint failures degrade
 * gracefully — a 404 on /api/plans/active is normal (no plan yet) and is
 * NOT surfaced as an error.
 *
 * Returns: { loading, lastTriage, activePlan, todaySession, todayLogged,
 *           stats, rank }
 */
export function useHubData(user) {
  const [data, setData] = useState({
    loading: true,
    lastTriage: null,
    activePlan: null,
    todaySession: null,
    todayLogged: false,
    stats: null,
    rank: null,
  })

  useEffect(() => {
    if (!user) {
      setData((d) => ({ ...d, loading: false }))
      return
    }
    let cancelled = false

    Promise.allSettled([
      getSessions(1),
      getActivePlan(),
      getTrainingStats(),
      getTrainingLogs(5),
      getLeaderboard({ window: 'week', limit: 1 }),
    ]).then(([sessionsR, planR, statsR, logsR, lbR]) => {
      if (cancelled) return

      const sessions   = sessionsR.status === 'fulfilled' ? (sessionsR.value || []) : []
      const activePlan = planR.status     === 'fulfilled' ? planR.value             : null
      const stats      = statsR.status    === 'fulfilled' ? statsR.value            : null
      const logs       = logsR.status     === 'fulfilled' ? (logsR.value || [])     : []
      const lb         = lbR.status       === 'fulfilled' ? lbR.value               : null

      const today = todayIsoDate()
      const todayLogged = logs.some((l) => l.date === today)
      const todaySession = planSessionForToday(activePlan)

      setData({
        loading: false,
        lastTriage: sessions[0] || null,
        activePlan,
        todaySession,
        todayLogged,
        stats,
        rank: lb?.me || null,
      })
    })

    return () => { cancelled = true }
  }, [user])

  return data
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useHubData.js
git commit -m "feat(hub): useHubData hook — 5 endpoints in parallel, graceful failure"
```

---

### Task 5: SVG pattern components

**Files:**
- Create: `frontend/src/components/HubPatterns.jsx`

- [ ] **Step 1: Create the patterns**

Create `frontend/src/components/HubPatterns.jsx`:

```jsx
// Four background patterns, one per tool. Each is a full-bleed absolute layer
// that goes behind card content. Patterns use the tool's accent colour at low
// opacity so they read as texture, not noise.
//
// Use via:
//   <div className="relative overflow-hidden ...">
//     <Pattern tool="train" />
//     <content with z-10 />
//   </div>

const PATTERNS = {
  pulse: (
    <svg
      width="100%" height="100%"
      preserveAspectRatio="none"
      style={{ position: 'absolute', inset: 0, opacity: 0.45 }}
      aria-hidden="true"
    >
      <defs>
        <pattern id="hub-pulse" width="80" height="40" patternUnits="userSpaceOnUse">
          <path
            d="M0 20 H20 L25 8 L30 32 L35 14 L40 20 H80"
            stroke="#fb7185" strokeWidth="1.2" fill="none"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hub-pulse)" />
    </svg>
  ),
  dots: (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute', inset: 0, opacity: 0.65,
        backgroundImage: 'radial-gradient(circle, rgba(20,184,166,0.40) 1px, transparent 1.4px)',
        backgroundSize: '12px 12px',
      }}
    />
  ),
  stripes: (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute', inset: 0, opacity: 0.65,
        backgroundImage:
          'repeating-linear-gradient(45deg, transparent 0 8px, rgba(20,184,166,0.10) 8px 10px)',
      }}
    />
  ),
  speech: (
    <svg
      width="100%" height="100%"
      preserveAspectRatio="none"
      style={{ position: 'absolute', inset: 0, opacity: 0.45 }}
      aria-hidden="true"
    >
      <defs>
        <pattern id="hub-speech" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M8 8 H32 V22 H22 L18 27 L18 22 H8 Z" fill="none" stroke="#fbbf24" strokeWidth="1" />
          <path d="M28 32 H52 V46 H42 L38 51 L38 46 H28 Z" fill="none" stroke="#fbbf24" strokeWidth="0.8" opacity="0.65" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hub-speech)" />
    </svg>
  ),
}

export default function HubPattern({ pattern }) {
  return PATTERNS[pattern] || null
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/HubPatterns.jsx
git commit -m "feat(hub): HubPattern component — four SVG patterns (pulse/dots/stripes/speech)"
```

---

### Task 6: HubGreeting component

**Files:**
- Create: `frontend/src/components/HubGreeting.jsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/components/HubGreeting.jsx`:

```jsx
import { Flame } from 'lucide-react'
import { rehabProgress } from '../lib/rehabHeuristic'

// Renders the gradient greeting + the streak pill. The streak pill is hidden
// for streaks below 2 days (a streak of 1 doesn't deserve the spotlight).

function formatToday() {
  return new Date().toLocaleDateString(undefined, { weekday: 'long' })
}

function subtitleFor(data) {
  const rp = rehabProgress(data.lastTriage?.created_at)
  if (rp && data.lastTriage) {
    return `${formatToday()} · Day ${rp.dayInPhase} of ${data.lastTriage.injury_area.toLowerCase()} rehab`
  }
  if (data.todaySession && !data.todayLogged) {
    return `${formatToday()} · Today's session is ready`
  }
  if (data.todayLogged) {
    return `${formatToday()} · Logged today — nice work`
  }
  return formatToday()
}

export default function HubGreeting({ user, data }) {
  const name = user?.display_name || user?.email?.split('@')[0] || 'climber'
  const streak = data?.stats?.current_streak_days || 0
  const showStreak = streak >= 2

  return (
    <div className="flex items-start justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold leading-tight tracking-tight
                       bg-gradient-to-r from-accent via-text to-accent2
                       bg-clip-text text-transparent">
          Welcome back,<br />{name}
        </h1>
        <p className="text-xs text-muted mt-1">{subtitleFor(data)}</p>
      </div>
      {showStreak && (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold
                         px-3 py-1.5 rounded-full whitespace-nowrap
                         border border-accent3/40 bg-accent3/10 text-accent3 shrink-0">
          <Flame size={12} strokeWidth={2.4} />
          {streak} days
        </span>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/HubGreeting.jsx
git commit -m "feat(hub): HubGreeting — gradient greeting + streak pill (hidden under 2 days)"
```

---

### Task 7: HubToolCard component

**Files:**
- Create: `frontend/src/components/HubToolCard.jsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/components/HubToolCard.jsx`:

```jsx
import { ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { TOOLS, ACCENT_CLASSES } from '../data/hubTools'
import HubPattern from './HubPatterns'

/**
 * Small status card. Used in the right-hand stack. Tapping it should call
 * `onTap(toolKey)` so the parent can promote it to the featured slot.
 *
 * Props:
 *   toolKey:  'triage' | 'rehab' | 'train' | 'chat'
 *   status:   string          — status line under the label
 *   isLive:   boolean         — show the pulsing dot before the status
 *   progress: number | null   — 0..1, renders a mini progress bar under status
 *   onTap:    () => void
 */
export default function HubToolCard({ toolKey, status, isLive = false, progress = null, onTap }) {
  const tool = TOOLS[toolKey]
  const c = ACCENT_CLASSES[tool.accent]
  const Icon = tool.icon

  return (
    <motion.button
      type="button"
      onClick={onTap}
      layoutId={`hub-card-${toolKey}`}
      transition={{ duration: 0.18, ease: 'easeInOut' }}
      className={`relative overflow-hidden rounded-2xl border ${c.borderSoft} ${c.bgGradient}
                  flex items-center gap-3 px-4 py-3.5 min-h-[86px] text-left
                  hover:-translate-y-0.5 transition-transform group w-full`}
    >
      {/* glow orb (behind pattern + content) */}
      <span className={`pointer-events-none absolute -top-10 -right-10 w-[140px] h-[140px]
                        rounded-full blur-[40px] ${c.glow} z-0`} />
      {/* pattern layer */}
      <HubPattern pattern={tool.pattern} />

      <span className={`relative z-10 inline-flex items-center justify-center w-9 h-9
                        rounded-xl border ${c.border} ${c.iconBg} ${c.text} shrink-0`}>
        <Icon size={18} strokeWidth={2} />
      </span>

      <div className="relative z-10 flex-1 min-w-0">
        <p className="text-sm font-bold text-text leading-tight">{tool.label}</p>
        <p className="text-[11px] text-muted mt-0.5 flex items-center gap-1.5">
          {isLive && <span className={`w-1.5 h-1.5 rounded-full ${c.dotClass} shrink-0`} />}
          <span className="truncate">{status}</span>
        </p>
        {progress != null && (
          <div className="relative mt-1 h-[3px] w-[70%] rounded-full bg-white/10 overflow-hidden">
            <div className={`h-full rounded-full ${c.progressBar}`}
                 style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        )}
      </div>

      <ChevronRight
        size={14}
        strokeWidth={2.4}
        className="relative z-10 text-text/25 group-hover:text-text/60 group-hover:translate-x-0.5
                   transition-all shrink-0"
      />
    </motion.button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/HubToolCard.jsx
git commit -m "feat(hub): HubToolCard — small status card with icon, live dot, progress bar, chevron"
```

---

### Task 8: HubFeaturedCard component

**Files:**
- Create: `frontend/src/components/HubFeaturedCard.jsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/components/HubFeaturedCard.jsx`:

```jsx
import { ArrowRight, Target } from 'lucide-react'
import { motion } from 'framer-motion'
import { TOOLS, ACCENT_CLASSES } from '../data/hubTools'
import HubPattern from './HubPatterns'

/**
 * The big card on the left. Props mirror HubToolCard but with extra fields
 * for rich content: eyebrow, title, detail, subDetail, progress, ctaLabel.
 *
 * Props:
 *   toolKey:    'triage' | 'rehab' | 'train' | 'chat'
 *   eyebrow:    string                 — small label above title (e.g. "Today · Train")
 *   title:      string                 — primary headline (e.g. "Hangboard · 60 min")
 *   detail:     string                 — first paragraph
 *   subDetail:  string | null          — second paragraph (smaller, muted)
 *   progress:   { value: 0..1, label } | null
 *   ctaLabel:   string                 — button text (e.g. "Start session")
 *   onCta:      () => void
 */
export default function HubFeaturedCard({
  toolKey, eyebrow, title, detail, subDetail,
  progress, ctaLabel, onCta,
}) {
  const tool = TOOLS[toolKey]
  const c = ACCENT_CLASSES[tool.accent]
  const Icon = tool.icon

  return (
    <motion.div
      layoutId={`hub-card-${toolKey}`}
      transition={{ duration: 0.18, ease: 'easeInOut' }}
      className={`relative overflow-hidden rounded-2xl border ${c.border} ${c.bgGradient}
                  p-5 md:p-6 flex flex-col min-h-[280px]
                  shadow-[0_0_36px_rgba(20,184,166,0.14)]`}
    >
      <span className={`pointer-events-none absolute -top-12 -right-12 w-[180px] h-[180px]
                        rounded-full blur-[50px] ${c.glow} z-0`} />
      <HubPattern pattern={tool.pattern} />

      <div className="relative z-10 flex items-center gap-3 mb-1">
        <span className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl
                          border ${c.border} ${c.iconBg} ${c.text}
                          shadow-[0_0_18px_rgba(20,184,166,0.25)] shrink-0`}>
          <Icon size={24} strokeWidth={2} />
        </span>
        <div>
          <p className={`text-[10px] font-extrabold uppercase tracking-[0.15em] ${c.text}`}>
            <Target size={11} strokeWidth={2.4} className="inline mr-1 -mt-0.5" />
            {eyebrow}
          </p>
          <p className="text-lg font-extrabold text-text -tracking-[0.01em] leading-tight">{title}</p>
        </div>
      </div>

      <div className="relative z-10 flex-1 mt-3">
        <p className="text-sm text-text leading-snug">{detail}</p>
        {subDetail && (
          <p className="text-[11px] text-muted mt-1.5">{subDetail}</p>
        )}

        {progress && (
          <div className="mt-4">
            <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
              <div className={`h-full rounded-full ${c.progressBar}`}
                   style={{ width: `${Math.round(progress.value * 100)}%` }} />
            </div>
            <p className="mt-2 text-[10px] uppercase tracking-[0.1em] font-bold text-muted">
              {progress.label}
            </p>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onCta}
        className={`relative z-10 self-start mt-5 inline-flex items-center gap-2
                    px-4 py-2.5 rounded-lg text-sm font-bold text-bg
                    ${c.text === 'text-accent' ? 'bg-accent' :
                      c.text === 'text-accent2' ? 'bg-accent2' : 'bg-accent3'}
                    hover:brightness-110 active:brightness-95 transition`}
      >
        {ctaLabel}
        <ArrowRight size={14} strokeWidth={2.6} />
      </button>
    </motion.div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/HubFeaturedCard.jsx
git commit -m "feat(hub): HubFeaturedCard — large featured card with eyebrow, detail, progress, CTA"
```

---

### Task 9: HubSocialStrip component

**Files:**
- Create: `frontend/src/components/HubSocialStrip.jsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/components/HubSocialStrip.jsx`:

```jsx
import { Trophy } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

/**
 * Bottom strip showing the user's leaderboard rank with a drill-in link.
 * Empty state (no rank yet) is friendlier — invites them to log a session.
 *
 * Props:
 *   rank: { rank, hours, display_name } | null
 */
export default function HubSocialStrip({ rank }) {
  const navigate = useNavigate()

  if (!rank || !rank.rank) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl
                      bg-panel2/50 border border-outline text-xs text-muted">
        <span>Log your first session to see how you stack up.</span>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl
                    bg-panel2/50 border border-outline text-xs text-muted">
      <span className="flex items-center gap-2">
        <Trophy size={14} strokeWidth={2.2} className="text-accent3" />
        Ranked <strong className="text-text font-bold">#{rank.rank}</strong> this week
      </span>
      <button
        type="button"
        onClick={() => navigate('/train')}
        className="text-accent text-[11px] font-bold hover:underline"
      >
        See leaderboard ›
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/HubSocialStrip.jsx
git commit -m "feat(hub): HubSocialStrip — rank line + see-leaderboard link, empty state"
```

---

### Task 10: HubTab page assembly

**Files:**
- Create: `frontend/src/components/HubTab.jsx`

- [ ] **Step 1: Create the page**

Create `frontend/src/components/HubTab.jsx`:

```jsx
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useHubData } from '../hooks/useHubData'
import { pickFeatured, hasTriageWithin } from '../lib/pickFeatured'
import { rehabProgress } from '../lib/rehabHeuristic'
import HubGreeting from './HubGreeting'
import HubFeaturedCard from './HubFeaturedCard'
import HubToolCard from './HubToolCard'
import HubSocialStrip from './HubSocialStrip'

// Map a plan session's `type` field to the human label used on Train tab.
// (Mirrors TYPE_LABEL in PlanView.jsx — kept inline to avoid a cross-file
// import for one mapping.)
const SESSION_TYPE_LABEL = {
  hangboard: 'Hangboard', power: 'Power', project: 'Project',
  strength: 'Strength', endurance: 'Endurance',
  technique: 'Technique', rest: 'Rest',
}

// ── Derive each tool's status + (for the featured slot) its rich content ──

function statusForTriage(data) {
  if (data.lastTriage) {
    return { status: data.lastTriage.injury_area, isLive: true }
  }
  return { status: 'No active triage', isLive: false }
}

function statusForRehab(data) {
  const rp = rehabProgress(data.lastTriage?.created_at)
  if (!rp || !data.lastTriage || !hasTriageWithin(data, 90)) {
    return { status: 'No active rehab', isLive: false, progress: null }
  }
  return {
    status: `Phase ${rp.phase} · Day ${rp.dayInPhase}`,
    isLive: false,
    progress: rp.progress,
  }
}

function statusForTrain(data) {
  if (!data.activePlan) {
    return { status: 'Build a plan', isLive: false }
  }
  if (data.todayLogged) {
    return { status: 'Logged today', isLive: false }
  }
  if (data.todaySession) {
    return { status: "Today's session ready", isLive: true }
  }
  return { status: 'Rest day', isLive: false }
}

function statusForChat(data) {
  if (hasTriageWithin(data, 90)) {
    return { status: 'Ask about your recovery', isLive: false }
  }
  return { status: 'Ask anything', isLive: false }
}

const STATUS_FNS = {
  triage: statusForTriage,
  rehab:  statusForRehab,
  train:  statusForTrain,
  chat:   statusForChat,
}

// ── Rich content for the featured slot ───────────────────────────────────

function featuredContent(toolKey, data) {
  if (toolKey === 'train' && data.todaySession) {
    const s = data.todaySession
    const exercises = (s.main || []).slice(0, 3).map((e) => e.exercise).join(' · ')
    const totalSessions = data.activePlan?.plan_data?.sessions?.length || 1
    return {
      eyebrow:   'Today · Train',
      title:     `${SESSION_TYPE_LABEL[s.type] || s.type} · ${s.duration_min} min`,
      detail:    `Week ${s.week} · Day ${s.day_in_week}${data.lastTriage ? ' — be mindful of your ' + data.lastTriage.injury_area.toLowerCase() : ''}.`,
      subDetail: exercises || null,
      progress:  { value: (s.session_index + 1) / totalSessions,
                   label: `Session ${s.session_index + 1} of ${totalSessions}` },
      ctaLabel:  'Start session',
      onCta:     (nav) => nav(`/train`),
    }
  }
  if (toolKey === 'train' && !data.todaySession) {
    return {
      eyebrow:   'Today · Train',
      title:     data.activePlan ? 'Rest day' : 'No active plan',
      detail:    data.activePlan
        ? 'Today is a scheduled rest day — recover hard so tomorrow lands.'
        : 'Generate a 4-week training plan tailored to your goals.',
      subDetail: null,
      progress:  null,
      ctaLabel:  data.activePlan ? 'View this week' : 'Build a plan',
      onCta:     (nav) => nav('/train'),
    }
  }
  if (toolKey === 'rehab' && data.lastTriage) {
    const rp = rehabProgress(data.lastTriage.created_at)
    return {
      eyebrow:   'Today · Rehab',
      title:     `Phase ${rp.phase} · ${data.lastTriage.injury_area}`,
      detail:    `Day ${rp.dayInPhase} of ${rp.phaseLength} — week ${Math.ceil(rp.dayInPhase/7)} of ${Math.ceil(rp.phaseLength/7)}.`,
      subDetail: 'Follow your phase exercises — keep pain at or below 3/10.',
      progress:  { value: rp.progress, label: `Phase ${rp.phase} · ${Math.round(rp.progress*100)}% complete` },
      ctaLabel:  'Continue rehab',
      onCta:     (nav) => nav(`/rehab/${data.lastTriage.injury_area.toLowerCase().replace(/\s+/g, '-')}`),
    }
  }
  if (toolKey === 'triage') {
    return {
      eyebrow:   'Start here',
      title:     'Where does it hurt?',
      detail:    'Answer a few quick questions and get red-flag screening plus likely injury patterns.',
      subDetail: 'Educational only — not a medical diagnosis.',
      progress:  null,
      ctaLabel:  'Start triage',
      onCta:     (nav) => nav('/triage'),
    }
  }
  // Chat as featured — rarely picked but handle gracefully
  return {
    eyebrow:   'Ask',
    title:     'Chat with the assistant',
    detail:    'Ask anything about training, climbing injuries, load management, or recovery.',
    subDetail: null,
    progress:  null,
    ctaLabel:  'Open chat',
    onCta:     (nav) => nav('/chat'),
  }
}

// ── The page ─────────────────────────────────────────────────────────────

export default function HubTab({ user }) {
  const navigate = useNavigate()
  const data = useHubData(user)
  const autoPick = useMemo(() => pickFeatured(data), [data])

  // The user can manually swap the featured slot. While `manualPick` is null
  // we use the auto-picked tool; once set it sticks for this mount.
  const [manualPick, setManualPick] = useState(null)
  const featuredKey = manualPick || autoPick

  if (data.loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={20} className="text-accent animate-spin" />
      </div>
    )
  }

  const smallKeys = ['triage', 'rehab', 'train', 'chat'].filter((k) => k !== featuredKey)
  const fc = featuredContent(featuredKey, data)

  return (
    <div className="relative px-4 py-8 md:py-10 max-w-2xl mx-auto">
      {/* Ambient orbs — same language as App.jsx + Landing */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-20 -left-10 w-72 h-72 bg-accent/16 rounded-full blur-3xl" />
        <div className="absolute -top-16 -right-10 w-64 h-64 bg-accent2/12 rounded-full blur-3xl" />
      </div>

      <HubGreeting user={user} data={data} />

      <div className="grid grid-cols-1 md:grid-cols-[1.55fr_1fr] gap-3 mb-5">
        <HubFeaturedCard
          toolKey={featuredKey}
          eyebrow={fc.eyebrow}
          title={fc.title}
          detail={fc.detail}
          subDetail={fc.subDetail}
          progress={fc.progress}
          ctaLabel={fc.ctaLabel}
          onCta={() => fc.onCta(navigate)}
        />
        <div className="flex flex-col gap-2.5">
          {smallKeys.map((k) => {
            const s = STATUS_FNS[k](data)
            return (
              <HubToolCard
                key={k}
                toolKey={k}
                status={s.status}
                isLive={s.isLive}
                progress={s.progress ?? null}
                onTap={() => setManualPick(k)}
              />
            )
          })}
        </div>
      </div>

      <HubSocialStrip rank={data.rank} />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/HubTab.jsx
git commit -m "feat(hub): HubTab — page assembly, featured-pick, tap-to-swap, rich featured content"
```

---

### Task 11: Wire App.jsx — route, TABS entry, redirect, sidebar logo

**Files:**
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Add lazy import for HubTab and Home icon**

In `frontend/src/App.jsx`, add `Home` to the existing `lucide-react` import (look for the line beginning `import { MessageSquare, ...} from 'lucide-react'`):

```js
import { MessageSquare, Clock, Info, AlertTriangle, Menu, X, LogIn, LogOut, User, Activity, Dumbbell, FileText, Stethoscope, UserCircle2, ChevronRight, Shield, Bug, Loader2, Home } from 'lucide-react'
```

Just after the existing lazy-load block (`const TriageTab = lazy(() => import('./components/TriageTab'))` etc), add HubTab — keep the `const` aligned with neighbours:

```js
const HubTab            = lazy(() => import('./components/HubTab'))
```

- [ ] **Step 2: Prepend Hub to the TABS array**

Find the existing `TABS` constant and prepend the Hub entry:

```js
const TABS = [
  { id: 'hub',     label: 'Hub',     icon: Home        },
  { id: 'triage',  label: 'Triage',  icon: Activity    },
  { id: 'rehab',   label: 'Rehab',   icon: Stethoscope },
  { id: 'train',   label: 'Train',   icon: Dumbbell    },
  { id: 'chat',    label: 'Chat',    icon: MessageSquare },
  { id: 'history', label: 'History', icon: Clock       },
  { id: 'about',   label: 'About',   icon: Info        },
]
```

- [ ] **Step 3: Add the /hub route, redirect / → /hub for authed users, change fallback**

Find the existing `<Routes>` block. Add a `<Route path="/hub/*" element={<HubTab user={user} />} />` as the first route, and change the unknown-path fallback from `<Navigate to="/triage" replace />` to `<Navigate to="/hub" replace />`:

```jsx
<Routes>
  <Route path="/hub/*"     element={<HubTab user={user} />} />
  <Route path="/triage/*"  element={<TriageTab k={k} user={user} />} />
  <Route path="/rehab/*"   element={<RehabTab user={user} onLoginClick={() => setShowAuth(true)} />} />
  <Route path="/train"     element={<TrainTab user={user} dbReady={dbReady} onLoginClick={() => setShowAuth(true)} />} />
  <Route path="/chat"      element={<ChatTab k={k} user={user} onLoginClick={() => setShowAuth(true)} />} />
  <Route path="/history/*" element={<HistoryTab dbReady={dbReady} user={user} onLoginClick={() => setShowAuth(true)} />} />
  <Route path="/about"     element={<AboutTab />} />
  <Route path="*"          element={<Navigate to="/hub" replace />} />
</Routes>
```

Note: the existing root-route guard `if (isLandingRoute) { return <Landing ... /> }` is gated on `location.pathname === '/'`. Update that block to redirect signed-in users to `/hub` instead of showing Landing. Find:

```jsx
if (isLandingRoute) {
  return (
    <>
      <Landing onEnter={(tab) => navigate(tab ? `/${tab}` : '/triage')} />
      {showTerms && (
        <DisclaimerModal readOnly onExit={() => setShowTerms(false)} />
      )}
    </>
  )
}
```

Replace with:

```jsx
if (isLandingRoute) {
  // Signed-in users land on the Hub, not the marketing page.
  if (user) {
    return <Navigate to="/hub" replace />
  }
  return (
    <>
      <Landing onEnter={(tab) => navigate(tab ? `/${tab}` : '/hub')} />
      {showTerms && (
        <DisclaimerModal readOnly onExit={() => setShowTerms(false)} />
      )}
    </>
  )
}
```

You'll need `Navigate` from react-router-dom — add it to the import:

```js
import { Routes, Route, NavLink, useNavigate, useLocation, Navigate } from 'react-router-dom'
```

(If `Navigate` is already there, no change.)

- [ ] **Step 4: Wrap the sidebar logo block in a NavLink to /hub**

Find this block in `App.jsx`:

```jsx
<div className="shrink-0 px-6 pt-8 pb-6 border-b border-outline">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2 mb-1">
      <Logo size={32} dark />
      <span className="text-lg font-bold bg-gradient-to-r from-accent via-text to-accent2 bg-clip-text text-transparent">
        CoreTriage
      </span>
    </div>
    <button
      onClick={() => setSidebarOpen(false)}
      className="md:hidden text-muted hover:text-text"
    >
      <X size={18} />
    </button>
  </div>
  <p className="text-xs text-muted leading-relaxed mt-1">
    Training, rehab &amp; coaching for climbers
  </p>
</div>
```

Replace with:

```jsx
<div className="shrink-0 px-6 pt-8 pb-6 border-b border-outline">
  <div className="flex items-center justify-between">
    <NavLink
      to="/hub"
      onClick={() => setSidebarOpen(false)}
      aria-label="Go to hub"
      className="flex items-center gap-2 mb-1 hover:opacity-90 transition-opacity"
    >
      <Logo size={32} dark />
      <span className="text-lg font-bold bg-gradient-to-r from-accent via-text to-accent2 bg-clip-text text-transparent">
        CoreTriage
      </span>
    </NavLink>
    <button
      onClick={() => setSidebarOpen(false)}
      className="md:hidden text-muted hover:text-text"
    >
      <X size={18} />
    </button>
  </div>
  <p className="text-xs text-muted leading-relaxed mt-1">
    Training, rehab &amp; coaching for climbers
  </p>
</div>
```

- [ ] **Step 5: Verify the build**

```bash
cd frontend && npx vite build 2>&1 | tail -10
```

Expected: `✓ built in N.NNs` with no errors. If any module fails to resolve, fix the import path before continuing.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat(hub): wire /hub route, TABS entry, root redirect, sidebar logo link"
```

---

### Task 12: Wire Landing.jsx — onEnter default to /hub

**Files:**
- Modify: `frontend/src/components/Landing.jsx`

- [ ] **Step 1: Update the onEnter fallback in Landing**

In `frontend/src/components/Landing.jsx`, find the existing nav-bar "Open App" button:

```jsx
<button
  onClick={() => onEnter()}
  className="btn-primary flex items-center gap-1.5 text-sm"
>
  Open App <ChevronRight size={15} />
</button>
```

The behaviour change is in App.jsx (`onEnter={(tab) => navigate(tab ? \`/${tab}\` : '/hub')}`) — Landing itself doesn't need source changes, only verification that the no-arg `onEnter()` call lands the user on `/hub`.

Verify with a search:

```bash
grep -n "onEnter()" frontend/src/components/Landing.jsx
```

Expected: a single hit on the "Open App" button line. (Other `onEnter('triage')`, `onEnter(f.tab)`, etc. calls still navigate as before — they pass an explicit tab.)

- [ ] **Step 2: Verify by reading the change**

No code change in this file. Skip to the next task. (The plan keeps this task entry so the wiring is explicit and verifiable.)

- [ ] **Step 3: Commit**

No commit — no changes. Skip.

---

### Task 13: Build + manual smoke test

**Files:** none (verification only)

- [ ] **Step 1: Build the frontend**

```bash
cd frontend && npx vite build 2>&1 | tail -15
```

Expected: clean build, no module-resolution errors, no syntax errors. If errors appear, fix them before continuing.

- [ ] **Step 2: Run the dev server**

```bash
cd frontend && npm run dev
```

In a separate terminal, confirm the backend is up: `curl -s http://localhost:8000/api/health`. (If not running, start with `uvicorn main:app --reload` from the repo root.)

- [ ] **Step 3: Smoke test in the browser** (record results in this checklist)

Open `http://localhost:5173/` and walk through:

| # | Step | Expected |
|---|---|---|
| 1 | Sign in as an existing test user | Routes to `/hub` automatically (root redirect) |
| 2 | Inspect the hub | Greeting in gradient, streak pill on the right (if streak ≥ 2), featured card on left, three tool cards stacked on right, social strip at the bottom |
| 3 | Click the sidebar logo from any other tab | Navigates back to `/hub` |
| 4 | Tap any small tool card | That card swaps into the featured slot with smooth animation; the previously-featured card moves into the small stack |
| 5 | Tap the featured card's primary CTA | Navigates to the appropriate route (`/train`, `/rehab/...`, etc.) |
| 6 | Tap "See leaderboard ›" | Navigates to `/train` (where the leaderboard lives in TrainStatsPanel) |
| 7 | Resize browser to <768px width | Layout collapses to single column: greeting smaller, featured card full-width, small cards stack below |
| 8 | At <768px tap a small card | Tap-to-swap still works |
| 9 | Sign out, then visit `/hub` directly | Bounces to `/` (Landing) |
| 10 | From Landing tap "Open App" | Returns user to `/hub` if they sign in via the auth modal — or to `/triage` if behaviour was intentionally different. Verify it lands them on `/hub` after auth |

If any step fails, fix the underlying issue and re-run from step 1.

- [ ] **Step 4: Commit any final fixes**

```bash
git status
# If anything is untracked / modified, fix the issue and:
git add -A
git commit -m "fix(hub): smoke-test cleanup"
```

If nothing changed, skip the commit.

---

## Self-review checklist (DONE — included for the implementing engineer)

**Spec coverage:**
- [x] Problem + Solution → covered by Task 10's HubTab and Task 11's wiring
- [x] Layout (mockup v5 locked) → Tasks 6–10 build the components in the layout
- [x] Featured-card auto-pick logic → Task 3 (pickFeatured.js)
- [x] Rehab heuristic → Task 2 (rehabHeuristic.js)
- [x] Featured Train card content → Task 10 (featuredContent helper)
- [x] Tool card content (all four) → Task 10 (STATUS_FNS dispatch)
- [x] Empty states (composite) → covered by the status fns and featuredContent fallbacks
- [x] Streak rules (hide < 2) → Task 6 (HubGreeting)
- [x] Routing → Task 11
- [x] API surface (5 endpoints in parallel) → Task 4 (useHubData)
- [x] Mobile responsive (md breakpoint) → Task 10 uses `md:grid-cols-[...]` + Task 11's sidebar adjustments are unchanged
- [x] Frontend changes (file list) → matches Task 1–12
- [x] Animation (layoutId) → Tasks 7 + 8 use `layoutId={`hub-card-${toolKey}`}` on both card components
- [x] Sidebar logo as a hub link → Task 11 Step 4

**Placeholder scan:** No TBD/TODO/FIXME. Every code step shows actual code.

**Type consistency:** `toolKey` is used as the prop name on both `HubToolCard` and `HubFeaturedCard`. `accent` values are `'teal' | 'coral' | 'gold'` and used consistently in `ACCENT_CLASSES`. `pattern` values are `'pulse' | 'dots' | 'stripes' | 'speech'` and consistent. `progress` shape differs slightly between the two cards (`number | null` for ToolCard, `{ value, label } | null` for FeaturedCard) — intentional, documented inline in each component.
