import { allVisible } from '../posePrimitives'

/**
 * K02 — Heel raised on a smear (slab-specific)
 *
 * Climber points toes / lifts heel on a slab smear, reducing rubber-to-
 * wall contact. The shoe pops off.
 *
 * Detection model:
 *   • Slab-only (the WHOLE POINT of the rule is friction physics that
 *     only matter on low-angle terrain).
 *   • For each foot: the heel landmark is higher in the image than the
 *     foot-index (toe) landmark by more than TIPTOE_LIFT — that's
 *     ankle dorsiflexion, the opposite of "heel dropped."
 *   • Sustained for MIN_DURATION_MS — a momentary lift while stepping
 *     is fine; sustained tiptoe stance is the bug.
 *
 * Landmark indices: 29 = left_heel, 30 = right_heel,
 *                   31 = left_foot_index (toe), 32 = right_foot_index.
 *
 * See docs/movement-analyzer/technique-catalog.md §K02.
 */

const TIPTOE_LIFT_RATIO = 0.25      // lift / footLength = sin(dorsiflexion); 0.25 ≈ 14°
const MIN_FOOT_LENGTH   = 0.02       // foot too foreshortened to measure reliably below this
const MIN_DURATION_MS = 800
const MAX_GAP_MS = 200

function tipToeScore(landmarks, side) {
  const [heelIdx, toeIdx] = side === 'left' ? [29, 31] : [30, 32]
  if (!allVisible(landmarks, [heelIdx, toeIdx])) return null
  const heel = landmarks[heelIdx]
  const toe  = landmarks[toeIdx]

  // Foot length is the natural scale here — body-relative and
  // camera-distance invariant. liftRatio is the sine of the
  // dorsiflexion angle (0 = foot flat, 1 = foot vertical).
  const footLen = Math.hypot(toe.x - heel.x, toe.y - heel.y)
  if (footLen < MIN_FOOT_LENGTH) return null

  // Image y increases downward, so heel above toe = (toe.y - heel.y) > 0.
  const liftRatio = (toe.y - heel.y) / footLen
  if (liftRatio < TIPTOE_LIFT_RATIO) return null

  return Math.min(1, 0.5 + (liftRatio - TIPTOE_LIFT_RATIO) * 1.5)
}

export const K02 = {
  id: 'K02',
  name: 'Heels up on a smear',
  cue: 'Drop the heel.',
  whyItMatters:
    "On a slab, your foot grip IS your friction grip — the more shoe rubber " +
    "you press against the wall, the more friction you generate. A raised " +
    "heel turns your foot into a single contact point at the toe, which is " +
    "great on a positive edge but a disaster on a smear. The shoe rolls off " +
    "the moment you commit weight.",
  howToFix:
    "Conscious cue: 'drop the heel.' On every smear placement, deliberately " +
    "press the heel DOWN until you feel the whole sole engage the wall. Drill: " +
    "'silent slab' — climb an easy slab problem while listening for any sound " +
    "of the foot popping. Foot pops are almost always a heel-up moment.",
  whenYouSeeIt:
    "Most common when the climber is tentative or scared on slab — instinct " +
    "is to grip with the toes, which means the heel rides up. Also appears " +
    "when transitioning a foot from an edge to a smear; the climber stays in " +
    "edge-foot mode instead of relaxing onto the smear.",
  severity: 'polish',
  bodyRegion: 'knees-feet',
  minDurationMs: MIN_DURATION_MS,
  maxGapMs: MAX_GAP_MS,

  // Slab-only: friction physics that don't apply elsewhere.
  appliesWhen: (ctx) => ctx?.wallAngle === 'slab',

  detect(frame) {
    const left  = tipToeScore(frame.landmarks, 'left')
    const right = tipToeScore(frame.landmarks, 'right')
    if (left == null && right == null) return { matched: false }
    return { matched: true, confidence: Math.max(left ?? 0, right ?? 0) }
  },
}
