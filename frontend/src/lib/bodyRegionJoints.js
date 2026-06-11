// Overlay-selection helpers for the annotated pose overlay.
//
// The analyzer's findings carry exactly one of four `bodyRegion` strings and no
// per-rule landmark data, so the region IS the overlay key. Indices below are
// the standard MediaPipe BlazePose 33-landmark convention (shoulders 11/12,
// elbows 13/14, wrists 15/16, hips 23/24, knees 25/26, ankles 27/28, nose 0).

export const BODY_REGION_JOINTS = {
  'head-gaze':      { joints: [0, 11, 12],            segments: [[11, 12]] },
  'shoulders-arms': { joints: [11, 12, 13, 14, 15, 16], segments: [[11, 13], [13, 15], [12, 14], [14, 16], [11, 12]] },
  'hips-core':      { joints: [11, 12, 23, 24],       segments: [[11, 23], [12, 24], [23, 24], [11, 12]] },
  'knees-feet':     { joints: [23, 24, 25, 26, 27, 28], segments: [[23, 25], [25, 27], [24, 26], [26, 28]] },
}

// Fallback: the torso box — a safe, always-meaningful highlight.
const FALLBACK = { joints: [11, 12, 23, 24], segments: [[11, 23], [12, 24], [23, 24], [11, 12]] }

export function jointsForFinding(finding) {
  return BODY_REGION_JOINTS[finding?.bodyRegion] ?? FALLBACK
}

const SEVERITY_RANK = { critical: 3, important: 2, polish: 1 }
const DEFAULT_WINDOW_MS = 500

/**
 * The single most-severe FLAG finding whose instance is within `windowMs` of
 * `tsMs`, or null. Drives the ambient overlay highlight during playback.
 */
export function activeFindingAt(findings, tsMs, windowMs = DEFAULT_WINDOW_MS) {
  let best = null
  let bestRank = -1
  for (const f of findings ?? []) {
    if (f.kind === 'win') continue
    const near = (f.timestamps ?? []).some((t) => Math.abs(t - tsMs) <= windowMs)
    if (!near) continue
    const rank = SEVERITY_RANK[f.severity] ?? 0
    if (rank > bestRank) { bestRank = rank; best = f }
  }
  return best
}
