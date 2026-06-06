import { describe, it, expect } from 'vitest'
import { computeArchetype } from './archetype'

const balanced = { power: 5, crimpy: 5, dynamic: 5, technical: 5, mobility: 5 }

describe('computeArchetype', () => {
  it('returns Apprentice when all axes are below 5', () => {
    expect(computeArchetype({ power: 4, crimpy: 4, dynamic: 4, technical: 4, mobility: 4 }))
      .toBe('Apprentice')
  })

  it('returns Crimper when POW+CRMP+TECH high and MOB low', () => {
    expect(computeArchetype({ power: 7.5, crimpy: 8.5, dynamic: 6, technical: 7.5, mobility: 4 }))
      .toBe('Crimper')
  })

  it('returns Dynamo when POW > 7 and DYN > 7', () => {
    expect(computeArchetype({ ...balanced, power: 8, dynamic: 8 }))
      .toBe('Dynamo')
  })

  it('returns Slabber when TECH > 8 and MOB > 6 and POW < 6', () => {
    expect(computeArchetype({ power: 5, crimpy: 6, dynamic: 5, technical: 8.5, mobility: 7 }))
      .toBe('Slabber')
  })

  it('returns Spider when CRMP > 8 and MOB > 6 and DYN < 5', () => {
    expect(computeArchetype({ power: 5, crimpy: 8.5, dynamic: 4, technical: 5, mobility: 7 }))
      .toBe('Spider')
  })

  it('returns Acrobat when DYN > 7 and MOB > 7 and CRMP < 5', () => {
    expect(computeArchetype({ power: 5, crimpy: 4, dynamic: 8, technical: 5, mobility: 8 }))
      .toBe('Acrobat')
  })

  it('returns Brute when CRMP > 7 and DYN > 7 and TECH < 5', () => {
    expect(computeArchetype({ power: 6, crimpy: 8, dynamic: 8, technical: 4, mobility: 5 }))
      .toBe('Brute')
  })

  it('returns All-Rounder when all axes within ±1.5 of each other', () => {
    expect(computeArchetype({ power: 6.5, crimpy: 7, dynamic: 6, technical: 7.5, mobility: 6.8 }))
      .toBe('All-Rounder')
  })
})
