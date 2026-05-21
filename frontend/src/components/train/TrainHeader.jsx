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
 * Top header inside Train's `ready` state. Day-of-week eyebrow on top,
 * 'Train.' title, tier pill below, streak chip slotted on the right.
 *
 * Props:
 *   tierId:     string | null   — 'v0'..'v10', drives tier-pill text
 *   plan:       object | null   — only plan.phase is read (for the tier pill)
 *   streakDays: number          — passed through to TrainStreakChip
 */
export default function TrainHeader({ tierId, plan, streakDays }) {
  const dowMon = todayDowLabel()
  const tierName = tierId ? TIER_NAMES[tierId] : null
  const tierLabel = tierId === 'v10' ? 'V10+' : (tierId ? tierId.toUpperCase() : null)
  const phaseLabel = plan?.phase
    ? `${plan.phase[0].toUpperCase()}${plan.phase.slice(1)} phase`
    : null

  return (
    <div className="px-1 pt-2 pb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <Eyebrow className="mb-1">{dowMon}</Eyebrow>
        <h1
          className="text-[28px] sm:text-[30px] font-extrabold text-ct-cream -tracking-[0.025em] mt-1 leading-none"
        >
          Train.
        </h1>
        {tierId && (
          <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full
                          text-[11px] font-bold text-ct-cream"
               style={{
                 background: 'rgba(217,119,87,0.12)',
                 border: '0.5px solid rgba(217,119,87,0.35)',
               }}>
            <span className="w-1.5 h-1.5 rounded-full"
                  style={{ background: '#d97757', boxShadow: '0 0 6px rgba(217,119,87,0.55)' }} />
            <span className="tabular-nums">{tierLabel}</span>
            {tierName && <><span className="text-white/30">·</span><span>{tierName}</span></>}
            {phaseLabel && <><span className="text-white/30">·</span><span>{phaseLabel}</span></>}
          </div>
        )}
      </div>
      <div className="shrink-0 mt-1">
        <TrainStreakChip streakDays={streakDays} />
      </div>
    </div>
  )
}
