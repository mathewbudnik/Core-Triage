import { allVisible, bodyScale, hipMidpoint, LM } from '../posePrimitives'

/**
 * W01 — Pulling, not pushing (arm-powered movement)
 *
 * The climber is making upward progress through arm strength rather
 * than driving through the legs. Hips rise (climber moves up the
 * wall) but the ankles barely extend — the legs are passive luggage.
 * Burns endurance fast; the standard "I get pumped after 3 moves"
 * pattern.
 *
 * Detection model (temporal, body-relative):
 *   Per-frame state tracks hipMidpoint Y and avg ankle Y over the
 *   past ~1.2s. Each frame we compare current vs ~800ms back:
 *     • Hip rose significantly (hipRise > HIP_RISE_RATIO × torso)
 *     • Ankles did NOT extend meaningfully (ankleRise < ANKLE_RISE_RATIO)
 *   That gap means the climber's upward motion came from the arms,
 *   not from leg push.
 *
 * Distinction from K07 (hands-before-feet):
 *   • K07 catches the WRIST motion outpacing ankle motion.
 *   • W01 catches the HIP/CoM motion outpacing ankle motion.
 *   They often co-occur on bad moves but capture different signals:
 *   K07 is "stuck after the pull-up," W01 is "actively pulling up."
 *
 * Wall-angle gating: any wall except roof.
 *
 * See docs/movement-analyzer/technique-catalog.md §W01.
 */

const LOOKBACK_MS         = 800
const HISTORY_WINDOW_MS   = 1200
const HIP_RISE_RATIO      = 0.30    // hips rose ≥ 30% of torso in lookback window
const ANKLE_RISE_RATIO    = 0.10    // ankles ≤ 10% of torso = legs didn't push
const MIN_DURATION_MS = 600
const MAX_GAP_MS = 200

function avgAnkleY(landmarks) {
  if (!allVisible(landmarks, [LM.LEFT_ANKLE, LM.RIGHT_ANKLE])) return null
  return (landmarks[LM.LEFT_ANKLE].y + landmarks[LM.RIGHT_ANKLE].y) / 2
}

function pullingScore(frame, state, scale) {
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

  // Body-relative: rise as a fraction of torso length.
  const hipRiseRatio   = (past.hipY   - hip.y)   / scale.torsoLength
  const ankleRiseRatio = (past.ankleY - ankleY)  / scale.torsoLength

  if (hipRiseRatio < HIP_RISE_RATIO) return null
  if (ankleRiseRatio > ANKLE_RISE_RATIO) return null   // legs DID push — not pulling

  const lag = hipRiseRatio - Math.max(0, ankleRiseRatio)
  return Math.min(1, 0.55 + (lag - HIP_RISE_RATIO) * 1.5)
}

export const W01 = {
  id: 'W01',
  name: 'Arms doing the lifting',
  cue: 'Drive through the legs — push, don\'t pull.',
  whyItMatters:
    "Legs have far more endurance than arms — a climber who pushes " +
    "through the legs can climb all day; a climber who pulls with their " +
    "arms gets pumped in three moves. When your hips move up but your " +
    "feet stay where they are, you're using your arms as the upward " +
    "motor. Every move feels harder than it should, and the forearm " +
    "burn comes fast.",
  howToFix:
    "Cue: 'push, don't pull.' Before every move, find a foot to push " +
    "off — your hip should rise BECAUSE your leg extended, not because " +
    "your arm pulled. Drill: easy climbing on big feet, where you " +
    "deliberately straighten the standing leg through every move. The " +
    "arms become steering, not propulsion. Counterintuitive at first " +
    "for anyone who lifted weights or did gymnastics first.",
  whenYouSeeIt:
    "The most common inefficiency pattern in newer climbers and people " +
    "with strong upper bodies. Often pairs with K07 (hands move before " +
    "feet) — they're symptoms of the same underlying habit. If W01 " +
    "fires repeatedly, the highest-leverage drill is silent low-grade " +
    "climbing focused on leg push.",
  severity: 'important',
  bodyRegion: 'hips-core',
  minDurationMs: MIN_DURATION_MS,
  maxGapMs: MAX_GAP_MS,

  appliesWhen: (ctx) => ctx?.wallAngle !== 'roof',

  detect(frame, context, state) {
    const scale = bodyScale(frame.landmarks, context)
    if (!scale) return { matched: false }
    const score = pullingScore(frame, state, scale)
    if (score == null) return { matched: false }
    return { matched: true, confidence: score }
  },
}
