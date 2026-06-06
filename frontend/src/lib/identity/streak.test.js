import { describe, it, expect } from 'vitest'
import { computeStreak } from './streak'

function daysAgo(n) {
  const d = new Date()
  d.setUTCHours(12, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString()
}

describe('computeStreak', () => {
  it('returns 0 when no entries', () => {
    expect(computeStreak([], new Date())).toBe(0)
  })

  it('returns 1 when only today has activity', () => {
    expect(computeStreak([{ loggedAt: daysAgo(0) }], new Date())).toBe(1)
  })

  it('counts back consecutive days', () => {
    const logs = [{ loggedAt: daysAgo(0) }, { loggedAt: daysAgo(1) }, { loggedAt: daysAgo(2) }]
    expect(computeStreak(logs, new Date())).toBe(3)
  })

  it('breaks streak on a missed day', () => {
    const logs = [{ loggedAt: daysAgo(0) }, { loggedAt: daysAgo(1) }, { loggedAt: daysAgo(3) }]
    expect(computeStreak(logs, new Date())).toBe(2)
  })

  it('counts back from yesterday when today is empty (grace day)', () => {
    const logs = [{ loggedAt: daysAgo(1) }, { loggedAt: daysAgo(2) }]
    expect(computeStreak(logs, new Date())).toBe(2)
  })

  it('returns 0 if last entry is older than 1 day', () => {
    expect(computeStreak([{ loggedAt: daysAgo(3) }], new Date())).toBe(0)
  })
})
