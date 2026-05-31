import { elbowAngle, comSpeed } from '../posePrimitives'

/**
 * S01 — Bent arms at rest
 *
 * The climber holds positions with elbows flexed instead of hanging
 * skeletally between moves. Forearms pump out fast.
 *
 * Detection model:
 *   • A frame is "at rest" if CoM (hip midpoint) is moving slower than
 *     REST_SPEED (normalized image units / sec).
 *   • A frame is "bent" if EITHER elbow angle is < BENT_ANGLE_DEG.
 *   • The rule fires on consecutive frames that are BOTH at rest AND
 *     have bent arms, sustained for at least MIN_DURATION_MS.
 *
 * Wall-angle gating: doesn't make sense on slab (nothing to hang
 * skeletally from). Fires on vertical and overhang.
 *
 * See docs/movement-analyzer/technique-catalog.md §S — Shoulders & Arms.
 */

const BENT_ANGLE_DEG  = 150     // < 150° = noticeably bent; > 150° = "skeletal hang"
const REST_SPEED      = 0.05    // normalized image units / sec — empirically still
const MIN_DURATION_MS = 1200    // sustained for ≥ 1.2s before we call it out
const MAX_GAP_MS      = 250

function bentEnough(landmarks, side) {
  const a = elbowAngle(landmarks, side)
  if (a == null) return null
  return a < BENT_ANGLE_DEG ? a : null
}

export const S01 = {
  id: 'S01',
  name: 'Bent arms at rest',
  cue: 'Hang from bone.',
  whyItMatters:
    "Bent arms recruit the biceps and forearm flexors continuously. Every second " +
    "of bent-arm holding burns endurance — that's the source of the pump. Straight " +
    "arms transfer load through the skeleton (bone, joint capsule, connective " +
    "tissue) instead of the muscles, so you can rest indefinitely on a jug if " +
    "your arms hang straight.",
  howToFix:
    "Between every move, consciously straighten the loaded arm until the elbow " +
    "locks at the shoulder. On a rest stance, drop your hips, drop your shoulders, " +
    "and let the arm fully extend — count one second before initiating the next " +
    "pull. Drill: 'dead-hang transitions' — at every jug, fully extend, breathe " +
    "out, then move.",
  whenYouSeeIt:
    "Most common at obvious rest jugs that the climber grips defensively instead " +
    "of hanging from, and on long sequences where they're squeezing every hold " +
    "uniformly. If the pump-out happens here, this is usually a major contributor.",
  severity: 'important',
  bodyRegion: 'shoulders-arms',
  minDurationMs: MIN_DURATION_MS,
  maxGapMs: MAX_GAP_MS,

  // Skip on slab — nothing to hang from. Fires on vertical / overhang / roof.
  appliesWhen: (ctx) => ctx?.wallAngle !== 'slab',

  detect(frame, _context, state) {
    const prev = state.prevFrame
    state.prevFrame = frame

    if (!prev) return { matched: false }  // first frame — no speed reference yet

    const dtMs = frame.timestamp - prev.timestamp
    const speed = comSpeed(prev.landmarks, frame.landmarks, dtMs)
    if (speed == null || speed > REST_SPEED) return { matched: false }

    const leftBent  = bentEnough(frame.landmarks, 'left')
    const rightBent = bentEnough(frame.landmarks, 'right')
    // Either arm bent is enough — climbers often shake one arm while the
    // other holds, and the holding arm should be straight even mid-shake.
    if (leftBent == null && rightBent == null) return { matched: false }

    // Confidence: more bent = more confident (150° → 0.5, 90° → 1.0).
    const minAngle = Math.min(leftBent ?? 999, rightBent ?? 999)
    const confidence = Math.max(0.5, Math.min(1, (BENT_ANGLE_DEG - minAngle) / 60 + 0.5))

    return { matched: true, confidence, leftBent, rightBent, restSpeed: speed }
  },
}
