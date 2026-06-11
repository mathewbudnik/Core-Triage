# Movement Analyzer Depth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the paid Movement Analyzer report deeper and more trustworthy — a live annotated overlay on the climber during playback + a directional movement score — pure frontend, on-device, zero gate/privacy/backend change.

**Architecture:** Two new pure libs (`movementScore.js` scoring; `bodyRegionJoints.js` overlay-finding selection) are CI-safe and unit-tested. `poseDrawing.js drawPose` gains a backward-compatible `highlight` param. A new `MovementScoreCard` sits atop `AnalysisReport`; each finding gains a "Show me" that puts `MovementAnalyzer` into focus mode (seek + pause + highlight the flagged body part + caption). During normal playback the overlay ambiently highlights whichever finding is active at the playhead.

**Tech Stack:** React 18 + Vite + Tailwind (Almanac tokens) + MediaPipe pose (existing) + Canvas 2D; vitest + @testing-library/react.

**Conventions / constraints:** Tokens only (the Almanac grep gate must stay 0 — note existing `red-500` severity classes and `#c2362b` are NOT on the forbidden list); no emojis; lucide icons. **Preserve the paid gate** (`CoachTab.jsx` untouched) and the **on-device privacy promise** (no save, no upload, no backend — the "video never leaves your phone" copy stays true). **Do NOT edit** the parallel agent's `frontend/src/components/log/*` or `frontend/src/hooks/useSessionLog.js`; do not touch `ui/GradientSlider.jsx`, `TrimScrubber.jsx`, `FallScrubber.jsx`, or `public/models/*`. v1 changes **presentation only** — no rule logic, thresholds, or advice copy.

---

## File Structure

| File | Create/Modify | Responsibility |
|---|---|---|
| `frontend/src/lib/movementScore.js` | Create | `scoreClip(findings)` + `SEVERITY_WEIGHT` (pure) |
| `frontend/src/lib/__tests__/movementScore.test.js` | Create | Scoring tests |
| `frontend/src/lib/bodyRegionJoints.js` | Create | `BODY_REGION_JOINTS`, `jointsForFinding`, `activeFindingAt` (pure) |
| `frontend/src/lib/__tests__/bodyRegionJoints.test.js` | Create | Map coverage + active-finding tests |
| `frontend/src/lib/poseDrawing.js` | Modify | `drawPose(ctx, landmarks, highlight?)` — optional flagged overlay |
| `frontend/src/components/MovementScoreCard.jsx` | Create | Directional score card |
| `frontend/src/components/MovementScoreCard.test.jsx` | Create | Renders score + regions + directional label |
| `frontend/src/components/AnalysisReport.jsx` | Modify | Render score card; thread `onFocusFinding`; "Show me" in `FindingCard` |
| `frontend/src/components/TopTakeaway.jsx` | Modify | "Show me" button (thread `onFocusFinding`) |
| `frontend/src/components/MovementAnalyzer.jsx` | Modify | `focusedFinding` state/refs; ambient + focus highlight in `onFrame`; caption overlay |

---

## PHASE A — Pure logic (CI-safe)

### Task 1: `movementScore.js` — directional score

**Files:** Create `frontend/src/lib/movementScore.js`, `frontend/src/lib/__tests__/movementScore.test.js`

- [ ] **Step 1: Write the failing tests**

`frontend/src/lib/__tests__/movementScore.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { scoreClip } from '../movementScore'

const f = (over = {}) => ({
  ruleId: 'X', kind: 'flag', severity: 'important', bodyRegion: 'hips-core',
  instanceCount: 1, confidence: 1, isFallProximal: false, timestamps: [1000], ...over,
})

describe('scoreClip', () => {
  it('is 100 with no flags', () => {
    expect(scoreClip([]).overall).toBe(100)
    expect(scoreClip([]).perRegion).toEqual({})
  })

  it('a critical fall-proximal finding penalizes its region more than a polish one', () => {
    const crit = scoreClip([f({ severity: 'critical', isFallProximal: true })]).perRegion['hips-core']
    const polish = scoreClip([f({ severity: 'polish' })]).perRegion['hips-core']
    expect(crit).toBeLessThan(polish)
  })

  it('more instances penalize more (log scaling)', () => {
    const few = scoreClip([f({ instanceCount: 1 })]).perRegion['hips-core']
    const many = scoreClip([f({ instanceCount: 8 })]).perRegion['hips-core']
    expect(many).toBeLessThan(few)
  })

  it('wins do not subtract', () => {
    const r = scoreClip([f({ kind: 'win', severity: 'critical' })])
    expect(r.overall).toBe(100)
    expect(r.perRegion).toEqual({})
  })

  it('overall averages only regions with findings; perRegion lists only present regions', () => {
    const r = scoreClip([
      f({ bodyRegion: 'hips-core', severity: 'critical', instanceCount: 4 }),
      f({ bodyRegion: 'knees-feet', severity: 'polish' }),
    ])
    expect(Object.keys(r.perRegion).sort()).toEqual(['hips-core', 'knees-feet'])
    const avg = Math.round((r.perRegion['hips-core'] + r.perRegion['knees-feet']) / 2)
    expect(r.overall).toBe(avg)
  })

  it('clamps a region to [0,100]', () => {
    const r = scoreClip([f({ severity: 'critical', instanceCount: 999, isFallProximal: true })])
    expect(r.perRegion['hips-core']).toBeGreaterThanOrEqual(0)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd /Users/mathewbudnik/coretriage/frontend && npx vitest run src/lib/__tests__/movementScore.test.js`
