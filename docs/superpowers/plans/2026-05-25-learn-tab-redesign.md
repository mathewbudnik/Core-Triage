# Learn Tab Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the current `Chat` tab as the `Learn` tab — a Hub-style hero panel showing one cinematic reveal at a time (Coach / AI / Analyzer), with a three-tile switcher row below. Replaces the current three-equal-cards `ChatPicker`.

**Architecture:** Pure frontend, no backend changes. New `frontend/src/components/learn/` directory contains an orchestrator (`LearnHub`), three reveal components, a shared switcher tile, and a shared SVG skeleton animation. A new `useLearnFocus` hook encapsulates the "which option opens by default" rule (test-first). Existing sub-views (`AIChatView`, `CoachChatView`, `MovementAnalyzerView`) untouched. Sidebar nav relabels `Chat → Learn`, icon swaps `MessageSquare → BookOpen`. The URL `/chat` stays for deep-link compat with the landing-hero welcome panel.

**Tech Stack:** React 18, Vite, Tailwind CSS (existing `ct-*` tokens), Framer Motion (via `lib/motion.js` constants), lucide-react icons, vitest for the hook tests.

**Spec:** [docs/superpowers/specs/2026-05-25-learn-tab-redesign-design.md](../specs/2026-05-25-learn-tab-redesign-design.md)

**Mockup reference (for visual verification):** `.superpowers/brainstorm/25704-1779726245/content/learn-page-mockup-v3.html` (open via `npx serve .superpowers/brainstorm/25704-1779726245/content/` if needed)

---

## File map (built in this order)

| # | File | Action | Why this order |
|---|---|---|---|
| 0 | `frontend/src/components/learn/` | scaffold | Empty dir for the new module |
| 0 | `frontend/public/learn/.gitkeep` | scaffold | Reserve dir for future portrait + analyzer demo video |
| 1 | `frontend/src/hooks/useLearnFocus.js` | create | Pure logic — TDD with vitest |
| 1 | `frontend/src/hooks/__tests__/useLearnFocus.test.js` | create | Tests for the focus rule |
| 2 | `frontend/src/components/learn/SkeletonOverlayAnimation.jsx` | create | Shared primitive — used by Analyzer reveal AND (later) landing-hero |
| 3 | `frontend/src/components/learn/LearnSwitcherTile.jsx` | create | Small UI primitive used 3× by LearnHub |
| 4 | `frontend/src/components/learn/LearnRevealCoach.jsx` | create | Coach reveal (default copy + portrait placeholder OR recent-message variant for subs) |
| 5 | `frontend/src/components/learn/LearnRevealAI.jsx` | create | AI reveal (animated conversation loop) |
| 6 | `frontend/src/components/learn/LearnRevealAnalyzer.jsx` | create | Analyzer reveal (video frame chrome + SkeletonOverlayAnimation) |
| 7 | `frontend/src/components/learn/LearnHub.jsx` | create | Orchestrator — wires focus rule, switcher, hero, CTAs |
| 8 | `frontend/src/components/ChatTab.jsx` | modify | Swap `ChatPicker` for `LearnHub`; legacy `'picker'` migration |
| 9 | `frontend/src/App.jsx` | modify | Sidebar nav label `Chat → Learn`, icon `MessageSquare → BookOpen` |
| 10 | `frontend/src/components/ChatPicker.jsx` | delete | Replaced by `LearnHub` |
| 11 | (manual) | verify | Run dev server, walk the acceptance criteria |

---

## Task 0: Scaffold directories

**Files:**
- Create: `frontend/src/components/learn/.gitkeep`
- Create: `frontend/public/learn/.gitkeep`

- [ ] **Step 1: Create the learn component dir with a gitkeep**

```bash
mkdir -p /Users/mathewbudnik/coretriage/frontend/src/components/learn
touch    /Users/mathewbudnik/coretriage/frontend/src/components/learn/.gitkeep
mkdir -p /Users/mathewbudnik/coretriage/frontend/public/learn
touch    /Users/mathewbudnik/coretriage/frontend/public/learn/.gitkeep
```

- [ ] **Step 2: Verify**

```bash
ls -la /Users/mathewbudnik/coretriage/frontend/src/components/learn/
ls -la /Users/mathewbudnik/coretriage/frontend/public/learn/
```

Expected: both directories exist, each containing a `.gitkeep`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/learn/.gitkeep frontend/public/learn/.gitkeep
git commit -m "chore(learn): scaffold learn/ component dir + public asset dir"
```

---

## Task 1: useLearnFocus hook (TDD)

The focus rule from spec §3 is pure logic — perfect for test-first. The hook takes `user` plus a few inputs (`lastTriageSessionAt`, `lastTrainingLogAt`, `coachThreadUnread`) and returns one of `'coach' | 'ai' | 'analyzer'`. Coach-role-bypass is handled by the caller (LearnHub), not the hook — keeps the hook a pure function.

**Files:**
- Create: `frontend/src/hooks/useLearnFocus.js`
- Create: `frontend/src/hooks/__tests__/useLearnFocus.test.js`

- [ ] **Step 1: Write the failing tests**

Write `/Users/mathewbudnik/coretriage/frontend/src/hooks/__tests__/useLearnFocus.test.js`:

```javascript
import { describe, it, expect } from 'vitest'
import { computeLearnFocus } from '../useLearnFocus'

const now = new Date('2026-05-25T12:00:00Z')
const hoursAgo = (h) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString()
const daysAgo = (d) => hoursAgo(d * 24)

