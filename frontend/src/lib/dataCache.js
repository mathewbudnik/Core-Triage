// Tiny in-memory cache for API responses that drive tab content. The point:
// when the user navigates back to a tab they recently visited, the data
// renders instantly from the cache while a fresh fetch runs in the
// background ("stale-while-revalidate"). Eliminates the per-tab spinner
// for repeat navigations without making the tab data go stale.
//
// Lifetime: process memory only. Cleared on logout via clearAll(). Tabs
// that mutate data (e.g. POST /api/training after logging a session) call
// invalidate() to drop stale entries.
//
// Why not React Query / SWR: avoids the dependency + API surface for what's
// effectively a 30-line Map wrapper.

const _cache = new Map()

export function getCached(key) {
  return _cache.has(key) ? _cache.get(key) : undefined
}

export function setCached(key, value) {
  _cache.set(key, value)
}

export function invalidate(key) {
  _cache.delete(key)
}

// Drop everything matching a prefix — e.g. `invalidatePrefix('train.')` to
// wipe all training-related entries after the user logs a session.
export function invalidatePrefix(prefix) {
  for (const key of _cache.keys()) {
    if (key.startsWith(prefix)) _cache.delete(key)
  }
}

export function clearAll() {
  _cache.clear()
}
