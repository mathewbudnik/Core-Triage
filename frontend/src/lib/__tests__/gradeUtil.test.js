import { describe, it, expect } from 'vitest'
import { gradeStringToNum, formatGrade } from '../gradeUtil.js'

describe('gradeStringToNum', () => {
  it('parses V-grades', () => {
    expect(gradeStringToNum('V0')).toBe(0)
    expect(gradeStringToNum('V6')).toBe(6)
    expect(gradeStringToNum('V10')).toBe(10)
    expect(gradeStringToNum('V15')).toBe(15)
  })

  it('returns null for non-V-grades', () => {
    expect(gradeStringToNum('5.12')).toBeNull()
    expect(gradeStringToNum('garbage')).toBeNull()
    expect(gradeStringToNum('')).toBeNull()
    expect(gradeStringToNum(null)).toBeNull()
    expect(gradeStringToNum(undefined)).toBeNull()
    expect(gradeStringToNum(6)).toBeNull()
  })

  it('handles lowercase', () => {
    expect(gradeStringToNum('v6')).toBe(6)
  })
})

describe('formatGrade', () => {
  it('formats integers as V-grades', () => {
    expect(formatGrade(0)).toBe('V0')
    expect(formatGrade(6)).toBe('V6')
    expect(formatGrade(10)).toBe('V10')
  })

  it('caps display at V10+', () => {
    expect(formatGrade(11)).toBe('V10+')
    expect(formatGrade(15)).toBe('V10+')
  })

  it('returns "—" for null / undefined / invalid', () => {
    expect(formatGrade(null)).toBe('—')
    expect(formatGrade(undefined)).toBe('—')
    expect(formatGrade(NaN)).toBe('—')
  })

  it('handles 0 as V0 (not "—")', () => {
    expect(formatGrade(0)).toBe('V0')
  })
})
