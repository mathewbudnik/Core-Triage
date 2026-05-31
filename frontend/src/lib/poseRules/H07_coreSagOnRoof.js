import { allVisible, bodyScale, LM } from '../posePrimitives'

/**
 * H07 — Core sag on roof
 *
 * On near-horizontal terrain (roof), the climber's body hangs from
 * hands and feet like a hammock. When the core gives out, the hips
 * droop AWAY from the wall — gravity pulls the pelvis down between
 * the hand-line and foot-line of support. The body shape breaks the
 * kinetic chain, force routing through arms instead of staying
 * tight against the ceiling.
 *
 * Detection model (2D image plane, roof orientation):
 *   On a roof, the wall is above the climber and gravity is pulling
 *   the body DOWN (larger image y). The hands and feet are pinned
 *   to the wall; the hips, if the core is firing, stay roughly at
 *   that same Y level. If the core sags, the hip Y drops below the
 *   wrist-to-ankle chord by a body-relative threshold.
 *
 *   1. Average wrist Y and average ankle Y define the chord Y on the
 *      wall plane.
 *   2. Hip mid Y is compared to the chord Y. If hip Y > chord Y by
 *      ≥ SAG_RATIO × torsoLength, the core is sagging.
 *   3. Sustained ≥ MIN_DURATION_MS — a transient sag during a move
 *      doesn't count; a held sag does.
 *
 * Wall-angle gating: roof only.
 *
 * See docs/movement-analyzer/technique-catalog.md §H07.
 */

const SAG_RATIO_MIN  = 0.20   // hip drops ≥ 20% of torso below wrist-ankle chord = sag
const MIN_DURATION_MS = 1000
const MAX_GAP_MS = 250

function coreSagScore(landmarks, scale) {
  const need = [
    LM.LEFT_WRIST, LM.RIGHT_WRIST,
    LM.LEFT_ANKLE, LM.RIGHT_ANKLE,
    LM.LEFT_HIP, LM.RIGHT_HIP,
  ]
  if (!allVisible(landmarks, need)) return null

  const wristMidY = (landmarks[LM.LEFT_WRIST].y  + landmarks[LM.RIGHT_WRIST].y)  / 2
  const ankleMidY = (landmarks[LM.LEFT_ANKLE].y  + landmarks[LM.RIGHT_ANKLE].y)  / 2
  const hipMidY   = (landmarks[LM.LEFT_HIP].y    + landmarks[LM.RIGHT_HIP].y)    / 2
  const chordY    = (wristMidY + ankleMidY) / 2

  // Body-relative sag below the chord.
  const sagRatio = (hipMidY - chordY) / scale.torsoLength
  if (sagRatio < SAG_RATIO_MIN) return null

  return Math.min(1, 0.55 + (sagRatio - SAG_RATIO_MIN) * 1.8)
}

export const H07 = {
  id: 'H07',
  name: 'Core sag on roof',
  cue: 'Squeeze the box — hips up to the ceiling.',
  whyItMatters:
    "On a roof, you climb from a hanging position. If your core fires, " +
    "the body stays tight as a unit — hips at the ceiling, force routed " +
    "from hands through the body to feet. If the core gives out, the " +
    "hips droop and you're now hanging only by the hands. The arms " +
    "carry full body weight; the feet are barely loaded. Forearms pump " +
    "in seconds and the climber comes off.",
  howToFix:
    "Cue: 'squeeze the box' — imagine a box shape from your hands to " +
    "your feet, and keep your hips at the top of that box (toward the " +
    "ceiling). Off-the-wall conditioning: front lever progressions, " +
    "knees-to-chest, hanging windshield wipers. Pure core endurance is " +
    "the limiting factor on most roof climbing — the technique cue " +
    "only works if the muscles can hold it.",
  whenYouSeeIt:
    "Universal on roof terrain as the climber fatigues. If H07 fires " +
    "near a marked fall, the sag was almost certainly what blew the " +
    "climb — once hips drop, recovery on roof is nearly impossible " +
    "without coming off and shaking out. Pairs with S01 (bent arms " +
    "at rest) — both reflect the same core+forearm failure pattern.",
  severity: 'important',
  bodyRegion: 'hips-core',
  minDurationMs: MIN_DURATION_MS,
  maxGapMs: MAX_GAP_MS,

  // Roof only — the kinematic chord this rule measures only exists
  // on near-horizontal terrain.
  appliesWhen: (ctx) => ctx?.wallAngle === 'roof',

  detect(frame, context) {
    const scale = bodyScale(frame.landmarks, context)
    if (!scale) return { matched: false }
    const score = coreSagScore(frame.landmarks, scale)
    if (score == null) return { matched: false }
    return { matched: true, confidence: score }
  },
}
