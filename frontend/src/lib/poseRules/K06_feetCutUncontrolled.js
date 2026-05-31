import { allVisible, bodyScale, hipMidpoint, LM } from '../posePrimitives'

/**
 * K06 — Uncontrolled foot cut on overhang (post-deadpoint swing)
 *
 * After a dynamic move on steep terrain, the climber's feet release
 * uncontrolled, the body swings out from the wall like a pendulum,
 * and they can't pull their feet back in to re-establish a stance.
 * High-energy-loss pattern; common pre-fall signature on overhang.
 *
 * Detection model (2D image space, side-on view):
 *   1. Wall angle: overhang only (the pattern doesn't apply on
 *      slab/vertical, and roof has different geometry).
 *   2. BOTH ankles visible, below their respective knees (legs dangling
 *      rather than tucked under the body).
 *   3. Ankle midpoint x is OUTSIDE the hip midpoint x by more than
 *      SWING_RATIO × shoulderWidth — body has swung clearly out from
 *      the body line, not just naturally below hip.
 *   4. Sustained ≥ MIN_DURATION_MS so a clean controlled latch where
 *      feet briefly leave the wall doesn't fire.
 *
 * Wall-angle gating: overhang only.
 *
 * See docs/movement-analyzer/technique-catalog.md §K06.
 */

const ANKLE_BELOW_KNEE_RATIO  = 0.15   // ankle ≥ 15% of torso below same-side knee = dangling
const SWING_RATIO             = 0.7    // ankle x ≥ 70% of shoulder width from hip x = swung out
const MIN_DURATION_MS = 800
const MAX_GAP_MS = 250

function feetCutScore(landmarks, scale) {
  const need = [
    LM.LEFT_KNEE, LM.RIGHT_KNEE,
    LM.LEFT_ANKLE, LM.RIGHT_ANKLE,
    LM.LEFT_HIP, LM.RIGHT_HIP,
  ]
  if (!allVisible(landmarks, need)) return null

  const hip = hipMidpoint(landmarks)
  if (!hip) return null

  // Both ankles must be below their same-side knee — legs dangling.
  const leftBelow  = (landmarks[LM.LEFT_ANKLE].y  - landmarks[LM.LEFT_KNEE].y)  / scale.torsoLength
  const rightBelow = (landmarks[LM.RIGHT_ANKLE].y - landmarks[LM.RIGHT_KNEE].y) / scale.torsoLength
  if (leftBelow < ANKLE_BELOW_KNEE_RATIO) return null
  if (rightBelow < ANKLE_BELOW_KNEE_RATIO) return null

  // Ankle midpoint pulled clearly off the hip line — the swing.
  const ankleMidX = (landmarks[LM.LEFT_ANKLE].x + landmarks[LM.RIGHT_ANKLE].x) / 2
  const swingRatio = Math.abs(ankleMidX - hip.x) / scale.shoulderWidth
  if (swingRatio < SWING_RATIO) return null

  // The further out, the more uncontrolled.
  return Math.min(1, 0.55 + (swingRatio - SWING_RATIO) * 0.5)
}

export const K06 = {
  id: 'K06',
  name: 'Feet cut and swung out',
  cue: 'Tighten the core on dynos — squeeze the feet back in immediately.',
  whyItMatters:
    "On overhang, the body's natural state is to swing out when feet " +
    "release — gravity hangs you below the wall like a pendulum. The " +
    "fix isn't to keep your feet on (sometimes you have to cut them); " +
    "it's to control the swing and pull them back in fast. An " +
    "uncontrolled cut means the climber's core fired late or not at " +
    "all, the swing amplitude grows, and getting feet back on becomes " +
    "near-impossible. By the time they're trying to re-pin, the " +
    "forearms are blown.",
  howToFix:
    "Anticipate the cut — if you're committing to a dyno on overhang, " +
    "know your feet are coming off. The instant the hand latches, " +
    "tense the core and pull the feet IN toward the wall (knees toward " +
    "chest, like a tuck). The squeeze stops the swing before it starts. " +
    "Drill: dead hangs with knees-to-chest tucks on a campus rung — " +
    "builds the exact 'snap-the-feet-back' muscle memory.",
  whenYouSeeIt:
    "Post-deadpoint or post-dyno on overhang. If K06 fires AND a fall " +
    "is marked within 2 seconds, the swing is almost always what " +
    "knocked the climber off — they couldn't re-establish before the " +
    "forearm pump took them. Core conditioning (front lever progressions, " +
    "L-sits, knees-to-chest) is the universal fix.",
  severity: 'important',
  bodyRegion: 'knees-feet',
  minDurationMs: MIN_DURATION_MS,
  maxGapMs: MAX_GAP_MS,

  // Overhang only — the catalog's specific phase for this pattern.
  appliesWhen: (ctx) => ctx?.wallAngle === 'overhang',

  detect(frame, context) {
    const scale = bodyScale(frame.landmarks, context)
    if (!scale) return { matched: false }
    const score = feetCutScore(frame.landmarks, scale)
    if (score == null) return { matched: false }
    return { matched: true, confidence: score }
  },
}
