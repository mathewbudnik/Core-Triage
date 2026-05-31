import { allVisible, bodyScale, hipMidpoint, visibilityWeight, LM } from '../posePrimitives'

/**
 * P04 — Stacked center of mass (WIN)
 *
 * Positive counterpart to H04. Hips sit cleanly over the polygon of
 * feet — the body is balanced over its base of support and arms aren't
 * doing extra work to fight a barn-door swing. This is what good
 * positional climbing looks like in still frames.
 *
 * Detection model:
 *   • Both ankles visible (stance over two feet).
 *   • Hip midpoint x is INSIDE the lateral range of the ankles, with a
 *     small CENTERED_MARGIN so we only credit clearly-stacked positions
 *     — not "hip just barely on the inside edge" technicalities.
 *   • Sustained ≥ MIN_DURATION_MS — a half-second pass-through doesn't
 *     count; a real held-stacked position does.
 */

const CENTERED_MARGIN_RATIO = 0.13   // hip must be inside the polygon by ≥ 13% of shoulder width
const MIN_SPAN_RATIO        = 0.17   // ankles must span ≥ 17% of shoulder width to count as a polygon
const MIN_DURATION_MS = 1000
const MAX_GAP_MS = 200

function stackedScore(landmarks, scale) {
  if (!allVisible(landmarks, [LM.LEFT_ANKLE, LM.RIGHT_ANKLE])) return null
  const hip = hipMidpoint(landmarks)
  if (!hip) return null

  const lA = landmarks[LM.LEFT_ANKLE]
  const rA = landmarks[LM.RIGHT_ANKLE]
  const ankleMinX = Math.min(lA.x, rA.x)
  const ankleMaxX = Math.max(lA.x, rA.x)
  const span = ankleMaxX - ankleMinX
  if (span / scale.shoulderWidth < MIN_SPAN_RATIO) return null

  // Must be inside the polygon with body-relative margin on both sides.
  const margin = CENTERED_MARGIN_RATIO * scale.shoulderWidth
  if (hip.x < ankleMinX + margin) return null
  if (hip.x > ankleMaxX - margin) return null

  // Confidence scales with how centered: 1.0 at the midpoint, 0.55 at the margins.
  const midpoint = (ankleMinX + ankleMaxX) / 2
  const half = span / 2
  const offCenter = Math.abs(hip.x - midpoint) / half        // 0..1
  const rawConfidence = Math.min(1, 1 - offCenter * 0.45)
  if (rawConfidence < 0.55) return null
  const visWt = visibilityWeight(landmarks, [
    LM.LEFT_HIP, LM.RIGHT_HIP,
    LM.LEFT_ANKLE, LM.RIGHT_ANKLE,
  ])
  return rawConfidence * visWt
}

export const P04 = {
  id: 'P04',
  name: 'Stacked over your feet',
  cue: 'Hips over feet — that\'s a balanced position.',
  kind: 'win',
  bodyRegion: 'hips-core',
  minDurationMs: MIN_DURATION_MS,
  maxGapMs: MAX_GAP_MS,

  // Mirrors H04 gating — only meaningful on vertical/overhang.
  appliesWhen: (ctx) =>
    ctx?.wallAngle === 'vertical' || ctx?.wallAngle === 'overhang',

  detect(frame, context) {
    const scale = bodyScale(frame.landmarks, context)
    if (!scale) return { matched: false }
    const score = stackedScore(frame.landmarks, scale)
    if (score == null) return { matched: false }
    return { matched: true, confidence: score }
  },
}
