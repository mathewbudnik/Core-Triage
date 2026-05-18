import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Activity, ArrowRight, Clock } from 'lucide-react'

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
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="px-4 pt-6 pb-24 max-w-2xl mx-auto"
    >
      {/* Header */}
      <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-accent2 mb-1">
        Recover
      </p>
      <h1 className="text-[22px] font-extrabold leading-tight tracking-tight mb-1">
        All clear right now
      </h1>
      <p className="text-xs text-muted mb-5">No active triage or rehab plan.</p>

      {/* Hero CTA */}
      <div
        className="relative overflow-hidden rounded-2xl p-6
                   bg-[linear-gradient(135deg,rgba(251,113,133,0.20),rgba(251,113,133,0.04))]
                   border border-accent2/40 shadow-[0_0_36px_rgba(251,113,133,0.14)]
                   text-center mb-4"
      >
        <div className="inline-flex w-[54px] h-[54px] rounded-2xl items-center justify-center mb-3
                        bg-[linear-gradient(135deg,rgba(251,113,133,0.30),rgba(251,113,133,0.08))]
                        border border-accent2/50 text-accent2
                        shadow-[0_0_18px_rgba(251,113,133,0.30)]">
          <Activity size={26} strokeWidth={2} />
        </div>
        <h2 className="text-[19px] font-extrabold mb-2">Something hurts?</h2>
        <p className="text-[13px] text-muted leading-relaxed mb-4 max-w-[280px] mx-auto">
          5-question screen — red-flag warnings, likely injury patterns, and a phase-based rehab plan.
        </p>
        <button
          type="button"
          onClick={() => navigate('/triage')}
          className="w-full inline-flex items-center justify-center gap-2
                     px-5 py-3 rounded-xl bg-accent2 text-bg text-sm font-bold
                     hover:brightness-110 active:brightness-95 transition"
        >
          Run a screen
          <ArrowRight size={14} strokeWidth={2.6} />
        </button>
      </div>

      <p className="text-center text-xs text-muted mb-8">
        Or browse exercises for prehab + mobility — no injury required.{' '}
        <button onClick={() => navigate('/triage')} className="text-accent font-bold hover:underline">
          Start triage
        </button>
      </p>

      {/* Past triage */}
      {pastTriage.length > 0 && (
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-muted mb-2">
            Past triage
          </p>
          <div className="space-y-2">
            {pastTriage.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 px-3.5 py-3 rounded-2xl
                           bg-panel/45 border border-outline opacity-80"
              >
                <span className="w-7 h-7 rounded-[10px] bg-accent2/10 border border-accent2/30
                                 inline-flex items-center justify-center text-accent2">
                  <Clock size={14} strokeWidth={2} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold leading-tight">{t.injury_area}</p>
                  <p className="text-[11px] text-muted mt-0.5">
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
