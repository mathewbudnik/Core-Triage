# Triage Redesign · Phase C · Screen-New Bottom Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "Something new hurts? → navigate('/triage')" flow with an in-place bottom sheet that asks 3 quick questions and routes the answer to either a "Same flare" confirmation (keeps current plan) or an "Pattern doesn't match → run full triage" escalation.

**Architecture:** Pure frontend. New `ScreenNewSheet` component triggered from `RecoverActiveViewRedesign`'s re-screen pill. Routing decision is a pure function in `lib/screenNewRouter.js` so it's testable. No backend changes.

**Tech Stack:** React 18 + framer-motion for the sheet slide-up; Vitest for the router tests.

**Spec:** `docs/superpowers/specs/2026-05-31-triage-recover-redesign-design.md` section "Surface 4: Screen-new sheet".

**Depends on:** Phase A (visual atoms, motion constants) + Phase B (Recover redesign — the sheet is triggered from there).

---

## File Structure

| File | Responsibility |
|------|---------------|
| `frontend/src/lib/screenNewRouter.js` | Pure-function classifier: answers → 'flare' / 'new_issue' |
| `frontend/src/lib/__tests__/screenNewRouter.test.js` | Unit tests for the classifier |
| `frontend/src/components/redesign/screenNew/ScreenNewSheet.jsx` | Bottom sheet orchestrator (3 steps + result) |
| `frontend/src/components/redesign/screenNew/ScreenNewStep.jsx` | Single-step layout (eyebrow + question + options) |
| `frontend/src/components/redesign/screenNew/ScreenNewOption.jsx` | Tap-target row with glyph + title + sub |
| `frontend/src/components/redesign/screenNew/ScreenNewResult.jsx` | Result card (moss-green flare OR amber new-issue) |
| `frontend/src/components/redesign/screenNew/Backdrop.jsx` | Dimmed/blurred backdrop behind the sheet |

Modified:
- `frontend/src/components/redesign/recover/RecoverActiveViewRedesign.jsx` — re-screen pill now opens the sheet instead of `navigate('/triage')`.

---

## Task 1: Routing decision pure function

**Files:**
- Create: `frontend/src/lib/screenNewRouter.js`
- Create: `frontend/src/lib/__tests__/screenNewRouter.test.js`

- [ ] **Step 1: Write tests**

Create `frontend/src/lib/__tests__/screenNewRouter.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { classifyScreenNew } from '../screenNewRouter'

// Inputs:
//   where:     'same' | 'related' | 'different'
//   onset:     'sharp' | 'gradual' | 'worsening'
//   painLevel: number  — top of the bucket (2, 4, 6, 8, 10) or null for "Not sure"

describe('classifyScreenNew', () => {
  it("'different' region always routes to new_issue regardless of onset/pain", () => {
    expect(classifyScreenNew({ where: 'different', onset: 'gradual', painLevel: 2 }).result).toBe('new_issue')
    expect(classifyScreenNew({ where: 'different', onset: 'sharp',   painLevel: 8 }).result).toBe('new_issue')
  })

  it("'same' + gradual + pain<=6 routes to flare", () => {
    expect(classifyScreenNew({ where: 'same', onset: 'gradual', painLevel: 4 }).result).toBe('flare')
    expect(classifyScreenNew({ where: 'same', onset: 'gradual', painLevel: 6 }).result).toBe('flare')
  })

  it("'same' + worsening + pain<=6 routes to flare", () => {
    expect(classifyScreenNew({ where: 'same', onset: 'worsening', painLevel: 4 }).result).toBe('flare')
  })

  it("'same' + sharp onset routes to new_issue even with low pain", () => {
    expect(classifyScreenNew({ where: 'same', onset: 'sharp', painLevel: 2 }).result).toBe('new_issue')
  })

  it("'same' + pain>=7 routes to new_issue", () => {
    expect(classifyScreenNew({ where: 'same', onset: 'gradual', painLevel: 8 }).result).toBe('new_issue')
  })

  it("'related' (different hand spot) defaults to new_issue", () => {
    expect(classifyScreenNew({ where: 'related', onset: 'gradual', painLevel: 4 }).result).toBe('new_issue')
  })

  it("'Not sure' pain (null) routes to new_issue (conservative)", () => {
    expect(classifyScreenNew({ where: 'same', onset: 'gradual', painLevel: null }).result).toBe('new_issue')
  })

  it("returns the signals that fired so the result card can display them", () => {
    const out = classifyScreenNew({ where: 'same', onset: 'sharp', painLevel: 8 })
    expect(out.result).toBe('new_issue')
    expect(out.signals).toContain('sharp_onset')
    expect(out.signals).toContain('pain_high')
  })
})
```

