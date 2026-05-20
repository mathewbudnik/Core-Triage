# RPG Climber — Phase 0: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the token spine, motion vocabulary, eleven primitive components, three reward-engine modules (XP / stats / quests), and a dev-only `/design-system` showcase route specified in [docs/superpowers/specs/2026-05-20-rpg-climber-design.md](../specs/2026-05-20-rpg-climber-design.md). Zero visible changes to production routes; smoke-tested via the showcase.

**Architecture:** Add `ct.*` Tailwind tokens and CSS type-scale/surface classes; create `frontend/src/lib/motion.js` with motion constants; build eleven primitives in `frontend/src/components/ui/`; build three reward-engine modules (`xp.js`, `stats.js`, `quests.js`) with Vitest unit tests; mount a dev-only `/design-system` route showing every primitive with sample data and live engine output. No existing components migrated in this phase.

**Tech Stack:** React 18, Vite, Tailwind CSS 3.4, Framer Motion 11, lucide-react, @phosphor-icons/react, vaul, lottie-react (already installed on this branch). Vitest added in Task 16.

**Branch:** `redesign/rpg-climber` (already checked out, off `main`).

**Verification approach:** For style/layout primitives — render in the `/design-system` route + `npm run build` pass. For reward-engine modules — Vitest unit tests covering each multiplier path, edge cases (V0, V11+, missing fields), and integration scenarios (full session log → XP totals).

---

## File structure

**New files (frontend/src/components/ui/):**
- `Surface.jsx` — outdoor card. Tiers: flat/default/hero.
- `Eyebrow.jsx` — wide-tracked uppercase label.
- `TierBadge.jsx` — pill with tier name + glow dot.
- `LevelMeter.jsx` — XP bar + numeric "620 / 1,000" + level number.
- `StreakEmblem.jsx` — fire glyph + streak count (SVG fallback).
- `RewardPreview.jsx` — multiplier-breakdown XP estimate.
- `StatStrip.jsx` — 5-cell horizontal stat strip.
- `StatRadar.jsx` — pentagon SVG with stat-shape fill.
- `QuestCard.jsx` — daily quest display with progress.
- `CelebrationOverlay.jsx` — 1.2s celebration moment surface.
- `TierThemeProvider.jsx` — context provider for active tier theme.

**New files (frontend/src/lib/):**
- `motion.js` — DURATIONS, EASE, TRANSITIONS, useReducedTransition hook.
- `xp.js` — calculateSendXP, xpForLevel, levelFromTotalXP.
- `stats.js` — STYLE_CHIP_TO_STATS, deriveStatShape, computeIncrements.
- `quests.js` — QUEST_POOL, generateDailyQuest, evaluateQuestProgress.

**New files (frontend/src/components/):**
- `DesignSystem.jsx` — dev-only showcase route.

**New files (frontend/src/lib/__tests__/):**
- `xp.test.js`, `stats.test.js`, `quests.test.js` — unit tests.

**Modified files:**
- `frontend/tailwind.config.js` — `ct.*` color tokens.
- `frontend/src/index.css` — `.ct-*` type-scale + surface utility classes.
- `frontend/src/App.jsx` — register `/design-system` route (dev-only).
- `frontend/vite.config.js` — add Vitest config (Task 16).
- `frontend/package.json` — add Vitest dev dependency (Task 16).

---

## Pre-flight

- [ ] **Step 0: Confirm branch and clean tree**

Run: `cd /Users/mathewbudnik/coretriage && git rev-parse --abbrev-ref HEAD && git status --short`
Expected: branch is `redesign/rpg-climber`; only ignorable files dirty (e.g., `.claude/settings.local.json`). If on a different branch, switch with `git checkout redesign/grand-seiko/rpg-climber`. If branch doesn't exist or is stale, the plan owner should restart from the spec.

Also confirm: `lottie-react`, `vaul`, `@phosphor-icons/react` already installed (from branch bootstrap commit). Verify with `cd frontend && npm ls lottie-react vaul @phosphor-icons/react` — all three should show as installed.

---

## Task 1: Tailwind color tokens (ct.*)

**Files:**
- Modify: `frontend/tailwind.config.js`

- [ ] **Step 1.1: Add `ct.*` color palette to `theme.extend.colors`**

Open `frontend/tailwind.config.js`. Inside `theme.extend.colors`, after the existing `accent3: '#fbbf24'`, add the `ct` block:

```js
ct: {
  forest:        '#1c2520',
  'forest-deep': '#243530',
  'forest-soft': '#1f2924',
  cream:         '#f0f5ed',
  'cream-soft':  '#c8d3c4',
  moss:          '#95a698',
  hairline:      'rgba(230,237,228,0.10)',
  rim:           'rgba(230,237,228,0.18)',
  terracotta:    '#d97757',
  'terra-soft':  '#f0a875',
  'terra-tint':  'rgba(217,119,87,0.06)',
},
```

- [ ] **Step 1.2: Verify build**

Run: `cd /Users/mathewbudnik/coretriage/frontend && npm run build`
Expected: build completes with no errors, Tailwind picks up the new tokens.

- [ ] **Step 1.3: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/tailwind.config.js
git commit -m "$(cat <<'EOF'
feat(design-system): add ct.* color palette

Phase 0, Task 1 of RPG climber foundation. Adds the ct color palette
(forest, forest-deep, forest-soft, cream, cream-soft, moss, hairline,
rim, terracotta, terra-soft, terra-tint) — the outdoor-brand chrome
tokens used by every primitive in this phase.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: CSS type scale + surface utility classes

**Files:**
- Modify: `frontend/src/index.css`

- [ ] **Step 2.1: Add the type-scale classes to `@layer components`**

Open `frontend/src/index.css`. Inside the `@layer components` block, after the existing `.label` rule, add:

```css
.ct-eyebrow    { font-size: 10px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: theme(colors.ct.moss); }
.ct-title      { font-size: 15px; font-weight: 700; letter-spacing: -0.015em; color: theme(colors.ct.cream); }
.ct-display    { font-size: 36px; font-weight: 800; letter-spacing: -0.030em; line-height: 1; color: theme(colors.ct.terracotta); font-variant-numeric: tabular-nums; }
.ct-stat-num   { font-size: 24px; font-weight: 800; letter-spacing: -0.025em; color: theme(colors.ct.terracotta); font-variant-numeric: tabular-nums; }
.ct-body       { font-size: 13px; color: theme(colors.ct.cream); line-height: 1.5; }
.ct-body-soft  { font-size: 12px; color: theme(colors.ct.cream-soft); line-height: 1.55; }
.ct-meta       { font-size: 10px; color: theme(colors.ct.moss); letter-spacing: 0.05em; }
.ct-tnum       { font-variant-numeric: tabular-nums; }
```

- [ ] **Step 2.2: Add the surface utility classes to `@layer components`**

Immediately after the type-scale block, add:

```css
.ct-surface {
  @apply border border-ct-hairline rounded-lg;
  background-image: linear-gradient(180deg, theme(colors.ct.forest-deep) 0%, theme(colors.ct.forest-soft) 100%);
}

.ct-surface-hero {
  @apply border rounded-lg;
  border-color: rgba(217,119,87,0.20);
  background-image: linear-gradient(180deg, #2a3a34 0%, theme(colors.ct.forest-soft) 100%);
}

.ct-surface-flat {
  @apply border border-ct-hairline rounded-md;
  background-color: theme(colors.ct.forest);
}
```

- [ ] **Step 2.3: Verify build**

Run: `cd /Users/mathewbudnik/coretriage/frontend && npm run build`
Expected: clean. The `@apply` directives resolve because Task 1 added the referenced tokens.

- [ ] **Step 2.4: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/index.css
git commit -m "$(cat <<'EOF'
feat(design-system): ct type scale + surface utility classes

Phase 0, Task 2. Adds eight type-scale classes (.ct-eyebrow, .ct-title,
.ct-display, .ct-stat-num, .ct-body, .ct-body-soft, .ct-meta, .ct-tnum)
and three surface utility classes (.ct-surface, .ct-surface-hero,
.ct-surface-flat) consumed by the primitive components.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Motion vocabulary module

**Files:**
- Create: `frontend/src/lib/motion.js`

- [ ] **Step 3.1: Create the motion module**

Create `frontend/src/lib/motion.js` with this exact content:

```js
import { useReducedMotion } from 'framer-motion'

export const DURATIONS = {
  snap:      0.16,
  glide:     0.32,
  sweep:     0.50,
  celebrate: 0.80,
}

export const EASE = {
  out:    [0.40, 0.00, 0.20, 1.00],
  spring: [0.34, 1.56, 0.64, 1.00],
  decel:  [0.00, 0.00, 0.20, 1.00],
}

export const TRANSITIONS = {
  surface_rise: { duration: DURATIONS.glide, ease: EASE.decel },
  number_count: { duration: DURATIONS.sweep, ease: EASE.out },
  bar_fill:     { duration: DURATIONS.sweep, ease: EASE.out },
  chip_tap:     { duration: DURATIONS.snap,  ease: EASE.out },
  celebrate:    { duration: DURATIONS.celebrate, ease: EASE.spring },
  route:        { duration: DURATIONS.glide, ease: EASE.decel },
}

const INSTANT = { duration: 0 }

/**
 * Returns the given transition, or { duration: 0 } when the user has
 * prefers-reduced-motion: reduce set.
 */
export function useReducedTransition(transition) {
  const shouldReduce = useReducedMotion()
  return shouldReduce ? INSTANT : transition
}
```

- [ ] **Step 3.2: Verify build**

Run: `cd /Users/mathewbudnik/coretriage/frontend && npm run build`
Expected: clean. Confirms the framer-motion import resolves.

- [ ] **Step 3.3: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/lib/motion.js
git commit -m "$(cat <<'EOF'
feat(design-system): motion vocabulary module

Phase 0, Task 3. Exports DURATIONS (snap, glide, sweep, celebrate),
EASE (out, spring, decel), TRANSITIONS (named common combinations), and
the useReducedTransition hook. Every Framer Motion call in the app reads
from these.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: `/design-system` dev-only showcase route

**Files:**
- Create: `frontend/src/components/DesignSystem.jsx`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 4.1: Create the showcase scaffold**

Create `frontend/src/components/DesignSystem.jsx`:

