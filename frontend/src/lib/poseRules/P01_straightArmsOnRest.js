import { elbowAngle, comSpeed } from '../posePrimitives'

/**
 * P01 — Straight arms on rest (WIN)
 *
 * The positive counterpart to S01. When the climber is stationary AND
 * both arms are extended past the "skeletal hang" threshold, that's
 * exactly what they should be doing — load goes through bone, not muscle.
 *
 * Detection model:
 *   • CoM speed < REST_SPEED (climber holding still).
 *   • BOTH elbow angles >= STRAIGHT_THRESHOLD (both arms extended).
 *   • Sustained ≥ MIN_DURATION_MS — a quick straight moment doesn't
 *     count; a real rest with bone-loaded arms does.
 */

const STRAIGHT_THRESHOLD = 160
const REST_SPEED = 0.05
const MIN_DURATION_MS = 1000
const MAX_GAP_MS = 250

export const P01 = {
  id: 'P01',
  name: 'Straight arms on rest',
  cue: 'You hung from bone — your forearms thank you.',
  kind: 'win',
  bodyRegion: 'shoulders-arms',
  minDurationMs: MIN_DURATION_MS,
  maxGapMs: MAX_GAP_MS,

  // Same gating as S01 — doesn't apply on slab.
  appliesWhen: (ctx) => ctx?.wallAngle !== 'slab',

  detect(frame, _context, state) {
    const prev = state.prevFrame
    state.prevFrame = frame
    if (!prev) return { matched: false }

    const dtMs = frame.timestamp - prev.timestamp
    const speed = comSpeed(prev.landmarks, frame.landmarks, dtMs)
    if (speed == null || speed > REST_SPEED) return { matched: false }

    const left  = elbowAngle(frame.landmarks, 'left')
    const right = elbowAngle(frame.landmarks, 'right')
    if (left == null || right == null) return { matched: false }
    if (left < STRAIGHT_THRESHOLD || right < STRAIGHT_THRESHOLD) return { matched: false }

    // The straighter both arms, the higher confidence.
    const minAngle = Math.min(left, right)
    const confidence = Math.min(1, 0.5 + (minAngle - STRAIGHT_THRESHOLD) / 40)
    return { matched: true, confidence }
  },
}