- [ ] **Step 2: Run, verify fail**

Run: `cd frontend && npx vitest run src/lib/__tests__/screenNewRouter.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `frontend/src/lib/screenNewRouter.js`:

```js
// Pure-function classifier for the screen-new bottom sheet.
// Inputs come from the 3-step flow; output drives which result card renders.
//
// Rules (spec section "Surface 4 · Routing"):
//   'different' region → always new_issue
//   'related' (different hand spot) → new_issue (it's a different injury site)
//   'same' region + sharp onset → new_issue
//   'same' region + pain >= 7 → new_issue
//   'same' region + null pain (not sure) → new_issue (conservative)
//   otherwise → flare

const PAIN_HIGH_THRESHOLD = 7

export function classifyScreenNew({ where, onset, painLevel }) {
  const signals = []

  if (where === 'different') {
    signals.push('different_region')
    return { result: 'new_issue', signals }
  }
  if (where === 'related') {
    signals.push('related_region')
    return { result: 'new_issue', signals }
  }

  // where === 'same' from here on
  if (onset === 'sharp') signals.push('sharp_onset')
  if (painLevel == null) signals.push('pain_unknown')
  if (typeof painLevel === 'number' && painLevel >= PAIN_HIGH_THRESHOLD) signals.push('pain_high')

  const isNewIssue = signals.some((s) =>
    s === 'sharp_onset' || s === 'pain_unknown' || s === 'pain_high'
  )
  return { result: isNewIssue ? 'new_issue' : 'flare', signals }
}
```

- [ ] **Step 4: Run, verify pass**

Run: `cd frontend && npx vitest run src/lib/__tests__/screenNewRouter.test.js`
Expected: PASS — 8 passed.

- [ ] **Step 5: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/lib/screenNewRouter.js frontend/src/lib/__tests__/screenNewRouter.test.js
git -C /Users/mathewbudnik/coretriage commit -m "feat(screen-new): classifyScreenNew router + 8 unit tests"
```

---

## Task 2: Backdrop + ScreenNewOption atoms

**Files:**
- Create: `frontend/src/components/redesign/screenNew/Backdrop.jsx`
- Create: `frontend/src/components/redesign/screenNew/ScreenNewOption.jsx`

- [ ] **Step 1: Create Backdrop**

```jsx
// Dimmed + blurred backdrop behind the sheet. Click to dismiss.

export default function Backdrop({ onDismiss }) {
  return (
    <div
      role="button"
      aria-label="Dismiss"
      onClick={onDismiss}
      className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm motion-reduce:backdrop-blur-none"
    />
  )
}
```

- [ ] **Step 2: Create ScreenNewOption**

