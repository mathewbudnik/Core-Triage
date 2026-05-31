import { allVisible, bodyScale, LM } from '../posePrimitives'

/**
 * P07 — Feet led the hands (WIN)
 *
 * Positive counterpart to K07. The climber's feet moved up FIRST in
 * the move cycle, and the hand reach happened AFTER from a stood-up
 * position. That's textbook efficient climbing — legs power the move,
 * arms just steer.
 *
 * Detection model (temporal, per-frame state):
 *   Inverse temporal pattern of K07. Each frame we compare against
 *   ~800ms in the past:
 *     • Ankles rose significantly (Y decreased — climber stood up)
 *     • Wrists either stayed at the same Y or moved up LESS than the
 *       ankles did (the climber stood up to a new position before
 *       reaching, rather than pulling up before stepping)
 *
 *   When the ankle delta dominates the wrist delta over the lookback
 *   window, this is the "feet-first" signature.
 */

const LOOKBACK_MS         = 800
const HISTORY_WINDOW_MS   = 1200
const ANKLE_RISE_RATIO    = 0.20    // ankles rose ≥ 20% of torso in lookback window
const WRIST_DOMINANCE     = 0.7     // ankle rise must exceed 70% of wrist rise (ankles led)
const MIN_DURATION_MS = 600
const MAX_GAP_MS = 200

function avgY(landmarks, indices) {
  let sum = 0
  let count = 0
  for (const i of indices) {
    const lm = landmarks[i]
    if (!lm) return null
    if ((lm.visibility ?? 1) < 0.5) return null
    sum += lm.y
    count++
  }
  return count > 0 ? sum / count : null
}

function feetLedScore(frame, state, scale) {
  const wristY = avgY(frame.landmarks, [LM.LEFT_WRIST, LM.RIGHT_WRIST])
  const ankleY = avgY(frame.landmarks, [LM.LEFT_ANKLE, LM.RIGHT_ANKLE])
  if (wristY == null || ankleY == null) return null

  state.history = state.history || []
  state.history.push({ ts: frame.timestamp, wristY, ankleY })
  while (state.history.length > 0 && frame.timestamp - state.history[0].ts > HISTORY_WINDOW_MS) {
    state.history.shift()
  }

  const past = state.history.find((h) => frame.timestamp - h.ts >= LOOKBACK_MS)
  if (!past) return null

  const wristRiseRatio = (past.wristY - wristY) / scale.torsoLength
  const ankleRiseRatio = (past.ankleY - ankleY) / scale.torsoLength

  if (ankleRiseRatio < ANKLE_RISE_RATIO) return null

  // Ankles must lead — their rise dominates the wrist rise. We compare
  // to max(wrist rise, small floor) so a static-wrist climb still
  // qualifies; the floor prevents division-by-zero ambiguity.
  const wristCompare = Math.max(wristRiseRatio, 0.05)
  const dominance = ankleRiseRatio / wristCompare
  if (dominance < WRIST_DOMINANCE) return null

  return Math.min(1, 0.55 + (dominance - WRIST_DOMINANCE) * 0.5)
}

export const P07 = {
  id: 'P07',
  name: 'Feet led the hands',
  cue: 'Feet up first, then reach — that\'s efficient climbing.',
  kind: 'win',
  bodyRegion: 'knees-feet',
  minDurationMs: MIN_DURATION_MS,
  maxGapMs: MAX_GAP_MS,

  // Same gating as K07.
  appliesWhen: (ctx) => ctx?.wallAngle !== 'roof',

  detect(frame, context, state) {
    const scale = bodyScale(frame.landmarks, context)
    if (!scale) return { matched: false }
    if (!allVisible(frame.landmarks, [
      LM.LEFT_WRIST, LM.RIGHT_WRIST,
      LM.LEFT_ANKLE, LM.RIGHT_ANKLE,
    ])) return { matched: false }
    const score = feetLedScore(frame, state, scale)
    if (score == null) return { matched: false }
    return { matched: true, confidence: score }
  },
}
