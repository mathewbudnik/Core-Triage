import { ArrowRight } from 'lucide-react'
import { sessionForDay, dayStatusFor } from '../../lib/trainSessions'
import { getSessionTypeLabel, getSessionTypeColor } from '../../lib/sessionType'

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
 * "Next up" field-card row with a session-type color accent (left border in
 * the session color). Tapping it selects that day in the parent.
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
      <div className="ct-surface rounded-2xl px-4 py-3.5">
        <p className="text-[11.5px] font-semibold text-ink-muted italic">
          End of the week — review your plan in the calendar above.
        </p>
      </div>
    )
  }
  const rawType = next.session?.type || next.session?.session_type
  const dur = next.session?.duration_min || next.session?.duration_minutes
  const typeLabel = getSessionTypeLabel(rawType)
  const colors = getSessionTypeColor(rawType)
  const meta = [
    typeLabel,
    dur ? `${dur} min` : null,
  ].filter(Boolean).join(' · ')

  return (
    <button
      type="button"
      onClick={() => onSelectDay(next.iso)}
      className="w-full ct-surface rounded-2xl pl-4 pr-3.5 py-3.5 text-left
                 flex items-center justify-between gap-3
                 border-l-4 hover:brightness-[0.99] transition-all"
      style={{ borderLeftColor: colors.c }}
    >
      <div className="min-w-0">
        <p className="ct-eyebrow mb-0.5">Next up</p>
        <p className="text-[14px] font-semibold text-ink leading-tight">
          {DOW_LONG[dayOfWeek(next.iso)]}
        </p>
        {meta && (
          <p className="text-[11.5px] font-semibold text-ink-soft mt-0.5">{meta}</p>
        )}
      </div>
      <span className="shrink-0 w-8 h-8 rounded-full inline-flex items-center justify-center
                       bg-card border border-ct-rim text-clay-deep">
        <ArrowRight size={15} strokeWidth={2.4} />
      </span>
    </button>
  )
}
