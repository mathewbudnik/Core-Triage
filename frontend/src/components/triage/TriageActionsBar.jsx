import { motion } from 'framer-motion'
import { ArrowRight, Loader2, Download } from 'lucide-react'

// Haptic helper — silent no-op if vibration API unavailable.
function submitHaptic() {
  try { navigator.vibrate?.([10, 30, 10]) } catch (_) { /* no-op */ }
}

/**
 * Sticky bottom action bar. Two presentations:
 *   - Form state:      single primary CTA (Get my guidance / Tell us a bit more)
 *   - Diagnosis state: primary + ghost overflow button (save/PDF)
 *
 * Severe diagnosis: primaryTone === 'coral' tints the primary button red.
 *
 * Props:
 *   primaryLabel:  string
 *   primaryTone:   'teal' | 'coral'        — drives bg color
 *   enabled:       boolean                  — disabled state for form pre-submit
 *   loading:       boolean                  — spinner inside the button
 *   onPrimary:     () => void
 *   showOverflow:  boolean                  — true on diagnosis state
 *   onOverflow:    () => void
 *   error:         string | null            — inline error above the bar
 */
const PRIMARY_BG = {
  teal:  'bg-ct-terracotta text-ct-cream',
  coral: 'bg-[#fb7185] text-ct-cream',
}

export default function TriageActionsBar({
  primaryLabel,
  primaryTone = 'teal',
  enabled = true,
  loading = false,
  onPrimary,
  showOverflow = false,
  onOverflow,
  error,
}) {
  return (
    <>
      {error && (
        <div className="px-1 mb-2 flex items-center gap-2 text-[#fb7185] text-xs">
          <span>{error}</span>
        </div>
      )}
      <div className="sticky bottom-0 left-0 right-0 -mx-4 px-4
                      pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]
                      bg-ct-forest-deep/90 backdrop-blur-md border-t border-ct-hairline
                      flex gap-2 z-20">
        <motion.button
          type="button"
          onClick={() => { if (enabled && !loading) { submitHaptic(); onPrimary?.() } }}
          disabled={!enabled || loading}
          whileTap={enabled && !loading ? { scale: 0.97 } : undefined}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          className={`flex-1 flex items-center justify-center gap-2
                      h-12 px-5 rounded-2xl text-sm font-extrabold
                      tracking-[-0.01em] transition-colors
                      ${enabled && !loading
                        ? PRIMARY_BG[primaryTone] || PRIMARY_BG.teal
                        : 'bg-ct-forest text-ct-cream/30 border border-ct-hairline cursor-not-allowed'}`}
        >
          {loading ? (
            <><Loader2 size={16} className="animate-spin" /> Reading your screening…</>
          ) : (
            <>{primaryLabel} <ArrowRight size={15} strokeWidth={2.6} /></>
          )}
        </motion.button>

        {showOverflow && (
          <button
            type="button"
            onClick={onOverflow}
            className="w-12 h-12 rounded-2xl flex items-center justify-center
                       bg-ct-terra-tint border border-ct-terracotta/30
                       text-ct-terra-soft hover:text-ct-cream transition-colors"
            aria-label="More actions"
          >
            <Download size={16} strokeWidth={2.2} />
          </button>
        )}
      </div>
    </>
  )
}
