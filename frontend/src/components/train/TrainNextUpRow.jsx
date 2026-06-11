import { sessionForDay, dayStatusFor } from '../../lib/trainSessions'
import { getSessionTypeLabel } from '../../lib/sessionType'

const DOW_LONG = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

function dayOfWeek(iso) {
  return new Date(iso + 'T00:00:00').getDay()
}

function findNext(weekDates, fromDay, plan) {
  const idx = weekDates.indexOf(fromDay)
  if (idx < 0) return null
  for (let i = idx + 1; i < weekDates.length; i++) {
    const iso = weekDates[i]
    const status = dayStatusFor(iso, plan)
    if (status === 'future' || status === 'today') {
      return { iso, session: sessionForDay(plan, iso) }
    }
  }
  return null
}

/**
 * Single-line "Next: Thursday · Endurance · 75 min ›" footer.
 * Tap selects that day in the parent.
 *
 * Props:
 *   weekDates:   string[7]
 *   plan:        object | null
 *   fromDay:     string
 *   onSelectDay: (iso: string) => void
 */
export default function TrainNextUpRow({ weekDates, plan, fromDay, onSelectDay }) {
  const next = findNext(weekDates, fromDay, plan)
  if (!next) {
    return (
      <p className="mt-3 px-1 text-[11.5px] font-semibold text-ink-muted italic">
        End of the week — review your plan ›
      </p>
    )
  }
  const dur = next.session?.duration_min || next.session?.duration_minutes
  const typeLabel = getSessionTypeLabel(next.session?.type || next.session?.session_type)
  const label = [
    DOW_LONG[dayOfWeek(next.iso)],
    typeLabel,
    dur ? `${dur} min` : null,
  ].filter(Boolean).join(' · ')
  return (
    <button
      type="button"
      onClick={() => onSelectDay(next.iso)}
      className="mt-3 px-1 text-left text-[11.5px] font-semibold text-ink-muted hover:text-ct-cream transition-colors"
    >
      Next: <span className="font-bold text-ink-soft">{label}</span> ›
    </button>
  )
}
