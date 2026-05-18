/**
 * Train-tab helpers: map ISO dates to plan sessions, classify day status,
 * compute the Monday-Sunday week containing a given date.
 *
 * Date math mirrors useHubData.planSessionForToday so Train and Hub agree on
 * which calendar day a session belongs to.
 */

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Resolve the session scheduled for `isoDate` within `plan`, or null if the
 * date is a rest day (no session that day) or the plan is missing data.
 *
 * The mapping: dayOffset = (isoDate - plan.start_date) in whole days; a
 * session at (week, day_in_week) is scheduled at offset
 *   (week - 1) * 7 + Math.round((day_in_week - 1) * (7 / days_per_week)).
 */
export function sessionForDay(plan, isoDate) {
  if (!plan?.plan_data?.sessions?.length || !plan.start_date || !isoDate) return null
  const start = new Date(plan.start_date + 'T00:00:00')
  const date  = new Date(isoDate + 'T00:00:00')
  if (Number.isNaN(date.getTime())) return null
  const dayOffset = Math.floor((date - start) / 86400000)
  if (dayOffset < 0) return null
  const dpw = plan.plan_data.days_per_week || 3
  for (const s of plan.plan_data.sessions) {
    const off = (s.week - 1) * 7 + Math.round((s.day_in_week - 1) * (7 / dpw))
    if (off === dayOffset) return s
  }
  return null
}

/**
 * Classify a date relative to today and the plan. Returns 'past' | 'today' |
 * 'future' | 'rest'. `today` parameter is overridable for testing; defaults to
 * the actual current ISO date.
 *
 * 'rest' wins over the calendar position when no session is scheduled — a
 * past day with no session reads as a past rest day, not as a stale "past
 * session" hero. The week-strip handles past-vs-future-rest dot styling
 * independently using its own isPast() check.
 */
export function dayStatusFor(isoDate, plan, today = todayIso()) {
  if (!isoDate) return 'rest'
  const hasSession = !!sessionForDay(plan, isoDate)
  if (isoDate === today) return hasSession ? 'today' : 'rest'
  if (!hasSession) return 'rest'
  return isoDate < today ? 'past' : 'future'
}

/**
 * Seven ISO date strings (Mon-Sun) for the week containing `isoDate`.
 */
export function currentWeekDates(isoDate) {
  const d = new Date(isoDate + 'T00:00:00')
  const dow = (d.getDay() + 6) % 7  // 0 = Monday
  d.setDate(d.getDate() - dow)
  const out = []
  for (let i = 0; i < 7; i++) {
    out.push(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() + 1)
  }
  return out
}
