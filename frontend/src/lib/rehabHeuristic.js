// Pure helper: given the most recent triage's created_at ISO string, return a
// phase/day estimate. The app has no real rehab progress tracking yet; this
// is a days-since-triage proxy. See spec section "Rehab heuristic".
//
//   Phase 1: days 0-13   (length 14)
//   Phase 2: days 14-41  (length 28)
//   Phase 3: days 42+    (length 28, ongoing)

export function rehabProgress(triageCreatedAt) {
  if (!triageCreatedAt) return null
  const then = new Date(triageCreatedAt)
  if (Number.isNaN(then.getTime())) return null
  const days = Math.floor((Date.now() - then.getTime()) / 86400000)

  let phase, dayInPhase, phaseLength
  if (days < 14) {
    phase = 1; dayInPhase = days; phaseLength = 14
  } else if (days < 42) {
    phase = 2; dayInPhase = days - 14; phaseLength = 28
  } else {
    phase = 3; dayInPhase = days - 42; phaseLength = 28
  }

  // Display values are 1-indexed for human readability ("Day 1" not "Day 0")
  return {
    phase,
    dayInPhase: dayInPhase + 1,
    phaseLength,
    days,
    progress: Math.min(1, Math.max(0, (dayInPhase + 1) / phaseLength)),
  }
}