```jsx
// One tappable row inside a screen-new step.
// Props: glyph (string), title, sub, onClick.

export default function ScreenNewOption({ glyph, title, sub, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3.5 px-4 py-4 rounded-2xl bg-white/[0.025] shadow-[0_0_0_0.5px_rgba(239,231,214,0.14)] text-left transition-[background,box-shadow,transform] duration-200 hover:bg-white/[0.05] hover:shadow-[0_0_0_0.5px_rgba(239,231,214,0.30)] active:scale-[0.985] min-h-[60px]"
    >
      <span aria-hidden="true" className="w-7 h-7 rounded-lg flex items-center justify-center bg-ct-terracotta/10 text-ct-terracotta text-[14px] font-extrabold shrink-0 shadow-[0_0_0_0.5px_rgba(217,119,87,0.28)]">
        {glyph}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[14.5px] font-bold text-ct-cream-warm leading-[1.2]">{title}</span>
        <span className="block text-[11.5px] text-ct-cream-warm/55 mt-0.5 leading-[1.4]">{sub}</span>
      </span>
      <span aria-hidden="true" className="text-ct-cream-warm/30 text-[14px]">›</span>
    </button>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/components/redesign/screenNew/Backdrop.jsx frontend/src/components/redesign/screenNew/ScreenNewOption.jsx
git -C /Users/mathewbudnik/coretriage commit -m "feat(screen-new): Backdrop + ScreenNewOption atoms"
```

---

## Task 3: ScreenNewStep layout

**Files:**
- Create: `frontend/src/components/redesign/screenNew/ScreenNewStep.jsx`

- [ ] **Step 1: Create**

```jsx
import { motion, useReducedMotion } from 'framer-motion'
import { riseVariant } from '../../../lib/redesignMotion'

/**
 * One step inside the sheet: eyebrow + question + helper + options grid.
 *
 * Props:
 *   eyebrow: string
 *   question: React node (may include terra accents)
 *   helper: string
 *   children: option rows
 */
export default function ScreenNewStep({ eyebrow, question, helper, children }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      variants={reduce ? undefined : riseVariant}
      initial={reduce ? false : 'initial'}
      animate={reduce ? false : 'animate'}
      className="flex flex-col gap-3"
    >
      <div className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-ct-cream-warm/45 mb-3">{eyebrow}</div>
      <h2 className="text-[26px] font-extrabold leading-[1.1] -tracking-[0.025em] text-ct-cream-warm">{question}</h2>
      <p className="text-[13px] text-ct-cream-warm/55 mt-3 leading-[1.5] max-w-[290px]">{helper}</p>
      <div className="flex flex-col gap-2 mt-5">{children}</div>
    </motion.div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/components/redesign/screenNew/ScreenNewStep.jsx
git -C /Users/mathewbudnik/coretriage commit -m "feat(screen-new): ScreenNewStep layout"
```

---

## Task 4: ScreenNewResult card

**Files:**
- Create: `frontend/src/components/redesign/screenNew/ScreenNewResult.jsx`

Two card variants (moss flare / amber new-issue) + actions.

- [ ] **Step 1: Create**

