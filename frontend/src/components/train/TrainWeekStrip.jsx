import { Check } from 'lucide-react'
import { sessionForDay } from '../../lib/trainSessions'
import { getSessionTypeLabel } from '../../lib/sessionType'

const DAY_LETTER = ['M','T','W','T','F','S','S']
const DAY_LONG = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

function formatLongDate(iso) {
  // 'Wednesday May 14' — friendly to screen readers
  const d = new Date(iso + 'T00:00:00')
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
  return `${DAY_LONG[((d.getDay() + 6) % 7)]} ${months[d.getMonth()]} ${d.getDate()}`
}

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
          today  ? 'text-text' :
          past   ? 'text-text/55' :
          isRest ? 'text-text/30' :
                   'text-text/85'

        // Tile border + bg by state. Today gets its own tier-c outline so the
        // "now" tile reads even when the user has selected a different day.
        const tileClass = [
          'flex flex-col items-center gap-1.5 py-2.5 rounded-2xl',
          'border-[0.5px] transition-colors min-h-[56px] relative',
          active ? 'border-[color:color-mix(in_srgb,var(--tier-c)_42%,transparent)]'
                 : today
                   ? 'border-[color:color-mix(in_srgb,var(--tier-c)_48%,transparent)]'
                   : 'border-transparent hover:bg-white/[0.03]',
        ].join(' ')

        const tileBg = active
          ? { background: 'linear-gradient(180deg, color-mix(in srgb, var(--tier-c) 18%, transparent), color-mix(in srgb, var(--tier-c) 4%, transparent))' }
          : today
            ? { boxShadow: '0 0 12px color-mix(in srgb, var(--tier-c) 18%, transparent)' }
            : {}

        const dayLetterClass = (today || active)
          ? 'font-extrabold' : 'font-bold'
        const dayLetterStyle = (today || active)
          ? { color: 'var(--tier-light)' }
          : { color: 'rgba(255,255,255,0.35)' }

        const session = sessionForDay(plan, iso)
        const typeLabel = getSessionTypeLabel(session?.type || session?.session_type)
        const ariaLabel = [
          formatLongDate(iso),
          today ? 'today' : null,
          typeLabel ? `${typeLabel} session` : (isRest ? 'rest day' : null),
        ].filter(Boolean).join(', ')

        // Indicator: Check icon when the day's session was logged, hollow ring
        // when a session is upcoming, faint dot for past rest days, filled
        // dot when this tile is the selected one. Width reserved so the
        // baseline doesn't shift between states.
        const indicator = (() => {
          if (logged) {
            return (
              <Check size={12} strokeWidth={3} style={{ color: 'var(--tier-c)' }} />
            )
          }
          if (active) {
            return (
              <span className="w-2 h-2 rounded-full"
                    style={{ background: 'var(--tier-light)' }} />
            )
          }
          if (!isRest) {
            // Future-or-today scheduled session that hasn't been logged yet
            return (
              <span className="w-2 h-2 rounded-full"
                    style={{ border: '1.5px solid color-mix(in srgb, var(--tier-c) 55%, transparent)' }} />
            )
          }
          if (past && isRest) {
            return <span className="w-1 h-1 rounded-full bg-white/20" />
          }
          // Future rest: no indicator
          return <span className="w-2 h-2" />
        })()

        return (
          <button
            key={iso}
            type="button"
            onClick={() => onSelectDay(iso)}
            aria-label={ariaLabel}
            className={tileClass}
            style={tileBg}
          >
            <span className={`text-[10px] tracking-[0.05em] ${dayLetterClass}`} style={dayLetterStyle}>
              {DAY_LETTER[i]}
            </span>
            <span className={`text-[15px] font-extrabold leading-none tabular-nums ${dayNumClass}`}>
              {iso.slice(8, 10).replace(/^0/, '')}
            </span>
            <span className="h-3 flex items-center justify-center">
              {indicator}
            </span>
          </button>
        )
      })}
    </div>
  )
}
