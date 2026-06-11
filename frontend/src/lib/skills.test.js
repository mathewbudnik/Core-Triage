import { describe, it, expect } from 'vitest'
import { SKILLS, SKILL_KEYS, skillColor, skillLabel } from './skills'
describe('skills', () => {
  it('has the 5 canonical skills in order', () => {
    expect(SKILL_KEYS).toEqual(['power','crimp','dynamic','technique','mobility'])
  })
  it('maps each skill to its locked color', () => {
    expect(skillColor('power')).toBe('#b85c44')
    expect(skillColor('mobility')).toBe('#a06f8a')
  })
  it('is case-insensitive and falls back to ink for unknown', () => {
    expect(skillColor('POWER')).toBe('#b85c44')
    expect(skillColor('nope')).toBe('#2a2722')
  })
  it('labels are title-case', () => { expect(skillLabel('crimp')).toBe('Crimp') })
})