describe('computeLearnFocus', () => {
  it('returns "analyzer" when user is anonymous', () => {
    expect(computeLearnFocus({ user: null, now })).toBe('analyzer')
  })

  it('returns "coach" when coaching subscriber has an unread reply', () => {
    expect(computeLearnFocus({
      user: { tier: 'coaching' },
      coachThreadUnread: true,
      now,
    })).toBe('coach')
  })

  it('returns "coach" when user has tier=coaching (no unread)', () => {
    expect(computeLearnFocus({
      user: { tier: 'coaching' },
      coachThreadUnread: false,
      now,
    })).toBe('coach')
  })

  it('returns "coach" when free user has a triage session in last 30d', () => {
    expect(computeLearnFocus({
      user: { tier: 'free' },
      lastTriageSessionAt: daysAgo(7),
      now,
    })).toBe('coach')
  })

  it('does NOT return "coach" when triage session is older than 30d', () => {
    expect(computeLearnFocus({
      user: { tier: 'free' },
      lastTriageSessionAt: daysAgo(45),
      now,
    })).toBe('ai')
  })

  it('returns "analyzer" when free user logged a session in last 24h', () => {
    expect(computeLearnFocus({
      user: { tier: 'free' },
      lastTrainingLogAt: hoursAgo(6),
      now,
    })).toBe('analyzer')
  })

  it('does NOT return "analyzer" when training log is older than 24h', () => {
    expect(computeLearnFocus({
      user: { tier: 'free' },
      lastTrainingLogAt: hoursAgo(36),
      now,
    })).toBe('ai')
  })

  it('triage-in-30d wins over training-log-in-24h (priority 4 before 5)', () => {
    expect(computeLearnFocus({
      user: { tier: 'free' },
      lastTriageSessionAt: daysAgo(2),
      lastTrainingLogAt: hoursAgo(2),
      now,
    })).toBe('coach')
  })

  it('coaching-subscriber wins over recent training log', () => {
    expect(computeLearnFocus({
      user: { tier: 'coaching' },
      lastTrainingLogAt: hoursAgo(2),
      now,
    })).toBe('coach')
  })

  it('falls back to "ai" when nothing matches (signed-in, no recent activity)', () => {
    expect(computeLearnFocus({
      user: { tier: 'free' },
      now,
    })).toBe('ai')
  })

  it('falls back to "ai" for pro tier with no recent activity', () => {
    expect(computeLearnFocus({
      user: { tier: 'pro' },
      now,
    })).toBe('ai')
  })

  it('handles missing inputs gracefully (no nulls)', () => {
    expect(() => computeLearnFocus({ user: { tier: 'free' }, now })).not.toThrow()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd /Users/mathewbudnik/coretriage/frontend && npm test -- useLearnFocus
```

Expected: FAIL with "Cannot find module '../useLearnFocus'" (or similar — the hook file doesn't exist yet).

- [ ] **Step 3: Implement the hook + helper**

Write `/Users/mathewbudnik/coretriage/frontend/src/hooks/useLearnFocus.js`:

```javascript
import { useMemo } from 'react'

/**
 * Pure function: given user state + recent-activity timestamps, returns
 * which Learn option to focus on first paint. Priority order matches
 * spec §3 (docs/superpowers/specs/2026-05-25-learn-tab-redesign-design.md).
 *
 * Coach-role bypass is handled by the caller (LearnHub) — not this function.
 */
export function computeLearnFocus({
  user,
  lastTriageSessionAt = null,
  lastTrainingLogAt = null,
  coachThreadUnread = false,
  now = new Date(),
}) {
  // Priority 6: Anonymous
  if (!user) return 'analyzer'

  // Priority 2: Coaching subscriber with unread reply
  if (user.tier === 'coaching' && coachThreadUnread) return 'coach'

  // Priority 3: Coaching subscriber (no unread)
  if (user.tier === 'coaching') return 'coach'

  // Priority 4: triage session in last 30 days
  if (lastTriageSessionAt) {
    const ageMs = now.getTime() - new Date(lastTriageSessionAt).getTime()
    if (ageMs < 30 * 24 * 60 * 60 * 1000) return 'coach'
  }

  // Priority 5: training log in last 24h
  if (lastTrainingLogAt) {
    const ageMs = now.getTime() - new Date(lastTrainingLogAt).getTime()
    if (ageMs < 24 * 60 * 60 * 1000) return 'analyzer'
  }

  // Priority 7: fallback
  return 'ai'
}

/**
 * React hook wrapper for ergonomic consumption in LearnHub. Memoises the
 * computation so re-renders don't reshuffle the focused option mid-session.
 */
export function useLearnFocus(inputs) {
  return useMemo(() => computeLearnFocus(inputs), [
    inputs.user?.id,
    inputs.user?.tier,
    inputs.lastTriageSessionAt,
    inputs.lastTrainingLogAt,
    inputs.coachThreadUnread,
  ])
}
```

- [ ] **Step 4: Run the tests — they should pass**

```bash
cd /Users/mathewbudnik/coretriage/frontend && npm test -- useLearnFocus
```

Expected: PASS, 12 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useLearnFocus.js frontend/src/hooks/__tests__/useLearnFocus.test.js
git commit -m "feat(learn): add useLearnFocus hook + tests for default-focus rule"
```

---

## Task 2: SkeletonOverlayAnimation primitive

Shared by Analyzer reveal AND (later) the landing-hero MovementTabPane. Twelve joints + a few bones, joints pulse on staggered delays, whole figure sways gently. Respects `prefers-reduced-motion`.

**Files:**
- Create: `frontend/src/components/learn/SkeletonOverlayAnimation.jsx`

- [ ] **Step 1: Implement the component**

Write `/Users/mathewbudnik/coretriage/frontend/src/components/learn/SkeletonOverlayAnimation.jsx`:

```jsx
import { motion, useReducedMotion } from 'framer-motion'

/**
 * Animated SVG pose skeleton overlay. Decorative placeholder used by the
 * Learn page's Analyzer reveal AND the landing-hero Movement tab pane —
 * shared so they stay visually consistent.
 *
 * The shape is a stylised climbing pose (arms up, hips loaded). Joints
 * pulse on staggered delays; the whole figure sways on a 4s loop.
 *
 * Renders inside any positioned parent. Sizes to its container via 100% w/h.
 *
 * Respects prefers-reduced-motion: static frame, no animation.
 */
const JOINTS = [
  { top: 12, left: 50, delay: 0.0 },  // head
  { top: 28, left: 50, delay: 0.2 },  // neck
  { top: 30, left: 36, delay: 0.4 },  // L shoulder
  { top: 30, left: 64, delay: 0.4 },  // R shoulder
  { top: 18, left: 28, delay: 0.6 },  // L hand up
  { top: 22, left: 72, delay: 0.6 },  // R hand up
  { top: 56, left: 44, delay: 0.8 },  // L hip
  { top: 56, left: 56, delay: 0.8 },  // R hip
  { top: 76, left: 38, delay: 1.0 },  // L knee
  { top: 76, left: 62, delay: 1.0 },  // R knee
  { top: 92, left: 36, delay: 1.2 },  // L foot
  { top: 92, left: 64, delay: 1.2 },  // R foot
]

export default function SkeletonOverlayAnimation() {
  const reduce = useReducedMotion()
  const sway = reduce
    ? { rotate: 0, x: 0 }
    : { rotate: [0, 2, 0, -2, 0], x: [0, 6, 0, -6, 0] }

  return (
    <motion.div
      aria-hidden="true"
      className="relative w-full h-full"
      animate={sway}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {JOINTS.map((j, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            top: `${j.top}%`,
            left: `${j.left}%`,
            width: 9,
            height: 9,
            transform: 'translate(-50%, -50%)',
            background: '#f0a875', // ct-terra-soft
            boxShadow: '0 0 10px rgba(240,168,117,0.7)',
          }}
          animate={reduce ? {} : { scale: [1, 1.3, 1] }}
          transition={{
            duration: 3,
            delay: j.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
      {/* Central spine bone (head → neck → hip line) — single straight
          segment, no rotation math needed at this fidelity */}
      <div
        className="absolute"
        style={{
          top: '12%',
          left: '50%',
          width: 2,
          height: '44%',
          background: 'linear-gradient(180deg, #f0a875, #d97757)',
          transform: 'translateX(-50%)',
          opacity: 0.7,
        }}
      />
    </motion.div>
  )
}
```

- [ ] **Step 2: Smoke-render in isolation**

The component has no test file (per spec §12, only `useLearnFocus` requires unit tests). Manual smoke later in Task 11 via the Analyzer reveal. For now, verify the file parses:

```bash
cd /Users/mathewbudnik/coretriage/frontend && npx vite build --mode development 2>&1 | tail -20
```

Expected: build completes, no "unknown identifier" or syntax errors mentioning `SkeletonOverlayAnimation`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/learn/SkeletonOverlayAnimation.jsx
git commit -m "feat(learn): add shared SkeletonOverlayAnimation primitive"
```

---

## Task 3: LearnSwitcherTile primitive

One tile, three usages. Takes an icon node, title, subline, active flag, click handler. Active state lights the border + icon, adds a glow. Hover state (desktop) tints the border.

**Files:**
- Create: `frontend/src/components/learn/LearnSwitcherTile.jsx`

- [ ] **Step 1: Implement the component**

Write `/Users/mathewbudnik/coretriage/frontend/src/components/learn/LearnSwitcherTile.jsx`:

```jsx
/**
 * One switcher tile in the Learn page's three-tile row. Renders below the
 * hero panel. Active tile carries terracotta border + lit icon + soft glow.
 *
 * Used as a tab via role="tab" inside the parent's role="tablist".
 */
export default function LearnSwitcherTile({
  id,
  active,
  title,
  subline,
  icon,
  onClick,
  panelId,
  innerRef,        // callback ref → attached to the underlying <button>
                   // so parent can roving-focus it on arrow-key nav
}) {
  return (
    <button
      ref={innerRef}
      type="button"
      role="tab"
      id={`learn-tab-${id}`}
      aria-selected={active}
      aria-controls={panelId}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      className={[
        'flex items-center gap-3.5 px-4 py-4 rounded-[10px] text-left',
        'border transition-all duration-200',
        active
          ? 'border-ct-terracotta'
          : 'border-ct-hairline hover:border-ct-terracotta/40',
      ].join(' ')}
      style={{
        backgroundImage: active
          ? 'linear-gradient(180deg, rgba(217,119,87,0.10) 0%, rgba(217,119,87,0.04) 100%)'
          : 'linear-gradient(180deg, #243530 0%, #1f2924 100%)',
      }}
    >
      <span
        className={[
          'flex items-center justify-center flex-shrink-0',
          'w-9 h-9 rounded-lg border font-extrabold text-sm',
          active
            ? 'border-ct-terracotta text-ct-cream'
            : 'border-ct-terracotta/30 text-ct-terra-soft',
        ].join(' ')}
        style={{
          background: active ? 'rgba(217,119,87,0.18)' : 'rgba(217,119,87,0.06)',
          boxShadow: active ? '0 0 12px rgba(217,119,87,0.35)' : 'none',
        }}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-bold text-ct-cream mb-0.5">
          {title}
        </span>
        <span className="block text-[11px] text-ct-moss tracking-[0.02em]">
          {subline}
        </span>
      </span>
    </button>
  )
}
```

- [ ] **Step 2: Verify the file parses**

```bash
cd /Users/mathewbudnik/coretriage/frontend && npx vite build --mode development 2>&1 | tail -5
```

Expected: no errors mentioning `LearnSwitcherTile`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/learn/LearnSwitcherTile.jsx
git commit -m "feat(learn): add LearnSwitcherTile primitive"
```

---

## Task 4: LearnRevealCoach

Two variants: default (non-subscriber) with photo placeholder + setter-voice copy, and subscriber (with `recentMessage` prop) with recent-message teaser.

**Files:**
- Create: `frontend/src/components/learn/LearnRevealCoach.jsx`

- [ ] **Step 1: Implement the component**

Write `/Users/mathewbudnik/coretriage/frontend/src/components/learn/LearnRevealCoach.jsx`:

```jsx
import { motion, useReducedMotion } from 'framer-motion'

/**
 * Coach reveal — fills the hero panel when Coach is the focused option.
 *
 * Two display modes:
 *  - default (non-subscriber): photo-slot placeholder + setter copy + tier-aware CTA
 *  - subscriber (recentMessage passed): recent-message teaser + "Open thread →"
 *
 * The portrait slot will swap to a real <img> or <video> once
 * frontend/public/learn/budnik-portrait.* lands.
 */
export default function LearnRevealCoach({ user, recentMessage, onCta }) {
  const reduce = useReducedMotion()
  const isSubscriber = user?.tier === 'coaching'
  const isAnon = !user

  let headline, body, meta, ctaLabel
  if (isSubscriber && recentMessage) {
    headline = `Budnik replied ${relativeTime(recentMessage.created_at)}.`
    body = truncate(recentMessage.content, 80)
    meta = null
    ctaLabel = 'Open thread →'
  } else if (isSubscriber) {
    headline = 'Send the first message.'
    body = "What are you working on? Send a clip if you've got one."
    meta = null
    ctaLabel = 'Open thread →'
  } else {
    headline = 'Send me a beta video.'
    body = 'Beta breakdown. Return-to-climb calls. Plans shaped around your weaknesses.'
    meta = 'Replies in 24–48h.'
    ctaLabel = isAnon ? 'Sign in to apply' : 'Apply — $89/mo →'
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_420px] gap-8 items-center min-h-[340px]">
      <div>
        <div className="ct-eyebrow mb-3">Get a read · from a human</div>
        <h1 className="text-[30px] font-bold text-ct-cream leading-[1.15] tracking-[-0.02em] mb-3">
          {headline}
        </h1>
        <p className="text-[14px] text-ct-cream-soft leading-[1.55] max-w-[460px] mb-4">
          {body}
        </p>
        {meta && (
          <div className="text-[11px] text-ct-moss tracking-[0.04em] mb-5">
            {meta}
          </div>
        )}
        <button type="button" onClick={onCta} className="btn-primary">
          {ctaLabel}
        </button>
      </div>

      <div className="relative rounded-[10px] border border-ct-hairline overflow-hidden aspect-[4/3]"
           style={{ background: 'rgba(0,0,0,0.20)' }}>
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3.5"
          style={{
            background:
              'radial-gradient(ellipse at center top, rgba(217,119,87,0.10) 0%, transparent 60%),' +
              'linear-gradient(180deg, rgba(217,119,87,0.04) 0%, rgba(0,0,0,0.30) 100%)',
          }}
        >
          <motion.div
            className="flex flex-col items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-dashed border-ct-terracotta/40 text-ct-moss"
            style={{ width: '64%', aspectRatio: '3/4', background: 'rgba(0,0,0,0.15)' }}
            animate={reduce ? {} : { opacity: [0.9, 1, 0.9] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="w-11 h-11 border-[1.5px] border-ct-terra-soft/50 rounded-lg flex items-center justify-center text-ct-terra-soft">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
            <div className="text-[10px] tracking-[0.16em] uppercase">Photo · pending upload</div>
            <div className="text-[11px] text-ct-cream-soft tracking-[0.02em]">Budnik · climbing portrait</div>
          </motion.div>
        </div>
        <div className="absolute bottom-3.5 left-3.5 text-[10px] tracking-[0.18em] uppercase text-ct-moss">
          V13 outdoor · Momentum Houston
        </div>
      </div>
    </div>
  )
}

function relativeTime(iso) {
  const ms = Date.now() - new Date(iso).getTime()
  const hours = ms / 1000 / 60 / 60
  if (hours < 24) return 'today'
  if (hours < 48) return 'yesterday'
  const days = Math.floor(hours / 24)
  return `${days} days ago`
}

function truncate(s, n) {
  if (!s) return ''
  return s.length <= n ? s : s.slice(0, n).trimEnd() + '…'
}
```

- [ ] **Step 2: Verify the file parses**

```bash
cd /Users/mathewbudnik/coretriage/frontend && npx vite build --mode development 2>&1 | tail -5
```

Expected: no errors mentioning `LearnRevealCoach`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/learn/LearnRevealCoach.jsx
git commit -m "feat(learn): add LearnRevealCoach with default + subscriber variants"
```

---

## Task 5: LearnRevealAI (animated conversation)

The most complex reveal. A 14-second loop: user message fades in → typing dots → AI reply streams word-by-word → source citations appear → hold → reset. Each word is a DOM `<span>` with a real text-node space between spans (NOT inside the span — `display: inline-block` collapses trailing whitespace; the v2 mockup hit this bug). Respects `prefers-reduced-motion` by showing the final state on mount.

**Files:**
- Create: `frontend/src/components/learn/LearnRevealAI.jsx`

- [ ] **Step 1: Implement the component**

Write `/Users/mathewbudnik/coretriage/frontend/src/components/learn/LearnRevealAI.jsx`:

```jsx
import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

const USER_MSG = 'Should I rest an A2 pulley strain?'
const AI_REPLY = 'Probably not full rest. Light hangs at 50% body weight, 10s on / 5s off, every other day. Pain stays under 3/10. Tape the finger H-style during climbs. If you hear a pop or it swells fast, see a hand specialist.'
const SOURCES = '▸ finger_pulley.md  ▸ general_load_management.md'

const TIMING = {
  userIn:        400,    // ms after start
  typingIn:      1400,
  replyStart:    3000,
  wordStepMs:    70,
  loopMs:        14000,
}

/**
 * AI reveal — a looped demo conversation that streams a hand-authored
 * answer to "Should I rest an A2 pulley strain?". Demonstrates the AI's
 * voice and the source-citation contract.
 *
 * Words are individual <span> elements with real text-node spaces BETWEEN
 * them (NOT inside, which collapses with inline-block opacity tricks).
 *
 * Under prefers-reduced-motion: skips animation, shows the final state.
 */
export default function LearnRevealAI({ onCta }) {
  const reduce = useReducedMotion()

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_420px] gap-8 items-center min-h-[340px]">
      <div>
        <div className="ct-eyebrow mb-3">Get a read · climbing-trained</div>
        <h1 className="text-[30px] font-bold text-ct-cream leading-[1.15] tracking-[-0.02em] mb-3">
          Ask anything climbing.
        </h1>
        <p className="text-[14px] text-ct-cream-soft leading-[1.55] max-w-[460px] mb-4">
          Climbing-specific knowledge base. Technique, training, injury triage, recovery — answered with sources.
        </p>
        <div className="text-[11px] text-ct-moss tracking-[0.04em] mb-5">
          5 free answers · then unlimited on trial.
        </div>
        <button type="button" onClick={onCta} className="btn-primary">
          Start chatting →
        </button>
      </div>

      <ConversationCanvas reduce={reduce} />
    </div>
  )
}

function ConversationCanvas({ reduce }) {
  // tick increments on each loop iteration; child effects re-key off it
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (reduce) return
    const id = setInterval(() => setTick((t) => t + 1), TIMING.loopMs)
    return () => clearInterval(id)
  }, [reduce])

  return (
    <div
      className="relative rounded-[10px] border border-ct-hairline overflow-hidden aspect-[4/3]"
      style={{ background: 'rgba(0,0,0,0.20)' }}
    >
      <div className="absolute inset-0 p-[22px] pb-[18px] flex flex-col justify-end gap-3 overflow-hidden">
        <ConversationFrame key={tick} reduce={reduce} />
      </div>
    </div>
  )
}

