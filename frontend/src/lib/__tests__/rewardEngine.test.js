import { describe, it, expect, beforeEach } from 'vitest'
import {
  getInitialState,
  loadState,
  saveState,
  STORAGE_KEY,
  STATE_VERSION,
} from '../rewardEngine.js'
import { addSend } from '../rewardEngine.js'

// Minimal in-memory localStorage shim for Node test env
class MemoryStorage {
  constructor() { this.store = {} }
  getItem(k) { return this.store[k] ?? null }
  setItem(k, v) { this.store[k] = String(v) }
  removeItem(k) { delete this.store[k] }
  clear() { this.store = {} }
}

beforeEach(() => {
  globalThis.localStorage = new MemoryStorage()
})

describe('getInitialState', () => {
  it('returns a fresh state object', () => {
    const s = getInitialState()
    expect(s.version).toBe(STATE_VERSION)
    expect(s.totalXP).toBe(0)
    expect(s.sends).toEqual([])
    expect(s.bestPerStyle).toEqual({
      powerful: null, crimpy: null, dynamic: null, technical: null, mobility: null,
    })
    expect(s.streak).toEqual({ days: 0, best: 0, lastActiveDate: null })
    expect(s.quest).toEqual({ id: null, generatedDate: null, progress: { current: 0, target: 0 } })
  })
})

describe('saveState / loadState', () => {
  it('round-trips state via localStorage', () => {
    const s = getInitialState()
    s.totalXP = 250
    s.sends.push({ ts: 1700000000000, stylePrimary: 'crimpy', gradeNum: 6 })
    saveState(s)
    const loaded = loadState()
    expect(loaded.totalXP).toBe(250)
    expect(loaded.sends).toHaveLength(1)
    expect(loaded.sends[0].stylePrimary).toBe('crimpy')
  })

  it('returns initial state if nothing is stored', () => {
    const loaded = loadState()
    expect(loaded.version).toBe(STATE_VERSION)
    expect(loaded.totalXP).toBe(0)
  })

  it('returns initial state if stored JSON is invalid', () => {
    globalThis.localStorage.setItem(STORAGE_KEY, 'not json')
    const loaded = loadState()
    expect(loaded.totalXP).toBe(0)
  })

  it('returns initial state if stored version mismatches', () => {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 999, totalXP: 9999, sends: [],
    }))
    const loaded = loadState()
    expect(loaded.totalXP).toBe(0)
    expect(loaded.version).toBe(STATE_VERSION)
  })

  it('saveState writes to the configured key', () => {
    const s = getInitialState()
    s.totalXP = 100
    saveState(s)
    expect(globalThis.localStorage.getItem(STORAGE_KEY)).toContain('"totalXP":100')
  })
})

describe('addSend', () => {
  beforeEach(() => {
    globalThis.localStorage = new MemoryStorage()
  })

  const baseSend = {
    grade: 'V6',
    modality: 'indoor',
    outcome: 'redpoint',
    stylePrimary: 'crimpy',
    isDeepLog: false,
    ts: Date.parse('2026-05-20T18:00:00Z'),
  }

  it('returns xpEarned > 0 for a valid send', () => {
    const state = getInitialState()
    const { events, state: next } = addSend(state, baseSend)
    expect(events.xpEarned).toBeGreaterThan(0)
    expect(next.totalXP).toBe(events.xpEarned)
  })

  it('detects a personal record on first send at a grade', () => {
    const state = getInitialState()
    const { events } = addSend(state, baseSend)
    expect(events.isPersonalRecord).toBe(true)
  })

  it('does NOT mark a PR when the grade was already ticked', () => {
    let state = getInitialState()
    state = addSend(state, baseSend).state
    const second = addSend(state, baseSend)
    expect(second.events.isPersonalRecord).toBe(false)
  })

  it('updates bestPerStyle to track max grade per style', () => {
    let state = getInitialState()
    state = addSend(state, { ...baseSend, grade: 'V3' }).state
    state = addSend(state, { ...baseSend, grade: 'V6' }).state
    state = addSend(state, { ...baseSend, grade: 'V4' }).state
    expect(state.bestPerStyle.crimpy).toBe(6)
  })

  it('detects level-up when XP crosses the threshold', () => {
    let state = getInitialState()
    state.totalXP = 95  // 5 XP below level 2 threshold (100)
    const { events } = addSend(state, baseSend)
    expect(events.leveledUp).toBe(true)
    expect(events.level).toBeGreaterThanOrEqual(2)
  })

  it('does NOT mark level-up when XP stays in the same level', () => {
    let state = getInitialState()
    state.totalXP = 100  // start of level 2; earning ~234 XP stays within level 2 (needs 273 to advance)
    const { events } = addSend(state, baseSend)
    expect(events.leveledUp).toBe(false)
  })

  it('appends the send to the sends array', () => {
    const state = getInitialState()
    const { state: next } = addSend(state, baseSend)
    expect(next.sends).toHaveLength(1)
    expect(next.sends[0].stylePrimary).toBe('crimpy')
    expect(next.sends[0].gradeNum).toBe(6)
  })

  it('rejects sends with missing or invalid grade gracefully', () => {
    const state = getInitialState()
    const result = addSend(state, { ...baseSend, grade: 'garbage' })
    expect(result.events.xpEarned).toBe(0)
    expect(result.state).toEqual(state)
  })

  it('initializes streak on first send', () => {
    const state = getInitialState()
    const { state: next } = addSend(state, baseSend)
    expect(next.streak.days).toBe(1)
    expect(next.streak.best).toBe(1)
    expect(next.streak.lastActiveDate).toBeTruthy()
  })

  it('does not increment streak for multiple sends on the same day', () => {
    let state = getInitialState()
    state = addSend(state, baseSend).state
    state = addSend(state, { ...baseSend, ts: baseSend.ts + 3600 * 1000 }).state
    expect(state.streak.days).toBe(1)
  })

  it('increments streak on next-day sends', () => {
    let state = getInitialState()
    state = addSend(state, baseSend).state
    const nextDay = baseSend.ts + 24 * 60 * 60 * 1000
    state = addSend(state, { ...baseSend, ts: nextDay }).state
    expect(state.streak.days).toBe(2)
  })
})
