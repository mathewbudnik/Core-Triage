import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { TIER_TOKENS, TIER_NAMES } from '../../lib/tier'

/**
 * Provides the active V-grade tier theme via React context + CSS variables.
 *
 * Phase 0 shipped ONE theme — "ember" (default, matches the locked aesthetic).
 * Phase 5 keeps the unified RPG palette (per user direction) and uses this
 * provider primarily to expose the climber's current tier id to descendants
 * without prop drilling. Per-tier chrome swapping is deliberately deferred.
 *
 * Props:
 *   tier:      tier id ('rookie' | 'v0' | 'v1' | ... | 'v10') | null
 *   children
 *
 * Theme key is read from localStorage `ct_theme` (legacy compat).
 */

const THEMES = {
  ember: {
    name: 'EMBER',
    accent:     '#c58a77',
    accentSoft: '#b06a4f',
  },
}

const TierThemeContext = createContext({
  themeKey: 'ember',
  theme: THEMES.ember,
  setThemeKey: () => {},
  tier: null,
  tierTokens: null,
  tierName: null,
})

export function TierThemeProvider({ tier = null, children }) {
  const [themeKey, setThemeKeyState] = useState(() => {
    try {
      const stored = localStorage.getItem('ct_theme')
      return stored && THEMES[stored] ? stored : 'ember'
    } catch {
      return 'ember'
    }
  })
  const setThemeKey = (key) => {
    if (!THEMES[key]) return
    setThemeKeyState(key)
    try { localStorage.setItem('ct_theme', key) } catch {}
  }
  const theme = THEMES[themeKey]

  useEffect(() => {
    document.documentElement.style.setProperty('--ct-theme-accent', theme.accent)
    document.documentElement.style.setProperty('--ct-theme-accent-soft', theme.accentSoft)
  }, [theme])

  const value = useMemo(() => ({
    themeKey,
    theme,
    setThemeKey,
    tier: tier || null,
    tierTokens: tier ? TIER_TOKENS[tier] || null : null,
    tierName:   tier ? TIER_NAMES[tier]  || null : null,
  }), [themeKey, theme, tier])

  return (
    <TierThemeContext.Provider value={value}>
      {children}
    </TierThemeContext.Provider>
  )
}

export function useTierTheme() {
  return useContext(TierThemeContext)
}

export { THEMES }
