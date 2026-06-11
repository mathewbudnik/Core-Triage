import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, AlertTriangle, Zap, ChevronRight, PlayCircle } from 'lucide-react'
import { buildExerciseVideoUrl } from '../data/exercises'

/**
 * Almanac field-card for a single rehab exercise.
 * - Tap card → expand inline detail
 * - Tap checkbox → toggle checked
 * - 28px checkbox in a roomy card (well above 44pt min target)
 * - :active scale-down for tactile press feedback
 * - Field-guide labels (Should feel / Stop if / Progress when) keep their
 *   sage / clay / ochre coding.
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
      transition={{ duration: 0.14, ease: [0.2, 0.7, 0.2, 1] }}
      className={`relative flex items-start gap-3 px-3.5 py-3.5 rounded-2xl ct-surface min-h-[60px]
                  cursor-pointer select-none transition-colors
                  ${checked ? 'opacity-60' : ''}
                  ${open && !checked ? 'border-clay/50' : ''}`}
    >
      {/* Subtle left accent when expanded */}
      {open && !checked && (
        <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-full bg-clay" />
      )}

      {/* Checkbox */}
      <button
        type="button"
        onClick={handleCheckboxClick}
        aria-label={checked ? 'Mark as not done' : 'Mark as done'}
        aria-pressed={checked}
        className={`w-7 h-7 rounded-[10px] shrink-0 inline-flex items-center justify-center
                    border-[1.5px] transition-all
                    ${checked
                      ? 'bg-sage border-sage-deep'
                      : 'bg-card border-ct-rim'}`}
      >
        {checked && <Check size={14} strokeWidth={3} className="text-cream" />}
      </button>

      {/* Body */}
      <div className="flex-1 min-w-0">
        {exercise.area && (
          <p className="ct-eyebrow mb-1 truncate">{exercise.area}</p>
        )}
        <p className={`text-sm font-semibold font-serif leading-tight ${
          checked ? 'text-ink-soft line-through decoration-ink-muted/50' : 'text-ink'
        }`}>
          {exercise.name}
        </p>
        <p className="text-[12px] text-ink-soft mt-1">
          {exercise.sets} sets × {exercise.reps}{exercise.frequency ? ` · ${exercise.frequency}` : ''}
        </p>

        <AnimatePresence initial={false}>
          {open && !checked && (
            <motion.div
              key="detail"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.16, ease: [0.2, 0.7, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-2.5 pt-2.5 border-t border-ct-hairline space-y-2">
                <a
                  href={buildExerciseVideoUrl(exercise)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-clay text-cream text-[11px] font-semibold hover:brightness-105 active:brightness-95 transition"
                >
                  <PlayCircle size={12} strokeWidth={2.4} />
                  Watch demo
                </a>

                {exercise.feel && (
                  <p className="flex items-start gap-2 text-[12px] text-ink-soft leading-snug">
                    <Check size={12} strokeWidth={2.4} className="text-sage-deep shrink-0 mt-0.5" />
                    <span>
                      <span className="text-sage-deep font-bold uppercase text-[10px] tracking-[0.08em] mr-1 font-mono">Should feel:</span>
                      {exercise.feel}
                    </span>
                  </p>
                )}
                {exercise.red_flags && (
                  <p className="flex items-start gap-2 text-[12px] text-ink-soft leading-snug">
                    <AlertTriangle size={12} strokeWidth={2.4} className="text-clay-deep shrink-0 mt-0.5" />
                    <span>
                      <span className="text-clay-deep font-bold uppercase text-[10px] tracking-[0.08em] mr-1 font-mono">Stop if:</span>
                      {exercise.red_flags}
                    </span>
                  </p>
                )}
                {exercise.progression_trigger && (
                  <p className="flex items-start gap-2 text-[12px] text-ink-soft leading-snug">
                    <Zap size={12} strokeWidth={2.4} className="text-ochre shrink-0 mt-0.5" />
                    <span>
                      <span className="text-clay-deep font-bold uppercase text-[10px] tracking-[0.08em] mr-1 font-mono">Progress when:</span>
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
        <ChevronRight size={14} strokeWidth={2.4} className="text-ink-muted shrink-0 self-center" />
      )}
    </motion.div>
  )
}
