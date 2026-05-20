import { createContext, useContext, useEffect, useState } from 'react'

/**
 * Provides the active V-grade tier theme via React context + CSS variables.
 *
 * Phase 0 ships ONE theme — "ember" (default, matches the locked aesthetic).
 * Phase 5 adds the other tier palettes (frost, slatehold, phoenix) and the
 * unlock/switch flow.
 *
 * Theme is read from localStorage key `ct_theme` on mount.
 * Defaults to 'ember' if no value is set.
 */

const THEMES = {
  ember: {
    name: 'EMBER',
    accent:     '#d97757',
    accentSoft: '#f0a875',
  },
}

const TierThemeContext = createContext({
  themeKey: 'ember',
  theme: THEMES.ember,
  setThemeKey: () => {},
})

export function TierThemeProvider({ children }) {
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

  return (
    <TierThemeContext.Provider value={{ themeKey, theme, setThemeKey }}>
      {children}
    </TierThemeContext.Provider>
  )
}

export function useTierTheme() {
  return useContext(TierThemeContext)
}

export { THEMES }
