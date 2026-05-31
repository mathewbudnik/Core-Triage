import { allVisible, bodyScale, LM } from '../posePrimitives'

/**
 * K03 — Foot search / "tap-dancing"
 *
 * Climber lifts and replaces the same foot multiple times before
 * committing weight to it, holding extra load on the arms while the
 * feet shuffle. The hallmark of "I don't trust this foothold" or
 * "I don't know which foot I want here." Burns endurance and signals
 * tentative footwork — both fixable.
 *
 * Detection model (temporal, per-foot state tracking):
 *   The rule maintains a rolling 1.5s history of each ankle's Y
 *   position. Each frame:
 *     1. Push current ankle Y into the per-foot history.
 *     2. Trim history older than 1500ms.
 *     3. Count direction-change events on that foot's Y velocity over
 *        the recent 1000ms window. A "direction change" happens when
 *        the foot's vertical motion sign flips (up → down or vice
 *        versa) and the motion exceeds a small body-relative threshold.
 *     4. If event count ≥ 3 within 1000ms on the SAME foot, that's
 *        tap-dancing — flag the current frame.
 *
 * Per-foot rather than per-frame is key: a climber legitimately moving
 * one foot while the other stays planted shouldn't fire. K03 is
 * specifically the "same foot keeps lifting" signature.
 *
 * Wall-angle gating: any.
 *
 * See docs/movement-analyzer/technique-catalog.md §K03.
 */

const HISTORY_MS         = 1500
const COUNT_WINDOW_MS    = 1000
const MOVE_RATIO_MIN     = 0.05   // foot motion must exceed 5% of torso for an event
const MIN_EVENTS         = 3       // ≥3 direction changes on same foot in window = tap-dancing
const MIN_DURATION_MS = 600
const MAX_GAP_MS = 200

function detectEvents(history, windowStart, moveThreshold) {
  // Walk history within the window; count sign flips of segment velocity
  // that exceed the move threshold.
  let events = 0
  let lastSign = 0
  let segStartY = null
  for (const h of history) {
    if (h.ts < windowStart) continue
    if (segStartY == null) { segStartY = h.y; continue }
    const dy = h.y - segStartY
    if (Math.abs(dy) < moveThreshold) continue
    const sign = Math.sign(dy)
    if (sign !== 0 && sign !== lastSign) {
      events++
      lastSign = sign
    }
    segStartY = h.y
  }
  return events
}

function tapDanceScore(frame, state, scale) {
  // Initialize per-foot history.
  state.histLeft = state.histLeft || []
  state.histRight = state.histRight || []

  if (!allVisible(frame.landmarks, [LM.LEFT_ANKLE, LM.RIGHT_ANKLE])) return null
  const ly = frame.landmarks[LM.LEFT_ANKLE].y
  const ry = frame.landmarks[LM.RIGHT_ANKLE].y
  const ts = frame.timestamp

  state.histLeft.push({ ts, y: ly })
  state.histRight.push({ ts, y: ry })
  while (state.histLeft.length  > 0 && ts - state.histLeft[0].ts  > HISTORY_MS) state.histLeft.shift()
  while (state.histRight.length > 0 && ts - state.histRight[0].ts > HISTORY_MS) state.histRight.shift()

  const moveThreshold = MOVE_RATIO_MIN * scale.torsoLength
  const windowStart   = ts - COUNT_WINDOW_MS

  const leftEvents  = detectEvents(state.histLeft,  windowStart, moveThreshold)
  const rightEvents = detectEvents(state.histRight, windowStart, moveThreshold)
  const maxEvents = Math.max(leftEvents, rightEvents)
  if (maxEvents < MIN_EVENTS) return null

  // Score: scales with how many extra events past threshold.
  return Math.min(1, 0.55 + (maxEvents - MIN_EVENTS) * 0.15)
}

export const K03 = {
  id: 'K03',
  name: 'Tap-dancing on a foothold',
  cue: 'First placement is final — commit to the foot, don\'t shuffle.',
  whyItMatters:
    "Every time you lift and replace a foot, your arms carry the full " +
    "load instead of sharing it with the leg. Three shuffles on the " +
    "same foothold is roughly the same energy cost as climbing two " +
    "extra moves. Beyond the energy cost, tap-dancing trains tentative " +
    "footwork — the climber learns to second-guess every placement, " +
    "which compounds over time into general lack of trust in their feet.",
  howToFix:
    "Cue: 'first placement is final.' Before you commit a foot, look " +
    "at where you want it, then place it once and leave it. Drill: " +
    "tape a small chalk dot on a foothold, then climb the route and " +
    "land your toe on the dot each time. Forces deliberate placement. " +
    "Slow climbing on easy terrain with a 'no foot shuffle' rule is " +
    "the cheapest way to build the habit.",
  whenYouSeeIt:
    "Most common in newer climbers and in scared moments (high above " +
    "the deck, on tiny holds, on smears). If K03 fires alongside W04 " +
    "(stalling), the climber is generally hesitant on this clip and " +
    "may need confidence drills more than technique drills.",
  severity: 'polish',
  bodyRegion: 'knees-feet',
  minDurationMs: MIN_DURATION_MS,
  maxGapMs: MAX_GAP_MS,

  appliesWhen: () => true,

  detect(frame, context, state) {
    const scale = bodyScale(frame.landmarks, context)
    if (!scale) return { matched: false }
    const score = tapDanceScore(frame, state, scale)
    if (score == null) return { matched: false }
    return { matched: true, confidence: score }
  },
}