Expected: FAIL — cannot resolve `../movementScore`.

- [ ] **Step 3: Create `frontend/src/lib/movementScore.js`**

```js
// Directional movement score rolled up from the analyzer's findings. It is an
// adherence-of-technique signal derived from ~29 heuristic geometric rules — NOT
// a graded/learned score — so the UI must always label it "directional".

export const SEVERITY_WEIGHT = { critical: 18, important: 10, polish: 4 }

/**
 * Roll findings up into { overall, perRegion }. Each region starts at 100 and
 * loses a penalty per FLAG finding in that region:
 *   penalty = weight(severity) * log2(instanceCount + 1) * confidence * (fallProximal ? 1.5 : 1)
 * Regions clamp to [0,100]; overall is the mean of regions that have findings
 * (100 when there are none). Wins do not subtract.
 *
 * @param {Array} findings
 * @returns {{ overall: number, perRegion: Record<string, number> }}
 */
export function scoreClip(findings) {
  const flags = (findings ?? []).filter((f) => f.kind !== 'win')
  const perRegion = {}
  for (const f of flags) {
    const region = f.bodyRegion || 'other'
    const weight = SEVERITY_WEIGHT[f.severity] ?? SEVERITY_WEIGHT.polish
    const instances = f.instanceCount ?? (f.timestamps?.length ?? 1)
    const confidence = typeof f.confidence === 'number' ? f.confidence : 1
    const fallMult = f.isFallProximal ? 1.5 : 1
    const penalty = weight * Math.log2(instances + 1) * confidence * fallMult
    perRegion[region] = (perRegion[region] ?? 100) - penalty
  }
  for (const k of Object.keys(perRegion)) {
    perRegion[k] = Math.max(0, Math.min(100, Math.round(perRegion[k])))
  }
  const vals = Object.values(perRegion)
  const overall = vals.length
    ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
    : 100
  return { overall, perRegion }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd /Users/mathewbudnik/coretriage/frontend && npx vitest run src/lib/__tests__/movementScore.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/lib/movementScore.js frontend/src/lib/__tests__/movementScore.test.js
git -C /Users/mathewbudnik/coretriage commit -m "feat(analyzer): directional movement score (pure scoreClip)"
```

### Task 2: `bodyRegionJoints.js` — overlay selection

**Files:** Create `frontend/src/lib/bodyRegionJoints.js`, `frontend/src/lib/__tests__/bodyRegionJoints.test.js`

- [ ] **Step 1: Write the failing tests**

`frontend/src/lib/__tests__/bodyRegionJoints.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { BODY_REGION_JOINTS, jointsForFinding, activeFindingAt } from '../bodyRegionJoints'

describe('BODY_REGION_JOINTS', () => {
  it('covers all four finding bodyRegion values with non-empty joints + segments', () => {
    for (const region of ['head-gaze', 'shoulders-arms', 'hips-core', 'knees-feet']) {
      expect(BODY_REGION_JOINTS[region].joints.length).toBeGreaterThan(0)
      expect(BODY_REGION_JOINTS[region].segments.length).toBeGreaterThan(0)
    }
  })
})

describe('jointsForFinding', () => {
  it('returns the region spec for a known region', () => {
    expect(jointsForFinding({ bodyRegion: 'shoulders-arms' })).toBe(BODY_REGION_JOINTS['shoulders-arms'])
  })
  it('falls back to a non-empty spec for an unknown/missing region', () => {
    expect(jointsForFinding({ bodyRegion: 'nope' }).joints.length).toBeGreaterThan(0)
    expect(jointsForFinding(null).joints.length).toBeGreaterThan(0)
  })
})

describe('activeFindingAt', () => {
  const flag = (over) => ({ kind: 'flag', severity: 'polish', timestamps: [2000], ...over })
  it('returns a finding whose instance is within the window of ts', () => {
    const found = activeFindingAt([flag({ ruleId: 'A', timestamps: [2000] })], 2300)
    expect(found?.ruleId).toBe('A')
  })
  it('returns null when nothing is near', () => {
    expect(activeFindingAt([flag({ timestamps: [10000] })], 2000)).toBeNull()
  })
  it('prefers the higher-severity active finding', () => {
    const found = activeFindingAt([
      flag({ ruleId: 'low', severity: 'polish', timestamps: [2000] }),
      flag({ ruleId: 'high', severity: 'critical', timestamps: [2100] }),
    ], 2050)
    expect(found.ruleId).toBe('high')
  })
  it('ignores wins', () => {
    expect(activeFindingAt([{ kind: 'win', severity: 'critical', timestamps: [2000] }], 2000)).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd /Users/mathewbudnik/coretriage/frontend && npx vitest run src/lib/__tests__/bodyRegionJoints.test.js`
