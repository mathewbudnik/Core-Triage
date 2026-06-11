import { motion } from 'framer-motion'
import { Check, Loader2, Sparkles } from 'lucide-react'
import { skillColor, skillLabel } from '../../lib/skills'

/**
 * PrescriptionCard — the Home "diagnose -> prescribe" card.
 *
 * Three states:
 *   - active block: skill-tinted field card, 3 drill rows you check off, progress bar
 *   - balanced:     no real gap -> a "well-rounded" rest state (no drills)
 *   - empty:        no sends yet -> a gentle "log sends" nudge
 *
 * Props:
 *   prescription: serialized block { id, axis, status, drills[{key,name,detail,sets,reps,target,done}], progress } | null
 *   gapAxis:      canonical axis key | null
 *   hasSends:     bool — whether the climber has any pentagon at all
 *   onCheck:      (drillKey) => void
 *   checkingKey:  string | null — drill currently posting (shows a spinner)
 */
function hexToRgba(hex, a) {
  const h = hex.replace('#', '')
  const n = parseInt(h, 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

export default function PrescriptionCard({ prescription, gapAxis, hasSends, onCheck, checkingKey = null }) {
  // ── Empty: no sends yet ─────────────────────────────────────────────
  if (!hasSends) {
    return (
      <div className="ct-surface p-5 text-center">
        <p className="ct-eyebrow text-ink-muted">Prescribed for you</p>
        <p className="mt-2 text-[15px] font-semibold text-ink" style={{ fontFamily: 'Fraunces, serif' }}>
          Log a few sends to unlock your prescription
        </p>
        <p className="mt-1 text-[12px] text-ink-soft">Your weakest skill becomes a weekly focus block.</p>
      </div>
    )
  }

  // ── Balanced: a pentagon but no real gap ────────────────────────────
  if (!prescription) {
    return (
      <div className="ct-surface p-5 text-center">
        <div className="mx-auto mb-3 w-11 h-11 rounded-full border-2 border-dashed border-ct-rim flex items-center justify-center">
          <Sparkles size={20} className="text-sage-deep" />
        </div>
        <p className="ct-eyebrow text-ink-muted">No standout gap</p>
        <p className="mt-1.5 text-[16px] font-semibold text-ink" style={{ fontFamily: 'Fraunces, serif' }}>
          Well-rounded right now
        </p>
        <p className="mt-1 text-[12px] text-ink-soft">
          Your five skills are even. Keep climbing — the next gap surfaces as you push grades.
        </p>
      </div>
    )
  }

  // ── Active block ────────────────────────────────────────────────────
  const axis = prescription.axis
  const color = skillColor(axis)
  const label = skillLabel(axis)
  const { current, total, pct } = prescription.progress

  return (
    <div className="ct-surface relative overflow-hidden p-0">
      <div className="absolute inset-y-0 left-0 w-1" style={{ background: color }} />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(120% 80% at 0% 0%, ${hexToRgba(color, 0.1)}, transparent 60%)` }}
      />
      <div className="relative p-4 pl-[18px]">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: color }} />
            <span className="ct-eyebrow" style={{ color }}>Prescribed · {label}</span>
          </div>
          <span className="ct-eyebrow text-ink-muted border border-ct-rim rounded-full px-2 py-0.5">Week 1</span>
        </div>

        <p className="mt-2 text-[18px] leading-tight font-semibold text-ink" style={{ fontFamily: 'Fraunces, serif' }}>
          {label} is your gap
        </p>
        <p className="mt-1 text-[12.5px] text-ink-soft">Your thinnest axis — three drills to thicken it this week.</p>

        <div className="mt-3">
          {prescription.drills.map((d) => {
            const complete = d.done >= d.target
            const busy = checkingKey === d.key
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => !complete && !busy && onCheck(d.key)}
                className="w-full flex items-center gap-3 py-2.5 border-t border-ct-hairline first:border-t-0 text-left"
              >
                <span
                  className="flex-none w-[22px] h-[22px] rounded-full border-[1.8px] flex items-center justify-center"
                  style={{
                    borderColor: complete ? color : 'var(--ct-rim, #bcae8a)',
                    background: complete ? color : 'transparent',
                  }}
                >
                  {busy ? <Loader2 size={12} className="animate-spin text-ink-muted" />
                        : complete ? <Check size={13} className="text-cream" /> : null}
                </span>
                <span className="flex-1 min-w-0">
                  <span className={`block text-[13.5px] font-semibold leading-tight ${complete ? 'text-ink-muted line-through' : 'text-ink'}`}>
                    {d.name}
                  </span>
                  <span className="block ct-meta text-ink-muted mt-0.5">{d.sets} × {d.reps}</span>
                </span>
                <span className="flex-none flex gap-1">
                  {Array.from({ length: d.target }).map((_, i) => (
                    <span
                      key={i}
                      className="w-[7px] h-[7px] rounded-full border-[1.5px]"
                      style={{
                        borderColor: i < d.done ? color : 'var(--ct-rim, #bcae8a)',
                        background: i < d.done ? color : 'transparent',
                      }}
                    />
                  ))}
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-3">
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="ct-eyebrow text-ink-muted">Block progress</span>
            <span className="ct-meta text-ink font-bold ct-tnum">{current} / {total}</span>
          </div>
          <div className="h-[7px] rounded-full bg-ink/[0.10] overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: color }}
              initial={{ width: `${pct}%` }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.16, ease: [0.2, 0.7, 0.2, 1] }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
