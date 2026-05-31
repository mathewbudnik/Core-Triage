import { allVisible, bodyScale, LM } from '../posePrimitives'

/**
 * P03 — Eyes up the wall (WIN)
 *
 * The positive counterpart to G01. The climber is actively scanning the
 * wall — head clearly raised above the shoulder line — instead of
 * staring at their feet. That's the visual-search habit good climbers
 * build, and it deserves explicit reinforcement.
 *
 * Detection model:
 *   • Nose y is at least HEAD_UP_MIN above shoulder midpoint y (head is
 *     clearly raised, not just at neutral).
 *   • Sustained ≥ MIN_DURATION_MS — a quick glance up doesn't count.
 *     Real scanning is held.
 *
 * Wall-angle gating: mirrors G01 — most diagnostic on slab + vertical,
 * where the climber CAN look up and SHOULD be scanning. On overhang /
 * roof head position is mechanically constrained, so an "eyes up"
 * detection there is meaningless.
 */

const HEAD_UP_MIN_RATIO = 0.32      // nose ≥ 32% of torso above shoulder midline = clearly raised
const MIN_DURATION_MS = 1500        // 1.5s sustained — match G01's threshold
const MAX_GAP_MS = 250

function eyesUpScore(landmarks, scale) {
  if (!allVisible(landmarks, [LM.NOSE, LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER])) return null
  const nose = landmarks[LM.NOSE]
  const sLeft = landmarks[LM.LEFT_SHOULDER]
  const sRight = landmarks[LM.RIGHT_SHOULDER]
  const shoulderMidY = (sLeft.y + sRight.y) / 2

  // Image y increases downward. Head above shoulders = nose.y < shoulderMidY.
  // Body-relative: how high above shoulders the head sits, as a fraction
  // of torso length.
  const headHeightRatio = (shoulderMidY - nose.y) / scale.torsoLength
  if (headHeightRatio < HEAD_UP_MIN_RATIO) return null

  // The more elevated the head, the higher confidence — caps at 1.
  return Math.min(1, 0.55 + (headHeightRatio - HEAD_UP_MIN_RATIO) * 1.5)
}

export const P03 = {
  id: 'P03',
  name: 'Eyes up the wall',
  cue: 'You were scanning ahead, not staring at your feet.',
  kind: 'win',
  bodyRegion: 'head-gaze',
  minDurationMs: MIN_DURATION_MS,
  maxGapMs: MAX_GAP_MS,

  // Same gating as G01 — only meaningful on slab + vertical.
  appliesWhen: (ctx) =>
    ctx?.wallAngle === 'slab' || ctx?.wallAngle === 'vertical',

  detect(frame, context) {
    const scale = bodyScale(frame.landmarks, context)
    if (!scale) return { matched: false }
    const score = eyesUpScore(frame.landmarks, scale)
    if (score == null) return { matched: false }
    return { matched: true, confidence: score }
  },
}
