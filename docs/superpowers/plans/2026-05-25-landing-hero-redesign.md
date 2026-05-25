# Landing Hero Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [docs/superpowers/specs/2026-05-25-landing-hero-redesign-design.md](../specs/2026-05-25-landing-hero-redesign-design.md)

**Goal:** Replace [frontend/src/components/Landing.jsx](../../../frontend/src/components/Landing.jsx) with an interactive 3-tab auto-cycling product tour (Movement → Recover → Progress) plus a first-time Hub welcome panel, with six explicit media placeholder slots reserved for real climbing photo/video assets.

**Architecture:** Behavioral logic (tab rotation, region cycling, welcome decision, demo data) is extracted to pure modules under `frontend/src/lib/landing/` with vitest unit tests — matching the existing test pattern (see `frontend/src/lib/__tests__/xp.test.js`). View components live under `frontend/src/components/landing/` and are kept thin; they consume the lib hooks. `Landing.jsx` is rewritten top-to-bottom; `HubTab.jsx` gets a single conditional render of the new welcome panel.

**Tech Stack:** React 18, Vite, Tailwind (`ct-*` design tokens), Framer Motion (existing patterns), lucide-react icons, vitest. No new dependencies.

**Tokens (reference, do not redefine):** `ct-forest`, `ct-forest-deep`, `ct-forest-soft`, `ct-cream`, `ct-cream-soft`, `ct-moss`, `ct-terracotta`, `ct-terra-soft`, `hairline`, `rim`, `.ct-eyebrow`, `.ct-title`, `.ct-display`, `.ct-body`, `.ct-body-soft`, `.ct-meta`, `.ct-surface`, `.ct-surface-hero`, `.btn-primary`, `.btn-secondary`.

---

## File structure

**New:**
- `frontend/src/components/landing/HeroProductTour.jsx` — 3-tab tour orchestrator
- `frontend/src/components/landing/RecoverTabPane.jsx` — body diagram + cycling region label
- `frontend/src/components/landing/MovementTabPane.jsx` — video + skeleton overlay placeholder
- `frontend/src/components/landing/ProgressTabPane.jsx` — static demo user composition
- `frontend/src/components/landing/MediaPlaceholder.jsx` — reusable styled placeholder for the six media slots
- `frontend/src/components/HubWelcomePanel.jsx` — first-time signed-in welcome
- `frontend/src/lib/landing/useAutoRotate.js` — hook returning `{ index, lock, unlock, locked }` for the 3-tab cycle
- `frontend/src/lib/landing/useRegionCycle.js` — hook returning the current body-region key + label/diagnosis pair
- `frontend/src/lib/landing/demoUser.js` — `alex_sends_v8` data (tier, pyramid bars, awards)
- `frontend/src/lib/landing/shouldShowHubWelcome.js` — pure decision function
- `frontend/src/lib/landing/__tests__/useAutoRotate.test.js`
- `frontend/src/lib/landing/__tests__/useRegionCycle.test.js`
- `frontend/src/lib/landing/__tests__/demoUser.test.js`
- `frontend/src/lib/landing/__tests__/shouldShowHubWelcome.test.js`
- `frontend/public/landing/.gitkeep`

**Modified:**
- `frontend/src/components/Landing.jsx` — full rewrite per spec
- `frontend/src/components/HubTab.jsx` — conditional `<HubWelcomePanel />` render

**Unchanged:** `AuthModal.jsx`, `UpgradeModal.jsx`, `ChatTab.jsx`, routing in `App.jsx`.

---

## Task 1: Worktree setup and baseline

**Files:** none yet

- [ ] **Step 1: Create an isolated worktree for this feature**

Use the `superpowers:using-git-worktrees` skill (or its `EnterWorktree` native tool) to start a worktree on a new branch named `landing-hero-redesign`. The remaining tasks all run inside that worktree.

- [ ] **Step 2: Verify the test baseline is clean**

Run from the worktree root:

```bash
cd frontend && npm install && npm test 2>&1 | tail -20
```

Expected: vitest reports all existing tests passing. Capture the test count — Task 14 verifies the same total + 4 new test files pass.

- [ ] **Step 3: Verify `npm run dev` boots the app**

```bash
cd frontend && npm run dev
```

Expected: Vite reports `Local: http://localhost:5173/` with no errors in the terminal. Open the URL, confirm the current landing page renders, then stop the dev server.

---

## Task 2: `useAutoRotate` hook (TDD)

**Files:**
- Create: `frontend/src/lib/landing/useAutoRotate.js`
- Test: `frontend/src/lib/landing/__tests__/useAutoRotate.test.js`

The hook drives the 3-tab cycle in the hero. It returns the current tab index, a `lock(index)` function (sets the index and stops auto-advance permanently for the session), and a `paused` boolean that, when true, halts the cycle without locking (used for hover/focus). It respects `prefers-reduced-motion` by never auto-advancing when reduced motion is set.

- [ ] **Step 1: Write the failing test file**

```js
// frontend/src/lib/landing/__tests__/useAutoRotate.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAutoRotate } from '../useAutoRotate.js'

describe('useAutoRotate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((q) => ({
        matches: false, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn(),
      })),
    })
  })
  afterEach(() => { vi.useRealTimers() })

  it('starts at index 0', () => {
    const { result } = renderHook(() => useAutoRotate({ count: 3, intervalMs: 6000 }))
    expect(result.current.index).toBe(0)
    expect(result.current.locked).toBe(false)
    expect(result.current.paused).toBe(false)
  })

  it('advances every intervalMs', () => {
    const { result } = renderHook(() => useAutoRotate({ count: 3, intervalMs: 6000 }))
    act(() => { vi.advanceTimersByTime(6000) })
    expect(result.current.index).toBe(1)
    act(() => { vi.advanceTimersByTime(6000) })
    expect(result.current.index).toBe(2)
    act(() => { vi.advanceTimersByTime(6000) })
    expect(result.current.index).toBe(0) // wraps
  })

  it('pause() stops advancing without locking', () => {
    const { result } = renderHook(() => useAutoRotate({ count: 3, intervalMs: 6000 }))
    act(() => { result.current.pause() })
    act(() => { vi.advanceTimersByTime(12000) })
    expect(result.current.index).toBe(0)
    expect(result.current.locked).toBe(false)
    act(() => { result.current.resume() })
    act(() => { vi.advanceTimersByTime(6000) })
    expect(result.current.index).toBe(1)
  })

  it('lock(i) sets the index and halts permanently', () => {
    const { result } = renderHook(() => useAutoRotate({ count: 3, intervalMs: 6000 }))
    act(() => { result.current.lock(2) })
    expect(result.current.index).toBe(2)
    expect(result.current.locked).toBe(true)
    act(() => { vi.advanceTimersByTime(60000) })
    expect(result.current.index).toBe(2) // never advances after lock
  })

  it('does not auto-advance when prefers-reduced-motion is set', () => {
    window.matchMedia = vi.fn().mockImplementation((q) => ({
      matches: q === '(prefers-reduced-motion: reduce)',
      media: q, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    }))
    const { result } = renderHook(() => useAutoRotate({ count: 3, intervalMs: 6000 }))
    act(() => { vi.advanceTimersByTime(60000) })
    expect(result.current.index).toBe(0)
  })
})
```

- [ ] **Step 2: Install the testing-library/react dev dep if not already present**

Check first: `cd frontend && cat package.json | grep testing-library`. If `@testing-library/react` is absent, install it:

```bash
cd frontend && npm install -D @testing-library/react @testing-library/dom
```

If already present, skip.

- [ ] **Step 3: Run the test, verify it fails**

```bash
cd frontend && npx vitest run src/lib/landing/__tests__/useAutoRotate.test.js
```

Expected: FAIL — "Cannot find module '../useAutoRotate.js'".

- [ ] **Step 4: Implement the hook**

```js
// frontend/src/lib/landing/useAutoRotate.js
import { useEffect, useRef, useState } from 'react'

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useAutoRotate({ count, intervalMs }) {
  const [index, setIndex] = useState(0)
  const [locked, setLocked] = useState(false)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (locked || paused) return
    if (prefersReducedMotion()) return
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % count)
    }, intervalMs)
    return () => clearInterval(timerRef.current)
  }, [count, intervalMs, locked, paused])

  return {
    index,
    locked,
    paused,
    pause: () => setPaused(true),
    resume: () => setPaused(false),
    lock: (i) => {
      setIndex(i)
      setLocked(true)
    },
  }
}
```

- [ ] **Step 5: Run the test, verify it passes**

```bash
cd frontend && npx vitest run src/lib/landing/__tests__/useAutoRotate.test.js
```

Expected: PASS, 5/5.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/landing/useAutoRotate.js \
        frontend/src/lib/landing/__tests__/useAutoRotate.test.js \
        frontend/package.json frontend/package-lock.json
git commit -m "feat(landing): useAutoRotate hook with reduced-motion + lock + pause"
```

---

## Task 3: `useRegionCycle` hook (TDD)

**Files:**
- Create: `frontend/src/lib/landing/useRegionCycle.js`
- Test: `frontend/src/lib/landing/__tests__/useRegionCycle.test.js`

The hook drives the body-region cycle inside the Recover tab. It cycles every 1.8s through a fixed list of `{ key, label, diagnosis, summary }` regions (right elbow → index finger A2 → right shoulder → left knee → lower back). It exposes the current entry and a `paused` boolean. Same reduced-motion behavior as `useAutoRotate`.

- [ ] **Step 1: Write the failing test**

```js
// frontend/src/lib/landing/__tests__/useRegionCycle.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRegionCycle, RECOVER_DEMO_REGIONS } from '../useRegionCycle.js'

describe('RECOVER_DEMO_REGIONS', () => {
  it('contains the five demo regions in the documented order', () => {
    expect(RECOVER_DEMO_REGIONS.map((r) => r.key)).toEqual([
      'right_elbow', 'index_a2', 'right_shoulder', 'left_knee', 'lower_back',
    ])
  })
  it('every region has a label, diagnosis, and summary', () => {
    for (const r of RECOVER_DEMO_REGIONS) {
      expect(r.label).toBeTruthy()
      expect(r.diagnosis).toBeTruthy()
      expect(r.summary).toBeTruthy()
    }
  })
})

describe('useRegionCycle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((q) => ({
        matches: false, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn(),
      })),
    })
  })
  afterEach(() => { vi.useRealTimers() })

  it('starts at the first region', () => {
    const { result } = renderHook(() => useRegionCycle({ intervalMs: 1800 }))
    expect(result.current.region.key).toBe('right_elbow')
  })

  it('cycles every intervalMs and wraps', () => {
    const { result } = renderHook(() => useRegionCycle({ intervalMs: 1800 }))
    act(() => { vi.advanceTimersByTime(1800) })
    expect(result.current.region.key).toBe('index_a2')
    act(() => { vi.advanceTimersByTime(1800 * 4) })
    expect(result.current.region.key).toBe('right_elbow') // wrapped
  })

  it('pause() halts cycling', () => {
    const { result } = renderHook(() => useRegionCycle({ intervalMs: 1800 }))
    act(() => { result.current.pause() })
    act(() => { vi.advanceTimersByTime(1800 * 10) })
    expect(result.current.region.key).toBe('right_elbow')
  })

  it('honors prefers-reduced-motion', () => {
    window.matchMedia = vi.fn().mockImplementation((q) => ({
      matches: q === '(prefers-reduced-motion: reduce)',
      media: q, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    }))
    const { result } = renderHook(() => useRegionCycle({ intervalMs: 1800 }))
    act(() => { vi.advanceTimersByTime(1800 * 5) })
    expect(result.current.region.key).toBe('right_elbow')
  })
})
```

- [ ] **Step 2: Run, verify FAIL**

```bash
cd frontend && npx vitest run src/lib/landing/__tests__/useRegionCycle.test.js
```

Expected: FAIL — "Cannot find module '../useRegionCycle.js'".

- [ ] **Step 3: Implement**

```js
// frontend/src/lib/landing/useRegionCycle.js
import { useEffect, useRef, useState } from 'react'

export const RECOVER_DEMO_REGIONS = [
  {
    key: 'right_elbow',
    label: 'Right elbow',
    diagnosis: 'Lateral epicondylitis',
    summary: 'Likely overuse from compression moves. 3-phase rehab plan inside.',
  },
  {
    key: 'index_a2',
    label: 'Index finger · A2',
    diagnosis: 'A2 pulley strain',
    summary: 'Half-crimp loading is the trigger. Open-hand rest, taper back over 4–6 weeks.',
  },
  {
    key: 'right_shoulder',
    label: 'Right shoulder',
    diagnosis: 'Rotator-cuff impingement',
    summary: 'Front-lever progressions aggravate it. Scapular control work first.',
  },
  {
    key: 'left_knee',
    label: 'Left knee',
    diagnosis: 'Patellar tendinopathy',
    summary: 'High-step and heel-hook reloading. Isometric loading 2× per week.',
  },
  {
    key: 'lower_back',
    label: 'Lower back',
    diagnosis: 'Lumbar facet irritation',
    summary: 'Overhead and arching positions sting. Hip-flexor mobility + core endurance.',
  },
]

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useRegionCycle({ intervalMs = 1800 } = {}) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (paused) return
    if (prefersReducedMotion()) return
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % RECOVER_DEMO_REGIONS.length)
    }, intervalMs)
    return () => clearInterval(timerRef.current)
  }, [intervalMs, paused])

  return {
    region: RECOVER_DEMO_REGIONS[index],
    index,
    paused,
    pause: () => setPaused(true),
    resume: () => setPaused(false),
  }
}
```

- [ ] **Step 4: Run, verify PASS**

```bash
cd frontend && npx vitest run src/lib/landing/__tests__/useRegionCycle.test.js
```

Expected: PASS, 6/6.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/landing/useRegionCycle.js \
        frontend/src/lib/landing/__tests__/useRegionCycle.test.js
git commit -m "feat(landing): useRegionCycle hook with five demo regions"
```

---

## Task 4: `demoUser` data module (TDD)

**Files:**
- Create: `frontend/src/lib/landing/demoUser.js`
- Test: `frontend/src/lib/landing/__tests__/demoUser.test.js`

The `alex_sends_v8` demo data the Progress tab renders. Static. Test exists so the structure stays valid as the Progress pane evolves.

- [ ] **Step 1: Write the failing test**