function ConversationFrame({ reduce }) {
  const [showUser, setShowUser] = useState(reduce)
  const [showTyping, setShowTyping] = useState(false)
  const [showReply, setShowReply] = useState(reduce)
  const [shownWords, setShownWords] = useState(reduce ? AI_REPLY.split(' ').length : 0)
  const [showSources, setShowSources] = useState(reduce)
  const timeouts = useRef([])

  useEffect(() => {
    if (reduce) return
    const T = (fn, ms) => timeouts.current.push(setTimeout(fn, ms))

    T(() => setShowUser(true), TIMING.userIn)
    T(() => setShowTyping(true), TIMING.typingIn)
    T(() => {
      setShowTyping(false)
      setShowReply(true)
    }, TIMING.replyStart)

    const words = AI_REPLY.split(' ')
    words.forEach((_, i) => {
      T(() => setShownWords(i + 1), TIMING.replyStart + i * TIMING.wordStepMs)
    })
    T(
      () => setShowSources(true),
      TIMING.replyStart + words.length * TIMING.wordStepMs + 400,
    )

    return () => {
      timeouts.current.forEach(clearTimeout)
      timeouts.current = []
    }
  }, [reduce])

  const words = AI_REPLY.split(' ')

  return (
    <>
      <div
        className={[
          'self-end max-w-[92%] py-3 px-4 rounded-[14px] rounded-br-[4px]',
          'border border-ct-terracotta/40 text-ct-cream text-[14px] leading-[1.55]',
          'transition-all duration-[400ms] ease-out',
          showUser ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[6px]',
        ].join(' ')}
        style={{ background: 'linear-gradient(180deg, rgba(217,119,87,0.30), rgba(217,119,87,0.18))' }}
      >
        {USER_MSG}
      </div>

      {showTyping && (
        <div
          className="self-start py-3 px-4 rounded-[14px] rounded-bl-[4px] border border-ct-hairline inline-flex items-center gap-1.5"
          style={{ background: '#243530' }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-ct-terra-soft inline-block"
              style={{
                animation: `learnTypingDot 1.4s infinite ease-in-out`,
                animationDelay: `${i * 0.18}s`,
              }}
            />
          ))}
        </div>
      )}

      {showReply && (
        <div
          className="self-start max-w-[92%] py-3 px-4 rounded-[14px] rounded-bl-[4px] border border-ct-hairline text-ct-cream text-[14px] leading-[1.55] min-h-[22px]"
          style={{ background: '#243530' }}
          aria-live="polite"
        >
          {words.map((w, i) => (
            <span key={i}>
              <span
                style={{
                  opacity: i < shownWords ? 1 : 0,
                  transition: 'opacity 180ms ease',
                }}
              >
                {w}
              </span>
              {/* real text node space — must be outside the span to avoid
                  collapse with inline-block edge whitespace */}
              {' '}
            </span>
          ))}
        </div>
      )}

      <div
        className={[
          'self-start mt-0.5 text-[10px] text-ct-moss tracking-[0.05em]',
          'transition-opacity duration-[400ms]',
          showSources ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      >
        {SOURCES}
      </div>

      <style>{`
        @keyframes learnTypingDot {
          0%, 60%, 100% { opacity: 0.30; transform: translateY(0); }
          30%           { opacity: 1.00; transform: translateY(-3px); }
        }
      `}</style>
    </>
  )
}
```

- [ ] **Step 2: Verify the file parses**

```bash
cd /Users/mathewbudnik/coretriage/frontend && npx vite build --mode development 2>&1 | tail -5
```

Expected: no errors mentioning `LearnRevealAI`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/learn/LearnRevealAI.jsx
git commit -m "feat(learn): add LearnRevealAI with looped demo conversation"
```

