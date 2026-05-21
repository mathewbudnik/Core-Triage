import { STYLE_ORDER } from './styleColors.js'

export const STYLE_STORAGE_KEY = 'ct_climb_style'
const DEFAULT_STYLE = 'powerful'

const LEGACY_MIGRATIONS = {
  power:     'powerful',
  endurance: 'mobility',
}

function safeRead() {
  try { return globalThis.localStorage?.getItem(STYLE_STORAGE_KEY) ?? null }
  catch { return null }
}

function safeWrite(value) {
  try { globalThis.localStorage?.setItem(STYLE_STORAGE_KEY, value) }
  catch { /* ignore */ }
}

export function getActiveStyle() {
  const raw = safeRead()
  if (raw && STYLE_ORDER.includes(raw)) return raw
  if (raw && LEGACY_MIGRATIONS[raw]) {
    const migrated = LEGACY_MIGRATIONS[raw]
    safeWrite(migrated)
    return migrated
  }
  if (raw !== null && raw !== DEFAULT_STYLE) safeWrite(DEFAULT_STYLE)
  return DEFAULT_STYLE
}

export function setActiveStyle(key) {
  if (!STYLE_ORDER.includes(key)) return
  safeWrite(key)
}
