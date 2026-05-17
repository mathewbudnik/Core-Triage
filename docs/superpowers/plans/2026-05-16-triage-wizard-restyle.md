# Triage Wizard Restyle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the triage wizard's second screen (SmartTriageCard) into stacked glass section cards with autoscroll on selection, compress-on-pass behavior, and a tier-themed diagnosis-reveal — matching the Hub/Progress visual language.

**Architecture:** Nine new files in `frontend/src/components/triage/` (one orchestrator + seven UI components + one autoscroll hook). The orchestrator owns a single section-state map (`dim` | `focused` | `visited` | `passed`) and delegates rendering to a generic state-aware `TriageSectionCard` container. Form state shape unchanged — submit payload, session save, sessionStorage cache all reused. No backend changes.

**Tech Stack:** React 18, Vite, Tailwind CSS, Framer Motion, lucide-react, React Router 6 — all already in use.

**Spec:** [docs/superpowers/specs/2026-05-16-triage-wizard-restyle-design.md](../specs/2026-05-16-triage-wizard-restyle-design.md)

**Frontend test framework note:** This codebase has no frontend test runner. The plan adds pure JS primitives that get smoke-tested via `node --input-type=module`; React components are verified via `npx vite build` (catches type/import errors) plus a final manual browser smoke test at the end. No new test framework introduced.

---

## File Structure

**New files (all under `frontend/src/components/triage/`):**

| Path | Responsibility |
|---|---|
| `Chip.jsx` | Single chip (active/inactive states, haptic on tap) — extracted/restyled from SmartTriageCard |
| `ChipGroup.jsx` | Generic chip group: single-pick or multi-pick, accepts options + value + onChange |
| `PainSlider.jsx` | Pain slider widget (0–10) with gradient track, tabular-nums number, on-release autoscroll |
| `TriageRegionPill.jsx` | Small region card at the top ("● Wrist · Change ›") |
| `TriageSummaryPill.jsx` | Compressed one-line section ("✓ Onset · Gradual · Edit ›") |
| `TriageSectionCard.jsx` | State-aware glass card container: dim / focused / visited / passed |
| `TriageHero.jsx` | Severity hero — mild/moderate gradient variant + severe red-flag variant |
| `TriageDifferentials.jsx` | Glass card with the ranked differential list |
| `TriageAnswersStrip.jsx` | Top-of-diagnosis compressed 2×2 of user's answers with Edit link |
| `TriageActionsBar.jsx` | Sticky bottom bar: primary CTA + ghost overflow button |
| `TriageWizard.jsx` | Orchestrator — sectionStates map, autoscroll, submit handler, diagnosis reveal |

**New hook:**

| Path | Responsibility |
|---|---|
| `frontend/src/hooks/useTriageAutoscroll.js` | Returns `(refsByKey, scrollTo(key))` for the wizard sections |
| `frontend/src/hooks/usePrefersReducedMotion.js` | Returns `true` when `prefers-reduced-motion: reduce` matches |

**Modified files:**

| Path | Change |
|---|---|
| `frontend/src/components/TriageTab.jsx` | Mount `<TriageWizard ...>` instead of `<SmartTriageCard ...>` at `/triage/card` |
| `frontend/src/components/TriageDiagnosis.jsx` | Becomes a thin re-export wrapper using new `TriageHero`/`TriageDifferentials` |

**Retired (after wiring works):**

| Path | Disposition |
|---|---|
| `frontend/src/components/triage/SmartTriageCard.jsx` | Deleted at the end (Task 14) after TriageWizard fully replaces it |
| `frontend/src/components/triage/DiagnosisSkeleton.jsx` | **Kept** — used inside TriageWizard between submit and result arrival |

---

### Task 1: Chip primitive

**Files:**
- Create: `frontend/src/components/triage/Chip.jsx`

- [ ] **Step 1: Create the file**

Create `frontend/src/components/triage/Chip.jsx`:

```jsx
import { motion } from 'framer-motion'

// Haptic helper — silently no-ops on iOS Safari (no Vibration API) and any
// browser without navigator.vibrate. Cheap to call unconditionally.
function tapHaptic() {
  try { navigator.vibrate?.(10) } catch (_) { /* no-op */ }
}

/**
 * One chip — pill with active/inactive states. Active uses tier-aware
 * accents via CSS variables (--tier-c, --tier-light) so the chip color
 * follows the user's current tier theme.
 *
 * Props:
 *   active:    boolean
 *   onClick:   () => void
 *   children:  label content
 *   ariaLabel: optional explicit aria-label (otherwise uses children text)
 */
export default function Chip({ active, onClick, children, ariaLabel }) {
  return (
    <motion.button
      type="button"
      onClick={() => { tapHaptic(); onClick?.() }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
      aria-pressed={!!active}
      aria-label={ariaLabel}
      className={`text-xs font-semibold px-3 py-1.5 rounded-full border-[0.5px]
                  transition-colors
                  ${active
                    ? 'bg-[rgba(20,184,166,0.18)] border-[rgba(20,184,166,0.50)] text-[var(--tier-light)]'
                    : 'bg-white/[0.04] border-white/12 text-muted hover:text-text'}`}
    >
      {children}
    </motion.button>
  )
}
```

- [ ] **Step 2: Confirm the build picks it up**

```bash
cd /Users/mathewbudnik/coretriage/frontend && npx vite build 2>&1 | tail -3
```

