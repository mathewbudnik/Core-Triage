import { describe, it, expect, beforeEach } from 'vitest'
import { getActiveStyle, setActiveStyle, STYLE_STORAGE_KEY } from './styleStore.js'

describe('styleStore', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      _data: {},
      getItem(k) { return this._data[k] ?? null },
      setItem(k, v) { this._data[k] = String(v) },
      removeItem(k) { delete this._data[k] },
    }
  })

  it('returns the default "powerful" when nothing is stored', () => {
    expect(getActiveStyle()).toBe('powerful')
  })

  it('returns a valid stored chip key unchanged', () => {
    localStorage.setItem(STYLE_STORAGE_KEY, 'crimpy')
    expect(getActiveStyle()).toBe('crimpy')
  })

  it('migrates legacy "power" → "powerful" and rewrites storage', () => {
    localStorage.setItem(STYLE_STORAGE_KEY, 'power')
    expect(getActiveStyle()).toBe('powerful')
    expect(localStorage.getItem(STYLE_STORAGE_KEY)).toBe('powerful')
  })

  it('migrates legacy "endurance" → "mobility" and rewrites storage', () => {
    localStorage.setItem(STYLE_STORAGE_KEY, 'endurance')
    expect(getActiveStyle()).toBe('mobility')
    expect(localStorage.getItem(STYLE_STORAGE_KEY)).toBe('mobility')
  })

  it('falls back to "powerful" on a junk value and rewrites storage', () => {
    localStorage.setItem(STYLE_STORAGE_KEY, 'banana')
    expect(getActiveStyle()).toBe('powerful')
    expect(localStorage.getItem(STYLE_STORAGE_KEY)).toBe('powerful')
  })

  it('setActiveStyle accepts a valid key and rejects junk', () => {
    setActiveStyle('mobility')
    expect(localStorage.getItem(STYLE_STORAGE_KEY)).toBe('mobility')
    setActiveStyle('banana')
    expect(localStorage.getItem(STYLE_STORAGE_KEY)).toBe('mobility')
  })
})
