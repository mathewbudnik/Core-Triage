import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import TrainWeekStrip from './TrainWeekStrip'
import TrainMonthGrid from './TrainMonthGrid'

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

function monthIndexOfIso(iso) { return new Date(iso + 'T00:00:00').getMonth() }
function yearOfIso(iso)       { return new Date(iso + 'T00:00:00').getFullYear() }

const REDUCE_MOTION = typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Calendar wrapper: shows a "Month YYYY" header with an expand button,
 * collapsed = week strip, expanded = full month grid.
 *
 * Same prop surface as TrainWeekStrip so TrainTab can swap it in directly.
 * When the user selects a day from the month grid, the grid auto-collapses
 * so the hero card shows up immediately.
 *
 * Props:
 *   weekDates:   string[7]   — Mon..Sun ISO dates for the displayed week
 *   plan:        object | null
 *   loggedDates: Set<string>
 *   selectedDay: string
 *   onSelectDay: (iso: string) => void
 */
export default function TrainCalendar({ weekDates, plan, loggedDates, selectedDay, onSelectDay }) {
  const [expanded, setExpanded] = useState(false)
  // The month grid can browse months independently of selectedDay so the user
  // can scout future or past months without changing the selected day.
  const [view, setView] = useState(() => ({
    year:  yearOfIso(selectedDay),
    month: monthIndexOfIso(selectedDay),
  }))

  // When selectedDay shifts to a different month (e.g., via the PlanArcSheet),
  // snap the month grid to follow.
  const selYear  = yearOfIso(selectedDay)
  const selMonth = monthIndexOfIso(selectedDay)
  if (!expanded && (view.year !== selYear || view.month !== selMonth)) {
    setView({ year: selYear, month: selMonth })
  }

  function prevMonth() {
    setView((v) => {
      const m = v.month - 1
      return m < 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: m }
    })
  }
  function nextMonth() {
    setView((v) => {
      const m = v.month + 1
      return m > 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: m }
    })
  }

  function handleSelect(iso) {
    onSelectDay(iso)
    if (expanded) setExpanded(false)
  }

  const monthLabel = `${MONTH_NAMES[view.month]} ${view.year}`

  return (
    <div className="mt-1 mb-4">
      <div className="flex items-center justify-between px-1 mb-2">
        {expanded ? (
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={prevMonth}
              aria-label="Previous month"
              className="w-7 h-7 rounded-full inline-flex items-center justify-center
                         text-ct-cream/60 hover:text-ct-cream hover:bg-white/[0.06] transition-colors"
            >
              <ChevronLeft size={14} strokeWidth={2.4} />
            </button>
            <p className="text-[12.5px] font-extrabold tabular-nums px-1 text-ct-cream">{monthLabel}</p>
            <button
              type="button"
              onClick={nextMonth}
              aria-label="Next month"
              className="w-7 h-7 rounded-full inline-flex items-center justify-center
                         text-ct-cream/60 hover:text-ct-cream hover:bg-white/[0.06] transition-colors"
            >
              <ChevronRight size={14} strokeWidth={2.4} />
            </button>
          </div>
        ) : (
          <p className="text-[12.5px] font-extrabold tabular-nums px-1 text-ct-cream">{monthLabel}</p>
        )}
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-label={expanded ? 'Collapse calendar' : 'Expand calendar'}
          aria-expanded={expanded}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full
                     text-[10px] font-extrabold uppercase tracking-[0.08em]
                     text-ct-cream/60 hover:text-ct-cream hover:bg-white/[0.04] transition-colors"
        >
          {expanded ? 'Week' : 'Month'}
          <ChevronDown
            size={11} strokeWidth={2.4}
            className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      <AnimatePresence initial={false} mode="wait">
        {expanded ? (
          <motion.div
            key="month"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: REDUCE_MOTION ? 0 : 0.20, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <TrainMonthGrid
              year={view.year}
              monthIndex={view.month}
              plan={plan}
              loggedDates={loggedDates}
              selectedDay={selectedDay}
              onSelectDay={handleSelect}
            />
          </motion.div>
        ) : (
          <motion.div
            key="week"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: REDUCE_MOTION ? 0 : 0.14 }}
          >
            <TrainWeekStrip
              weekDates={weekDates}
              plan={plan}
              loggedDates={loggedDates}
              selectedDay={selectedDay}
              onSelectDay={onSelectDay}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
