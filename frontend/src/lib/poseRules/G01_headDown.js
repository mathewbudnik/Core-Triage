import { allVisible, bodyScale, LM } from '../posePrimitives'

/**
 * G01 — Head down / gaze locked low
 *
 * Climber stares down between their feet or at the ground, narrowing
 * visual exploration. Locks the neck, signals fear, often correlates
 * with the climber not actually scanning for next holds.
 *
 * Detection model:
 *   • The nose is at or near shoulder level (head pitched down so the
 *     face is looking at the ground/feet rather than up the wall).
 *   • Sustained for MIN_DURATION_MS — a quick glance down at a foot
 *     placement is fine; sustained head-down posture is the flag.
 *
 * Wall-angle gating: most diagnostic on slab + vertical (where the
 * climber CAN look up and SHOULD be scanning ahead). Skipped on
 * overhang and roof — head position is mechanically constrained by
 * the wall geometry there.
 *
 * See docs/movement-analyzer/technique-catalog.md §G01–G03.
 */

const HEAD_HEIGHT_MIN_RATIO = 0.20   // nose ≥ 20% of torso above shoulders = "head up"
const MIN_DURATION_MS = 1500          // 1.5s sustained head-down before flagging
const MAX_GAP_MS = 250

function headDownScore(landmarks, scale) {
  if (!allVisible(landmarks, [LM.NOSE, LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER])) return null
  const nose = landmarks[LM.NOSE]
  const sLeft = landmarks[LM.LEFT_SHOULDER]
  const sRight = landmarks[LM.RIGHT_SHOULDER]
  const shoulderMidY = (sLeft.y + sRight.y) / 2

  // Image y increases downward. Head above shoulders = nose.y < shoulderMidY.
  // Body-relative: how high above the shoulders the head sits, expressed
  // as a fraction of torso length.
  const headHeightRatio = (shoulderMidY - nose.y) / scale.torsoLength
  if (headHeightRatio >= HEAD_HEIGHT_MIN_RATIO) return null

  // The lower the head is, the more confident we are.
  return Math.min(1, 0.5 + (HEAD_HEIGHT_MIN_RATIO - headHeightRatio) * 2)
}

export const G01 = {
  id: 'G01',
  name: 'Head down — eyes locked low',
  cue: 'Eyes up the wall.',
  whyItMatters:
    "Climbing is largely a vision-driven task. When your gaze is locked on " +
    "your feet or the ground, you stop scanning for next holds, intermediate " +
    "feet, and rest opportunities. It also signals fear-response posture — " +
    "neck tight, shoulders bunched, body bracing for a fall instead of " +
    "actively climbing. Even when the head IS down for a legit reason " +
    "(precision foot placement), holding the posture too long has a cost.",
  howToFix:
    "Conscious cue: 'eyes up.' Train yourself to glance down only briefly " +
    "to confirm a foot placement, then immediately return your gaze up " +
    "the wall. Drill: route-read the section from the ground BEFORE you " +
    "leave — you should know roughly where your hands and feet are going " +
    "without needing to look down once you're moving.",
  whenYouSeeIt:
    "Most common on slab climbs (where the gaze instinct is to watch feet) " +
    "and when a climber is scared or pumped. Often correlates with hesitation " +
    "or backtracking. If it fires near a fall, the climber probably wasn't " +
    "scanning the next moves.",
  severity: 'polish',
  bodyRegion: 'head-gaze',
  minDurationMs: MIN_DURATION_MS,
  maxGapMs: MAX_GAP_MS,

  // Skip on overhang / roof — head position is constrained by wall geometry.
  appliesWhen: (ctx) =>
    ctx?.wallAngle === 'slab' || ctx?.wallAngle === 'vertical',

  detect(frame, context) {
    const scale = bodyScale(frame.landmarks, context)
    if (!scale) return { matched: false }
    const score = headDownScore(frame.landmarks, scale)
    if (score == null) return { matched: false }
    return { matched: true, confidence: score }
  },
}
