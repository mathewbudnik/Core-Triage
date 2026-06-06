const DAY_MS = 24 * 3600 * 1000

/**
 * Compute style descriptor from pentagon axes.
 * Returns null when no style dominates.
 */
export function computeStyle(axes) {
  const { power, crimpy, dynamic, technical, mobility } = axes

  // All-Round: all axes within 1.5 range
  const values = [power, crimpy, dynamic, technical, mobility]
  const max = Math.max(...values)
  const min = Math.min(...values)
  if (max - min <= 1.5) return 'All-Round'

  // Static: DYN < 5, CRMP > 6 (low-dynamic, holds-focused)
  if (dynamic < 5 && crimpy > 6) return 'Static'

  // Single-axis dominance: axis > 7 and beats next-highest by > 1
  const named = {
    power: 'Powerful',
    crimpy: 'Crimpy',
    dynamic: 'Dynamic',
    technical: 'Technical',
    mobility: 'Mobile',
  }
  for (const k of Object.keys(named)) {
    if (axes[k] > 7) {
      const others = Object.keys(named)
        .filter((o) => o !== k)
        .map((o) => axes[o])
      if (axes[k] - Math.max(...others) > 1) return named[k]
    }
  }

  return null
}

/**
 * Compute phase qualifier from recent sends.
 * @param {Array} sends - last 5 sends, each with { wallAngle, sentAt, isFirstAtGrade, grade, burnsBeforeSend }
 * @param {Date} now - reference time (injectable for tests)
 * @returns {string|null} phase string or null
 */
export function computePhase(sends, now) {
  if (!sends || sends.length === 0) return null

  // "on rest" — no sends in 7+ days
  const lastSendAt = sends
    .map((s) => s.sentAt && new Date(s.sentAt).getTime())
    .filter(Boolean)
    .reduce((a, b) => Math.max(a, b), 0)
  if (lastSendAt && now.getTime() - lastSendAt > 7 * DAY_MS) return 'on rest'

  // "patience rewarded" — last send was a project after 5+ burns
  const mostRecent = sends.find((s) => s.sentAt)
  if (mostRecent && mostRecent.burnsBeforeSend >= 5) return 'patience rewarded'

  // "on a heater" — 3+ V-grade promotions in last 30 days
  const thirtyDaysAgo = now.getTime() - 30 * DAY_MS
  const promotions = sends.filter(
    (s) => s.isFirstAtGrade && s.sentAt && new Date(s.sentAt).getTime() > thirtyDaysAgo
  ).length
  if (promotions >= 3) return 'on a heater'

  // "promoted" — first send at a new grade in last 24h
  const recent = sends.find(
    (s) => s.isFirstAtGrade && s.sentAt && now.getTime() - new Date(s.sentAt).getTime() < DAY_MS
  )
  if (recent) return 'promoted'

  // "cave phase" / "slab phase" — last 5 sends' wall angles
  const overhangCount = sends.filter((s) => s.wallAngle === 'overhang' || s.wallAngle === 'roof').length
  const slabCount = sends.filter((s) => s.wallAngle === 'slab' || s.wallAngle === 'vertical').length
  if (overhangCount >= 4) return 'cave phase'
  if (slabCount >= 4) return 'slab phase'

  return null
}

/**
 * Compose the three parts into one phrase.
 * Phases starting with "on " or "patience " or "promoted" don't get "in the" prefix.
 */
export function composeLabel({ style, archetype, phase }) {
  const parts = []
  if (style) parts.push(`${style} ${archetype}`)
  else parts.push(archetype)

  if (phase) {
    const noPrefix = ['on rest', 'on a heater', 'patience rewarded', 'promoted', 'grinding']
    const phraseTail = noPrefix.includes(phase) ? phase : `in the ${phase}`
    return `${parts.join('')}, ${phraseTail}`
  }
  return parts.join('')
}
