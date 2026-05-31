import { allVisible, bodyScale, LM } from '../posePrimitives'

/**
 * K07 — Hands move before feet (over-reaching cycle)
 *
 * The climber pulls themselves up with their arms and only afterward
 * drags their feet up — a "ladder rung" pull-up-then-feet pattern that
 * wastes endurance because the arms are doing work the legs should be
 * doing. One of the most universally-taught fundamental errors in
 * beginner / intermediate climbing.
 *
 * Detection model (temporal, per-frame state tracking):
 *   The rule maintains a rolling history of average wrist-Y and
 *   average ankle-Y over the past ~1.2s. Each frame we compare current
 *   vs. ~800ms ago to detect:
 *     • Wrists rose significantly (Y decreased — climbing up)
 *     • Ankles did NOT follow (stayed at same Y or barely moved)
 *
 *   When both conditions hold AND the climber is body-relative
 *   committed (wrist rise > 40% torso while ankle rise < 10% torso),
 *   the current frame is a "stuck after pull" match.
 *
 *   The rule history is reset per clip (engine creates a fresh state
 *   object per rule per call to runRules()), so no leakage across
 *   uploads.
 *
 * Wall-angle gating: any wall except roof (different mechanics).
 *
 * See docs/movement-analyzer/technique-catalog.md §K07.
 */

const LOOKBACK_MS         = 800
const HISTORY_WINDOW_MS   = 1200
const WRIST_RISE_RATIO    = 0.40   // wrists rose ≥ 40% of torso in lookback window
const ANKLE_FOLLOW_RATIO  = 0.10   // ankles moved ≤ 10% of torso = "didn't follow"
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

function handsBeforeFeetScore(frame, state, scale) {
  const wristY = avgY(frame.landmarks, [LM.LEFT_WRIST, LM.RIGHT_WRIST])
  const ankleY = avgY(frame.landmarks, [LM.LEFT_ANKLE, LM.RIGHT_ANKLE])
  if (wristY == null || ankleY == null) return null

  // Initialize and maintain rolling history.
  state.history = state.history || []
  state.history.push({ ts: frame.timestamp, wristY, ankleY })
  while (state.history.length > 0 && frame.timestamp - state.history[0].ts > HISTORY_WINDOW_MS) {
    state.history.shift()
  }

  // Find the oldest sample at least LOOKBACK_MS in the past.
  const past = state.history.find((h) => frame.timestamp - h.ts >= LOOKBACK_MS)
  if (!past) return null

  // Body-relative deltas: how far the wrists rose vs how far the ankles
  // rose, both as a fraction of the climber's torso length.
  const wristRiseRatio = (past.wristY - wristY) / scale.torsoLength
  const ankleRiseRatio = (past.ankleY - ankleY) / scale.torsoLength

  if (wristRiseRatio < WRIST_RISE_RATIO) return null
  if (ankleRiseRatio > ANKLE_FOLLOW_RATIO) return null   // feet ARE following — not stuck

  // The bigger the wrist-vs-ankle gap, the more committed the over-reach.
  const lag = wristRiseRatio - Math.max(0, ankleRiseRatio)
  return Math.min(1, 0.55 + (lag - WRIST_RISE_RATIO) * 1.5)
}

export const K07 = {
  id: 'K07',
  name: 'Hands moved before feet',
  cue: 'Bring your feet up first — then reach.',
  whyItMatters:
    "Climbing efficiently means letting your legs do most of the work — " +
    "your legs have far more endurance than your arms. When you over-reach " +
    "with your arms first and drag your feet up afterward, you're using " +
    "the wrong muscles for what should be a leg-powered move. The forearm " +
    "pump comes fast, and the climbing feels much harder than it needs to. " +
    "It's the single most common pattern in newer climbers — and the most " +
    "fixable.",
  howToFix:
    "Cue: 'feet first, then hands.' Before reaching a hand to a new hold, " +
    "step a foot up onto a higher foothold. Stand UP through that foot — " +
    "your hand reaches the next hold from a stood-up position, not by " +
    "pulling. Drill: silent climbing on an easy route, deliberately moving " +
    "ONE limb at a time and prioritizing feet. It feels slow at first; " +
    "it's how every efficient climber learned.",
  whenYouSeeIt:
    "Almost universal in climbers who came from a pull-up-strong background " +
    "(gymnasts, rope climbers) or who learned in a gym focused on jugs. " +
    "Also reappears under fatigue or fear — the body defaults to arm-pulling " +
    "when scared. If K07 fires often in a clip, footwork drills are the " +
    "biggest leverage point you have.",
  severity: 'important',
  bodyRegion: 'knees-feet',
  minDurationMs: MIN_DURATION_MS,
  maxGapMs: MAX_GAP_MS,

  // Skipped on roof — the body is horizontal there and the wrist-vs-ankle
  // y comparison doesn't carry the same meaning.
  appliesWhen: (ctx) => ctx?.wallAngle !== 'roof',

  detect(frame, context, state) {
    const scale = bodyScale(frame.landmarks, context)
    if (!scale) return { matched: false }
    if (!allVisible(frame.landmarks, [
      LM.LEFT_WRIST, LM.RIGHT_WRIST,
      LM.LEFT_ANKLE, LM.RIGHT_ANKLE,
    ])) return { matched: false }
    const score = handsBeforeFeetScore(frame, state, scale)
    if (score == null) return { matched: false }
    return { matched: true, confidence: score }
  },
}
