import { allVisible, visibilityWeight, LM } from '../posePrimitives'

/**
 * H03 — Hugging the slab
 *
 * The fear-instinct response to slab terrain: the climber presses their
 * pelvis into the wall ("hugs" the slab), butt directly under shoulders
 * instead of sticking out. Friction physics works AGAINST you here —
 * pressing hips into the wall lifts body weight off the feet, where
 * the rubber contact patch lives. Feet skate.
 *
 * Detection model (2D image plane, side-on view):
 *   Identical math to H01 (banana sag on overhang) but with the sign
 *   check INVERTED. Both rules ask: which side of the shoulder→ankle
 *   line are the hips on relative to the wrists (which hold the wall)?
 *     • H01 (overhang): hips on the OPPOSITE side from wrists → banana
 *     • H03 (slab):     hips on the SAME side as wrists      → hugging
 *
 *   1. Compute shoulder mid S, hip mid H, ankle mid A, wrist mid W.
 *   2. Signed perp deviation of H from line S→A (2D cross product).
 *   3. Compare sign with same calc for W. SAME side → hugging.
 *   4. Magnitude of the deviation, normalized by torso length, must
 *      exceed DEVIATION_THRESHOLD before flagging — a small lean
 *      toward the wall is normal slab posture; sustained big lean is
 *      the bug.
 *
 * Wall-angle gating: slab only. On vertical/overhang the hugging
 * geometry is mechanically different.
 *
 * See docs/movement-analyzer/technique-catalog.md §H03.
 */

const DEVIATION_THRESHOLD = 0.20   // hip deviation ≥ 20% of torso length toward wall = hugging
const MIN_DURATION_MS = 1200
const MAX_GAP_MS = 250

function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

function crossSign(S, A, P) {
  return (A.x - S.x) * (P.y - S.y) - (A.y - S.y) * (P.x - S.x)
}

function huggingScore(landmarks) {
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
  if (torsoLen < 0.05) return null

  const saLen = Math.hypot(A.x - S.x, A.y - S.y)
  if (saLen < 0.05) return null

  const crossH = crossSign(S, A, H)
  const crossW = crossSign(S, A, W)

  // Hugging signature: hips on the SAME side of the SA line as wrists.
  // The opposite case (banana) is H01's territory.
  if (Math.sign(crossH) !== Math.sign(crossW)) return null
  if (crossW === 0) return null

  const perpDist = Math.abs(crossH) / saLen
  const deviationRatio = perpDist / torsoLen
  if (deviationRatio < DEVIATION_THRESHOLD) return null

  const visWt = visibilityWeight(landmarks, required)
  return Math.min(1, 0.55 + (deviationRatio - DEVIATION_THRESHOLD) * 2.5) * visWt
}

export const H03 = {
  id: 'H03',
  name: 'Hugging the slab',
  cue: 'Butt out — nose over toes.',
  whyItMatters:
    "On slab, your feet ARE your contact with the wall — the more body " +
    "weight you press onto them, the more friction they generate. " +
    "Hugging the slab does the opposite: pressing your hips toward the " +
    "wall lifts weight off your feet and onto your arms (and into thin " +
    "air, since slab holds are often friction-only). The shoe pops. The " +
    "instinct to hug is the body trying to feel 'safe' on low-angle " +
    "terrain, but it's actively making the climbing harder.",
  howToFix:
    "Think 'butt out, nose over toes.' Push your hips BACK away from the " +
    "wall so your weight stacks vertically over your feet. Your body " +
    "line goes from feet (on the wall) to head (over your feet), with " +
    "the hips behind the foot line. Counterintuitive but it's where the " +
    "friction lives. Drill: easy slab problems with the deliberate cue " +
    "'butt back' on every foot placement — the body learns the new " +
    "default position over a few sessions.",
  whenYouSeeIt:
    "Almost universal in newer slab climbers, and a regression even " +
    "experienced climbers fall back into when they're scared (high off " +
    "the deck, runout, etc.). If H03 fires repeatedly in a clip and " +
    "feet pop a lot, the body position is the root cause, not the " +
    "rubber. Knee valgus (K05) is often a downstream symptom — fixing " +
    "the hip position fixes both at once.",
  severity: 'important',
  bodyRegion: 'hips-core',
  minDurationMs: MIN_DURATION_MS,
  maxGapMs: MAX_GAP_MS,

  // Slab-only: friction physics that doesn't apply on steeper terrain.
  appliesWhen: (ctx) => ctx?.wallAngle === 'slab',

  detect(frame) {
    const score = huggingScore(frame.landmarks)
    if (score == null) return { matched: false }
    return { matched: true, confidence: score }
  },
}
