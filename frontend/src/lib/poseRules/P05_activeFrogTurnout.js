import { allVisible, bodyScale, visibilityWeight, LM } from '../posePrimitives'

/**
 * P05 — Active frog turnout (WIN)
 *
 * Positive counterpart to H08. The climber has actively splayed the
 * knees outward and dropped the pelvis to the wall — the "frog"
 * position that's the cheapest source of rest on steep terrain. When
 * we catch this held position we want to call it out: it's the move
 * that unlocks endurance on overhang.
 *
 * Detection model:
 *   1. Both ankles + both knees visible.
 *   2. BOTH knees laterally splayed outward of their ankles by at
 *      least FROG_LATERAL_MIN — the open-leg signature.
 *   3. Sustained ≥ MIN_DURATION_MS — half-second pass-throughs don't
 *      count; a real held frog rest does.
 */

const FROG_LATERAL_MIN_RATIO = 0.50   // BOTH knees outboard of ankle by ≥ 50% of shoulder width
const MIN_DURATION_MS = 1200
const MAX_GAP_MS = 250

function frogScore(landmarks, scale) {
  const need = [
    LM.LEFT_KNEE, LM.RIGHT_KNEE,
    LM.LEFT_ANKLE, LM.RIGHT_ANKLE,
    LM.LEFT_HIP, LM.RIGHT_HIP,
  ]
  if (!allVisible(landmarks, need)) return null

  // Pelvis midline as the "inside" reference. Knees splayed outward of
  // their ankles = knee x is further from midline than ankle x.
  const hipMidX = (landmarks[LM.LEFT_HIP].x + landmarks[LM.RIGHT_HIP].x) / 2

  const leftKnee   = landmarks[LM.LEFT_KNEE]
  const rightKnee  = landmarks[LM.RIGHT_KNEE]
  const leftAnkle  = landmarks[LM.LEFT_ANKLE]
  const rightAnkle = landmarks[LM.RIGHT_ANKLE]

  // Body-relative outward ratios (positive = knee outboard of ankle).
  const leftOutwardRatio  = (Math.abs(leftKnee.x  - hipMidX) - Math.abs(leftAnkle.x  - hipMidX)) / scale.shoulderWidth
  const rightOutwardRatio = (Math.abs(rightKnee.x - hipMidX) - Math.abs(rightAnkle.x - hipMidX)) / scale.shoulderWidth

  // Both must be clearly outboard for a real frog.
  if (leftOutwardRatio < FROG_LATERAL_MIN_RATIO || rightOutwardRatio < FROG_LATERAL_MIN_RATIO) return null

  const avgRatio = (leftOutwardRatio + rightOutwardRatio) / 2
  const visWt = visibilityWeight(landmarks, [
    LM.LEFT_KNEE, LM.RIGHT_KNEE,
    LM.LEFT_ANKLE, LM.RIGHT_ANKLE,
    LM.LEFT_HIP, LM.RIGHT_HIP,
  ])
  return Math.min(1, 0.55 + (avgRatio - FROG_LATERAL_MIN_RATIO) * 0.5) * visWt
}

export const P05 = {
  id: 'P05',
  name: 'Active frog turnout',
  cue: 'Knees splayed, hips to the wall — that\'s a rest position.',
  kind: 'win',
  bodyRegion: 'hips-core',
  minDurationMs: MIN_DURATION_MS,
  maxGapMs: MAX_GAP_MS,

  // Mirrors H08 gating.
  appliesWhen: (ctx) =>
    ctx?.wallAngle === 'vertical' || ctx?.wallAngle === 'overhang',

  detect(frame, context) {
    const scale = bodyScale(frame.landmarks, context)
    if (!scale) return { matched: false }
    const score = frogScore(frame.landmarks, scale)
    if (score == null) return { matched: false }
    return { matched: true, confidence: score }
  },
}
