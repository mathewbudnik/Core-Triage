import { ChevronRight } from 'lucide-react'

/**
 * Compact "Week N of M · phase" chip rendered above the Train header.
 * Tapping it opens the PlanArcSheet so the climber can jump weeks.
 *
 * Props:
 *   currentWeek: number   — 1-based, computed from today vs plan.start_date
 *   totalWeeks:  number   — plan.duration_weeks
 *   phase:       string   — plan.phase (e.g. 'Power')
 *   onOpen:      () => void
 */
export default function TrainPlanArcChip({ currentWeek, totalWeeks, phase, onOpen }) {
  if (!totalWeeks) return null
  const phaseLabel = phase ? `${phase[0].toUpperCase()}${phase.slice(1)} phase` : null
  const ariaLabel = `Week ${currentWeek} of ${totalWeeks}${phaseLabel ? `, ${phaseLabel}` : ''}. Open plan`
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={ariaLabel}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                 text-[10.5px] font-bold uppercase tracking-[0.10em] tabular-nums
                 bg-ct-terra-tint border border-ct-terracotta/30
                 text-ct-terra-soft hover:text-ct-cream transition-colors"
    >
      <span>Week {currentWeek} of {totalWeeks}</span>
      {phaseLabel && <span className="text-ct-cream/30">·</span>}
      {phaseLabel && <span>{phaseLabel}</span>}
      <ChevronRight size={12} strokeWidth={2.4} className="opacity-70" />
    </button>
  )
}
