import { allVisible, LM } from '../posePrimitives'

/**
 * P06 — Butt out / nose over toes (WIN)
 *
 * Positive counterpart to H03. Climber's hips are stacked BEHIND the
 * shoulder-to-ankle body line (away from the wall, toward the camera
 * in side-on view), pressing body weight onto the feet where the
 * friction lives. The textbook slab posture.
 *
 * Detection model:
 *   Same geometry as H03 but with the sign check passing in the
 *   opposite direction:
 *     • Hips on the OPPOSITE side of the shoulder→ankle line from
 *       the wrists (which mark the wall). That's "butt out."
 *     • Magnitude exceeds POSTURE_THRESHOLD (so we catch real
 *       deliberate posture, not just a slight tilt).
 *     • Sustained ≥ MIN_DURATION_MS — a transient pass-through doesn't
 *       count; a held nose-over-toes position does.
 */

const POSTURE_THRESHOLD = 0.22    // hip deviation ≥ 22% of torso length, butt-out side
const MIN_DURATION_MS = 1200
const MAX_GAP_MS = 250

function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

function crossSign(S, A, P) {
  return (A.x - S.x) * (P.y - S.y) - (A.y - S.y) * (P.x - S.x)
}

function buttOutScore(landmarks) {
  const required = [
    LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER,
    LM.LEFT_HIP, LM.RIGHT_HIP,
    LM.LEFT_ANKLE, LM.RIGHT_ANKLE,
    LM.LEFT_WRIST, LM.RIGHT_WRIST,
  ]
  if (!allVisible(landmarks, required)) return null

  const S = midpoint(landmarks[LM.LEFT_SHOULDER], landmarks[LM.RIGHT_SHOULDER])
  const H = midpoint(landmarks[LM.LEFT_HIP],      landmarks[LM.RIGHT_HIP])
  const A = midpoint(landmarks[LM.LEFT_ANKLE],    landmarks[LM.RIGHT_ANKLE])
  const W = midpoint(landmarks[LM.LEFT_WRIST],    landmarks[LM.RIGHT_WRIST])

  const torsoLen = Math.hypot(S.x - H.x, S.y - H.y)
  if (torsoLen < 0.05) return null
  const saLen = Math.hypot(A.x - S.x, A.y - S.y)
  if (saLen < 0.05) return null

  const crossH = crossSign(S, A, H)
  const crossW = crossSign(S, A, W)

  // Butt-out signature: hip OPPOSITE side of SA line from wrist.
  if (Math.sign(crossH) === Math.sign(crossW)) return null
  if (crossW === 0) return null

  const perpDist = Math.abs(crossH) / saLen
  const deviationRatio = perpDist / torsoLen
  if (deviationRatio < POSTURE_THRESHOLD) return null

  return Math.min(1, 0.55 + (deviationRatio - POSTURE_THRESHOLD) * 2)
}

export const P06 = {
  id: 'P06',
  name: 'Butt out — nose over toes',
  cue: 'Body weight on your feet — exactly where slab needs it.',
  kind: 'win',
  bodyRegion: 'hips-core',
  minDurationMs: MIN_DURATION_MS,
  maxGapMs: MAX_GAP_MS,

  // Slab-only — same gating as H03.
  appliesWhen: (ctx) => ctx?.wallAngle === 'slab',

  detect(frame) {
    const score = buttOutScore(frame.landmarks)
    if (score == null) return { matched: false }
    return { matched: true, confidence: score }
  },
}
