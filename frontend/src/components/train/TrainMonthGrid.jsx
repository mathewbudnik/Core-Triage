import { Check } from 'lucide-react'
import { sessionForDay } from '../../lib/trainSessions'

const DAY_LETTER = ['M','T','W','T','F','S','S']

function todayIso() { return new Date().toISOString().slice(0, 10) }

function toIso(y, m, d) {
  const yy = String(y)
  const mm = String(m + 1).padStart(2, '0')
  const dd = String(d).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

function daysInMonth(y, m) {
  // Day 0 of next month = last day of this month
  return new Date(y, m + 1, 0).getDate()
}

// Monday-start: how many cells before the 1st of the month?
function firstCellOffset(y, m) {
  return (new Date(y, m, 1).getDay() + 6) % 7
}

/**
 * Full-month grid (Mon-Sun). 6 rows × 7 cols. Days outside the displayed
 * month dim down but stay tappable so the user can jump backward / forward
 * without a month-nav arrow row.
 *
 * Props:
 *   year:        number    — full year of the displayed month
 *   monthIndex:  number    — 0..11
 *   plan:        object | null
 *   loggedDates: Set<string>
 *   selectedDay: string    — currently selected ISO
 *   onSelectDay: (iso: string) => void
 */
export default function TrainMonthGrid({ year, monthIndex, plan, loggedDates, selectedDay, onSelectDay }) {
  const today = todayIso()
  const offset = firstCellOffset(year, monthIndex)
  const dim    = daysInMonth(year, monthIndex)
  const prevDim = daysInMonth(year, monthIndex - 1)

  const cells = []
  // Leading days from the previous month
  for (let i = 0; i < offset; i++) {
    const d  = prevDim - offset + 1 + i
    const py = monthIndex === 0 ? year - 1 : year
    const pm = (monthIndex + 11) % 12
    cells.push({ day: d, iso: toIso(py, pm, d), outside: true })
  }
  // Current month
  for (let d = 1; d <= dim; d++) {
    cells.push({ day: d, iso: toIso(year, monthIndex, d), outside: false })
  }
  // Trailing days from the next month — fill to 42 cells (6 rows × 7)
  while (cells.length < 42) {
    const d  = cells.length - offset - dim + 1
    const ny = monthIndex === 11 ? year + 1 : year
    const nm = (monthIndex + 1) % 12
    cells.push({ day: d, iso: toIso(ny, nm, d), outside: true })
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1.5 px-0.5">
        {DAY_LETTER.map((l, i) => (
          <span key={i} className="text-[9.5px] font-bold uppercase tracking-[0.06em]
                                   text-ink-muted text-center">
            {l}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          const isToday    = cell.iso === today
          const isSelected = cell.iso === selectedDay
          const past       = cell.iso < today
          const hasSession = !!sessionForDay(plan, cell.iso)
          const logged     = loggedDates?.has(cell.iso)
          const isRest     = !hasSession && !logged

          const numClass = cell.outside
            ? 'text-ink-muted'
            : isSelected
              ? 'text-ink'
              : isToday
                ? 'text-ink'
                : past
                  ? 'text-ink-soft'
                  : isRest
                    ? 'text-ink-muted'
                    : 'text-ink-soft'

          // Today gets a terracotta border + soft glow even when not selected.
          // Selected wins the tile-bg gradient; today-style falls through.
          const tileClass = [
            'flex flex-col items-center justify-center py-1.5 rounded-xl',
            'border-[0.5px] min-h-[44px] transition-colors',
            isSelected
              ? 'border-ct-terracotta/45'
              : (isToday && !cell.outside)
                ? 'border-ct-terracotta/50'
                : 'border-transparent hover:bg-ink/[0.04]',
          ].join(' ')

          const tileBg = isSelected
            ? { background: 'linear-gradient(180deg, rgba(197,138,119,0.22), rgba(197,138,119,0.06))' }
            : (isToday && !cell.outside)
              ? { boxShadow: '0 0 10px rgba(197,138,119,0.18)' }
              : undefined

          const todayStyle = (isToday && !isSelected && !cell.outside)
            ? { color: '#b06a4f' }
            : undefined

          const indicator = (() => {
            if (cell.outside) {
              return <span className="w-2 h-2" />
            }
            if (logged) {
              return <Check size={11} strokeWidth={3} className="text-ct-moss" />
            }
            if (isSelected) {
              return <span className="w-2 h-2 rounded-full bg-ct-terra-soft" />
            }
            if (!isRest) {
              return (
                <span className="w-2 h-2 rounded-full border-[1.5px] border-ct-terracotta/55" />
              )
            }
            if (past && isRest) {
              return <span className="w-1 h-1 rounded-full bg-ink/25" />
            }
            return <span className="w-2 h-2" />
          })()

          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelectDay(cell.iso)}
              aria-label={cell.iso + (isToday ? ' today' : '')}
              className={tileClass}
              style={tileBg}
            >
              <span className={`text-[13px] font-extrabold tabular-nums leading-none ${numClass}`}
                    style={todayStyle}>
                {cell.day}
              </span>
              <span className="h-3 mt-1 flex items-center justify-center">
                {indicator}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