```jsx
import { motion, useReducedMotion } from 'framer-motion'
import { riseVariant } from '../../../lib/redesignMotion'

/**
 * Result card for the screen-new sheet.
 *
 * Props:
 *   variant:     'flare' | 'new_issue'
 *   dayInPhase:  number  — for the "logged on day N" copy
 *   diagnosisName: string — current diagnosis name
 *   signals:     string[] — keys from classifyScreenNew (display strings)
 *   onPrimary:   () => void
 *   onSecondary: () => void
 */
const SIGNAL_LABEL = {
  different_region: 'New region — different from your current plan',
  related_region:   'Different hand spot than your current plan',
  sharp_onset:      'Sudden, sharp onset',
  pain_high:        'Pain ≥ 7 — above your usual',
  pain_unknown:     'Pain level unclear',
}

export default function ScreenNewResult({ variant, dayInPhase, diagnosisName, signals, onPrimary, onSecondary }) {
  const reduce = useReducedMotion()
  const flare = variant === 'flare'

  const cardCls = flare
    ? 'bg-[linear-gradient(180deg,rgba(107,154,122,0.12)_0%,rgba(107,154,122,0.04)_100%)] shadow-[0_0_0_0.5px_rgba(107,154,122,0.32),0_12px_28px_rgba(107,154,122,0.15)]'
    : 'bg-[linear-gradient(180deg,rgba(244,181,60,0.10)_0%,rgba(244,181,60,0.04)_100%)] shadow-[0_0_0_0.5px_rgba(244,181,60,0.32),0_12px_28px_rgba(244,181,60,0.15)]'

  const lblCls = flare ? 'text-ct-moss-active' : 'text-ct-amber-warm'

  const headline = flare ? 'Same pattern as your plan.' : 'This looks different from your current diagnosis.'
  const body = flare
    ? <>We've logged this as a flare on <strong className="text-ct-cream-warm">day {dayInPhase}</strong>. Your plan is paced for this — drop intensity today, finish your check-ins, see how tomorrow lands.</>
    : <>Sharper or higher-pain than your existing pattern of <strong className="text-ct-cream-warm">{diagnosisName}</strong>. Worth running a full triage — your current plan stays paused until you decide.</>

  return (
    <motion.div
      variants={reduce ? undefined : riseVariant}
      initial={reduce ? false : 'initial'}
      animate={reduce ? false : 'animate'}
      className={`mt-4 p-5 rounded-2xl ${cardCls}`}
    >
      <div className={`text-[10.5px] font-extrabold uppercase tracking-[0.16em] ${lblCls}`}>
        {flare ? 'Likely a flare' : "Pattern doesn't match"}
      </div>
      <div className="text-[22px] font-extrabold text-ct-cream-warm mt-1.5 leading-[1.15] -tracking-[0.02em]">{headline}</div>
      <div className="text-[13px] text-ct-cream-warm/55 mt-2.5 leading-[1.55]">{body}</div>

      {signals?.length > 0 && (
        <div className="mt-3.5 pt-3.5 border-t border-white/[0.08] flex flex-col gap-2">
          {signals.map((s) => (
            <div key={s} className="flex gap-2.5 text-[12.5px] text-ct-cream-warm/80 leading-[1.45]">
              <span aria-hidden="true" className="w-[4px] h-[4px] rounded-full bg-ct-cream-warm/40 mt-[7px] shrink-0" />
              <span>{SIGNAL_LABEL[s] ?? s}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2">
        <button type="button" onClick={onPrimary} className="w-full px-4 py-3.5 rounded-2xl bg-ct-terracotta text-[#1a1410] font-extrabold text-[14.5px] shadow-[0_8px_22px_rgba(217,119,87,0.32)] transition-transform duration-150 active:scale-[0.985]">
          {flare ? 'Keep my plan →' : 'Run full triage →'}
        </button>
        <button type="button" onClick={onSecondary} className="w-full px-4 py-3 rounded-2xl bg-white/[0.06] text-ct-cream-warm/80 font-bold text-[13.5px]">
          {flare ? 'Re-screen anyway' : 'Keep current plan, track separately'}
        </button>
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/components/redesign/screenNew/ScreenNewResult.jsx
git -C /Users/mathewbudnik/coretriage commit -m "feat(screen-new): ScreenNewResult with flare + new_issue variants"
```

---

## Task 5: ScreenNewSheet orchestrator

**Files:**
- Create: `frontend/src/components/redesign/screenNew/ScreenNewSheet.jsx`

Slides up from bottom over the backdrop. 3 steps + result. Auto-advance on tap. Uses `classifyScreenNew` to decide which result variant shows.

- [ ] **Step 1: Create**

