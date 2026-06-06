// frontend/src/lib/identity/streak.js

const DAY_MS = 24 * 3600 * 1000

/**
 * Compute current streak (consecutive calendar days with activity).
 * Grace day: if today has no entry but yesterday does, the streak is still alive.
 * @param {Array<{ loggedAt: string }>} entries - all log entries
 * @param {Date} now - reference time (injectable for tests)
 * @returns {number} streak in days
 */
export function computeStreak(entries, now) {
  if (!entries || entries.length === 0) return 0

  // Bucket entries by UTC date
  const days = new Set(
    entries
      .map((e) => e.loggedAt && new Date(e.loggedAt).toISOString().slice(0, 10))
      .filter(Boolean)
  )

  const today = new Date(now).toISOString().slice(0, 10)
  const yesterday = new Date(now.getTime() - DAY_MS).toISOString().slice(0, 10)

  let cursor
  if (days.has(today)) cursor = new Date(now)
  else if (days.has(yesterday)) cursor = new Date(now.getTime() - DAY_MS)
  else return 0

  let streak = 0
  while (true) {
    const key = cursor.toISOString().slice(0, 10)
    if (days.has(key)) {
      streak++
      cursor = new Date(cursor.getTime() - DAY_MS)
    } else break
  }
  return streak
}
