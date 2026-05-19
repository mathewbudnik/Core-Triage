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
                                   text-text/30 text-center">
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

          const dotStyle = (() => {
            if (isSelected) return { background: 'var(--tier-light)' }
            if (logged)     return { background: 'var(--tier-c)' }
            if (cell.outside) return { background: 'transparent' }
            if (past && isRest) return { background: 'rgba(255,255,255,0.14)' }
            if (isRest)         return { background: 'transparent' }
            return { background: 'rgba(255,255,255,0.14)' }
          })()

          const numClass = cell.outside
            ? 'text-text/20'
            : isSelected
              ? 'text-white'
              : past
                ? 'text-text/55'
                : isRest
                  ? 'text-text/45'
                  : 'text-text/85'

          const tileClass = [
            'flex flex-col items-center justify-center py-1.5 rounded-xl',
            'border-[0.5px] min-h-[44px] transition-colors',
            isSelected
              ? 'border-[color:color-mix(in_srgb,var(--tier-c)_42%,transparent)]'
              : 'border-transparent hover:bg-white/[0.03]',
          ].join(' ')

          const tileBg = isSelected
            ? { background: 'linear-gradient(180deg, color-mix(in srgb, var(--tier-c) 18%, transparent), color-mix(in srgb, var(--tier-c) 4%, transparent))' }
            : undefined

          // Today badge: a small underline-style dot via inline style only when
          // not selected (selection style already implies "you're looking at today").
          const todayStyle = (isToday && !isSelected && !cell.outside)
            ? { color: 'var(--tier-light)' }
            : undefined

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
              <span className="w-[5px] h-[5px] rounded-full mt-1.5" style={dotStyle} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
