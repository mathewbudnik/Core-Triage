import { elbowAngle, comSpeed } from '../posePrimitives'

/**
 * W04 — Stalling / no momentum
 *
 * The climber stops mid-route with hands still on holds, hesitating
 * or trying to figure out a sequence. CoM speed near zero for an
 * extended period WHILE arms are under load — distinguishing this
 * from P01 (good skeletal-hang rest) where the arms are straight.
 * Stalling burns forearm pump fast and is one of the most reliable
 * pre-fall signals: a climber who freezes for 3+ seconds with bent
 * arms is often about to come off.
 *
 * Detection model:
 *   1. CoM speed below STALL_SPEED (effectively stationary).
 *   2. AT LEAST one elbow bent below LOADED_ELBOW_MAX — climber's
 *      arms are carrying the load (not P01 territory).
 *   3. Sustained ≥ MIN_DURATION_MS (3 seconds — quick pauses to
 *      visually scan are fine; sustained freeze is the problem).
 *
 * Detect uses per-frame state to compare against the previous frame
 * (CoM speed needs two frames).
 *
 * See docs/movement-analyzer/technique-catalog.md §W04.
 */

const STALL_SPEED          = 0.08    // CoM speed below this = stationary
const LOADED_ELBOW_MAX     = 160     // at least one elbow ≤ 160° = under load
const MIN_DURATION_MS = 3000          // 3s of frozen-under-load = stalling
const MAX_GAP_MS = 400                // slightly larger so a 1-frame speed blip doesn't break the run

function stallingScore(frame, prev) {
  const dtMs = frame.timestamp - prev.timestamp
  const speed = comSpeed(prev.landmarks, frame.landmarks, dtMs)
  if (speed == null) return null
  if (speed > STALL_SPEED) return null

  // Arms must be under load (at least one bent).
  const lE = elbowAngle(frame.landmarks, 'left')
  const rE = elbowAngle(frame.landmarks, 'right')
  if (lE == null || rE == null) return null
  if (Math.min(lE, rE) > LOADED_ELBOW_MAX) return null

  // The longer / more stationary the freeze, the higher confidence.
  // Speed approaches 0 → confidence approaches 1.
  return Math.min(1, 0.6 + (STALL_SPEED - speed) * 5)
}

export const W04 = {
  id: 'W04',
  name: 'Stalling on the wall',
  cue: 'Commit — long pauses under load burn the forearms faster than moving does.',
  whyItMatters:
    "Standing still on a climb is more expensive than climbing it. Every " +
    "second your forearms are gripping holds, they're using anaerobic " +
    "energy that burns out fast — and you can't unload that pump without " +
    "letting go. A 5-second hesitation often costs more energy than the " +
    "next 3 moves would have. Climbers who can't commit to sequences " +
    "freeze in place, pump out, and fall before they ever tried the move.",
  howToFix:
    "Route-read from the ground before you leave — know your sequence " +
    "before committing. Once on the wall, the rule is: move OR rest " +
    "on straight arms. Static hangs on bent arms are the worst of both " +
    "worlds. When you find yourself stuck, either drop to straight arms " +
    "and shake out, or commit to the most likely beta even if it might " +
    "be wrong. Indecision is the enemy.",
  whenYouSeeIt:
    "Common when climbers face a long reach they don't trust, a hold " +
    "they can't read, or simple fear at height. If W04 fires near a " +
    "marked fall, the stall WAS the fall mechanism — forearm pump from " +
    "the freeze killed the climb. Pairs poorly with shrugged shoulders " +
    "(S05) and bent-arms rest (S01); together they paint a clear " +
    "endurance picture.",
  severity: 'important',
  bodyRegion: 'hips-core',
  minDurationMs: MIN_DURATION_MS,
  maxGapMs: MAX_GAP_MS,

  // Stalling is a universal pattern — applies on any wall angle.
  appliesWhen: () => true,

  detect(frame, _context, state) {
    const prev = state.prevFrame
    state.prevFrame = frame
    if (!prev) return { matched: false }
    const score = stallingScore(frame, prev)
    if (score == null) return { matched: false }
    return { matched: true, confidence: score }
  },
}
