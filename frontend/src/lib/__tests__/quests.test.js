import { describe, it, expect } from 'vitest'
import {
  QUEST_TYPES,
  generateDailyQuest,
  evaluateQuestProgress,
} from '../quests.js'

describe('QUEST_TYPES', () => {
  it('includes the seven quest types from the spec', () => {
    expect(QUEST_TYPES.length).toBeGreaterThanOrEqual(7)
    const types = QUEST_TYPES.map((q) => q.id)
    expect(types).toEqual(expect.arrayContaining([
      'stat-gap-mobility', 'stat-gap-crimpy',
      'volume', 'variety', 'training-mobility', 'push', 'outdoor',
    ]))
  })
})

describe('generateDailyQuest', () => {
  const balancedShape = { power: 5, crimpy: 5, dynamic: 5, technical: 5, mobility: 5 }
  const mobilityWeakShape = { power: 7, crimpy: 6, dynamic: 4, technical: 5, mobility: 3 }

  it('returns a quest object with required fields', () => {
    const quest = generateDailyQuest({
      statShape: balancedShape,
      lastTrainingType: 'climbing',
      lastTrainingDaysAgo: 1,
      hasOutdoorIn30d: true,
      averageSendGrade: 'V4',
      recentSendsAtGrade: true,
      seed: 42,
    })
    expect(quest).toMatchObject({
      id: expect.any(String),
      title: expect.any(String),
      xp: expect.any(Number),
      target: expect.any(Number),
    })
  })

  it('prefers a stat-gap quest when a stat is weak (<=3)', () => {
    let stats = 0
    for (let seed = 1; seed <= 100; seed++) {
      const q = generateDailyQuest({
        statShape: mobilityWeakShape,
        lastTrainingType: 'climbing', lastTrainingDaysAgo: 1,
        hasOutdoorIn30d: true, averageSendGrade: 'V4',
        recentSendsAtGrade: true, seed,
      })
      if (q.id.startsWith('stat-gap-')) stats++
    }
    expect(stats).toBeGreaterThan(40)
  })

  it('returns training-mobility when no mobility training in 7+ days', () => {
    const candidates = []
    for (let seed = 1; seed <= 200; seed++) {
      const q = generateDailyQuest({
        statShape: balancedShape,
        lastTrainingType: 'climbing', lastTrainingDaysAgo: 10,
        hasOutdoorIn30d: true, averageSendGrade: 'V4',
        recentSendsAtGrade: true, seed,
      })
      candidates.push(q.id)
    }
    expect(candidates).toContain('training-mobility')
  })
})

describe('evaluateQuestProgress', () => {
  it('returns done=false when current < target', () => {
    expect(evaluateQuestProgress({ current: 1, target: 3 })).toEqual({ pct: 1/3, done: false })
  })
  it('returns done=true when current >= target', () => {
    expect(evaluateQuestProgress({ current: 3, target: 3 })).toEqual({ pct: 1, done: true })
    expect(evaluateQuestProgress({ current: 5, target: 3 })).toEqual({ pct: 1, done: true })
  })
  it('handles zero target gracefully', () => {
    expect(evaluateQuestProgress({ current: 0, target: 0 })).toEqual({ pct: 0, done: false })
  })
})
