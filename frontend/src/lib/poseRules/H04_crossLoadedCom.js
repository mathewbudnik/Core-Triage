import { allVisible, bodyScale, comSpeed, elbowAngle, hipMidpoint, visibilityWeight, LM } from '../posePrimitives'

/**
 * H04 — Cross-loaded center of mass (barn door risk)
 *
 * Classic barn-door setup: the climber's center of mass (hip midpoint)
 * sits OUTSIDE the lateral support polygon — i.e. outside the x-range
 * of the two ankles. One released hand or foot and the body swings
 * around like a barn door on its hinge.
 *
 * Detection model (2D image space, multi-signal AND-gate):
 *   1. Compute hip midpoint H = (hip_left + hip_right) / 2.
 *   2. BOTH ankles visible — single-foot stances are by definition
 *      cross-loaded and would generate spam.
 *   3. Hip x outside ankle polygon by > SUPPORT_MARGIN_RATIO ×
 *      shoulderWidth (body-relative, so framing doesn't matter).
 *   4. At least one elbow bent (climber actually loading the position
 *      with body weight on arms) — fast unloaded transitions through
 *      this geometry aren't faults.
 *   5. CoM not moving fast (CoM_SPEED < REST_SPEED) — we want HELD
 *      cross-loaded positions, not the instant a climber blows through
 *      one mid-move.
 *   All four must agree before we score, which kills the FP rate from
 *   transients without losing the real sustained off-balance signal.
 *
 * Wall-angle gating: vertical and overhang. On slab, hip position
 * outside the foot polygon is sometimes intentional (counter-balancing).
 * On roof, the geometry inverts and the heuristic doesn't apply.
 *
 * See docs/movement-analyzer/technique-catalog.md §H04.
 */

const SUPPORT_MARGIN_RATIO = 0.17    // hip outside polygon by ≥ 17% of shoulder width
const LOADED_ELBOW_MAX     = 160     // at least one elbow bent — climber loaded
const REST_SPEED           = 0.20    // CoM speed below this = position is held, not transitioning
const MIN_DURATION_MS = 600
const MAX_GAP_MS = 200

function crossLoadedScore(landmarks, scale) {
  if (!allVisible(landmarks, [LM.LEFT_ANKLE, LM.RIGHT_ANKLE])) return null
  const hip = hipMidpoint(landmarks)
  if (!hip) return null

  // Signal 2: at least one elbow under load. Both arms straight = the
  // climber is in P01 territory (skeletal hang) — not a barn-door risk.
  const lE = elbowAngle(landmarks, 'left')
  const rE = elbowAngle(landmarks, 'right')
  if (lE == null || rE == null) return null
  if (Math.min(lE, rE) > LOADED_ELBOW_MAX) return null

  const lA = landmarks[LM.LEFT_ANKLE]
  const rA = landmarks[LM.RIGHT_ANKLE]
  const ankleMinX = Math.min(lA.x, rA.x)
  const ankleMaxX = Math.max(lA.x, rA.x)

  // Signal 1: hip outside polygon by ≥ margin, body-relative.
  const margin = SUPPORT_MARGIN_RATIO * scale.shoulderWidth
  let outsideBy = 0
  if (hip.x < ankleMinX - margin) outsideBy = (ankleMinX - margin) - hip.x
  else if (hip.x > ankleMaxX + margin) outsideBy = hip.x - (ankleMaxX + margin)
  if (outsideBy <= 0) return null

  // Express overshoot as a ratio of shoulder width for body-relative
  // confidence scaling.
  const overshootRatio = outsideBy / scale.shoulderWidth
  const visWt = visibilityWeight(landmarks, [
    LM.LEFT_HIP, LM.RIGHT_HIP,
    LM.LEFT_ANKLE, LM.RIGHT_ANKLE,
    LM.LEFT_ELBOW, LM.RIGHT_ELBOW,
  ])
  return Math.min(1, 0.55 + overshootRatio * 1.5) * visWt
}

export const H04 = {
  id: 'H04',
  name: 'Body weight off-balance (barn door risk)',
  cue: 'Stack your hips over your feet.',
  whyItMatters:
    "When your hips are sideways of your feet — instead of stacked over " +
    "them — your body becomes a barn door on a hinge. The instant you lift " +
    "one hand or one foot, you swing out from the wall. Even if you don't " +
    "actually barn-door off, your arms are doing constant work to fight " +
    "that pull, which burns through your endurance and makes every reach " +
    "feel harder than it needs to.",
  howToFix:
    "Before you commit to a reach, scan where your hips are versus your " +
    "feet. If your hips are off to one side, find a foot to bring closer " +
    "to your line of pull, or twist a hip in (drop knee) to bring your " +
    "shoulders over a foot. The goal: your center of mass sits OVER your " +
    "base of support, not outside of it. Slow practice on a beginner wall " +
    "is the cleanest way to build this awareness.",
  whenYouSeeIt:
    "Most common when reaching far sideways for a hold, or when a climber " +
    "auto-pilots into a sequence without setting the lower body first. " +
    "If this fires right before a fall, the barn-door swing is almost " +
    "certainly what knocked you off.",
  severity: 'important',
  bodyRegion: 'hips-core',
  minDurationMs: MIN_DURATION_MS,
  maxGapMs: MAX_GAP_MS,

  // Tighter requirements at advanced grades + on system boards:
  // at V7+/5.12+ the climber is intentionally using sideways momentum
  // (pogo prep, swing-in, controlled barn-door reset). On boards the
  // style is even more extreme. Tightening — not disabling — means a
  // genuine sustained off-balance still surfaces.
  profileOverrides: {
    advancedGrade: { minDurationMs: 1500, minConfidence: 0.75 },
    board:         { minDurationMs: 2000, minConfidence: 0.80 },
  },

  appliesWhen: (ctx) =>
    ctx?.wallAngle === 'vertical' || ctx?.wallAngle === 'overhang',

  detect(frame, context, state) {
    const prev = state.prevFrame
    state.prevFrame = frame
    if (!prev) return { matched: false }

    const scale = bodyScale(frame.landmarks, context)
    if (!scale) return { matched: false }

    // Signal 3: CoM speed low — we want a held position, not a transient
    // pass-through. Speed is in normalized units / second; bail without
    // a confident reading or if the climber is in motion.
    const dtMs = frame.timestamp - prev.timestamp
    const speed = comSpeed(prev.landmarks, frame.landmarks, dtMs)
    if (speed == null || speed > REST_SPEED) return { matched: false }

    const score = crossLoadedScore(frame.landmarks, scale)
    if (score == null) return { matched: false }
    return { matched: true, confidence: score }
  },
}