```jsx
import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import Backdrop from './Backdrop'
import ScreenNewStep from './ScreenNewStep'
import ScreenNewOption from './ScreenNewOption'
import ScreenNewResult from './ScreenNewResult'
import { classifyScreenNew } from '../../../lib/screenNewRouter'
import { DUR, EASE_OUT_GENTLE } from '../../../lib/redesignMotion'

/**
 * Bottom-sheet flow surfaced from Recover's "Something new hurts?" pill.
 *
 * Props:
 *   open:           boolean
 *   onDismiss:      () => void  — close without action
 *   dayInPhase:     number      — current day for the result copy
 *   diagnosisName:  string      — current diagnosis (e.g., "flexor tendon tenosynovitis")
 *   onKeepPlan:     () => void  — primary action on flare result
 *   onFullTriage:   ({ regionHint }) => void  — primary action on new_issue result;
 *                                 regionHint = 'same'/'related'/'different' so the
 *                                 caller can pre-fill the region picker if applicable
 *   onTrackSeparately: () => void — secondary action on new_issue (v1: no-op log)
 */
export default function ScreenNewSheet({
  open, onDismiss, dayInPhase, diagnosisName,
  onKeepPlan, onFullTriage, onTrackSeparately,
}) {
  const reduce = useReducedMotion()
  const [step, setStep] = useState(1)
  const [where, setWhere] = useState(null)
  const [onset, setOnset] = useState(null)
  const [painLevel, setPainLevel] = useState(null)

  const reset = () => { setStep(1); setWhere(null); setOnset(null); setPainLevel(null) }
  const closeAndReset = () => { reset(); onDismiss?.() }

  const result = step === 4 ? classifyScreenNew({ where, onset, painLevel }) : null

  return (
    <AnimatePresence>
      {open && (
        <>
          <Backdrop onDismiss={closeAndReset} />
          <motion.div
            initial={reduce ? false : { y: '100%', opacity: 0.6 }}
            animate={reduce ? false : { y: 0, opacity: 1, transition: { duration: 0.46, ease: EASE_OUT_GENTLE } }}
            exit={reduce ? undefined : { y: '100%', opacity: 0, transition: { duration: 0.32, ease: [0.4, 0, 1, 0.6] } }}
            className="fixed left-0 right-0 bottom-0 z-[70] max-h-[92vh] overflow-hidden rounded-t-[28px] bg-ct-forest-base shadow-[0_-20px_60px_rgba(0,0,0,0.5)] text-ct-cream-warm flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Quick check"
          >
            {/* Topbar */}
            <div className="relative flex items-center justify-between px-5 pt-4 pb-2">
              <span aria-hidden="true" className="absolute top-2 left-1/2 -translate-x-1/2 w-9 h-1 rounded-full bg-white/[0.18]" />
              <span className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-ct-cream-warm/45">Quick check</span>
              <button type="button" aria-label="Close" onClick={closeAndReset} className="w-7 h-7 rounded-full flex items-center justify-center text-ct-cream-warm/50 hover:bg-white/[0.06] hover:text-ct-cream-warm">×</button>
            </div>

            {/* Progress dots */}
            <div className="flex gap-1.5 px-5 pt-1.5">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className={[
                    'h-[3px] flex-1 rounded-full transition-colors duration-300',
                    n === step ? 'bg-ct-terracotta shadow-[0_0_10px_rgba(217,119,87,0.5)]'
                      : n < step ? 'bg-ct-terracotta/70' : 'bg-white/[0.12]',
                  ].join(' ')}
                />
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-5 pt-5 pb-6">
              {step === 1 && (
                <ScreenNewStep
                  eyebrow="Where"
                  question={<>Where's the <span className="text-ct-terracotta">new pain?</span></>}
                  helper="If it's where you've been hurting, this is probably a flare. If it's somewhere else, we'll spin up a new plan."
                >
                  <ScreenNewOption glyph="●" title="Same finger (current plan)" sub="Same spot on the same finger" onClick={() => { setWhere('same'); setStep(2) }} />
                  <ScreenNewOption glyph="+" title="Different finger or hand spot" sub="Other finger, palm, thumb — still in the hand" onClick={() => { setWhere('related'); setStep(2) }} />
                  <ScreenNewOption glyph="~" title="Somewhere completely different" sub="Wrist, elbow, shoulder, lower body" onClick={() => { setWhere('different'); setStep(4) }} />
                </ScreenNewStep>
              )}
              {step === 2 && (
                <ScreenNewStep
                  eyebrow="When"
                  question={<>How <span className="text-ct-terracotta">sudden</span> was it?</>}
                  helper="Sharp onset moves the needle toward a new issue. Gradual return often means a flare."
                >
                  <ScreenNewOption glyph="↑" title="Right now — sharp moment" sub="A specific move in this session" onClick={() => { setOnset('sharp'); setStep(3) }} />
                  <ScreenNewOption glyph="·" title="Today, gradually" sub="Built up over today's session" onClick={() => { setOnset('gradual'); setStep(3) }} />
                  <ScreenNewOption glyph="∾" title="It's been there, getting worse" sub="Not new, but escalating" onClick={() => { setOnset('worsening'); setStep(3) }} />
                </ScreenNewStep>
              )}
              {step === 3 && (
                <ScreenNewStep
                  eyebrow="How bad"
                  question={<>How bad does it feel <span className="text-ct-terracotta">right now?</span></>}
                  helper="Best guess on a 0–10 scale."
                >
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { lvl: 2,  k: 'Mild', tone: 'text-ct-moss-active' },
                      { lvl: 4,  k: 'Notice', tone: 'text-ct-moss-active' },
                      { lvl: 6,  k: 'Moderate', tone: 'text-ct-amber-warm' },
                      { lvl: 8,  k: 'Sharp', tone: 'text-ct-amber-warm' },
                      { lvl: 10, k: 'Severe', tone: 'text-ct-terracotta' },
                      { lvl: null, k: 'Not sure', tone: 'text-ct-terracotta' },
                    ].map((tile) => (
                      <button key={tile.k}
                        type="button"
                        onClick={() => { setPainLevel(tile.lvl); setStep(4) }}
                        className="px-2 py-3.5 rounded-2xl bg-white/[0.025] shadow-[0_0_0_0.5px_rgba(239,231,214,0.14)] hover:bg-white/[0.05] active:scale-[0.97] min-h-[64px] flex flex-col items-center justify-center"
                      >
                        <span className={`text-[22px] font-extrabold leading-none -tracking-[0.02em] ${tile.tone}`}>
                          {tile.lvl === null ? '?' : `${tile.lvl - 1}–${tile.lvl}`}
                        </span>
                        <span className="text-[10px] font-extrabold tracking-[0.1em] uppercase text-ct-cream-warm/45 mt-1.5">
                          {tile.k}
                        </span>
                      </button>
                    ))}
                  </div>
                </ScreenNewStep>
              )}
              {step === 4 && result && (
                <ScreenNewResult
                  variant={result.result}
                  dayInPhase={dayInPhase}
                  diagnosisName={diagnosisName}
                  signals={result.signals}
                  onPrimary={() => {
                    if (result.result === 'flare') { onKeepPlan?.(); closeAndReset() }
                    else { onFullTriage?.({ regionHint: where }); closeAndReset() }
                  }}
                  onSecondary={() => {
                    if (result.result === 'flare') { onFullTriage?.({ regionHint: where }); closeAndReset() }
                    else { onTrackSeparately?.(); closeAndReset() }
                  }}
                />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 2: Visual smoke test**

Temporarily mount in a dev surface inside a forest backdrop:

```jsx
const [open, setOpen] = useState(false)
<button onClick={() => setOpen(true)}>open</button>
<ScreenNewSheet
  open={open}
  onDismiss={() => setOpen(false)}
  dayInPhase={5}
  diagnosisName="flexor tendon tenosynovitis"
  onKeepPlan={() => console.log('keep')}
  onFullTriage={(p) => console.log('triage', p)}
  onTrackSeparately={() => console.log('track')}
