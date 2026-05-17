import { Flame } from 'lucide-react'

/**
 * Today's three rings + streak chip header.
 *
 * Props:
 *   sends:        { done, goal }    — count of sends logged this week vs goal
 *   climbDays:    { done, goal }    — distinct logged days this week vs goal
 *   pushAttempts: { done, goal }    — push-grade attempts this week vs goal
 *   streakDays:   number
 */
export default function HubRingsCard({ sends, climbDays, pushAttempts, streakDays }) {
  const sendsArc = arcDash(sends)
  const daysArc  = arcDash(climbDays)
  const pushArc  = arcDash(pushAttempts)

  return (
    <div className="relative rounded-2xl overflow-hidden p-4"
         style={{
           background: 'rgba(0,0,0,0.35)',
           border: '0.5px solid rgba(255,255,255,0.1)',
           backdropFilter: 'blur(8px)',
         }}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] font-bold uppercase tracking-[0.08em]"
             style={{ color: 'var(--tier-light)' }}>
          Today
        </div>
        {streakDays > 0 && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: 'rgba(251,191,36,0.16)',
                  color: '#fcd34d',
                  border: '0.5px solid rgba(251,191,36,0.35)',
                }}>
            <Flame size={12} />
            {streakDays} day streak
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <svg width="116" height="116" viewBox="0 0 116 116" className="shrink-0">
          {/* Sends (outer, tier color) */}
          <circle cx="58" cy="58" r="52" fill="none"
                  stroke="color-mix(in srgb, var(--tier-c) 15%, transparent)" strokeWidth="9"/>
          <circle cx="58" cy="58" r="52" fill="none"
                  stroke="var(--tier-c)" strokeWidth="9"
                  strokeDasharray={sendsArc} strokeLinecap="round"
                  transform="rotate(-90 58 58)"/>
          {/* Climb days (middle, coral) */}
          <circle cx="58" cy="58" r="38" fill="none"
                  stroke="rgba(251,113,133,0.15)" strokeWidth="9"/>
          <circle cx="58" cy="58" r="38" fill="none"
                  stroke="#fb7185" strokeWidth="9"
                  strokeDasharray={daysArc} strokeLinecap="round"
                  transform="rotate(-90 58 58)"/>
          {/* Push grade (inner, gold) */}
          <circle cx="58" cy="58" r="24" fill="none"
                  stroke="rgba(251,191,36,0.15)" strokeWidth="9"/>
          <circle cx="58" cy="58" r="24" fill="none"
                  stroke="#fbbf24" strokeWidth="9"
                  strokeDasharray={pushArc} strokeLinecap="round"
                  transform="rotate(-90 58 58)"/>
        </svg>

        <div className="flex-1 flex flex-col gap-2">
          <RingLine label="Sends"      value={sends} />
          <RingLine label="Climb days" value={climbDays} />
          <RingLine label="Push grade" value={pushAttempts} />
        </div>
      </div>
    </div>
  )
}

function RingLine({ label, value }) {
  return (
    <div className="flex items-baseline gap-2 pb-2 border-b border-white/5 last:border-0 last:pb-0">
      <span className="flex-1 text-[11px] uppercase tracking-[0.05em] font-semibold text-muted">
        {label}
      </span>
      <span className="text-[17px] font-bold text-text tabular-nums -tracking-[0.02em]">
        {value.done}
        <span className="text-muted/60 font-medium">/{value.goal}</span>
      </span>
    </div>
  )
}

/** Build an SVG strokeDasharray for `done/goal` on a circle of given circumference. */
function arcDash(value) {
  const circumference = 2 * Math.PI * 52   // outer ring; close enough for all three at this scale
  const frac = Math.min(1, value.done / Math.max(1, value.goal))
  const filled = frac * circumference
  return `${filled} ${circumference - filled}`
}
