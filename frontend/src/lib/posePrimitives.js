/**
 * Pose primitives library — shared math the rule engine calls into.
 *
 * Each primitive is a small pure function over a frame (or a window of
 * frames) of MediaPipe pose landmarks. Primitives never know about
 * rules or findings; they just compute geometric / temporal facts.
 *
 * Landmark index reference (MediaPipe Pose Landmarker, 33 points):
 *
 *   0  nose                  11 left_shoulder    23 left_hip
 *   1  left_eye_inner        12 right_shoulder   24 right_hip
 *   2  left_eye              13 left_elbow       25 left_knee
 *   3  left_eye_outer        14 right_elbow      26 right_knee
 *   4  right_eye_inner       15 left_wrist       27 left_ankle
 *   5  right_eye             16 right_wrist      28 right_ankle
 *   6  right_eye_outer       17 left_pinky       29 left_heel
 *   7  left_ear              18 right_pinky      30 right_heel
 *   8  right_ear             19 left_index       31 left_foot_index
 *   9  mouth_left            20 right_index      32 right_foot_index
 *  10  mouth_right           21 left_thumb
 *                            22 right_thumb
 */

// ── Landmark indices by name ─────────────────────────────────────────

export const LM = {
  NOSE: 0,
  LEFT_SHOULDER: 11,  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,     RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,     RIGHT_WRIST: 16,
  LEFT_HIP: 23,       RIGHT_HIP: 24,
  LEFT_KNEE: 25,      RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,     RIGHT_ANKLE: 28,
}

// ── Visibility helpers ───────────────────────────────────────────────

const DEFAULT_MIN_VISIBILITY = 0.5

/**
 * Is a landmark visible enough to trust? Pass an array of landmark
 * indices to check multiple — returns false if any one is below
 * threshold, since most primitives are useless if even one input is
 * unreliable.
 */
export function allVisible(landmarks, indices, threshold = DEFAULT_MIN_VISIBILITY) {
  if (!landmarks) return false
  for (const i of indices) {
    const lm = landmarks[i]
    if (!lm) return false
    if ((lm.visibility ?? 1) < threshold) return false
  }
  return true
}

// ── 2D vector helpers ────────────────────────────────────────────────

function vec2(from, to) {
  return { x: to.x - from.x, y: to.y - from.y }
}

function dot2(a, b) {
  return a.x * b.x + a.y * b.y
}

function mag2(v) {
  return Math.hypot(v.x, v.y)
}

/**
 * Angle (degrees) between vectors AB and BC, with B at the vertex.
 * Returns null if any input is missing or the vectors collapse.
 */
export function angleAt(a, b, c) {
  if (!a || !b || !c) return null
  const ab = vec2(b, a)
  const cb = vec2(b, c)
  const denom = mag2(ab) * mag2(cb)
  if (denom < 1e-6) return null
  const cos = dot2(ab, cb) / denom
  // Clamp for safety against tiny floating-point overshoots
  const clamped = Math.max(-1, Math.min(1, cos))
  return Math.acos(clamped) * 180 / Math.PI
}

// ── Joint angles ─────────────────────────────────────────────────────

/**
 * Elbow flexion angle in degrees. 180° = fully straight (skeletal hang);
 * 90° = right angle (mid-pull); 30° = locked off close to shoulder.
 *
 * Returns null if the required landmarks aren't visible.
 *
 * @param {Array} landmarks — 33-landmark frame
 * @param {'left'|'right'} side
 */
export function elbowAngle(landmarks, side) {
  const [s, e, w] = side === 'left'
    ? [LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST]
    : [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST]
  if (!allVisible(landmarks, [s, e, w])) return null
  return angleAt(landmarks[s], landmarks[e], landmarks[w])
}

/**
 * Knee flexion angle in degrees. 180° = fully extended; 90° = right
 * angle. Used by future leg-position rules.
 */
