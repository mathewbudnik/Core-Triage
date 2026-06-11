import { Flame, RotateCcw } from 'lucide-react'

/**
 * The "recovering" strip for the Recover hero: a phase ladder + a streak tile +
 * a 7-day adherence tile. This is an ADHERENCE signal (did you show up), never a
 * clinical recovery verdict.
 *
 * Props:
 *   serverPhase: { phase, day_in_phase, phase_length, days } | null
 *   streak:      number  — consecutive days with >=1 check-off
 *   last7:       { count, days: [bool x7] }  — oldest -> newest
 */
export default function RecoverRecoveringStrip({ serverPhase, streak = 0, last7 }) {
  if (!serverPhase) return null
  const { phase, day_in_phase } = serverPhase
  const days = last7?.days ?? Array(7).fill(false)
  const count = last7?.count ?? 0

  return (
    <div className="mt-3">
      {/* phase ladder */}
      <div className="flex items-center gap-1.5">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={`flex-1 h-[5px] rounded-full ${
              n < phase ? 'bg-sage' : n === phase ? 'bg-sage-deep' : 'bg-[rgba(42,39,34,0.10)]'
            }`}
          />
        ))}
      </div>
      <p className="mt-1.5 text-[10px] font-mono uppercase tracking-[0.1em] text-ink-muted">
        Phase {phase} of 3 · day {day_in_phase}
      </p>

      {/* recovering stats */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="rounded-xl border border-ct-rim bg-paper px-3 py-2.5">
          <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-ink-muted">
            <Flame size={12} className="text-clay-deep" strokeWidth={2.2} /> Streak
          </span>
          <span className="block mt-0.5 font-serif font-semibold text-[21px] text-ink leading-none">
            {streak}<span className="text-[11px] font-sans font-semibold text-ink-muted ml-1">days</span>
          </span>
        </div>
        <div className="rounded-xl border border-ct-rim bg-paper px-3 py-2.5">
          <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-ink-muted">
            <RotateCcw size={12} className="text-sage-deep" strokeWidth={2.2} /> Last 7 days
          </span>
          <span className="block mt-0.5 font-serif font-semibold text-[21px] text-ink leading-none">
            {count}<span className="text-[11px] font-sans font-semibold text-ink-muted ml-1">of 7</span>
          </span>
          <span className="flex gap-1 mt-1.5">
            {days.map((on, i) => (
              <span
                key={i}
                className={`w-[8px] h-[8px] rounded-full ${
                  on ? 'bg-sage-deep' : 'border-[1.5px] border-ct-rim'
                }`}
              />
            ))}
          </span>
        </div>
      </div>
    </div>
  )
}
