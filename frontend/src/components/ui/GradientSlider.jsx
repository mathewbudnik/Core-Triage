import { motion } from 'framer-motion'

/**
 * Shared range slider with a custom gradient track + visible draggable pill.
 *
 * The native `<input type="range">` sits on top fully transparent (still
 * catches drag/tap), and we render the fill bar + thumb as separate divs so
 * we can fully control their look without fighting per-browser thumb pseudo-
 * elements.
 *
 * Props:
 *   value, min, max, step, onChange — standard range controls
 *   gradient       — CSS background for the fill bar
 *   thumbRingColor — CSS color for the thumb's outer ring (defaults to muted)
 *   ariaLabel      — accessible label for the native input
 */
export default function GradientSlider({
  value, min, max, step = 1, onChange,
  gradient, thumbRingColor = 'rgba(42,39,34,0.30)', ariaLabel,
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="relative h-2.5 rounded-full bg-panel/70 overflow-visible">
      {/* Track fill */}
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ width: `${pct}%`, background: gradient }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.18, ease: [0, 0, 0.2, 1] }}
      />
      {/* Visible draggable pill — non-interactive; the input below catches drags */}
      <motion.div
        className="absolute top-1/2 w-5 h-5 rounded-full bg-cream shadow-[0_2px_8px_rgba(42,39,34,0.30)]
                   ring-2 -translate-y-1/2 -translate-x-1/2 pointer-events-none"
        style={{ left: `${pct}%`, '--tw-ring-color': thumbRingColor }}
        animate={{ left: `${pct}%` }}
        transition={{ duration: 0.18, ease: [0, 0, 0.2, 1] }}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={ariaLabel}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer touch-none"
      />
    </div>
  )
}
