/**
 * Daily quest pool + generation + progress evaluation for the RPG climber engine.
 * See spec §9.
 */

import { AXES } from './stats.js'

// Stable, deterministic PRNG (mulberry32) so test seeds reproduce.
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6D2B79F5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const QUEST_TYPES = [
  {
    id:    'stat-gap-mobility',
    title: 'Find something slabby',
    why:   'Work the feet.',
    xp:    50,
    target: 2,
    bucket: 'stat-gap',
    targetsAxis: 'mobility',
  },
  {
    id:    'stat-gap-crimpy',
    title: 'Send 3 on crimps',
    why:   'Patience over power.',
    xp:    75,
    target: 3,
    bucket: 'stat-gap',
    targetsAxis: 'crimpy',
  },
  {
    id:    'stat-gap-dynamic',
    title: 'Project a throw',
    why:   "Commit. Don't decelerate.",
    xp:    75,
    target: 1,
    bucket: 'stat-gap',
    targetsAxis: 'dynamic',
  },
  {
    id:    'stat-gap-technical',
    title: 'Find a balance line',
    why:   'Slow. Quiet feet.',
    xp:    70,
    target: 2,
    bucket: 'stat-gap',
    targetsAxis: 'technical',
  },
  {
    id:    'stat-gap-power',
    title: 'Try an overhang',
    why:   'Tension. Not just pulling.',
    xp:    75,
    target: 2,
    bucket: 'stat-gap',
    targetsAxis: 'power',
  },
  {
    id:    'volume',
    title: 'Log 5 sends today',
    why:   'Mileage. No project.',
    xp:    40,
    target: 5,
    bucket: 'volume',
  },
  {
    id:    'variety',
    title: 'Send in 3 different styles',
    why:   'Mix it up.',
    xp:    60,
    target: 3,
    bucket: 'variety',
  },
  {
    id:    'training-mobility',
    title: 'Log 20 min of mobility',
    why:   "Hips need it. You've been skipping.",
    xp:    50,
    target: 1,
    bucket: 'training',
  },
  {
    id:    'push',
    title: 'Send something a grade up',
    why:   'Push the ceiling.',
    xp:    80,
    target: 1,
    bucket: 'push',
  },
  {
    id:    'outdoor',
    title: 'Log an outdoor session',
    why:   'Rock beats plastic. Even one.',
    xp:    120,
    target: 1,
    bucket: 'outdoor',
  },
]

/**
 * Generate today's daily quest. Picks based on a 60/30/10 distribution:
 *  - 60% stat-gap (using climber's weakest axis)
 *  - 30% mix of variety / push / training conditional triggers
 *  - 10% volume fallback
 */
export function generateDailyQuest({
  statShape,
  lastTrainingType,
  lastTrainingDaysAgo,
  hasOutdoorIn30d,
  averageSendGrade,
  recentSendsAtGrade,
  seed = Date.now(),
} = {}) {
  const rng = mulberry32(seed)
  const roll = rng()

  // 60% — pick a stat-gap quest for the weakest axis with value <= 4
  if (roll < 0.60 && statShape) {
    const sorted = AXES
      .map((axis) => [axis, statShape[axis] ?? 5])
      .sort((a, b) => a[1] - b[1])
    const [weakestAxis, weakestValue] = sorted[0]
    if (weakestValue <= 4) {
      const matched = QUEST_TYPES.find(
        (q) => q.bucket === 'stat-gap' && q.targetsAxis === weakestAxis,
      )
      if (matched) return matched
    }
  }

  // 30% — conditional triggers
  if (roll < 0.90) {
    if (lastTrainingType !== 'mobility' && (lastTrainingDaysAgo ?? 99) >= 7) {
      return QUEST_TYPES.find((q) => q.id === 'training-mobility')
    }
    if (!hasOutdoorIn30d) {
      return QUEST_TYPES.find((q) => q.id === 'outdoor')
    }
    if (recentSendsAtGrade) {
      return QUEST_TYPES.find((q) => q.id === 'push')
    }
    return QUEST_TYPES.find((q) => q.id === 'variety')
  }

  // 10% fallback — volume
  return QUEST_TYPES.find((q) => q.id === 'volume')
}

export function evaluateQuestProgress({ current, target }) {
  if (!Number.isFinite(target) || target <= 0) return { pct: 0, done: false }
  const pct = Math.min(1, current / target)
  return { pct, done: current >= target }
}
