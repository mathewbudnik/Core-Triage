/**
 * XP formula + level thresholds for the RPG climber reward engine.
 * Pure functions, no side effects. See spec §7 for formula reference.
 */

const BASE_GRADE_XP = {
  V0: 10, V1: 20, V2: 35, V3: 55, V4: 80, V5: 105,
  V6: 130, V7: 180, V8: 240, V9: 310, V10: 400,
}
const V11_PLUS_XP = 500

export function baseGradeXP(grade) {
  if (typeof grade !== 'string' || !grade.startsWith('V')) return 0
  if (grade in BASE_GRADE_XP) return BASE_GRADE_XP[grade]
  const n = parseInt(grade.slice(1), 10)
  if (Number.isFinite(n) && n >= 11) return V11_PLUS_XP
  return 0
}

const MODALITY_MULT = {
  indoor:      1.00,
  system:      1.25,
  outdoor:     1.50,
  competition: 1.40,
}

const FLASH_MULT = {
  flash:    2.00,
  redpoint: 1.00,
  project:  0.10,
}

const PR_MULT_TRUE  = 1.50
const PR_MULT_FALSE = 1.00

const STYLE_TO_PRIMARY_STAT = {
  powerful:  'power',
  crimpy:    'crimpy',
  dynamic:   'dynamic',
  technical: 'technical',
  mobility:  'mobility',
}

function gapMultiplier(stylePrimary, climberStatShape) {
  const targetStat = STYLE_TO_PRIMARY_STAT[stylePrimary]
  if (!targetStat || !climberStatShape) return 1.0
  const ranked = Object.entries(climberStatShape)
    .sort(([, a], [, b]) => a - b)
    .map(([key]) => key)
  if (ranked[0] === targetStat) return 1.5
  if (ranked[1] === targetStat) return 1.2
  return 1.0
}

const DEEP_BONUS = 1.25
const CHAIN_PER_POSITION = 5
const CHAIN_CAP = 30

export function calculateSendXP({
  grade,
  modality,
  outcome,
  isPersonalRecord,
  stylePrimary,
  climberStatShape,
  isDeepLog,
  sessionPosition = 0,
}) {
  const base       = baseGradeXP(grade)
  const modMult    = MODALITY_MULT[modality] ?? 1.0
  const flashMult  = FLASH_MULT[outcome] ?? 1.0
  const prMult     = isPersonalRecord ? PR_MULT_TRUE : PR_MULT_FALSE
  const gap        = gapMultiplier(stylePrimary, climberStatShape)
  const deepMult   = isDeepLog ? DEEP_BONUS : 1.0
  const product    = base * modMult * flashMult * prMult * gap * deepMult
  const chainBonus = Math.min(CHAIN_CAP, Math.max(0, sessionPosition) * CHAIN_PER_POSITION)
  return Math.floor(product + chainBonus)
}

export function xpForLevel(level) {
  if (!Number.isFinite(level) || level < 1) return 0
  return Math.floor(100 * Math.pow(level, 1.45))
}

export function levelFromTotalXP(totalXP) {
  if (!Number.isFinite(totalXP) || totalXP < 0) {
    return { level: 1, xpInLevel: 0, xpForNext: xpForLevel(1) }
  }
  let level = 1
  let remaining = totalXP
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level)
    level += 1
  }
  return { level, xpInLevel: remaining, xpForNext: xpForLevel(level) }
}