Expected: FAIL — cannot resolve `../bodyRegionJoints`.

- [ ] **Step 3: Create `frontend/src/lib/bodyRegionJoints.js`**

```js
// Overlay-selection helpers for the annotated pose overlay.
//
// The analyzer's findings carry exactly one of four `bodyRegion` strings and no
// per-rule landmark data, so the region IS the overlay key. Indices below are
// the standard MediaPipe BlazePose 33-landmark convention (shoulders 11/12,
// elbows 13/14, wrists 15/16, hips 23/24, knees 25/26, ankles 27/28, nose 0).

export const BODY_REGION_JOINTS = {
  'head-gaze':      { joints: [0, 11, 12],            segments: [[11, 12]] },
  'shoulders-arms': { joints: [11, 12, 13, 14, 15, 16], segments: [[11, 13], [13, 15], [12, 14], [14, 16], [11, 12]] },
  'hips-core':      { joints: [11, 12, 23, 24],       segments: [[11, 23], [12, 24], [23, 24], [11, 12]] },
  'knees-feet':     { joints: [23, 24, 25, 26, 27, 28], segments: [[23, 25], [25, 27], [24, 26], [26, 28]] },
}

// Fallback: the torso box — a safe, always-meaningful highlight.
const FALLBACK = { joints: [11, 12, 23, 24], segments: [[11, 23], [12, 24], [23, 24], [11, 12]] }

export function jointsForFinding(finding) {
  return BODY_REGION_JOINTS[finding?.bodyRegion] ?? FALLBACK
}

const SEVERITY_RANK = { critical: 3, important: 2, polish: 1 }
const DEFAULT_WINDOW_MS = 500

/**
 * The single most-severe FLAG finding whose instance is within `windowMs` of
 * `tsMs`, or null. Drives the ambient overlay highlight during playback.
 */
export function activeFindingAt(findings, tsMs, windowMs = DEFAULT_WINDOW_MS) {
  let best = null
  let bestRank = -1
  for (const f of findings ?? []) {
    if (f.kind === 'win') continue
    const near = (f.timestamps ?? []).some((t) => Math.abs(t - tsMs) <= windowMs)
    if (!near) continue
    const rank = SEVERITY_RANK[f.severity] ?? 0
    if (rank > bestRank) { bestRank = rank; best = f }
  }
  return best
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd /Users/mathewbudnik/coretriage/frontend && npx vitest run src/lib/__tests__/bodyRegionJoints.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/lib/bodyRegionJoints.js frontend/src/lib/__tests__/bodyRegionJoints.test.js
git -C /Users/mathewbudnik/coretriage commit -m "feat(analyzer): bodyRegion->joints map + active-finding-at-timestamp"
```

---

## PHASE B — Drawing + score card

### Task 3: extend `drawPose` with an optional highlight

**Files:** Modify `frontend/src/lib/poseDrawing.js`

Canvas drawing isn't unit-testable in jsdom, so this task is verified by **no-regression** (build green, the existing/new vitest suites pass) plus the Task 8 manual smoke. The highlight's *joint selection* is already unit-tested in Task 2.

- [ ] **Step 1: Add the highlight param + helper**

In `frontend/src/lib/poseDrawing.js`, change the `drawPose` signature and append the highlight pass. Replace the function body's final lines so the signature gains `highlight = null` and, after the landmark-dot loop, the highlight draws on top:

```js
export function drawPose(ctx, landmarks, highlight = null) {
  // Clear the full backing buffer (no DPR division — ctx has identity transform).
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  if (!landmarks || landmarks.length === 0) return

  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1

  const drawSet = (pairs, color, lineWidth) => {
    for (const [i, j] of pairs) {
      drawConnector(ctx, landmarks[i], landmarks[j], color, lineWidth * dpr)
    }
  }
  drawSet(TORSO, STYLES.torso.color, STYLES.torso.lineWidth)
  drawSet(ARMS,  STYLES.arms.color,  STYLES.arms.lineWidth)
  drawSet(LEGS,  STYLES.legs.color,  STYLES.legs.lineWidth)

  const radius = STYLES.landmark.radius * dpr
  for (let i = 0; i < landmarks.length; i++) {
    if (i >= 1 && i <= 10) continue  // face mesh — too noisy at climbing distance
    drawLandmarkDot(ctx, landmarks[i], STYLES.landmark.color, radius)
  }

  // Overlay: re-draw the flagged finding's segments + joints on top in the flag
  // color so the climber sees exactly which body part this finding is about.
  if (highlight) drawHighlight(ctx, landmarks, highlight, dpr)
}

function drawHighlight(ctx, landmarks, { joints = [], segments = [] }, dpr) {
  ctx.globalAlpha = 1
  for (const [i, j] of segments) {
    const a = landmarks[i]
    const b = landmarks[j]
    if (!a || !b) continue
    ctx.beginPath()
    ctx.moveTo(a.x * ctx.canvas.width, a.y * ctx.canvas.height)
    ctx.lineTo(b.x * ctx.canvas.width, b.y * ctx.canvas.height)
    ctx.strokeStyle = FLAGGED_JOINT_COLOR
    ctx.lineWidth = 6 * dpr
    ctx.lineCap = 'round'
    ctx.stroke()
  }
  for (const idx of joints) {
    const lm = landmarks[idx]
    if (!lm) continue
    ctx.beginPath()
    ctx.arc(lm.x * ctx.canvas.width, lm.y * ctx.canvas.height, 7 * dpr, 0, Math.PI * 2)
    ctx.fillStyle = FLAGGED_JOINT_COLOR
    ctx.fill()
  }
}
```

(The existing private `TORSO/ARMS/LEGS/STYLES`, `drawConnector`, `drawLandmarkDot`, and `FLAGGED_JOINT_COLOR` are unchanged and in scope.)

- [ ] **Step 2: Verify no regression**

Run: `cd /Users/mathewbudnik/coretriage/frontend && npm run build && npx vitest run`
Expected: build green; all existing suites pass (the new param defaults to `null`, so existing `drawPose(ctx, landmarks)` callers are unaffected).

- [ ] **Step 3: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/lib/poseDrawing.js
git -C /Users/mathewbudnik/coretriage commit -m "feat(analyzer): drawPose optional flagged-finding highlight overlay"
```

### Task 4: `MovementScoreCard.jsx`

**Files:** Create `frontend/src/components/MovementScoreCard.jsx`, `frontend/src/components/MovementScoreCard.test.jsx`

- [ ] **Step 1: Write the failing test**

`frontend/src/components/MovementScoreCard.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import MovementScoreCard from './MovementScoreCard'

const findings = [
  { ruleId: 'A', kind: 'flag', severity: 'important', bodyRegion: 'shoulders-arms', instanceCount: 4, confidence: 0.8, isFallProximal: false, timestamps: [1000] },
  { ruleId: 'B', kind: 'flag', severity: 'polish', bodyRegion: 'hips-core', instanceCount: 1, confidence: 0.7, isFallProximal: false, timestamps: [2000] },
]