```js
// frontend/src/lib/landing/__tests__/demoUser.test.js
import { describe, it, expect } from 'vitest'
import { DEMO_USER } from '../demoUser.js'

describe('DEMO_USER', () => {
  it('has the documented identity fields', () => {
    expect(DEMO_USER.handle).toBe('alex_sends_v8')
    expect(DEMO_USER.tierLabel).toBe('Sapphire')
    expect(DEMO_USER.tierGrade).toBe('V7')
    expect(DEMO_USER.sendsToNext).toBe(8)
    expect(DEMO_USER.worldwideRank).toBe(42)
  })
  it('has a pyramid covering V0 through V8', () => {
    const grades = DEMO_USER.pyramid.map((b) => b.grade)
    expect(grades).toEqual(['V0','V1','V2','V3','V4','V5','V6','V7','V8'])
  })
  it('every pyramid bar has a non-negative count', () => {
    for (const b of DEMO_USER.pyramid) {
      expect(b.count).toBeGreaterThanOrEqual(0)
    }
  })
  it('V8 count is zero (alex has not sent V8 yet)', () => {
    const v8 = DEMO_USER.pyramid.find((b) => b.grade === 'V8')
    expect(v8.count).toBe(0)
  })
  it('exposes exactly three awards', () => {
    expect(DEMO_USER.awards.length).toBe(3)
    expect(DEMO_USER.awards.map((a) => a.label)).toEqual(['14-day streak', 'First V7', '100 sends'])
  })
})
```

- [ ] **Step 2: Run, verify FAIL**

```bash
cd frontend && npx vitest run src/lib/landing/__tests__/demoUser.test.js
```

Expected: FAIL — "Cannot find module '../demoUser.js'".

- [ ] **Step 3: Implement**

```js
// frontend/src/lib/landing/demoUser.js
//
// Static demo account shown in the Progress tab of the landing hero.
// A first-time visitor sees what a real, intermediate-strong climber's
// Progress tab looks like once they've used the app for ~30 days.

export const DEMO_USER = {
  handle: 'alex_sends_v8',
  tierLabel: 'Sapphire',
  tierGrade: 'V7',
  sendsToNext: 8,
  worldwideRank: 42,
  pyramid: [
    { grade: 'V0', count: 2 },
    { grade: 'V1', count: 5 },
    { grade: 'V2', count: 9 },
    { grade: 'V3', count: 14 },
    { grade: 'V4', count: 11 },
    { grade: 'V5', count: 8 },
    { grade: 'V6', count: 5 },
    { grade: 'V7', count: 2 },
    { grade: 'V8', count: 0 },
  ],
  awards: [
    { label: '14-day streak' },
    { label: 'First V7' },
    { label: '100 sends' },
  ],
}
```

- [ ] **Step 4: Run, verify PASS**

```bash
cd frontend && npx vitest run src/lib/landing/__tests__/demoUser.test.js
```

Expected: PASS, 5/5.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/landing/demoUser.js \
        frontend/src/lib/landing/__tests__/demoUser.test.js
git commit -m "feat(landing): alex_sends_v8 demo account data"
```

---

## Task 5: `shouldShowHubWelcome` decision function (TDD)

**Files:**
- Create: `frontend/src/lib/landing/shouldShowHubWelcome.js`
- Test: `frontend/src/lib/landing/__tests__/shouldShowHubWelcome.test.js`

Pure function: given `{ trainingLogsCount, sessionsCount, dismissedAt }`, return whether the welcome panel should render. Mirrors the spec trigger.

- [ ] **Step 1: Write the failing test**

```js
// frontend/src/lib/landing/__tests__/shouldShowHubWelcome.test.js
import { describe, it, expect } from 'vitest'
import { shouldShowHubWelcome } from '../shouldShowHubWelcome.js'

describe('shouldShowHubWelcome', () => {
  it('shows when both counts are zero and no dismiss flag is set', () => {
    expect(shouldShowHubWelcome({
      trainingLogsCount: 0, sessionsCount: 0, dismissedAt: null,
    })).toBe(true)
  })
  it('hides as soon as any training log exists', () => {
    expect(shouldShowHubWelcome({
      trainingLogsCount: 1, sessionsCount: 0, dismissedAt: null,
    })).toBe(false)
  })
  it('hides as soon as any triage session exists', () => {
    expect(shouldShowHubWelcome({
      trainingLogsCount: 0, sessionsCount: 1, dismissedAt: null,
    })).toBe(false)
  })
  it('hides when the user has dismissed it', () => {
    expect(shouldShowHubWelcome({
      trainingLogsCount: 0, sessionsCount: 0, dismissedAt: '2026-05-25T12:00:00Z',
    })).toBe(false)
  })
  it('treats undefined/null counts as zero', () => {
    expect(shouldShowHubWelcome({
      trainingLogsCount: undefined, sessionsCount: null, dismissedAt: null,
    })).toBe(true)
  })
})
```

- [ ] **Step 2: Run, verify FAIL**

```bash
cd frontend && npx vitest run src/lib/landing/__tests__/shouldShowHubWelcome.test.js
```

- [ ] **Step 3: Implement**

```js
// frontend/src/lib/landing/shouldShowHubWelcome.js
//
// Returns true if the first-time welcome panel should render in the Hub.
// Pure function — caller passes the live counts and the dismiss flag.

export const HUB_WELCOME_DISMISS_KEY = 'coretriage_hub_welcome_dismissed_at'

export function shouldShowHubWelcome({ trainingLogsCount, sessionsCount, dismissedAt }) {
  if (dismissedAt) return false
  const logs = trainingLogsCount || 0
  const sessions = sessionsCount || 0
  return logs === 0 && sessions === 0
}
```

- [ ] **Step 4: Run, verify PASS**

```bash
cd frontend && npx vitest run src/lib/landing/__tests__/shouldShowHubWelcome.test.js
```

Expected: PASS, 5/5.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/landing/shouldShowHubWelcome.js \
        frontend/src/lib/landing/__tests__/shouldShowHubWelcome.test.js
git commit -m "feat(landing): shouldShowHubWelcome decision function"
```

---

## Task 6: `MediaPlaceholder` component (view)

**Files:**
- Create: `frontend/src/components/landing/MediaPlaceholder.jsx`
- Create: `frontend/public/landing/.gitkeep`

Reusable styled placeholder for the six media slots. Props: `slotNumber`, `label`, `description`, `aspect` (CSS aspect-ratio string), `kind` (`'photo'` | `'video'`), `className`.

- [ ] **Step 1: Create the `.gitkeep`**

```bash
mkdir -p /Users/mathewbudnik/coretriage/.claude/worktrees/landing-hero-redesign/frontend/public/landing && \
touch /Users/mathewbudnik/coretriage/.claude/worktrees/landing-hero-redesign/frontend/public/landing/.gitkeep
```

(Adjust path to whatever the worktree root is.)

- [ ] **Step 2: Write the component**