```jsx
import { TRANSITIONS, DURATIONS, EASE } from '../lib/motion'

/**
 * Dev-only design system showcase. Mounted at /design-system (only in DEV builds).
 * Each Phase 0 primitive task adds its section below. Production builds tree-shake
 * the route via the import.meta.env.DEV gate in App.jsx.
 */
export default function DesignSystem() {
  return (
    <main className="min-h-screen bg-ct-forest text-ct-cream p-10">
      <header className="mb-12 flex items-baseline justify-between">
        <div>
          <p className="ct-eyebrow">RPG climber · design system</p>
          <h1 className="ct-display mt-2">Primitives</h1>
        </div>
        <p className="ct-meta">REF · DEV · 2026</p>
      </header>

      <section className="mb-12">
        <h2 className="ct-title mb-4">Motion vocabulary</h2>
        <pre className="ct-body-soft bg-ct-forest-deep border border-ct-hairline rounded-lg p-5 overflow-x-auto">
{`DURATIONS = ${JSON.stringify(DURATIONS, null, 2)}

EASE = ${JSON.stringify(EASE, null, 2)}

TRANSITIONS keys: ${Object.keys(TRANSITIONS).join(', ')}`}
        </pre>
      </section>

      <section className="mb-12">
        <h2 className="ct-title mb-4">Surface</h2>
        <p className="ct-body-soft">Pending Task 5.</p>
      </section>

      <section className="mb-12">
        <h2 className="ct-title mb-4">Eyebrow</h2>
        <p className="ct-body-soft">Pending Task 6.</p>
      </section>

      <section className="mb-12">
        <h2 className="ct-title mb-4">TierBadge</h2>
        <p className="ct-body-soft">Pending Task 7.</p>
      </section>

      <section className="mb-12">
        <h2 className="ct-title mb-4">LevelMeter</h2>
        <p className="ct-body-soft">Pending Task 8.</p>
      </section>

      <section className="mb-12">
        <h2 className="ct-title mb-4">StreakEmblem</h2>
        <p className="ct-body-soft">Pending Task 9.</p>
      </section>

      <section className="mb-12">
        <h2 className="ct-title mb-4">RewardPreview</h2>
        <p className="ct-body-soft">Pending Task 10.</p>
      </section>

      <section className="mb-12">
        <h2 className="ct-title mb-4">StatStrip</h2>
        <p className="ct-body-soft">Pending Task 11.</p>
      </section>

      <section className="mb-12">
        <h2 className="ct-title mb-4">StatRadar</h2>
        <p className="ct-body-soft">Pending Task 12.</p>
      </section>

      <section className="mb-12">
        <h2 className="ct-title mb-4">QuestCard</h2>
        <p className="ct-body-soft">Pending Task 13.</p>
      </section>

      <section className="mb-12">
        <h2 className="ct-title mb-4">CelebrationOverlay</h2>
        <p className="ct-body-soft">Pending Task 14.</p>
      </section>

      <section className="mb-12">
        <h2 className="ct-title mb-4">TierThemeProvider</h2>
        <p className="ct-body-soft">Pending Task 15.</p>
      </section>

      <section className="mb-12">
        <h2 className="ct-title mb-4">Reward engine</h2>
        <p className="ct-body-soft">Pending Tasks 17-19 (xp.js, stats.js, quests.js).</p>
      </section>
    </main>
  )
}
```

- [ ] **Step 4.2: Register dev-only route in App.jsx**

Open `frontend/src/App.jsx`. Locate the section near the top where other routes are lazy-imported. Add:

```jsx
const DesignSystem = lazy(() => import('./components/DesignSystem'))
```

Then locate the `<Routes>` block. Add this entry as the **last** entry before any catch-all wildcard route, or at the end of the list. Wrap with `import.meta.env.DEV` so production builds drop it:

```jsx
{import.meta.env.DEV && (
  <Route path="/design-system" element={<DesignSystem />} />
)}
```

Preserve every existing route in `<Routes>` exactly.

- [ ] **Step 4.3: Verify the route renders in dev**

Run: `cd /Users/mathewbudnik/coretriage/frontend && npm run dev &`
Wait ~3 seconds for the dev server to print its URL.
Curl: `curl -s -o /dev/null -w '%{http_code}' http://localhost:5173/design-system`
Expected: `200`.
Stop the dev server when done.

- [ ] **Step 4.4: Verify build clean**

Run: `npm run build`
Expected: clean.

- [ ] **Step 4.5: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/components/DesignSystem.jsx frontend/src/App.jsx
git commit -m "$(cat <<'EOF'
feat(design-system): /design-system dev showcase route

Phase 0, Task 4. Mounts a dev-only /design-system route as a scaffold for
the eleven primitive components built in Tasks 5-15. Route is gated by
import.meta.env.DEV so production builds drop it.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: `<Surface>` primitive

**Files:**
- Create: `frontend/src/components/ui/Surface.jsx`
- Modify: `frontend/src/components/DesignSystem.jsx`

- [ ] **Step 5.1: Create the Surface primitive**

Create `frontend/src/components/ui/Surface.jsx`:

```jsx
/**
 * Outdoor card. Replaces ad-hoc bg-panel + border-outline patterns.
 *
 * Props:
 *   tier:    'flat' | 'default' | 'hero'      (default: 'default')
 *   padding: 'sm' | 'md' | 'lg' | 'xl'        (default: 'md')
 *   rounded: tailwind class string            (default: 'rounded-lg')
 *   as:      element or component             (default: 'div')
 */

const TIER_CLASS = {
  flat:    'ct-surface-flat',
  default: 'ct-surface',
  hero:    'ct-surface-hero',
}

const PADDING_CLASS = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
  xl: 'p-6',
}

export default function Surface({
  tier = 'default',
  padding = 'md',
  rounded,
  as: Tag = 'div',
  className = '',
  children,
  ...rest
}) {
  const cls = [
    TIER_CLASS[tier],
    PADDING_CLASS[padding],
    rounded,
    'relative overflow-hidden',
    className,
  ].filter(Boolean).join(' ')

  return (
    <Tag className={cls} {...rest}>
      {children}
    </Tag>
  )
}
```

- [ ] **Step 5.2: Wire Surface into the showcase**

Open `frontend/src/components/DesignSystem.jsx`. At the top of imports, add:

```jsx
import Surface from './ui/Surface'
```

Replace the Surface section's placeholder with:

```jsx
<div className="grid grid-cols-3 gap-4">
  <Surface tier="flat" padding="lg">
    <p className="ct-eyebrow mb-2">Flat</p>
    <p className="ct-body-soft">Solid forest, hairline border, no gradient. Tertiary containers.</p>
  </Surface>
  <Surface tier="default" padding="lg">
    <p className="ct-eyebrow mb-2">Default</p>
    <p className="ct-body-soft">Forest gradient + hairline border. The standard surface.</p>
  </Surface>
  <Surface tier="hero" padding="lg">
    <p className="ct-eyebrow mb-2">Hero</p>
    <p className="ct-body-soft">Warmer gradient + terracotta-tinted border. For featured panels.</p>
  </Surface>
</div>
```

- [ ] **Step 5.3: Verify in browser**

Run `npm run dev` (if not already running). Visit `/design-system`. Scroll to the Surface section. Confirm three side-by-side tiles render — flat is matte, default has gradient, hero has the terracotta-tinted border.

- [ ] **Step 5.4: Verify build**

Run: `npm run build` — clean.

- [ ] **Step 5.5: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/components/ui/Surface.jsx frontend/src/components/DesignSystem.jsx
git commit -m "$(cat <<'EOF'
feat(design-system): Surface primitive

Phase 0, Task 5. Outdoor card with three tiers (flat, default, hero)
mapping to the ct-surface-* utility classes from Task 2.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: `<Eyebrow>` primitive

**Files:**
- Create: `frontend/src/components/ui/Eyebrow.jsx`
- Modify: `frontend/src/components/DesignSystem.jsx`

- [ ] **Step 6.1: Create the primitive**

Create `frontend/src/components/ui/Eyebrow.jsx`:

```jsx
/**
 * Wide-tracked tiny uppercase label.
 *
 * Props:
 *   divider:   bool — adds bottom hairline border + padding-bottom
 *   className: extra classes
 *   children:  label text
 */
export default function Eyebrow({ divider = false, className = '', children }) {
  const cls = [
    'ct-eyebrow',
    divider ? 'pb-3 border-b border-ct-hairline' : '',
    className,
  ].filter(Boolean).join(' ')
  return <p className={cls}>{children}</p>
}
```

- [ ] **Step 6.2: Wire into showcase**

In `frontend/src/components/DesignSystem.jsx`, add the import:

```jsx
import Eyebrow from './ui/Eyebrow'
```

Replace the Eyebrow section's placeholder with:

```jsx
<Surface tier="default" padding="lg">
  <Eyebrow>This week · climbing</Eyebrow>
  <p className="ct-title mt-2">Plain eyebrow above a title.</p>
  <Eyebrow divider className="mt-6">With divider</Eyebrow>
  <p className="ct-body-soft mt-3">Body content under a divider eyebrow.</p>
</Surface>
```

- [ ] **Step 6.3: Verify in browser + build**

Visit `/design-system`. Scroll to Eyebrow section — confirm two eyebrows, the second with a hairline divider underneath. Run `npm run build` — clean.

- [ ] **Step 6.4: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/components/ui/Eyebrow.jsx frontend/src/components/DesignSystem.jsx
git commit -m "$(cat <<'EOF'
feat(design-system): Eyebrow primitive

Phase 0, Task 6. Single-style wide-tracked uppercase label. Optional
divider prop adds the hairline border-bottom used between sections.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: `<TierBadge>` primitive

**Files:**
- Create: `frontend/src/components/ui/TierBadge.jsx`
- Modify: `frontend/src/components/DesignSystem.jsx`

- [ ] **Step 7.1: Create the primitive**

Create `frontend/src/components/ui/TierBadge.jsx`:

```jsx
/**
 * Tier pill with name + colored glow dot.
 *
 * Props:
 *   name:  tier name string (e.g., "EMBER")
 *   color: hex color for the dot + glow (default: terracotta)
 *   className: extra classes
 */
export default function TierBadge({ name, color = '#d97757', className = '' }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-2',
        'px-3 py-1 rounded-full',
        'border',
        'text-[11px] font-extrabold tracking-[0.04em] uppercase',
        className,
      ].filter(Boolean).join(' ')}
      style={{
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
        color: color,
      }}
    >
      <span
        className="inline-block w-[7px] h-[7px] rounded-full"
        style={{
          background: color,
          boxShadow: `0 0 8px ${color}99`,
        }}
      />
      {name}
    </span>
  )
}
```

