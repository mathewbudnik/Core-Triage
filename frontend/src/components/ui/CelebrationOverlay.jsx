import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { TRANSITIONS, useReducedTransition } from '../../lib/motion'

/**
 * Centered ~1.2 second celebration overlay. Used for PR sends, level-ups,
 * achievement unlocks, theme unlocks. SVG fallback when no Lottie file
 * is provided (Phase 0 ships SVG-only; Lottie wiring is a later phase).
 *
 * Props:
 *   open:       bool — render overlay
 *   onClose:    () => void — fired on tap or auto-dismiss
 *   title:      string — short copy ("V6 SENT!")
 *   subtitle:   string — secondary line ("+180 XP")
 *   autoDismissMs: number — milliseconds before auto-dismiss (default: 2500)
 *   className:  extra classes
 */
export default function CelebrationOverlay({
  open,
  onClose = () => {},
  title,
  subtitle,
  autoDismissMs = 2500,
  className = '',
}) {
  const transition = useReducedTransition(TRANSITIONS.celebrate)

  useEffect(() => {
    if (!open) return
    const t = setTimeout(onClose, autoDismissMs)
    return () => clearTimeout(t)
  }, [open, onClose, autoDismissMs])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={[
            'fixed inset-0 z-50',
            'flex flex-col items-center justify-center gap-4',
            'bg-ct-forest/85 backdrop-blur-sm',
            className,
          ].filter(Boolean).join(' ')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition}
          onClick={onClose}
        >
          {/* SVG burst fallback (Lottie replaces this in a later phase) */}
          <motion.svg
            viewBox="0 0 200 200" width="180" height="180"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={transition}
            xmlns="http://www.w3.org/2000/svg"
          >
            <g stroke="#d97757" strokeWidth="3" fill="none" strokeLinecap="round">
              {Array.from({ length: 12 }).map((_, i) => {
                const a = (i * Math.PI * 2) / 12
                const x1 = 100 + Math.cos(a) * 40
                const y1 = 100 + Math.sin(a) * 40
                const x2 = 100 + Math.cos(a) * 80
                const y2 = 100 + Math.sin(a) * 80
                return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
              })}
            </g>
            <circle cx="100" cy="100" r="32" fill="#d97757" />
          </motion.svg>
          {title && <p className="text-[28px] font-extrabold text-ct-cream tracking-[-0.025em] text-center">{title}</p>}
          {subtitle && <p className="ct-stat-num text-center">{subtitle}</p>}
          <p className="ct-meta mt-2">Tap to dismiss</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
