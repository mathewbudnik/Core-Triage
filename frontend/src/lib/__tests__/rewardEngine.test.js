import { describe, it, expect, beforeEach } from 'vitest'
import {
  getInitialState,
  loadState,
  saveState,
  STORAGE_KEY,
  STATE_VERSION,
} from '../rewardEngine.js'

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
