import { Check } from 'lucide-react'
import { sessionForDay } from '../../lib/trainSessions'
import { getSessionTypeLabel, getSessionTypeColor } from '../../lib/sessionType'

// hex → rgba with the given alpha, for subtle per-session tile tinting.
function tint(hex, a) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

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
    <div className="grid grid-cols-7 gap-1.5 mt-1">
      {weekDates.map((iso, i) => {
        const today    = isToday(iso)
        const past     = isPast(iso)
        const session  = sessionForDay(plan, iso)
        const hasSess  = !!session
        const logged   = loggedDates?.has(iso)
        const active   = iso === selectedDay
        const isRest   = !hasSess && !logged
        const sessColor = hasSess ? getSessionTypeColor(session?.type || session?.session_type).c : null

        const dayNumClass =
          active ? 'text-ink' :
          today  ? 'text-ink' :
          past   ? 'text-ink-soft' :
          isRest ? 'text-ink-muted' :
                   'text-ink-soft'

        // Tile border + bg by state. Active wins the clay gradient; today
        // keeps a clay glow; an unselected scheduled day gets a subtle wash
        // in its own session color so the week reads chromatically at a glance.
        const tileClass = [
          'flex flex-col items-center gap-1.5 py-2.5 rounded-2xl',
          'border transition-colors min-h-[56px] relative',
          active ? 'border-clay/45'
                 : today
                   ? 'border-clay/50'
                   : 'border-transparent',
        ].join(' ')

        const tileBg = active
          ? { background: 'linear-gradient(180deg, rgba(197,138,119,0.22), rgba(197,138,119,0.06))' }
          : today
            ? { boxShadow: '0 0 12px rgba(197,138,119,0.20)' }
            : (hasSess && sessColor && !isRest)
              ? { background: tint(sessColor, 0.10) }
              : {}

        const dayLetterClass = (today || active)
          ? 'font-bold' : 'font-semibold'
        const dayLetterStyle = (today || active)
          ? { color: '#b06a4f' }
          : { color: 'rgba(141,132,114,0.85)' }

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
              <Check size={12} strokeWidth={3} className="text-sage-deep" />
            )
          }
          if (active) {
            return (
              <span className="w-2 h-2 rounded-full" style={{ background: '#b06a4f' }} />
            )
          }
          if (!isRest) {
            // Future-or-today scheduled session that hasn't been logged yet —
            // ring carries the session-type color.
            return (
              <span className="w-2 h-2 rounded-full border-[1.5px]"
                    style={{ borderColor: sessColor || '#b06a4f' }} />
            )
          }
          if (past && isRest) {
            return <span className="w-1 h-1 rounded-full" style={{ background: 'rgba(42,39,34,0.25)' }} />
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
