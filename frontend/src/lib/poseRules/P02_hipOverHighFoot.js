import { hipMidpoint, allVisible, bodyScale, LM } from '../posePrimitives'

/**
 * P02 — Hip drove over a high foot (WIN)
 *
 * The positive counterpart to K01. Climber got a foot up high AND
 * shifted the pelvis over the foot — that's the "frog" / proper hip
 * delivery, which transfers the work to the legs.
 *
 * Detection model:
 *   • Ankle y is at least HIGH_STEP_DELTA above hip y (foot is high).
 *   • Hip x is within HIP_OVER_FOOT_MAX of the ankle x (pelvis is OVER
 *     the foot, the success state of K01).
 *   • Sustained ≥ MIN_DURATION_MS.
 */

const HIGH_STEP_DELTA_RATIO = 0.20      // ankle ≥ 20% of torso above hip
const HIP_OVER_FOOT_MAX_RATIO = 0.50    // hip x within 50% of shoulder width of ankle x = delivered
const MIN_DURATION_MS = 800
const MAX_GAP_MS = 250

function goodHighStepScore(landmarks, scale) {
  const hip = hipMidpoint(landmarks)
  if (!hip) return null

  let bestScore = null
  for (const ankleIdx of [LM.LEFT_ANKLE, LM.RIGHT_ANKLE]) {
    if (!allVisible(landmarks, [ankleIdx])) continue
    const ankle = landmarks[ankleIdx]

    // High-step condition — body-relative.
    const heightAdvantageRatio = (hip.y - ankle.y) / scale.torsoLength
    if (heightAdvantageRatio < HIGH_STEP_DELTA_RATIO) continue

    // Pelvis delivered over the foot — body-relative.
    const driftRatio = Math.abs(hip.x - ankle.x) / scale.shoulderWidth
    if (driftRatio > HIP_OVER_FOOT_MAX_RATIO) continue

    // Tighter pelvis-over-foot = stronger position.
    const score = Math.min(1, 0.55 + (HIP_OVER_FOOT_MAX_RATIO - driftRatio) * 0.8)
    if (bestScore == null || score > bestScore) bestScore = score
  }
  return bestScore
}

export const P02 = {
  id: 'P02',
  name: 'Hip over a high foot',
  cue: 'Clean weight transfer onto a high foot — that\'s the move.',
  kind: 'win',
  bodyRegion: 'knees-feet',
  minDurationMs: MIN_DURATION_MS,
  maxGapMs: MAX_GAP_MS,

  // Mirrors K01's gating — skipped on roof.
  appliesWhen: (ctx) => ctx?.wallAngle !== 'roof',

  detect(frame, context) {
    const scale = bodyScale(frame.landmarks, context)
    if (!scale) return { matched: false }
    const score = goodHighStepScore(frame.landmarks, scale)
    if (score == null) return { matched: false }
    return { matched: true, confidence: score }
  },
}