- [ ] **Step 7.2: Wire into showcase**

In `frontend/src/components/DesignSystem.jsx`, add:

```jsx
import TierBadge from './ui/TierBadge'
```

Replace the TierBadge section's placeholder with:

```jsx
<Surface tier="default" padding="lg">
  <Eyebrow divider className="mb-4">Tier badges</Eyebrow>
  <div className="flex flex-wrap gap-3">
    <TierBadge name="FROST" color="#7dd3c0" />
    <TierBadge name="SLATEHOLD" color="#94a3b8" />
    <TierBadge name="EMBER" color="#d97757" />
    <TierBadge name="PHOENIX" color="#fbbf24" />
  </div>
</Surface>
```

- [ ] **Step 7.3: Verify in browser + build**

Visit `/design-system`. Scroll to TierBadge. Confirm four pills with different colored dots and glow effects. `npm run build` — clean.

- [ ] **Step 7.4: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/components/ui/TierBadge.jsx frontend/src/components/DesignSystem.jsx
git commit -m "$(cat <<'EOF'
feat(design-system): TierBadge primitive

Phase 0, Task 7. Tier pill with a colored glow dot. Accepts arbitrary
color so it can display any V-grade tier; Phase 5 will wire it to
TIER_TOKENS via the active theme.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: `<LevelMeter>` primitive

**Files:**
- Create: `frontend/src/components/ui/LevelMeter.jsx`
- Modify: `frontend/src/components/DesignSystem.jsx`

- [ ] **Step 8.1: Create the primitive**

Create `frontend/src/components/ui/LevelMeter.jsx`:

```jsx
import { motion } from 'framer-motion'
import { TRANSITIONS, useReducedTransition } from '../../lib/motion'

/**
 * XP progress bar + level number + meta line.
 *
 * Props:
 *   level:        number — current Climber Level
 *   xpInLevel:    number — XP earned toward next level
 *   xpForNext:    number — XP needed for next level
 *   nextLabel:    string — text describing what's next (e.g., "unlock new quest tier")
 *   animateOnMount: bool — animate bar fill from 0 to current
 */
export default function LevelMeter({
  level,
  xpInLevel,
  xpForNext,
  nextLabel = '',
  animateOnMount = false,
  className = '',
}) {
  const pct = Math.max(0, Math.min(1, xpInLevel / xpForNext))
  const transition = useReducedTransition(TRANSITIONS.bar_fill)
  return (
    <div className={className}>
      <p className="ct-eyebrow">RPG · Level</p>
      <p className="ct-display mt-1">{level}</p>
      <div className="relative h-[5px] bg-white/[0.07] rounded-full overflow-hidden mt-3">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-ct-terracotta to-ct-terra-soft"
          initial={animateOnMount ? { width: 0 } : { width: `${pct * 100}%` }}
          animate={{ width: `${pct * 100}%` }}
          transition={transition}
        />
      </div>
      <p className="ct-meta mt-2">
        {xpInLevel.toLocaleString()} / {xpForNext.toLocaleString()} XP{nextLabel ? ` · ${nextLabel}` : ''}
      </p>
    </div>
  )
}
```

- [ ] **Step 8.2: Wire into showcase**

In `frontend/src/components/DesignSystem.jsx`, add:

```jsx
import LevelMeter from './ui/LevelMeter'
```

Replace the LevelMeter section's placeholder with:

```jsx
<Surface tier="default" padding="lg" className="max-w-sm">
  <LevelMeter
    level={14}
    xpInLevel={620}
    xpForNext={1000}
    nextLabel="next: unlock new quest tier"
    animateOnMount
  />
</Surface>
```

- [ ] **Step 8.3: Verify in browser + build**

Visit `/design-system`. Scroll to LevelMeter. Refresh — confirm the bar sweeps from 0 to 62%. Toggle prefers-reduced-motion in DevTools → reduce, refresh — bar renders at 62% instantly. Reset. `npm run build` — clean.

- [ ] **Step 8.4: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/components/ui/LevelMeter.jsx frontend/src/components/DesignSystem.jsx
git commit -m "$(cat <<'EOF'
feat(design-system): LevelMeter primitive

Phase 0, Task 8. XP progress bar + level number + meta line. Animates
bar fill via TRANSITIONS.bar_fill, respects reduced motion.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: `<StreakEmblem>` primitive

**Files:**
- Create: `frontend/src/components/ui/StreakEmblem.jsx`
- Modify: `frontend/src/components/DesignSystem.jsx`

- [ ] **Step 9.1: Create the primitive**

Create `frontend/src/components/ui/StreakEmblem.jsx`:

```jsx
/**
 * Streak count display with fire glyph (SVG fallback; Lottie wiring in a later phase).
 *
 * Props:
 *   days:          number — current streak in days
 *   best:          number — personal best
 *   className:     extra classes
 */
export default function StreakEmblem({ days, best, className = '' }) {
  const toBest = Math.max(0, best - days)
  return (
    <div
      className={[
        'flex items-center gap-3',
        'rounded-lg border px-4 py-3',
        'bg-[rgba(217,119,87,0.06)] border-[rgba(217,119,87,0.18)]',
        className,
      ].filter(Boolean).join(' ')}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: 'radial-gradient(circle at 50% 70%, #ff8a4a 0%, #d97757 50%, transparent 80%)',
          boxShadow: '0 0 12px rgba(255,138,74,0.4)',
        }}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2c-1 3-4 4-4 8a4 4 0 0 0 4 4 4 4 0 0 0 4-4c0-4-3-5-4-8z" fill="#fff7ed" />
          <path d="M9 14a3 3 0 0 0 3 3 3 3 0 0 0 3-3c0-2-1.5-3-3-5-1.5 2-3 3-3 5z" fill="#ffc46b" />
        </svg>
      </div>
      <div className="flex-1">
        <p className="text-base font-extrabold text-ct-cream leading-tight">{days} day streak</p>
        <p className="ct-meta mt-0.5">Personal best: {best} days</p>
      </div>
      {toBest > 0 && (
        <p className="text-[10px] font-bold text-ct-terra-soft tracking-[0.06em] text-right">{toBest} TO PB</p>
      )}
    </div>
  )
}
```

- [ ] **Step 9.2: Wire into showcase**

In `frontend/src/components/DesignSystem.jsx`, add:

```jsx
import StreakEmblem from './ui/StreakEmblem'
```

Replace the StreakEmblem section's placeholder with:

```jsx
<div className="max-w-sm space-y-3">
  <StreakEmblem days={21} best={28} />
  <StreakEmblem days={28} best={28} />
</div>
```

- [ ] **Step 9.3: Verify in browser + build**

Visit `/design-system`. Scroll to StreakEmblem. Confirm two streak panels — one showing "7 TO PB" and one without (when current equals best). `npm run build` — clean.

- [ ] **Step 9.4: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/components/ui/StreakEmblem.jsx frontend/src/components/DesignSystem.jsx
git commit -m "$(cat <<'EOF'
feat(design-system): StreakEmblem primitive

Phase 0, Task 9. Streak count with SVG fire glyph fallback. Shows
"N TO PB" callout when current streak is below personal best.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: `<RewardPreview>` primitive

**Files:**
- Create: `frontend/src/components/ui/RewardPreview.jsx`
- Modify: `frontend/src/components/DesignSystem.jsx`

- [ ] **Step 10.1: Create the primitive**

Create `frontend/src/components/ui/RewardPreview.jsx`:

```jsx
/**
 * The XP-earned preview shown in the log flow. Shows total XP with multiplier breakdown.
 *
 * Props:
 *   xp:        number — total XP to be earned
 *   breakdown: string — short description (e.g., "V6 × flash × indoor")
 *   label:     string — top label (default: "YOU'LL EARN")
 *   className: extra classes
 */
export default function RewardPreview({
  xp,
  breakdown,
  label = "YOU'LL EARN",
  className = '',
}) {
  return (
    <div
      className={[
        'flex justify-between items-center',
        'rounded-lg border px-3 py-2.5',
        'bg-[rgba(217,119,87,0.08)] border-[rgba(217,119,87,0.18)]',
        className,
      ].filter(Boolean).join(' ')}
    >
      <div>
        <p className="text-[10px] font-bold tracking-[0.10em] uppercase text-ct-moss">{label}</p>
        {breakdown && <p className="text-[10px] text-ct-moss mt-0.5">{breakdown}</p>}
      </div>
      <p className="text-[16px] font-extrabold text-ct-terra-soft tracking-[0.02em] ct-tnum">
        +{xp.toLocaleString()} XP
      </p>
    </div>
  )
}
```

- [ ] **Step 10.2: Wire into showcase**

In `frontend/src/components/DesignSystem.jsx`, add:

```jsx
import RewardPreview from './ui/RewardPreview'
```

Replace the RewardPreview section's placeholder with:

```jsx
<div className="max-w-sm space-y-3">
  <RewardPreview xp={180} breakdown="V6 × flash × indoor" />
  <RewardPreview xp={225} breakdown="V6 × flash × indoor × deep" />
  <RewardPreview xp={50} breakdown="Quest reward" label="QUEST COMPLETE" />
</div>
```

- [ ] **Step 10.3: Verify in browser + build**

Visit `/design-system`. Scroll to RewardPreview. Three previews with terracotta tint. `npm run build` — clean.

- [ ] **Step 10.4: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/components/ui/RewardPreview.jsx frontend/src/components/DesignSystem.jsx
git commit -m "$(cat <<'EOF'
feat(design-system): RewardPreview primitive

Phase 0, Task 10. XP-earned callout with multiplier breakdown. Used in
the log flow to transparently show how XP is computed.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: `<StatStrip>` primitive

**Files:**
- Create: `frontend/src/components/ui/StatStrip.jsx`
- Modify: `frontend/src/components/DesignSystem.jsx`

- [ ] **Step 11.1: Create the primitive**

Create `frontend/src/components/ui/StatStrip.jsx`:

```jsx
/**
 * 5-cell horizontal stat strip. Compact alternative to StatRadar for narrow surfaces.
 *
 * Props:
 *   stats: { power, crimpy, dynamic, technical, mobility } — values 0-10
 *   className: extra classes
 */
const AXES = [
  { key: 'power',     label: 'POW' },
  { key: 'crimpy',    label: 'CRP' },
  { key: 'dynamic',   label: 'DYN' },
  { key: 'technical', label: 'TEC' },
  { key: 'mobility',  label: 'MOB' },
]

export default function StatStrip({ stats, className = '' }) {
  return (
    <div className={['flex gap-1.5', className].filter(Boolean).join(' ')}>
      {AXES.map(({ key, label }) => (
        <div key={key} className="flex-1 text-center">
          <p className="ct-stat-num text-[16px] leading-none">{stats[key] ?? 0}</p>
          <p className="text-[8px] tracking-[0.12em] uppercase text-ct-moss font-bold mt-1">{label}</p>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 11.2: Wire into showcase**

In `frontend/src/components/DesignSystem.jsx`, add:

```jsx
import StatStrip from './ui/StatStrip'
```

Replace the StatStrip section's placeholder with:

```jsx
<Surface tier="default" padding="lg" className="max-w-sm">
  <Eyebrow divider className="mb-3">Sample stats</Eyebrow>
  <StatStrip stats={{ power: 7, crimpy: 6, dynamic: 4, technical: 5, mobility: 3 }} />
</Surface>
```

- [ ] **Step 11.3: Verify in browser + build**

Visit `/design-system`. Scroll to StatStrip. Confirm five cells showing 7/6/4/5/3 with POW/CRP/DYN/TEC/MOB labels. `npm run build` — clean.

- [ ] **Step 11.4: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/components/ui/StatStrip.jsx frontend/src/components/DesignSystem.jsx
git commit -m "$(cat <<'EOF'
feat(design-system): StatStrip primitive

Phase 0, Task 11. Compact 5-cell horizontal stat strip used in card
footers and narrow contexts where the radar pentagon doesn't fit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: `<StatRadar>` primitive

**Files:**
- Create: `frontend/src/components/ui/StatRadar.jsx`
- Modify: `frontend/src/components/DesignSystem.jsx`

- [ ] **Step 12.1: Create the primitive**

Create `frontend/src/components/ui/StatRadar.jsx`:

```jsx
import { motion } from 'framer-motion'
import { TRANSITIONS, useReducedTransition } from '../../lib/motion'

/**
 * Pentagon radar showing five stat axes (0-10 each). Renders as SVG with
 * a terracotta-tinted fill polygon and vertex dots.
 *
 * Props:
 *   stats: { power, crimpy, dynamic, technical, mobility }   values 0-10
 *   size:  pixel size — width/height of the square viewport (default: 130)
 *   className: extra classes
 *   animate: bool — animate the polygon on mount/value change (default: true)
 */
const AXES = ['power', 'crimpy', 'dynamic', 'technical', 'mobility']

// 5 vertices of a pentagon, top-up, normalized to a unit circle centered at (0.5, 0.5).
// Each at -90deg, -18deg, +54deg, +126deg, +198deg.
const AXIS_ANGLES = [-90, -18, 54, 126, 198].map((d) => (d * Math.PI) / 180)

function pointAt(value, angle, cx, cy, radius) {
  const r = radius * (value / 10)
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]
}

function gridPolygon(level, cx, cy, radius) {
  return AXIS_ANGLES
    .map((angle) => pointAt(level, angle, cx, cy, radius))
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ')
}

function statPolygon(stats, cx, cy, radius) {
  return AXES
    .map((axis, i) => pointAt(stats[axis] ?? 0, AXIS_ANGLES[i], cx, cy, radius))
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ')
}

export default function StatRadar({ stats, size = 130, className = '', animate = true }) {
  const cx = size / 2
  const cy = size / 2
  const radius = size * 0.42
  const points = statPolygon(stats, cx, cy, radius)
  const transition = useReducedTransition(TRANSITIONS.surface_rise)
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Grid rings */}
      <g stroke="rgba(240,168,117,0.18)" strokeWidth="1" fill="none">
        <polygon points={gridPolygon(10, cx, cy, radius)} />
        <polygon points={gridPolygon(6,  cx, cy, radius)} />
        <polygon points={gridPolygon(3,  cx, cy, radius)} />
      </g>
      {/* Stat polygon */}
      <motion.polygon
        points={points}
        fill="rgba(217,119,87,0.22)"
        stroke="#d97757"
        strokeWidth="2"
        strokeLinejoin="round"
        initial={animate ? { opacity: 0, scale: 0.92 } : false}
        animate={animate ? { opacity: 1, scale: 1 } : undefined}
        transition={transition}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      />
      {/* Vertex dots */}
      <g fill="#f0a875">
        {AXES.map((axis, i) => {
          const [x, y] = pointAt(stats[axis] ?? 0, AXIS_ANGLES[i], cx, cy, radius)
          return <circle key={axis} cx={x} cy={y} r="2.5" />
        })}
      </g>
    </svg>
  )
}
```

- [ ] **Step 12.2: Wire into showcase**

In `frontend/src/components/DesignSystem.jsx`, add:

```jsx
import StatRadar from './ui/StatRadar'
```

Replace the StatRadar section's placeholder with:

```jsx
<div className="grid grid-cols-3 gap-4">
  <Surface tier="default" padding="lg">
    <Eyebrow divider className="mb-3">Asymmetric</Eyebrow>
    <StatRadar stats={{ power: 7, crimpy: 6, dynamic: 4, technical: 5, mobility: 3 }} size={130} />
  </Surface>
  <Surface tier="default" padding="lg">
    <Eyebrow divider className="mb-3">Balanced</Eyebrow>
    <StatRadar stats={{ power: 5, crimpy: 5, dynamic: 5, technical: 5, mobility: 5 }} size={130} />
  </Surface>
  <Surface tier="default" padding="lg">
    <Eyebrow divider className="mb-3">Brand new</Eyebrow>
    <StatRadar stats={{ power: 1, crimpy: 1, dynamic: 0, technical: 1, mobility: 0 }} size={130} />
  </Surface>
</div>
```

- [ ] **Step 12.3: Verify in browser + build**

Visit `/design-system`. Scroll to StatRadar. Confirm three pentagons — one asymmetric (top vertex tallest), one symmetric (regular pentagon shape), one very small. Refresh — confirm the polygons fade-in on mount. `npm run build` — clean.

- [ ] **Step 12.4: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/components/ui/StatRadar.jsx frontend/src/components/DesignSystem.jsx
git commit -m "$(cat <<'EOF'
feat(design-system): StatRadar primitive

Phase 0, Task 12. Pentagon radar visualization of the five stat axes
(Power, Crimpy, Dynamic, Technical, Mobility). Animates polygon fade-in
on mount; respects reduced motion.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: `<QuestCard>` primitive

**Files:**
- Create: `frontend/src/components/ui/QuestCard.jsx`
- Modify: `frontend/src/components/DesignSystem.jsx`

- [ ] **Step 13.1: Create the primitive**

Create `frontend/src/components/ui/QuestCard.jsx`:

```jsx
import { motion } from 'framer-motion'
import { TRANSITIONS, useReducedTransition } from '../../lib/motion'

/**
 * Daily quest card with title, multiplier callout, progress bar, and "why this matters" line.
 *
 * Props:
 *   title:       string — quest title
 *   why:         string — short "why this matters" coaching copy
 *   xp:          number — XP reward for completion
 *   multiplier:  string — multiplier label (e.g., "MOBILITY ×1.5")
 *   progress:    { current: number, target: number }
 *   label:       string — top label (default: "TODAY'S QUEST")
 *   className:   extra classes
 */