```jsx
// frontend/src/components/landing/MediaPlaceholder.jsx
import { Camera, Video } from 'lucide-react'

/**
 * Styled placeholder for the six landing-page media slots. Renders a dashed
 * terracotta border, the slot number, the slot kind (photo or video), and a
 * one-line description so anyone looking at the page sees an intentional
 * pending asset. Replace this with an <img> or <video> when the real asset
 * lives at frontend/public/landing/.
 */
export default function MediaPlaceholder({
  slotNumber,
  label,
  description,
  aspect = '16 / 9',
  kind = 'photo',
  className = '',
}) {
  const Icon = kind === 'video' ? Video : Camera
  return (
    <div
      className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-center ${className}`}
      style={{
        aspectRatio: aspect,
        background: 'linear-gradient(135deg, #243530, #1c2520)',
        borderColor: 'rgba(217,119,87,0.30)',
      }}
      aria-label={`Pending media · slot ${slotNumber} · ${label}`}
    >
      <div className="flex items-center gap-1.5 text-ct-terra-soft">
        <Icon size={12} aria-hidden="true" />
        <span className="ct-meta uppercase">Slot {slotNumber}</span>
      </div>
      {label && <div className="ct-title text-ct-cream">{label}</div>}
      {description && (
        <div className="ct-body-soft max-w-[18rem] px-4 text-ct-cream-soft">{description}</div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/landing/MediaPlaceholder.jsx \
        frontend/public/landing/.gitkeep
git commit -m "feat(landing): MediaPlaceholder component + public/landing/ dir"
```

---

## Task 7: `MovementTabPane` component (view)

**Files:**
- Create: `frontend/src/components/landing/MovementTabPane.jsx`

Movement tab pane. When the real video lives at `/landing/movement-loop.mp4`, render it. Until then, render the `MediaPlaceholder` for Slot 2 with a faux skeleton SVG overlay and a "live overlay · 0:14" label, matching the mockup at screen 04.

- [ ] **Step 1: Write the component**

```jsx
// frontend/src/components/landing/MovementTabPane.jsx
import MediaPlaceholder from './MediaPlaceholder'

const VIDEO_SRC = '/landing/movement-loop.mp4'

/**
 * Movement tab pane. Renders the climbing video with MediaPipe skeleton
 * overlay if the asset is present; otherwise renders a styled placeholder
 * (Media Slot 2) with a faux skeleton SVG so the layout reads "live demo"
 * even pre-asset.
 *
 * To swap in the real asset: drop the MP4 (and optionally a WebM sibling)
 * at frontend/public/landing/movement-loop.mp4 and flip ASSET_READY below.
 */
const ASSET_READY = false

export default function MovementTabPane() {
  return (
    <div
      className="ct-surface-hero relative overflow-hidden rounded-xl p-3"
      style={{ background: '#0a100e' }}
    >
      {ASSET_READY ? (
        <video
          className="w-full rounded-lg"
          src={VIDEO_SRC}
          autoPlay
          muted
          loop
          playsInline
          style={{ aspectRatio: '4 / 5' }}
        />
      ) : (
        <MediaPlaceholder
          slotNumber={2}
          kind="video"
          label="Movement tab video"
          description="15–20s muted loop of you climbing with the MediaPipe skeleton overlay running."
          aspect="4 / 5"
        />
      )}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden="true"
      >
        <svg width="140" height="180" viewBox="0 0 140 180" style={{ opacity: ASSET_READY ? 0 : 0.85 }}>
          <circle cx="70" cy="20" r="6" fill="#f0a875" />
          <line x1="70" y1="26" x2="70" y2="62" stroke="#d97757" strokeWidth="3" />
          <line x1="70" y1="32" x2="40" y2="50" stroke="#f0a875" strokeWidth="3" />
          <line x1="70" y1="32" x2="100" y2="50" stroke="#f0a875" strokeWidth="3" />
          <line x1="40" y1="50" x2="20" y2="42" stroke="#f0f5ed" strokeWidth="3" />
          <line x1="100" y1="50" x2="124" y2="48" stroke="#f0f5ed" strokeWidth="3" />
          <line x1="70" y1="62" x2="56" y2="108" stroke="#f0f5ed" strokeWidth="3" />
          <line x1="70" y1="62" x2="84" y2="108" stroke="#f0f5ed" strokeWidth="3" />
          <line x1="56" y1="108" x2="48" y2="158" stroke="#f0f5ed" strokeWidth="3" />
          <line x1="84" y1="108" x2="92" y2="158" stroke="#f0f5ed" strokeWidth="3" />
          {[[40,50],[100,50],[20,42],[124,48],[56,108],[84,108],[48,158],[92,158]].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="4" fill="#d97757" />
          ))}
        </svg>
      </div>
      <div className="ct-meta absolute left-3 top-3 text-ct-terra-soft">
        Live overlay · 0:14
      </div>
      <div className="absolute bottom-3 left-3 right-3 h-[5px] rounded-full" style={{ background: '#243530' }}>
        <div className="h-full rounded-full" style={{ width: '48%', background: '#d97757' }} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/landing/MovementTabPane.jsx
git commit -m "feat(landing): MovementTabPane with video + skeleton overlay placeholder"
```

---

## Task 8: `RecoverTabPane` component (view)

**Files:**
- Create: `frontend/src/components/landing/RecoverTabPane.jsx`

Two-column pane: simple SVG body diagram on the left with the current region highlighted in terracotta, label + diagnosis + summary + 3-segment phase bar on the right. Cycles via `useRegionCycle`. Pauses on hover or focus.

- [ ] **Step 1: Write the component**

```jsx
// frontend/src/components/landing/RecoverTabPane.jsx
import { useRegionCycle } from '../../lib/landing/useRegionCycle.js'

/**
 * Recover tab pane. Body diagram on the left, current region's diagnosis
 * + summary + 3-segment phase bar on the right. Auto-cycles through five
 * demo regions; hover/focus pauses the cycle. Each highlight uses the
 * terracotta accent; non-highlighted regions render neutral.
 */
const REGION_STROKE = 'rgba(230,237,228,0.18)'
const REGION_FILL = '#1f2924'
const HOT_FILL = '#d97757'
const HOT_STROKE = '#f0a875'

function regionFill(currentKey, key) {
  return currentKey === key ? HOT_FILL : REGION_FILL
}
function regionStroke(currentKey, key) {
  return currentKey === key ? HOT_STROKE : REGION_STROKE
}

export default function RecoverTabPane() {
  const cycle = useRegionCycle({ intervalMs: 1800 })
  const k = cycle.region.key
  return (
    <div
      className="ct-surface-hero grid grid-cols-[90px,1fr] items-center gap-4 rounded-xl p-4"
      onMouseEnter={cycle.pause}
      onMouseLeave={cycle.resume}
      onFocus={cycle.pause}
      onBlur={cycle.resume}
      tabIndex={0}
    >
      <svg width="90" height="180" viewBox="0 0 90 180" aria-hidden="true">
        <ellipse cx="45" cy="14" rx="11" ry="14" fill={REGION_FILL} stroke={REGION_STROKE} strokeWidth="1" />
        <path d="M30 32 L60 32 L65 80 L25 80 Z" fill={regionFill(k, 'lower_back')} stroke={regionStroke(k, 'lower_back')} strokeWidth="1" />
        <path d="M30 32 L18 60 L14 92 L10 92 L18 50 L20 32 Z" fill={REGION_FILL} stroke={REGION_STROKE} strokeWidth="1" />
        <path d="M60 32 L72 60 L76 92 L80 92 L72 50 L70 32 Z" fill={regionFill(k, 'right_elbow')} stroke={regionStroke(k, 'right_elbow')} strokeWidth="1.2" />
        <circle cx="76" cy="74" r={k === 'right_elbow' ? 6 : 0} fill="none" stroke={HOT_STROKE} strokeWidth="1.5" opacity="0.6" />
        <circle cx="58" cy="32" r={k === 'right_shoulder' ? 5 : 3} fill={regionFill(k, 'right_shoulder')} stroke={regionStroke(k, 'right_shoulder')} strokeWidth="1" />
        <path d="M30 80 L26 130 L22 168 L34 168 L36 130 L40 80 Z" fill={regionFill(k, 'left_knee')} stroke={regionStroke(k, 'left_knee')} strokeWidth="1" />
        <circle cx="29" cy="130" r={k === 'left_knee' ? 5 : 0} fill="none" stroke={HOT_STROKE} strokeWidth="1.5" opacity="0.7" />
        <path d="M60 80 L64 130 L68 168 L56 168 L54 130 L50 80 Z" fill={REGION_FILL} stroke={REGION_STROKE} strokeWidth="1" />
        <circle cx="80" cy="92" r={k === 'index_a2' ? 4 : 0} fill={HOT_FILL} stroke={HOT_STROKE} strokeWidth="1" />
      </svg>

      <div className="flex flex-col gap-2">
        <div className="ct-eyebrow text-ct-terra-soft" aria-live="polite">{cycle.region.label}</div>
        <div className="ct-title text-ct-cream">{cycle.region.diagnosis}</div>
        <div className="ct-body-soft text-ct-cream-soft">{cycle.region.summary}</div>
        <div className="mt-1 flex gap-1">
          <div className="h-1.5 flex-1 rounded-sm" style={{ background: HOT_FILL }} />
          <div className="h-1.5 flex-1 rounded-sm" style={{ background: HOT_STROKE }} />
          <div className="h-1.5 flex-1 rounded-sm border" style={{ background: '#243530', borderColor: 'rgba(230,237,228,0.10)' }} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/landing/RecoverTabPane.jsx
git commit -m "feat(landing): RecoverTabPane with cycling body-region highlight"
```

---

## Task 9: `ProgressTabPane` component (view)

**Files:**
- Create: `frontend/src/components/landing/ProgressTabPane.jsx`

Static composition for the Progress tab pane. Renders the tier badge + handle + rank chip, the 9-bar pyramid, and three award chips — all from `DEMO_USER`.

- [ ] **Step 1: Write the component**

```jsx
// frontend/src/components/landing/ProgressTabPane.jsx
import { DEMO_USER } from '../../lib/landing/demoUser.js'

/**
 * Progress tab pane. Static composition of a demo account's Progress tab —
 * tier badge, identity strip, grade pyramid (V0–V8), and three awards.
 * Uses the same gradient stops as the real ProgressTab so the visual reads
 * as truthful, not generic.
 */
export default function ProgressTabPane() {
  const maxCount = Math.max(...DEMO_USER.pyramid.map((b) => b.count), 1)
  return (
    <div className="ct-surface-hero flex flex-col gap-3 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full font-extrabold text-[#0f1614]"
          style={{
            background: 'radial-gradient(circle at 30% 30%, #f0a875, #d97757)',
            boxShadow: '0 0 18px rgba(217,119,87,0.40)',
            fontSize: 13,
          }}
        >
          {DEMO_USER.tierGrade}
        </div>
        <div className="flex-1">
          <div className="ct-meta text-ct-moss">{DEMO_USER.handle}</div>
          <div className="ct-title text-ct-cream">
            {DEMO_USER.tierLabel} tier · {DEMO_USER.sendsToNext} sends to {nextGrade(DEMO_USER.tierGrade)}
          </div>
        </div>
        <div className="ct-meta font-bold text-ct-terra-soft">#{DEMO_USER.worldwideRank} worldwide</div>
      </div>

      <div className="ct-eyebrow mt-1 text-ct-moss">grade pyramid · last 30 days</div>
      <div className="flex items-end gap-1.5 px-1">
        {DEMO_USER.pyramid.map((b) => {
          const heightPct = Math.max(6, Math.round((b.count / maxCount) * 64))
          const isTop = b.count === maxCount
          return (
            <div
              key={b.grade}
              className="flex-1 rounded-sm"
              style={{
                height: heightPct,
                background: b.count === 0
                  ? '#1c2520'
                  : isTop
                    ? '#d97757'
                    : 'linear-gradient(180deg, #f0a875, #d97757)',
                border: b.count === 0 ? '1px solid rgba(230,237,228,0.05)' : 'none',
              }}
            />
          )
        })}
      </div>
      <div className="flex justify-between px-1 text-[9px] text-ct-moss">
        {DEMO_USER.pyramid.map((b) => <span key={b.grade}>{b.grade}</span>)}
      </div>

      <div className="mt-1 flex gap-2">
        {DEMO_USER.awards.map((a) => (
          <div
            key={a.label}
            className="flex h-6 flex-1 items-center justify-center rounded-md text-[10px] text-ct-cream-soft"
            style={{ background: '#1c2520', border: '1px solid rgba(217,119,87,0.20)' }}
          >
            {a.label}
          </div>
        ))}
      </div>
    </div>
  )
}

function nextGrade(current) {
  const m = current.match(/^V(\d+)$/)
  if (!m) return ''
  return `V${parseInt(m[1], 10) + 1}`
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/landing/ProgressTabPane.jsx
git commit -m "feat(landing): ProgressTabPane with alex_sends_v8 demo composition"
```

---

## Task 10: `HeroProductTour` orchestrator (view)

**Files:**
- Create: `frontend/src/components/landing/HeroProductTour.jsx`

The orchestrator — three tabs (Movement default, Recover, Progress), auto-cycle via `useAutoRotate`, hover/focus pauses, click locks. All three panes mount on first render so the rotation never flashes.

- [ ] **Step 1: Write the component**

```jsx
// frontend/src/components/landing/HeroProductTour.jsx
import { useAutoRotate } from '../../lib/landing/useAutoRotate.js'
import MovementTabPane from './MovementTabPane'
import RecoverTabPane from './RecoverTabPane'
import ProgressTabPane from './ProgressTabPane'

const TABS = [
  { key: 'movement', label: 'Movement', Pane: MovementTabPane },
  { key: 'recover',  label: 'Recover',  Pane: RecoverTabPane },
  { key: 'progress', label: 'Progress', Pane: ProgressTabPane },
]

const INTERVAL_MS = 6000

/**
 * Hero product tour. Three tabs auto-cycle every 6s. Hover/focus pauses the
 * cycle without locking; clicking a tab locks it for the rest of the session.
 * All panes mount on first render so the swap is a cross-fade, never a
 * loading flash. Respects prefers-reduced-motion (no auto-cycle).
 */
export default function HeroProductTour() {
  const { index, locked, lock, pause, resume } = useAutoRotate({ count: TABS.length, intervalMs: INTERVAL_MS })

  return (
    <div
      className="w-full"
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
    >
      <div role="tablist" aria-label="CoreTriage product tour" className="flex gap-2">
        {TABS.map((t, i) => {
          const active = i === index
          return (
            <button
              key={t.key}
              role="tab"
              id={`hero-tab-${t.key}`}
              aria-controls={`hero-panel-${t.key}`}
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => lock(i)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') lock((i + 1) % TABS.length)
                if (e.key === 'ArrowLeft')  lock((i - 1 + TABS.length) % TABS.length)
              }}
              className={`flex-1 rounded-lg px-3 py-2 transition-colors text-sm font-bold ${
                active
                  ? 'bg-ct-terracotta text-[#0f1614]'
                  : 'border border-[rgba(230,237,228,0.10)] bg-ct-forest-soft text-ct-cream-soft hover:text-ct-cream'
              }`}
              style={active ? undefined : { background: '#1f2924' }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      <div className="relative mt-3">
        {TABS.map((t, i) => {
          const Pane = t.Pane
          const visible = i === index
          return (
            <div
              key={t.key}
              role="tabpanel"
              id={`hero-panel-${t.key}`}
              aria-labelledby={`hero-tab-${t.key}`}
              hidden={!visible}
              className={visible ? 'block' : ''}
            >
              <Pane />
            </div>
          )
        })}
      </div>

      {/* Locked-state hint suppresses the cycle indicator; otherwise show a
          subtle pulse on the active tab so the rotation is visible. */}
      {!locked && (
        <div className="mt-1 h-[2px] w-full overflow-hidden rounded-full" style={{ background: 'rgba(217,119,87,0.08)' }}>
          <div
            key={index}
            className="ct-hero-cycle-bar h-full"
            style={{
              width: '100%',
              background: '#d97757',
              transformOrigin: 'left center',
              animation: `ctHeroCycle ${INTERVAL_MS}ms linear forwards`,
            }}
          />
        </div>
      )}
      <style>{`
        @keyframes ctHeroCycle {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ct-hero-cycle-bar { animation: none !important; }
        }
      `}</style>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/landing/HeroProductTour.jsx
git commit -m "feat(landing): HeroProductTour orchestrator with auto-cycle + lock"
```

---

## Task 11: `HubWelcomePanel` component (view)

**Files:**
- Create: `frontend/src/components/HubWelcomePanel.jsx`

Welcome panel shown on Hub when both `training_logs` and `sessions` are empty and the dismiss flag isn't set.

- [ ] **Step 1: Write the component**

```jsx
// frontend/src/components/HubWelcomePanel.jsx
import { useNavigate } from 'react-router-dom'
import { Stethoscope, ListChecks, Video } from 'lucide-react'
import { HUB_WELCOME_DISMISS_KEY } from '../lib/landing/shouldShowHubWelcome.js'

const CHAT_VIEW_KEY = 'coretriage_chat_view'

/**
 * First-time welcome shown on the Hub when a brand-new account has zero
 * training logs and zero triage sessions. Mirrors the landing-page tone so
 * signup → first-in feels continuous. Dismiss link writes a localStorage
 * flag so it doesn't return if the user explores without logging anything.
 */
export default function HubWelcomePanel({ onDismiss }) {
  const navigate = useNavigate()

  const goRecover = () => navigate('/recover')
  const goTrain = () => navigate('/train')
  const goAnalyzer = () => {
    try { localStorage.setItem(CHAT_VIEW_KEY, 'analyzer') } catch {}
    navigate('/chat')
  }

  const dismiss = () => {
    try { localStorage.setItem(HUB_WELCOME_DISMISS_KEY, new Date().toISOString()) } catch {}
    onDismiss?.()
  }

  return (
    <section className="ct-surface-hero my-4 rounded-2xl p-5">
      <div className="ct-eyebrow text-ct-terra-soft">Welcome in.</div>
      <h2 className="ct-title mt-1 text-ct-cream">Pick a way in.</h2>
      <p className="ct-body-soft mt-2 text-ct-cream-soft">
        You can do a quick injury triage, log your first climb, or upload a clip
        for the Movement Analyzer. Or just nose around — everything's free for 14 days.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={goRecover}
          className="btn-secondary flex items-center justify-center gap-2 py-3"
        >
          <Stethoscope size={16} aria-hidden="true" />
          <span>Triage an injury</span>
        </button>
        <button
          type="button"
          onClick={goTrain}
          className="btn-secondary flex items-center justify-center gap-2 py-3"
        >
          <ListChecks size={16} aria-hidden="true" />
          <span>Log my first climb</span>
        </button>
        <button
          type="button"
          onClick={goAnalyzer}
          className="btn-primary flex items-center justify-center gap-2 py-3"
        >
          <Video size={16} aria-hidden="true" />
          <span>Try Movement Analyzer</span>
        </button>
      </div>

      <button
        type="button"
        onClick={dismiss}
        className="mt-3 text-xs text-ct-moss hover:text-ct-cream-soft"
      >
        I'll figure it out
      </button>
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/HubWelcomePanel.jsx
git commit -m "feat(hub): HubWelcomePanel for first-time signed-in users"
```

---

## Task 12: Rewrite `Landing.jsx`

**Files:**
- Modify: `frontend/src/components/Landing.jsx` (full rewrite)

Replace the current Landing implementation with the new structure: nav → hero (text col + HeroProductTour) → "What's inside" 4-card grid → §4 section-break photo (Slot 3) → §5 Built by Budnik (Slot 4) → §6 Coaching (Slot 5) → §7 Where does it hurt (existing 16 body chips) → §8 final CTA (Slot 6 backdrop) → §9 footer.

Read the current file first to preserve the `onEnter` interface and `setShowCoaching` modal wiring; the new Landing keeps those props exactly so [App.jsx](../../../frontend/src/components/App.jsx)'s caller doesn't change.

- [ ] **Step 1: Read the current file to preserve interfaces**

```bash
sed -n '1,80p' frontend/src/components/Landing.jsx
```

Note the exported component signature, the `onEnter`, `setShowCoaching`, and `UpgradeModal` wiring. The new file must keep the same props and same coaching-modal trigger so `App.jsx` doesn't need to change.

- [ ] **Step 2: Replace the entire file with the new layout**

Use the Write tool to overwrite. Full body:

```jsx
// frontend/src/components/Landing.jsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mountain, ChevronRight, Dumbbell, Home as HomeIcon, MessageSquare, Trophy } from 'lucide-react'
import HeroProductTour from './landing/HeroProductTour'
import MediaPlaceholder from './landing/MediaPlaceholder'
import UpgradeModal from './UpgradeModal'

const CTA_LABEL = 'Start free'

const WHATS_INSIDE = [
  { key: 'train',    label: 'Train',         Icon: Dumbbell,       desc: 'Log sends, build a pyramid, plan your weeks.',            path: 'train' },
  { key: 'hub',      label: 'Hub',           Icon: HomeIcon,       desc: 'One dashboard — streaks, today’s plan, tier badge.', path: 'hub' },
  { key: 'ai',       label: 'AI Assistant',  Icon: MessageSquare,  desc: 'Ask anything, grounded in a climbing knowledge base.',    path: 'chat' },
  { key: 'awards',   label: 'Awards & tier', Icon: Trophy,         desc: 'Rookie to Apex — unlocks on real send milestones.',       path: 'progress' },
]

const BODY_REGIONS = [
  'Fingers', 'Wrist', 'Elbow', 'Triceps', 'Shoulder', 'Chest',
  'Upper Back', 'Lats', 'Lower Back', 'Hip', 'Glutes', 'Hamstrings',
  'Knee', 'Calves', 'Ankle', 'Neck',
]

export default function Landing({ onEnter }) {
  const [showCoaching, setShowCoaching] = useState(false)

  const startFree = () => onEnter?.()
  const goRecover = () => onEnter?.('recover')
  const goFeature = (slug) => onEnter?.(slug)

  const scrollTo = (id) => () => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-screen bg-ct-forest text-ct-cream">
      {/* Nav */}
      <nav className="flex items-center justify-between border-b border-[rgba(230,237,228,0.06)] bg-[#0a100e] px-5 py-3">
        <div className="flex items-center gap-2">
          <Mountain size={18} className="text-ct-terra-soft" aria-hidden="true" />
          <span className="ct-title">CoreTriage</span>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={startFree} className="text-xs text-ct-cream-soft hover:text-ct-cream">Sign in</button>
          <button type="button" onClick={startFree} className="btn-primary text-xs">{CTA_LABEL}</button>
        </div>
      </nav>

      {/* § 1 · Hero */}
      <section className="relative overflow-hidden border-b border-[rgba(230,237,228,0.06)] px-5 py-12">
        <div className="pointer-events-none absolute inset-y-0 right-0 z-0 hidden w-[42%] md:block">
          <MediaPlaceholder
            slotNumber={1}
            kind="photo"
            label="Hero backdrop"
            description="Cinematic outdoor climbing shot, masked + faded behind the product tour."
            aspect="3 / 4"
            className="h-full"
          />
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(15,22,20,0.65) 35%, #0f1614 100%)',
          }} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative z-10 grid grid-cols-1 gap-8 md:grid-cols-2 md:items-center"
        >
          <div className="max-w-xl">
            <div className="ct-eyebrow text-ct-moss">Climbing app · built by a V13 boulderer</div>
            <h1 className="ct-display mt-3 text-ct-cream" style={{ fontSize: 'clamp(28px, 5vw, 44px)', lineHeight: 1.05 }}>
              Train, recover, and climb harder.{' '}
              <span className="text-ct-terracotta">Made for climbers.</span>
            </h1>
            <p className="ct-body mt-3 max-w-md text-ct-cream-soft">
              Triage an injury, log your sends, analyse your beta, watch your tier
              climb — one app, built by a V13 outdoor boulderer.
            </p>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={startFree} className="btn-primary text-sm">{CTA_LABEL}</button>
              <button type="button" onClick={scrollTo('whats-inside')} className="btn-secondary text-sm">See how it works</button>
            </div>
          </div>
          <div className="md:px-4">
            <HeroProductTour />
          </div>
        </motion.div>
      </section>

      {/* § 2 · What's inside */}
      <section id="whats-inside" className="border-b border-[rgba(230,237,228,0.06)] bg-[#0a100e] px-5 py-10">
        <div className="ct-eyebrow text-ct-moss">What’s inside</div>
        <h2 className="ct-title mt-2 text-ct-cream" style={{ fontSize: 22 }}>Everything a climber actually uses.</h2>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {WHATS_INSIDE.map(({ key, label, Icon, desc, path }) => (
            <button
              key={key}
              type="button"
              onClick={() => goFeature(path)}
              className="ct-surface group rounded-xl p-4 text-left hover:border-[rgba(217,119,87,0.30)]"
            >
              <div className="flex items-center gap-2 text-ct-terra-soft">
                <Icon size={14} aria-hidden="true" />
                <span className="ct-eyebrow">{label}</span>
              </div>
              <div className="ct-body mt-2 text-ct-cream-soft">{desc}</div>
              <div className="mt-3 flex justify-end">
                <ChevronRight size={14} className="text-ct-moss group-hover:text-ct-terra-soft" aria-hidden="true" />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* § 4 · Section-break photo (Slot 3) */}
      <section className="border-b border-[rgba(230,237,228,0.06)] px-5 py-8">
        <MediaPlaceholder
          slotNumber={3}
          kind="photo"
          label="Section-break photo"
          description="Wide action shot — atmosphere only, no copy. Color-graded warm to match palette."
          aspect="16 / 5"
        />
      </section>

      {/* § 5 · Built by Budnik */}
      <section className="border-b border-[rgba(230,237,228,0.06)] bg-gradient-to-br from-[#1c2520] to-[#0f1614] px-5 py-10">
        <div className="grid grid-cols-[80px,1fr] items-center gap-4 sm:grid-cols-[100px,1fr]">
          <MediaPlaceholder
            slotNumber={4}
            kind="photo"
            label=""
            description=""
            aspect="1 / 1"
            className="rounded-full"
          />
          <div>
            <h3 className="ct-title text-ct-cream" style={{ fontSize: 18 }}>Built by a V13 outdoor boulderer.</h3>
            <p className="ct-body mt-2 text-ct-cream-soft">
              A decade in the sport. Climbs V13 outdoors, sets at Momentum Houston, and
              built CoreTriage because the climbing app that should exist… didn’t.
            </p>
          </div>
        </div>
      </section>

      {/* § 6 · Coaching */}
      <section className="border-b border-[rgba(230,237,228,0.06)] px-5 py-10">
        <div className="ct-surface-hero overflow-hidden rounded-xl">
          <div className="grid grid-cols-1 sm:grid-cols-[140px,1fr]">
            <MediaPlaceholder
              slotNumber={5}
              kind="photo"
              label="Coaching photo"
              description=""
              aspect="3 / 4"
              className="rounded-none rounded-l-xl border-y-0 border-l-0"
            />
            <div className="p-5">
              <h3 className="ct-title text-ct-cream" style={{ fontSize: 18 }}>Inside knowledge, climber to climber.</h3>
              <p className="ct-body mt-2 text-ct-cream-soft">
                Send video of your project. Get a beta breakdown, a plan shaped around
                your weaknesses, and direct messaging on the things an AI can’t help with.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <button type="button" onClick={() => setShowCoaching(true)} className="btn-primary text-sm">Apply for coaching</button>
                <span className="ct-meta text-ct-moss">$89/mo · application only</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* § 7 · Where does it hurt */}
      <section className="border-b border-[rgba(230,237,228,0.06)] bg-[#0a100e] px-5 py-10">
        <div className="ct-eyebrow text-ct-moss">Got a tweak?</div>
        <h3 className="ct-title mt-2 text-ct-cream" style={{ fontSize: 18 }}>Where does it hurt?</h3>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {BODY_REGIONS.map((region) => (
            <button
              key={region}
              type="button"
              onClick={goRecover}
              className="rounded-full border border-[rgba(230,237,228,0.10)] bg-ct-forest-soft px-3 py-1 text-xs text-ct-cream-soft hover:border-[rgba(217,119,87,0.40)] hover:text-ct-cream"
            >
              {region}
            </button>
          ))}
        </div>
      </section>

      {/* § 8 · Final CTA */}
      <section className="relative overflow-hidden border-b border-[rgba(230,237,228,0.06)] px-5 py-14 text-center">
        <div className="pointer-events-none absolute inset-0 opacity-20">
          <MediaPlaceholder
            slotNumber={6}
            kind="photo"
            label="CTA backdrop"
            description=""
            aspect="auto"
            className="h-full w-full rounded-none border-0"
          />
        </div>
        <div className="relative z-10">
          <h2 className="ct-display text-ct-cream" style={{ fontSize: 'clamp(22px, 4vw, 32px)' }}>
            Make the climbing app you’ve been wanting.
          </h2>
          <p className="ct-body mt-2 text-ct-cream-soft">Free to use. No card required.</p>
          <div className="mt-4 inline-flex">
            <button type="button" onClick={startFree} className="btn-primary text-sm">{CTA_LABEL} →</button>
          </div>
        </div>
      </section>

      {/* § 9 · Footer */}
      <footer className="bg-[#0a100e] px-5 py-6">
        <div className="ct-meta text-center text-ct-moss">
          CoreTriage is an educational tool and does not provide medical diagnosis or treatment.
        </div>
      </footer>

      {showCoaching && (
        <UpgradeModal trigger="coaching" onClose={() => setShowCoaching(false)} />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Manually verify the page renders**

```bash
cd frontend && npm run dev
```

Open `http://localhost:5173/`. Walk through:
1. Hero loads on the Movement tab; after ~6s rotates to Recover; another ~6s to Progress; then back to Movement.
2. Hover the preview pane — rotation pauses; remove the mouse — resumes.
3. Click a tab — rotation locks and the underline pulse disappears.
4. Open OS reduced-motion ("System Settings → Accessibility → Display → Reduce motion" on macOS), reload — no auto-cycle.
5. Each "What’s inside" card hovers correctly and navigates on click.
6. Click "Apply for coaching" — UpgradeModal opens.
7. Click any body-region chip — navigates to `/recover`.
8. Click "Start free" in nav, hero, or final CTA — opens AuthModal (via App.jsx behavior).

Document anything that doesn’t match the spec; fix inline before committing.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/Landing.jsx
git commit -m "feat(landing): rewrite Landing.jsx with hero product tour + media slots"
```

---

## Task 13: Wire `HubWelcomePanel` into `HubTab`

**Files:**
- Modify: `frontend/src/components/HubTab.jsx`

Add a conditional render of `HubWelcomePanel` when both `training_logs` and `sessions` are empty. The fetch sources already exist in the app; pull counts via the existing API helpers (look in `frontend/src/api.js` for `getTrainingLogs` and `getSessions` or equivalents).

- [ ] **Step 1: Confirm the API helpers**

```bash
grep -n "getTrainingLogs\|getSessions\|listSessions\|trainingLogs" frontend/src/api.js | head
```

If `getTrainingLogs` and either `getSessions` or `listSessions` exist, use them. If not, use whatever fetch helper the existing HubTab subcomponents already call (e.g. `HubRecentSends` likely fetches training logs).

- [ ] **Step 2: Modify HubTab to load counts and render conditionally**

Replace the current `HubTab` body:

```jsx
// frontend/src/components/HubTab.jsx
import { useEffect, useState } from 'react'
import HubHero from './hub/HubHero'
import TodaysQuestCard from './hub/TodaysQuestCard'
import HubToolsGrid from './hub/HubToolsGrid'
import HubProjectTile from './hub/HubProjectTile'
import HubRecentSends from './hub/HubRecentSends'
import HubWelcomePanel from './HubWelcomePanel'
import { shouldShowHubWelcome, HUB_WELCOME_DISMISS_KEY } from '../lib/landing/shouldShowHubWelcome.js'
import { getTrainingLogs, listSessions } from '../api'

export default function HubTab({ user }) {
  const [welcomeState, setWelcomeState] = useState({ checking: true, show: false })

  useEffect(() => {
    let cancelled = false
    async function check() {
      try {
        const dismissedAt = localStorage.getItem(HUB_WELCOME_DISMISS_KEY) || null
        const [logs, sessions] = await Promise.all([
          getTrainingLogs().catch(() => []),
          listSessions().catch(() => []),
        ])
        if (cancelled) return
        setWelcomeState({
          checking: false,
          show: shouldShowHubWelcome({
            trainingLogsCount: logs?.length || 0,
            sessionsCount: sessions?.length || 0,
            dismissedAt,
          }),
        })
      } catch {
        if (!cancelled) setWelcomeState({ checking: false, show: false })
      }
    }
    check()
    return () => { cancelled = true }
  }, [user?.id])

  return (
    <div className="min-h-screen bg-ct-forest text-ct-cream p-4 pb-24 max-w-md mx-auto">
      {welcomeState.show && (
        <HubWelcomePanel onDismiss={() => setWelcomeState({ checking: false, show: false })} />
      )}
      <HubHero user={user} />
      <TodaysQuestCard />
      <HubProjectTile user={user} />
      <HubToolsGrid />
      <HubRecentSends />
    </div>
  )
}
```

If the API helper names differ from `getTrainingLogs` / `listSessions`, swap them for the actual names found in Step 1.

- [ ] **Step 3: Manually verify**

```bash
cd frontend && npm run dev
```

- Log out, create a new test account, land on `/hub` — welcome panel renders, three buttons navigate correctly, dismiss link writes `coretriage_hub_welcome_dismissed_at` to localStorage and hides the panel.
- Reload — panel stays hidden (dismiss is persistent).
- In devtools, clear that localStorage key, then log a training session via `/train` — welcome panel does NOT return (because `training_logs` is no longer empty).
- Sign in as an existing power user — welcome panel does NOT render.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/HubTab.jsx
git commit -m "feat(hub): render HubWelcomePanel for first-time signed-in users"
```

---

## Task 14: Final test + manual sweep

**Files:** none

- [ ] **Step 1: Run the full test suite**

```bash
cd frontend && npm test 2>&1 | tail -20
```

Expected: all previous tests still pass, plus 4 new test files (useAutoRotate, useRegionCycle, demoUser, shouldShowHubWelcome), 21 new tests total.

- [ ] **Step 2: Run the dev server and do a full visual sweep**

```bash
cd frontend && npm run dev
```

Walk through the entire landing page top-to-bottom and the Hub welcome flow. Compare against the spec's section list. Note any visual misses; fix inline.

- [ ] **Step 3: Run the production build**

```bash
cd frontend && npm run build
```

Expected: build succeeds. Check the terminal output for any chunk-size regressions (the new code is small — should not move the dial).

- [ ] **Step 4: Update MEMORY.md if any new conventions were established**

Skip unless something genuinely new came out of this work that future-Claude should remember (e.g., a hook pattern others should adopt). Otherwise no memory update.

- [ ] **Step 5: Exit the worktree**

The branch `landing-hero-redesign` carries 12 commits. Decide whether to merge to main, open a PR, or keep iterating — user will direct.

---

## Self-review

| Spec requirement | Covered by |
|---|---|
| Hero with 3-tab auto-cycling product tour, Movement default | Task 10 (HeroProductTour) + Task 2 (useAutoRotate) |
| Auto-cycle pauses on hover/focus, locks on click, respects reduced-motion | Task 2 + Task 10 |
| Movement tab: real climbing video w/ skeleton overlay (or placeholder) | Task 7 (MovementTabPane) |
| Recover tab: cycling body-region highlight + diagnosis copy | Task 8 (RecoverTabPane) + Task 3 (useRegionCycle) |
| Progress tab: alex_sends_v8 demo composition | Task 9 (ProgressTabPane) + Task 4 (demoUser) |
| 4-card "What's inside" grid (Train · Hub · AI · Awards) | Task 12 (Landing.jsx) |
| Built by Budnik section + headshot slot | Task 12 |
| Coaching tier panel w/ photo slot, UpgradeModal trigger preserved | Task 12 |
| Body-region chip cloud (existing 16 regions) | Task 12 |
| Final CTA w/ photo backdrop slot | Task 12 |
| 6 styled media placeholder slots, single-asset-swap | Task 6 (MediaPlaceholder) + Task 12 |
| Hub welcome panel triggered by zero training_logs + zero sessions + no dismiss flag | Task 5 + Task 11 + Task 13 |
| Hub welcome "Try Movement Analyzer" sets `coretriage_chat_view` = `analyzer` | Task 11 |
| Accessibility: role=tab/tabpanel, arrow-key nav, aria-live region label, focus management | Task 10 + Task 8 |
| Reuses ct- tokens, no new utilities, no new deps | All view tasks |

No gaps. No placeholders. Type/identifier names checked: `HUB_WELCOME_DISMISS_KEY`, `RECOVER_DEMO_REGIONS`, `DEMO_USER`, `CHAT_VIEW_KEY` are all consistent across the tasks that reference them.
