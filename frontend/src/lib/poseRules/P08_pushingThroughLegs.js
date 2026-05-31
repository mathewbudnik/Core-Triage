import { allVisible, bodyScale, hipMidpoint, LM } from '../posePrimitives'

/**
 * P08 — Pushing through the legs (WIN)
 *
 * Positive counterpart to W01. The climber's hips rose UP the wall
 * and the ankles extended (legs straightened) in proportion — the
 * legs did the lifting. The arms went along for the ride. That's
 * what efficient climbing looks like at the bio-mechanical level.
 *
 * Detection model:
 *   Inverse of W01. Per-frame state tracks hip Y and avg ankle Y
 *   over the past ~1.2s. Compare current vs ~800ms back:
 *     • Hip rose (climber moved up the wall)
 *     • Ankle rose comparably — both moved together
 *     • ankle rise must be at least PUSH_RATIO of the hip rise
 *       (so the legs were doing real work, not just dragging)
 */

const LOOKBACK_MS         = 800
const HISTORY_WINDOW_MS   = 1200
const HIP_RISE_MIN        = 0.20    // climber must have actually moved up ≥ 20% torso
const PUSH_RATIO          = 0.6     // ankleRise / hipRise ≥ 0.6 → legs did 60%+ of the work
const MIN_DURATION_MS = 600
const MAX_GAP_MS = 200

function avgAnkleY(landmarks) {
  if (!allVisible(landmarks, [LM.LEFT_ANKLE, LM.RIGHT_ANKLE])) return null
  return (landmarks[LM.LEFT_ANKLE].y + landmarks[LM.RIGHT_ANKLE].y) / 2
}

function pushingScore(frame, state, scale) {
  const hip = hipMidpoint(frame.landmarks)
  const ankleY = avgAnkleY(frame.landmarks)
  if (!hip || ankleY == null) return null

  state.history = state.history || []
  state.history.push({ ts: frame.timestamp, hipY: hip.y, ankleY })
  while (state.history.length > 0 && frame.timestamp - state.history[0].ts > HISTORY_WINDOW_MS) {
    state.history.shift()
  }

  const past = state.history.find((h) => frame.timestamp - h.ts >= LOOKBACK_MS)
  if (!past) return null

  const hipRiseRatio   = (past.hipY   - hip.y)   / scale.torsoLength
  const ankleRiseRatio = (past.ankleY - ankleY)  / scale.torsoLength

  // Climber must have actually moved upward.
  if (hipRiseRatio < HIP_RISE_MIN) return null

  // Legs must have done meaningful proportion of the work.
  const pushDominance = ankleRiseRatio / hipRiseRatio
  if (pushDominance < PUSH_RATIO) return null

  return Math.min(1, 0.55 + (pushDominance - PUSH_RATIO) * 0.8)
}

export const P08 = {
  id: 'P08',
  name: 'Pushed through the legs',
  cue: 'The legs did the lifting — efficient climbing.',
  kind: 'win',
  bodyRegion: 'hips-core',
  minDurationMs: MIN_DURATION_MS,
  maxGapMs: MAX_GAP_MS,

  appliesWhen: (ctx) => ctx?.wallAngle !== 'roof',

  detect(frame, context, state) {
    const scale = bodyScale(frame.landmarks, context)
    if (!scale) return { matched: false }
    const score = pushingScore(frame, state, scale)
    if (score == null) return { matched: false }
    return { matched: true, confidence: score }
  },
}
