import { useRef, useState } from 'react'
import { motion } from 'framer-motion'

// Severity → hex for the inline color of the big pain value AND the right
// edge of the gradient track. Keeping these in lock-step is the whole point —
// the bar should always reach the same color the value label shows.
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

// Gradient that always ENDS at the color the current value owns, so the
// rightmost pixel of the filled bar matches the value-label color.
function painGradient(v) {
  if (v <= 3) return 'linear-gradient(90deg, #14b8a6 0%, #14b8a6 100%)'
  if (v <= 6) return 'linear-gradient(90deg, #14b8a6 0%, #fbbf24 100%)'
  return 'linear-gradient(90deg, #14b8a6 0%, #fbbf24 50%, #fb7185 100%)'
}

/**
 * Pain slider 0–10. Mobile-friendly: tall hit area, visible draggable thumb,
 * tap-anywhere-on-track to set value. `onChange` fires on every drag tick;
 * `onCommit` fires once on pointer release (parent uses it to autoscroll).
 *
 * Props:
 *   value:     number (0..10)
 *   onChange:  (n) => void
 *   onCommit:  () => void
 */
export default function PainSlider({ value, onChange, onCommit }) {
  const trackRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const color = painHex(value)
  const pct = (value / 10) * 100

  function valueFromClientX(clientX) {
    const el = trackRef.current
    if (!el) return value
    const rect = el.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return Math.round(ratio * 10)
  }

  function onPointerDown(e) {
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    const next = valueFromClientX(e.clientX)
    if (next !== value) onChange(next)
  }

  function onPointerMove(e) {
    if (!dragging) return
    const next = valueFromClientX(e.clientX)
    if (next !== value) onChange(next)
  }

  function onPointerUp(e) {
    if (!dragging) return
    setDragging(false)
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {}
    onCommit?.()
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      const next = Math.min(10, value + 1)
      if (next !== value) onChange(next)
      onCommit?.()
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      const next = Math.max(0, value - 1)
      if (next !== value) onChange(next)
      onCommit?.()
    }
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-sm font-bold text-ct-cream">Pain right now</p>
        <p className="text-[22px] font-extrabold tabular-nums -tracking-[0.02em]"
           style={{ color }}>
          {value}<span className="text-xs font-bold text-ink-soft">/10</span>
        </p>
      </div>

      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Pain level"
        aria-valuemin={0}
        aria-valuemax={10}
        aria-valuenow={value}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className="relative h-11 flex items-center cursor-pointer touch-none select-none
                   outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded-full"
      >
        <div className="relative w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.18, ease: [0, 0, 0.2, 1] }}
            style={{ background: painGradient(value) }}
          />
        </div>
        <motion.div
          className="absolute top-1/2 w-6 h-6 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.35)]
                     border-[0.5px] border-white/40 pointer-events-none"
          animate={{ left: `${pct}%` }}
          transition={{ duration: 0.12, ease: [0, 0, 0.2, 1] }}
          style={{ translateX: '-50%', translateY: '-50%' }}
        />
      </div>

      <div className="flex justify-between mt-2">
        <span className="text-[10px] text-ink-soft">No pain</span>
        <span className="text-[10px] font-bold" style={{ color }}>{painLabel(value)}</span>
        <span className="text-[10px] text-ink-soft">Worst</span>
      </div>
    </div>
  )
}