export function kneeAngle(landmarks, side) {
  const [h, k, a] = side === 'left'
    ? [LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE]
    : [LM.RIGHT_HIP, LM.RIGHT_KNEE, LM.RIGHT_ANKLE]
  if (!allVisible(landmarks, [h, k, a])) return null
  return angleAt(landmarks[h], landmarks[k], landmarks[a])
}

// ── Body scale primitive ─────────────────────────────────────────────

/**
 * Compute the climber's body scale in normalized image units. Two
 * values: shoulderWidth (lateral baseline for x-axis measurements) and
 * torsoLength (vertical baseline for y-axis measurements). Together
 * they let rules express thresholds as RATIOS of the climber's body
 * rather than fractions of the frame.
 *
 * Why this matters: a tall climber far from the camera and a short
 * climber close to the camera produce different frame-fractions for
 * the same body position. Body-relative thresholds remove that
 * camera-distance dependency, which is the single biggest source of
 * inconsistency in the rule engine before this primitive existed.
 *
 * Context override: when called with `(landmarks, context)` and the
 * context has a `stableScale` field (populated by the engine before
 * walking frames), that value is returned directly. This gives the
 * entire clip ONE consistent scale baseline instead of recalculating
 * per-frame, which removes within-clip drift as the climber's pose
 * varies (curled vs stretched changes projected shoulder width).
 * Per-frame fallback is preserved for backward compat.
 *
 * Returns null when shoulders or hips aren't reliably visible — rules
 * should bail rather than fall back to frame-fractions, since that
 * would silently degrade accuracy.
 */
export function bodyScale(landmarks, context) {
  // Prefer the engine-supplied stable scale when available.
  if (context?.stableScale) return context.stableScale

  if (!allVisible(landmarks, [
    LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER,
    LM.LEFT_HIP, LM.RIGHT_HIP,
  ])) return null

  const ls = landmarks[LM.LEFT_SHOULDER]
  const rs = landmarks[LM.RIGHT_SHOULDER]
  const lh = landmarks[LM.LEFT_HIP]
  const rh = landmarks[LM.RIGHT_HIP]

  const shoulderWidth = Math.hypot(rs.x - ls.x, rs.y - ls.y)
  const shoulderMidX  = (ls.x + rs.x) / 2
  const shoulderMidY  = (ls.y + rs.y) / 2
  const hipMidX       = (lh.x + rh.x) / 2
  const hipMidY       = (lh.y + rh.y) / 2
  const torsoLength   = Math.hypot(shoulderMidX - hipMidX, shoulderMidY - hipMidY)

  // Sanity: a degenerate body (limbs collapsed into a point under bad
  // detection) shouldn't be trusted to scale thresholds against.
  if (shoulderWidth < 0.03 || torsoLength < 0.05) return null

  return { shoulderWidth, torsoLength }
}

/**
 * Estimate the climber's facing direction from the ratio of projected
 * shoulder width to torso length. Used to detect when the camera is
 * at a degenerate angle (climber turned sideways or partly facing
 * away) so we can warn the user that lateral-measurement rules will
 * be less accurate.
 *
 * Reasoning: a climber facing the camera shows their full shoulder
 * span; a climber turned 90° projects shoulder span onto the depth
 * axis where it foreshortens to near-zero in image space. Torso
 * length is much more stable to rotation. The ratio shoulderWidth /
 * torsoLength is therefore a robust proxy for facing direction:
 *
 *   ratio ~0.45-0.55  → facing camera (or directly away)
 *   ratio ~0.25-0.4   → ¾ angle (the recommended ~45° we coach users to film)
 *   ratio < 0.2       → near side-on (climber turned 60°+ from camera)
 *
 * Returns null when not enough good frames to estimate.
 */