Expected: clean build (component isn't imported anywhere yet, but the file must parse).

- [ ] **Step 3: Commit**

```bash
cd /Users/mathewbudnik/coretriage && git add frontend/src/components/triage/Chip.jsx && git commit -m "feat(triage): Chip primitive — tier-themed pill with haptic + spring tap"
```

---

### Task 2: ChipGroup primitive

**Files:**
- Create: `frontend/src/components/triage/ChipGroup.jsx`

- [ ] **Step 1: Create the file**

Create `frontend/src/components/triage/ChipGroup.jsx`:

```jsx
import Chip from './Chip'

/**
 * Generic chip group used by every section. Single-pick collapses on
 * selection (parent autoscrolls); multi-pick stays open.
 *
 * Props:
 *   options:  Array<{ value, label, Icon? }>
 *   value:    string | string[]    — selected value(s)
 *   multi:    boolean              — true = multi-pick
 *   onChange: (value | value[]) => void
 */
export default function ChipGroup({ options, value, multi = false, onChange }) {
  const selected = multi ? new Set(value || []) : value

  function handleClick(v) {
    if (multi) {
      const next = new Set(selected)
      if (next.has(v)) next.delete(v); else next.add(v)
      onChange([...next])
    } else {
      onChange(v)
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const isActive = multi ? selected.has(opt.value) : selected === opt.value
        return (
          <Chip
            key={opt.value}
            active={isActive}
            onClick={() => handleClick(opt.value)}
            ariaLabel={opt.label}
          >
            {opt.label}
          </Chip>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/mathewbudnik/coretriage/frontend && npx vite build 2>&1 | tail -3
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
cd /Users/mathewbudnik/coretriage && git add frontend/src/components/triage/ChipGroup.jsx && git commit -m "feat(triage): ChipGroup primitive — single-pick + multi-pick variants"
```

---

### Task 3: usePrefersReducedMotion hook

**Files:**
- Create: `frontend/src/hooks/usePrefersReducedMotion.js`

- [ ] **Step 1: Create the file**

Create `frontend/src/hooks/usePrefersReducedMotion.js`:

```js
import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Returns true when the user has set `prefers-reduced-motion: reduce`.
 * Components use this to switch from smooth animations to instant ones.
 */
export function usePrefersReducedMotion() {
  // SSR-safe default. On the client we'll sync immediately in the effect.
  const [prefers, setPrefers] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia(QUERY)
    setPrefers(mql.matches)
    const handler = (e) => setPrefers(e.matches)
    // addEventListener is the modern API. Some older Safaris only have
    // addListener — keep the fallback.
    if (mql.addEventListener) mql.addEventListener('change', handler)
    else mql.addListener(handler)
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', handler)
      else mql.removeListener(handler)
    }
  }, [])

  return prefers
}
```

- [ ] **Step 2: Sanity check (parses + exports)**

```bash
cd /Users/mathewbudnik/coretriage/frontend && node --input-type=module -e "import('./src/hooks/usePrefersReducedMotion.js').then(m => console.log(typeof m.usePrefersReducedMotion))"
```

Expected: `function`.

- [ ] **Step 3: Commit**

```bash
cd /Users/mathewbudnik/coretriage && git add frontend/src/hooks/usePrefersReducedMotion.js && git commit -m "feat(triage): usePrefersReducedMotion hook"
```

---

### Task 4: useTriageAutoscroll hook

**Files:**
- Create: `frontend/src/hooks/useTriageAutoscroll.js`

- [ ] **Step 1: Create the file**

Create `frontend/src/hooks/useTriageAutoscroll.js`:

```js
import { useCallback, useRef } from 'react'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

// Pixel offset above the destination section when scrolling. Tuned so the
// section's eyebrow label clears the page header. Bump if the header grows.
const SCROLL_OFFSET_PX = 18

/**
 * Wizard autoscroll hook. Returns:
 *   refFor(key)     — pass to a section's wrapping element as `ref={refFor('onset')}`
 *   scrollTo(key)   — smooth-scroll that section into view
 *
 * On `prefers-reduced-motion: reduce`, scrollTo uses `behavior: 'auto'`
 * (instant jump) instead of 'smooth'.
 */
export function useTriageAutoscroll() {
  const refsRef = useRef({})
  const prefersReducedMotion = usePrefersReducedMotion()

  const refFor = useCallback((key) => (el) => {
    if (el) refsRef.current[key] = el
    else delete refsRef.current[key]
  }, [])

  const scrollTo = useCallback((key) => {
    const el = refsRef.current[key]
    if (!el) return
    el.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    })
    // Nudge up so the eyebrow clears the page-header. Do it after the
    // scrollIntoView call so we land at the right baseline first.
    if (typeof window !== 'undefined') {
      // requestAnimationFrame gives the smooth-scroll a tick to start; the
      // tiny offset bump still arrives smoothly because we're inside the
      // same scroll animation context.
      requestAnimationFrame(() => window.scrollBy(0, -SCROLL_OFFSET_PX))
    }
  }, [prefersReducedMotion])

  return { refFor, scrollTo }
}
```

- [ ] **Step 2: Sanity check**

```bash
cd /Users/mathewbudnik/coretriage/frontend && node --input-type=module -e "import('./src/hooks/useTriageAutoscroll.js').then(m => console.log(typeof m.useTriageAutoscroll))"
```

Expected: `function`.

- [ ] **Step 3: Commit**

```bash
cd /Users/mathewbudnik/coretriage && git add frontend/src/hooks/useTriageAutoscroll.js && git commit -m "feat(triage): useTriageAutoscroll hook — refs + smooth/reduced-motion scroll"
```

---

### Task 5: TriageRegionPill

**Files:**
- Create: `frontend/src/components/triage/TriageRegionPill.jsx`

- [ ] **Step 1: Create the file**

Create `frontend/src/components/triage/TriageRegionPill.jsx`:

```jsx
/**
 * Small region card at the top of the wizard.
 *
 *   ● Wrist                            Change ›
 *
 * Props:
 *   region:          string         — display name ("Wrist", "Lower Back")
 *   onChangeRegion:  () => void     — invoked when the user taps "Change ›"
 */
export default function TriageRegionPill({ region, onChangeRegion }) {
  return (
    <div className="flex items-center justify-between
                    bg-black/30 border-[0.5px] border-white/[0.08]
                    rounded-2xl px-3.5 py-2.5 mx-0 mb-2.5">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[var(--tier-c)]
                         shadow-[0_0_6px_rgba(20,184,166,0.7)]" />
        <span className="text-sm font-extrabold tracking-tight">{region}</span>
      </div>
      <button
        type="button"
        onClick={onChangeRegion}
        className="text-[11px] font-semibold text-muted hover:text-text transition-colors"
      >
        Change ›
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/mathewbudnik/coretriage/frontend && npx vite build 2>&1 | tail -3
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
cd /Users/mathewbudnik/coretriage && git add frontend/src/components/triage/TriageRegionPill.jsx && git commit -m "feat(triage): TriageRegionPill — small region header card with Change link"
```

---

### Task 6: TriageSummaryPill

**Files:**
- Create: `frontend/src/components/triage/TriageSummaryPill.jsx`

- [ ] **Step 1: Create the file**

Create `frontend/src/components/triage/TriageSummaryPill.jsx`:

```jsx
import { Check } from 'lucide-react'

/**
 * The compressed one-line form for a passed section.
 *
 *   ┌─────────────────────────────────────────────┐
 *   │ ✓  ONSET     Gradual                Edit ›  │
 *   └─────────────────────────────────────────────┘
 *
 * Props:
 *   label:     uppercase eyebrow ("Onset", "Mechanism")
 *   value:     the chosen value, displayed as the main text
 *   valueTone: optional inline color override (e.g. severity tone for Pain)
 *   onEdit:    () => void   — invoked when the user taps the pill or "Edit ›"
 */
export default function TriageSummaryPill({ label, value, valueTone, onEdit }) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className="w-full flex items-center justify-between gap-3
                 bg-[rgba(20,184,166,0.06)] border-[0.5px] border-[rgba(20,184,166,0.25)]
                 rounded-2xl px-3.5 py-2.5 mb-2.5
                 hover:bg-[rgba(20,184,166,0.10)] transition-colors text-left"
      aria-label={`Edit ${label}, currently ${value}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full
                         bg-[var(--tier-c)] text-bg shrink-0">
          <Check size={11} strokeWidth={3} />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.10em] text-muted leading-tight">
            {label}
          </p>
          <p className="text-[13px] font-bold leading-tight mt-0.5 truncate"
             style={valueTone ? { color: valueTone } : undefined}>
            {value}
          </p>
        </div>
      </div>
      <span className="text-[11px] font-bold text-[var(--tier-light)] shrink-0">Edit</span>
    </button>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/mathewbudnik/coretriage/frontend && npx vite build 2>&1 | tail -3
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
cd /Users/mathewbudnik/coretriage && git add frontend/src/components/triage/TriageSummaryPill.jsx && git commit -m "feat(triage): TriageSummaryPill — compressed one-line passed-section pill"
```

---

### Task 7: TriageSectionCard

**Files:**
- Create: `frontend/src/components/triage/TriageSectionCard.jsx`

- [ ] **Step 1: Create the file**

Create `frontend/src/components/triage/TriageSectionCard.jsx`:

```jsx
import { motion } from 'framer-motion'

