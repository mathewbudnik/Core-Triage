import { useCallback, useRef } from 'react'
import { usePrefersReducedMotion } from './usePrefersReducedMotion.js'

// Pixel offset above the destination section when scrolling. Tuned so the
// section's eyebrow label clears the page header. Bump if the header grows.
const SCROLL_OFFSET_PX = 18

/**
 * Wizard autoscroll hook. Returns:
 *   refFor(key)     — pass to a section's wrapping element as `ref={refFor('onset')}`
 *   scrollTo(key)   — smooth-scroll that section into view
 *
 * On `prefers-reduced-motion: reduce`, scrollTo uses `behavior: 'auto'`
 * (instant jump) instead of 'smooth'.
 */
export function useTriageAutoscroll() {
  const refsRef = useRef({})
  const prefersReducedMotion = usePrefersReducedMotion()

  const refFor = useCallback((key) => (el) => {
    if (el) refsRef.current[key] = el
    else delete refsRef.current[key]
  }, [])

  const scrollTo = useCallback((key) => {
    const el = refsRef.current[key]
    if (!el) return
    el.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    })
    // Nudge up so the eyebrow clears the page-header. Do it after the
    // scrollIntoView call so we land at the right baseline first.
    if (typeof window !== 'undefined') {
      // requestAnimationFrame gives the smooth-scroll a tick to start; the
      // tiny offset bump still arrives smoothly because we're inside the
      // same scroll animation context.
      requestAnimationFrame(() => window.scrollBy(0, -SCROLL_OFFSET_PX))
    }
  }, [prefersReducedMotion])

  return { refFor, scrollTo }
}