/>
```

Click "open" — sheet slides up over dimmed bg. Walk: Same → Gradual → 3–4 → see flare card. Reset, try Same → Sharp → 1–2 → see new-issue card. Try Different → jumps straight to new-issue. Revert temp mount.

- [ ] **Step 3: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/components/redesign/screenNew/ScreenNewSheet.jsx
git -C /Users/mathewbudnik/coretriage commit -m "feat(screen-new): ScreenNewSheet orchestrator wires 3-step flow + result"
```

---

## Task 6: Wire into RecoverActiveViewRedesign

**Files:**
- Modify: `frontend/src/components/redesign/recover/RecoverActiveViewRedesign.jsx`

Replace the re-screen button's `onRescreen` prop callback with logic that opens the sheet.

- [ ] **Step 1: Update RecoverActiveViewRedesign**

At the top, add:

```jsx
import { useState } from 'react'
import ScreenNewSheet from '../screenNew/ScreenNewSheet'
```

Inside the component body, add state:

```jsx
const [screenNewOpen, setScreenNewOpen] = useState(false)
```

Replace the re-screen button's onClick:

```jsx
// OLD:
// <button ... onClick={onRescreen}> ... </button>

// NEW:
<button
  type="button"
  onClick={() => setScreenNewOpen(true)}
  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-[rgba(217,119,87,0.06)] shadow-[0_0_0_0.5px_rgba(217,119,87,0.20)] text-ct-terracotta font-bold text-[13px] hover:bg-[rgba(217,119,87,0.10)] transition-colors duration-200"
>
  Something new hurts? <span className="opacity-70">Re-screen</span>
</button>
```