---

## Task 6: LearnRevealAnalyzer

Video-player frame chrome + the shared `SkeletonOverlayAnimation` as placeholder content. When a real demo video exists at `frontend/public/learn/movement-demo.mp4`, swap the skeleton for an autoplay `<video>` element.

**Files:**
- Create: `frontend/src/components/learn/LearnRevealAnalyzer.jsx`

- [ ] **Step 1: Implement the component**

Write `/Users/mathewbudnik/coretriage/frontend/src/components/learn/LearnRevealAnalyzer.jsx`:

```jsx
import { useReducedMotion } from 'framer-motion'
import SkeletonOverlayAnimation from './SkeletonOverlayAnimation'

/**
 * Analyzer reveal — video-player frame chrome containing either:
 *  - a real demo MP4 loop (when frontend/public/learn/movement-demo.mp4 ships)
 *  - the SkeletonOverlayAnimation placeholder (the default until then)
 *
 * To swap in the real video: pass videoSrc="/learn/movement-demo.mp4"
 * from the consumer (LearnHub). For now the prop is unused; placeholder
 * always renders.
 */
export default function LearnRevealAnalyzer({ videoSrc = null, onCta, ctaLabel }) {
  const reduce = useReducedMotion()

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_420px] gap-8 items-center min-h-[340px]">
      <div>
        <div className="ct-eyebrow mb-3">Get a read · from your video</div>
        <h1 className="text-[30px] font-bold text-ct-cream leading-[1.15] tracking-[-0.02em] mb-3">
          Upload a clip. See your shape.
        </h1>
        <p className="text-[14px] text-ct-cream-soft leading-[1.55] max-w-[460px] mb-4">
          Frame-by-frame pose overlay on your climbing video. Runs on your device — no upload to a server.
        </p>
        <div className="text-[11px] text-ct-moss tracking-[0.04em] mb-5">
          BETA · &lt;30s clips work best.
        </div>
        <button type="button" onClick={onCta} className="btn-primary">
          {ctaLabel}
        </button>
      </div>

      <div className="relative rounded-[10px] border border-ct-hairline overflow-hidden aspect-[4/3]"
           style={{ background: '#000' }}>
        {/* Backdrop tint */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 30% 40%, rgba(217,119,87,0.10) 0%, transparent 60%),' +
              'linear-gradient(135deg, #0d1714 0%, #1a2522 100%)',
          }}
        />

        {videoSrc ? (
          <video
            src={videoSrc}
            autoPlay={!reduce}
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            aria-hidden="true"
          />
        ) : (
          <>
            {/* "Video · pending upload" tag */}
            <div className="absolute top-3 right-3 text-[9px] tracking-[0.18em] uppercase text-ct-moss bg-black/50 px-2 py-1 rounded border border-dashed border-ct-terracotta/40">
              Video · pending upload
            </div>
            {/* Skeleton placeholder — centred, 60% width / 80% height */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div style={{ width: '60%', height: '80%' }}>
                <SkeletonOverlayAnimation />
              </div>
            </div>
          </>
        )}

        {/* Bottom bar — gradient + caption + timecode */}
        <div
          className="absolute bottom-0 left-0 right-0 px-3.5 py-2.5 flex items-center justify-between text-[10px] text-ct-cream-soft tracking-[0.05em]"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.70), transparent)' }}
        >
          <span>Pose · 33 joints · on-device</span>
          <span className="text-ct-cream" style={{ fontVariantNumeric: 'tabular-nums' }}>0:08 / 0:24</span>
        </div>

        {/* Progress sweep */}
        {!reduce && (
          <div
            className="absolute bottom-0 left-0 h-0.5 bg-ct-terracotta"
            style={{
              animation: 'learnVideoProgress 6s ease-in-out infinite',
            }}
          />
        )}
        <style>{`
          @keyframes learnVideoProgress {
            0%, 100% { width: 12%; }
            50%      { width: 88%; }
          }
        `}</style>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify the file parses**

```bash
cd /Users/mathewbudnik/coretriage/frontend && npx vite build --mode development 2>&1 | tail -5
```

Expected: no errors mentioning `LearnRevealAnalyzer`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/learn/LearnRevealAnalyzer.jsx
git commit -m "feat(learn): add LearnRevealAnalyzer with video-frame chrome + skeleton placeholder"
```