describe('MovementScoreCard', () => {
  it('renders the overall score, a directional label, and a row per present region', () => {
    render(<MovementScoreCard findings={findings} />)
    expect(screen.getByText('Movement read')).toBeTruthy()
    expect(screen.getByText(/directional/i)).toBeTruthy()
    // two regions present -> two region rows (queried by their test ids)
    expect(screen.getAllByTestId('region-row').length).toBe(2)
  })

  it('renders nothing when there are no flags', () => {
    const { container } = render(<MovementScoreCard findings={[{ ruleId: 'W', kind: 'win', bodyRegion: 'hips-core', timestamps: [1] }]} />)
    expect(container.firstChild).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd /Users/mathewbudnik/coretriage/frontend && npx vitest run src/components/MovementScoreCard.test.jsx`
Expected: FAIL — cannot resolve `./MovementScoreCard`.

- [ ] **Step 3: Create `frontend/src/components/MovementScoreCard.jsx`**

```jsx
import { scoreClip } from '../lib/movementScore'
import { bodyRegionLabel } from '../lib/compoundFindings'

/**
 * Directional movement read for the analyzer report. Rolls the findings up into
 * an overall + per-region score (see lib/movementScore). It is explicitly a
 * directional signal from heuristic checks, never a graded/learned score —
 * the label says so. Renders nothing when there are no flags to score.
 */
const REGION_ORDER = ['shoulders-arms', 'hips-core', 'knees-feet', 'head-gaze']

function barColor(v) {
  if (v >= 80) return 'var(--ct-sage-deep, #5f7a4e)'
  if (v >= 60) return 'var(--ct-ochre, #d7ac5b)'
  return '#b85c44' // power — low region
}

export default function MovementScoreCard({ findings }) {
  const flags = (findings ?? []).filter((f) => f.kind !== 'win')
  if (flags.length === 0) return null

  const { overall, perRegion } = scoreClip(findings)
  const regions = REGION_ORDER.filter((r) => r in perRegion)
  const ringCirc = 2 * Math.PI * 26
  const ringOffset = ringCirc * (1 - overall / 100)

  return (
    <div className="ct-surface rounded-2xl p-4 md:p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-clay-deep">Movement read</p>
      <div className="flex items-center justify-between gap-3 mt-1">
        <div className="font-serif font-semibold text-[44px] leading-none text-ink">
          {overall}<span className="text-[15px] font-sans font-semibold text-ink-muted"> / 100</span>
        </div>
        <svg width="62" height="62" viewBox="0 0 62 62" aria-hidden="true">
          <circle cx="31" cy="31" r="26" fill="none" stroke="rgba(42,39,34,0.12)" strokeWidth="6" />
          <circle cx="31" cy="31" r="26" fill="none" stroke="var(--ct-ochre, #d7ac5b)" strokeWidth="6"
            strokeLinecap="round" strokeDasharray={ringCirc} strokeDashoffset={ringOffset}
            transform="rotate(-90 31 31)" />
        </svg>
      </div>

      <div className="flex flex-col gap-2.5 mt-3">
        {regions.map((region) => {
          const v = perRegion[region]
          return (
            <div key={region} data-testid="region-row" className="grid grid-cols-[88px_1fr_30px] items-center gap-2.5">
              <span className="text-[11.5px] font-semibold text-ink-soft">{bodyRegionLabel(region)}</span>
              <span className="h-[6px] rounded-full bg-ink/[0.10] overflow-hidden">
                <span className="block h-full rounded-full" style={{ width: `${v}%`, background: barColor(v) }} />
              </span>
              <span className="text-[11px] font-bold text-ink text-right ct-tnum">{v}</span>
            </div>
          )
        })}
      </div>

      <p className="text-[11px] text-ink-muted mt-3 pt-3 border-t border-ct-hairline">
        Directional · rolled up from the movement checks, not a graded score.
      </p>
    </div>
  )
}
```

(`bodyRegionLabel` is the same helper `AnalysisReport`/`RegionSummary` already use, from `lib/compoundFindings`.)

- [ ] **Step 4: Run to verify it passes**

Run: `cd /Users/mathewbudnik/coretriage/frontend && npx vitest run src/components/MovementScoreCard.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/components/MovementScoreCard.jsx frontend/src/components/MovementScoreCard.test.jsx
git -C /Users/mathewbudnik/coretriage commit -m "feat(analyzer): MovementScoreCard (directional overall + per-region)"
```

---

## PHASE C — Report + analyzer integration

### Task 5: render the score card + "Show me" in `AnalysisReport`

**Files:** Modify `frontend/src/components/AnalysisReport.jsx`

- [ ] **Step 1: Add a focused test**

Append a new test file `frontend/src/components/AnalysisReport.showme.test.jsx`:

```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import AnalysisReport from './AnalysisReport'

// Two flags so the report renders the FindingCard list (the top flag goes to TopTakeaway).
const findings = [
  { ruleId: 'A', name: 'Straight-arm lock', cue: 'cue a', severity: 'important', bodyRegion: 'shoulders-arms', kind: 'flag', instanceCount: 4, confidence: 0.8, isFallProximal: false, timestamps: [1000] },
  { ruleId: 'B', name: 'Banana sag', cue: 'cue b', severity: 'polish', bodyRegion: 'hips-core', kind: 'flag', instanceCount: 1, confidence: 0.7, isFallProximal: false, timestamps: [2000] },
]

describe('AnalysisReport — score + Show me', () => {
  it('renders the directional score card', () => {
    render(<AnalysisReport findings={findings} thumbnails={{}} onJumpTo={() => {}} onFocusFinding={() => {}} />)
    expect(screen.getByText('Movement read')).toBeTruthy()
  })

  it('a finding card Show me calls onFocusFinding with the finding', () => {
    const onFocusFinding = vi.fn()
    render(<AnalysisReport findings={findings} thumbnails={{}} onJumpTo={() => {}} onFocusFinding={onFocusFinding} />)
    const btns = screen.getAllByRole('button', { name: /show me/i })
    fireEvent.click(btns[0])
    expect(onFocusFinding).toHaveBeenCalled()
    expect(onFocusFinding.mock.calls[0][0]).toHaveProperty('ruleId')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd /Users/mathewbudnik/coretriage/frontend && npx vitest run src/components/AnalysisReport.showme.test.jsx`
Expected: FAIL — "Movement read" not found and no "Show me" button.

- [ ] **Step 3: Wire the score card + Show me**

In `AnalysisReport.jsx`:

(a) Add the import near the top:

```jsx
import MovementScoreCard from './MovementScoreCard'
```

(b) Extend the component signature to accept `onFocusFinding`:

```jsx
export default function AnalysisReport({ findings, thumbnails, onJumpTo, onFocusFinding }) {
```

(c) Render the score card as the first child of the main return (the `<div className="flex flex-col gap-4">` block — immediately before `{showTakeaway && (`):

```jsx
      <MovementScoreCard findings={findings} />
```

(d) Thread `onFocusFinding` into the `FindingCard` mapping (add the prop alongside `onJumpTo`):

```jsx
              <FindingCard
                key={finding.ruleId}
                finding={finding}
                thumbnail={thumbnails?.[finding.ruleId]}
                onJumpTo={onJumpTo}
                onFocusFinding={onFocusFinding}
                feedback={feedback}
                onMarkWrong={handleMarkWrong}
                onUnmarkWrong={handleUnmarkWrong}
              />
```

(e) In the `FindingCard` function signature add `onFocusFinding`, and add a "Show me" button at the start of the instances row (right before the `{finding.instanceCount === 1 ...}` span). Update the signature line:

```jsx
function FindingCard({ finding, thumbnail, onJumpTo, onFocusFinding, feedback, onMarkWrong, onUnmarkWrong }) {
```

and insert the button as the first child inside the instances row `<div className="px-3 pb-3 pt-1 flex flex-wrap items-center gap-1.5">`:

```jsx
        {onFocusFinding && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onFocusFinding(finding) }}
            className="flex items-center gap-1 text-[11px] font-bold text-cream bg-clay hover:brightness-110 px-2.5 py-1 rounded-md transition"
          >
            <Activity size={11} />
            Show me
          </button>
        )}
```

(`Activity` is already imported in this file.)

- [ ] **Step 4: Run to verify it passes**

Run: `cd /Users/mathewbudnik/coretriage/frontend && npx vitest run src/components/AnalysisReport.showme.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/components/AnalysisReport.jsx frontend/src/components/AnalysisReport.showme.test.jsx
git -C /Users/mathewbudnik/coretriage commit -m "feat(analyzer): score card + per-finding Show me in AnalysisReport"
```

### Task 6: "Show me" on the top takeaway

**Files:** Modify `frontend/src/components/TopTakeaway.jsx`

- [ ] **Step 1: Thread `onFocusFinding` + add the button**

The top flag is pulled out of the findings list into `TopTakeaway`, so it needs its own "Show me". In `TopTakeaway.jsx`:

(a) Add `onFocusFinding` to the component's props (the default export `TopTakeaway({ finding, thumbnail, onJumpTo })` → add `onFocusFinding`):

```jsx
export default function TopTakeaway({ finding, thumbnail, onJumpTo, onFocusFinding }) {
```

(b) In the actions row (next to the existing "Jump to first" button), add:

```jsx
        {onFocusFinding && (
          <button
            type="button"
            onClick={() => onFocusFinding(finding)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-clay text-cream hover:brightness-110 transition"
          >
            Show me
          </button>
        )}
```

(c) In `AnalysisReport.jsx`, pass `onFocusFinding` to `<TopTakeaway>`:

```jsx
        <TopTakeaway
          finding={topFlag}
          thumbnail={thumbnails?.[topFlag.ruleId]}
          onJumpTo={onJumpTo}
          onFocusFinding={onFocusFinding}
        />
```

- [ ] **Step 2: Verify build + tests**

Run: `cd /Users/mathewbudnik/coretriage/frontend && npm run build && npx vitest run`
Expected: build green; all suites pass (the existing `TopTakeaway` test still passes — the new prop is optional).

- [ ] **Step 3: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/components/TopTakeaway.jsx frontend/src/components/AnalysisReport.jsx
git -C /Users/mathewbudnik/coretriage commit -m "feat(analyzer): Show me on the top takeaway"
```

### Task 7: focus mode + ambient highlight in `MovementAnalyzer`

**Files:** Modify `frontend/src/components/MovementAnalyzer.jsx`

Video/canvas behavior isn't unit-testable in jsdom; verified by no-regression build/tests + the Task 8 manual smoke. The data feeding it (`jointsForFinding`/`activeFindingAt`) is unit-tested in Task 2.

- [ ] **Step 1: Imports + state/refs**

Add the import near the other lib imports:

```jsx
import { jointsForFinding, activeFindingAt } from '../lib/bodyRegionJoints'
```

Add state + refs near the existing `findings`/`landmarksByMs` state (after line ~176):

```jsx
  const [focusedFinding, setFocusedFinding] = useState(null)
  const focusedFindingRef = useRef(null)
  const findingsRef = useRef([])
```

Keep the refs in sync (add two small effects near the other effects):

```jsx
  useEffect(() => { findingsRef.current = findings }, [findings])
  useEffect(() => { focusedFindingRef.current = focusedFinding }, [focusedFinding])
```

- [ ] **Step 2: Highlight in the onFrame loop**

In the playback overlay `useEffect` (the `onFrame` function, ~277-284), replace the `drawPose(ctx, landmarks)` call so it computes the highlight first:

```jsx
    function onFrame(_now, metadata) {
      const ts = Math.round(metadata.mediaTime * 1000)
      const keys = sortedKeysRef.current
      const key = nearestKey(keys, ts)
      const landmarks = key != null ? landmarksByMs.get(key) : null
      const focused = focusedFindingRef.current
      const active = focused ?? activeFindingAt(findingsRef.current, ts)
      drawPose(ctx, landmarks, active ? jointsForFinding(active) : null)
      rvfcHandleRef.current = video.requestVideoFrameCallback(onFrame)
    }
```

And update the `timeupdate` fallback similarly:

```jsx
    const onTimeUpdate = () => {
      const ts = Math.round(video.currentTime * 1000)
      const key = nearestKey(sortedKeysRef.current, ts)
      const landmarks = key != null ? landmarksByMs.get(key) : null
      const focused = focusedFindingRef.current
      const active = focused ?? activeFindingAt(findingsRef.current, ts)
      drawPose(ctx, landmarks, active ? jointsForFinding(active) : null)
    }
```

- [ ] **Step 3: Focus handler + clear-on-play + reset**

Add the focus handler (near `resetToIdle`, ~805):

```jsx
  function handleFocusFinding(finding) {
    const v = videoRef.current
    if (!v || !finding) return
    const ts0 = finding.timestamps?.[0]
    if (ts0 != null) v.currentTime = ts0 / 1000
    v.pause()
    setFocusedFinding(finding)
  }
```

Clear focus when playback resumes (a small effect alongside the overlay loop):

```jsx
  useEffect(() => {
    if (status !== STATUS.READY) return
    const v = videoRef.current
    if (!v) return
    const onPlay = () => setFocusedFinding(null)
    v.addEventListener('play', onPlay)
    return () => v.removeEventListener('play', onPlay)
  }, [status])
```

In `resetToIdle`, add `setFocusedFinding(null)` alongside the other resets.

- [ ] **Step 4: Caption overlay + pass the handler to the report**

Inside the always-mounted stage `<div ref={stageRef} ...>` (after the `<canvas>`), add the caption (renders only in focus mode):

```jsx
          {status === STATUS.READY && focusedFinding && (
            <div className="absolute left-2 right-2 bottom-2 rounded-xl bg-ink/75 border border-[rgba(194,54,43,0.5)] backdrop-blur-sm px-3 py-2.5 pointer-events-auto">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: '#e08c7f' }}>
                  What we saw
                </p>
                <button
                  type="button"
                  onClick={() => setFocusedFinding(null)}
                  className="text-cream/70 hover:text-cream text-xs leading-none"
                  aria-label="Close annotation"
                >
                  ✕
                </button>
              </div>
              <p className="text-[12.5px] text-cream mt-1 leading-snug">
                <span className="font-semibold">{focusedFinding.name}</span> — {focusedFinding.cue}
              </p>
            </div>
          )}
```

Wait — no emojis. Replace the `✕` close glyph with a lucide `X` icon. Ensure `X` is imported from `lucide-react` (add to the existing lucide import). The button becomes:

```jsx
                <button
                  type="button"
                  onClick={() => setFocusedFinding(null)}
                  className="text-cream/70 hover:text-cream"
                  aria-label="Close annotation"
                >
                  <X size={13} />
                </button>
```

Then pass the handler to the report (the existing `<AnalysisReport ... />`, ~1072):

```jsx
          <AnalysisReport
            findings={findings}
            thumbnails={thumbnails}
            onJumpTo={(ms) => {
              const v = videoRef.current
              if (!v) return
              v.currentTime = ms / 1000
            }}
            onFocusFinding={handleFocusFinding}
          />
```

- [ ] **Step 5: Verify build + tests + grep**

Run: `cd /Users/mathewbudnik/coretriage/frontend && npm run build && npx vitest run` and the grep gate:

```bash
cd /Users/mathewbudnik/coretriage/frontend && grep -rnE "217,119,87|#d97757|#f0a875|#1c2520|#243530|#1f2924|#f0f5ed|#c8d3c4|#14b8a6|#fb7185|#fbbf24|#95a698|#7dd3c0|#a78bfa|text-white|rgba\(255,255,255" src --include="*.jsx" --include="*.js" | grep -vE "\.test\.|__tests__"
```

Expected: build green; all suites pass; grep no output. (No emoji — the close control is a lucide `X`.)

- [ ] **Step 6: Commit**

```bash
git -C /Users/mathewbudnik/coretriage add frontend/src/components/MovementAnalyzer.jsx
git -C /Users/mathewbudnik/coretriage commit -m "feat(analyzer): live + focused flagged-body-part overlay with caption"
```

---

## PHASE D — Verify

### Task 8: Full verification gate

- [ ] **Step 1: Frontend build + all tests**

Run: `cd /Users/mathewbudnik/coretriage/frontend && npm run build && npx vitest run`
Expected: build green; all suites pass (prior tests + the new movementScore / bodyRegionJoints / MovementScoreCard / AnalysisReport.showme).

- [ ] **Step 2: Almanac grep gate (must be 0)**

Run from `frontend/`:

```bash
cd /Users/mathewbudnik/coretriage/frontend && grep -rnE "217,119,87|#d97757|#f0a875|#1c2520|#243530|#1f2924|#f0f5ed|#c8d3c4|#14b8a6|#fb7185|#fbbf24|#95a698|#7dd3c0|#a78bfa|text-white|rgba\(255,255,255" src --include="*.jsx" --include="*.js" | grep -vE "\.test\.|__tests__"
```

Expected: no output.

- [ ] **Step 3: Constraint audit**

Confirm via `git diff main --name-only` (or the branch base): the changed files are ONLY the 10 in the File Structure table. Confirm **none** of these are touched: `CoachTab.jsx` (paid gate), `frontend/src/components/log/*`, `hooks/useSessionLog.js`, `ui/GradientSlider.jsx`, `TrimScrubber.jsx`, `FallScrubber.jsx`, `public/models/*`, and the privacy copy at `MovementAnalyzer.jsx:1057-1059` / `:1117` (we add a caption div but do not edit those lines).

- [ ] **Step 4: Manual smoke (covers the canvas/video paths)**

Start the app (`cd frontend && npm run dev` + backend), sign in with a trial/active account, open Coach → Movement Analyzer, upload a short climbing clip with the context form. Confirm: (1) the report opens with the **Movement read** score + per-region bars + "directional" label; (2) tapping a finding's **Show me** seeks+pauses and the **flagged body part lights up red** with a "What we saw" caption; closing it (X) or pressing play clears it; (3) during normal playback the flagged part lights up at the moments findings occur; (4) the gate still blocks expired/anon users (no change to `CoachTab.jsx`).

- [ ] **Step 5: Final commit (if polish fixes were needed)**

```bash
git -C /Users/mathewbudnik/coretriage add -A -- frontend/src
git -C /Users/mathewbudnik/coretriage commit -m "chore(analyzer): verification gate — build/tests/grep green"
```

---

## Self-Review (reconciled against the spec)

- **Spec coverage:** live annotated overlay (Task 3 draw + Task 7 ambient/focus wiring + `bodyRegionJoints` Task 2), directional score (Task 1 + card Task 4 + report Task 5), Show-me focus on every finding (Task 5 + Task 6). All spec sections map to a task.
- **Presentation only:** no task edits `poseRules/*`, `poseRuleEngine.js`, thresholds, or advice copy — the "beta" content is untouched.
- **Constraints:** `CoachTab.jsx` (gate) and the privacy copy are NOT in any task's file list; no backend; nothing persisted/uploaded. Avoid-list (`components/log/*`, `useSessionLog.js`, `GradientSlider.jsx`, `TrimScrubber.jsx`, `FallScrubber.jsx`, `public/models/*`) untouched.
- **Type consistency:** `scoreClip` returns `{ overall, perRegion }` consumed identically by `MovementScoreCard` (Task 4). `jointsForFinding` returns `{ joints, segments }` consumed by `drawPose`'s `highlight` (Task 3) and produced for the active finding in `onFrame` (Task 7). `onFocusFinding(finding)` is the same signature threaded AnalysisReport → FindingCard (Task 5) and AnalysisReport → TopTakeaway (Task 6), and handled by `handleFocusFinding` (Task 7). No emojis (lucide `X` for close).
- **Deferred (not v1):** per-rule exact primitives, base-skeleton dimming in focus mode, Pentagon/drill links, persistence/history/comparison/coach-handoff/export.
