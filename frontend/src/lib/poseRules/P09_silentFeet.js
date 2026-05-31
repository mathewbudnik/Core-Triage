import { allVisible, bodyScale, LM } from '../posePrimitives'

/**
 * P09 — Silent feet (WIN)
 *
 * Positive counterpart to K04. Across the clip, the climber's foot
 * placements showed CONTROLLED motion — every footwork transition
 * was gentle, no high-velocity impacts. This is the textbook
 * "silent feet" pattern coaches praise.
 *
 * Detection model:
 *   For each frame, observe foot motion ratios per side. P09 fires
 *   when a sustained window of frames shows:
 *     • At least one foot was actively moving (so we're not just
 *       observing a stationary stance — we want to see actual
 *       footwork, deliberately done)
 *     • Peak velocity during the motion stayed BELOW QUIET_VELOCITY
 *       (no slapping spikes)
 *   Sustained ≥ MIN_DURATION_MS so a single careful placement counts
 *   only if it's part of a controlled run, not luck.
 */

const ACTIVE_VELOCITY_MIN = 0.3   // foot moving ≥ 0.3 torso/sec = actually placing
const QUIET_VELOCITY_MAX  = 1.0   // peak velocity ≤ 1.0 torso/sec = controlled, no slap
const MIN_DURATION_MS = 1500
const MAX_GAP_MS = 400

function ankleVelocityRatio(prev, now, dtMs, torsoLength) {
  if (dtMs <= 0 || torsoLength <= 0) return 0
  return Math.abs((now - prev) / torsoLength * (1000 / dtMs))
}

function silentFeetScore(frame, state, scale) {
  if (!allVisible(frame.landmarks, [LM.LEFT_ANKLE, LM.RIGHT_ANKLE])) return null
  const ts = frame.timestamp
  const ly = frame.landmarks[LM.LEFT_ANKLE].y
  const ry = frame.landmarks[LM.RIGHT_ANKLE].y

  // Need a prev frame to compute velocity.
  const prev = state.prev
  state.prev = { ts, ly, ry }
  if (!prev) return null
  const dt = ts - prev.ts
  if (dt <= 0 || dt > 200) return null

  const vL = ankleVelocityRatio(prev.ly, ly, dt, scale.torsoLength)
  const vR = ankleVelocityRatio(prev.ry, ry, dt, scale.torsoLength)
  const maxV = Math.max(vL, vR)

  // Silent only when foot is ACTIVELY moving but UNDER the slap threshold.
  // No motion at all isn't silent-feet, that's just standing.
  if (maxV < ACTIVE_VELOCITY_MIN) return null
  if (maxV > QUIET_VELOCITY_MAX) return null

  // Closer to ideal (deliberate, slow) = higher confidence.
  const midpoint = (ACTIVE_VELOCITY_MIN + QUIET_VELOCITY_MAX) / 2
  const distance = Math.abs(maxV - midpoint) / (midpoint - ACTIVE_VELOCITY_MIN)
  return Math.min(1, 1 - distance * 0.4)
}

export const P09 = {
  id: 'P09',
  name: 'Silent feet',
  cue: 'Controlled placement — no slap, no shuffle.',
  kind: 'win',
  bodyRegion: 'knees-feet',
  minDurationMs: MIN_DURATION_MS,
  maxGapMs: MAX_GAP_MS,

  appliesWhen: () => true,

  detect(frame, context, state) {
    const scale = bodyScale(frame.landmarks, context)
    if (!scale) return { matched: false }
    const score = silentFeetScore(frame, state, scale)
    if (score == null) return { matched: false }
    return { matched: true, confidence: score }
  },
}
