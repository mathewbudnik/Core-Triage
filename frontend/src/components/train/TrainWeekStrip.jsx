import { sessionForDay } from '../../lib/trainSessions'

const DAY_LETTER = ['M','T','W','T','F','S','S']

function isToday(iso) {
  return iso === new Date().toISOString().slice(0, 10)
}

function isPast(iso) {
  return iso < new Date().toISOString().slice(0, 10)
}

/**
 * Monday-Sunday strip of seven day tiles. Tap a tile to call onSelectDay.
 *
 * Props:
 *   weekDates:   string[7]                 — ISO dates Mon..Sun for this week
 *   plan:        object | null             — used to know if a day has a session
 *   loggedDates: Set<string>               — ISO dates user has training_logs for
 *   selectedDay: string                    — the day currently in the hero
 *   onSelectDay: (iso: string) => void
 */
export default function TrainWeekStrip({ weekDates, plan, loggedDates, selectedDay, onSelectDay }) {
  return (
    <div className="grid grid-cols-7 gap-1.5 mt-1 mb-4">
      {weekDates.map((iso, i) => {
        const today    = isToday(iso)
        const past     = isPast(iso)
        const hasSess  = !!sessionForDay(plan, iso)
        const logged   = loggedDates?.has(iso)
        const active   = iso === selectedDay
        const isRest   = !hasSess && !logged

        const dayNumClass =
          active ? 'text-white' :
          past   ? 'text-text/55' :
          isRest ? 'text-text/30' :
                   'text-text/85'

        const dotStyle = (() => {
          if (active) return { background: 'var(--tier-light)', boxShadow: '0 0 0 3px color-mix(in srgb, var(--tier-light) 20%, transparent)' }
          if (logged) return { background: 'var(--tier-c)' }
          if (isRest) return { background: 'transparent' }
          return { background: 'rgba(255,255,255,0.14)' }
        })()

        const tileClass = [
          'flex flex-col items-center gap-1.5 py-2.5 rounded-2xl',
          'border-[0.5px] transition-colors min-h-[56px]',
          active ? 'border-[color:color-mix(in_srgb,var(--tier-c)_42%,transparent)]'
                 : 'border-transparent hover:bg-white/[0.03]',
        ].join(' ')

        const tileBg = active
          ? { background: 'linear-gradient(180deg, color-mix(in srgb, var(--tier-c) 18%, transparent), color-mix(in srgb, var(--tier-c) 4%, transparent))' }
          : {}

        const dayLetterClass = (today || active)
          ? 'font-extrabold' : 'font-bold'
        const dayLetterStyle = (today || active)
          ? { color: 'var(--tier-light)' }
          : { color: 'rgba(255,255,255,0.35)' }

        return (
          <button
            key={iso}
            type="button"
            onClick={() => onSelectDay(iso)}
            aria-label={`${DAY_LETTER[i]} ${iso}${today ? ' today' : ''}`}
            className={tileClass}
            style={tileBg}
          >
            <span className={`text-[10px] tracking-[0.05em] ${dayLetterClass}`} style={dayLetterStyle}>
              {DAY_LETTER[i]}
            </span>
            <span className={`text-[15px] font-extrabold leading-none tabular-nums ${dayNumClass}`}>
              {iso.slice(8, 10).replace(/^0/, '')}
            </span>
            <span className="w-[5px] h-[5px] rounded-full" style={dotStyle} />
          </button>
        )
      })}
    </div>
  )
}
