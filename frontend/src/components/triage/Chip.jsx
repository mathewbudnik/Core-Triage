import { motion } from 'framer-motion'

// Haptic helper — silently no-ops on iOS Safari (no Vibration API) and any
// browser without navigator.vibrate. Cheap to call unconditionally.
function tapHaptic() {
  try { navigator.vibrate?.(10) } catch (_) { /* no-op */ }
}

/**
 * One chip — pill with active/inactive states. Active uses tier-aware
 * accents via CSS variables (--tier-c, --tier-light) so the chip color
 * follows the user's current tier theme.
 *
 * Props:
 *   active:    boolean
 *   onClick:   () => void
 *   children:  label content
 *   ariaLabel: optional explicit aria-label (otherwise uses children text)
 */
export default function Chip({ active, onClick, children, ariaLabel }) {
  return (
    <motion.button
      type="button"
      onClick={() => { tapHaptic(); onClick?.() }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
      aria-pressed={!!active}
      aria-label={ariaLabel}
      className={`text-xs font-semibold px-3 py-1.5 rounded-full border-[0.5px]
                  transition-colors
                  ${active
                    ? 'bg-ct-terra-tint border-ct-terracotta/50 text-ct-terra-soft'
                    : 'bg-ct-forest border-ct-hairline text-ink-soft hover:text-ct-cream'}`}
    >
      {children}
    </motion.button>
  )
}
