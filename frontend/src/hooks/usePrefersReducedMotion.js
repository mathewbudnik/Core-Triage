import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Returns true when the user has set `prefers-reduced-motion: reduce`.
 * Components use this to switch from smooth animations to instant ones.
 */
export function usePrefersReducedMotion() {
  // SSR-safe default. On the client we'll sync immediately in the effect.
  const [prefers, setPrefers] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia(QUERY)
    setPrefers(mql.matches)
    const handler = (e) => setPrefers(e.matches)
    // addEventListener is the modern API. Some older Safaris only have
    // addListener — keep the fallback.
    if (mql.addEventListener) mql.addEventListener('change', handler)
    else mql.addListener(handler)
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', handler)
      else mql.removeListener(handler)
    }
  }, [])

  return prefers
}