/**
 * State-aware glass card container. Owns the visual state of one section.
 *
 * States:
 *   'dim'      — unvisited. opacity 0.45.
 *   'focused'  — current. opacity 1, teal glow border.
 *   'visited'  — opened then moved on without compressing. opacity 1, default border.
 *   'passed'   — compressed. Caller should swap to <TriageSummaryPill> instead;
 *                this card renders nothing in 'passed' state to avoid double-render.
 *
 * Props:
 *   state:     'dim' | 'focused' | 'visited' | 'passed'
 *   eyebrow:   "Essentials · 1 of 4"
 *   children:  the section's content
 *   innerRef:  ref to the wrapper for autoscroll targeting
 */
export default function TriageSectionCard({ state, eyebrow, children, innerRef }) {
  if (state === 'passed') return null

  const isFocused = state === 'focused'
  const isDim = state === 'dim'

  return (
    <motion.section
      ref={innerRef}
      layout
      transition={{ duration: 0.2, ease: 'easeOut' }}
      initial={false}
      animate={{ opacity: isDim ? 0.45 : 1 }}
      className={`bg-black/35 backdrop-blur-md rounded-2xl p-4 mb-2.5
                  border-[0.5px] transition-[border,box-shadow] duration-200
                  ${isFocused
                    ? 'border-[rgba(20,184,166,0.40)] shadow-[0_8px_24px_rgba(20,184,166,0.08)]'
                    : 'border-white/[0.10]'}`}
    >
      <p className="text-[10px] font-extrabold uppercase tracking-[0.10em]
                    text-[var(--tier-light)] mb-2.5">
        {eyebrow}
      </p>
      {children}
    </motion.section>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/mathewbudnik/coretriage/frontend && npx vite build 2>&1 | tail -3
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
cd /Users/mathewbudnik/coretriage && git add frontend/src/components/triage/TriageSectionCard.jsx && git commit -m "feat(triage): TriageSectionCard — state-aware glass container (dim/focused/visited/passed)"
```

---

### Task 8: PainSlider

**Files:**
- Create: `frontend/src/components/triage/PainSlider.jsx`

- [ ] **Step 1: Create the file**

Create `frontend/src/components/triage/PainSlider.jsx`:

```jsx
import { motion } from 'framer-motion'

// Severity → hex for the inline color of the big pain value.
// (Spread across the gradient track regardless.)
function painHex(v) {
  if (v <= 3) return '#14b8a6'  // teal
  if (v <= 6) return '#fbbf24'  // gold
  return '#fb7185'              // coral
}

function painLabel(v) {
  if (v === 0) return 'No pain'
  if (v <= 2) return 'Very mild'
  if (v <= 4) return 'Mild'
  if (v <= 6) return 'Moderate'
  if (v <= 8) return 'Severe'
  return 'Worst imaginable'
}

/**
 * Pain slider 0–10. Visual: gradient track that fills from left, big
 * tabular-nums number on the right, label row below.
 *
 * Autoscroll cooperates: parent owns the scroll trigger and only fires it
 * on pointerup/touchend — we expose `onCommit` for that. `onChange` fires
 * on every drag tick (for live UI update); `onCommit` fires once on release.
 *
 * Props:
 *   value:     number (0..10)
 *   onChange:  (n) => void   — fires on every drag tick
 *   onCommit:  () => void    — fires on pointer release (slider has "landed")
 */
export default function PainSlider({ value, onChange, onCommit }) {
  const color = painHex(value)
  const pct = (value / 10) * 100

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-sm font-bold text-text">Pain right now</p>
        <p className="text-[22px] font-extrabold tabular-nums -tracking-[0.02em]"
           style={{ color }}>
          {value}<span className="text-xs font-bold text-muted">/10</span>
        </p>
      </div>

      <div className="relative h-2 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          style={{
            background: 'linear-gradient(90deg, #14b8a6 0%, #fbbf24 60%, #fb7185 100%)',
            backgroundSize: '200% 100%',
          }}
        />
        <input
          type="range"
          min={0}
          max={10}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onPointerUp={() => onCommit?.()}
          onTouchEnd={() => onCommit?.()}
          aria-label="Pain level"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer touch-none"
        />
      </div>

      <div className="flex justify-between mt-2">
        <span className="text-[10px] text-muted">No pain</span>
        <span className="text-[10px] font-bold" style={{ color }}>{painLabel(value)}</span>
        <span className="text-[10px] text-muted">Worst</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/mathewbudnik/coretriage/frontend && npx vite build 2>&1 | tail -3
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
cd /Users/mathewbudnik/coretriage && git add frontend/src/components/triage/PainSlider.jsx && git commit -m "feat(triage): PainSlider — gradient track, tabular-nums value, onCommit for autoscroll"
```

---

### Task 9: TriageHero (severity hero card)

**Files:**
- Create: `frontend/src/components/triage/TriageHero.jsx`

- [ ] **Step 1: Create the file**

Create `frontend/src/components/triage/TriageHero.jsx`:

```jsx
import { AlertTriangle, Check, X } from 'lucide-react'

// Severity → palette. Hex values match the existing tailwind tokens
// (accent/accent2/accent3) so the hero color-matches the rest of the app.
const PALETTE = {
  mild:     { color: '#14b8a6', tintFrom: 'rgba(20,184,166,0.18)',  tintTo: 'rgba(20,184,166,0.04)',  border: 'rgba(20,184,166,0.40)',  glow: 'rgba(20,184,166,0.10)',  label: 'Mild' },
  moderate: { color: '#fbbf24', tintFrom: 'rgba(251,191,36,0.18)',  tintTo: 'rgba(251,191,36,0.04)',  border: 'rgba(251,191,36,0.40)',  glow: 'rgba(251,191,36,0.10)',  label: 'Moderate' },
  severe:   { color: '#fb7185', tintFrom: 'rgba(251,113,133,0.18)', tintTo: 'rgba(251,113,133,0.04)', border: 'rgba(251,113,133,0.50)', glow: 'rgba(251,113,133,0.12)', label: 'Severe' },
}

/**
 * Severity hero. Variant by severity tier:
 *   - mild/moderate: gradient hero with title + 1-paragraph why + ✓/✗ action chips
 *   - severe:        red-flag callout shape (warning icon + headline + paragraph,
 *                    NO action chips — actions are clinical, not self-managed)
 *
 * Props:
 *   severity:    'mild' | 'moderate' | 'severe'
 *   title:       headline (e.g. "Wrist flexor tendinopathy")
 *   why:         one-paragraph reasoning
 *   actions:     Array<{ kind: 'do' | 'dont', text: string }> — ignored for severe
 *   redFlagBody: only used for severe — paragraph explaining the urgent guidance
 */
export default function TriageHero({ severity, title, why, actions = [], redFlagBody }) {
  const p = PALETTE[severity] || PALETTE.moderate

  if (severity === 'severe') {
    return (
      <section
        className="relative overflow-hidden rounded-2xl p-[18px] mb-3
                   border-[0.5px]"
        style={{
          background: `linear-gradient(180deg, ${p.tintFrom} 0%, ${p.tintTo} 100%)`,
          borderColor: p.border,
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full"
                style={{ background: 'rgba(251,113,133,0.30)', color: '#fda4af' }}>
            <AlertTriangle size={11} strokeWidth={2.6} />
          </span>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.10em]"
             style={{ color: '#fda4af' }}>
            {p.label} · See a clinician
          </p>
        </div>
        <h2 className="text-[17px] font-extrabold leading-tight mb-1">{title}</h2>
        <p className="text-[12px] text-muted leading-relaxed">{redFlagBody || why}</p>
      </section>
    )
  }

  return (
    <section
      className="relative overflow-hidden rounded-2xl p-[18px] mb-3 border-[0.5px]"
      style={{
        background: `linear-gradient(180deg, ${p.tintFrom} 0%, ${p.tintTo} 100%)`,
        borderColor: p.border,
        boxShadow: `0 0 36px ${p.glow}`,
      }}
    >
      <span
        className="inline-flex items-center gap-1.5 text-[10px] font-extrabold
                   uppercase tracking-[0.10em] px-2.5 py-1 rounded-full mb-2.5
                   border-[0.5px]"
        style={{ color: p.color, background: `${p.tintFrom}`, borderColor: p.border }}
      >
        ● {p.label}
      </span>
      <h2 className="text-[18px] font-extrabold tracking-[-0.01em] leading-tight mb-1.5">{title}</h2>
      <p className="text-[13px] text-muted leading-relaxed">{why}</p>

      {actions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3.5 pt-3.5
                        border-t-[0.5px] border-[rgba(255,255,255,0.10)]">
          {actions.map((a, i) => (
            <span key={i}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold
                             px-2.5 py-1 rounded-full
                             bg-white/[0.05] border-[0.5px] border-white/12">
              <span className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-full
                                ${a.kind === 'do'
                                  ? 'bg-[rgba(20,184,166,0.25)] text-[#5eead4]'
                                  : 'bg-[rgba(251,113,133,0.22)] text-[#fda4af]'}`}>
                {a.kind === 'do' ? <Check size={9} strokeWidth={3}/> : <X size={9} strokeWidth={3}/>}
              </span>
              {a.text}
            </span>
          ))}
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/mathewbudnik/coretriage/frontend && npx vite build 2>&1 | tail -3
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
cd /Users/mathewbudnik/coretriage && git add frontend/src/components/triage/TriageHero.jsx && git commit -m "feat(triage): TriageHero — severity-themed hero (mild/moderate gradient + severe red-flag)"
```

---

### Task 10: TriageDifferentials

**Files:**
- Create: `frontend/src/components/triage/TriageDifferentials.jsx`

- [ ] **Step 1: Create the file**

Create `frontend/src/components/triage/TriageDifferentials.jsx`:

```jsx
import { ChevronRight } from 'lucide-react'

/**
 * Glass card with a ranked list of differential diagnoses below the primary hero.
 *
 * Props:
 *   items:    Array<{ title: string, subtitle?: string }>
 *   severity: 'mild' | 'moderate' | 'severe'   — drives the rank pill color
 *   onSelect: (index) => void   — tap a row to drill into the bucket's detail
 */
const RANK_TONE = {
  mild:     { bg: 'rgba(20,184,166,0.15)',  fg: '#5eead4', border: 'rgba(20,184,166,0.35)' },
  moderate: { bg: 'rgba(20,184,166,0.15)',  fg: '#5eead4', border: 'rgba(20,184,166,0.35)' },
  severe:   { bg: 'rgba(251,113,133,0.15)', fg: '#fda4af', border: 'rgba(251,113,133,0.35)' },
}

export default function TriageDifferentials({ items = [], severity = 'moderate', onSelect }) {
  if (items.length === 0) return null
  const t = RANK_TONE[severity] || RANK_TONE.moderate

  return (
    <section className="bg-black/35 backdrop-blur-md rounded-2xl p-4 mb-3
                        border-[0.5px] border-white/[0.10]">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.10em]
                    text-[var(--tier-light)] mb-2.5">
        Other possibilities
      </p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => onSelect?.(i)}
              className="w-full flex items-center justify-between gap-3
                         px-3.5 py-3 rounded-xl text-left
                         bg-white/[0.03] border-[0.5px] border-white/[0.08]
                         hover:bg-white/[0.05] transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="inline-flex items-center justify-center w-[22px] h-[22px]
                                 rounded-full text-[11px] font-extrabold shrink-0 border-[0.5px]"
                      style={{ background: t.bg, color: t.fg, borderColor: t.border }}>
                  {i + 2}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold leading-tight truncate">{item.title}</p>
                  {item.subtitle && (
                    <p className="text-[10px] text-muted font-semibold mt-0.5 truncate">
                      {item.subtitle}
                    </p>
                  )}
                </div>
              </div>
              <ChevronRight size={14} strokeWidth={2.4} className="text-white/25 shrink-0" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/mathewbudnik/coretriage/frontend && npx vite build 2>&1 | tail -3
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
cd /Users/mathewbudnik/coretriage && git add frontend/src/components/triage/TriageDifferentials.jsx && git commit -m "feat(triage): TriageDifferentials — ranked differential list, severity-toned rank pills"
```

---

### Task 11: TriageAnswersStrip

**Files:**
- Create: `frontend/src/components/triage/TriageAnswersStrip.jsx`

- [ ] **Step 1: Create the file**

Create `frontend/src/components/triage/TriageAnswersStrip.jsx`:

```jsx
/**
 * Compressed 2×2 mini-grid of the user's answers, shown above the diagnosis
 * hero. "Edit ›" navigates back to the form state. Pain value picks up a
 * severity-tinted color when one is provided.
 *
 * Props:
 *   answers:      Array<{ label: string, value: string, tone?: string }>
 *   onEdit:       () => void
 */
export default function TriageAnswersStrip({ answers = [], onEdit }) {
  if (answers.length === 0) return null

  return (
    <section className="bg-black/30 border-[0.5px] border-white/[0.08]
                        rounded-2xl px-3 py-2.5 mb-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.10em] text-muted">
          Your answers
        </p>
        <button
          type="button"
          onClick={onEdit}
          className="text-[11px] font-bold text-[var(--tier-light)] hover:underline"
        >
          Edit ›
        </button>
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
        {answers.map((a) => (
          <div key={a.label} className="flex items-center gap-1.5 min-w-0">
            <span className="text-[11px] text-muted font-semibold">{a.label}</span>
            <span className="text-[11px] font-bold truncate"
                  style={a.tone ? { color: a.tone } : undefined}>
              {a.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/mathewbudnik/coretriage/frontend && npx vite build 2>&1 | tail -3
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
cd /Users/mathewbudnik/coretriage && git add frontend/src/components/triage/TriageAnswersStrip.jsx && git commit -m "feat(triage): TriageAnswersStrip — compressed answers grid above diagnosis"
```

---

### Task 12: TriageActionsBar

**Files:**
- Create: `frontend/src/components/triage/TriageActionsBar.jsx`

- [ ] **Step 1: Create the file**

Create `frontend/src/components/triage/TriageActionsBar.jsx`:

```jsx
import { motion } from 'framer-motion'
import { ArrowRight, Loader2, Download } from 'lucide-react'

// Haptic helper — silent no-op if vibration API unavailable.
function submitHaptic() {
  try { navigator.vibrate?.([10, 30, 10]) } catch (_) { /* no-op */ }
}

/**
 * Sticky bottom action bar. Two presentations:
 *   - Form state:      single primary CTA (Get my guidance / Tell us a bit more)
 *   - Diagnosis state: primary + ghost overflow button (save/PDF)
 *
 * Severe diagnosis: primaryTone === 'coral' tints the primary button red.
 *
 * Props:
 *   primaryLabel:  string
 *   primaryTone:   'teal' | 'coral'        — drives bg color
 *   enabled:       boolean                  — disabled state for form pre-submit
 *   loading:       boolean                  — spinner inside the button
 *   onPrimary:     () => void
 *   showOverflow:  boolean                  — true on diagnosis state
 *   onOverflow:    () => void
 *   error:         string | null            — inline error above the bar
 */
const PRIMARY_BG = {
  teal:  'bg-[var(--tier-c)] text-bg',
  coral: 'bg-[#fb7185] text-bg',
}

export default function TriageActionsBar({
  primaryLabel,
  primaryTone = 'teal',
  enabled = true,
  loading = false,
  onPrimary,
  showOverflow = false,
  onOverflow,
  error,
}) {
  return (
    <>
      {error && (
        <div className="px-1 mb-2 flex items-center gap-2 text-[#fb7185] text-xs">
          <span>{error}</span>
        </div>
      )}
      <div className="sticky bottom-0 left-0 right-0 -mx-4 px-4
                      pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]
                      bg-bg/85 backdrop-blur-md border-t-[0.5px] border-white/[0.08]
                      flex gap-2 z-20">
        <motion.button
          type="button"
          onClick={() => { if (enabled && !loading) { submitHaptic(); onPrimary?.() } }}
          disabled={!enabled || loading}
          whileTap={enabled && !loading ? { scale: 0.97 } : undefined}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          className={`flex-1 flex items-center justify-center gap-2
                      h-12 px-5 rounded-2xl text-sm font-extrabold
                      tracking-[-0.01em] transition-colors
                      ${enabled && !loading
                        ? PRIMARY_BG[primaryTone] || PRIMARY_BG.teal
                        : 'bg-panel2/70 text-muted/70 border-[0.5px] border-white/[0.08] cursor-not-allowed'}`}
        >
          {loading ? (
            <><Loader2 size={16} className="animate-spin" /> Reading your screening…</>
          ) : (
            <>{primaryLabel} <ArrowRight size={15} strokeWidth={2.6} /></>
          )}
        </motion.button>

        {showOverflow && (
          <button
            type="button"
            onClick={onOverflow}
            className="w-12 h-12 rounded-2xl flex items-center justify-center
                       bg-white/[0.04] border-[0.5px] border-white/12
                       text-muted hover:text-text transition-colors"
            aria-label="More actions"
          >
            <Download size={16} strokeWidth={2.2} />
          </button>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/mathewbudnik/coretriage/frontend && npx vite build 2>&1 | tail -3
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
cd /Users/mathewbudnik/coretriage && git add frontend/src/components/triage/TriageActionsBar.jsx && git commit -m "feat(triage): TriageActionsBar — sticky bottom CTA + ghost overflow"
```

---

### Task 13: TriageWizard orchestrator

**Files:**
- Create: `frontend/src/components/triage/TriageWizard.jsx`

- [ ] **Step 1: Verify dependencies exist**

```bash
ls /Users/mathewbudnik/coretriage/frontend/src/components/triage/Chip.jsx \
   /Users/mathewbudnik/coretriage/frontend/src/components/triage/ChipGroup.jsx \
   /Users/mathewbudnik/coretriage/frontend/src/components/triage/PainSlider.jsx \
   /Users/mathewbudnik/coretriage/frontend/src/components/triage/TriageRegionPill.jsx \
   /Users/mathewbudnik/coretriage/frontend/src/components/triage/TriageSummaryPill.jsx \
   /Users/mathewbudnik/coretriage/frontend/src/components/triage/TriageSectionCard.jsx \
   /Users/mathewbudnik/coretriage/frontend/src/components/triage/TriageHero.jsx \
   /Users/mathewbudnik/coretriage/frontend/src/components/triage/TriageDifferentials.jsx \
   /Users/mathewbudnik/coretriage/frontend/src/components/triage/TriageAnswersStrip.jsx \
   /Users/mathewbudnik/coretriage/frontend/src/components/triage/TriageActionsBar.jsx \
   /Users/mathewbudnik/coretriage/frontend/src/hooks/useTriageAutoscroll.js
```

All 11 must exist. If any are missing, STOP and report.

- [ ] **Step 2: Create the orchestrator**

Create `frontend/src/components/triage/TriageWizard.jsx`:

```jsx
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTriageAutoscroll } from '../../hooks/useTriageAutoscroll'
import ChipGroup from './ChipGroup'
import PainSlider from './PainSlider'
import TriageRegionPill from './TriageRegionPill'
import TriageSummaryPill from './TriageSummaryPill'
import TriageSectionCard from './TriageSectionCard'
import TriageHero from './TriageHero'
import TriageDifferentials from './TriageDifferentials'
import TriageAnswersStrip from './TriageAnswersStrip'
import TriageActionsBar from './TriageActionsBar'
import DiagnosisSkeleton from './DiagnosisSkeleton'

// Section order is fixed. Anything else is optional (multi-pick) so it
// never blocks submit.
const ORDER = ['onset', 'mechanism', 'pain', 'anythingElse']

const ONSET_OPTIONS = [
  { value: 'Gradual', label: 'Gradual' },
  { value: 'Sudden',  label: 'Sudden'  },
]

const SIGNAL_CHIPS = [
  { value: 'swelling',     label: 'Swelling' },
  { value: 'pop_snap',     label: 'Pop / snap' },
  { value: 'numbness',     label: 'Numb / tingling' },
  { value: 'weak_grip',    label: 'Weak grip' },
  { value: 'bruising',     label: 'Bruising' },
  { value: 'worse_morning', label: 'Worse in morning' },
]

function painTone(v) {
  if (v <= 3) return '#14b8a6'
  if (v <= 6) return '#fbbf24'
  return '#fb7185'
}

/**
 * Orchestrator for the restyled wizard.
 *
 * Form state shape preserved from SmartTriageCard — submit payload unchanged.
 *
 * Props:
 *   form:           { region, onset, mechanism, severity, signal_chips, ... }
 *   onChange:       (key, value) => void
 *   onChangeRegion: () => void   — back to body diagram
 *   onSubmit:       () => void   — fires triageIntake
 *   onOpenRehabPlan:() => void   — navigate to /body after diagnosis
 *   loading:        boolean
 *   result:         post-submit diagnosis object or null
 *   error:          string | null
 *   mechanisms:     Array<{ value, label, Icon? }>
 */
export default function TriageWizard({
  form, onChange, onChangeRegion, onSubmit, onOpenRehabPlan,
  loading, result, error, mechanisms,
}) {
  const { refFor, scrollTo } = useTriageAutoscroll()

  // Section state map. Initial: onset focused, rest dim.
  const [states, setStates] = useState(() => ({
    onset: 'focused', mechanism: 'dim', pain: 'dim', anythingElse: 'dim',
  }))

  // Move a section to 'passed' and the next one to 'focused', then scroll.
  const advance = useCallback((from) => {
    const idx = ORDER.indexOf(from)
    if (idx < 0) return
    const next = ORDER[idx + 1]
    setStates((s) => {
      const updated = { ...s, [from]: 'passed' }
      if (next && (s[next] === 'dim' || s[next] === 'visited')) {
        updated[next] = 'focused'
      }
      return updated
    })
    if (next) {
      // Defer to next frame so the compress animation gets a chance to start
      // before we scroll — the destination is then in the right place.
      requestAnimationFrame(() => scrollTo(next))
    }
  }, [scrollTo])

  // Re-expand a passed section. Other sections' states are preserved.
  const editSection = useCallback((key) => {
    setStates((s) => ({ ...s, [key]: 'focused' }))
  }, [])

  // Submit enabled when the three required sections have a value.
  const canSubmit = !!(form.onset && form.mechanism && form.severity != null)

  // Reset states whenever the region changes — fresh wizard for a new injury.
  useEffect(() => {
    setStates({ onset: 'focused', mechanism: 'dim', pain: 'dim', anythingElse: 'dim' })
  }, [form.region])

  // ── Section handlers ────────────────────────────────────────────────────
  const onPickOnset = (v) => { onChange('onset', v); advance('onset') }
  const onPickMech  = (v) => { onChange('mechanism', v); advance('mechanism') }
  const onPainChange = (v) => onChange('severity', v)
  const onPainCommit = () => advance('pain')
  const onPickSignals = (arr) => onChange('signal_chips', arr)

  // ── Diagnosis view ──────────────────────────────────────────────────────
  if (result) {
    return <DiagnosisView
      form={form}
      result={result}
      onEdit={() => editSection('onset')}
      onOpenRehabPlan={onOpenRehabPlan}
    />
  }

  if (loading) {
    return (
      <div className="py-4">
        <DiagnosisSkeleton />
      </div>
    )
  }

  // ── Form view ───────────────────────────────────────────────────────────
  return (
    <div>
      <TriageRegionPill region={form.region} onChangeRegion={onChangeRegion} />

      <AnimatePresence mode="popLayout" initial={false}>
        {/* Onset */}
        {states.onset === 'passed' ? (
          <motion.div key="onset-summary" layout
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}>
            <TriageSummaryPill
              label="Onset"
              value={form.onset}
              onEdit={() => editSection('onset')}
            />
          </motion.div>
        ) : (
          <TriageSectionCard
            key="onset-card"
            state={states.onset}
            eyebrow="Essentials · 1 of 4"
            innerRef={refFor('onset')}
          >
            <p className="text-sm font-bold mb-2">When did it start?</p>
            <ChipGroup options={ONSET_OPTIONS} value={form.onset} onChange={onPickOnset} />
          </TriageSectionCard>
        )}

        {/* Mechanism */}
        {states.mechanism === 'passed' ? (
          <motion.div key="mech-summary" layout
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}>
            <TriageSummaryPill
              label="Mechanism"
              value={form.mechanism}
              onEdit={() => editSection('mechanism')}
            />
          </motion.div>
        ) : (
          <TriageSectionCard
            key="mech-card"
            state={states.mechanism}
            eyebrow="Mechanism · 2 of 4"
            innerRef={refFor('mechanism')}
          >
            <p className="text-sm font-bold mb-2">What were you doing?</p>
            <ChipGroup options={mechanisms} value={form.mechanism} onChange={onPickMech} />
          </TriageSectionCard>
        )}

        {/* Pain */}
        {states.pain === 'passed' ? (
          <motion.div key="pain-summary" layout
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}>
            <TriageSummaryPill
              label="Pain"
              value={`${form.severity}/10`}
              valueTone={painTone(Number(form.severity) || 0)}
              onEdit={() => editSection('pain')}
            />
          </motion.div>
        ) : (
          <TriageSectionCard
            key="pain-card"
            state={states.pain}
            eyebrow="Pain · 3 of 4"
            innerRef={refFor('pain')}
          >
            <PainSlider
              value={Number(form.severity) || 0}
              onChange={onPainChange}
              onCommit={onPainCommit}
            />
          </TriageSectionCard>
        )}

        {/* Anything else (multi-pick — never compresses) */}
        <TriageSectionCard
          key="ae-card"
          state={states.anythingElse}
          eyebrow="Anything else · optional"
          innerRef={refFor('anythingElse')}
        >
          <p className="text-sm font-bold mb-2">Any of these apply?</p>
          <ChipGroup
            options={SIGNAL_CHIPS}
            value={form.signal_chips || []}
            multi
            onChange={onPickSignals}
          />
          <p className="text-[11px] text-muted mt-2">Pick all that apply — or skip.</p>
        </TriageSectionCard>
      </AnimatePresence>

      <TriageActionsBar
        primaryLabel={canSubmit ? 'Get my guidance' : 'Tell us a bit more'}
        enabled={canSubmit}
        loading={loading}
        onPrimary={onSubmit}
        error={error}
      />
    </div>
  )
}

// ── Diagnosis view (post-submit) ──────────────────────────────────────────

function DiagnosisView({ form, result, onEdit, onOpenRehabPlan }) {
  const severity = result?.severity?.level || 'moderate'
  const hero = useMemo(() => buildHero(result), [result])
  const answers = useMemo(() => buildAnswersStrip(form, result), [form, result])
  const diffs   = useMemo(() => buildDifferentials(result), [result])

  const primaryLabel = severity === 'severe' ? 'Find urgent care' : 'Open my rehab plan'
  const primaryTone  = severity === 'severe' ? 'coral' : 'teal'

  return (
    <div>
      <TriageAnswersStrip answers={answers} onEdit={onEdit} />

      <TriageHero
        severity={severity}
        title={hero.title}
        why={hero.why}
        actions={hero.actions}
        redFlagBody={hero.redFlagBody}
      />

      <TriageDifferentials items={diffs} severity={severity} />

      <TriageActionsBar
        primaryLabel={primaryLabel}
        primaryTone={primaryTone}
        enabled={true}
        onPrimary={onOpenRehabPlan}
        showOverflow
        onOverflow={() => { /* PDF/share flow — out of scope for v1 */ }}
      />
    </div>
  )
}

// ── Result → view-model adapters ──────────────────────────────────────────

function buildHero(result) {
  const top = result?.buckets?.[0]
  const severity = result?.severity?.level || 'moderate'
  const redFlags = result?.red_flags || []

  return {
    title: top?.title || result?.severity?.label || 'Likely overuse',
    why: top?.why || result?.severity?.action || '',
    redFlagBody: severity === 'severe' ? (redFlags[0] || result?.severity?.action) : null,
    actions: severity === 'severe' ? [] : deriveActionChips(result),
  }
}

function deriveActionChips(result) {
  // Pull short ✓/✗ phrases from result.plan when present. Falls back to a
  // small generic set so the hero never renders an empty action row.
  const plan = result?.plan || {}
  const out = []
  const immediate = plan['Immediate next 7–10 days'] || plan['Immediate next 7-10 days'] || []
  for (const line of immediate) {
    const low = String(line).toLowerCase()
    if (out.length >= 2) break
    if (/\bice\b/.test(low))        out.push({ kind: 'do',   text: 'Ice 15 min' })
    else if (/elevat/.test(low))    out.push({ kind: 'do',   text: 'Elevate' })
    else if (/open[- ]?hand/.test(low)) out.push({ kind: 'do', text: 'Open-hand only' })
  }
  const avoid = plan['What to avoid for now'] || plan['Avoid'] || []
  for (const line of avoid) {
    const low = String(line).toLowerCase()
    if (out.length >= 4) break
    if (/crimp/.test(low))          out.push({ kind: 'dont', text: 'No crimping' })
    else if (/hangboard/.test(low)) out.push({ kind: 'dont', text: 'No hangboard' })
    else if (/campus/.test(low))    out.push({ kind: 'dont', text: 'No campusing' })
    else if (/dyno|dynamic/.test(low)) out.push({ kind: 'dont', text: 'No dynos' })
  }
  return out
}

function buildAnswersStrip(form, result) {
  const sev = Number(form.severity) || 0
  const signals = (form.signal_chips || []).slice(0, 2).join(', ')
  return [
    { label: 'Onset',     value: form.onset || '—' },
    { label: 'Pain',      value: `${sev}/10`, tone: painTone(sev) },
    { label: 'Mechanism', value: form.mechanism || '—' },
    { label: 'Signals',   value: signals || 'none' },
  ]
}

function buildDifferentials(result) {
  return (result?.buckets || []).slice(1, 4).map((b) => ({
    title: b.title || '',
    subtitle: b.why || '',
  }))
}
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/mathewbudnik/coretriage/frontend && npx vite build 2>&1 | tail -5
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
cd /Users/mathewbudnik/coretriage && git add frontend/src/components/triage/TriageWizard.jsx && git commit -m "feat(triage): TriageWizard orchestrator — section state machine + autoscroll + diagnosis"
```

---

### Task 14: Wire TriageTab → TriageWizard

**Files:**
- Modify: `frontend/src/components/TriageTab.jsx`

- [ ] **Step 1: Identify the SmartTriageCard mount**

```bash
grep -n "SmartTriageCard\|<SmartTriageCard" /Users/mathewbudnik/coretriage/frontend/src/components/TriageTab.jsx
```

Two hits expected: the `import` and the `<SmartTriageCard ... />` mount inside the `currentSlug === 'card'` branch.

- [ ] **Step 2: Swap the import**

In [TriageTab.jsx](frontend/src/components/TriageTab.jsx), find:

```jsx
import SmartTriageCard from './triage/SmartTriageCard'
```

Replace with:

```jsx
import TriageWizard from './triage/TriageWizard'
```

- [ ] **Step 3: Swap the mount**

Find the JSX block that renders the wizard step:

```jsx
      {currentSlug === 'card' && form.region && (
        <SmartTriageCard
          form={form}
          onChange={set}
          onChangeRegion={returnToRegion}
          onSubmit={handleSubmit}
          onOpenRehabPlan={openRehabPlan}
          loading={loading}
          result={result}
          error={error}
          mechanisms={mechanisms}
          options={{
            whichFingerOptions:    WHICH_FINGER_OPTIONS,
            fingerLocationOptions: FINGER_LOCATION_OPTIONS,
            gripModeOptions:       GRIP_MODE_OPTIONS,
          }}
        />
      )}
```

Replace with:

```jsx
      {currentSlug === 'card' && form.region && (
        <TriageWizard
          form={form}
          onChange={set}
          onChangeRegion={returnToRegion}
          onSubmit={handleSubmit}
          onOpenRehabPlan={openRehabPlan}
          loading={loading}
          result={result}
          error={error}
          mechanisms={mechanisms}
        />
      )}
```

(`TriageWizard` doesn't need the finger-context options for v1 — out of scope per spec. The form state still carries those keys; the orchestrator just doesn't render the finger-context inputs yet. Add this comment near the mount if it helps future readers, otherwise leave the swap clean.)

- [ ] **Step 4: Build to verify**

```bash
cd /Users/mathewbudnik/coretriage/frontend && npx vite build 2>&1 | tail -5
```

Expected: clean build. If SmartTriageCard's import is unused anywhere else (it shouldn't be — Vite tree-shakes silently), it'll be eligible for deletion in Task 15.

- [ ] **Step 5: Commit**

```bash
cd /Users/mathewbudnik/coretriage && git add frontend/src/components/TriageTab.jsx && git commit -m "feat(triage): wire TriageTab to TriageWizard (replaces SmartTriageCard)"
```

---

### Task 15: Retire SmartTriageCard

**Files:**
- Delete: `frontend/src/components/triage/SmartTriageCard.jsx`

- [ ] **Step 1: Confirm no remaining importers**

```bash
grep -rE "from .*SmartTriageCard|import.*SmartTriageCard" /Users/mathewbudnik/coretriage/frontend/src 2>&1
```

Expected: no matches. If anything still imports it, STOP and fix that file first.

- [ ] **Step 2: Delete the file**

```bash
rm /Users/mathewbudnik/coretriage/frontend/src/components/triage/SmartTriageCard.jsx
```

- [ ] **Step 3: Build to verify nothing's broken**

```bash
cd /Users/mathewbudnik/coretriage/frontend && npx vite build 2>&1 | tail -5
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
cd /Users/mathewbudnik/coretriage && git add -A frontend/src/components/triage/SmartTriageCard.jsx && git commit -m "chore(triage): retire SmartTriageCard — replaced by TriageWizard"
```

---

### Task 16: Final build + manual smoke test

**Files:** none — verification only.

- [ ] **Step 1: Clean build**

```bash
cd /Users/mathewbudnik/coretriage/frontend && npx vite build 2>&1 | tail -8
```

Expected: `✓ built in N.NNs`, no errors.

- [ ] **Step 2: Start dev server**

```bash
cd /Users/mathewbudnik/coretriage/frontend && npm run dev
```

In a separate terminal, ensure the backend is healthy: `curl -s http://localhost:8000/api/health`.

- [ ] **Step 3: Smoke test in the browser**

Walk through the table below at `http://localhost:5173/`. Record results:

| # | Step | Expected |
|---|---|---|
| 1 | Sign in, navigate to `/triage` | Body diagram shows (unchanged from before) |
| 2 | Tap a region (e.g. Wrist) | Navigates to `/triage/card`. Wizard mounts with Onset card focused (teal glow), other cards dim (~45% opacity) |
| 3 | Tap "Gradual" in Onset | Onset card compresses to a thin pill (`✓ Onset · Gradual · Edit ›`). Page smooth-scrolls to Mechanism, which becomes focused. |
| 4 | Tap a Mechanism chip | Mechanism compresses similarly. Scrolls to Pain. |
| 5 | Drag the Pain slider, release | Slider's `onCommit` fires on release → Pain compresses. Scrolls to Anything else. Submit button enables ("Get my guidance →"). |
| 6 | Tap an Anything else chip | Chip activates. **No autoscroll** (multi-pick rule). |
| 7 | Tap a compressed pill (e.g. Onset) | Section re-expands to its full chip set. Other sections unchanged. |
| 8 | Tap "Get my guidance" | Skeleton appears briefly, then diagnosis: Answers strip + severity hero + differentials + bottom bar with "Open my rehab plan →" |
| 9 | Trigger a severe-tier result (e.g. Wrist · Sudden · pain 8/10 with "pop_snap" signal) | Hero changes to red-flag callout shape (coral). Primary CTA hardens to "Find urgent care →" |
| 10 | Resize the browser to <768px | Layout still works: sticky bottom bar reachable, autoscroll still scrolls correctly, chip rows wrap |
| 11 | OS-level enable "Reduce motion," reload, run through wizard | Scrolls are instant jumps (no smooth animation), compression skips height animation |

- [ ] **Step 4: Commit any fixes discovered during the smoke test**

```bash
git status
# Fix any issues found, then:
git add -A
git commit -m "fix(triage): smoke-test cleanup"
```

If nothing changed, skip the commit.

---

## Self-review checklist (DONE — for the implementing engineer)

**Spec coverage:**
- [x] Problem + Solution → covered by Tasks 1–14 collectively
- [x] Form-state layout (3 ASCII frames) → Task 13 (TriageWizard renders all three states)
- [x] Diagnosis-reveal layout (2 ASCII frames) → Task 13 (DiagnosisView function + Tasks 9/10/11)
- [x] Visual system (glass surface, tier vars, eyebrow typography) → Tasks 5–7 + 9–11 (all use the same Tailwind utilities)
- [x] Section card states (dim/focused/visited/passed) → Task 7 (TriageSectionCard) + Task 13 (state machine)
- [x] Autoscroll behavior table → Task 4 (useTriageAutoscroll hook) + Task 13 (advance/onCommit/multi-pick rules)
- [x] Reduced-motion handling → Task 3 (usePrefersReducedMotion) + Task 4 (used inside the autoscroll hook)
- [x] Edit re-expansion preserves subsequent state → Task 13 (`editSection` only sets one key)
- [x] Severity → color mapping → Task 9 (TriageHero PALETTE map) + Task 13 (DiagnosisView severity branching for CTA tone/label)
- [x] Component split (8 new files in `triage/` + 1 hook in `hooks/`) → Tasks 1, 2, 5–13 (one task per file plus the orchestrator)
- [x] State machine description → Task 13 inline (`ORDER`, `states`, `advance`, `editSection`)
- [x] Form state shape unchanged → Task 14 (props passed straight through from TriageTab)
- [x] SmartTriageCard retired → Task 15

**Placeholder scan:** No TBDs/TODOs in any task. Every code step shows full code; every command shows expected output.

**Type consistency:**
- Section state strings (`'dim'`, `'focused'`, `'visited'`, `'passed'`) used the same way in Task 7 (TriageSectionCard prop), Task 13 (state map values).
- `severity` strings (`'mild'`, `'moderate'`, `'severe'`) consistent in Task 9 (TriageHero PALETTE keys), Task 10 (TriageDifferentials RANK_TONE keys), Task 13 (`severity = result?.severity?.level || 'moderate'`).
- Hook return shape `{ refFor, scrollTo }` from Task 4 used identically in Task 13 (`const { refFor, scrollTo } = useTriageAutoscroll()`).
- Form prop shape and `onChange(key, value)` signature unchanged from existing SmartTriageCard (preserved in Task 14's swap).

**Explicit deferrals** (called out so the next planner knows):
- Finger-context section (which finger, palm-side location, grip mode) — preserved in form state but not surfaced in the new UI in v1. The classifier still receives the empty fields and degrades gracefully.
- PDF/share overflow button on the diagnosis state — wired with a no-op handler; v2 will hook up the existing PDF flow.
- Coachmarks / tour replay — the existing TriageTab coachmark anchor on the body diagram is preserved; the wizard doesn't introduce new anchors.
