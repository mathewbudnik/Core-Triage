import { hipMidpoint, allVisible, bodyScale, kneeAngle, LM } from '../posePrimitives'

/**
 * K01 — High step without body follow
 *
 * The climber gets a foot up high on a hold, but the pelvis stays low
 * and the body can't transfer weight onto the new foot. Common pattern:
 * "I got my foot up there but I can't stand on it."
 *
 * Detection model:
 *   • The ankle is "high": ankle y is above (smaller than) hip y by
 *     more than HIGH_STEP_DELTA (foot is at or above pelvis level).
 *   • The hip is NOT shifted over the foot: |hip_x - ankle_x| is
 *     larger than HIP_DRIFT_MAX (climber hasn't moved the pelvis
 *     toward the high foot).
 *   • Sustained for MIN_DURATION_MS — a brief transition is fine, a
 *     long "stuck" moment is the flag.
 *
 * Wall-angle gating: most relevant on slab + vertical where high steps
 * are common. Skipped on roof.
 *
 * See docs/movement-analyzer/technique-catalog.md §K01.
 */

const HIGH_STEP_DELTA_RATIO = 0.20    // ankle ≥ 20% of torso above hip
const HIP_DRIFT_MAX_RATIO = 0.65       // hip x more than 65% of shoulder-width from ankle x = stuck
const LOADED_KNEE_ANGLE_MAX = 160      // knee bent ≤ 160° = climber attempting to weight the foot
const MIN_DURATION_MS = 1000
const MAX_GAP_MS = 250

function highStepStuckScore(landmarks, scale) {
  // Check both feet — the higher one is the "high step" candidate.
  const hip = hipMidpoint(landmarks)
  if (!hip) return null

  let bestScore = null
  for (const side of ['left', 'right']) {
    const ankleIdx = side === 'left' ? LM.LEFT_ANKLE : LM.RIGHT_ANKLE
    if (!allVisible(landmarks, [ankleIdx])) continue
    const ankle = landmarks[ankleIdx]

    // High-step condition: ankle above hip in image space (y smaller).
    // Normalized against torso length so a tall climber's "high foot"
    // and a short climber's match the same body-relative geometry.
    const heightAdvantageRatio = (hip.y - ankle.y) / scale.torsoLength
    if (heightAdvantageRatio < HIGH_STEP_DELTA_RATIO) continue

    // Multi-signal load gate: the same-side knee must be bent. A
    // straight-knee high foot is just a leg lift — the climber isn't
    // actually trying to weight the foot, so K01 ("can't stand on it")
    // doesn't apply. Bent knee → committed to standing on the foot.
    const knee = kneeAngle(landmarks, side)
    if (knee == null || knee > LOADED_KNEE_ANGLE_MAX) continue

    // Stuck condition: pelvis hasn't moved over the foot, normalized
    // against shoulder width (the lateral baseline of the body).
    const driftRatio = Math.abs(hip.x - ankle.x) / scale.shoulderWidth
    if (driftRatio < HIP_DRIFT_MAX_RATIO) continue  // pelvis is over the foot → good

    // The further the hip is from over the foot, the more stuck.
    const score = Math.min(1, 0.5 + (driftRatio - HIP_DRIFT_MAX_RATIO) * 0.5)
    if (bestScore == null || score > bestScore) bestScore = score
  }

  return bestScore
}

export const K01 = {
  id: 'K01',
  name: 'High step without body follow',
  cue: 'Drive the hip over the high foot.',
  whyItMatters:
    "A high foot only generates power once your center of mass is over it. " +
    "If the pelvis stays back, the foot is just dead weight — you can't push " +
    "off it, and you end up pulling with the arms to compensate. The work " +
    "shifts off the legs (big muscles, lots of endurance) and onto the arms " +
    "(small, pumps fast).",
  howToFix:
    "Once the foot is set, deliberately drive the same-side hip toward the " +
    "wall AND over the foot — knee turning in, hip turning out (the 'frog' " +
    "position). Cue: 'hip on the foot.' Drill: with a partner watching, " +
    "step high, then count one full breath in the high position before " +
    "moving — forces you to commit weight to the foot, not just plant it.",
  whenYouSeeIt:
    "Common when the climber relies on flexibility to get a foot up but " +
    "doesn't have the hip mobility or trust to transfer onto it. Often appears " +
    "right before a hand reach that ends up feeling short — because the body " +
    "wasn't actually over the foot, the reach starts from a low position.",
  severity: 'important',
  bodyRegion: 'knees-feet',
  minDurationMs: MIN_DURATION_MS,
  maxGapMs: MAX_GAP_MS,

  // At advanced grades a high foot held before a deadpoint commit isn't
  // a "stuck" position — it's intentional loading. On boards even more
  // so: feet go high and stay high before big throws. Tighten the
  // sustain window so we only flag genuinely-stuck high steps.
  profileOverrides: {
    advancedGrade: { minDurationMs: 1800, minConfidence: 0.70 },
    board:         { minDurationMs: 2400, minConfidence: 0.78 },
  },

  // Skipped on roof — different mechanics there.
  appliesWhen: (ctx) => ctx?.wallAngle !== 'roof',

  detect(frame, context) {
    const scale = bodyScale(frame.landmarks, context)
    if (!scale) return { matched: false }
    const score = highStepStuckScore(frame.landmarks, scale)
    if (score == null) return { matched: false }
    return { matched: true, confidence: score }
  },
}
