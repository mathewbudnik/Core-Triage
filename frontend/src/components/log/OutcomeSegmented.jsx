import { motion } from 'framer-motion'

// Outcome ids match the reward engine ('redpoint' is the worked-but-sent
// case); the middle is labelled "Send" in Kaya's vocabulary.
const OUTCOMES = [
  { id: 'flash',    label: 'Flash' },
  { id: 'redpoint', label: 'Send' },
  { id: 'project',  label: 'Project' },
]

/**
 * Three-way segmented control for the send outcome, with a sliding clay pill.
 *
 * Props:
 *   value:    'flash' | 'redpoint' | 'project'
 *   onChange: (id) => void
 */
export default function OutcomeSegmented({ value, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-panel/70 border border-ct-hairline">
      {OUTCOMES.map((o) => {
        const active = o.id === value
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            aria-pressed={active}
            className="relative py-2 rounded-xl text-[13px] font-bold transition-colors"
          >
            {active && (
              <motion.span
                layoutId="outcome-pill"
                className="absolute inset-0 rounded-xl bg-clay/15 border border-clay/45"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className={`relative ${active ? 'text-clay-deep' : 'text-ink-muted'}`}>{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}
