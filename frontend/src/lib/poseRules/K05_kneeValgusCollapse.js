import { allVisible, kneeAngle, visibilityWeight, LM } from '../posePrimitives'

/**
 * K05 — Knee valgus collapse (knees-in)
 *
 * The knee caves inward (toward the body's midline) under load —
 * "knock-kneed" position with kneecap pointing in instead of forward
 * over the toes. Bad on two counts:
 *   • Mechanical — rotates the foot off the smear / micro-edge, so
 *     friction drops and feet pop.
 *   • Joint — repeated valgus loading under bodyweight is a documented
 *     factor in patellofemoral pain and ACL stress (literature on
 *     frontal-plane projection angle).
 *
 * Detection model (2D image space, frontal view):
 *   1. Compute the same-side knee x and ankle x, plus the hip x for
 *      that side. We use side-specific landmarks so the rule works
 *      per leg.
 *   2. Define "midline" as the hip x (the pelvis center for that leg).
 *      A knee that has caved inward is positioned between the hip and
 *      the body midline — i.e. its x is on the OPPOSITE side of the
 *      ankle from outside.
 *   3. We measure how far the knee is medial of the ankle, normalized
 *      by the visible torso width (shoulder distance). Threshold-based.
 *
 * Critical note: this is a DIRECTION-ONLY detector, per the IJSPT
 * literature on FPPA from monocular video — the absolute angle isn't
 * reliable, but a knee clearly inboard of its ankle is a reliable
 * positive signal.
 *
 * Wall-angle gating: slab + vertical. On overhang/roof the knees are
 * tucked / drop-kneed by design and a "valgus" reading would just be
 * normal climbing posture.
 *
 * See docs/movement-analyzer/technique-catalog.md §K05.
 */

const VALGUS_RATIO_MIN = 0.08      // knee medial of ankle by ≥ 8% of shoulder-width = clear valgus
const LOADED_KNEE_ANGLE_MAX = 165  // knee bent ≤ 165° = climber is loading the leg (not just dangling)
const MIN_DURATION_MS = 800
const MAX_GAP_MS = 200

function shoulderWidth(landmarks) {
  if (!allVisible(landmarks, [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER])) return null
  const l = landmarks[LM.LEFT_SHOULDER]
  const r = landmarks[LM.RIGHT_SHOULDER]
  const w = Math.abs(l.x - r.x)
  return w > 0.04 ? w : null     // need some visible shoulder span to normalize against
}

/**
 * Per-leg valgus check. Returns a confidence in [0, 1] or null if not
 * valgus / landmarks missing. Side-aware so we know which direction
 * "medial" is.
 */
function legValgusScore(landmarks, side) {
  const [hipIdx, kneeIdx, ankleIdx] = side === 'left'
    ? [LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE]
    : [LM.RIGHT_HIP, LM.RIGHT_KNEE, LM.RIGHT_ANKLE]
  if (!allVisible(landmarks, [hipIdx, kneeIdx, ankleIdx])) return null

  const hip   = landmarks[hipIdx]
  const knee  = landmarks[kneeIdx]
  const ankle = landmarks[ankleIdx]

  // Multi-signal load gate: a valgus knee only matters when the leg is
  // bearing weight. Straight-knee positions are airborne / unloaded,
  // and apparent inward knee in those cases is just kinematic noise.
  const flexion = kneeAngle(landmarks, side)
  if (flexion == null || flexion > LOADED_KNEE_ANGLE_MAX) return null

  const sw = shoulderWidth(landmarks)
  if (sw == null) return null

  // "Inward" depends on which leg. Left leg's midline is to the right
  // of its ankle in image space; right leg's midline is to the left.
  // We compute "how far the knee is from the ankle toward the midline":
  //   left leg:  knee.x - ankle.x > 0 = knee is to the right of ankle
  //              = toward midline (since left ankle is on left side)
  //   right leg: ankle.x - knee.x > 0 = knee is to the left of ankle
  //              = toward midline (since right ankle is on right side)
  // BUT the actual midline orientation depends on whether the climber
  // is facing camera or facing wall — we can't assume. Use hip x as
  // the reference: medial is "toward hip x relative to ankle x."
  //
  // medialOffset = how far past the ankle, in the direction of the hip,
  // the knee has drifted.
  const dirToHip = Math.sign(hip.x - ankle.x)
  if (dirToHip === 0) return null
  const medialOffset = (knee.x - ankle.x) * dirToHip
  if (medialOffset <= 0) return null    // knee tracks over or outside the ankle = fine

  const ratio = medialOffset / sw
  if (ratio < VALGUS_RATIO_MIN) return null

  const visWt = visibilityWeight(landmarks, [hipIdx, kneeIdx, ankleIdx])
  return Math.min(1, 0.55 + (ratio - VALGUS_RATIO_MIN) * 4) * visWt
}

export const K05 = {
  id: 'K05',
  name: 'Knees caving inward',
  cue: 'Drive each knee out over your toes.',
  whyItMatters:
    "When your knee caves in toward your other leg under load, two bad " +
    "things happen at once. First, the foot rotates off whatever you've " +
    "got it on — the rubber loses contact and you skate off. Second, " +
    "loading the knee in that position is what physios call valgus stress " +
    "— repeated over enough sessions it shows up as front-of-knee pain. " +
    "Climbing-specifically: it's a friction killer on slab smears and " +
    "small footholds.",
  howToFix:
    "The mental cue is 'knee over toe' — when you bend the knee to stand " +
    "up on a foot, deliberately push the kneecap to track over the second " +
    "or third toe, not toward your other leg. Off-the-wall, single-leg " +
    "step-downs in front of a mirror build the awareness fast — you can " +
    "literally see the knee cave and learn to correct it. Strong glutes " +
    "(side-lying clamshells, banded crab walks) help hold the knee in line " +
    "under load.",
  whenYouSeeIt:
    "Stand-up moves on slab and vertical, especially when the climber is " +
    "weighting a high foot and pushing through it. Also common when the " +
    "climber is tired and core/glute control fades. If a foot pop precedes " +
    "a fall and K05 fired right before, the inward knee is almost certainly " +
    "what cost you the foot.",
  severity: 'important',
  bodyRegion: 'knees-feet',
  minDurationMs: MIN_DURATION_MS,
  maxGapMs: MAX_GAP_MS,

  appliesWhen: (ctx) =>
    ctx?.wallAngle === 'slab' || ctx?.wallAngle === 'vertical',

  detect(frame) {
    const left  = legValgusScore(frame.landmarks, 'left')
    const right = legValgusScore(frame.landmarks, 'right')
    if (left == null && right == null) return { matched: false }
    const confidence = Math.max(left ?? 0, right ?? 0)
    return { matched: true, confidence, left, right }
  },
}
