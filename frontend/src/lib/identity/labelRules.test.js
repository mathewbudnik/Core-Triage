import { describe, it, expect } from 'vitest'
import { computeStyle, computePhase, composeLabel } from './labelRules'

describe('computeStyle', () => {
  it('returns "Crimpy" when CRMP > 7 and dominates by > 1', () => {
    expect(computeStyle({ power: 6, crimpy: 8.5, dynamic: 5, technical: 6, mobility: 5 }))
      .toBe('Crimpy')
  })

  it('returns "Technical" when TECH > 7 and dominates', () => {
    expect(computeStyle({ power: 5, crimpy: 5, dynamic: 5, technical: 8, mobility: 6 }))
      .toBe('Technical')
  })

  it('returns "Powerful" when POW > 7 and dominates', () => {
    expect(computeStyle({ power: 8.5, crimpy: 7, dynamic: 6, technical: 5, mobility: 5 }))
      .toBe('Powerful')
  })

  it('returns "Static" when DYN < 5 and CRMP > 6', () => {
    expect(computeStyle({ power: 5, crimpy: 7, dynamic: 4, technical: 5, mobility: 5 }))
      .toBe('Static')
  })

  it('returns "All-Round" when all axes within 1.5 range', () => {
    expect(computeStyle({ power: 6, crimpy: 7, dynamic: 6.5, technical: 7, mobility: 6.8 }))
      .toBe('All-Round')
  })

  it('returns null when no rule fires', () => {
    expect(computeStyle({ power: 6, crimpy: 6, dynamic: 6, technical: 7, mobility: 5 }))
      .toBe(null)
  })
})

describe('computePhase', () => {
  const overhang = { wallAngle: 'overhang' }
  const slab = { wallAngle: 'slab' }
  const vertical = { wallAngle: 'vertical' }

  it('returns "cave phase" when >= 4 of last 5 sends are overhang or roof', () => {
    const sends = [overhang, overhang, overhang, overhang, vertical]
    expect(computePhase(sends, new Date())).toBe('cave phase')
  })

  it('returns "slab phase" when >= 4 are slab or vertical', () => {
    const sends = [slab, vertical, slab, slab, overhang]
    expect(computePhase(sends, new Date())).toBe('slab phase')
  })

  it('returns "on rest" when no sends in 7+ days', () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 3600 * 1000)
    const sends = [{ ...overhang, sentAt: eightDaysAgo }]
    expect(computePhase(sends, new Date())).toBe('on rest')
  })

  it('returns "on a heater" when >= 3 V-grade first-time-sends in last 30 days', () => {
    const now = new Date()
    const sends = [
      { ...overhang, sentAt: now, isFirstAtGrade: true, grade: 'V7' },
      { ...overhang, sentAt: now, isFirstAtGrade: true, grade: 'V8' },
      { ...overhang, sentAt: now, isFirstAtGrade: true, grade: 'V6' },
      { ...overhang, sentAt: now, isFirstAtGrade: false, grade: 'V7' },
    ]
    expect(computePhase(sends, now)).toBe('on a heater')
  })

  it('returns "patience rewarded" when last send was a project after 5+ burns', () => {
    const now = new Date()
    const sends = [{ ...overhang, sentAt: now, burnsBeforeSend: 6 }]
    expect(computePhase(sends, now)).toBe('patience rewarded')
  })

  it('returns "promoted" when first send at a new grade in last 24h', () => {
    const recent = new Date(Date.now() - 12 * 3600 * 1000)
    const sends = [{ ...overhang, sentAt: recent, isFirstAtGrade: true, grade: 'V7', burnsBeforeSend: 1 }]
    expect(computePhase(sends, new Date())).toBe('promoted')
  })

  it('returns null when no rule fires', () => {
    const sends = [overhang, vertical, slab, overhang, overhang]
    expect(computePhase(sends, new Date())).toBe(null)
  })
})

describe('composeLabel', () => {
  it('combines all three parts', () => {
    expect(composeLabel({ style: 'Crimpy', archetype: 'Crimper', phase: 'cave phase' }))
      .toBe('Crimpy Crimper, in the cave phase')
  })

  it('omits style when null', () => {
    expect(composeLabel({ style: null, archetype: 'Crimper', phase: 'cave phase' }))
      .toBe('Crimper, in the cave phase')
  })

  it('omits phase when null', () => {
    expect(composeLabel({ style: 'Crimpy', archetype: 'Crimper', phase: null }))
      .toBe('Crimpy Crimper')
  })

  it('handles "on rest" / "on a heater" without "in the" prefix', () => {
    expect(composeLabel({ style: null, archetype: 'Crimper', phase: 'on rest' }))
      .toBe('Crimper, on rest')
    expect(composeLabel({ style: null, archetype: 'Dynamo', phase: 'on a heater' }))
      .toBe('Dynamo, on a heater')
  })
})
