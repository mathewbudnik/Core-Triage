import { ChevronRight } from 'lucide-react'
import { TIER_NAMES } from '../../lib/tier'
import TrainStreakChip from './TrainStreakChip'
import Eyebrow from '../ui/Eyebrow'

const DOW_LONG  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function todayDowLabel() {
  const now = new Date()
  return `${DOW_LONG[now.getDay()]} · ${MONTH_SHORT[now.getMonth()]} ${now.getDate()}`
}

/**
 * Compact Train hero card. One frosted-parchment field-card that merges the
 * old floating "Week N of M" chip, the page title + tier pill, the streak
 * chip, and a "Today · <day>" line. Tapping the week chip opens the plan
 * arc sheet so the climber can jump weeks.
 *
 * Props:
 *   tierId:      string | null   — 'v0'..'v10', drives tier-pill text
 *   plan:        object | null   — plan.phase, plan.duration_weeks read here
 *   streakDays:  number          — passed through to TrainStreakChip
 *   currentWeek: number | null   — 1-based current plan week
 *   onOpenPlan:  () => void       — opens the PlanArcSheet (week chip)
 */
export default function TrainHeader({ tierId, plan, streakDays, currentWeek, onOpenPlan }) {
  const todayLine = todayDowLabel()
  const tierName = tierId ? TIER_NAMES[tierId] : null
  const tierLabel = tierId === 'v10' ? 'V10+' : (tierId ? tierId.toUpperCase() : null)
  const phaseLabel = plan?.phase
    ? `${plan.phase[0].toUpperCase()}${plan.phase.slice(1)} phase`
    : null
  const totalWeeks = plan?.duration_weeks || 0

  return (
    <section className="ct-surface rounded-2xl p-4 md:p-5 mb-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Eyebrow className="mb-1">Today · {todayLine}</Eyebrow>
          <h1 className="font-serif text-[28px] sm:text-[30px] font-semibold text-ink -tracking-[0.025em] leading-none mt-1">
            Train.
          </h1>
        </div>
        <div className="shrink-0">
          <TrainStreakChip streakDays={streakDays} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-3">
        {tierId && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                           text-[11px] font-bold text-clay-deep bg-card border border-ct-rim">
            <span className="w-1.5 h-1.5 rounded-full"
                  style={{ background: '#c58a77', boxShadow: '0 0 6px rgba(197,138,119,0.55)' }} />
            <span className="tabular-nums">{tierLabel}</span>
            {tierName && <><span className="text-ink-muted">·</span><span>{tierName}</span></>}
          </span>
        )}

        {totalWeeks > 0 && (
          <button
            type="button"
            onClick={onOpenPlan}
            aria-label={`Week ${currentWeek} of ${totalWeeks}${phaseLabel ? `, ${phaseLabel}` : ''}. Open plan`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                       text-[10.5px] font-bold uppercase tracking-[0.10em] tabular-nums
                       bg-clay text-cream hover:brightness-105 transition-all"
          >
            <span>Week {currentWeek} of {totalWeeks}</span>
            {phaseLabel && <span className="opacity-70">·</span>}
            {phaseLabel && <span>{phaseLabel}</span>}
            <ChevronRight size={12} strokeWidth={2.4} className="opacity-80" />
          </button>
        )}
      </div>
    </section>
  )
}
