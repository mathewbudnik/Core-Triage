import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Activity, ArrowRight, Clock } from 'lucide-react'
import Surface from './ui/Surface'
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
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="px-4 pt-6 pb-24 max-w-2xl mx-auto"
    >
      {/* Header */}
      <Eyebrow className="mb-1">Recover</Eyebrow>
      <h1 className="text-[22px] font-extrabold leading-tight tracking-tight mb-1 text-ct-cream">
        All clear right now
      </h1>
      <p className="text-xs text-ct-cream/60 mb-5">No active triage or rehab plan.</p>

      {/* Hero CTA */}
      <div
        className="relative overflow-hidden rounded-2xl p-6
                   bg-[linear-gradient(135deg,rgba(217,119,87,0.20),rgba(217,119,87,0.04))]
                   border border-ct-terracotta/40 shadow-[0_0_36px_rgba(217,119,87,0.14)]
                   text-center mb-4"
      >
        <div className="inline-flex w-[54px] h-[54px] rounded-2xl items-center justify-center mb-3
                        bg-[linear-gradient(135deg,rgba(217,119,87,0.30),rgba(217,119,87,0.08))]
                        border border-ct-terracotta/50 text-ct-terra-soft
                        shadow-[0_0_18px_rgba(217,119,87,0.30)]">
          <Activity size={26} strokeWidth={2} />
        </div>
        <h2 className="text-[19px] font-extrabold text-ct-cream mb-2">Something hurts?</h2>
        <p className="text-[13px] text-ct-cream/60 leading-relaxed mb-4 max-w-[280px] mx-auto">
          5-question screen — red-flag warnings, likely injury patterns, and a phase-based rehab plan.
        </p>
        <button
          type="button"
          onClick={() => navigate('/triage')}
          className="w-full inline-flex items-center justify-center gap-2
                     px-5 py-3 rounded-xl bg-ct-terracotta text-ct-cream text-sm font-bold
                     hover:brightness-110 active:brightness-95 transition"
        >
          Run a screen
          <ArrowRight size={14} strokeWidth={2.6} />
        </button>
      </div>

      <p className="text-center text-xs text-ct-cream/60 mb-8">
        Or browse exercises for prehab + mobility — no injury required.{' '}
        <button onClick={() => navigate('/triage')} className="text-ct-terra-soft font-bold hover:underline">
          Start triage
        </button>
      </p>

      {/* Past triage */}
      {pastTriage.length > 0 && (
        <div>
          <Eyebrow className="mb-2">Past triage</Eyebrow>
          <div className="space-y-2">
            {pastTriage.map((t) => (
              <Surface
                key={t.id}
                tier="flat"
                padding="sm"
                rounded="rounded-2xl"
                className="flex items-center gap-3 opacity-80"
              >
                <span className="w-7 h-7 rounded-[10px] bg-accent2/10 border border-accent2/30
                                 inline-flex items-center justify-center text-accent2 shrink-0">
                  <Clock size={14} strokeWidth={2} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold leading-tight text-ct-cream">{t.injury_area}</p>
                  <p className="text-[11px] text-ct-cream/60 mt-0.5">
                    {new Date(t.created_at).toLocaleDateString(undefined, {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })}
                  </p>
                </div>
              </Surface>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}
