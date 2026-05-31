import { allVisible, bodyScale, visibilityWeight, LM } from '../posePrimitives'

/**
 * H02 — Square hips / "ladder climbing"
 *
 * The climber faces the wall with hips parallel to the shoulder line
 * through every reach — like climbing a ladder. The body never rotates
 * a hip in toward the wall, so the arm has to over-extend to lock off
 * where a hip turn would have made the move static.
 *
 * Detection model:
 *   1. Compute the hip vector (left_hip → right_hip) and shoulder vector
 *      (left_shoulder → right_shoulder).
 *   2. Compute |cos(angle)| between them. Square hips ⇒ vectors are
 *      parallel ⇒ |cos| close to 1. (Use absolute cosine because the
 *      bodies are lines, not directed vectors — 180° is also "parallel.")
 *   3. Gate by an active reach: the higher wrist must be significantly
 *      above the shoulder midline. Square hips at rest aren't a fault;
 *      square hips mid-reach are.
 *   4. Sustained ≥ MIN_DURATION_MS so a momentary parallel pose during
 *      transition doesn't fire.
 *
 * Wall-angle gating: vertical + overhang. On slab, hips often stay
 * square because the wall geometry favors a face-on stance. On roof,
 * hip orientation is mechanically constrained.
 *
 * See docs/movement-analyzer/technique-catalog.md §H02.
 */

const PARALLEL_COS_MIN = 0.92          // |cos| ≥ 0.92 = within ~23° of parallel = "square"
const REACH_WRIST_RISE_RATIO = 0.32    // wrist ≥ 32% of torso above shoulder midline = active reach
const MIN_DURATION_MS = 1000
const MAX_GAP_MS = 250

function squareHipsScore(landmarks, scale) {
  const need = [
    LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER,
    LM.LEFT_HIP, LM.RIGHT_HIP,
    LM.LEFT_WRIST, LM.RIGHT_WRIST,
  ]
  if (!allVisible(landmarks, need)) return null

  const ls = landmarks[LM.LEFT_SHOULDER]
  const rs = landmarks[LM.RIGHT_SHOULDER]
  const lh = landmarks[LM.LEFT_HIP]
  const rh = landmarks[LM.RIGHT_HIP]
  const lw = landmarks[LM.LEFT_WRIST]
  const rw = landmarks[LM.RIGHT_WRIST]

  // Active reach gate — higher wrist body-relative above shoulder line.
  const shoulderMidY = (ls.y + rs.y) / 2
  const higherWristY = Math.min(lw.y, rw.y)
  const reachRiseRatio = (shoulderMidY - higherWristY) / scale.torsoLength
  if (reachRiseRatio < REACH_WRIST_RISE_RATIO) return null

  // Shoulder + hip vectors (un-directed lines). Cosine is already
  // scale-invariant so no normalization needed here.
  const sx = rs.x - ls.x
  const sy = rs.y - ls.y
  const hx = rh.x - lh.x
  const hy = rh.y - lh.y
  const sMag = Math.hypot(sx, sy)
  const hMag = Math.hypot(hx, hy)
  if (sMag < 0.04 || hMag < 0.04) return null   // bodies too small to measure rotation

  const cosAbs = Math.abs(sx * hx + sy * hy) / (sMag * hMag)
  if (cosAbs < PARALLEL_COS_MIN) return null

  // Closer to perfectly parallel = higher confidence. Weighted by the
  // visibility of the landmarks the rule actually used so noisy
  // detections produce naturally lower-confidence findings.
  const visWt = visibilityWeight(landmarks, [
    LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER,
    LM.LEFT_HIP, LM.RIGHT_HIP,
    LM.LEFT_WRIST, LM.RIGHT_WRIST,
  ])
  const rawScore = Math.min(1, 0.55 + (cosAbs - PARALLEL_COS_MIN) * 5)
  return rawScore * visWt
}

export const H02 = {
  id: 'H02',
  name: 'Square hips on reach (ladder climbing)',
  cue: 'Turn a hip in toward the wall before you reach.',
  whyItMatters:
    "When your hips stay parallel to the wall through a reach, your " +
    "arm has to do all the extra work. A hip turn — where you rotate " +
    "the same-side hip into the wall — adds inches of reach for free " +
    "AND lets you lock off statically instead of dynamically. People " +
    "who climb 'like a ladder' burn through arm endurance fast, plateau " +
    "early, and find every move feeling longer than it needs to.",
  howToFix:
    "Before a side reach, deliberately twist your hip so the same-side " +
    "hip points at the wall. Your opposite knee drops slightly (back " +
    "step or drop knee). Your reaching arm is now coming from a closer, " +
    "stronger lockoff position. Drill: silent feet + slow climbing on " +
    "an easy route, focusing on rotating into every reach instead of " +
    "facing the wall. It feels weird at first because square hips are " +
    "the body's default — but it's the single biggest movement upgrade " +
    "most new climbers can make.",
  whenYouSeeIt:
    "Almost universal in newer climbers and people transitioning from " +
    "vertical gym walls to anything overhung. The instinct under load " +
    "is to face the wall — but climbing rewards rotation. If H02 fires " +
    "on most reaches in a clip, hip turn drills are the priority.",
  severity: 'important',
  bodyRegion: 'hips-core',
  minDurationMs: MIN_DURATION_MS,
  maxGapMs: MAX_GAP_MS,

  appliesWhen: (ctx) =>
    ctx?.wallAngle === 'vertical' || ctx?.wallAngle === 'overhang',

  detect(frame, context) {
    const scale = bodyScale(frame.landmarks, context)
    if (!scale) return { matched: false }
    const score = squareHipsScore(frame.landmarks, scale)
    if (score == null) return { matched: false }
    return { matched: true, confidence: score }
  },
}
