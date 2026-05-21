import { describe, it, expect } from 'vitest'
import { bucketSendsByDay, lastNDays } from './sendBuckets.js'

const day = (iso, hour = 12) => new Date(`${iso}T${String(hour).padStart(2,'0')}:00:00`).getTime()

describe('lastNDays', () => {
  it('returns N consecutive ISO date strings ending at today', () => {
    const today = new Date('2026-05-20T12:00:00')
    const days = lastNDays(7, today)
    expect(days).toHaveLength(7)
    expect(days[6]).toBe('2026-05-20')
    expect(days[0]).toBe('2026-05-14')
  })
})

describe('bucketSendsByDay', () => {
  it('returns N buckets even when there are no sends', () => {
    const today = new Date('2026-05-20T12:00:00')
    const buckets = bucketSendsByDay([], 7, today)
    expect(buckets).toHaveLength(7)
    expect(buckets.every(b => b.totalXP === 0 && b.sends.length === 0)).toBe(true)
  })

  it('groups sends by their local-day timestamp', () => {
    const today = new Date('2026-05-20T12:00:00')
    const sends = [
      { ts: day('2026-05-20', 9),  stylePrimary: 'powerful', xpEarned: 100 },
      { ts: day('2026-05-20', 15), stylePrimary: 'crimpy',   xpEarned: 50 },
      { ts: day('2026-05-18', 18), stylePrimary: 'powerful', xpEarned: 200 },
    ]
    const buckets = bucketSendsByDay(sends, 7, today)
    const may20 = buckets.find(b => b.date === '2026-05-20')
    const may18 = buckets.find(b => b.date === '2026-05-18')
    expect(may20.totalXP).toBe(150)
    expect(may20.sends).toHaveLength(2)
    expect(may18.totalXP).toBe(200)
  })

  it('tags each bucket with its dominant style axis (most XP earned)', () => {
    const today = new Date('2026-05-20T12:00:00')
    const sends = [
      { ts: day('2026-05-20'), stylePrimary: 'powerful', xpEarned: 50 },
      { ts: day('2026-05-20'), stylePrimary: 'crimpy',   xpEarned: 200 },
      { ts: day('2026-05-20'), stylePrimary: 'mobility', xpEarned: 30 },
    ]
    const buckets = bucketSendsByDay(sends, 7, today)
    const may20 = buckets.find(b => b.date === '2026-05-20')
    expect(may20.dominantStyle).toBe('crimpy')
  })

  it('drops sends older than the window', () => {
    const today = new Date('2026-05-20T12:00:00')
    const sends = [
      { ts: day('2026-05-10'), stylePrimary: 'powerful', xpEarned: 999 },
      { ts: day('2026-05-19'), stylePrimary: 'powerful', xpEarned: 50 },
    ]
    const buckets = bucketSendsByDay(sends, 7, today)
    const totalInWindow = buckets.reduce((s, b) => s + b.totalXP, 0)
    expect(totalInWindow).toBe(50)
  })
})
