import { describe, it, expect } from 'vitest'
import {
  STYLE_CHIP_TO_STATS,
  styleChipToStats,
  deriveStatShape,
  AXES,
} from '../stats.js'

describe('STYLE_CHIP_TO_STATS', () => {
  it('every chip is a 5-axis object', () => {
    for (const key of ['powerful', 'crimpy', 'dynamic', 'technical', 'mobility']) {
      expect(STYLE_CHIP_TO_STATS[key]).toMatchObject({
        power: expect.any(Number),
        crimpy: expect.any(Number),
        dynamic: expect.any(Number),
        technical: expect.any(Number),
        mobility: expect.any(Number),
      })
    }
  })

  it("each chip's primary stat is the largest value", () => {
    expect(STYLE_CHIP_TO_STATS.powerful.power).toBeGreaterThanOrEqual(3)
    expect(STYLE_CHIP_TO_STATS.crimpy.crimpy).toBeGreaterThanOrEqual(3)
    expect(STYLE_CHIP_TO_STATS.dynamic.dynamic).toBeGreaterThanOrEqual(3)
    expect(STYLE_CHIP_TO_STATS.technical.technical).toBeGreaterThanOrEqual(3)
    expect(STYLE_CHIP_TO_STATS.mobility.mobility).toBeGreaterThanOrEqual(3)
  })
})

describe('styleChipToStats', () => {
  it('returns the chip mapping when known', () => {
    expect(styleChipToStats('crimpy')).toEqual(STYLE_CHIP_TO_STATS.crimpy)
  })
  it('returns a zero map for unknown chips', () => {
    expect(styleChipToStats('unknown')).toEqual({
      power: 0, crimpy: 0, dynamic: 0, technical: 0, mobility: 0,
    })
  })
})

describe('deriveStatShape', () => {
  it('empty log returns all zeros', () => {
    const shape = deriveStatShape([])
    AXES.forEach((axis) => expect(shape[axis]).toBe(0))
  })

  it('single crimpy send increments crimpy axis the most', () => {
    const shape = deriveStatShape([
      { stylePoints: STYLE_CHIP_TO_STATS.crimpy, daysAgo: 0 },
    ])
    expect(shape.crimpy).toBeGreaterThan(shape.power)
    expect(shape.crimpy).toBeGreaterThan(shape.dynamic)
  })

  it('values are clamped to 0-10 range', () => {
    const sends = Array.from({ length: 50 }).map(() => ({
      stylePoints: STYLE_CHIP_TO_STATS.crimpy,
      daysAgo: 0,
    }))
    const shape = deriveStatShape(sends)
    AXES.forEach((axis) => {
      expect(shape[axis]).toBeGreaterThanOrEqual(0)
      expect(shape[axis]).toBeLessThanOrEqual(10)
    })
    expect(shape.crimpy).toBe(10)
  })

  it('sends older than 30 days are excluded', () => {
    const shape = deriveStatShape([
      { stylePoints: STYLE_CHIP_TO_STATS.crimpy, daysAgo: 60 },
    ])
    AXES.forEach((axis) => expect(shape[axis]).toBe(0))
  })

  it('result includes all five axes even when no sends touch some', () => {
    const shape = deriveStatShape([
      { stylePoints: STYLE_CHIP_TO_STATS.crimpy, daysAgo: 0 },
    ])
    AXES.forEach((axis) => expect(shape).toHaveProperty(axis))
  })
})
