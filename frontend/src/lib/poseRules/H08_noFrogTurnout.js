import { allVisible, bodyScale, elbowAngle, visibilityWeight, LM } from '../posePrimitives'

/**
 * H08 — No frog turnout (knees forward, hips floating off the wall)
 *
 * The "frog" position — both feet placed, knees splayed laterally
 * outward, hips dropped close to the wall — is one of the cheapest
 * sources of rest in steep climbing. Without it, the climber can't
 * get pelvis-to-wall, so even on a two-feet stance the arms carry
 * full body weight.
 *
 * Detection model (static-pose signature):
 *   1. Both feet visible + on holds (we accept "both ankles tracked" as
 *      a proxy since we don't have hold data).
 *   2. At least one elbow is bent (< 160°). Straight-armed hangs are
 *      P01 territory — bone-loaded, frog isn't relevant.
 *   3. BOTH knees are laterally close to their ankles (knee.x ≈ ankle.x).
 *      In a real frog, knees would be significantly outboard of their
 *      ankles.
 *   4. Sustained ≥ MIN_DURATION_MS — a transient "knees-forward"
 *      moment during a move doesn't count; a held stance does.
 *
 * Wall-angle gating: vertical + overhang. On slab, knees-forward is
 * the correct stance (driving over the foot). On roof, leg position
 * is mechanically constrained.
 *
 * See docs/movement-analyzer/technique-catalog.md §H08.
 */

const KNEE_ANKLE_ALIGNED_RATIO = 0.33  // knee within 33% of shoulder width of ankle = "not frogged"
const LOADED_ELBOW_MAX = 160            // at least one elbow ≤ 160° = climber under load
const MIN_DURATION_MS = 1500            // 1.5s held stance — transient knees-forward doesn't count
const MAX_GAP_MS = 250

function noFrogScore(landmarks, scale) {
  const need = [
    LM.LEFT_KNEE, LM.RIGHT_KNEE,
    LM.LEFT_ANKLE, LM.RIGHT_ANKLE,
  ]
  if (!allVisible(landmarks, need)) return null

  // At least one arm must be bent — we're looking for a loaded stance.
  // If both arms are straight, the climber is hanging on bone (P01) and
  // frog isn't the relevant cue.
  const lElbow = elbowAngle(landmarks, 'left')
  const rElbow = elbowAngle(landmarks, 'right')
  if (lElbow == null || rElbow == null) return null
  if (Math.min(lElbow, rElbow) > LOADED_ELBOW_MAX) return null

  // Body-relative knee-to-ankle alignment.
  const aligned = KNEE_ANKLE_ALIGNED_RATIO * scale.shoulderWidth
  const leftDelta  = Math.abs(landmarks[LM.LEFT_KNEE].x  - landmarks[LM.LEFT_ANKLE].x)
  const rightDelta = Math.abs(landmarks[LM.RIGHT_KNEE].x - landmarks[LM.RIGHT_ANKLE].x)

  // Either knee already splayed outward enough = climber IS frogging; skip.
  if (leftDelta > aligned || rightDelta > aligned) return null

  // Tighter alignment (knees more directly over ankles) = stronger no-frog signal.
  const avgDelta = (leftDelta + rightDelta) / 2
  const avgRatio = avgDelta / scale.shoulderWidth
  const visWt = visibilityWeight(landmarks, [
    LM.LEFT_KNEE, LM.RIGHT_KNEE,
    LM.LEFT_ANKLE, LM.RIGHT_ANKLE,
  ])
  return Math.min(1, 0.55 + (KNEE_ANKLE_ALIGNED_RATIO - avgRatio) * 1.0) * visWt
}

export const H08 = {
  id: 'H08',
  name: 'Knees forward — missing the frog',
  cue: 'Knees out, hips in — splay the legs to drop the pelvis to the wall.',
  whyItMatters:
    "On steep terrain, the cheapest rest position is the frog: both feet " +
    "on, knees out wide to the sides, hips dropped flush against the wall. " +
    "In that position the wall takes most of your body weight and the arms " +
    "can finally relax. If your knees stay pointed forward — even when both " +
    "feet are placed — the pelvis floats off the wall and the arms keep " +
    "carrying you, so you never actually get a rest.",
  howToFix:
    "When both feet are on and you want to recover, deliberately push your " +
    "knees out to the sides (external hip rotation) — your hips will sink " +
    "toward the wall. Some climbers describe it as 'sit in your hips.' " +
    "Hip mobility matters: if the position feels impossible, drills like " +
    "deep squats with elbows pushing knees out, and 90/90 hip rotations, " +
    "build the range over a few weeks.",
  whenYouSeeIt:
    "Climbers who skip mobility work, or who learned on vertical gym walls " +
    "where frog rarely matters, default to knees-forward even on overhang. " +
    "If H08 fires repeatedly, every 'rest' position the climber tries is " +
    "actually still loading the arms — frog drills are the priority.",
  severity: 'important',
  bodyRegion: 'hips-core',
  minDurationMs: MIN_DURATION_MS,
  maxGapMs: MAX_GAP_MS,

  // Same gating shape as H02 — only meaningful on vertical/overhang.
  appliesWhen: (ctx) =>
    ctx?.wallAngle === 'vertical' || ctx?.wallAngle === 'overhang',

  detect(frame, context) {
    const scale = bodyScale(frame.landmarks, context)
    if (!scale) return { matched: false }
    const score = noFrogScore(frame.landmarks, scale)
    if (score == null) return { matched: false }
    return { matched: true, confidence: score }
  },
}
