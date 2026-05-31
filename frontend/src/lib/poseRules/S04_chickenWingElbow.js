import { elbowAngle, allVisible, LM } from '../posePrimitives'

/**
 * S04 — Chicken-wing elbow on lock-off
 *
 * The elbow rotates up and away from the ribs during a pull / lock-off,
 * mis-aligning force into the rotator cuff instead of the lats. This is
 * one of the most common shoulder-injury patterns in climbing.
 *
 * Detection model:
 *   • Arm is in a "loading" state: elbow flexed between LOAD_ANGLE_MIN
 *     and LOAD_ANGLE_MAX (i.e. mid-pull, not extended, not fully locked).
 *   • The wrist is above the shoulder (climber is pulling DOWN on a
 *     hold, not pushing up or hanging).
 *   • The elbow rises above the wrist by more than ELBOW_LIFT (in
 *     normalized image y, where smaller y = higher in frame).
 *   • Sustained for at least MIN_DURATION_MS.
 *
 * See docs/movement-analyzer/technique-catalog.md §S04.
 */

const LOAD_ANGLE_MIN = 60      // arm too straight = no chicken-wing concern
const LOAD_ANGLE_MAX = 140     // arm too bent past 140 is a different position
const ELBOW_LIFT = 0.04        // normalized — elbow y is ~4% of frame above wrist
const MIN_DURATION_MS = 500
const MAX_GAP_MS = 200

function chickenWingScore(landmarks, side) {
  const [shoulderIdx, elbowIdx, wristIdx] = side === 'left'
    ? [LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST]
    : [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST]
  if (!allVisible(landmarks, [shoulderIdx, elbowIdx, wristIdx])) return null

  const angle = elbowAngle(landmarks, side)
  if (angle == null || angle < LOAD_ANGLE_MIN || angle > LOAD_ANGLE_MAX) return null

  const shoulder = landmarks[shoulderIdx]
  const elbow    = landmarks[elbowIdx]
  const wrist    = landmarks[wristIdx]

  // Wrist must be above shoulder (loading the arm downward through a hold).
  if (wrist.y > shoulder.y) return null

  // Chicken-wing: elbow is significantly higher than wrist (lower y).
  const lift = wrist.y - elbow.y
  if (lift < ELBOW_LIFT) return null

  // Confidence scales with how pronounced the lift is.
  return Math.min(1, 0.5 + (lift - ELBOW_LIFT) * 8)
}

export const S04 = {
  id: 'S04',
  name: 'Chicken-wing elbow',
  cue: 'Elbows to ribs.',
  whyItMatters:
    "When the elbow lifts above the wrist on a pull, the load shifts off the " +
    "lats and into the rotator cuff at a bad angle. This is one of the most " +
    "common shoulder-injury patterns in climbing — and even when it doesn't " +
    "cause injury, it wastes pulling power because the bigger lat muscles " +
    "stop contributing.",
  howToFix:
    "Drill 'elbow path' — when you pull on a hold, visualize the elbow drawing " +
    "a straight line down past your ribs. Cue: 'tennis balls in the armpits' — " +
    "keep elbows tucked. If the elbow wants to lift, that usually means the " +
    "reach is too long for a static pull — switch to a deadpoint instead of " +
    "grinding it.",
  whenYouSeeIt:
    "Most common on slow static reaches that are at the limit of the climber's " +
    "reach, and on lock-offs when fatigued. Often appears together with " +
    "shrugged shoulders. If this fires repeatedly, it's a high-priority fix " +
    "from an injury-prevention standpoint.",
  severity: 'critical',
  bodyRegion: 'shoulders-arms',
  minDurationMs: MIN_DURATION_MS,
  maxGapMs: MAX_GAP_MS,

  appliesWhen: () => true,  // any wall angle

  detect(frame) {
    const left  = chickenWingScore(frame.landmarks, 'left')
    const right = chickenWingScore(frame.landmarks, 'right')
    if (left == null && right == null) return { matched: false }
    const confidence = Math.max(left ?? 0, right ?? 0)
    return { matched: true, confidence, left, right }
  },
}
