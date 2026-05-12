import { useEffect, useState, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

const GAP = 12
const VIEWPORT_PAD = 12
const COACHMARK_W_DESKTOP = 340
const MOBILE_BOTTOM_OFFSET = 76 // above bottom nav (~62px) + a little air

// Desktop only: compute anchored position in document coordinates so the
// coachmark scrolls naturally with the anchor instead of chasing it on every
// scroll event.
function computeAnchored(anchorEl) {
  const rect = anchorEl.getBoundingClientRect()
  const scrollY = window.scrollY || window.pageYOffset
  const scrollX = window.scrollX || window.pageXOffset
  const vw = window.innerWidth
  const vh = window.innerHeight
  const width = Math.min(COACHMARK_W_DESKTOP, vw - VIEWPORT_PAD * 2)

  // Decide above/below based on which side has more room in the viewport.
  const spaceBelow = vh - rect.bottom
  const spaceAbove = rect.top
  const placeBelow = spaceBelow > spaceAbove
  const placement = placeBelow ? 'below' : 'above'

  // Top in document coords. If above, we adjust again after measuring height.
  const top = placeBelow
    ? rect.bottom + scrollY + GAP
    : rect.top + scrollY - GAP

  const anchorCenterX = rect.left + rect.width / 2 + scrollX
  let left = anchorCenterX - width / 2
  left = Math.max(scrollX + VIEWPORT_PAD, Math.min(left, scrollX + vw - width - VIEWPORT_PAD))
  const arrowX = anchorCenterX - left

  return { mode: 'anchored', top, left, width, placement, arrowX }
}

export default function Coachmark({ tour }) {
  const { tip, dismiss, skip, getAnchor } = tour
  const [pos, setPos] = useState(null)
  const [boxEl, setBoxEl] = useState(null)
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
  )

  // Track viewport breakpoint
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const handler = (e) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Compute position when tip changes or breakpoint changes.
  // On desktop we also recompute on resize. We deliberately do NOT listen to
  // scroll — the coachmark uses document-absolute coords on desktop and
  // bottom-fixed on mobile, both of which behave correctly during scroll.
  useLayoutEffect(() => {
    if (!tip) { setPos(null); return }
    if (!isDesktop) { setPos({ mode: 'mobile-bottom' }); return }

    const update = () => {
      const anchor = getAnchor(tip.anchorId)
      if (!anchor) { setPos(null); return }
      setPos(computeAnchored(anchor))
    }
    update()

    const onResize = () => update()
    window.addEventListener('resize', onResize)

    const anchor = getAnchor(tip.anchorId)
    let ro
    if (anchor && 'ResizeObserver' in window) {
      ro = new ResizeObserver(update)
      ro.observe(anchor)
    }

    return () => {
      window.removeEventListener('resize', onResize)
      ro?.disconnect()
    }
  }, [tip, getAnchor, isDesktop])

  // After measuring height, if placing above the anchor, shift up so the
  // bottom edge lands above it. _adjusted prevents the effect from re-firing
  // on its own output (which would loop infinitely).
  useLayoutEffect(() => {
    if (!pos || pos.mode !== 'anchored' || !boxEl || pos.placement !== 'above' || pos._adjusted) return
    const h = boxEl.getBoundingClientRect().height
    if (h < 0.5) return
    setPos((p) => p && { ...p, top: pos.top - h, _adjusted: true })
  }, [pos, boxEl])

  // Esc dismisses current tip
  useEffect(() => {
    if (!tip) return
    const onKey = (e) => { if (e.key === 'Escape') dismiss() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tip, dismiss])

  if (!tip || !pos) return null
  if (typeof document === 'undefined') return null

  const isMobileBottom = pos.mode === 'mobile-bottom'

  const wrapperStyle = isMobileBottom
    ? {
        position: 'fixed',
        left: VIEWPORT_PAD,
        right: VIEWPORT_PAD,
        bottom: `calc(${MOBILE_BOTTOM_OFFSET}px + env(safe-area-inset-bottom, 0px))`,
        zIndex: 200,
      }
    : {
        position: 'absolute',
        top: pos.top,
        left: pos.left,
        width: pos.width,
        zIndex: 200,
      }

  return createPortal(
    <AnimatePresence>
      <motion.div
        key={tip.anchorId}
        ref={setBoxEl}
        role="dialog"
        aria-live="polite"
        aria-label={`${tip.label}: ${tip.body}`}
        initial={{ opacity: 0, y: isMobileBottom ? 16 : (pos.placement === 'below' ? -8 : 8) }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: isMobileBottom ? 16 : (pos.placement === 'below' ? -8 : 8) }}
        transition={{ duration: 0.24, ease: [0.2, 0.7, 0.2, 1] }}
        style={wrapperStyle}
        className="bg-panel/95 backdrop-blur-md border-2 border-accent/50 rounded-xl shadow-glow text-text"
      >
        {/* Arrow — desktop anchored only */}
        {!isMobileBottom && (
          <span
            aria-hidden
            className="absolute w-3 h-3 bg-panel border-accent/50 rotate-45"
            style={{
              left: Math.max(10, Math.min(pos.arrowX - 6, pos.width - 16)),
              top: pos.placement === 'below' ? -7 : 'auto',
              bottom: pos.placement === 'above' ? -7 : 'auto',
              borderTopWidth: pos.placement === 'below' ? 2 : 0,
              borderLeftWidth: pos.placement === 'below' ? 2 : 0,
              borderRightWidth: pos.placement === 'above' ? 2 : 0,
              borderBottomWidth: pos.placement === 'above' ? 2 : 0,
              borderStyle: 'solid',
            }}
          />
        )}

        <div className="px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-accent">
              {tip.label}
            </span>
            <button
              onClick={skip}
              aria-label="Skip tour"
              className="text-muted hover:text-text transition-colors -mt-0.5 -mr-1 p-1"
            >
              <X size={14} />
            </button>
          </div>
          <p className="text-sm text-text leading-snug mt-0.5">{tip.body}</p>

          <div className="flex items-center justify-between mt-2.5">
            <div className="flex items-center gap-1.5">
              {Array.from({ length: tip.total }).map((_, i) => (
                <span
                  key={i}
                  className={`rounded-full transition-all ${
                    i === tip.index ? 'w-4 h-1.5 bg-accent' :
                    i <  tip.index ? 'w-1.5 h-1.5 bg-accent/50' :
                                     'w-1.5 h-1.5 bg-outline'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={dismiss}
              className="text-xs font-semibold text-accent hover:text-accent/80 transition-colors px-2 py-1"
            >
              Got it
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}
