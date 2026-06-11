import { useEffect, useState, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

const GAP = 12
const VIEWPORT_PAD = 12
const COACHMARK_W_DESKTOP = 300
const COACHMARK_W_MOBILE = 320           // narrower than full-width so the
                                          // diagram below stays visible/tappable
const MOBILE_BOTTOM_OFFSET = 92          // above bottom nav + extra air so the
                                          // tip clears the diagram's lower legs

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

  // NOTE on centering: framer-motion drives entry/exit via the CSS `transform`
  // property, so we can't use `transform: translateX(-50%)` for centering —
  // motion would clobber it. Use the "left + right + margin: auto + max-width"
  // pattern instead, which centers reliably and leaves `transform` free for
  // motion to animate.
  const wrapperStyle = isMobileBottom
    ? {
        position: 'fixed',
        left: VIEWPORT_PAD,
        right: VIEWPORT_PAD,
        bottom: `calc(${MOBILE_BOTTOM_OFFSET}px + env(safe-area-inset-bottom, 0px))`,
        maxWidth: COACHMARK_W_MOBILE,
        marginLeft: 'auto',
        marginRight: 'auto',
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
        className="bg-ct-forest-deep border border-ct-terracotta/40 rounded-lg shadow-lg text-ct-cream backdrop-blur-md"
      >
        {/* Arrow — desktop anchored only */}
        {!isMobileBottom && (
          <span
            aria-hidden
            className="absolute w-2.5 h-2.5 bg-ct-forest-deep rotate-45"
            style={{
              left: Math.max(10, Math.min(pos.arrowX - 5, pos.width - 14)),
              top: pos.placement === 'below' ? -6 : 'auto',
              bottom: pos.placement === 'above' ? -6 : 'auto',
              borderTopWidth: pos.placement === 'below' ? 1 : 0,
              borderLeftWidth: pos.placement === 'below' ? 1 : 0,
              borderRightWidth: pos.placement === 'above' ? 1 : 0,
              borderBottomWidth: pos.placement === 'above' ? 1 : 0,
              borderStyle: 'solid',
              borderColor: 'rgba(217,119,87,0.40)',
            }}
          />
        )}

        <div className="px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <span className="text-[9px] uppercase tracking-wider font-semibold text-ct-terra-soft">
                {tip.label}
              </span>
              <p className="text-xs text-ink-soft leading-snug mt-0.5">{tip.body}</p>
            </div>
            <button
              onClick={skip}
              aria-label="Skip tour"
              className="text-ink-muted hover:text-ct-cream transition-colors -mt-0.5 -mr-0.5 p-0.5 shrink-0"
            >
              <X size={12} />
            </button>
          </div>

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5">
              {Array.from({ length: tip.total }).map((_, i) => (
                <span
                  key={i}
                  className={`rounded-full transition-all ${
                    i === tip.index ? 'w-3 h-1 bg-ct-terracotta' :
                    i <  tip.index ? 'w-1 h-1 bg-ct-terracotta/50' :
                                     'w-1 h-1 bg-ct-hairline'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={dismiss}
              className="text-[11px] font-semibold text-ct-terra-soft hover:text-ct-terra-soft/80 transition-colors px-2 py-0.5"
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
