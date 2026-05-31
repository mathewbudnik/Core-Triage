# Triage Redesign · Phase A · Visual Vocabulary + Wizard + Diagnosis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current TriageTab autoscroll wizard + TriageDiagnosis (426 lines) with a single-page progressive-reveal wizard and a post-wizard diagnosis result page, both on the new locked vocabulary: system sans, forest-warm RPG palette, drifting motes, breathing mesh, premium-feeling motion that respects prefers-reduced-motion.

**Architecture:** Pure frontend. New components live in `frontend/src/components/redesign/` to coexist with the legacy `components/triage/` directory until the cut-over (Task 15). Backend payload shape unchanged — the new wizard emits the same `{ region, onset, mechanism, severity, signal_chips, ... }` body that `POST /api/triage` already accepts. No backend changes, no database changes, no engine changes (those come in Phase B).

**Tech Stack:** React 18, Vite, Tailwind CSS (custom `ct-*` token system), framer-motion (already a dep), system sans font stack (no custom font), Vitest 4 for `lib/` unit tests. No `@testing-library/react` — components are verified manually via dev server. Lib logic gets unit tests.

**Spec:** `docs/superpowers/specs/2026-05-31-triage-recover-redesign-design.md`

**Frequency context per design-motion-principles:** Mobile app, occasional-to-daily use → **Jakub primary** (production polish), Emil secondary (frequency gate). All animations gated by `@media (prefers-reduced-motion: no-preference)` in CSS, or `useReducedMotion()` from framer-motion.

---

## File Structure

### Created files (all under `frontend/src/components/redesign/` unless noted)

| File | Responsibility |
|------|---------------|
| `lib/redesignMotion.js` | Duration / easing constants + framer-motion variants used across redesign components |
| `lib/wizardMachine.js` | Pure state machine: `nextStep`, `prevStep`, `isStepAnswered`, `canSubmit`, `serializeAnswers` |
| `lib/__tests__/wizardMachine.test.js` | Unit tests for the state machine |
| `components/redesign/StageFrame.jsx` | Forest-warm bg composition (mesh gradient + motes + grain) — reusable shell |
| `components/redesign/DriftingMotes.jsx` | 5 terra particles, 22s loop |
| `components/redesign/MeshBackground.jsx` | Breathing radial-gradient bg |
| `components/redesign/NoiseGrain.jsx` | SVG noise overlay |
| `components/redesign/ProgressGradientBar.jsx` | Terra→amber animated progress bar with glow |
| `components/redesign/RowChoice.jsx` | Single-select hairline row, terra dot active |
| `components/redesign/ChipChoice.jsx` | Spring-pop chip, single or multi |
| `components/redesign/wizard/WizardTopBar.jsx` | Back / progress / step counter |
| `components/redesign/wizard/WizardDoneRow.jsx` | Collapsed answered question with Edit |
| `components/redesign/wizard/WizardFocusedStep.jsx` | Current question with eyebrow / question / helper / answer slot |
| `components/redesign/wizard/WizardBottomBar.jsx` | Meta + Submit with bloom-on-ready |
| `components/redesign/wizard/RedesignTriageWizard.jsx` | Wizard orchestrator |
| `components/redesign/diagnosis/DiagnosisHero.jsx` | Eyebrow + condition name + meta pills |
| `components/redesign/diagnosis/DiagnosisReasoning.jsx` | Collapsible "Why this might be you" |
| `components/redesign/diagnosis/DiagnosisAlsoPossible.jsx` | Differential chips |
| `components/redesign/diagnosis/DiagnosisActionPlan.jsx` | Right now header + items |
| `components/redesign/diagnosis/DiagnosisCta.jsx` | Primary CTA + re-screen footer |
| `components/redesign/diagnosis/RedesignDiagnosisResult.jsx` | Diagnosis composition |
| `components/redesign/index.js` | Barrel re-exports |

### Modified files

| File | Change |
|------|--------|
| `frontend/tailwind.config.js` | Add 4 new color tokens for the redesign palette |
| `frontend/src/components/TriageTab.jsx` | Swap legacy `SmartTriageCard`/`TriageWizard` imports for `RedesignTriageWizard` |
| `frontend/src/components/RecoverActiveView.jsx` | Swap `TriageDiagnosis` for `RedesignDiagnosisResult` (Phase A renders new diagnosis in existing Recover shell; full Recover redesign is Phase B) |

### Untouched

`components/triage/*` — legacy components stay during transition for safe rollback; their imports are removed in the cut-over task. They get deleted in Phase B when the Recover redesign lands.

---

## Task 1: Add redesign palette tokens

**Files:**
- Modify: `frontend/tailwind.config.js`

The existing config has `ct-terracotta`, `ct-cream`, `ct-forest`, `ct-moss` (a grey-green at `#95a698`), plus accent3 (amber at `#fbbf24`). The redesign needs warmer cream, deeper forest base for the mesh gradient, a true confirmation moss-green, and a refined amber. We add new tokens — we do **not** rename existing ones (the rest of the app still references them).

- [ ] **Step 1: Read the current Tailwind config**

Run: `cat frontend/tailwind.config.js`
Expected: see the existing `ct: { ... }` block (lines 15-27).

- [ ] **Step 2: Add the new tokens**

Edit `frontend/tailwind.config.js`. Inside the `ct: { ... }` block, after the existing `'terra-tint'` line, add:

```js
          // Redesign 2026-05-31 — palette additions for the triage/recover redesign.
          // Existing ct-* tokens are kept intact so the rest of the app keeps rendering.
          'cream-warm':   '#efe7d6',   // Hero text on dark redesign surfaces
          'forest-base':  '#0e1714',   // Deep forest base for mesh gradient
          'forest-mid':   '#2c4a3a',   // Bottom radial gradient stop
          'ember-shadow': '#3a2a1f',   // Top-right radial gradient stop
          'moss-active':  '#6b9a7a',   // Confirmation green (Better state, phase advance)
          'amber-warm':   '#f4b53c',   // Streak chip, progress gradient end
```

- [ ] **Step 3: Verify Tailwind picks up the new tokens**

