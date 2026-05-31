/**
 * Body-region color-coded skeleton renderer for MediaPipe Pose Landmarker
 * (33-landmark model). Uses the CoreTriage palette — terracotta for torso,
 * mint for arms, cream for legs.
 *
 * We draw ourselves (rather than calling DrawingUtils) so we can:
 *   - filter out low-visibility landmarks (MediaPipe hallucinates positions
 *     for occluded joints — without this filter you get phantom dots
 *     floating in the wall behind the climber)
 *   - fade borderline-confidence landmarks instead of binary on/off
 *   - skip connectors when either endpoint is unreliable
 *
 * Connection topology pulled from MediaPipe's documented POSE_CONNECTIONS;
 * we split it into named regions for per-region styling.
 */

// Hide landmarks below this confidence. Raised from 0.3 to 0.5 after climbing
// footage from behind/overhead angles showed phantom landmarks snapped to
// background holds — those phantoms had visibility 0.3-0.5, so the higher
// floor screens them out.
const MIN_VISIBILITY = 0.5

// Borderline confidence range — we still draw, but fade out so the user
// can visually distinguish "definitely here" from "we think it's here."
const FADE_VISIBILITY = 0.75

const TORSO = [
  [11, 12], [11, 23], [12, 24], [23, 24],
]

const ARMS = [
  // Left arm
  [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  // Right arm
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
]

const LEGS = [
  // Left leg
  [23, 25], [25, 27], [27, 29], [27, 31], [29, 31],
  // Right leg
  [24, 26], [26, 28], [28, 30], [28, 32], [30, 32],
]

// Stroke widths in CSS pixels; scaled by DPR at draw time so a "5px" line
// on a 2x HiDPI screen renders as 10 backing-buffer pixels (still 5 CSS px
// visually). Bumped from the original 4/3/3 — the smaller values were
// hard to see against textured wall backgrounds.
const STYLES = {
  torso:    { color: '#d97757', lineWidth: 7 },  // ct-terracotta — central "spine"
  arms:     { color: '#3FD8A4', lineWidth: 5 },  // mint
  legs:     { color: '#f0f5ed', lineWidth: 5 },  // ct-cream
  landmark: { color: '#f0f5ed', radius: 5 },     // ct-cream
}

function visibilityAlpha(v) {
  if (v == null) return 1.0
  if (v < MIN_VISIBILITY) return 0
  if (v >= FADE_VISIBILITY) return 1.0
  // Linear fade between MIN and FADE bounds, with a 0.45 floor so faded
  // landmarks remain visible but clearly de-emphasized.
  const t = (v - MIN_VISIBILITY) / (FADE_VISIBILITY - MIN_VISIBILITY)
  return 0.45 + 0.55 * t
}

function drawConnector(ctx, a, b, color, lineWidth) {
  if (!a || !b) return
  const aA = visibilityAlpha(a.visibility)
  const bA = visibilityAlpha(b.visibility)
  if (aA === 0 || bA === 0) return
  const alpha = Math.min(aA, bA)  // line is only as confident as its weaker endpoint
  ctx.globalAlpha = alpha
  ctx.beginPath()
  ctx.moveTo(a.x * ctx.canvas.width, a.y * ctx.canvas.height)
  ctx.lineTo(b.x * ctx.canvas.width, b.y * ctx.canvas.height)
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.lineCap = 'round'
  ctx.stroke()
  ctx.globalAlpha = 1
}

function drawLandmarkDot(ctx, lm, color, radius) {
  if (!lm) return
  const alpha = visibilityAlpha(lm.visibility)
  if (alpha === 0) return
  ctx.globalAlpha = alpha
  ctx.beginPath()
  ctx.arc(lm.x * ctx.canvas.width, lm.y * ctx.canvas.height, radius, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  ctx.globalAlpha = 1
}

/**
 * Draw the pose skeleton onto a 2D canvas context.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{x: number, y: number, z: number, visibility?: number}>|null|undefined} landmarks
 *   33-entry array of normalized (0–1) landmarks from PoseLandmarker. Pass
 *   nullish/empty to clear without drawing.
 */
export function drawPose(ctx, landmarks) {
  // Clear the full backing buffer (no DPR division — ctx has identity transform).
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  if (!landmarks || landmarks.length === 0) return

  // Multiply CSS-pixel widths by DPR so visual thickness is consistent
  // across HiDPI and standard displays.
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1

  // Connectors first so landmark dots draw on top.
  const drawSet = (pairs, color, lineWidth) => {
    for (const [i, j] of pairs) {
      drawConnector(ctx, landmarks[i], landmarks[j], color, lineWidth * dpr)
    }
  }
  drawSet(TORSO, STYLES.torso.color, STYLES.torso.lineWidth)
  drawSet(ARMS,  STYLES.arms.color,  STYLES.arms.lineWidth)
  drawSet(LEGS,  STYLES.legs.color,  STYLES.legs.lineWidth)

  // Landmark dots — skip face landmarks 1-10 (they cluster on the face
  // and add noise). Index 0 (nose) we keep as a "head" anchor.
  const radius = STYLES.landmark.radius * dpr
  for (let i = 0; i < landmarks.length; i++) {
    if (i >= 1 && i <= 10) continue  // face mesh — too noisy at climbing distance
    drawLandmarkDot(ctx, landmarks[i], STYLES.landmark.color, radius)
  }
}
