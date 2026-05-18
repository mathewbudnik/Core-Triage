import { useEffect, useState } from 'react'

/**
 * True when the viewport is at or above Tailwind's `md` breakpoint (768px).
 * Used by sheets that switch between a bottom-anchored mobile layout and a
 * centered-modal desktop layout. Listens to matchMedia changes so a window
 * resize re-renders dependents.
 */
export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia?.('(min-width: 768px)').matches || false
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(min-width: 768px)')
    const onChange = (e) => setIsDesktop(e.matches)
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])

  return isDesktop
}
