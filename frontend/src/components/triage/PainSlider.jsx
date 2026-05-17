import { motion } from 'framer-motion'

// Severity → hex for the inline color of the big pain value.
// (Spread across the gradient track regardless.)
function painHex(v) {
  if (v <= 3) return '#14b8a6'  // teal
  if (v <= 6) return '#fbbf24'  // gold
  return '#fb7185'              // coral
}

function painLabel(v) {
  if (v === 0) return 'No pain'
  if (v <= 2) return 'Very mild'
  if (v <= 4) return 'Mild'
  if (v <= 6) return 'Moderate'
  if (v <= 8) return 'Severe'
  return 'Worst imaginable'
}

/**
 * Pain slider 0–10. Visual: gradient track that fills from left, big
 * tabular-nums number on the right, label row below.
 *
 * Autoscroll cooperates: parent owns the scroll trigger and only fires it
 * on pointerup/touchend — we expose `onCommit` for that. `onChange` fires
 * on every drag tick (for live UI update); `onCommit` fires once on release.
 *
 * Props:
 *   value:     number (0..10)
 *   onChange:  (n) => void   — fires on every drag tick
 *   onCommit:  () => void    — fires on pointer release (slider has "landed")
 */
export default function PainSlider({ value, onChange, onCommit }) {
  const color = painHex(value)
  const pct = (value / 10) * 100

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-sm font-bold text-text">Pain right now</p>
        <p className="text-[22px] font-extrabold tabular-nums -tracking-[0.02em]"
           style={{ color }}>
          {value}<span className="text-xs font-bold text-muted">/10</span>
        </p>
      </div>

      <div className="relative h-2 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          style={{
            background: 'linear-gradient(90deg, #14b8a6 0%, #fbbf24 60%, #fb7185 100%)',
            backgroundSize: '200% 100%',
          }}
        />
        <input
          type="range"
          min={0}
          max={10}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onPointerUp={() => onCommit?.()}
          onTouchEnd={() => onCommit?.()}
          aria-label="Pain level"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer touch-none"
        />
      </div>

      <div className="flex justify-between mt-2">
        <span className="text-[10px] text-muted">No pain</span>
        <span className="text-[10px] font-bold" style={{ color }}>{painLabel(value)}</span>
        <span className="text-[10px] text-muted">Worst</span>
      </div>
    </div>
  )
}