---

## Task 7: LearnHub orchestrator

Wires everything: focus rule, switcher row, hero panel with cross-fade between reveals, CTA handlers (which mirror the existing handlers in [ChatTab.jsx:54-79](../../frontend/src/components/ChatTab.jsx#L54)), keyboard arrow navigation across tiles.

**Files:**
- Create: `frontend/src/components/learn/LearnHub.jsx`

- [ ] **Step 1: Implement the orchestrator**

Write `/Users/mathewbudnik/coretriage/frontend/src/components/learn/LearnHub.jsx`:

```jsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Sparkles, Activity } from 'lucide-react'
import { computeLearnFocus } from '../../hooks/useLearnFocus'
import LearnSwitcherTile from './LearnSwitcherTile'
import LearnRevealCoach from './LearnRevealCoach'
import LearnRevealAI from './LearnRevealAI'
import LearnRevealAnalyzer from './LearnRevealAnalyzer'
import { listSessions, listTrainingLogs, getCoachThread } from '../../api'

const VIEW_KEY = 'coretriage_chat_view'
const TILES = ['coach', 'ai', 'analyzer']
const PANEL_ID = 'learn-hero-panel'

/**
 * Learn page orchestrator. Replaces ChatPicker.jsx. See:
 *   docs/superpowers/specs/2026-05-25-learn-tab-redesign-design.md
 *
 * Responsibilities:
 *   - Run the focus rule (useLearnFocus) on mount, persist tile clicks
 *   - Render the cross-faded hero reveal for the active option
 *   - Render the three switcher tiles with arrow-key navigation
 *   - Wire CTA clicks to the parent's existing handlers (auth/upgrade/view)
 */
export default function LearnHub({
  user,
  onSelectCoach,    // existing ChatTab handler — opens auth/upgrade or enters Coach view
  onSelectAI,       // existing — enters AI view
  onSelectAnalyzer, // existing — opens auth/upgrade or enters Analyzer view
}) {
  // Resolve initial focus: persisted choice wins, else rule.
  const [focused, setFocused] = useState(() => initialFocus(user))
  const [recentMessage, setRecentMessage] = useState(null)
  const [coachUnread, setCoachUnread] = useState(false)
  const tilesRef = useRef([])

  // After mount, fetch the data the focus rule needs (recent triage,
  // recent training log, coach thread). If the data resolves to a
  // different focus AND the user hasn't explicitly picked one yet,
  // smooth-transition to the rule's pick.
  useEffect(() => {
    if (!user) return
    const persisted = readPersistedView()
    if (persisted === 'coach' || persisted === 'ai' || persisted === 'analyzer') {
      // User already expressed a preference — don't re-resolve.
      // But if coaching subscriber, still fetch the recent message for the reveal.
      if (user.tier === 'coaching') hydrateCoachThread(user, setRecentMessage, setCoachUnread)
      return
    }
    let cancelled = false
    Promise.all([
      listSessions({ limit: 1 }).catch(() => []),
      listTrainingLogs({ limit: 1 }).catch(() => []),
      user.tier === 'coaching'
        ? getCoachThread().catch(() => null)
        : Promise.resolve(null),
    ]).then(([sessions, logs, thread]) => {
      if (cancelled) return
      const lastTriageSessionAt = sessions[0]?.created_at ?? null
      const lastTrainingLogAt = logs[0]?.date ?? null
      const unread = !!thread?.unread
      const lastMsg = thread?.messages?.findLast?.((m) => m.sender_type === 'coach') ?? null
      if (lastMsg) setRecentMessage(lastMsg)
      setCoachUnread(unread)
      const ruled = computeLearnFocus({
        user,
        lastTriageSessionAt,
        lastTrainingLogAt,
        coachThreadUnread: unread,
      })
      if (ruled !== focused) setFocused(ruled)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.tier])

  const handleTileClick = useCallback((next) => {
    setFocused(next)
    try { localStorage.setItem(VIEW_KEY, next) } catch {}
  }, [])

  const handleHeroCta = useCallback(() => {
    if (focused === 'coach') onSelectCoach?.()
    else if (focused === 'ai') onSelectAI?.()
    else if (focused === 'analyzer') onSelectAnalyzer?.()
  }, [focused, onSelectCoach, onSelectAI, onSelectAnalyzer])

  // Keyboard: arrow-left/right cycles tile focus, Enter activates
  const handleKeyDown = useCallback((e) => {
    const idx = TILES.indexOf(focused)
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      const next = TILES[(idx + 1) % TILES.length]
      setFocused(next)
      tilesRef.current[(idx + 1) % TILES.length]?.focus()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      const next = TILES[(idx - 1 + TILES.length) % TILES.length]
      setFocused(next)
      tilesRef.current[(idx - 1 + TILES.length) % TILES.length]?.focus()
    }
  }, [focused])

  // Tier-aware CTA label for Analyzer (anon/expired/everyone-else)
  const analyzerCtaLabel = (() => {
    if (!user) return 'Sign in to analyze'
    if (user.subscription_state?.state === 'expired') return 'Upgrade to analyze'
    return 'Get started →'
  })()

  return (
    <div className="h-full flex flex-col px-4 md:px-6 py-6 max-w-5xl mx-auto w-full">
      <header className="flex items-baseline gap-3 mb-4">
        <h1 className="text-[20px] font-bold text-ct-cream tracking-[-0.015em]">Learn</h1>
        <p className="text-[12px] text-ct-moss">Three ways to get a read on your climbing.</p>
      </header>

      <motion.section
        id={PANEL_ID}
        role="tabpanel"
        aria-labelledby={`learn-tab-${focused}`}
        className="ct-surface-hero p-9 mb-4 relative overflow-hidden"
        style={{ minHeight: 420 }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0, 0, 0.2, 1] }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={focused}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32, ease: [0, 0, 0.2, 1] }}
          >
            {focused === 'coach' && (
              <LearnRevealCoach
                user={user}
                recentMessage={recentMessage}
                onCta={handleHeroCta}
              />
            )}
            {focused === 'ai' && (
              <LearnRevealAI onCta={handleHeroCta} />
            )}
            {focused === 'analyzer' && (
              <LearnRevealAnalyzer
                onCta={handleHeroCta}
                ctaLabel={analyzerCtaLabel}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.section>

      <div
        role="tablist"
        aria-label="Choose a learning surface"
        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        onKeyDown={handleKeyDown}
      >
        <LearnSwitcherTile
          innerRef={(el) => (tilesRef.current[0] = el)}
          id="coach"
          panelId={PANEL_ID}
          active={focused === 'coach'}
          title="Budnik"
          subline="Real coach. Your video."
          icon={<span>B</span>}
          onClick={() => handleTileClick('coach')}
        />
        <LearnSwitcherTile
          innerRef={(el) => (tilesRef.current[1] = el)}
          id="ai"
          panelId={PANEL_ID}
          active={focused === 'ai'}
          title="Ask the AI"
          subline="Climbing-trained. 5 free."
          icon={<Sparkles size={18} aria-hidden="true" />}
          onClick={() => handleTileClick('ai')}
        />
        <LearnSwitcherTile
          innerRef={(el) => (tilesRef.current[2] = el)}
          id="analyzer"
          panelId={PANEL_ID}
          active={focused === 'analyzer'}
          title="Movement"
          subline="Your beta, frame by frame."
          icon={<Activity size={18} aria-hidden="true" />}
          onClick={() => handleTileClick('analyzer')}
        />
      </div>

      <p className="text-center mt-7 text-[11px] text-ct-moss opacity-70">
        Educational only — not a medical diagnosis. If symptoms are severe or worsening, seek professional evaluation.
      </p>
    </div>
  )
}

function initialFocus(user) {
  const persisted = readPersistedView()
  if (persisted === 'coach' || persisted === 'ai' || persisted === 'analyzer') {
    return persisted
  }
  // No persisted choice — run the rule against what we have synchronously.
  // The async hydration in useEffect may refine this.
  return computeLearnFocus({ user })
}

function readPersistedView() {
  if (typeof window === 'undefined') return null
  try { return localStorage.getItem(VIEW_KEY) } catch { return null }
}

function hydrateCoachThread(user, setRecentMessage, setCoachUnread) {
  getCoachThread()
    .then((thread) => {
      if (!thread) return
      setCoachUnread(!!thread.unread)
      const lastMsg = thread.messages?.findLast?.((m) => m.sender_type === 'coach')
      if (lastMsg) setRecentMessage(lastMsg)
    })
    .catch(() => {})
}
```

- [ ] **Step 2: Verify the imports resolve**

```bash
cd /Users/mathewbudnik/coretriage/frontend && grep -n -E '(listSessions|listTrainingLogs|getCoachThread)' src/api.js | head -10
```

Expected: all three function names exist in `src/api.js`.

If `listSessions`, `listTrainingLogs`, or `getCoachThread` doesn't exist with those exact names, find the equivalent (open `src/api.js` and search) and adjust the import + call sites in `LearnHub.jsx` accordingly. If a needed function genuinely doesn't exist, add it to `src/api.js` following the existing pattern in that file (one-line wrapper around `request()`).

- [ ] **Step 3: Verify the build**

```bash
cd /Users/mathewbudnik/coretriage/frontend && npx vite build --mode development 2>&1 | tail -10
```

Expected: build completes, no import errors. (Component isn't rendered yet — that happens in Task 8.)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/learn/LearnHub.jsx
git commit -m "feat(learn): add LearnHub orchestrator (focus rule + switcher + reveals)"
```

---

## Task 8: Wire LearnHub into ChatTab.jsx

Replace the `ChatPicker` reference with `LearnHub`. Treat legacy `'picker'` localStorage value as "no persisted choice" so existing users land on the rule-picked option instead of an obsolete view value. The existing CTA handlers (`handleSelectCoach`, `handleSelectAI`, `handleSelectAnalyzer`) are passed through unchanged.

**Files:**
- Modify: `frontend/src/components/ChatTab.jsx`

- [ ] **Step 1: Read the current file**

```bash
cat /Users/mathewbudnik/coretriage/frontend/src/components/ChatTab.jsx
```

This confirms the existing handler signatures and the `initialView` function structure. The next step assumes the file is as documented in [spec §6.2](../specs/2026-05-25-learn-tab-redesign-design.md).

- [ ] **Step 2: Update the import**

In `/Users/mathewbudnik/coretriage/frontend/src/components/ChatTab.jsx`, replace:

```jsx
import ChatPicker from './ChatPicker'
```

with:

```jsx
import LearnHub from './learn/LearnHub'
```

- [ ] **Step 3: Update the picker render call**

Find the `{view === 'picker' && ( <ChatPicker ... /> )}` block (around lines 83–90 of the current file) and replace it with:

```jsx
{view === 'picker' && (
  <LearnHub
    user={user}
    onSelectCoach={handleSelectCoach}
    onSelectAI={handleSelectAI}
    onSelectAnalyzer={handleSelectAnalyzer}
  />
)}
```

The view key stays `'picker'` so the existing router and persistence keep working — this is the cleanest no-migration path.

- [ ] **Step 4: Update `initialView` to handle the legacy "picker" string**

The existing `initialView` function (around line 120 of the current file) reads:

```js
function initialView({ isCoach, isCoachingSub }) {
  if (isCoach) return 'inbox'
  if (isCoachingSub) return 'coach'
  if (typeof window === 'undefined') return 'picker'
  const saved = localStorage.getItem(VIEW_KEY)
  if (saved === 'coach' || saved === 'ai' || saved === 'inbox' || saved === 'analyzer') return saved
  return 'picker'
}
```

No change needed — the current logic already returns `'picker'` whenever the saved value is missing OR equals an unrecognized string. Confirm by reading the function.

- [ ] **Step 5: Verify the file builds**

```bash
cd /Users/mathewbudnik/coretriage/frontend && npx vite build --mode development 2>&1 | tail -10
```

Expected: clean build.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/ChatTab.jsx
git commit -m "feat(learn): swap ChatPicker for LearnHub in ChatTab router"
```

---

## Task 9: Update sidebar nav in App.jsx

Relabel `Chat → Learn`, swap icon `MessageSquare → BookOpen`. URL stays `/chat`.

**Files:**
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Find the existing Chat nav entry**

```bash
grep -n -E '(MessageSquare|Chat)' /Users/mathewbudnik/coretriage/frontend/src/App.jsx | head -20
```

Expected: at least one match for `MessageSquare` (icon import + use) and one for a sidebar nav label `Chat`.

- [ ] **Step 2: Update the icon import**

In `/Users/mathewbudnik/coretriage/frontend/src/App.jsx`, find the `lucide-react` import line. If `MessageSquare` is imported there for the chat nav entry AND not used elsewhere, replace it with `BookOpen`:

```jsx
// before
import { ..., MessageSquare, ... } from 'lucide-react'

// after
import { ..., BookOpen, ... } from 'lucide-react'
```

If `MessageSquare` is used elsewhere in the file (e.g., inside another component), keep both imports:

```jsx
import { ..., MessageSquare, BookOpen, ... } from 'lucide-react'
```

Verify which case applies:

```bash
grep -nc MessageSquare /Users/mathewbudnik/coretriage/frontend/src/App.jsx
```

If the count is `1` (single import), do the replace. If `> 1`, add `BookOpen` alongside.

- [ ] **Step 3: Update the nav entry**

Find the JSX block that renders the Chat sidebar nav item. It likely looks like:

```jsx
<NavItem icon={<MessageSquare size={16} />} label="Chat" to="/chat" />
```

Replace `MessageSquare` with `BookOpen` and `"Chat"` with `"Learn"`:

```jsx
<NavItem icon={<BookOpen size={16} />} label="Learn" to="/chat" />
```

The URL `to="/chat"` stays — see spec §1 for why.

- [ ] **Step 4: Verify the build**

```bash
cd /Users/mathewbudnik/coretriage/frontend && npx vite build --mode development 2>&1 | tail -10
```

Expected: clean build.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat(learn): rename sidebar Chat → Learn, swap icon MessageSquare → BookOpen"
```

---

## Task 10: Delete the obsolete ChatPicker.jsx

After Task 8 wires `LearnHub` in, `ChatPicker.jsx` has no consumers. Delete it.

**Files:**
- Delete: `frontend/src/components/ChatPicker.jsx`

- [ ] **Step 1: Confirm zero consumers**

```bash
grep -rn 'ChatPicker' /Users/mathewbudnik/coretriage/frontend/src/ 2>/dev/null
```

Expected: zero matches. If anything still imports `ChatPicker`, fix it before deleting.

- [ ] **Step 2: Delete the file**

```bash
rm /Users/mathewbudnik/coretriage/frontend/src/components/ChatPicker.jsx
```

- [ ] **Step 3: Verify the build still passes**

```bash
cd /Users/mathewbudnik/coretriage/frontend && npx vite build --mode development 2>&1 | tail -10
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add -A frontend/src/components/ChatPicker.jsx
git commit -m "chore(learn): remove obsolete ChatPicker.jsx (replaced by LearnHub)"
```

---

## Task 11: Manual verification against acceptance criteria

The spec §12 lists 15 acceptance criteria. Walk them with the dev server running.

**Files:** (none)

- [ ] **Step 1: Start the dev server**

```bash
cd /Users/mathewbudnik/coretriage/frontend && npm run dev
```

Expected: Vite serves at http://localhost:5173. Open it in a browser.

- [ ] **Step 2: Walk the acceptance criteria**

Sign in (or stay anonymous) and verify each item below. Mark each as pass / fail.

1. **Sidebar label reads `Learn`, icon is `BookOpen`, route `/chat` still resolves.**
   - Visit http://localhost:5173/ ; click the new "Learn" nav item ; URL becomes `/chat` ; Learn page renders.
2. **First paint, signed-in user: exactly one option's reveal is in focus, picked by the focus rule.**
   - Sign in as a user with no recent triage, no recent training log → should focus AI.
   - If you have a recent training log (last 24h) → should focus Analyzer.
   - If you have a triage row in the last 30d → should focus Coach.
3. **First paint, anonymous user: Analyzer reveal in focus.**
   - Log out, refresh /chat → Analyzer should be the visible hero.
4. **Coach role bypasses LearnHub entirely → CoachInboxView.**
   - Sign in as Mathew (COACH_EMAIL account) → Learn page should NOT render the picker; CoachInboxView loads directly.
5. **Coaching subscriber: Coach reveal shows recent-message teaser if a message exists; default copy if not.**
   - Sign in as a coaching-tier user who has at least one Mathew reply → Coach reveal headline should read "Budnik replied [relative time]." and body should be the truncated message.
   - Sign in as a coaching-tier user with no messages yet → Coach reveal should show "Send the first message."
6. **Tile click: hero cross-fades to that option's reveal; tile border lights terracotta; localStorage key updated.**
   - Click each switcher tile; the hero animates between reveals.
   - In DevTools console: `localStorage.getItem('coretriage_chat_view')` should match the last-clicked tile.
7. **Hero CTA click: transitions to the appropriate sub-view (or opens AuthModal / UpgradeModal per matrix).**
   - Anon user, click "Sign in to apply" / "Sign in to analyze" → AuthModal opens.
   - Free user, click "Apply — $89/mo →" → UpgradeModal opens with `trigger="coaching"`.
   - Any user, click "Start chatting →" → AIChatView loads.
   - Trial-expired user, click "Upgrade to analyze" → UpgradeModal opens with `trigger="analyzer"`.
8. **Deep-link compat from landing-hero welcome panel.**
   - In DevTools: `localStorage.setItem('coretriage_chat_view', 'analyzer')` then navigate to /chat → Analyzer reveal is focused.
9. **Legacy compat: `'picker'` value treated as "no persisted choice".**
   - In DevTools: `localStorage.setItem('coretriage_chat_view', 'picker')` then navigate to /chat → focus rule runs (you should NOT see an empty/broken view).
10. **Keyboard: Arrow-Left/Right cycles switcher focus, Enter activates tile, Tab moves to hero CTA.**
    - Tab into the switcher row, press ArrowRight three times — focus wraps; press Enter to activate.
11. **Reduced motion: zero transitions, conversation/skeleton animations frozen.**
    - macOS: System Settings → Accessibility → Display → "Reduce motion" ON.
    - Refresh /chat → reveals should appear instantly, AI conversation shows final state (user msg + reply + sources all visible), skeleton frozen, no progress sweep.
12. **Mobile: switcher row becomes horizontal snap-scroll; tap-to-focus works.**
    - DevTools responsive mode at 375px width → switcher row should be a horizontal scroll strip with snap behavior.
13. **Shared SVG: `SkeletonOverlayAnimation` renders identically in `LearnRevealAnalyzer` and (future) landing-hero `MovementTabPane`.**
    - Currently only the Analyzer reveal consumes it — verify it renders cleanly there. Landing-hero consumer is a follow-up.
14. **No backend changes.**
    - `git diff main..HEAD -- main.py 'src/' database.py kb/` should produce empty output.
15. **`useLearnFocus` unit tests pass.**
    - `cd frontend && npm test -- useLearnFocus` → all tests green.

- [ ] **Step 3: Take a screenshot of the new Learn page in each focused state**

Take three screenshots (Coach focused / AI focused / Analyzer focused). Save them at:

- `/tmp/learn-coach.png`
- `/tmp/learn-ai.png`
- `/tmp/learn-analyzer.png`

These are for visual record; not committed.

- [ ] **Step 4: Stop the dev server**

Ctrl-C the running `npm run dev`.

- [ ] **Step 5: No commit** — verification only.

---

## Future work (NOT in this plan)

These were considered and deferred. None of them block shipping the redesign.

1. **Backend optimisation:** add `last_training_log_at` to `/api/auth/me` per spec §3.1 preferred path. Saves one roundtrip on LearnHub mount. Implement in a separate plan once the redesign is live.
2. **Landing-hero `MovementTabPane` adoption of `SkeletonOverlayAnimation`:** the shared SVG is built in this plan but only consumed by the Analyzer reveal. The landing-hero spec ([2026-05-25-landing-hero-redesign-design.md](../specs/2026-05-25-landing-hero-redesign-design.md)) will pick it up when that page is implemented.
3. **Real assets:** `frontend/public/learn/budnik-portrait.{jpg,webm}` and `frontend/public/learn/movement-demo.mp4`. Drop them in; the components already check `videoSrc` / fall back to placeholders.
4. **`/learn` URL alias:** add a route alias so `/learn` redirects to `/chat`. Optional UX polish.
5. **Telemetry:** log which option got focused on first paint (Sentry breadcrumb) so we can validate the rule against real behavior.
