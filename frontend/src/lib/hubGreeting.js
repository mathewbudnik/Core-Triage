/**
 * Pure function: choose a greeting variant based on the user's recent
 * activity. Inputs are derived from useHubData + a couple of cheap
 * date checks. Returns a single line of text (the value of the 28pt
 * title in HubGreeting).
 */

/**
 * @param state {
 *   streakDays:        number,
 *   lastLogIso:        string|null,    // YYYY-MM-DD of most recent log
 *   lastPrIso:         string|null,    // YYYY-MM-DD of most recent PR
 *   todayIso:          string,         // YYYY-MM-DD of today
 *   isFirstLogOfWeek:  boolean,        // last log was in a prior week
 *   isPlanRestDay:     boolean,
 * }
 * @returns string
 */
export function greetingFor(state) {
  const today = new Date(state.todayIso + 'T00:00:00').getTime()
  const yesterday = today - 86400000

  const wasYesterday = (iso) => {
    if (!iso) return false
    return new Date(iso + 'T00:00:00').getTime() === yesterday
  }
  const isToday = (iso) => iso === state.todayIso

  if (state.isFirstLogOfWeek) return 'New week, fresh starts.'
  if (wasYesterday(state.lastLogIso) && wasYesterday(state.lastPrIso)) {
    return 'Yesterday was a breakthrough.'
  }
  if (isToday(state.lastLogIso)) return 'Logged. Let it sink in.'
  if (state.streakDays >= 10)    return `${state.streakDays} days in. You're showing up.`
  if (state.streakDays >= 3)     return `Day ${state.streakDays} of a strong week.`
  if (state.isPlanRestDay)       return 'Recovery is training too.'
  if (state.lastLogIso) {
    const last = new Date(state.lastLogIso + 'T00:00:00').getTime()
    const daysAgo = Math.round((today - last) / 86400000)
    if (daysAgo >= 7) return 'Ready when you are.'
  }
  return 'Welcome back.'
}