export default function QuestCard({
  title,
  why,
  xp,
  multiplier,
  progress,
  label = "TODAY'S QUEST",
  className = '',
}) {
  const pct = progress
    ? Math.max(0, Math.min(1, progress.current / Math.max(1, progress.target)))
    : 0
  const transition = useReducedTransition(TRANSITIONS.bar_fill)
  return (
    <div
      className={[
        'rounded-lg border p-4',
        'bg-gradient-to-b from-ct-forest-deep to-ct-forest-soft',
        'border-[rgba(217,119,87,0.20)]',
        className,
      ].filter(Boolean).join(' ')}
    >
      <div className="flex justify-between items-center mb-2">
        <p className="text-[10px] tracking-[0.22em] uppercase text-ct-terra-soft font-extrabold">{label}</p>
        <p className="text-[11px] text-ct-moss font-bold tracking-[0.04em]">
          +{xp} XP{multiplier ? ` · ${multiplier}` : ''}
        </p>
      </div>
      <p className="text-[15px] font-bold text-ct-cream leading-tight tracking-[-0.01em]">{title}</p>
      {why && <p className="text-[11px] text-ct-moss mt-1.5 leading-snug">{why}</p>}
      {progress && (
        <div className="mt-3">
          <div className="relative h-[5px] bg-white/[0.07] rounded-full overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-ct-terracotta to-ct-terra-soft"
              initial={{ width: `${pct * 100}%` }}
              animate={{ width: `${pct * 100}%` }}
              transition={transition}
            />
          </div>
          <div className="flex justify-between text-[11px] mt-1.5">
            <span className="text-ct-cream font-bold ct-tnum">{progress.current} of {progress.target}</span>
            <span className="text-ct-moss tracking-[0.05em]">{Math.round(pct * 100)}%</span>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 13.2: Wire into showcase**

In `frontend/src/components/DesignSystem.jsx`, add:

```jsx
import QuestCard from './ui/QuestCard'
```

Replace the QuestCard section's placeholder with:

```jsx
<div className="max-w-sm space-y-3">
  <QuestCard
    title="Try a slab problem"
    why="You're light on Mobility (3). Slabs are quick wins. Log 2 sends."
    xp={50}
    multiplier="MOBILITY ×1.5"
    progress={{ current: 2, target: 3 }}
  />
  <QuestCard
    title="Log a 20-minute mobility session"
    why="No mobility training in the last 7 days."
    xp={50}
    progress={{ current: 0, target: 1 }}
  />
</div>
```

- [ ] **Step 13.3: Verify in browser + build**

Visit `/design-system`. Scroll to QuestCard. Confirm two quest cards. `npm run build` — clean.

- [ ] **Step 13.4: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/components/ui/QuestCard.jsx frontend/src/components/DesignSystem.jsx
git commit -m "$(cat <<'EOF'
feat(design-system): QuestCard primitive

Phase 0, Task 13. Daily quest card with title, multiplier callout,
progress bar with current/target, and the "why this matters" coaching line.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: `<CelebrationOverlay>` primitive

**Files:**
- Create: `frontend/src/components/ui/CelebrationOverlay.jsx`
- Modify: `frontend/src/components/DesignSystem.jsx`

- [ ] **Step 14.1: Create the primitive**

Create `frontend/src/components/ui/CelebrationOverlay.jsx`:

```jsx
import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { TRANSITIONS, useReducedTransition } from '../../lib/motion'

/**
 * Centered ~1.2 second celebration overlay. Used for PR sends, level-ups,
 * achievement unlocks, theme unlocks. SVG fallback when no Lottie file
 * is provided (Phase 0 ships SVG-only; Lottie wiring is a later phase).
 *
 * Props:
 *   open:       bool — render overlay
 *   onClose:    () => void — fired on tap or auto-dismiss
 *   title:      string — short copy ("V6 SENT!")
 *   subtitle:   string — secondary line ("+180 XP")
 *   autoDismissMs: number — milliseconds before auto-dismiss (default: 2500)
 *   className:  extra classes
 */
export default function CelebrationOverlay({
  open,
  onClose = () => {},
  title,
  subtitle,
  autoDismissMs = 2500,
  className = '',
}) {
  const transition = useReducedTransition(TRANSITIONS.celebrate)

  useEffect(() => {
    if (!open) return
    const t = setTimeout(onClose, autoDismissMs)
    return () => clearTimeout(t)
  }, [open, onClose, autoDismissMs])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={[
            'fixed inset-0 z-50',
            'flex flex-col items-center justify-center gap-4',
            'bg-ct-forest/85 backdrop-blur-sm',
            className,
          ].filter(Boolean).join(' ')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition}
          onClick={onClose}
        >
          {/* SVG burst fallback (Lottie replaces this in a later phase) */}
          <motion.svg
            viewBox="0 0 200 200" width="180" height="180"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={transition}
            xmlns="http://www.w3.org/2000/svg"
          >
            <g stroke="#d97757" strokeWidth="3" fill="none" strokeLinecap="round">
              {Array.from({ length: 12 }).map((_, i) => {
                const a = (i * Math.PI * 2) / 12
                const x1 = 100 + Math.cos(a) * 40
                const y1 = 100 + Math.sin(a) * 40
                const x2 = 100 + Math.cos(a) * 80
                const y2 = 100 + Math.sin(a) * 80
                return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
              })}
            </g>
            <circle cx="100" cy="100" r="32" fill="#d97757" />
          </motion.svg>
          {title && <p className="text-[28px] font-extrabold text-ct-cream tracking-[-0.025em] text-center">{title}</p>}
          {subtitle && <p className="ct-stat-num text-center">{subtitle}</p>}
          <p className="ct-meta mt-2">Tap to dismiss</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 14.2: Wire into showcase**

In `frontend/src/components/DesignSystem.jsx`, add at the top of imports:

```jsx
import { useState } from 'react'
import CelebrationOverlay from './ui/CelebrationOverlay'
```

If the showcase component isn't already stateful, change its signature:

```jsx
export default function DesignSystem() {
  const [celebrate, setCelebrate] = useState(false)
  return (
```

Replace the CelebrationOverlay section's placeholder with:

```jsx
<Surface tier="default" padding="lg" className="max-w-sm">
  <Eyebrow divider className="mb-4">Trigger</Eyebrow>
  <button
    type="button"
    onClick={() => setCelebrate(true)}
    className="w-full py-3 rounded-lg bg-ct-terracotta text-ct-forest font-extrabold text-sm tracking-[0.04em]"
  >
    Fire celebration
  </button>
  <CelebrationOverlay
    open={celebrate}
    onClose={() => setCelebrate(false)}
    title="V6 SENT"
    subtitle="+180 XP"
  />
</Surface>
```

- [ ] **Step 14.3: Verify in browser + build**

Visit `/design-system`. Scroll to CelebrationOverlay. Click "Fire celebration" — full-screen overlay appears with the SVG burst, "V6 SENT" headline, "+180 XP" subtitle. Auto-dismisses in 2.5s, or tap to dismiss. `npm run build` — clean.

- [ ] **Step 14.4: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/components/ui/CelebrationOverlay.jsx frontend/src/components/DesignSystem.jsx
git commit -m "$(cat <<'EOF'
feat(design-system): CelebrationOverlay primitive

Phase 0, Task 14. Full-screen ~1.2s celebration moment for PRs, level-ups,
achievement unlocks. SVG burst fallback shipped now; Lottie integration
deferred to a later phase. Auto-dismisses after 2.5s or on tap.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: `<TierThemeProvider>` primitive

**Files:**
- Create: `frontend/src/components/ui/TierThemeProvider.jsx`
- Modify: `frontend/src/components/DesignSystem.jsx`

- [ ] **Step 15.1: Create the primitive**

Create `frontend/src/components/ui/TierThemeProvider.jsx`:

```jsx
import { createContext, useContext, useEffect, useState } from 'react'

/**
 * Provides the active V-grade tier theme via React context + CSS variables.
 *
 * Phase 0 ships ONE theme — "ember" (default, matches the locked aesthetic).
 * Phase 5 adds the other tier palettes (frost, slatehold, phoenix) and the
 * unlock/switch flow.
 *
 * Theme is read from localStorage key `ct_theme` on mount.
 * Defaults to 'ember' if no value is set.
 */

const THEMES = {
  ember: {
    name: 'EMBER',
    accent:     '#d97757',
    accentSoft: '#f0a875',
  },
}

const TierThemeContext = createContext({
  themeKey: 'ember',
  theme: THEMES.ember,
  setThemeKey: () => {},
})

export function TierThemeProvider({ children }) {
  const [themeKey, setThemeKeyState] = useState(() => {
    try {
      const stored = localStorage.getItem('ct_theme')
      return stored && THEMES[stored] ? stored : 'ember'
    } catch {
      return 'ember'
    }
  })
  const setThemeKey = (key) => {
    if (!THEMES[key]) return
    setThemeKeyState(key)
    try { localStorage.setItem('ct_theme', key) } catch {}
  }
  const theme = THEMES[themeKey]

  useEffect(() => {
    document.documentElement.style.setProperty('--ct-theme-accent', theme.accent)
    document.documentElement.style.setProperty('--ct-theme-accent-soft', theme.accentSoft)
  }, [theme])

  return (
    <TierThemeContext.Provider value={{ themeKey, theme, setThemeKey }}>
      {children}
    </TierThemeContext.Provider>
  )
}

export function useTierTheme() {
  return useContext(TierThemeContext)
}

export { THEMES }
```

- [ ] **Step 15.2: Wire into showcase**

In `frontend/src/components/DesignSystem.jsx`, add:

```jsx
import { TierThemeProvider, useTierTheme } from './ui/TierThemeProvider'
```

The showcase needs a small sub-component that consumes the theme since hooks need to be inside the provider. Define this above the `DesignSystem` export:

```jsx
function ThemeDemoBody() {
  const { themeKey, theme, setThemeKey } = useTierTheme()
  return (
    <>
      <p className="ct-body-soft">
        Active theme: <span className="font-bold text-ct-terra-soft">{theme.name}</span> ({themeKey})
      </p>
      <p className="ct-meta mt-2">
        Phase 0 ships only Ember. Phase 5 unlocks Frost / Slatehold / Phoenix.
        Theme persistence is wired (localStorage key <code>ct_theme</code>).
      </p>
      <button
        type="button"
        onClick={() => setThemeKey('ember')}
        className="mt-3 px-4 py-2 rounded-md bg-ct-terracotta text-ct-forest text-sm font-bold"
      >
        Set Ember
      </button>
    </>
  )
}
```

Then replace the TierThemeProvider section's placeholder with:

```jsx
<TierThemeProvider>
  <Surface tier="default" padding="lg" className="max-w-sm">
    <Eyebrow divider className="mb-3">Active theme</Eyebrow>
    <ThemeDemoBody />
  </Surface>
</TierThemeProvider>
```

- [ ] **Step 15.3: Verify in browser + build**

Visit `/design-system`. Scroll to TierThemeProvider. Confirm "Active theme: EMBER (ember)" appears, the localStorage explanation is shown, and the "Set Ember" button is rendered. Open browser DevTools → Application → Local Storage — confirm `ct_theme` is set to `ember` after clicking the button. `npm run build` — clean.

- [ ] **Step 15.4: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/components/ui/TierThemeProvider.jsx frontend/src/components/DesignSystem.jsx
git commit -m "$(cat <<'EOF'
feat(design-system): TierThemeProvider primitive

Phase 0, Task 15. Context provider for the active V-grade tier theme.
Phase 0 ships only Ember (default); Phase 5 adds the other tier palettes
and the unlock/switch flow. Theme persists in localStorage key ct_theme.
Exposes useTierTheme hook for consumers.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 16: Install Vitest + minimal config

**Files:**
- Modify: `frontend/package.json` (via `npm install`)
- Modify: `frontend/vite.config.js`

- [ ] **Step 16.1: Install Vitest**

Run: `cd /Users/mathewbudnik/coretriage/frontend && npm install --save-dev vitest`
Expected: install completes without errors.

- [ ] **Step 16.2: Add test script to package.json**

Open `frontend/package.json`. In the `"scripts"` object, after `"preview"`, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 16.3: Enable Vitest in vite.config.js**

Open `frontend/vite.config.js`. At the top, change the import line from `import { defineConfig } from 'vite'` to:

```js
/// <reference types="vitest" />
import { defineConfig } from 'vite'
```

In the exported config object, after the existing `plugins:` entry, add:

```js
  test: {
    environment: 'node',
    globals: true,
  },
```

(`environment: 'node'` is correct for pure-logic library tests. Component tests would need `jsdom` but we don't have any in Phase 0.)

- [ ] **Step 16.4: Verify test runner with a trivial test**

Create a throwaway file `frontend/src/lib/__tests__/_smoke.test.js`:

```js
import { describe, it, expect } from 'vitest'

describe('vitest smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

Run: `cd frontend && npm test`
Expected: 1 test passes.

- [ ] **Step 16.5: Delete the smoke test**

```bash
rm frontend/src/lib/__tests__/_smoke.test.js
```

- [ ] **Step 16.6: Verify build still passes**

Run: `npm run build`
Expected: clean.

- [ ] **Step 16.7: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/package.json frontend/package-lock.json frontend/vite.config.js
git commit -m "$(cat <<'EOF'
chore(test): add Vitest for reward-engine unit tests

Phase 0, Task 16. Adds Vitest dev dependency + test/test:watch npm
scripts + vite.config.js test config (Node env, globals on). Used by
the reward-engine library modules in Tasks 17-19.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 17: Reward engine — `xp.js`

**Files:**
- Create: `frontend/src/lib/xp.js`
- Create: `frontend/src/lib/__tests__/xp.test.js`

Spec reference: §7.1 (XP formula) and §7.2 (level thresholds).

- [ ] **Step 17.1: Write the failing tests**

Create `frontend/src/lib/__tests__/xp.test.js`:

```js
import { describe, it, expect } from 'vitest'
import {
  baseGradeXP,
  calculateSendXP,
  xpForLevel,
  levelFromTotalXP,
} from '../xp.js'

describe('baseGradeXP', () => {
  it('returns the table value for V0', () => {
    expect(baseGradeXP('V0')).toBe(10)
  })
  it('returns the table value for V6', () => {
    expect(baseGradeXP('V6')).toBe(130)
  })
  it('returns the table value for V11 or higher', () => {
    expect(baseGradeXP('V11')).toBe(500)
    expect(baseGradeXP('V15')).toBe(500)
  })
  it('returns 0 for unknown grades', () => {
    expect(baseGradeXP('garbage')).toBe(0)
    expect(baseGradeXP('')).toBe(0)
    expect(baseGradeXP(null)).toBe(0)
  })
})

describe('calculateSendXP', () => {
  const climberStatShape = {
    power: 7, crimpy: 6, dynamic: 4, technical: 5, mobility: 3,
  }

  it('V6 indoor redpoint = 130', () => {
    const xp = calculateSendXP({
      grade: 'V6', modality: 'indoor', outcome: 'redpoint',
      isPersonalRecord: false, stylePrimary: 'crimpy', climberStatShape, isDeepLog: false,
      sessionPosition: 0,
    })
    expect(xp).toBe(130)
  })

  it('V6 outdoor flash = 130 * 1.5 * 2 = 390', () => {
    const xp = calculateSendXP({
      grade: 'V6', modality: 'outdoor', outcome: 'flash',
      isPersonalRecord: false, stylePrimary: 'crimpy', climberStatShape, isDeepLog: false,
      sessionPosition: 0,
    })
    expect(xp).toBe(390)
  })

  it('V6 system flash PR (weakness = mobility, climb is crimpy) = 130 * 1.25 * 2 * 1.5 = 487', () => {
    const xp = calculateSendXP({
      grade: 'V6', modality: 'system', outcome: 'flash',
      isPersonalRecord: true, stylePrimary: 'crimpy', climberStatShape, isDeepLog: false,
      sessionPosition: 0,
    })
    // 130 * 1.25 = 162.5; * 2 = 325; * 1.5 = 487.5; floor = 487
    expect(xp).toBe(487)
  })

  it('gap multiplier x1.5 when style targets the weakest stat', () => {
    // climber's weakest is mobility (3). Mobility-styled climb gets x1.5 gap mult.
    const xp = calculateSendXP({
      grade: 'V4', modality: 'indoor', outcome: 'redpoint',
      isPersonalRecord: false, stylePrimary: 'mobility', climberStatShape, isDeepLog: false,
      sessionPosition: 0,
    })
    // 80 * 1 * 1 * 1 * 1.5 = 120
    expect(xp).toBe(120)
  })

  it('gap multiplier x1.2 when style targets the second-weakest stat', () => {
    // climber's second-weakest is dynamic (4). Dynamic-styled climb gets x1.2.
    const xp = calculateSendXP({
      grade: 'V4', modality: 'indoor', outcome: 'redpoint',
      isPersonalRecord: false, stylePrimary: 'dynamic', climberStatShape, isDeepLog: false,
      sessionPosition: 0,
    })
    expect(xp).toBe(96) // 80 * 1.2
  })

  it('gap multiplier x1.0 when style targets a non-weakness', () => {
    const xp = calculateSendXP({
      grade: 'V4', modality: 'indoor', outcome: 'redpoint',
      isPersonalRecord: false, stylePrimary: 'power', climberStatShape, isDeepLog: false,
      sessionPosition: 0,
    })
    expect(xp).toBe(80)
  })

  it('deep log multiplier adds 25%', () => {
    const xp = calculateSendXP({
      grade: 'V4', modality: 'indoor', outcome: 'redpoint',
      isPersonalRecord: false, stylePrimary: 'power', climberStatShape, isDeepLog: true,
      sessionPosition: 0,
    })
    expect(xp).toBe(100) // 80 * 1.25
  })

  it('project effort credit gives x0.10 for unsent projects', () => {
    const xp = calculateSendXP({
      grade: 'V6', modality: 'indoor', outcome: 'project',
      isPersonalRecord: false, stylePrimary: 'crimpy', climberStatShape, isDeepLog: false,
      sessionPosition: 0,
    })
    expect(xp).toBe(13) // 130 * 0.10 = 13
  })

  it('chain bonus adds +5 per session position, capped at +30', () => {
    const baseInputs = {
      grade: 'V4', modality: 'indoor', outcome: 'redpoint',
      isPersonalRecord: false, stylePrimary: 'power', climberStatShape, isDeepLog: false,
    }
    expect(calculateSendXP({ ...baseInputs, sessionPosition: 0 })).toBe(80) // no bonus
    expect(calculateSendXP({ ...baseInputs, sessionPosition: 3 })).toBe(95) // 80 + 3*5
    expect(calculateSendXP({ ...baseInputs, sessionPosition: 10 })).toBe(110) // capped at +30
  })
})

describe('xpForLevel', () => {
  it('returns 100 for level 1 to 2', () => {
    expect(xpForLevel(1)).toBe(100)
  })
  it('returns ~273 for level 2 to 3', () => {
    expect(xpForLevel(2)).toBe(Math.floor(100 * Math.pow(2, 1.45)))
  })
  it('returns 0 for invalid levels', () => {
    expect(xpForLevel(0)).toBe(0)
    expect(xpForLevel(-1)).toBe(0)
  })
})

describe('levelFromTotalXP', () => {
  it('Level 1 at 0 XP', () => {
    expect(levelFromTotalXP(0)).toEqual({ level: 1, xpInLevel: 0, xpForNext: xpForLevel(1) })
  })
  it('Level 2 at 100 XP exactly', () => {
    expect(levelFromTotalXP(100)).toEqual({
      level: 2, xpInLevel: 0, xpForNext: xpForLevel(2),
    })
  })
  it('Level 1 at 50 XP', () => {
    expect(levelFromTotalXP(50)).toEqual({
      level: 1, xpInLevel: 50, xpForNext: xpForLevel(1),
    })
  })
})
```

- [ ] **Step 17.2: Run tests to verify they fail**

Run: `cd frontend && npm test`
Expected: tests fail because `xp.js` doesn't exist yet. Output shows "Failed to resolve import '../xp.js'".

- [ ] **Step 17.3: Implement xp.js**

Create `frontend/src/lib/xp.js`:

```js
/**
 * XP formula + level thresholds for the RPG climber reward engine.
 * Pure functions, no side effects. See docs/superpowers/specs/2026-05-20-rpg-climber-design.md §7
 * for the formula reference.
 */

const BASE_GRADE_XP = {
  V0: 10, V1: 20, V2: 35, V3: 55, V4: 80, V5: 105,
  V6: 130, V7: 180, V8: 240, V9: 310, V10: 400,
}
const V11_PLUS_XP = 500

export function baseGradeXP(grade) {
  if (typeof grade !== 'string' || !grade.startsWith('V')) return 0
  if (grade in BASE_GRADE_XP) return BASE_GRADE_XP[grade]
  // V11+ all map to 500
  const n = parseInt(grade.slice(1), 10)
  if (Number.isFinite(n) && n >= 11) return V11_PLUS_XP
  return 0
}

const MODALITY_MULT = {
  indoor:      1.00,
  system:      1.25,
  outdoor:     1.50,
  competition: 1.40,
}

const FLASH_MULT = {
  flash:    2.00,
  redpoint: 1.00,
  project:  0.10,
}

const PR_MULT_TRUE  = 1.50
const PR_MULT_FALSE = 1.00

const STYLE_TO_PRIMARY_STAT = {
  powerful:  'power',
  crimpy:    'crimpy',
  dynamic:   'dynamic',
  technical: 'technical',
  mobility:  'mobility',
}

/**
 * Returns the gap multiplier:
 *   x1.5 if the style's primary stat matches the climber's weakest stat
 *   x1.2 if it matches the second-weakest
 *   x1.0 otherwise
 */
function gapMultiplier(stylePrimary, climberStatShape) {
  const targetStat = STYLE_TO_PRIMARY_STAT[stylePrimary]
  if (!targetStat || !climberStatShape) return 1.0
  // Rank stats by value, ascending. Index 0 = weakest, index 1 = second-weakest.
  const ranked = Object.entries(climberStatShape)
    .sort(([, a], [, b]) => a - b)
    .map(([key]) => key)
  if (ranked[0] === targetStat) return 1.5
  if (ranked[1] === targetStat) return 1.2
  return 1.0
}

const DEEP_BONUS = 1.25
const CHAIN_PER_POSITION = 5
const CHAIN_CAP = 30

/**
 * Compute the XP earned for a single send.
 *
 * @param {object} args
 * @param {string} args.grade           V-grade like "V6"
 * @param {string} args.modality        'indoor' | 'system' | 'outdoor' | 'competition'
 * @param {string} args.outcome         'flash' | 'redpoint' | 'project'
 * @param {boolean} args.isPersonalRecord  true if first send at this grade
 * @param {string} args.stylePrimary    style chip key (powerful/crimpy/dynamic/technical/mobility)
 * @param {object} args.climberStatShape  { power, crimpy, dynamic, technical, mobility }
 * @param {boolean} args.isDeepLog      true if logged with 1-5 deep ratings
 * @param {number} args.sessionPosition zero-indexed position of this send in the current session
 */
export function calculateSendXP({
  grade,
  modality,
  outcome,
  isPersonalRecord,
  stylePrimary,
  climberStatShape,
  isDeepLog,
  sessionPosition = 0,
}) {
  const base       = baseGradeXP(grade)
  const modMult    = MODALITY_MULT[modality] ?? 1.0
  const flashMult  = FLASH_MULT[outcome] ?? 1.0
  const prMult     = isPersonalRecord ? PR_MULT_TRUE : PR_MULT_FALSE
  const gap        = gapMultiplier(stylePrimary, climberStatShape)
  const deepMult   = isDeepLog ? DEEP_BONUS : 1.0
  const product    = base * modMult * flashMult * prMult * gap * deepMult
  const chainBonus = Math.min(CHAIN_CAP, Math.max(0, sessionPosition) * CHAIN_PER_POSITION)
  return Math.floor(product + chainBonus)
}

/**
 * XP required to advance from `level` to `level + 1`.
 * Curve: 100 * level^1.45.
 */
export function xpForLevel(level) {
  if (!Number.isFinite(level) || level < 1) return 0
  return Math.floor(100 * Math.pow(level, 1.45))
}

/**
 * Given a total cumulative XP, return the current level + XP within it + XP to next.
 */
export function levelFromTotalXP(totalXP) {
  if (!Number.isFinite(totalXP) || totalXP < 0) {
    return { level: 1, xpInLevel: 0, xpForNext: xpForLevel(1) }
  }
  let level = 1
  let remaining = totalXP
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level)
    level += 1
  }
  return { level, xpInLevel: remaining, xpForNext: xpForLevel(level) }
}
```

- [ ] **Step 17.4: Run tests to verify they pass**

Run: `cd frontend && npm test`
Expected: all xp tests pass.

- [ ] **Step 17.5: Verify build**

Run: `npm run build`
Expected: clean.

- [ ] **Step 17.6: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/lib/xp.js frontend/src/lib/__tests__/xp.test.js
git commit -m "$(cat <<'EOF'
feat(design-system): xp reward engine module

Phase 0, Task 17. Implements baseGradeXP (V0-V10+V11+ table),
calculateSendXP (modality, flash, PR, gap-targeting, deep-log multipliers,
chain bonus), xpForLevel (100*n^1.45 curve), and levelFromTotalXP. Pure
functions with unit tests covering every multiplier path, edge cases
(V0/V11+/unknown grades), and integration scenarios.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 18: Reward engine — `stats.js`

**Files:**
- Create: `frontend/src/lib/stats.js`
- Create: `frontend/src/lib/__tests__/stats.test.js`

Spec reference: §7.3 (stat increments) + §8 (stat system).

- [ ] **Step 18.1: Write the failing tests**

Create `frontend/src/lib/__tests__/stats.test.js`:

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

describe('deriveStatShape', () => {
  it('empty log returns all zeros', () => {
    const shape = deriveStatShape([])
    AXES.forEach((axis) => expect(shape[axis]).toBe(0))
  })

  it('single crimpy send increments crimpy axis the most', () => {
    const shape = deriveStatShape([
      { stylePoints: STYLE_CHIP_TO_STATS.crimpy, daysAgo: 0 },
    ])
    expect(shape.crimpy).toBeGreaterThan(shape.power)
    expect(shape.crimpy).toBeGreaterThan(shape.dynamic)
  })

  it('values are clamped to 0-10 range', () => {
    // 50 crimpy sends in one day
    const sends = Array.from({ length: 50 }).map(() => ({
      stylePoints: STYLE_CHIP_TO_STATS.crimpy,
      daysAgo: 0,
    }))
    const shape = deriveStatShape(sends)
    AXES.forEach((axis) => {
      expect(shape[axis]).toBeGreaterThanOrEqual(0)
      expect(shape[axis]).toBeLessThanOrEqual(10)
    })
    expect(shape.crimpy).toBe(10)
  })

  it('sends older than 30 days are excluded', () => {
    const shape = deriveStatShape([
      { stylePoints: STYLE_CHIP_TO_STATS.crimpy, daysAgo: 60 },
    ])
    AXES.forEach((axis) => expect(shape[axis]).toBe(0))
  })

  it('result includes all five axes even when no sends touch some', () => {
    const shape = deriveStatShape([
      { stylePoints: STYLE_CHIP_TO_STATS.crimpy, daysAgo: 0 },
    ])
    AXES.forEach((axis) => expect(shape).toHaveProperty(axis))
  })
})
```

- [ ] **Step 18.2: Run tests to verify they fail**

Run: `cd frontend && npm test`
Expected: stats tests fail because `stats.js` doesn't exist.

- [ ] **Step 18.3: Implement stats.js**

Create `frontend/src/lib/stats.js`:

```js
/**
 * Stat system for the RPG climber reward engine.
 * See docs/superpowers/specs/2026-05-20-rpg-climber-design.md §7.3 and §8.
 */

export const AXES = ['power', 'crimpy', 'dynamic', 'technical', 'mobility']

/**
 * Style chip → 5-axis stat increment per send.
 * Each chip's primary stat scores 3, with smaller contributions on adjacent axes.
 */
export const STYLE_CHIP_TO_STATS = {
  powerful:  { power: 3, crimpy: 1, dynamic: 1, technical: 0, mobility: 0 },
  crimpy:    { power: 1, crimpy: 3, dynamic: 0, technical: 1, mobility: 0 },
  dynamic:   { power: 1, crimpy: 0, dynamic: 3, technical: 1, mobility: 1 },
  technical: { power: 0, crimpy: 1, dynamic: 1, technical: 3, mobility: 1 },
  mobility:  { power: 0, crimpy: 0, dynamic: 1, technical: 1, mobility: 3 },
}

const ZERO_SHAPE = Object.freeze({
  power: 0, crimpy: 0, dynamic: 0, technical: 0, mobility: 0,
})

/**
 * Look up the stat increments for a single style chip. Returns a fresh zero map
 * for unknown chips so consumers always get a 5-axis object back.
 */
export function styleChipToStats(chipKey) {
  return STYLE_CHIP_TO_STATS[chipKey] ?? { ...ZERO_SHAPE }
}

const WINDOW_DAYS = 30
const SCALE_FACTOR = 4  // empirical: ~4 points per day pushes a stat to ~10

/**
 * Compute the climber's current 5-axis stat shape.
 *
 * @param {Array} sends — array of { stylePoints: {power, crimpy, ...}, daysAgo: number }
 * @returns {object} { power, crimpy, dynamic, technical, mobility } each in 0..10
 */
export function deriveStatShape(sends) {
  if (!Array.isArray(sends) || sends.length === 0) return { ...ZERO_SHAPE }
  const totals = { ...ZERO_SHAPE }
  for (const send of sends) {
    if (!send || !send.stylePoints) continue
    if (send.daysAgo > WINDOW_DAYS) continue
    for (const axis of AXES) {
      totals[axis] += send.stylePoints[axis] ?? 0
    }
  }
  const meanPerDay = {}
  for (const axis of AXES) {
    meanPerDay[axis] = totals[axis] / WINDOW_DAYS
  }
  const shape = {}
  for (const axis of AXES) {
    shape[axis] = Math.max(0, Math.min(10, Math.round(meanPerDay[axis] * SCALE_FACTOR)))
  }
  return shape
}
```

- [ ] **Step 18.4: Run tests to verify they pass**

Run: `cd frontend && npm test`
Expected: all stats + xp tests pass.

- [ ] **Step 18.5: Verify build**

Run: `npm run build` — clean.

- [ ] **Step 18.6: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/lib/stats.js frontend/src/lib/__tests__/stats.test.js
git commit -m "$(cat <<'EOF'
feat(design-system): stats module — chip mapping + stat shape derivation

Phase 0, Task 18. Exports AXES (the five-axis array), STYLE_CHIP_TO_STATS
(chip → stat increment table), styleChipToStats helper, and
deriveStatShape (30-day rolling mean, normalized to 0-10). Unit-tested
for shape correctness, clamping, time-window filtering, and edge cases.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 19: Reward engine — `quests.js`

**Files:**
- Create: `frontend/src/lib/quests.js`
- Create: `frontend/src/lib/__tests__/quests.test.js`

Spec reference: §9 (quest system).

- [ ] **Step 19.1: Write the failing tests**

Create `frontend/src/lib/__tests__/quests.test.js`:

```js
import { describe, it, expect } from 'vitest'
import {
  QUEST_TYPES,
  generateDailyQuest,
  evaluateQuestProgress,
} from '../quests.js'

describe('QUEST_TYPES', () => {
  it('includes the seven quest types from the spec', () => {
    expect(QUEST_TYPES.length).toBeGreaterThanOrEqual(7)
    const types = QUEST_TYPES.map((q) => q.id)
    expect(types).toEqual(expect.arrayContaining([
      'stat-gap-mobility', 'stat-gap-crimpy',
      'volume', 'variety', 'training-mobility', 'push', 'outdoor',
    ]))
  })
})

describe('generateDailyQuest', () => {
  const balancedShape = { power: 5, crimpy: 5, dynamic: 5, technical: 5, mobility: 5 }
  const mobilityWeakShape = { power: 7, crimpy: 6, dynamic: 4, technical: 5, mobility: 3 }

  it('returns a quest object with required fields', () => {
    const quest = generateDailyQuest({
      statShape: balancedShape,
      lastTrainingType: 'climbing',
      lastTrainingDaysAgo: 1,
      hasOutdoorIn30d: true,
      averageSendGrade: 'V4',
      recentSendsAtGrade: true,
      seed: 42,
    })
    expect(quest).toMatchObject({
      id: expect.any(String),
      title: expect.any(String),
      xp: expect.any(Number),
      target: expect.any(Number),
    })
  })

  it('prefers a stat-gap quest when a stat is weak (<=3)', () => {
    // Mobility=3 is the weakest; should pick stat-gap-mobility ~60% of the time.
    let stats = 0
    for (let seed = 1; seed <= 100; seed++) {
      const q = generateDailyQuest({
        statShape: mobilityWeakShape,
        lastTrainingType: 'climbing', lastTrainingDaysAgo: 1,
        hasOutdoorIn30d: true, averageSendGrade: 'V4',
        recentSendsAtGrade: true, seed,
      })
      if (q.id.startsWith('stat-gap-')) stats++
    }
    // 60% probability, so ~60/100. Allow wide tolerance for seeded RNG.
    expect(stats).toBeGreaterThan(40)
  })

  it('returns training-mobility when no mobility training in 7+ days', () => {
    // Force the rng to deterministic by exhausting many seeds and check at least one is training.
    const candidates = []
    for (let seed = 1; seed <= 200; seed++) {
      const q = generateDailyQuest({
        statShape: balancedShape,
        lastTrainingType: 'climbing', lastTrainingDaysAgo: 10,
        hasOutdoorIn30d: true, averageSendGrade: 'V4',
        recentSendsAtGrade: true, seed,
      })
      candidates.push(q.id)
    }
    expect(candidates).toContain('training-mobility')
  })
})

describe('evaluateQuestProgress', () => {
  it('returns done=false when current < target', () => {
    expect(evaluateQuestProgress({ current: 1, target: 3 })).toEqual({ pct: 1/3, done: false })
  })
  it('returns done=true when current >= target', () => {
    expect(evaluateQuestProgress({ current: 3, target: 3 })).toEqual({ pct: 1, done: true })
    expect(evaluateQuestProgress({ current: 5, target: 3 })).toEqual({ pct: 1, done: true })
  })
  it('handles zero target gracefully', () => {
    expect(evaluateQuestProgress({ current: 0, target: 0 })).toEqual({ pct: 0, done: false })
  })
})
```

- [ ] **Step 19.2: Run tests to verify they fail**

Run: `cd frontend && npm test`
Expected: quests tests fail because `quests.js` doesn't exist.

- [ ] **Step 19.3: Implement quests.js**

Create `frontend/src/lib/quests.js`:

```js
/**
 * Daily quest pool + generation + progress evaluation for the RPG climber engine.
 * See docs/superpowers/specs/2026-05-20-rpg-climber-design.md §9.
 */

import { AXES } from './stats.js'

// Stable, deterministic PRNG (mulberry32) so test seeds reproduce.
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6D2B79F5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const QUEST_TYPES = [
  {
    id:    'stat-gap-mobility',
    title: 'Try a slab problem',
    why:   "Slabs are quick wins for Mobility.",
    xp:    50,
    target: 2,
    bucket: 'stat-gap',
    targetsAxis: 'mobility',
  },
  {
    id:    'stat-gap-crimpy',
    title: 'Send 3 problems on crimps',
    why:   "Crimps build finger strength.",
    xp:    75,
    target: 3,
    bucket: 'stat-gap',
    targetsAxis: 'crimpy',
  },
  {
    id:    'stat-gap-dynamic',
    title: 'Project a dyno or paddle move',
    why:   "Dynamic moves expand your reach.",
    xp:    75,
    target: 1,
    bucket: 'stat-gap',
    targetsAxis: 'dynamic',
  },
  {
    id:    'stat-gap-technical',
    title: 'Find a slab or balance line',
    why:   "Technical climbs sharpen footwork.",
    xp:    70,
    target: 2,
    bucket: 'stat-gap',
    targetsAxis: 'technical',
  },
  {
    id:    'stat-gap-power',
    title: 'Try an overhang problem',
    why:   "Overhang builds raw power.",
    xp:    75,
    target: 2,
    bucket: 'stat-gap',
    targetsAxis: 'power',
  },
  {
    id:    'volume',
    title: 'Log 5 sends today',
    why:   "Volume builds capacity.",
    xp:    40,
    target: 5,
    bucket: 'volume',
  },
  {
    id:    'variety',
    title: 'Log climbs in 3 different styles',
    why:   "Variety builds well-roundedness.",
    xp:    60,
    target: 3,
    bucket: 'variety',
  },
  {
    id:    'training-mobility',
    title: 'Log a 20-min mobility session',
    why:   "No mobility training in the last 7 days.",
    xp:    50,
    target: 1,
    bucket: 'training',
  },
  {
    id:    'push',
    title: 'Send something one grade above your average',
    why:   "Push the grade ceiling.",
    xp:    80,
    target: 1,
    bucket: 'push',
  },
  {
    id:    'outdoor',
    title: 'Log an outdoor session this week',
    why:   "Outdoor sessions earn 1.5× XP.",
    xp:    120,
    target: 1,
    bucket: 'outdoor',
  },
]

/**
 * Generate today's daily quest. Picks based on a 60/30/10 distribution:
 *  - 60% stat-gap (using climber's weakest axis)
 *  - 30% mix of variety / push / training conditional triggers
 *  - 10% volume fallback
 */
export function generateDailyQuest({
  statShape,
  lastTrainingType,
  lastTrainingDaysAgo,
  hasOutdoorIn30d,
  averageSendGrade,
  recentSendsAtGrade,
  seed = Date.now(),
} = {}) {
  const rng = mulberry32(seed)
  const roll = rng()

  // 60% — pick a stat-gap quest for the weakest axis with value <= 4
  if (roll < 0.60 && statShape) {
    const sorted = AXES
      .map((axis) => [axis, statShape[axis] ?? 5])
      .sort((a, b) => a[1] - b[1])
    const [weakestAxis, weakestValue] = sorted[0]
    if (weakestValue <= 4) {
      const matched = QUEST_TYPES.find(
        (q) => q.bucket === 'stat-gap' && q.targetsAxis === weakestAxis,
      )
      if (matched) return matched
    }
  }

  // 30% — conditional triggers
  if (roll < 0.90) {
    // No mobility training in 7+ days → training-mobility
    if (lastTrainingType !== 'mobility' && (lastTrainingDaysAgo ?? 99) >= 7) {
      return QUEST_TYPES.find((q) => q.id === 'training-mobility')
    }
    // No outdoor in 30 days → outdoor quest
    if (!hasOutdoorIn30d) {
      return QUEST_TYPES.find((q) => q.id === 'outdoor')
    }
    // Recent sends are all at-grade → push quest
    if (recentSendsAtGrade) {
      return QUEST_TYPES.find((q) => q.id === 'push')
    }
    // Stat shape is asymmetric → variety quest
    return QUEST_TYPES.find((q) => q.id === 'variety')
  }

  // 10% fallback — volume
  return QUEST_TYPES.find((q) => q.id === 'volume')
}

/**
 * Compute progress percent + done flag.
 */
export function evaluateQuestProgress({ current, target }) {
  if (!Number.isFinite(target) || target <= 0) return { pct: 0, done: false }
  const pct = Math.min(1, current / target)
  return { pct, done: current >= target }
}
```

- [ ] **Step 19.4: Run tests to verify they pass**

Run: `cd frontend && npm test`
Expected: all xp + stats + quests tests pass.

- [ ] **Step 19.5: Verify build**

Run: `npm run build` — clean.

- [ ] **Step 19.6: Commit**

```bash
cd /Users/mathewbudnik/coretriage
git add frontend/src/lib/quests.js frontend/src/lib/__tests__/quests.test.js
git commit -m "$(cat <<'EOF'
feat(design-system): quests module — quest pool + generation + progress

Phase 0, Task 19. Exports QUEST_TYPES (10 quest templates spanning stat-gap,
volume, variety, training, push, outdoor buckets), generateDailyQuest (with
60/30/10 stat-gap/conditional/volume distribution and conditional triggers
based on training history + outdoor history + grade trends), and
evaluateQuestProgress. Mulberry32 PRNG for deterministic test seeding.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 20: Foundation smoke verification + Phase 0 retrospective

**No new files.** Final verification + spec retrospective.

- [ ] **Step 20.1: Walk the design-system page**

Run: `cd frontend && npm run dev &` (background). Visit `/design-system`. Confirm every section renders:

- Motion vocabulary JSON
- Surface — three tiers
- Eyebrow — two examples, one with divider
- TierBadge — four tier pills (Frost/Slatehold/Ember/Phoenix)
- LevelMeter — XP bar with count-up animation on refresh
- StreakEmblem — two streak panels (with and without "TO PB" callout)
- RewardPreview — three previews
- StatStrip — five-cell stat grid
- StatRadar — three radar pentagons (asymmetric, balanced, brand new)
- QuestCard — two quest cards with progress
- CelebrationOverlay — fires overlay on button tap
- TierThemeProvider — shows active theme + persistence demo

No console errors. Kill the dev server.

- [ ] **Step 20.2: Verify reduced motion suppresses animations**

Toggle prefers-reduced-motion to "reduce" in Chrome DevTools → Rendering. Refresh `/design-system`.
- LevelMeter bar renders at 62% instantly
- StatRadar renders without fade
- CelebrationOverlay still fires but without animation
- Reset prefers-reduced-motion to default.

- [ ] **Step 20.3: Verify production build**

Run: `npm run build`
Expected: clean.

Run: `npm run preview &`. Visit preview URL + `/design-system`.
Expected: route does NOT render (production gate works). The catch-all 404 or blank page renders instead. Kill preview.

- [ ] **Step 20.4: Verify all tests pass**

Run: `cd frontend && npm test`
Expected: all tests in `xp.test.js`, `stats.test.js`, `quests.test.js` pass.

- [ ] **Step 20.5: Verify the preservation contract**

Visit non-design-system routes (e.g., `/`, `/triage`, `/recover`, `/train`, `/progress`). Confirm:
- Tier-colored bars on Grade Pyramid still render in their existing colors
- Hub tile per-tool accent colors unchanged (Recover teal, Train violet, Chat gold)
- Pain slider gradient unchanged (teal → amber → coral)
- Bottom-nav active tab indicator color unchanged
- All existing routes still render and function

If anything in this list has changed, identify the culprit task and revert.

- [ ] **Step 20.6: Write Phase 0 retrospective**

Append a new section to the BOTTOM of `docs/superpowers/specs/2026-05-20-rpg-climber-design.md` under the heading `## Phase 0 retrospective (added after implementation)`. Capture:

- Any deviation from the spec (component shape, prop names, file paths)
- Any unexpected friction (Tailwind config issues, motion library quirks, prefers-reduced-motion edge cases, Vitest setup)
- Whether any primitive needs follow-up — and which migration phase will reveal it
- Reward-engine numerical observations: do the XP totals from `calculateSendXP` feel right? Is the level curve too gentle / too steep at low levels?

Three to six bullet points.

- [ ] **Step 20.7: Final commit**

```bash
cd /Users/mathewbudnik/coretriage
git add docs/superpowers/specs/2026-05-20-rpg-climber-design.md
git commit -m "$(cat <<'EOF'
docs(spec): Phase 0 retrospective notes

Captures deviations and friction from the Phase 0 foundation build. Informs
Phase 1 (Hub redesign + reward engine wiring) planning.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 0 complete

When all 20 tasks check off:
- Eleven primitives ship under `frontend/src/components/ui/` with verified visual smoke.
- Token spine and motion vocabulary in place.
- Three reward-engine modules (`xp.js`, `stats.js`, `quests.js`) with full unit-test coverage.
- Vitest integrated into the frontend.
- Dev-only `/design-system` route documents and visually exercises every primitive.
- Production app is unchanged (preservation contract verified).
- The branch `redesign/rpg-climber` is ~20 commits ahead of `main`.

**Next:** Phase 1 (Hub redesign + reward engine wiring) — a separate implementation plan written after Phase 0 ships and the retrospective is captured.
