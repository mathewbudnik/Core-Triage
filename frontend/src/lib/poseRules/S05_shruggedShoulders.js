import { elbowAngle, allVisible, bodyScale, LM } from '../posePrimitives'

/**
 * S05 — Shrugged shoulders (failed scapular set)
 *
 * The scapula rides up toward the ear under load instead of being
 * depressed and retracted. Engages the neck instead of the lats,
 * wastes energy, and over time contributes to neck/shoulder pain.
 *
 * Detection model:
 *   • The arm is under load: elbow angle < SUPPORTING_ELBOW_MAX
 *     (climber is supporting weight on this arm).
 *   • Same-side shoulder-to-ear vertical distance is below SHRUG_GAP
 *     (in normalized image coords — shoulder has crept up close to ear).
 *   • Sustained for at least MIN_DURATION_MS.
 *
 * See docs/movement-analyzer/technique-catalog.md §S05.
 */

const SUPPORTING_ELBOW_MAX = 160   // arm bent at all (< 160° = under load)
const SHRUG_GAP_RATIO = 0.32        // shoulder-ear gap < 32% of torso length = shrugged
const MIN_DURATION_MS = 700
const MAX_GAP_MS = 200

function shrugScore(landmarks, scale, side) {
  const [shoulderIdx, earIdx] = side === 'left'
    ? [LM.LEFT_SHOULDER, 7]     // 7 = left_ear
    : [LM.RIGHT_SHOULDER, 8]    // 8 = right_ear
  if (!allVisible(landmarks, [shoulderIdx, earIdx])) return null

  const angle = elbowAngle(landmarks, side)
  if (angle == null || angle > SUPPORTING_ELBOW_MAX) return null

  const shoulder = landmarks[shoulderIdx]
  const ear      = landmarks[earIdx]

  // Vertical gap shoulder ↓ to ear ↑, normalized by torso length so the
  // threshold is body-relative (a tall climber's gap-of-shoulders is a
  // larger image-fraction than a short climber's, but their RATIO to
  // torso is comparable).
  const gap = shoulder.y - ear.y
  const ratio = gap / scale.torsoLength
  if (ratio > SHRUG_GAP_RATIO) return null

  // Closer = more confident
  return Math.min(1, 0.5 + (SHRUG_GAP_RATIO - ratio) * 1.5)
}

export const S05 = {
  id: 'S05',
  name: 'Shoulders riding up to your ears',
  cue: 'Pull your shoulders down and away from your ears.',
  whyItMatters:
    "When your shoulders creep up toward your ears under load, the small " +
    "muscles at the base of your neck end up holding your body weight — " +
    "muscles that are way too small for the job. The big muscles in your " +
    "back and shoulders should be doing the work. The wrong-muscle version " +
    "burns through your endurance fast and over time builds the kind of " +
    "upper-back and neck tightness that climbers' physios see constantly.",
  howToFix:
    "The drill: hang from a pull-up bar or jug with straight arms, then " +
    "WITHOUT bending your elbows, pull your shoulders DOWN and AWAY from " +
    "your ears. You'll feel it engage your upper back. That's the position " +
    "your shoulders should be in any time you're loaded on a hold. The " +
    "mental cue while climbing is 'long neck' — make the space between " +
    "your earlobes and shoulders as long as you can.",
  whenYouSeeIt:
    "Most common on hard pulls, static hangs, and when you're pumped near " +
    "the end of a route. Often shows up alongside chicken-wing elbows (S04) " +
    "— if both fire on the same move, your upper body is leaking force in " +
    "two places at once and that's a big training priority.",
  severity: 'important',
  bodyRegion: 'shoulders-arms',
  minDurationMs: MIN_DURATION_MS,
  maxGapMs: MAX_GAP_MS,

  appliesWhen: () => true,

  detect(frame, context) {
    const scale = bodyScale(frame.landmarks, context)
    if (!scale) return { matched: false }
    const left  = shrugScore(frame.landmarks, scale, 'left')
    const right = shrugScore(frame.landmarks, scale, 'right')
    if (left == null && right == null) return { matched: false }
    const confidence = Math.max(left ?? 0, right ?? 0)
    return { matched: true, confidence, left, right }
  },
}
