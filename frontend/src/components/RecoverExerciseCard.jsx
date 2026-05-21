import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, AlertTriangle, Zap, ChevronRight, PlayCircle } from 'lucide-react'
import { buildExerciseVideoUrl } from '../data/exercises'

/**
 * Mobile-tuned exercise card.
 * - Tap card → expand inline detail
 * - Tap checkbox → toggle checked
 * - 28px checkbox in a 60px-tall card (well above 44pt min target)
 * - :active scale-down for tactile press feedback
 *
 * Props:
 *   exercise: { name, area, sets, reps, frequency, feel, red_flags, progression_trigger }
 *   checked:  boolean
 *   onToggle: () => void
 */
export default function RecoverExerciseCard({ exercise, checked, onToggle }) {
  const [open, setOpen] = useState(false)

  const handleCheckboxClick = (e) => {
    e.stopPropagation()      // don't expand the card when tapping the checkbox
    onToggle?.()
  }

  return (
    <motion.div
      onClick={() => setOpen((o) => !o)}
      whileTap={{ scale: 0.985 }}
      className={`flex items-start gap-3 px-3.5 py-4 rounded-2xl border min-h-[60px]
                  cursor-pointer transition-opacity select-none
                  ${checked
                    ? 'opacity-55 bg-accent/[0.04] border-accent/20'
                    : open
                      ? 'bg-[linear-gradient(180deg,rgba(20,184,166,0.06),rgba(20,184,166,0.02))] border-accent/35'
                      : 'ct-surface-flat border-ct-hairline'}`}
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={handleCheckboxClick}
        aria-label={checked ? 'Mark as not done' : 'Mark as done'}
        aria-pressed={checked}
        className={`w-7 h-7 rounded-[10px] shrink-0 inline-flex items-center justify-center
                    border-[1.5px] transition-all
                    ${checked
                      ? 'bg-accent border-accent shadow-[0_0_10px_rgba(20,184,166,0.5)]'
                      : 'bg-ct-forest border-ct-rim/50'}`}
      >
        {checked && <Check size={14} strokeWidth={3} className="text-bg" />}
      </button>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold leading-tight ${
          checked ? 'text-ct-cream/60 line-through decoration-ct-cream/30' : 'text-ct-cream'
        }`}>
          {exercise.name}
        </p>
        <p className="text-[12px] text-ct-cream/60 mt-1">
          {exercise.sets} sets × {exercise.reps}{exercise.frequency ? ` · ${exercise.frequency}` : ''}
        </p>

        <AnimatePresence initial={false}>
          {open && !checked && (
            <motion.div
              key="detail"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="mt-2.5 pt-2.5 border-t border-outline/60 space-y-2">
                <a
                  href={buildExerciseVideoUrl(exercise)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent text-[11px] font-semibold hover:bg-accent/20 hover:border-accent/50 transition-colors"
                >
                  <PlayCircle size={12} strokeWidth={2.4} />
                  Watch demo
                </a>

                {exercise.feel && (
                  <p className="flex items-start gap-2 text-[12px] text-ct-cream/60 leading-snug">
                    <Check size={12} strokeWidth={2.4} className="text-accent shrink-0 mt-0.5" />
                    <span>
                      <span className="text-accent font-bold uppercase text-[10px] tracking-[0.08em] mr-1">Should feel:</span>
                      {exercise.feel}
                    </span>
                  </p>
                )}
                {exercise.red_flags && (
                  <p className="flex items-start gap-2 text-[12px] text-ct-cream/60 leading-snug">
                    <AlertTriangle size={12} strokeWidth={2.4} className="text-accent2 shrink-0 mt-0.5" />
                    <span>
                      <span className="text-accent2 font-bold uppercase text-[10px] tracking-[0.08em] mr-1">Stop if:</span>
                      {exercise.red_flags}
                    </span>
                  </p>
                )}
                {exercise.progression_trigger && (
                  <p className="flex items-start gap-2 text-[12px] text-ct-cream/60 leading-snug">
                    <Zap size={12} strokeWidth={2.4} className="text-accent3 shrink-0 mt-0.5" />
                    <span>
                      <span className="text-accent3 font-bold uppercase text-[10px] tracking-[0.08em] mr-1">Progress when:</span>
                      {exercise.progression_trigger}
                    </span>
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!open && !checked && (
        <ChevronRight size={14} strokeWidth={2.4} className="text-text/25 shrink-0 self-center" />
      )}
    </motion.div>
  )
}
