import { describe, it, expect } from 'vitest'
import {
  baseGradeXP,
  calculateSendXP,
  xpForLevel,
  levelFromTotalXP,
} from '../xp.js'

describe('baseGradeXP', () => {
  it('returns the table value for V0', () => {
    expect(baseGradeXP('V0')).toBe(10)
  })
  it('returns the table value for V6', () => {
    expect(baseGradeXP('V6')).toBe(130)
  })
  it('returns the table value for V11 or higher', () => {
    expect(baseGradeXP('V11')).toBe(500)
    expect(baseGradeXP('V15')).toBe(500)
  })
  it('returns 0 for unknown grades', () => {
    expect(baseGradeXP('garbage')).toBe(0)
    expect(baseGradeXP('')).toBe(0)
    expect(baseGradeXP(null)).toBe(0)
  })
})

describe('calculateSendXP', () => {
  const climberStatShape = {
    power: 7, crimpy: 6, dynamic: 4, technical: 5, mobility: 3,
  }

  it('V6 indoor redpoint = 130', () => {
    const xp = calculateSendXP({
      grade: 'V6', modality: 'indoor', outcome: 'redpoint',
      isPersonalRecord: false, stylePrimary: 'crimpy', climberStatShape, isDeepLog: false,
      sessionPosition: 0,
    })
    expect(xp).toBe(130)
  })

  it('V6 outdoor flash = 130 * 1.5 * 2 = 390', () => {
    const xp = calculateSendXP({
      grade: 'V6', modality: 'outdoor', outcome: 'flash',
      isPersonalRecord: false, stylePrimary: 'crimpy', climberStatShape, isDeepLog: false,
      sessionPosition: 0,
    })
    expect(xp).toBe(390)
  })

  it('V6 system flash PR (weakness = mobility, climb is crimpy) = 130 * 1.25 * 2 * 1.5 = 487', () => {
    const xp = calculateSendXP({
      grade: 'V6', modality: 'system', outcome: 'flash',
      isPersonalRecord: true, stylePrimary: 'crimpy', climberStatShape, isDeepLog: false,
      sessionPosition: 0,
    })
    expect(xp).toBe(487)
  })

  it('gap multiplier x1.5 when style targets the weakest stat', () => {
    const xp = calculateSendXP({
      grade: 'V4', modality: 'indoor', outcome: 'redpoint',
      isPersonalRecord: false, stylePrimary: 'mobility', climberStatShape, isDeepLog: false,
      sessionPosition: 0,
    })
    expect(xp).toBe(120)
  })

  it('gap multiplier x1.2 when style targets the second-weakest stat', () => {
    const xp = calculateSendXP({
      grade: 'V4', modality: 'indoor', outcome: 'redpoint',
      isPersonalRecord: false, stylePrimary: 'dynamic', climberStatShape, isDeepLog: false,
      sessionPosition: 0,
    })
    expect(xp).toBe(96)
  })

  it('gap multiplier x1.0 when style targets a non-weakness', () => {
    const xp = calculateSendXP({
      grade: 'V4', modality: 'indoor', outcome: 'redpoint',
      isPersonalRecord: false, stylePrimary: 'powerful', climberStatShape, isDeepLog: false,
      sessionPosition: 0,
    })
    expect(xp).toBe(80)
  })

  it('deep log multiplier adds 25%', () => {
    const xp = calculateSendXP({
      grade: 'V4', modality: 'indoor', outcome: 'redpoint',
      isPersonalRecord: false, stylePrimary: 'powerful', climberStatShape, isDeepLog: true,
      sessionPosition: 0,
    })
    expect(xp).toBe(100)
  })

  it('project effort credit gives x0.10 for unsent projects', () => {
    const xp = calculateSendXP({
      grade: 'V6', modality: 'indoor', outcome: 'project',
      isPersonalRecord: false, stylePrimary: 'crimpy', climberStatShape, isDeepLog: false,
      sessionPosition: 0,
    })
    expect(xp).toBe(13)
  })

  it('chain bonus adds +5 per session position, capped at +30', () => {
    const baseInputs = {
      grade: 'V4', modality: 'indoor', outcome: 'redpoint',
      isPersonalRecord: false, stylePrimary: 'powerful', climberStatShape, isDeepLog: false,
    }
    expect(calculateSendXP({ ...baseInputs, sessionPosition: 0 })).toBe(80)
    expect(calculateSendXP({ ...baseInputs, sessionPosition: 3 })).toBe(95)
    expect(calculateSendXP({ ...baseInputs, sessionPosition: 10 })).toBe(110)
  })
})

describe('xpForLevel', () => {
  it('returns 100 for level 1 to 2', () => {
    expect(xpForLevel(1)).toBe(100)
  })
  it('returns ~273 for level 2 to 3', () => {
    expect(xpForLevel(2)).toBe(Math.floor(100 * Math.pow(2, 1.45)))
  })
  it('returns 0 for invalid levels', () => {
    expect(xpForLevel(0)).toBe(0)
    expect(xpForLevel(-1)).toBe(0)
  })
})

describe('levelFromTotalXP', () => {
  it('Level 1 at 0 XP', () => {
    expect(levelFromTotalXP(0)).toEqual({ level: 1, xpInLevel: 0, xpForNext: xpForLevel(1) })
  })
  it('Level 2 at 100 XP exactly', () => {
    expect(levelFromTotalXP(100)).toEqual({
      level: 2, xpInLevel: 0, xpForNext: xpForLevel(2),
    })
  })
  it('Level 1 at 50 XP', () => {
    expect(levelFromTotalXP(50)).toEqual({
      level: 1, xpInLevel: 50, xpForNext: xpForLevel(1),
    })
  })
})
