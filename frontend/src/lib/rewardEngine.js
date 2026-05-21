/**
 * Reward engine — persistent state for XP, stats, streak, and the
 * current daily quest. All state lives client-side in localStorage;
 * backend sync is deferred to a later phase per spec.
 */

import { calculateSendXP, levelFromTotalXP } from './xp.js'
import { gradeStringToNum } from './gradeUtil.js'
import { deriveStatShape } from './stats.js'

export const STORAGE_KEY = 'ct_reward_engine_v1'
export const STATE_VERSION = 1

const NULL_BEST_PER_STYLE = Object.freeze({
  powerful: null, crimpy: null, dynamic: null, technical: null, mobility: null,
})

/**
 * Fresh state for a brand-new climber.
 */
export function getInitialState() {
  return {
    version:       STATE_VERSION,
    totalXP:       0,
    sends:         [],
    bestPerStyle:  { ...NULL_BEST_PER_STYLE },
    streak:        { days: 0, best: 0, lastActiveDate: null },
    quest:         { id: null, generatedDate: null, progress: { current: 0, target: 0 } },
  }
}

/**
 * Read state from localStorage. Returns fresh state if nothing stored,
 * if the JSON is invalid, or if the stored version doesn't match
 * STATE_VERSION (future migrations can promote old versions here).
 */
export function loadState() {
  try {
    const raw = (globalThis.localStorage ?? null)?.getItem(STORAGE_KEY)
    if (!raw) return getInitialState()
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.version !== STATE_VERSION) return getInitialState()
    return parsed
  } catch {
    return getInitialState()
  }
}

/**
 * Persist state to localStorage. Silent on failure (storage may be disabled).
 */
export function saveState(state) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

function toLocalDateString(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function daysBetween(prevDateStr, currDateStr) {
  if (!prevDateStr) return Infinity
  const prev = new Date(prevDateStr + 'T00:00:00Z').getTime()
  const curr = new Date(currDateStr + 'T00:00:00Z').getTime()
  return Math.round((curr - prev) / (24 * 60 * 60 * 1000))
}

/**
 * Apply a single send to the engine state. Returns:
 *   { state: nextState, events: { xpEarned, totalXP, level, xpInLevel, xpForNext,
 *                                 leveledUp, isPersonalRecord, statShape, prevStatShape } }
 *
 * The send arg:
 *   { grade: 'V6', modality: 'indoor', outcome: 'redpoint',
 *     stylePrimary: 'crimpy', isDeepLog: false, ts: <ms since epoch> }
 *
 * Invalid sends (missing/unparseable grade) return state unchanged and
 * an events object with xpEarned: 0.
 */
export function addSend(state, send) {
  const gradeNum = gradeStringToNum(send?.grade)
  if (gradeNum === null) {
    const lvl = levelFromTotalXP(state.totalXP)
    return {
      state,
      events: {
        xpEarned: 0, totalXP: state.totalXP, ...lvl,
        leveledUp: false, isPersonalRecord: false,
        statShape: deriveStatShape(state.sends),
        prevStatShape: deriveStatShape(state.sends),
      },
    }
  }

  // Personal record = no prior send at this grade in this style
  const isPersonalRecord = !state.sends.some(
    (s) => s.stylePrimary === send.stylePrimary && s.gradeNum === gradeNum,
  )

  // Session position = sends already today
  const todayStr = toLocalDateString(send.ts ?? Date.now())
  const sessionPosition = state.sends.filter(
    (s) => toLocalDateString(s.ts) === todayStr,
  ).length

  // Compute XP using existing xp.js formula
  const prevStatShape = deriveStatShape(state.sends)
  const xpEarned = calculateSendXP({
    grade: send.grade,
    modality: send.modality,
    outcome: send.outcome,
    isPersonalRecord,
    stylePrimary: send.stylePrimary,
    climberStatShape: prevStatShape,
    isDeepLog: !!send.isDeepLog,
    sessionPosition,
  })

  // Append send to history
  const sendRecord = {
    ts: send.ts ?? Date.now(),
    grade: send.grade,
    gradeNum,
    modality: send.modality,
    outcome: send.outcome,
    stylePrimary: send.stylePrimary,
    isDeepLog: !!send.isDeepLog,
    xpEarned,
  }
  const nextSends = [...state.sends, sendRecord]

  // Update bestPerStyle
  const nextBestPerStyle = { ...state.bestPerStyle }
  const cappedGrade = Math.max(0, Math.min(10, gradeNum))
  if (
    nextBestPerStyle[send.stylePrimary] === null ||
    cappedGrade > nextBestPerStyle[send.stylePrimary]
  ) {
    nextBestPerStyle[send.stylePrimary] = cappedGrade
  }

  // Update streak
  const lastActive = state.streak.lastActiveDate
  const gap = daysBetween(lastActive, todayStr)
  let nextStreakDays = state.streak.days
  if (gap === 0) {
    // same day as last send, no increment
    if (nextStreakDays < 1) nextStreakDays = 1
  } else if (gap === 1) {
    nextStreakDays = state.streak.days + 1
  } else {
    // gap > 1 or Infinity (first ever send); start at 1
    nextStreakDays = 1
  }
  const nextStreak = {
    days: nextStreakDays,
    best: Math.max(state.streak.best, nextStreakDays),
    lastActiveDate: todayStr,
  }

  // Update XP totals
  const nextTotalXP = state.totalXP + xpEarned
  const prevLevel = levelFromTotalXP(state.totalXP).level
  const lvl = levelFromTotalXP(nextTotalXP)
  const leveledUp = lvl.level > prevLevel

  const nextState = {
    ...state,
    totalXP:      nextTotalXP,
    sends:        nextSends,
    bestPerStyle: nextBestPerStyle,
    streak:       nextStreak,
  }

  return {
    state: nextState,
    events: {
      xpEarned,
      totalXP:          nextTotalXP,
      level:            lvl.level,
      xpInLevel:        lvl.xpInLevel,
      xpForNext:        lvl.xpForNext,
      leveledUp,
      isPersonalRecord,
      statShape:        deriveStatShape(nextSends),
      prevStatShape,
    },
  }
}
