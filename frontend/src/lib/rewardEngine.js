/**
 * Reward engine — persistent state for XP, stats, streak, and the
 * current daily quest. All state lives client-side in localStorage;
 * backend sync is deferred to a later phase per spec.
 */

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
