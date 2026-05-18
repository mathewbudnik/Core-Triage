// Pure function: select which tool gets the featured slot based on user state.
// Mirrors the priority table in the spec exactly. Recomputed on mount and
// after any user state change; not run after manual tap-to-swap.
//
// Input shape (HubData):
//   {
//     lastTriage: { id, injury_area, created_at } | null,
//     activePlan: { id, plan_data, ... }            | null,
//     todaySession: PlanSession                     | null,
//     todayLogged: boolean,
//   }

// Regions for which a rehab plan exists in frontend/src/data/exercises.js.
// Keep this in sync with EXERCISES keys. If exercises.js gains a new region,
// add it here too.
export const REHAB_REGIONS = new Set([
  'Finger', 'Wrist', 'Elbow', 'Shoulder', 'Knee', 'Hip', 'Ankle',
  'Chest', 'Abs', 'Neck', 'Triceps', 'Lats', 'Glutes', 'Hamstrings',
  'Calves', 'Lower Back', 'Upper Back', 'General',
])

function daysSince(isoString) {
  if (!isoString) return Infinity
  const t = new Date(isoString).getTime()
  if (Number.isNaN(t)) return Infinity
  return Math.floor((Date.now() - t) / 86400000)
}

export function hasTriageWithin(data, days) {
  const t = data?.lastTriage
  if (!t) return false
  if (!REHAB_REGIONS.has(t.injury_area)) return false
  return daysSince(t.created_at) <= days
}

export function pickFeatured(data) {
  const recent = hasTriageWithin(data, 14)
  const older  = !recent && hasTriageWithin(data, 90)
  const hasPlan = !!data?.activePlan

  // Recover covers the merged triage+rehab surface. We feature Train only
  // when the user has an active plan AND no active triage — otherwise
  // Recover wins, because either there's a rehab plan in progress or the
  // user has no state at all and "screen something" is the primary CTA.
  if (recent) return 'recover'
  if (hasPlan) return 'train'
  if (older) return 'recover'
  return 'recover'
}
