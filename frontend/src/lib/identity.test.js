import { describe, it, expect } from 'vitest'
import { identityPhrase } from './identity'

describe('identityPhrase', () => {
  it('pairs the two strongest axes in plain words', () => {
    // power 9 strongest, crimp 7 close second → "Powerful & crimp-strong"
    const { title } = identityPhrase({ power: 9, crimp: 7, dynamic: 6, technique: 3, mobility: 4 })
    expect(title).toBe('Powerful & crimp-strong')
  })

  it('names the weakest axis as the gap sentence', () => {
    const { gap } = identityPhrase({ power: 9, crimp: 7, dynamic: 6, technique: 3, mobility: 4 })
    expect(gap).toBe('Technique is your gap')
  })

  it('accepts legacy crimpy / technical keys from /api/me/state', () => {
    const { title, gap } = identityPhrase({ power: 9, crimpy: 7, dynamic: 6, technical: 3, mobility: 4 })
    expect(title).toBe('Powerful & crimp-strong')
    expect(gap).toBe('Technique is your gap')
  })

  it('uses a single strength when the second axis is far behind', () => {
    const { title } = identityPhrase({ power: 9, crimp: 4, dynamic: 4, technique: 4, mobility: 4 })
    expect(title).toBe('Powerful')
  })

  it('maps every axis to the right adjective when it is the lead strength', () => {
    expect(identityPhrase({ dynamic: 9, power: 4, crimp: 4, technique: 4, mobility: 4 }).title).toBe('Explosive')
    expect(identityPhrase({ technique: 9, power: 4, crimp: 4, dynamic: 4, mobility: 4 }).title).toBe('Technical')
    expect(identityPhrase({ mobility: 9, power: 4, crimp: 4, dynamic: 4, technique: 4 }).title).toBe('Mobile')
  })

  it('handles the empty / no-data case', () => {
    expect(identityPhrase(null)).toEqual({ title: 'New climber, log a few sends', gap: null })
    expect(identityPhrase({})).toEqual({ title: 'New climber, log a few sends', gap: null })
    expect(identityPhrase({ power: 0, crimp: 0, dynamic: 0, technique: 0, mobility: 0 }))
      .toEqual({ title: 'New climber, log a few sends', gap: null })
  })

  it('returns no gap when all present axes are equal', () => {
    const { gap } = identityPhrase({ power: 6, crimp: 6, dynamic: 6, technique: 6, mobility: 6 })
    expect(gap).toBeNull()
  })
})