export function cameraAngleProfile(cache) {
  if (!cache || cache.size === 0) return null
  const ratios = []
  for (const landmarks of cache.values()) {
    if (!landmarks || landmarks.length < 25) continue
    const ls = landmarks[LM.LEFT_SHOULDER]
    const rs = landmarks[LM.RIGHT_SHOULDER]
    const lh = landmarks[LM.LEFT_HIP]
    const rh = landmarks[LM.RIGHT_HIP]
    if (!ls || !rs || !lh || !rh) continue
    const minVis = Math.min(ls.visibility ?? 1, rs.visibility ?? 1, lh.visibility ?? 1, rh.visibility ?? 1)
    if (minVis < 0.5) continue
    const sw = Math.hypot(rs.x - ls.x, rs.y - ls.y)
    const smX = (ls.x + rs.x) / 2
    const smY = (ls.y + rs.y) / 2
    const hmX = (lh.x + rh.x) / 2
    const hmY = (lh.y + rh.y) / 2
    const tl = Math.hypot(smX - hmX, smY - hmY)
    if (tl < 0.05) continue
    ratios.push(sw / tl)
  }
  if (ratios.length < 10) return null
  ratios.sort((a, b) => a - b)
  const median = ratios.length % 2
    ? ratios[(ratios.length - 1) >> 1]
    : (ratios[ratios.length / 2 - 1] + ratios[ratios.length / 2]) / 2
  // Classify the orientation. The thresholds below match the qualitative
  // bands documented above. "ok" is the green band the recording-tips
  // pill coaches users into (filming at ~45°).
  let category
  if (median < 0.20)      category = 'side-on'
  else if (median < 0.30) category = 'angled'
  else if (median < 0.50) category = 'ok'
  else                     category = 'frontal'
  return { ratio: median, category, sampleCount: ratios.length }
}

/**
 * Visibility-weighted confidence multiplier. Returns a value in
 * [0, 1] based on the average MediaPipe `visibility` score across
 * the landmarks the rule actually used. Rules multiply their
 * confidence by this so that a low-visibility detection produces
 * a low-confidence finding, which the engine's quality gates can
 * then prune.
 *
 * Linear mapping: visibility at threshold → 0.5 weight; visibility
 * at 1.0 → 1.0 weight. Below threshold → 0 (effectively kills the
 * detection — but the rule's own allVisible() should have already
 * bailed before this is called).
 */
export function visibilityWeight(landmarks, indices, threshold = DEFAULT_MIN_VISIBILITY) {
  if (!landmarks) return 0
  let sum = 0
  let count = 0
  for (const i of indices) {
    const lm = landmarks[i]
    if (!lm) return 0
    const v = lm.visibility ?? 1
    if (v < threshold) return 0
    sum += v
    count++
  }
  if (count === 0) return 0
  const avg = sum / count
  // Map [threshold, 1] → [0.5, 1.0] linearly.
  return 0.5 + (avg - threshold) / (1 - threshold) * 0.5
}

// ── Center-of-mass proxy ─────────────────────────────────────────────

/**
 * Hip midpoint, our cheap CoM proxy. Returns { x, y } or null if either
 * hip landmark is unreliable.
 */
export function hipMidpoint(landmarks) {
  if (!allVisible(landmarks, [LM.LEFT_HIP, LM.RIGHT_HIP])) return null
  const l = landmarks[LM.LEFT_HIP]
  const r = landmarks[LM.RIGHT_HIP]
  return { x: (l.x + r.x) / 2, y: (l.y + r.y) / 2 }
}

/**
 * CoM velocity magnitude (normalized image units per second) between
 * two frames. Used to classify "rest" vs "moving."
 */
export function comSpeed(prevLandmarks, nowLandmarks, dtMs) {
  if (dtMs <= 0) return 0
  const a = hipMidpoint(prevLandmarks)
  const b = hipMidpoint(nowLandmarks)
  if (!a || !b) return null
  return Math.hypot(b.x - a.x, b.y - a.y) / (dtMs / 1000)
}
