import { allVisible, LM } from '../posePrimitives'

/**
 * H01 — Hips peeling off wall (banana sag)
 *
 * On overhang and roof terrain, the climber's hips hang back away from
 * the wall instead of being driven up close to it. The body forms an
 * open arc (a banana shape); the fingers take all the load; feet skate
 * off because the body weight isn't pressed onto them.
 *
 * Detection model (2D image plane, monocular):
 *   1. Compute shoulder midpoint S, hip midpoint H, ankle midpoint A.
 *   2. Compute the signed perpendicular deviation of H from the line
 *      S→A using the 2D cross product. Sign tells us which SIDE of the
 *      shoulder-ankle line the hips are on.
 *   3. Compute the wrist midpoint W and its signed side. The wrists
 *      are on the wall (the climber is holding it), so "wall side" =
 *      the side W is on. If H is on the same side as W, hips are
 *      pressed toward the wall — that's GOOD, not banana sag.
 *   4. If H is on the OPPOSITE side from W, AND the perpendicular
 *      distance from H to line SA exceeds DEVIATION_THRESHOLD × torso
 *      length, the climber is bananaing.
 *
 * Wall-angle gating: overhang + roof only. On vertical/slab, hips
 * naturally sit slightly back from the SA line as a function of how
 * the camera sees the climber's pelvis — would generate constant false
 * positives.
 *
 * See docs/movement-analyzer/technique-catalog.md §H01.
 */

const DEVIATION_THRESHOLD = 0.35   // hip offset from SA line ≥ 35% of torso length
const MIN_DURATION_MS = 1200       // sustained 1.2s — quick reposition doesn't count
const MAX_GAP_MS = 250

function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/**
 * 2D cross product of (A-S) × (P-S). Returns a signed scalar — the
 * sign indicates which side of the line SA the point P is on.
 */
function crossSign(S, A, P) {
  return (A.x - S.x) * (P.y - S.y) - (A.y - S.y) * (P.x - S.x)
}

function bananaSagScore(landmarks) {
  const required = [
    LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER,
    LM.LEFT_HIP, LM.RIGHT_HIP,
    LM.LEFT_ANKLE, LM.RIGHT_ANKLE,
    LM.LEFT_WRIST, LM.RIGHT_WRIST,
  ]
  if (!allVisible(landmarks, required)) return null

  const S = midpoint(landmarks[LM.LEFT_SHOULDER], landmarks[LM.RIGHT_SHOULDER])
  const H = midpoint(landmarks[LM.LEFT_HIP],      landmarks[LM.RIGHT_HIP])
  const A = midpoint(landmarks[LM.LEFT_ANKLE],    landmarks[LM.RIGHT_ANKLE])
  const W = midpoint(landmarks[LM.LEFT_WRIST],    landmarks[LM.RIGHT_WRIST])

  const torsoLen = Math.hypot(S.x - H.x, S.y - H.y)
  if (torsoLen < 0.05) return null                 // body too small / collapsed — bail

  const saLen = Math.hypot(A.x - S.x, A.y - S.y)
  if (saLen < 0.05) return null                    // shoulders-to-ankles too short

  const crossH = crossSign(S, A, H)
  const crossW = crossSign(S, A, W)

  // Wrists give us the wall side. If H is on the same side as W, the
  // climber is pressing hips toward the wall — opposite of banana sag.
  if (Math.sign(crossH) === Math.sign(crossW)) return null
  if (crossW === 0) return null                    // wrists straddle the line — ambiguous

  // Perpendicular distance from H to line SA (always positive).
  const perpDist = Math.abs(crossH) / saLen
  const deviationRatio = perpDist / torsoLen
  if (deviationRatio < DEVIATION_THRESHOLD) return null

  // Confidence grows with how far the sag goes past threshold.
  return Math.min(1, 0.55 + (deviationRatio - DEVIATION_THRESHOLD) * 2.5)
}

export const H01 = {
  id: 'H01',
  name: 'Banana sag — hips off the wall',
  cue: 'Drive your hips in toward the wall.',
  whyItMatters:
    "On overhang, the closer your hips are to the wall the more body " +
    "weight loads onto your feet instead of dangling off your fingers. " +
    "Bananaing the body opens a long lever from your hands to your feet " +
    "— forearms cook, feet skate, and you fall before you've made the " +
    "move you came to make.",
  howToFix:
    "Engage your core and push your hips toward the wall so your body " +
    "shape is closer to a straight line (or even slightly convex INTO " +
    "the wall). Active toes — flex your feet, don't let them dangle. " +
    "Drill: foot-on, foot-on, foot-on with a deliberate 'hips in' pulse " +
    "between each. If your core can't hold it, that's the limiter — " +
    "front lever progressions and tucks build the strength to.",
  whenYouSeeIt:
    "Almost universal on overhang as climbers fatigue: the core gives " +
    "out, hips drop, body forms a banana. Often the last thing that " +
    "happens before a fall on steep terrain. If H01 fires near a marked " +
    "fall, that's almost always the proximate cause.",
  severity: 'important',
  bodyRegion: 'hips-core',
  minDurationMs: MIN_DURATION_MS,
  maxGapMs: MAX_GAP_MS,

  // At advanced grades, a brief banana mid-coil is part of a powerful
  // move — the body loads the arc to spring out of it. On boards the
  // coil-and-release pattern is the dominant style. Require the sag
  // to be sustained much longer before calling it a fault.
  profileOverrides: {
    advancedGrade: { minDurationMs: 2200, minConfidence: 0.70 },
    board:         { minDurationMs: 2800, minConfidence: 0.78 },
  },

  // Only meaningful on steep terrain. On vertical/slab, the camera
  // geometry produces spurious deviations.
  appliesWhen: (ctx) =>
    ctx?.wallAngle === 'overhang' || ctx?.wallAngle === 'roof',

  detect(frame) {
    const score = bananaSagScore(frame.landmarks)
    if (score == null) return { matched: false }
    return { matched: true, confidence: score }
  },
}
