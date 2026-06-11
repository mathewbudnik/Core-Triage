import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Activity, ArrowRight, Clock } from 'lucide-react'
import Eyebrow from './ui/Eyebrow'

/**
 * Recover tab when the user has no active triage.
 *
 * Props:
 *   pastTriage: Array<{ id, injury_area, created_at }>  (most recent first, max 5)
 */
export default function RecoverEmptyView({ pastTriage = [] }) {
  const navigate = useNavigate()

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, ease: [0.2, 0.7, 0.2, 1] }}
      className="p-4 md:p-6 max-w-md md:max-w-4xl mx-auto text-ink"
    >
      {/* Header */}
      <Eyebrow className="mb-1">Recover</Eyebrow>
      <h1 className="text-[26px] font-serif font-semibold leading-tight tracking-tight mb-1 text-ink">
        All clear right now
      </h1>
      <p className="text-xs text-ink-soft mb-5">No active triage or rehab plan.</p>

      {/* Hero CTA — Almanac field-card */}
      <div className="ct-surface-hero rounded-2xl p-6 text-center mb-4">
        <div className="inline-flex w-[54px] h-[54px] rounded-2xl items-center justify-center mb-3
                        bg-clay/12 border border-clay/40 text-clay-deep">
          <Activity size={26} strokeWidth={2} />
        </div>
        <h2 className="text-[20px] font-serif font-semibold text-ink mb-2">Something hurts?</h2>
        <p className="text-[13px] text-ink-soft leading-relaxed mb-4 max-w-[280px] mx-auto">
          5-question screen — red-flag warnings, likely injury patterns, and a phase-based rehab plan.
        </p>
        <button
          type="button"
          onClick={() => navigate('/triage')}
          className="btn-primary w-full inline-flex items-center justify-center gap-2"
        >
          Run a screen
          <ArrowRight size={14} strokeWidth={2.6} />
        </button>
      </div>

      <p className="text-center text-xs text-ink-soft mb-8">
        Or browse exercises for prehab + mobility — no injury required.{' '}
        <button onClick={() => navigate('/triage')} className="text-clay-deep font-bold hover:underline">
          Start triage
        </button>
      </p>

      {/* Past triage */}
      {pastTriage.length > 0 && (
        <div>
          <Eyebrow className="mb-2">Past triage</Eyebrow>
          <div className="space-y-2">
            {pastTriage.map((t) => (
              <div
                key={t.id}
                className="ct-surface rounded-2xl p-3 flex items-center gap-3"
              >
                <span className="w-7 h-7 rounded-[10px] bg-sage/15 border border-sage/40
                                 inline-flex items-center justify-center text-sage-deep shrink-0">
                  <Clock size={14} strokeWidth={2} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold leading-tight text-ink">{t.injury_area}</p>
                  <p className="text-[11px] text-ink-soft mt-0.5">
                    {new Date(t.created_at).toLocaleDateString(undefined, {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}