At the bottom of the returned JSX (after the existing structure, inside the StageFrame), add:

```jsx
<ScreenNewSheet
  open={screenNewOpen}
  onDismiss={() => setScreenNewOpen(false)}
  dayInPhase={day_in_phase}
  diagnosisName={diagnosisName}
  onKeepPlan={() => {/* v1: just close. Future: log the flare event. */}}
  onFullTriage={({ regionHint }) => navigate('/triage', { state: { regionHint } })}
  onTrackSeparately={() => {/* v1: no-op. Future: open a separate tracking flow. */}}
/>
```

The `onRescreen` prop on the component is now only kept as a fallback for any caller that still passes it; in RecoverTab it can be removed.

- [ ] **Step 2: Manual end-to-end test**

Walk: Recover landing → tap "Re-screen" pill → sheet slides up → walk Same/Gradual/3–4 → see flare card → "Keep my plan" → sheet closes, you're back on Recover. Then again: Same/Sharp/8 → new-issue card → "Run full triage" → navigates to /triage with regionHint in state.

- [ ] **Step 3: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/components/redesign/recover/RecoverActiveViewRedesign.jsx
git -C /Users/mathewbudnik/coretriage commit -m "feat(recover): wire ScreenNewSheet from re-screen pill"
```

---

## Task 7: A11y pass

- [ ] **Step 1: Verify the sheet traps focus** when open (basic: set `tabIndex={-1}` on the dialog and call `.focus()` on mount).
- [ ] **Step 2: Verify Escape key dismisses** — add a `useEffect` keyboard listener inside the sheet.
- [ ] **Step 3: Verify Backdrop click dismisses** (already wired in Task 2).
- [ ] **Step 4: Verify each ScreenNewOption is min-h-[60px]** ✓ (already set in Task 2).
- [ ] **Step 5: Verify pain tiles are min-h-[64px]** ✓ (already set in Task 5).
- [ ] **Step 6: Verify the result card primary CTA is reachable by keyboard** and gets focus on appearance (via `autoFocus` or programmatic focus).
- [ ] **Step 7: Commit any fixes**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/components/redesign/screenNew/
git -C /Users/mathewbudnik/coretriage commit -m "fix(a11y): screen-new sheet focus trap + Escape dismiss + autoFocus on result CTA"
```

---

## Phase C complete

After Task 7:
- The "Something new hurts?" pill on Recover opens a bottom sheet that classifies the report in 3 taps.
- Flare → keep current plan, no triage interruption.
- New issue → escalate to full triage with `regionHint` in nav state so the triage wizard can pre-fill region selection if it wants to (the wizard receiving `regionHint` is out of scope for this plan — wizard can ignore it).

All three phases of the triage + recover redesign are now plan-complete. Execution can begin via subagent-driven-development or executing-plans.
