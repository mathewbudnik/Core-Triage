import { useEffect, useRef } from 'react'

// When `ready` flips false → true, smoothly scrolls `targetRef` into view
// so the user lands on the Continue button after making their selection.
// No-ops if the target is already visible. Respects prefers-reduced-motion.
export default function useScrollToContinue(targetRef, ready) {
  const prevReady = useRef(false)

  useEffect(() => {
    const target = targetRef.current
    const justBecameReady = ready && !prevReady.current
    prevReady.current = ready
    if (!justBecameReady || !target) return

    const t = setTimeout(() => {
      const rect = target.getBoundingClientRect()
      const fullyVisible = rect.top >= 0 && rect.bottom <= window.innerHeight
      if (fullyVisible) return

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      target.scrollIntoView({
        behavior: reduced ? 'auto' : 'smooth',
        block: 'center',
      })
    }, 150)

    return () => clearTimeout(t)
  }, [ready, targetRef])
}
