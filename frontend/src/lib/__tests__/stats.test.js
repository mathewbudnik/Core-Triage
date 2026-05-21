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

describe('deriveStatShape (max V-grade per style)', () => {
  it('empty log returns all nulls', () => {
    const shape = deriveStatShape([])
    AXES.forEach((axis) => expect(shape[axis]).toBeNull())
  })

  it('one V6 crimpy send sets crimpy to 6, others null', () => {
    const shape = deriveStatShape([
      { stylePrimary: 'crimpy', gradeNum: 6 },
    ])
    expect(shape.crimpy).toBe(6)
    expect(shape.power).toBeNull()
    expect(shape.dynamic).toBeNull()
    expect(shape.technical).toBeNull()
    expect(shape.mobility).toBeNull()
  })

  it('multiple sends in one style keep the max', () => {
    const shape = deriveStatShape([
      { stylePrimary: 'crimpy', gradeNum: 3 },
      { stylePrimary: 'crimpy', gradeNum: 6 },
      { stylePrimary: 'crimpy', gradeNum: 4 },
    ])
    expect(shape.crimpy).toBe(6)
  })

  it('different styles are tracked independently', () => {
    const shape = deriveStatShape([
      { stylePrimary: 'powerful', gradeNum: 7 },
      { stylePrimary: 'mobility', gradeNum: 3 },
    ])
    expect(shape.power).toBe(7)
    expect(shape.mobility).toBe(3)
    expect(shape.crimpy).toBeNull()
  })

  it('"powerful" chip maps to "power" axis', () => {
    const shape = deriveStatShape([
      { stylePrimary: 'powerful', gradeNum: 5 },
    ])
    expect(shape.power).toBe(5)
  })

  it('ignores sends with missing fields', () => {
    const shape = deriveStatShape([
      { stylePrimary: 'crimpy', gradeNum: 6 },
      { stylePrimary: 'crimpy' },
      { gradeNum: 8 },
      null,
      undefined,
    ])
    expect(shape.crimpy).toBe(6)
  })

  it('V10+ caps at 10', () => {
    const shape = deriveStatShape([
      { stylePrimary: 'powerful', gradeNum: 15 },
    ])
    expect(shape.power).toBe(10)
  })

  it('returns all five axes even when only some have data', () => {
    const shape = deriveStatShape([
      { stylePrimary: 'crimpy', gradeNum: 6 },
    ])
    AXES.forEach((axis) => expect(shape).toHaveProperty(axis))
  })
})
