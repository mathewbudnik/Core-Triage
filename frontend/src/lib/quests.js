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
    title: 'Try a slab problem',
    why:   "Slabs are quick wins for Mobility.",
    xp:    50,
    target: 2,
    bucket: 'stat-gap',
    targetsAxis: 'mobility',
  },
  {
    id:    'stat-gap-crimpy',
    title: 'Send 3 problems on crimps',
    why:   "Crimps build finger strength.",
    xp:    75,
    target: 3,
    bucket: 'stat-gap',
    targetsAxis: 'crimpy',
  },
  {
    id:    'stat-gap-dynamic',
    title: 'Project a dyno or paddle move',
    why:   "Dynamic moves expand your reach.",
    xp:    75,
    target: 1,
    bucket: 'stat-gap',
    targetsAxis: 'dynamic',
  },
  {
    id:    'stat-gap-technical',
    title: 'Find a slab or balance line',
    why:   "Technical climbs sharpen footwork.",
    xp:    70,
    target: 2,
    bucket: 'stat-gap',
    targetsAxis: 'technical',
  },
  {
    id:    'stat-gap-power',
    title: 'Try an overhang problem',
    why:   "Overhang builds raw power.",
    xp:    75,
    target: 2,
    bucket: 'stat-gap',
    targetsAxis: 'power',
  },
  {
    id:    'volume',
    title: 'Log 5 sends today',
    why:   "Volume builds capacity.",
    xp:    40,
    target: 5,
    bucket: 'volume',
  },
  {
    id:    'variety',
    title: 'Log climbs in 3 different styles',
    why:   "Variety builds well-roundedness.",
    xp:    60,
    target: 3,
    bucket: 'variety',
  },
  {
    id:    'training-mobility',
    title: 'Log a 20-min mobility session',
    why:   "No mobility training in the last 7 days.",
    xp:    50,
    target: 1,
    bucket: 'training',
  },
  {
    id:    'push',
    title: 'Send something one grade above your average',
    why:   "Push the grade ceiling.",
    xp:    80,
    target: 1,
    bucket: 'push',
  },
  {
    id:    'outdoor',
    title: 'Log an outdoor session this week',
    why:   "Outdoor sessions earn 1.5× XP.",
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
