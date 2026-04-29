import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Stethoscope, LogIn, Info } from 'lucide-react'
import RehabProtocol from './RehabProtocol'
import { EXERCISE_REGIONS } from '../data/exercises'

const DISPLAY_REGIONS = EXERCISE_REGIONS.filter((r) => r !== 'General')

const PHASE_GUIDE = [
  {
    phase: 1,
    label: 'Phase 1 — Weeks 1–2',
    desc: 'Gentle exercises to reduce pain and keep things moving while your injury heals. Free for everyone.',
    free: true,
  },
  {
    phase: 2,
    label: 'Phase 2 — Weeks 3–6',
    desc: 'Reload the tissue with progressive strength work. You\'re ready here once Phase 1 feels easy.',
    free: false,
  },
  {
    phase: 3,
    label: 'Phase 3 — Week 7+',
    desc: 'Sport-specific exercises to get you back on the wall — hangboard loading, crimp progressions, and return-to-climbing drills.',
    free: false,
  },
]

export default function RehabTab({ user, onLoginClick }) {
  const [region, setRegion] = useState(null)

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Stethoscope size={18} className="text-accent" />
          <h2 className="text-lg font-bold text-text">Rehab Exercise Library</h2>
        </div>
        <p className="text-sm text-muted">
          Already know what's wrong? Pick your injury area and follow the week-by-week exercise plan to get back climbing.
        </p>
      </div>

      {/* Triage vs Rehab callout */}
      <div className="flex items-start gap-3 bg-panel border border-outline rounded-xl px-4 py-3">
        <Info size={14} className="text-accent shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-text mb-0.5">Not sure what's wrong?</p>
          <p className="text-xs text-muted">
            Use <span className="text-accent font-medium">Triage</span> first — it walks you through your symptoms and tells you what's likely injured, how serious it is, and what to do immediately. Come back here for the daily exercises once you know what you're dealing with.
          </p>
        </div>
      </div>

      {/* Phase guide */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted uppercase tracking-wide">How the phases work</p>
        <div className="space-y-2">
          {PHASE_GUIDE.map(({ phase, label, desc, free }) => (
            <div key={phase} className="flex items-start gap-3 bg-panel border border-outline rounded-xl px-4 py-3">
              <div className="w-6 h-6 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold text-accent">
                {phase}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-semibold text-text">{label}</p>
                  {free ? (
                    <span className="text-[9px] font-semibold bg-accent/15 text-accent px-1.5 py-0.5 rounded-full">Free</span>
                  ) : (
                    <span className="text-[9px] font-semibold bg-panel2 text-muted px-1.5 py-0.5 rounded-full border border-outline">Core</span>
                  )}
                </div>
                <p className="text-[11px] text-muted mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Region picker */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted uppercase tracking-wide">Select your injury area</p>
        <div className="flex flex-wrap gap-2">
          {DISPLAY_REGIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
                region === r
                  ? 'bg-accent/15 text-accent border-accent/30 shadow-glow'
                  : 'bg-panel border-outline text-muted hover:text-text hover:border-accent/20'
              }`}
            >
              {r}
            </button>
          ))}
          <button
            onClick={() => setRegion('General')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
              region === 'General'
                ? 'bg-accent/15 text-accent border-accent/30 shadow-glow'
                : 'bg-panel border-outline text-muted hover:text-text hover:border-accent/20'
            }`}
          >
            General
          </button>
        </div>
      </div>

      {/* Protocol */}
      <AnimatePresence mode="wait">
        {region ? (
          <motion.div
            key={region}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="bg-panel2 border border-outline rounded-2xl p-5"
          >
            <RehabProtocol region={region} user={user} />
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center space-y-3"
          >
            <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-outline flex items-center justify-center">
              <Stethoscope size={22} className="text-accent" />
            </div>
            <p className="text-sm font-medium text-text">Select your injury area above</p>
            <p className="text-xs text-muted max-w-xs">
              Choose the body part you're rehabbing and you'll get a structured, week-by-week exercise plan.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login nudge */}
      {!user && (
        <div className="flex items-center justify-between bg-panel border border-outline rounded-xl px-4 py-3">
          <p className="text-xs text-muted">Log in to unlock Phase 2 & 3 exercises</p>
          <button
            onClick={onLoginClick}
            className="flex items-center gap-1.5 text-xs btn-secondary"
          >
            <LogIn size={12} />
            Log in
          </button>
        </div>
      )}
    </div>
  )
}