Run: `cd frontend && npx tailwindcss --content "./src/**/*.{js,jsx}" --config tailwind.config.js -o /tmp/tw-check.css 2>&1 | head -5`
Expected: builds without errors. Then `grep -c "ct-moss-active\|ct-cream-warm\|ct-forest-base\|ct-amber-warm" /tmp/tw-check.css` returns `0` (no usage yet — that's correct).

- [ ] **Step 4: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/tailwind.config.js
git -C /Users/mathewbudnik/coretriage commit -m "feat(palette): add 6 redesign tokens (cream-warm, forest-base/mid, ember-shadow, moss-active, amber-warm)"
```

---

## Task 2: Motion constants module

**Files:**
- Create: `frontend/src/lib/redesignMotion.js`
- Create: `frontend/src/lib/__tests__/redesignMotion.test.js`

Centralize durations, easings, and framer-motion variants so every redesign component pulls from the same source. Per design-motion-principles: Jakub-weighted polish; Emil-weighted restraint on high-frequency interactions.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/lib/__tests__/redesignMotion.test.js`:

```js
import { describe, it, expect } from 'vitest'
import {
  EASE_OUT_GENTLE,
  EASE_OUT_SPRINGY,
  EASE_IN_QUICK,
  DUR,
  riseVariant,
  exitVariant,
  chipPopKeyframes,
} from '../redesignMotion'

describe('redesignMotion', () => {
  it('exposes the three easing curves as cubic-bezier arrays', () => {
    expect(EASE_OUT_GENTLE).toEqual([0.2, 0, 0, 1])
    expect(EASE_OUT_SPRINGY).toEqual([0.34, 1.3, 0.34, 1])
    expect(EASE_IN_QUICK).toEqual([0.4, 0, 1, 0.6])
  })

  it('exposes named durations in seconds (framer-motion convention)', () => {
    expect(DUR.press).toBe(0.12)
    expect(DUR.hover).toBe(0.16)
    expect(DUR.exit).toBe(0.32)
    expect(DUR.chipPop).toBe(0.38)
    expect(DUR.enter).toBe(0.54)
    expect(DUR.progress).toBe(0.54)
    expect(DUR.bloom).toBe(0.72)
  })

  it('riseVariant matches the spec (opacity + translateY + blur)', () => {
    expect(riseVariant.initial).toEqual({ opacity: 0, y: 12, filter: 'blur(6px)' })
    expect(riseVariant.animate.opacity).toBe(1)
    expect(riseVariant.animate.y).toBe(0)
    expect(riseVariant.animate.filter).toBe('blur(0px)')
    expect(riseVariant.animate.transition.duration).toBe(DUR.enter)
    expect(riseVariant.animate.transition.ease).toEqual(EASE_OUT_GENTLE)
  })

  it('exitVariant is subtler than enter (Jakub: exits subtler)', () => {
    expect(exitVariant.opacity).toBe(0)
    expect(exitVariant.y).toBe(-8)
    expect(exitVariant.scale).toBe(0.985)
    expect(exitVariant.filter).toBe('blur(4px)')
    expect(exitVariant.transition.duration).toBe(DUR.exit)
    expect(exitVariant.transition.ease).toEqual(EASE_IN_QUICK)
  })

  it('chipPopKeyframes has 3 stops with overshoot at 60%', () => {
    expect(chipPopKeyframes.scale).toEqual([0.94, 1.04, 1])
    expect(chipPopKeyframes.transition.duration).toBe(DUR.chipPop)
    expect(chipPopKeyframes.transition.ease).toEqual(EASE_OUT_SPRINGY)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/lib/__tests__/redesignMotion.test.js`
Expected: FAIL — `Cannot find module '../redesignMotion'`.

- [ ] **Step 3: Implement the module**

Create `frontend/src/lib/redesignMotion.js`:

```js
// Motion constants for the triage/recover redesign. Centralized so every
// redesign component pulls from the same source. Per design-motion-principles:
// Jakub-weighted polish (mobile app, occasional use) + Emil-weighted restraint
// on high-frequency moments. See spec section "Motion vocabulary".

export const EASE_OUT_GENTLE  = [0.2, 0, 0, 1]
export const EASE_OUT_SPRINGY = [0.34, 1.3, 0.34, 1]
export const EASE_IN_QUICK    = [0.4, 0, 1, 0.6]

export const DUR = {
  press:    0.12,
  hover:    0.16,
  exit:     0.32,
  chipPop:  0.38,
  enter:    0.54,
  progress: 0.54,
  bloom:    0.72,
}

export const riseVariant = {
  initial: { opacity: 0, y: 12, filter: 'blur(6px)' },
  animate: {
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { duration: DUR.enter, ease: EASE_OUT_GENTLE },
  },
}

export const exitVariant = {
  opacity: 0, y: -8, scale: 0.985, filter: 'blur(4px)',
  transition: { duration: DUR.exit, ease: EASE_IN_QUICK },
}

export const chipPopKeyframes = {
  scale: [0.94, 1.04, 1],
  transition: { duration: DUR.chipPop, ease: EASE_OUT_SPRINGY },
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/lib/__tests__/redesignMotion.test.js`
Expected: PASS — `6 passed`.

- [ ] **Step 5: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/lib/redesignMotion.js frontend/src/lib/__tests__/redesignMotion.test.js
git -C /Users/mathewbudnik/coretriage commit -m "feat(motion): redesignMotion module — eases, durations, framer variants"
```

---

## Task 3: MeshBackground component

**Files:**
- Create: `frontend/src/components/redesign/MeshBackground.jsx`

Layered radial gradients with a 24s breathing animation (`--mesh-x` shift). All motion gated by `prefers-reduced-motion`.

- [ ] **Step 1: Create the component**

Create `frontend/src/components/redesign/MeshBackground.jsx`:

```jsx
// Forest-warm mesh gradient background. Two radial gradients layered over a
// deep-forest base. CSS custom properties drive a 24s breathing animation;
// imperceptible per-frame, gives the bg presence over time. Disabled under
// prefers-reduced-motion.

export default function MeshBackground({ className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 mesh-bg motion-reduce:animate-none ${className}`}
      style={{
        background: [
          'radial-gradient(110% 50% at var(--mesh-x, 50%) 100%, #2c4a3a 0%, transparent 55%)',
          'radial-gradient(70% 35% at var(--mesh-x2, 92%) 0%, #3a2a1f 0%, transparent 60%)',
          '#0e1714',
        ].join(', '),
      }}
    />
  )
}
```

- [ ] **Step 2: Add the keyframes to index.css**

Edit `frontend/src/index.css`. Append at the end:

```css
/* Triage redesign — mesh-bg breathing animation.
   --mesh-x shifts 50% → 58% over 24s, --mesh-x2 shifts 92% → 86%.
   Disabled under prefers-reduced-motion (Tailwind motion-reduce variant
   also kills the keyframe name). */
@media (prefers-reduced-motion: no-preference) {
  .mesh-bg {
    animation: meshBreathe 24s ease-in-out infinite alternate;
  }
}
@keyframes meshBreathe {
  0%   { --mesh-x: 50%; --mesh-x2: 92%; }
  100% { --mesh-x: 58%; --mesh-x2: 86%; }
}
```

- [ ] **Step 3: Visual smoke test**

Run: `cd frontend && npm run dev` (background it or open a separate terminal).
Open `http://localhost:5173/__mesh-test` — actually, we don't have a test route yet. Instead, temporarily import MeshBackground into `App.jsx` or any always-rendered surface, observe the gradient renders. **Revert that temp import before committing.** Verify in browser: dark green base with a warmer gradient bottom-center and an ember tint top-right.

- [ ] **Step 4: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/components/redesign/MeshBackground.jsx frontend/src/index.css
git -C /Users/mathewbudnik/coretriage commit -m "feat(redesign): MeshBackground component + breathing keyframe"
```

---

## Task 4: DriftingMotes component

**Files:**
- Create: `frontend/src/components/redesign/DriftingMotes.jsx`

5 terra particles, 22s loop with staggered delays. Each rises once, fades out, re-enters.

- [ ] **Step 1: Create the component**

Create `frontend/src/components/redesign/DriftingMotes.jsx`:

```jsx
// Drifting terra motes — 5 small radial-gradient dots rising from below.
// 22s loop with staggered delays so they're never in sync. Ambient warmth,
// not a status indicator (Emil anti-pattern: no pulsing dots). Disabled
// under prefers-reduced-motion.

const MOTES = [
  { left: '12%', delay:  '0s', size: 2 },
  { left: '78%', delay:  '7s', size: 3 },
  { left: '38%', delay: '13s', size: 2 },
  { left: '64%', delay: '18s', size: 4 },
  { left: '22%', delay: '21s', size: 2 },
]

export default function DriftingMotes({ className = '' }) {
  return (
    <div aria-hidden="true" className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {MOTES.map((m, i) => (
        <span
          key={i}
          className="mote motion-reduce:hidden"
          style={{
            left: m.left,
            width: `${m.size}px`,
            height: `${m.size}px`,
            animationDelay: m.delay,
          }}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Add mote styles to index.css**

Edit `frontend/src/index.css`. Append at the end:

```css
/* Triage redesign — drifting motes. */
.mote {
  position: absolute;
  bottom: -10px;
  border-radius: 9999px;
  background: radial-gradient(circle, #d97757 0%, transparent 70%);
  opacity: 0;
}
@media (prefers-reduced-motion: no-preference) {
  .mote { animation: moteDrift 22s linear infinite; }
}
@keyframes moteDrift {
  0%   { transform: translateY(0)    translateX(0);  opacity: 0; }
  10%  { opacity: 0.7; }
  50%  { transform: translateY(-360px) translateX(8px); opacity: 0.6; }
  90%  { opacity: 0.4; }
  100% { transform: translateY(-720px) translateX(-6px); opacity: 0; }
}
```

- [ ] **Step 3: Visual smoke test**

Temporarily render `<MeshBackground />` + `<DriftingMotes />` inside a 400×700 container in an existing dev surface. Observe 5 terra dots rising from below at staggered times. Revert temp render.

- [ ] **Step 4: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/components/redesign/DriftingMotes.jsx frontend/src/index.css
git -C /Users/mathewbudnik/coretriage commit -m "feat(redesign): DriftingMotes component + drift keyframes"
```

---

## Task 5: NoiseGrain + StageFrame composition

**Files:**
- Create: `frontend/src/components/redesign/NoiseGrain.jsx`
- Create: `frontend/src/components/redesign/StageFrame.jsx`

SVG noise overlay (static, just texture) + a reusable `StageFrame` that composes Mesh + Motes + Grain into a single full-page shell.

- [ ] **Step 1: Create NoiseGrain**

Create `frontend/src/components/redesign/NoiseGrain.jsx`:

```jsx
// SVG noise overlay — static texture, 4% opacity, overlay blend mode.
// Reduces the flat-color CG feel on dark surfaces. Not animated.

const NOISE_SVG =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>" +
  "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/>" +
  "<feColorMatrix values='0 0 0 0 0.95   0 0 0 0 0.91   0 0 0 0 0.84   0 0 0 0.04 0'/></filter>" +
  "<rect width='100%' height='100%' filter='url(%23n)'/></svg>\")"

export default function NoiseGrain({ className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{
        backgroundImage: NOISE_SVG,
        opacity: 0.55,
        mixBlendMode: 'overlay',
      }}
    />
  )
}
```

- [ ] **Step 2: Create StageFrame**

Create `frontend/src/components/redesign/StageFrame.jsx`:

```jsx
import MeshBackground from './MeshBackground'
import DriftingMotes from './DriftingMotes'
import NoiseGrain from './NoiseGrain'

// Full-bleed forest-warm stage. Mesh gradient + drifting motes + noise grain
// stacked underneath the children. Children should render with their own
// padding; this just provides the canvas.

export default function StageFrame({ children, className = '' }) {
  return (
    <div className={`relative min-h-screen bg-ct-forest-base text-ct-cream-warm ${className}`}>
      <MeshBackground />
      <DriftingMotes />
      <NoiseGrain />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
```

- [ ] **Step 3: Visual smoke test**

Temporarily render `<StageFrame><h1>hello</h1></StageFrame>` in a dev surface. Observe: deep forest base, ambient mesh gradient with two warm radials, 5 drifting dots, faint grain texture, `hello` text on top in cream-warm. Revert temp render.

- [ ] **Step 4: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/components/redesign/NoiseGrain.jsx frontend/src/components/redesign/StageFrame.jsx
git -C /Users/mathewbudnik/coretriage commit -m "feat(redesign): NoiseGrain + StageFrame composition"
```

---

## Task 6: ProgressGradientBar atom

**Files:**
- Create: `frontend/src/components/redesign/ProgressGradientBar.jsx`

Animated terra→amber progress bar with terracotta glow. Width transitions with springy easing.

- [ ] **Step 1: Create the component**

Create `frontend/src/components/redesign/ProgressGradientBar.jsx`:

```jsx
import { motion, useReducedMotion } from 'framer-motion'
import { DUR, EASE_OUT_SPRINGY } from '../../lib/redesignMotion'

// Slim animated progress bar. Terra→amber gradient fill with a soft
// terracotta glow. Width animates with springy easing when `pct` changes.
// `pct` is 0–100. Default height 3px (top-bar context); height prop allows
// 5px for the Recover progress strip.

export default function ProgressGradientBar({ pct, height = 3, className = '' }) {
  const reduce = useReducedMotion()
  const clamped = Math.max(0, Math.min(100, Number(pct) || 0))
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`relative w-full overflow-hidden rounded-full bg-white/[0.07] ${className}`}
      style={{ height: `${height}px` }}
    >
      <motion.div
        className="h-full rounded-full"
        style={{
          background: 'linear-gradient(90deg, #d97757 0%, #f4b53c 100%)',
          boxShadow: '0 0 12px rgba(217, 119, 87, 0.5)',
        }}
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={reduce ? { duration: 0 } : { duration: DUR.progress, ease: EASE_OUT_SPRINGY }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Visual smoke test**

Temporarily render `<div className="p-8"><ProgressGradientBar pct={42} /></div>` in a dev surface. Open browser, observe: bar fills to 42% with a smooth springy width animation, terra→amber gradient, faint terra glow under. Bump `pct` to 75 in code; observe smooth tween. Revert temp render.

- [ ] **Step 3: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/components/redesign/ProgressGradientBar.jsx
git -C /Users/mathewbudnik/coretriage commit -m "feat(redesign): ProgressGradientBar atom"
```

---

## Task 7: RowChoice atom

**Files:**
- Create: `frontend/src/components/redesign/RowChoice.jsx`

Single-select hairline row — clicked row becomes the active answer (terra dot fills + ring). Hover shifts padding-left 4px for affordance. Auto-advances by calling `onSelect` immediately; parent decides whether to move to next step.

- [ ] **Step 1: Create the component**

Create `frontend/src/components/redesign/RowChoice.jsx`:

```jsx
// Single-select row list with hairline separators and a terra dot active state.
// Tap a row → onSelect(option.value) fires immediately. Parent is responsible
// for auto-advance to next wizard step.
//
// Props:
//   options:  Array<{ value: string, label: string, sub?: string }>
//   value:    string | null         — currently selected value
//   onSelect: (value: string) => void
//   label:    string                 — for aria-label on the radiogroup

export default function RowChoice({ options, value, onSelect, label = 'Choose one' }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col">
      {options.map((opt, i) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelect(opt.value)}
            className={[
              'flex items-center justify-between gap-3 py-4 text-left',
              'border-t border-white/[0.06] last:border-b last:border-b-white/[0.06]',
              'transition-[padding-left] duration-200 ease-out hover:pl-1',
              'focus-visible:outline-none focus-visible:bg-white/[0.04]',
            ].join(' ')}
          >
            <span className="min-w-0">
              <span className={`block text-[15.5px] font-bold leading-tight ${active ? 'text-ct-terracotta' : 'text-ct-cream-warm'}`}>
                {opt.label}
              </span>
              {opt.sub && (
                <span className="block text-[11.5px] text-ct-cream-warm/60 leading-snug mt-0.5">
                  {opt.sub}
                </span>
              )}
            </span>
            <span
              aria-hidden="true"
              className={[
                'w-[18px] h-[18px] rounded-full flex-shrink-0',
                'transition-[box-shadow,background] duration-300',
                active
                  ? 'bg-ct-terracotta shadow-[0_0_0_1px_#d97757_inset,0_0_0_4px_rgba(217,119,87,0.20),0_0_14px_rgba(217,119,87,0.35)]'
                  : 'shadow-[0_0_0_1px_rgba(239,231,214,0.22)_inset]',
              ].join(' ')}
            />
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Visual smoke test**

Temporarily render:

```jsx
const [v, setV] = useState(null)
<div className="p-8 bg-ct-forest-base">
  <RowChoice
    label="Onset"
    options={[
      { value: 'sudden',   label: 'Suddenly',  sub: 'A specific move or moment' },
      { value: 'gradual',  label: 'Gradually', sub: 'Built up over days or weeks' },
      { value: 'not_sure', label: 'Not sure',  sub: 'Can’t remember a moment' },
    ]}
    value={v}
    onSelect={setV}
  />
</div>
```

Observe: 3 rows with hairline separators. Hover any → row text shifts right 4px. Click "Gradually" → label turns terra, dot fills with glow + ring. Click "Suddenly" → that row activates, previous resets. Revert temp render.

- [ ] **Step 3: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/components/redesign/RowChoice.jsx
git -C /Users/mathewbudnik/coretriage commit -m "feat(redesign): RowChoice single-select atom"
```

---

## Task 8: ChipChoice atom

**Files:**
- Create: `frontend/src/components/redesign/ChipChoice.jsx`

Pill chip with terra-tinted active state and a spring-pop on activation. Supports single (radio-like) or multi (toggle) mode.

- [ ] **Step 1: Create the component**

Create `frontend/src/components/redesign/ChipChoice.jsx`:

```jsx
import { motion, useReducedMotion } from 'framer-motion'
import { chipPopKeyframes } from '../../lib/redesignMotion'

// Chip set. Single mode = radiogroup, multi mode = checkbox-like.
//
// Props:
//   options:  Array<{ value: string, label: string }>
//   value:    string | string[]
//   onChange: (value | values[]) => void
//   multi:    boolean (default false)
//   label:    string  — aria-label

export default function ChipChoice({ options, value, onChange, multi = false, label = 'Choose' }) {
  const reduce = useReducedMotion()
  const isActive = (v) => (multi ? Array.isArray(value) && value.includes(v) : value === v)
  const handle = (v) => {
    if (multi) {
      const next = isActive(v) ? value.filter((x) => x !== v) : [...(value || []), v]
      onChange(next)
    } else {
      onChange(v)
    }
  }
  return (
    <div role={multi ? 'group' : 'radiogroup'} aria-label={label} className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = isActive(opt.value)
        const base = [
          'px-[15px] py-[11px] rounded-full text-[13px] font-bold',
          'transition-[color,background,box-shadow] duration-200 ease-out',
          'cursor-pointer select-none focus-visible:outline-none',
          active
            ? 'text-ct-terracotta bg-ct-terracotta/[0.10] shadow-[0_0_0_0.5px_#d97757,0_0_14px_rgba(217,119,87,0.28)]'
            : 'text-ct-cream-warm/80 bg-white/[0.025] shadow-[0_0_0_0.5px_rgba(239,231,214,0.16)] hover:text-ct-cream-warm hover:bg-white/[0.05]',
        ].join(' ')
        return (
          <motion.button
            key={opt.value}
            type="button"
            role={multi ? 'checkbox' : 'radio'}
            aria-checked={active}
            onClick={() => handle(opt.value)}
            whileTap={reduce ? undefined : { scale: 0.97 }}
            animate={active && !reduce ? chipPopKeyframes : { scale: 1 }}
            className={base}
          >
            {opt.label}
          </motion.button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Visual smoke test**

Temporarily render in a dev surface:

```jsx
const [vals, setVals] = useState([])
<div className="p-8 bg-ct-forest-base">
  <ChipChoice
    label="Mechanism"
    multi
    options={[
      { value: 'crimp', label: 'Crimping' },
      { value: 'pocket', label: 'Pocket' },
      { value: 'dyno',  label: 'Dynamic move' },
      { value: 'heel',  label: 'Heel hook' },
      { value: 'hb',    label: 'Hangboard' },
    ]}
    value={vals}
    onChange={setVals}
  />
</div>
```

Click "Crimping" — chip pops (scale 0.94 → 1.04 → 1), turns terra-glow. Click again → returns to inactive. Click 2-3 others, they each pop independently. Revert temp render.

- [ ] **Step 3: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/components/redesign/ChipChoice.jsx
git -C /Users/mathewbudnik/coretriage commit -m "feat(redesign): ChipChoice atom (single + multi, spring pop)"
```

---

## Task 9: Wizard state machine

**Files:**
- Create: `frontend/src/lib/wizardMachine.js`
- Create: `frontend/src/lib/__tests__/wizardMachine.test.js`

Pure functions for managing wizard progression. No React, no DOM — testable in lib/.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/lib/__tests__/wizardMachine.test.js`:

```js
import { describe, it, expect } from 'vitest'
import {
  createWizardState,
  setAnswer,
  goToStep,
  nextUnanswered,
  isStepAnswered,
  canSubmit,
  serializeAnswers,
} from '../wizardMachine'

const STEPS = [
  { key: 'onset',     required: true,  type: 'single' },
  { key: 'mechanism', required: true,  type: 'multi'  },
  { key: 'severity',  required: true,  type: 'single' },
  { key: 'extra',     required: false, type: 'single' },
]

describe('createWizardState', () => {
  it('starts focused on first step with empty answers', () => {
    const s = createWizardState(STEPS)
    expect(s.focusedKey).toBe('onset')
    expect(s.answers).toEqual({})
  })
})

describe('setAnswer', () => {
  it('records a value for the given step', () => {
    let s = createWizardState(STEPS)
    s = setAnswer(s, 'onset', 'sudden')
    expect(s.answers.onset).toBe('sudden')
  })

  it('keeps focusedKey on the same step (advance is the caller’s job)', () => {
    let s = createWizardState(STEPS)
    s = setAnswer(s, 'onset', 'sudden')
    expect(s.focusedKey).toBe('onset')
  })

  it('supports array values for multi-type steps', () => {
    let s = createWizardState(STEPS)
    s = setAnswer(s, 'mechanism', ['crimp', 'dyno'])
    expect(s.answers.mechanism).toEqual(['crimp', 'dyno'])
  })
})

describe('isStepAnswered', () => {
  it('false when no answer recorded', () => {
    const s = createWizardState(STEPS)
    expect(isStepAnswered(s, STEPS[0])).toBe(false)
  })

  it('true when single-type has a non-empty string', () => {
    let s = createWizardState(STEPS)
    s = setAnswer(s, 'onset', 'sudden')
    expect(isStepAnswered(s, STEPS[0])).toBe(true)
  })

  it('false when single-type has an empty string', () => {
    let s = createWizardState(STEPS)
    s = setAnswer(s, 'onset', '')
    expect(isStepAnswered(s, STEPS[0])).toBe(false)
  })

  it('true when multi-type has at least one element', () => {
    let s = createWizardState(STEPS)
    s = setAnswer(s, 'mechanism', ['crimp'])
    expect(isStepAnswered(s, STEPS[1])).toBe(true)
  })

  it('false when multi-type has empty array', () => {
    let s = createWizardState(STEPS)
    s = setAnswer(s, 'mechanism', [])
    expect(isStepAnswered(s, STEPS[1])).toBe(false)
  })
})

describe('nextUnanswered', () => {
  it('returns the first step with no answer', () => {
    let s = createWizardState(STEPS)
    s = setAnswer(s, 'onset', 'sudden')
    expect(nextUnanswered(s, STEPS).key).toBe('mechanism')
  })

  it('returns null when all required answered', () => {
    let s = createWizardState(STEPS)
    s = setAnswer(s, 'onset', 'sudden')
    s = setAnswer(s, 'mechanism', ['crimp'])
    s = setAnswer(s, 'severity', '5')
    expect(nextUnanswered(s, STEPS)).toBeNull()
  })

  it('skips optional unanswered steps', () => {
    let s = createWizardState(STEPS)
    s = setAnswer(s, 'onset', 'sudden')
    s = setAnswer(s, 'mechanism', ['crimp'])
    s = setAnswer(s, 'severity', '5')
    // `extra` is optional and unanswered — nextUnanswered ignores it.
    expect(nextUnanswered(s, STEPS)).toBeNull()
  })
})

describe('canSubmit', () => {
  it('false when any required step is unanswered', () => {
    let s = createWizardState(STEPS)
    s = setAnswer(s, 'onset', 'sudden')
    expect(canSubmit(s, STEPS)).toBe(false)
  })

  it('true when all required steps are answered', () => {
    let s = createWizardState(STEPS)
    s = setAnswer(s, 'onset', 'sudden')
    s = setAnswer(s, 'mechanism', ['crimp'])
    s = setAnswer(s, 'severity', '5')
    expect(canSubmit(s, STEPS)).toBe(true)
  })
})

describe('goToStep', () => {
  it('changes focusedKey to the given key', () => {
    let s = createWizardState(STEPS)
    s = goToStep(s, 'severity')
    expect(s.focusedKey).toBe('severity')
  })
})

describe('serializeAnswers', () => {
  it('returns answers in the order defined by steps', () => {
    let s = createWizardState(STEPS)
    s = setAnswer(s, 'mechanism', ['crimp'])
    s = setAnswer(s, 'onset', 'sudden')
    const out = serializeAnswers(s, STEPS)
    expect(Object.keys(out)).toEqual(['onset', 'mechanism', 'severity', 'extra'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/lib/__tests__/wizardMachine.test.js`
Expected: FAIL — `Cannot find module '../wizardMachine'`.

- [ ] **Step 3: Implement the module**

Create `frontend/src/lib/wizardMachine.js`:

```js
// Pure-function state machine for the redesign wizard.
// State shape:
//   { focusedKey: string, answers: { [stepKey]: any } }
//
// Steps definition (passed from the wizard component):
//   Array<{ key: string, required: boolean, type: 'single' | 'multi' }>

export function createWizardState(steps) {
  return {
    focusedKey: steps[0]?.key ?? null,
    answers: {},
  }
}

export function setAnswer(state, stepKey, value) {
  return { ...state, answers: { ...state.answers, [stepKey]: value } }
}

export function goToStep(state, stepKey) {
  return { ...state, focusedKey: stepKey }
}

export function isStepAnswered(state, step) {
  const v = state.answers[step.key]
  if (v === undefined || v === null) return false
  if (step.type === 'multi') return Array.isArray(v) && v.length > 0
  return typeof v === 'string' ? v.length > 0 : true
}

export function nextUnanswered(state, steps) {
  return steps.find((s) => s.required && !isStepAnswered(state, s)) ?? null
}

export function canSubmit(state, steps) {
  return steps.every((s) => !s.required || isStepAnswered(state, s))
}

export function serializeAnswers(state, steps) {
  // Return an object with keys in the order defined by `steps`. Answers for
  // unanswered steps are returned as undefined so callers can fill defaults.
  const out = {}
  for (const s of steps) out[s.key] = state.answers[s.key]
  return out
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/lib/__tests__/wizardMachine.test.js`
Expected: PASS — `12 passed`.

- [ ] **Step 5: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/lib/wizardMachine.js frontend/src/lib/__tests__/wizardMachine.test.js
git -C /Users/mathewbudnik/coretriage commit -m "feat(wizard): pure-fn state machine + 12 unit tests"
```

---

## Task 10: WizardTopBar

**Files:**
- Create: `frontend/src/components/redesign/wizard/WizardTopBar.jsx`

Back arrow, progress bar, step counter — top of every wizard step.

- [ ] **Step 1: Create the component**

Create `frontend/src/components/redesign/wizard/WizardTopBar.jsx`:

```jsx
import { ChevronLeft } from 'lucide-react'
import ProgressGradientBar from '../ProgressGradientBar'

// Top bar for the redesign wizard. Layout: back / progress / step counter.
//
// Props:
//   stepIndex:   number  — 0-based current step
//   totalSteps:  number
//   onBack:      () => void
//   pct:         number  — 0–100 (parent computes from answered count)

export default function WizardTopBar({ stepIndex, totalSteps, onBack, pct }) {
  return (
    <div className="flex items-center gap-3.5 px-5 pt-4 pb-3">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="w-7 h-7 rounded-full flex items-center justify-center text-ct-cream-warm/50 hover:bg-white/[0.06] hover:text-ct-cream-warm transition-colors duration-150"
      >
        <ChevronLeft size={17} strokeWidth={2.4} />
      </button>
      <ProgressGradientBar pct={pct} className="flex-1" />
      <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-ct-cream-warm/45 tabular-nums">
        {stepIndex + 1} / {totalSteps}
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Visual smoke test**

Temporarily render `<WizardTopBar stepIndex={2} totalSteps={7} pct={28} onBack={() => alert('back')} />` in a dev surface inside a forest-bg container. Observe: chevron-left icon on left (cream-warm/50, hover lifts bg), bar fills to 28%, "3 / 7" right. Click back → alerts. Revert.

- [ ] **Step 3: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/components/redesign/wizard/WizardTopBar.jsx
git -C /Users/mathewbudnik/coretriage commit -m "feat(redesign): WizardTopBar (back + progress + counter)"
```

---

## Task 11: WizardDoneRow + WizardFocusedStep

**Files:**
- Create: `frontend/src/components/redesign/wizard/WizardDoneRow.jsx`
- Create: `frontend/src/components/redesign/wizard/WizardFocusedStep.jsx`

Two layout primitives for the progressive-reveal pattern: collapsed summary rows above + focused current question.

- [ ] **Step 1: Create WizardDoneRow**

Create `frontend/src/components/redesign/wizard/WizardDoneRow.jsx`:

```jsx
import { motion, useReducedMotion } from 'framer-motion'
import { riseVariant } from '../../../lib/redesignMotion'

// One collapsed summary row for an answered wizard step.
//
// Props:
//   label:    string  — step name, e.g. "Onset"
//   value:    string  — formatted answer, e.g. "Suddenly" or "Crimping, Dyno"
//   accent:   boolean — render value in terra (used for the region row)
//   onEdit:   () => void

export default function WizardDoneRow({ label, value, accent = false, onEdit }) {
  const reduce = useReducedMotion()
  return (
    <motion.button
      type="button"
      onClick={onEdit}
      variants={reduce ? undefined : riseVariant}
      initial={reduce ? false : 'initial'}
      animate={reduce ? false : 'animate'}
      className="flex items-center justify-between gap-3 py-3 border-b border-white/[0.06] text-left transition-[padding-left] duration-200 hover:pl-1 focus-visible:outline-none focus-visible:bg-white/[0.04]"
    >
      <span className="flex items-baseline gap-2.5 min-w-0">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-ct-cream-warm/40 min-w-[76px]">
          {label}
        </span>
        <span className={`text-[13.5px] font-bold ${accent ? 'text-ct-terracotta' : 'text-ct-cream-warm'}`}>
          {value}
        </span>
      </span>
      <span className="text-[11px] font-bold tracking-wide text-ct-terracotta/60">Edit</span>
    </motion.button>
  )
}
```

- [ ] **Step 2: Create WizardFocusedStep**

Create `frontend/src/components/redesign/wizard/WizardFocusedStep.jsx`:

```jsx
import { motion, useReducedMotion } from 'framer-motion'
import { riseVariant } from '../../../lib/redesignMotion'

// The currently-focused wizard question. Children = the answer widget
// (RowChoice / ChipChoice / pain slider / etc).
//
// Props:
//   eyebrow:  string  — small caps label, e.g. "How it happened"
//   question: React node  — main question (may include <span class="text-ct-terracotta">accent</span>)
//   helper:   string  — secondary copy

export default function WizardFocusedStep({ eyebrow, question, helper, children }) {
  const reduce = useReducedMotion()
  return (
    <motion.section
      key={eyebrow}
      variants={reduce ? undefined : riseVariant}
      initial={reduce ? false : 'initial'}
      animate={reduce ? false : 'animate'}
      className="py-6"
    >
      <div className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-ct-cream-warm/45 mb-2.5">
        {eyebrow}
      </div>
      <h2 className="text-[28px] font-extrabold leading-[1.08] -tracking-[0.025em] text-ct-cream-warm">
        {question}
      </h2>
      <p className="text-[13px] leading-[1.55] text-ct-cream-warm/55 mt-3 max-w-[280px]">{helper}</p>
      <div className="mt-4">{children}</div>
    </motion.section>
  )
}
```

- [ ] **Step 3: Visual smoke test**

In a dev surface, temporarily render:

```jsx
<StageFrame>
  <div className="max-w-[380px] mx-auto px-5">
    <WizardDoneRow label="Region" value="Finger" accent onEdit={() => {}} />
    <WizardDoneRow label="Onset" value="Suddenly" onEdit={() => {}} />
    <WizardFocusedStep
      eyebrow="How it happened"
      question={<>What were you <span className="text-ct-terracotta">doing?</span></>}
      helper="Tap anything that fits. You can pick more than one."
    >
      <ChipChoice
        label="Mechanism"
        multi
        options={[{ value: 'crimp', label: 'Crimping' }, { value: 'dyno', label: 'Dynamic move' }]}
        value={[]}
        onChange={() => {}}
      />
    </WizardFocusedStep>
  </div>
</StageFrame>
```

Observe: 2 done rows up top (cream and terra accent), Edit link right; focused step rises in with the blur+y entrance; question + helper + chips below. Revert.

- [ ] **Step 4: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/components/redesign/wizard/WizardDoneRow.jsx frontend/src/components/redesign/wizard/WizardFocusedStep.jsx
git -C /Users/mathewbudnik/coretriage commit -m "feat(redesign): WizardDoneRow + WizardFocusedStep"
```

---

## Task 12: WizardBottomBar

**Files:**
- Create: `frontend/src/components/redesign/wizard/WizardBottomBar.jsx`

Meta line ("2 left") + Submit pill that blooms when ready.

- [ ] **Step 1: Create the component**

Create `frontend/src/components/redesign/wizard/WizardBottomBar.jsx`:

```jsx
import { motion, useReducedMotion } from 'framer-motion'
import { DUR, EASE_OUT_SPRINGY } from '../../../lib/redesignMotion'

// Wizard bottom bar. Two states for Submit:
//   - disabled: 0.35 opacity, no shadow, pointer-events: none
//   - ready: full opacity + terracotta bloom (warm shadow), springy arrive
//
// Props:
//   remainingCount:  number  — answered/required gap
//   canSubmit:       boolean
//   onSubmit:        () => void
//   ctaLabel:        string  — e.g. "See diagnosis"

export default function WizardBottomBar({ remainingCount, canSubmit, onSubmit, ctaLabel }) {
  const reduce = useReducedMotion()
  return (
    <div className="flex items-center justify-between px-5 py-4 border-t border-white/[0.06]">
      <span className="text-[11.5px] font-bold tracking-wide text-ct-cream-warm/45">
        {remainingCount > 0 ? `${remainingCount} left` : 'Ready'}
      </span>
      <motion.button
        type="button"
        onClick={canSubmit ? onSubmit : undefined}
        disabled={!canSubmit}
        aria-disabled={!canSubmit}
        animate={canSubmit && !reduce
          ? { opacity: 1, scale: [0.94, 1.04, 1], boxShadow: ['0 0 0 rgba(217,119,87,0)', '0 14px 38px rgba(217,119,87,0.55)', '0 8px 24px rgba(217,119,87,0.32)'] }
          : { opacity: canSubmit ? 1 : 0.35, scale: 1 }}
        transition={canSubmit && !reduce ? { duration: DUR.bloom, ease: EASE_OUT_SPRINGY } : { duration: 0.2 }}
        whileTap={canSubmit && !reduce ? { scale: 0.98 } : undefined}
        className={[
          'flex items-center gap-2 px-[22px] py-[11px] rounded-full text-[14.5px] font-extrabold',
          'bg-ct-terracotta text-[#1a1410]',
          !canSubmit && 'cursor-not-allowed',
        ].filter(Boolean).join(' ')}
      >
        {ctaLabel} <span>→</span>
      </motion.button>
    </div>
  )
}
```

- [ ] **Step 2: Visual smoke test**

Temporarily render with two states. First: `<WizardBottomBar remainingCount={2} canSubmit={false} onSubmit={() => {}} ctaLabel="See diagnosis" />`. Observe: "2 left", pill at 0.35 opacity. Then toggle to `canSubmit={true}` (re-render via state). Observe: bloom animation runs — pill scales 0.94 → 1.04 → 1 with a warm terracotta shadow bloom underneath. Revert.

- [ ] **Step 3: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/components/redesign/wizard/WizardBottomBar.jsx
git -C /Users/mathewbudnik/coretriage commit -m "feat(redesign): WizardBottomBar with bloom-on-ready Submit"
```

---

## Task 13: RedesignTriageWizard orchestrator

**Files:**
- Create: `frontend/src/components/redesign/wizard/RedesignTriageWizard.jsx`

Composes top bar + done rows + focused step + bottom bar using the state machine. Emits the same submit payload as the legacy wizard.

This task is bigger than the others — it wires the whole flow. ~150 lines.

- [ ] **Step 1: Create the orchestrator**

Create `frontend/src/components/redesign/wizard/RedesignTriageWizard.jsx`:

```jsx
import { useState, useCallback, useMemo } from 'react'
import StageFrame from '../StageFrame'
import WizardTopBar from './WizardTopBar'
import WizardDoneRow from './WizardDoneRow'
import WizardFocusedStep from './WizardFocusedStep'
import WizardBottomBar from './WizardBottomBar'
import RowChoice from '../RowChoice'
import ChipChoice from '../ChipChoice'
import {
  createWizardState,
  setAnswer,
  goToStep,
  nextUnanswered,
  isStepAnswered,
  canSubmit,
  serializeAnswers,
} from '../../../lib/wizardMachine'

// Step definitions for the redesign wizard. Same payload shape as the
// legacy `SmartTriageCard` so /api/triage stays unchanged.
//
// types: 'single' (RowChoice) | 'multi' (ChipChoice) | 'severity' (RowChoice with 1–10 buckets)
//
// region comes in as a prop (chosen on the prior body-diagram screen);
// the wizard shows it as a fixed done row at the top.

const BASE_STEPS = [
  {
    key: 'onset',
    required: true,
    type: 'single',
    eyebrow: 'Onset',
    question: <>When did it <span className="text-ct-terracotta">start?</span></>,
    helper: 'Roughly when you first noticed the pain or felt the injury happen.',
    options: [
      { value: 'Sudden',  label: 'Suddenly',  sub: 'A specific move or moment' },
      { value: 'Gradual', label: 'Gradually', sub: 'Built up over days or weeks' },
    ],
  },
  {
    key: 'mechanism',
    required: true,
    type: 'multi',
    eyebrow: 'How it happened',
    question: <>What were you <span className="text-ct-terracotta">doing?</span></>,
    helper: 'Tap anything that fits. You can pick more than one.',
    // options injected via prop `mechanisms` at render time
  },
  {
    key: 'severity',
    required: true,
    type: 'single',
    eyebrow: 'Pain right now',
    question: <>How bad does it feel <span className="text-ct-terracotta">right now?</span></>,
    helper: 'Best guess on a 0–10 scale.',
    options: [
      { value: '2',  label: '0–2 mild' },
      { value: '4',  label: '3–4 noticeable' },
      { value: '6',  label: '5–6 moderate' },
      { value: '8',  label: '7–8 sharp' },
      { value: '10', label: '9–10 severe' },
    ],
  },
  {
    key: 'extra',
    required: false,
    type: 'multi',
    eyebrow: 'Anything else',
    question: <>Anything else that <span className="text-ct-terracotta">matters?</span></>,
    helper: 'Optional. Pick any signal chips that apply.',
    // options injected from `signalChips` prop
  },
]

/**
 * Single-page redesign wizard.
 *
 * Props:
 *   region:        string                  — chosen region (e.g. 'Finger')
 *   mechanisms:    Array<{ value, label }> — region-specific mechanism options
 *   signalChips:   Array<{ value, label }> — region-specific extra signal chips
 *   onChangeRegion: () => void              — bound to back arrow on first step
 *   onSubmit:      (payload) => void       — fires when Submit is tapped
 *
 * Payload shape (matches the existing POST /api/triage body):
 *   {
 *     region:        string,
 *     onset:         string,
 *     mechanism:     string[],
 *     severity:      string,
 *     signal_chips:  string[],
 *   }
 */
export default function RedesignTriageWizard({ region, mechanisms = [], signalChips = [], onChangeRegion, onSubmit }) {
  // Inject region-dependent options into the steps array each render.
  const steps = useMemo(() => BASE_STEPS.map((s) => {
    if (s.key === 'mechanism') return { ...s, options: mechanisms }
    if (s.key === 'extra')     return { ...s, options: signalChips }
    return s
  }), [mechanisms, signalChips])

  const [state, setState] = useState(() => createWizardState(steps))
  const focusedStep = steps.find((s) => s.key === state.focusedKey) ?? steps[0]
  const focusedIndex = steps.indexOf(focusedStep)

  const answeredCount = steps.filter((s) => isStepAnswered(state, s)).length
  const requiredCount = steps.filter((s) => s.required).length
  const remaining = Math.max(0, requiredCount - steps.filter((s) => s.required && isStepAnswered(state, s)).length)
  const pct = Math.round((answeredCount / steps.length) * 100)

  // Done rows = the answered steps in order, but always skipping the focused one.
  const doneSteps = steps.filter((s) => isStepAnswered(state, s) && s.key !== state.focusedKey)

  const formatValue = (step) => {
    const v = state.answers[step.key]
    if (Array.isArray(v)) {
      return v.map((val) => step.options?.find((o) => o.value === val)?.label ?? val).join(', ')
    }
    return step.options?.find((o) => o.value === v)?.label ?? String(v ?? '')
  }

  const handleSelect = useCallback((value) => {
    setState((prev) => {
      const next = setAnswer(prev, focusedStep.key, value)
      // For single-select, auto-advance to next unanswered required step.
      if (focusedStep.type === 'single') {
        const advance = nextUnanswered(next, steps)
        if (advance) return goToStep(next, advance.key)
      }
      return next
    })
  }, [focusedStep, steps])

  // Multi-select: only show a "Continue" action by tapping anywhere in the
  // pending hint area. Simpler: when the user taps the "n left" meta line,
  // we advance. For this Phase A we ship the explicit advance via Continue
  // pill alongside chips. See WizardFocusedStep children below.
  const advanceMulti = useCallback(() => {
    setState((prev) => {
      const advance = nextUnanswered(prev, steps)
      if (advance) return goToStep(prev, advance.key)
      return prev
    })
  }, [steps])

  const handleBack = useCallback(() => {
    if (focusedIndex === 0) { onChangeRegion?.(); return }
    setState((prev) => goToStep(prev, steps[focusedIndex - 1].key))
  }, [focusedIndex, steps, onChangeRegion])

  const handleEdit = useCallback((stepKey) => {
    setState((prev) => goToStep(prev, stepKey))
  }, [])

  const handleSubmit = useCallback(() => {
    const ans = serializeAnswers(state, steps)
    onSubmit?.({
      region,
      onset:        ans.onset ?? '',
      mechanism:    Array.isArray(ans.mechanism) ? ans.mechanism : [],
      severity:     ans.severity ?? '',
      signal_chips: Array.isArray(ans.extra) ? ans.extra : [],
    })
  }, [state, steps, region, onSubmit])

  return (
    <StageFrame>
      <div className="max-w-[440px] mx-auto flex flex-col min-h-screen">
        <WizardTopBar
          stepIndex={focusedIndex}
          totalSteps={steps.length}
          onBack={handleBack}
          pct={pct}
        />
        <div className="px-5 flex-1">
          {/* Fixed Region row at top */}
          <WizardDoneRow label="Region" value={region} accent onEdit={() => onChangeRegion?.()} />

          {/* Other answered done rows */}
          {doneSteps.map((s) => (
            <WizardDoneRow
              key={s.key}
              label={s.eyebrow}
              value={formatValue(s)}
              onEdit={() => handleEdit(s.key)}
            />
          ))}

          <WizardFocusedStep
            eyebrow={focusedStep.eyebrow}
            question={focusedStep.question}
            helper={focusedStep.helper}
          >
            {focusedStep.type === 'single' && (
              <RowChoice
                label={focusedStep.eyebrow}
                options={focusedStep.options}
                value={state.answers[focusedStep.key] ?? null}
                onSelect={handleSelect}
              />
            )}
            {focusedStep.type === 'multi' && (
              <>
                <ChipChoice
                  label={focusedStep.eyebrow}
                  multi
                  options={focusedStep.options}
                  value={state.answers[focusedStep.key] ?? []}
                  onChange={(v) => setState((prev) => setAnswer(prev, focusedStep.key, v))}
                />
                <button
                  type="button"
                  onClick={advanceMulti}
                  className="mt-5 text-[12px] font-extrabold uppercase tracking-[0.14em] text-ct-terracotta"
                >
                  Continue →
                </button>
              </>
            )}
          </WizardFocusedStep>
        </div>
        <WizardBottomBar
          remainingCount={remaining}
          canSubmit={canSubmit(state, steps)}
          onSubmit={handleSubmit}
          ctaLabel="See diagnosis"
        />
      </div>
    </StageFrame>
  )
}
```

- [ ] **Step 2: Visual smoke test**

Temporarily mount in `App.jsx` at `/triage-redesign` (a throwaway route — or replace TriageTab content briefly):

```jsx
<RedesignTriageWizard
  region="Finger"
  mechanisms={[
    { value: 'crimp', label: 'Crimping' },
    { value: 'pocket', label: 'Pocket' },
    { value: 'dyno', label: 'Dynamic move' },
    { value: 'heel', label: 'Heel hook' },
    { value: 'hb', label: 'Hangboard' },
  ]}
  signalChips={[
    { value: 'morning_stiffness', label: 'Morning stiffness' },
    { value: 'swelling', label: 'Visible swelling' },
  ]}
  onChangeRegion={() => console.log('change region')}
  onSubmit={(payload) => console.log('submit', payload)}
/>
```

Walk through: tap "Suddenly" → row activates, auto-advances to mechanism, "Onset · Suddenly" appears as done row above with Edit. Pick 2 chips → tap Continue → severity step. Pick severity → bottom Submit pill blooms with warm shadow. Tap Submit → check console for payload. Revert temp mount.

- [ ] **Step 3: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/components/redesign/wizard/RedesignTriageWizard.jsx
git -C /Users/mathewbudnik/coretriage commit -m "feat(redesign): RedesignTriageWizard orchestrator wires full flow"
```

---

## Task 14: Diagnosis components — Hero, Reasoning, AlsoPossible

**Files:**
- Create: `frontend/src/components/redesign/diagnosis/DiagnosisHero.jsx`
- Create: `frontend/src/components/redesign/diagnosis/DiagnosisReasoning.jsx`
- Create: `frontend/src/components/redesign/diagnosis/DiagnosisAlsoPossible.jsx`

Three of the five diagnosis composition pieces. Staggered entrances at 0ms, 80ms, 200ms, 300ms, 380ms.

- [ ] **Step 1: Create DiagnosisHero**

Create `frontend/src/components/redesign/diagnosis/DiagnosisHero.jsx`:

```jsx
import { motion, useReducedMotion } from 'framer-motion'
import { riseVariant, DUR, EASE_OUT_GENTLE } from '../../../lib/redesignMotion'

// Diagnosis hero block: eyebrow → condition name → severity + confidence pills.
//
// Props:
//   confidence:  'most_likely' | 'likely' | 'possible'
//   conditionName: string
//   severity:    'Mild' | 'Moderate' | 'Severe'

const CONFIDENCE_LABEL = {
  most_likely: 'Most likely',
  likely:      'Likely',
  possible:    'Possible',
}

export default function DiagnosisHero({ confidence, conditionName, severity }) {
  const reduce = useReducedMotion()
  const noStagger = (delay) => reduce
    ? false
    : { initial: 'initial', animate: 'animate', variants: { ...riseVariant, animate: { ...riseVariant.animate, transition: { ...riseVariant.animate.transition, delay } } } }

  return (
    <>
      <motion.div {...noStagger(0)} className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-ct-terracotta mb-3">
        {CONFIDENCE_LABEL[confidence] ?? 'Most likely'}
      </motion.div>
      <motion.h1 {...noStagger(0.08)} className="text-[34px] font-extrabold leading-[1.04] -tracking-[0.028em] text-ct-cream-warm mb-3.5">
        {conditionName}
      </motion.h1>
      <motion.div {...noStagger(0.20)} className="flex items-center gap-2 mb-[22px]">
        <span className="px-2.5 py-1 rounded-full text-[10.5px] font-extrabold uppercase tracking-[0.1em] bg-ct-terracotta/15 text-ct-terracotta">{severity}</span>
        <span className="w-[3px] h-[3px] rounded-full bg-ct-cream-warm/20" />
        <span className="px-2.5 py-1 rounded-full text-[10.5px] font-extrabold uppercase tracking-[0.1em] bg-white/[0.07] text-ct-cream-warm/80">{CONFIDENCE_LABEL[confidence]}</span>
      </motion.div>
    </>
  )
}
```

- [ ] **Step 2: Create DiagnosisReasoning**

Create `frontend/src/components/redesign/diagnosis/DiagnosisReasoning.jsx`:

```jsx
import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { riseVariant, DUR, EASE_OUT_GENTLE } from '../../../lib/redesignMotion'

// Collapsible reasoning panel. Click header → chev rotates 90°, signals
// list reveals with opacity + height (auto height via framer's height tween).
//
// Props:
//   signals: Array<{ html: React.ReactNode }>  — one bullet per matching signal
//   delay:   number  — entrance delay (defaults to 0.3 = 300ms per spec)

export default function DiagnosisReasoning({ signals, delay = 0.3 }) {
  const [open, setOpen] = useState(false)
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : 'initial'}
      animate={reduce ? false : 'animate'}
      variants={reduce ? undefined : { ...riseVariant, animate: { ...riseVariant.animate, transition: { ...riseVariant.animate.transition, delay } } }}
      className="border-y border-white/[0.08] py-3.5"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center justify-between w-full text-left"
      >
        <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-ct-cream-warm/55">
          Why this might be you
        </span>
        <motion.span
          aria-hidden="true"
          animate={{ rotate: open ? 90 : 0 }}
          transition={reduce ? { duration: 0 } : { duration: 0.28, ease: EASE_OUT_GENTLE }}
          className="text-ct-cream-warm/40 text-[14px]"
        >
          ›
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.38, ease: EASE_OUT_GENTLE }}
            className="overflow-hidden"
          >
            <ul className="mt-3 flex flex-col gap-2">
              {signals.map((sig, i) => (
                <li key={i} className="flex gap-2.5 text-[13px] leading-[1.45] text-ct-cream-warm/80">
                  <span aria-hidden="true" className="w-[5px] h-[5px] rounded-full bg-ct-terracotta mt-[7px] shrink-0" />
                  <span>{sig.html}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
```

- [ ] **Step 3: Create DiagnosisAlsoPossible**

Create `frontend/src/components/redesign/diagnosis/DiagnosisAlsoPossible.jsx`:

```jsx
import { motion, useReducedMotion } from 'framer-motion'
import { riseVariant } from '../../../lib/redesignMotion'

// Differentials row. 1–2 alternative diagnoses as tappable chips.
//
// Props:
//   options: Array<{ id: string, label: string }>
//   onSelect: (id) => void
//   delay:   number — entrance delay, defaults to 0.38

export default function DiagnosisAlsoPossible({ options, onSelect, delay = 0.38 }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : 'initial'}
      animate={reduce ? false : 'animate'}
      variants={reduce ? undefined : { ...riseVariant, animate: { ...riseVariant.animate, transition: { ...riseVariant.animate.transition, delay } } }}
      className="mt-4"
    >
      <div className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-ct-cream-warm/45 mb-2.5">
        Also possible
      </div>
      <div className="flex gap-2 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect?.(opt.id)}
            className="px-3.5 py-2.5 rounded-full text-[12.5px] font-bold text-ct-cream-warm/70 bg-white/[0.025] shadow-[0_0_0_0.5px_rgba(239,231,214,0.14)] hover:text-ct-cream-warm hover:bg-white/[0.05] transition-colors duration-150"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 4: Visual smoke test**

Temporarily render in a forest-bg surface:

```jsx
<StageFrame>
  <div className="max-w-[380px] mx-auto px-5 pt-6">
    <DiagnosisHero confidence="likely" conditionName="Flexor tendon tenosynovitis" severity="Moderate" />
    <DiagnosisReasoning signals={[
      { html: <><strong className="text-ct-cream-warm">Gradual onset</strong> · pain built over weeks, not from one moment</> },
      { html: <><strong className="text-ct-cream-warm">Diffuse swelling</strong> · whole-finger fullness, not localized</> },
    ]} />
    <DiagnosisAlsoPossible options={[{ id: 'a2', label: 'A2 pulley strain' }, { id: 'pip', label: 'PIP capsulitis' }]} onSelect={(id) => console.log(id)} />
  </div>
</StageFrame>
```

Observe staggered entrance: eyebrow at 0ms, name 80ms, pills 200ms, reasoning border 300ms, also-possible 380ms. Click reasoning → chev rotates 90°, signals reveal. Click an "Also possible" chip → console log. Revert temp render.

- [ ] **Step 5: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/components/redesign/diagnosis/DiagnosisHero.jsx frontend/src/components/redesign/diagnosis/DiagnosisReasoning.jsx frontend/src/components/redesign/diagnosis/DiagnosisAlsoPossible.jsx
git -C /Users/mathewbudnik/coretriage commit -m "feat(redesign): DiagnosisHero + Reasoning + AlsoPossible"
```

---

## Task 15: DiagnosisActionPlan + DiagnosisCta + orchestrator

**Files:**
- Create: `frontend/src/components/redesign/diagnosis/DiagnosisActionPlan.jsx`
- Create: `frontend/src/components/redesign/diagnosis/DiagnosisCta.jsx`
- Create: `frontend/src/components/redesign/diagnosis/RedesignDiagnosisResult.jsx`

The last two pieces + the orchestrator composing all 5.

- [ ] **Step 1: Create DiagnosisActionPlan**

Create `frontend/src/components/redesign/diagnosis/DiagnosisActionPlan.jsx`:

```jsx
import { motion, useReducedMotion } from 'framer-motion'
import { riseVariant } from '../../../lib/redesignMotion'

// Action plan section: small caps header, sub copy, then 4 hairline rows
// each with a small icon, title, sub. Items stagger in at 60ms intervals.
//
// Props:
//   subtitle: string
//   items: Array<{ glyph: string, title: string, sub: string }>
//   headerDelay: number — defaults to 0.48
//   subDelay:    number — defaults to 0.54
//   firstItemDelay: number — defaults to 0.60

export default function DiagnosisActionPlan({ subtitle, items, headerDelay = 0.48, subDelay = 0.54, firstItemDelay = 0.60 }) {
  const reduce = useReducedMotion()
  const delayed = (d) => reduce ? false : { ...riseVariant, animate: { ...riseVariant.animate, transition: { ...riseVariant.animate.transition, delay: d } } }
  return (
    <section className="mt-6">
      <motion.div initial={reduce ? false : 'initial'} animate={reduce ? false : 'animate'} variants={delayed(headerDelay)} className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-ct-cream-warm mb-1.5">
        Right now
      </motion.div>
      <motion.p initial={reduce ? false : 'initial'} animate={reduce ? false : 'animate'} variants={delayed(subDelay)} className="text-[12.5px] text-ct-cream-warm/55 mb-3.5">
        {subtitle}
      </motion.p>
      <div>
        {items.map((it, i) => (
          <motion.div
            key={i}
            initial={reduce ? false : 'initial'}
            animate={reduce ? false : 'animate'}
            variants={delayed(firstItemDelay + i * 0.06)}
            className="flex gap-3.5 py-3.5 border-t border-white/[0.06] last:border-b last:border-b-white/[0.06]"
          >
            <span aria-hidden="true" className="w-[26px] h-[26px] rounded-lg flex items-center justify-center bg-ct-terracotta/10 text-ct-terracotta text-[14px] font-extrabold shadow-[0_0_0_0.5px_rgba(217,119,87,0.30)] shrink-0">
              {it.glyph}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[14px] font-bold text-ct-cream-warm leading-[1.3]">{it.title}</span>
              <span className="block text-[11.5px] text-ct-cream-warm/55 mt-0.5 leading-[1.45]">{it.sub}</span>
            </span>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Create DiagnosisCta**

Create `frontend/src/components/redesign/diagnosis/DiagnosisCta.jsx`:

```jsx
import { motion, useReducedMotion } from 'framer-motion'
import { DUR, EASE_OUT_SPRINGY, riseVariant } from '../../../lib/redesignMotion'

// Big primary CTA + re-screen footer. CTA blooms in at 860ms; footer at 960ms.
//
// Props:
//   ctaLabel:     string
//   onPrimary:    () => void
//   onRescreen:   () => void

export default function DiagnosisCta({ ctaLabel = 'Start your recovery plan', onPrimary, onRescreen }) {
  const reduce = useReducedMotion()
  return (
    <div className="px-5 pt-4 pb-6 border-t border-white/[0.06]">
      <motion.button
        type="button"
        onClick={onPrimary}
        initial={reduce ? false : { opacity: 0, y: 10, scale: 0.96 }}
        animate={reduce ? false : {
          opacity: 1, y: 0,
          scale: [0.96, 1.02, 1],
          boxShadow: ['0 0 0 rgba(217,119,87,0)', '0 14px 38px rgba(217,119,87,0.45)', '0 8px 24px rgba(217,119,87,0.32)'],
          transition: { duration: DUR.bloom, ease: EASE_OUT_SPRINGY, delay: 0.86 },
        }}
        whileTap={reduce ? undefined : { scale: 0.985 }}
        className="w-full flex items-center justify-center gap-2.5 bg-ct-terracotta text-[#1a1410] font-extrabold text-[15px] rounded-2xl py-4"
      >
        {ctaLabel} →
      </motion.button>
      <motion.button
        type="button"
        onClick={onRescreen}
        initial={reduce ? false : 'initial'}
        animate={reduce ? false : 'animate'}
        variants={reduce ? undefined : { ...riseVariant, animate: { ...riseVariant.animate, transition: { ...riseVariant.animate.transition, delay: 0.96 } } }}
        className="block mx-auto mt-3.5 text-[12px] font-bold text-ct-cream-warm/45 hover:text-ct-terracotta transition-colors duration-150"
      >
        Doesn't sound right? Re-screen
      </motion.button>
    </div>
  )
}
```

- [ ] **Step 3: Create RedesignDiagnosisResult**

Create `frontend/src/components/redesign/diagnosis/RedesignDiagnosisResult.jsx`:

```jsx
import StageFrame from '../StageFrame'
import DiagnosisHero from './DiagnosisHero'
import DiagnosisReasoning from './DiagnosisReasoning'
import DiagnosisAlsoPossible from './DiagnosisAlsoPossible'
import DiagnosisActionPlan from './DiagnosisActionPlan'
import DiagnosisCta from './DiagnosisCta'

/**
 * Redesigned diagnosis result. Replaces TriageDiagnosis (426 lines).
 *
 * Props:
 *   result: Triage result object — matches the shape returned by /api/triage:
 *     {
 *       primary: { id: string, label: string, confidence: 'most_likely'|'likely'|'possible', severity: 'Mild'|'Moderate'|'Severe' },
 *       reasoning: Array<{ html: React.ReactNode }> | string[],
 *       differentials: Array<{ id, label }>,
 *       plan: { subtitle: string, items: Array<{ glyph, title, sub }> },
 *     }
 *   onStartPlan:    () => void
 *   onRescreen:     () => void
 *   onSelectAlternative: (id) => void
 *
 * Note: this component assumes the result has been normalized to the shape
 * above by the API client layer. The current /api/triage returns a different
 * shape; the wire-up task (Task 16) adds the adapter.
 */
export default function RedesignDiagnosisResult({ result, onStartPlan, onRescreen, onSelectAlternative }) {
  return (
    <StageFrame>
      <div className="max-w-[440px] mx-auto flex flex-col min-h-screen">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <button type="button" aria-label="Back" className="w-7 h-7 rounded-full flex items-center justify-center text-ct-cream-warm/50 hover:bg-white/[0.06] hover:text-ct-cream-warm transition-colors duration-150">‹</button>
          <span className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-ct-cream-warm/45">Triage complete</span>
          <button type="button" className="text-[11.5px] font-bold text-ct-cream-warm/55 hover:text-ct-cream-warm">Save</button>
        </div>
        <div className="px-5 flex-1">
          <DiagnosisHero
            confidence={result.primary.confidence}
            conditionName={result.primary.label}
            severity={result.primary.severity}
          />
          <DiagnosisReasoning signals={result.reasoning} />
          <DiagnosisAlsoPossible options={result.differentials} onSelect={onSelectAlternative} />
          <DiagnosisActionPlan subtitle={result.plan.subtitle} items={result.plan.items} />
        </div>
        <DiagnosisCta onPrimary={onStartPlan} onRescreen={onRescreen} />
      </div>
    </StageFrame>
  )
}
```

- [ ] **Step 4: Visual smoke test**

Temporarily render with a fixture:

```jsx
const fixture = {
  primary: { id: 'fts', label: 'Flexor tendon tenosynovitis', confidence: 'likely', severity: 'Moderate' },
  reasoning: [
    { html: <><strong className="text-ct-cream-warm">Gradual onset</strong> · pain built over weeks</> },
    { html: <><strong className="text-ct-cream-warm">Diffuse swelling</strong> · whole-finger fullness</> },
  ],
  differentials: [{ id: 'a2', label: 'A2 pulley strain' }, { id: 'pip', label: 'PIP capsulitis' }],
  plan: {
    subtitle: 'Three days minimum before your next climbing session.',
    items: [
      { glyph: '↓', title: 'Drop intensity for 72 hours', sub: 'No crimping, no campus, no max hangs.' },
      { glyph: '~', title: 'Light flexor stretching, 2–3× daily', sub: 'Stop if pain crosses 3/10.' },
      { glyph: '!', title: 'See a hand specialist if it worsens', sub: 'Sharp pain at rest, locking, escalating swelling.' },
      { glyph: '+', title: 'Start your 14-day recovery plan', sub: 'Daily exercises + check-ins.' },
    ],
  },
}
<RedesignDiagnosisResult result={fixture} onStartPlan={() => console.log('start')} onRescreen={() => console.log('rescreen')} onSelectAlternative={(id) => console.log(id)} />
```

Watch the full entrance choreography over ~1 second. Click "Why this might be you" — chev rotates, panel reveals. Click CTA → bloom feedback + console log. Revert temp render.

- [ ] **Step 5: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/components/redesign/diagnosis/DiagnosisActionPlan.jsx frontend/src/components/redesign/diagnosis/DiagnosisCta.jsx frontend/src/components/redesign/diagnosis/RedesignDiagnosisResult.jsx
git -C /Users/mathewbudnik/coretriage commit -m "feat(redesign): DiagnosisActionPlan + Cta + RedesignDiagnosisResult"
```

---

## Task 16: Wire new wizard + diagnosis into TriageTab

**Files:**
- Modify: `frontend/src/components/TriageTab.jsx`

Replace the legacy wizard mount point with `RedesignTriageWizard`. The post-submit nav already routes through Recover via `location.state.triageResult`. We add a result adapter to map the existing API response shape into the new result fixture shape, then render `RedesignDiagnosisResult` from `RecoverActiveView` when nav state contains a diagnosis.

- [ ] **Step 1: Read the current TriageTab**

Run: `cat frontend/src/components/TriageTab.jsx | head -80`
Expected: see the existing wizard render block. Identify where `<SmartTriageCard>` or `<TriageWizard>` is mounted.

- [ ] **Step 2: Create the result adapter**

Create `frontend/src/lib/diagnosisResultAdapter.js`:

```js
// Adapts the legacy /api/triage response into the shape expected by
// RedesignDiagnosisResult. The legacy response has:
//   { buckets: [{ id, label, qualifier, severity, matches_if: [...] }], ... }
// where buckets[0] is the primary and the rest are differentials.

const CONFIDENCE_FROM_QUALIFIER = {
  'most likely': 'most_likely',
  'likely':      'likely',
  'possible':    'possible',
}

const PLAN_GLYPHS = ['↓', '~', '!', '+']

export function adaptDiagnosisResult(apiResult, form = {}) {
  if (!apiResult || !Array.isArray(apiResult.buckets) || apiResult.buckets.length === 0) {
    return null
  }
  const [primary, ...rest] = apiResult.buckets

  return {
    primary: {
      id:         primary.id,
      label:      primary.label,
      confidence: CONFIDENCE_FROM_QUALIFIER[String(primary.qualifier ?? '').toLowerCase()] ?? 'likely',
      severity:   primary.severity ?? 'Moderate',
    },
    reasoning: (primary.matches_if ?? []).map((line) => ({
      html: line,
    })),
    differentials: rest.slice(0, 3).map((b) => ({ id: b.id, label: b.label })),
    plan: {
      subtitle: apiResult.plan?.subtitle ?? planDefaultSubtitle(form.region),
      items: (apiResult.plan?.items ?? defaultPlan(form.region)).map((it, i) => ({
        glyph: PLAN_GLYPHS[i] ?? '+',
        title: it.title,
        sub:   it.sub,
      })),
    },
  }
}

function planDefaultSubtitle(region) {
  return region === 'Finger'
    ? 'Three days minimum before your next climbing session.'
    : 'Reduce load and reassess in 3 days.'
}

function defaultPlan(_region) {
  return [
    { title: 'Drop intensity for 72 hours', sub: 'Avoid the moves that reproduce the pain.' },
    { title: 'Light range-of-motion daily',  sub: 'Stop if pain crosses 3/10.' },
    { title: 'See a specialist if it worsens', sub: 'Sharp pain at rest, locking, escalating swelling.' },
    { title: 'Start your 14-day recovery plan', sub: 'Daily exercises + check-ins.' },
  ]
}
```

- [ ] **Step 3: Write a unit test for the adapter**

Create `frontend/src/lib/__tests__/diagnosisResultAdapter.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { adaptDiagnosisResult } from '../diagnosisResultAdapter'

describe('adaptDiagnosisResult', () => {
  it('returns null when apiResult is null', () => {
    expect(adaptDiagnosisResult(null)).toBeNull()
  })

  it('returns null when buckets is empty', () => {
    expect(adaptDiagnosisResult({ buckets: [] })).toBeNull()
  })

  it('promotes buckets[0] to primary', () => {
    const out = adaptDiagnosisResult({
      buckets: [{ id: 'fts', label: 'Tenosynovitis', qualifier: 'Likely', severity: 'Moderate', matches_if: ['Gradual'] }],
    }, { region: 'Finger' })
    expect(out.primary.id).toBe('fts')
    expect(out.primary.confidence).toBe('likely')
    expect(out.primary.severity).toBe('Moderate')
  })

  it('maps qualifier strings case-insensitively', () => {
    const out = adaptDiagnosisResult({
      buckets: [{ id: 'a', label: 'A', qualifier: 'MOST LIKELY', matches_if: [] }],
    })
    expect(out.primary.confidence).toBe('most_likely')
  })

  it('falls back to likely when qualifier is unknown', () => {
    const out = adaptDiagnosisResult({
      buckets: [{ id: 'a', label: 'A', qualifier: 'mystery', matches_if: [] }],
    })
    expect(out.primary.confidence).toBe('likely')
  })

  it('renders reasoning as array of { html } objects', () => {
    const out = adaptDiagnosisResult({
      buckets: [{ id: 'a', label: 'A', qualifier: 'Likely', matches_if: ['Gradual', 'Diffuse'] }],
    })
    expect(out.reasoning).toEqual([{ html: 'Gradual' }, { html: 'Diffuse' }])
  })

  it('takes up to 3 differentials from buckets[1..]', () => {
    const out = adaptDiagnosisResult({
      buckets: [
        { id: 'a', label: 'A', qualifier: 'Most likely', matches_if: [] },
        { id: 'b', label: 'B', matches_if: [] },
        { id: 'c', label: 'C', matches_if: [] },
        { id: 'd', label: 'D', matches_if: [] },
        { id: 'e', label: 'E', matches_if: [] },
      ],
    })
    expect(out.differentials).toEqual([
      { id: 'b', label: 'B' }, { id: 'c', label: 'C' }, { id: 'd', label: 'D' },
    ])
  })

  it('uses default plan + region-specific subtitle when API has none', () => {
    const out = adaptDiagnosisResult({
      buckets: [{ id: 'a', label: 'A', qualifier: 'Likely', matches_if: [] }],
    }, { region: 'Finger' })
    expect(out.plan.subtitle).toMatch(/Three days minimum/)
    expect(out.plan.items.length).toBe(4)
    expect(out.plan.items[0].glyph).toBe('↓')
    expect(out.plan.items[3].glyph).toBe('+')
  })
})
```

- [ ] **Step 4: Run adapter tests**

Run: `cd frontend && npx vitest run src/lib/__tests__/diagnosisResultAdapter.test.js`
Expected: PASS — `8 passed`.

- [ ] **Step 5: Modify TriageTab to mount the new wizard**

In `frontend/src/components/TriageTab.jsx`, locate the wizard render block. Replace the legacy wizard import + render with:

```jsx
// At top of file, alongside existing imports:
import RedesignTriageWizard from './redesign/wizard/RedesignTriageWizard'

// In the render path that currently mounts SmartTriageCard/TriageWizard
// for the selected region, replace with:
<RedesignTriageWizard
  region={form.region}
  mechanisms={mechanismsForRegion(form.region)}
  signalChips={chipsForRegion(form.region)}
  onChangeRegion={() => onChange('region', '')}
  onSubmit={(payload) => triageSubmit(payload)}
/>
```

Where `mechanismsForRegion` is the existing helper that returns the region's mechanism options. Match the prop names to whatever TriageTab already uses for these (read the file before editing).

- [ ] **Step 6: Modify RecoverActiveView to render RedesignDiagnosisResult**

In `frontend/src/components/RecoverActiveView.jsx`, replace the existing `<TriageDiagnosis result={diagnosis} form={diagnosisForm} />` block with:

```jsx
import RedesignDiagnosisResult from './redesign/diagnosis/RedesignDiagnosisResult'
import { adaptDiagnosisResult } from '../lib/diagnosisResultAdapter'

// In the render, where TriageDiagnosis used to be:
{diagnosis && (() => {
  const adapted = adaptDiagnosisResult(diagnosis, diagnosisForm)
  if (!adapted) return null
  return (
    <RedesignDiagnosisResult
      result={adapted}
      onStartPlan={() => { /* falls through to plan section below */ }}
      onRescreen={() => navigate('/triage')}
      onSelectAlternative={(id) => console.log('select differential', id)}
    />
  )
})()}
```

- [ ] **Step 7: Manual end-to-end test**

Run: `cd frontend && npm run dev`
Open `http://localhost:5173`, navigate to Triage tab. Pick a region (Finger). Walk the wizard: tap an onset row → auto-advances. Pick mechanism chips, tap Continue. Pick a severity. Watch Submit bloom. Tap Submit. Land on Recover with `RedesignDiagnosisResult` rendered with the API's response data. Check Network panel: payload to `/api/triage` matches expected shape.

- [ ] **Step 8: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/lib/diagnosisResultAdapter.js frontend/src/lib/__tests__/diagnosisResultAdapter.test.js frontend/src/components/TriageTab.jsx frontend/src/components/RecoverActiveView.jsx
git -C /Users/mathewbudnik/coretriage commit -m "feat(redesign): wire RedesignTriageWizard + RedesignDiagnosisResult into TriageTab/RecoverActiveView"
```

---

## Task 17: A11y + reduced-motion verification

**Files:**
- Verify: all redesign components

No code changes if nothing is missing — this is an audit task with fixes inline if needed.

- [ ] **Step 1: Verify ARIA roles and labels**

For each interactive component, confirm:

| Component | Required ARIA |
|-----------|--------------|
| `RowChoice` | `role="radiogroup"`, each row `role="radio"` with `aria-checked` |
| `ChipChoice (single)` | `role="radiogroup"`, each chip `role="radio"` |
| `ChipChoice (multi)` | `role="group"`, each chip `role="checkbox"` |
| `ProgressGradientBar` | `role="progressbar"`, `aria-valuenow`/`min`/`max` |
| `DiagnosisReasoning` button | `aria-expanded` reflects open state |
| `WizardTopBar` back button | `aria-label="Back"` |

Run: `grep -rE 'role=|aria-' frontend/src/components/redesign/`
Expected: every interactive element above has the right attribute. Fix any missing.

- [ ] **Step 2: Verify prefers-reduced-motion handling**

For each motion-bearing component, confirm `useReducedMotion()` from framer-motion is consulted and disables motion (or `motion-reduce:` Tailwind variants on CSS animations).

Run: `grep -rn 'useReducedMotion\|motion-reduce' frontend/src/components/redesign/ frontend/src/index.css`
Expected: every component using framer-motion or CSS keyframes has the corresponding gate. Fix any missing.

Manually enable reduced motion in the OS (macOS: System Settings → Accessibility → Display → "Reduce motion"). Reload the dev server. Walk the wizard + diagnosis flow — observe NO entrance animations, NO chip pop, NO submit bloom, NO mote drift, NO mesh breathing. State changes still happen, just instantly.

- [ ] **Step 3: Verify focus order + keyboard nav**

In the running app, Tab through the wizard:
- Top bar back arrow → progress (skipped, not focusable) → step counter (skipped) → answer area → Submit.
- In RowChoice, arrow keys do NOT navigate by default (radiogroup pattern would expect this) — Tab moves between rows. This is acceptable for v1; arrow-key support tracked as v2 polish.
- In ChipChoice multi, Tab moves between chips, Space toggles.
- Reasoning expander: Tab to it, Enter/Space toggles, focus stays on it after toggle.

- [ ] **Step 4: Tap target audit**

Inspect every interactive element in dev tools, confirm `clientHeight >= 44` AND `clientWidth >= 44`:
- Wizard back arrow: 28×28 — **too small**. Fix: change `w-7 h-7` to `w-11 h-11` (44×44) or wrap in a larger tap area.
- RowChoice rows: ~60px tall ✓
- ChipChoice chips: 38px tall — **too small**. Add `min-h-[44px]` Tailwind class. Verify visually nothing breaks (the chips will get slightly taller).
- Diagnosis differential chips: same fix — add `min-h-[44px]`.
- Submit pill: ~44px ✓
- Re-screen footer text-link: depends on font size — add `min-h-[44px] inline-flex items-center` if needed.

Apply the fixes above to the affected components.

- [ ] **Step 5: Commit any fixes**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/components/redesign/
git -C /Users/mathewbudnik/coretriage commit -m "fix(a11y): tap targets ≥44px, focus order, reduced-motion verification"
```

---

## Phase A complete

After Task 17:
- New wizard pattern lives at `/triage` in production code path.
- New diagnosis result renders post-submit on Recover.
- Old `components/triage/*` stays in place but unused on the triage path (may still be referenced elsewhere — leave alone).
- Backend unchanged. Existing `/api/rehab/progress` still drives Recover's exercise checkoffs (Phase B replaces the rest of RecoverActiveView).

**Final manual verification:**
- Run the full triage flow end-to-end as a signed-out user, then as a signed-in user.
- Run the full flow with macOS reduce-motion on, then off.
- Check the Network panel: `/api/triage` POST body matches the legacy payload shape.

Phase B (Recover redesign + progression engine) and Phase C (screen-new sheet) are separate plans.
