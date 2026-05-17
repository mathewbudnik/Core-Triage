import { useEffect, useMemo } from 'react'
import { useTierTheme } from '../hooks/useTierTheme'

/**
 * Wraps a subtree and exposes the user's working-tier color tokens as
 * CSS custom properties.
 *
 *   <TierThemeRoot hardest={data.hardestSends}>
 *     <HubTab ... />
 *   </TierThemeRoot>
 *
 * Children read --tier-c / --tier-light / --tier-deep / --tier-glow.
 *
 * If `global` is true, sets the same vars on document.documentElement
 * so the nav active indicator (which lives outside the subtree) can
 * read them too.
 */
export default function TierThemeRoot({ hardest, global = false, children }) {
  const { tokens } = useTierTheme(hardest)

  const style = useMemo(() => ({
    '--tier-c':     tokens.c,
    '--tier-light': tokens.light,
    '--tier-deep':  tokens.deep,
    '--tier-glow':  tokens.glow,
  }), [tokens.c, tokens.light, tokens.deep, tokens.glow])

  useEffect(() => {
    if (!global) return
    const root = document.documentElement
    root.style.setProperty('--tier-c',     tokens.c)
    root.style.setProperty('--tier-light', tokens.light)
    root.style.setProperty('--tier-deep',  tokens.deep)
    root.style.setProperty('--tier-glow',  tokens.glow)
  }, [global, tokens.c, tokens.light, tokens.deep, tokens.glow])

  return <div style={style}>{children}</div>
}
