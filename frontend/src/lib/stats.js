/**
 * Stat system for the RPG climber reward engine.
 * See spec §7.3 and §8.
 */

export const AXES = ['power', 'crimpy', 'dynamic', 'technical', 'mobility']

/**
 * Style chip → 5-axis stat increment per send.
 * Each chip's primary stat scores 3, with smaller contributions on adjacent axes.
 */
export const STYLE_CHIP_TO_STATS = {
  powerful:  { power: 3, crimpy: 1, dynamic: 1, technical: 0, mobility: 0 },
  crimpy:    { power: 1, crimpy: 3, dynamic: 0, technical: 1, mobility: 0 },
  dynamic:   { power: 1, crimpy: 0, dynamic: 3, technical: 1, mobility: 1 },
  technical: { power: 0, crimpy: 1, dynamic: 1, technical: 3, mobility: 1 },
  mobility:  { power: 0, crimpy: 0, dynamic: 1, technical: 1, mobility: 3 },
}

const ZERO_SHAPE = Object.freeze({
  power: 0, crimpy: 0, dynamic: 0, technical: 0, mobility: 0,
})

export function styleChipToStats(chipKey) {
  return STYLE_CHIP_TO_STATS[chipKey] ?? { ...ZERO_SHAPE }
}

const WINDOW_DAYS = 30
const SCALE_FACTOR = 10

/**
 * Compute the climber's current 5-axis stat shape.
 *
 * @param {Array} sends — array of { stylePoints: {power, crimpy, ...}, daysAgo: number }
 * @returns {object} { power, crimpy, dynamic, technical, mobility } each in 0..10
 */
export function deriveStatShape(sends) {
  if (!Array.isArray(sends) || sends.length === 0) return { ...ZERO_SHAPE }
  const totals = { ...ZERO_SHAPE }
  for (const send of sends) {
    if (!send || !send.stylePoints) continue
    if (send.daysAgo > WINDOW_DAYS) continue
    for (const axis of AXES) {
      totals[axis] += send.stylePoints[axis] ?? 0
    }
  }
  const meanPerDay = {}
  for (const axis of AXES) {
    meanPerDay[axis] = totals[axis] / WINDOW_DAYS
  }
  const shape = {}
  for (const axis of AXES) {
    shape[axis] = Math.max(0, Math.min(10, Math.round(meanPerDay[axis] * SCALE_FACTOR)))
  }
  return shape
}
