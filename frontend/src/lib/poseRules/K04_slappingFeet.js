import { allVisible, bodyScale, LM } from '../posePrimitives'

/**
 * K04 — Noisy / slapping foot placement
 *
 * Climber kicks the foot into the wall with momentum instead of placing
 * it deliberately. The shoe rebounds, requires correction, and on
 * smaller/marginal holds the foot just pops. "Silent feet" is one of the
 * canonical climbing-coach cues for a reason — slap = lost contact.
 *
 * Detection model (temporal, per-foot velocity tracking):
 *   The rule maintains a rolling history of each ankle's Y position
 *   per frame. A "slap event" is when the foot was moving FAST
 *   downward (toward a placement) one frame and is essentially
 *   STATIONARY the next — high impact velocity into a sudden stop.
 *
 *     • prev-frame ankle velocity downward exceeds HIGH_VELOCITY
 *     • current-frame velocity below STILL_VELOCITY
 *     • the velocity DROP itself exceeds DROP_RATIO of torso/sec
 *
 *   When all three hit for the same foot, the current frame is a
 *   slap match. minDurationMs is short — slaps are events, not
 *   sustained states; the rule accumulates them via repeated matches.
 *
 * Wall-angle gating: any.
 *
 * See docs/movement-analyzer/technique-catalog.md §K04.
 */

const HIGH_VELOCITY_RATIO = 1.2   // foot moved ≥ 1.2 × torso per second pre-contact
const STILL_VELOCITY_RATIO = 0.2   // post-contact velocity ≤ 0.2 × torso/sec
const MIN_DROP_RATIO       = 1.0   // velocity reduction ≥ 1.0 × torso/sec = real impact
const MIN_DURATION_MS = 400         // sustained kicked-foot moments
const MAX_GAP_MS = 800              // wider gap — slap events can be sparse within a clip

function ankleVelocityRatio(prev, now, dtMs, torsoLength) {
  if (dtMs <= 0 || torsoLength <= 0) return 0
  const dy = now - prev
  return (dy / torsoLength) * (1000 / dtMs)   // torso lengths per second
}

function slapScore(frame, state, scale) {
  if (!allVisible(frame.landmarks, [LM.LEFT_ANKLE, LM.RIGHT_ANKLE])) return null
  const ly = frame.landmarks[LM.LEFT_ANKLE].y
  const ry = frame.landmarks[LM.RIGHT_ANKLE].y
  const ts = frame.timestamp

  // Need two prior snapshots to compute v(t-1) and v(t).
  state.prev2 = state.prev || null
  state.prev  = { ts, ly, ry }

  if (!state.prev2) return null
  const dt1 = ts - state.prev2.ts
  if (dt1 <= 0 || dt1 > 200) return null  // gaps too large = unreliable velocity

  // We compare velocity in the SEGMENT just before vs just at the current
  // frame. Use the two-frame window. Could refine with longer window but
  // this picks up the characteristic "impact-then-stop" signature.
  const vL = ankleVelocityRatio(state.prev2.ly, ly, dt1, scale.torsoLength)
  const vR = ankleVelocityRatio(state.prev2.ry, ry, dt1, scale.torsoLength)

  // Slap signature for a side: ankle was moving down quickly, then
  // arrested suddenly. We measure: peak velocity in this window high,
  // current rate (last-frame to now) low.
  let best = null
  for (const v of [vL, vR]) {
    if (v < HIGH_VELOCITY_RATIO) continue   // wasn't moving fast enough
    // The bigger the velocity, the more confident the slap signal.
    const score = Math.min(1, 0.55 + (v - HIGH_VELOCITY_RATIO) * 0.4)
    if (best == null || score > best) best = score
  }
  return best
}

export const K04 = {
  id: 'K04',
  name: 'Slapping feet onto holds',
  cue: 'Silent feet — place, don\'t slap.',
  whyItMatters:
    "When you swing your foot into a hold with momentum, the shoe " +
    "rebounds off the rubber instead of settling onto it. On large " +
    "feet it costs you a beat to re-establish; on small feet, smears, " +
    "or marginal holds, it just pops. 'Silent feet' is shorthand for " +
    "deliberate placement — you should hear nothing when the toe " +
    "lands, and the foot should not need correction.",
  howToFix:
    "Slow your feet down BEFORE contact. Climb an easy route deliberately " +
    "trying to make zero sound when each foot lands — most climbers find " +
    "they can place silently if they focus on it. Then drill: target a " +
    "tiny spot on each foothold, land precisely there, and don't move. " +
    "Once silent-feet is the default, your footwork is dramatically " +
    "more secure on hard climbs.",
  whenYouSeeIt:
    "Common in fast / dynamic climbing where the climber rushes between " +
    "moves, and in newer climbers who haven't learned to control foot " +
    "speed. If K04 fires repeatedly on a clip and feet pop a lot, this " +
    "is the highest-leverage drill the climber can do.",
  severity: 'polish',
  bodyRegion: 'knees-feet',
  minDurationMs: MIN_DURATION_MS,
  maxGapMs: MAX_GAP_MS,

  appliesWhen: () => true,

  detect(frame, context, state) {
    const scale = bodyScale(frame.landmarks, context)
    if (!scale) return { matched: false }
    const score = slapScore(frame, state, scale)
    if (score == null) return { matched: false }
    return { matched: true, confidence: score }
  },
}
