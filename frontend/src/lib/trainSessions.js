/**
 * Train-tab helpers: map ISO dates to plan sessions, classify day status,
 * compute the Monday-Sunday week containing a given date.
 *
 * Date math mirrors useHubData.planSessionForToday so Train and Hub agree on
 * which calendar day a session belongs to.
 */

// Lowercase day names mapped to JS Date.getDay() ordinals (0 = Sun, 1 = Mon, ...)
const WEEKDAY_INDEX = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

// Monday-start week-day index (0 = Mon, 6 = Sun) from a JS Date.getDay() value.
function monIndexFromGetDay(d) {
  return (d + 6) % 7
}

/**
 * Sort training_days into Mon-Sun order. Returns an array of monIndex values
 * (0=Mon..6=Sun) — one per training day. e.g.
 *   ['monday','wednesday','saturday'] → [0, 2, 5]
 */
function sortedTrainingDayIndices(trainingDays) {
  if (!Array.isArray(trainingDays) || trainingDays.length === 0) return null
  const seen = new Set()
  const idxs = []
  for (const name of trainingDays) {
    const sundayIdx = WEEKDAY_INDEX[String(name).toLowerCase()]
    if (sundayIdx == null) continue
    const monIdx = monIndexFromGetDay(sundayIdx)
    if (!seen.has(monIdx)) {
      seen.add(monIdx)
      idxs.push(monIdx)
    }
  }
  return idxs.length ? idxs.sort((a, b) => a - b) : null
}

/**
 * Resolve the session scheduled for `isoDate` within `plan`, or null if the
 * date is a rest day (no session that day) or the plan is missing data.
 *
 * Two scheduling models, in priority order:
 *
 *   1) Training-days picker (plan.plan_data.training_days present):
 *      Each session's `day_in_week` (1-based) maps to the i-th training day
 *      in Mon-Sun order. e.g. with ['monday','wednesday','saturday'],
 *      day_in_week=1 → Mon, day_in_week=2 → Wed, day_in_week=3 → Sat.
 *
 *   2) Legacy even-spread (no training_days): the original formula
 *      (s.week - 1) * 7 + Math.round((s.day_in_week - 1) * (7 / dpw))
 *      from useHubData.planSessionForToday.
 */
export function sessionForDay(plan, isoDate) {
  if (!plan?.plan_data?.sessions?.length || !plan.start_date || !isoDate) return null
  const start = new Date(plan.start_date + 'T00:00:00')
  const date  = new Date(isoDate + 'T00:00:00')
  if (Number.isNaN(date.getTime())) return null
  const dayOffset = Math.floor((date - start) / 86400000)
  if (dayOffset < 0) return null

  const trainingIdxs = sortedTrainingDayIndices(plan.plan_data.training_days)

  if (trainingIdxs) {
    // Picker model. The target weekday for a session is the i-th index in
    // sortedTrainingDayIndices (0-based). The week number of the date is
    // dayOffset / 7. We need to find a session whose (week, dayInWeek) maps
    // to this dayOffset.
    const weekOfDate = Math.floor(dayOffset / 7) + 1
    const dowMon = monIndexFromGetDay(date.getDay())
    const slot = trainingIdxs.indexOf(dowMon)
    if (slot < 0) return null  // date isn't a training day
    const targetDayInWeek = slot + 1
    for (const s of plan.plan_data.sessions) {
      if (s.week === weekOfDate && s.day_in_week === targetDayInWeek) return s
    }
    return null
  }

  // Legacy model
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
