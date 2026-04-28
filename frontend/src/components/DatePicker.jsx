import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December']

function parseDate(str) {
  if (!str) return null
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toYMD(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function fmt(str) {
  if (!str) return ''
  const [y, m, d] = str.split('-')
  return `${m}/${d}/${y}`
}

export default function DatePicker({ value, onChange, className = '' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const selected = parseDate(value)
  const today = new Date()

  const [view, setView] = useState(() => {
    const d = selected || today
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function prevMonth() {
    setView(v => {
      const d = new Date(v.year, v.month - 1, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }
  function nextMonth() {
    setView(v => {
      const d = new Date(v.year, v.month + 1, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  // Build calendar grid
  const firstDay = new Date(view.year, view.month, 1).getDay()
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  function selectDay(d) {
    const picked = new Date(view.year, view.month, d)
    onChange(toYMD(picked))
    setOpen(false)
  }

  function isSelected(d) {
    if (!selected || !d) return false
    return selected.getFullYear() === view.year &&
           selected.getMonth() === view.month &&
           selected.getDate() === d
  }

  function isToday(d) {
    if (!d) return false
    return today.getFullYear() === view.year &&
           today.getMonth() === view.month &&
           today.getDate() === d
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 bg-panel border border-outline rounded-lg px-3 py-1.5 text-sm text-text outline-none focus:border-accent hover:border-accent/50 transition-colors text-left"
      >
        <Calendar size={13} className="text-muted shrink-0" />
        <span className={value ? 'text-text' : 'text-muted/50'}>
          {value ? fmt(value) : 'Pick a date'}
        </span>
      </button>

      {/* Popover */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.14 }}
            className="absolute left-0 top-full mt-1.5 z-50 w-64 rounded-xl border border-outline bg-panel2 shadow-2xl p-3"
          >
            {/* Month nav */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={prevMonth}
                className="p-1 rounded-lg text-muted hover:text-text hover:bg-panel transition-colors"
              >
                <ChevronLeft size={15} />
              </button>
              <p className="text-sm font-semibold text-text">
                {MONTHS[view.month]} {view.year}
              </p>
              <button
                onClick={nextMonth}
                className="p-1 rounded-lg text-muted hover:text-text hover:bg-panel transition-colors"
              >
                <ChevronRight size={15} />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAYS.map(d => (
                <div key={d} className="text-center text-[10px] font-semibold text-muted py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-y-0.5">
              {cells.map((d, i) => {
                const sel = isSelected(d)
                const tod = isToday(d)
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!d}
                    onClick={() => d && selectDay(d)}
                    className={`
                      h-8 w-full flex items-center justify-center rounded-lg text-xs font-medium transition-all duration-100
                      ${!d ? 'invisible' : ''}
                      ${sel
                        ? 'bg-accent text-bg font-bold'
                        : tod
                        ? 'border border-accent/50 text-accent'
                        : 'text-text/80 hover:bg-panel hover:text-text'
                      }
                    `}
                  >
                    {d}
                  </button>
                )
              })}
            </div>

            {/* Footer */}
            <div className="flex justify-between mt-3 pt-2.5 border-t border-outline">
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false) }}
                className="text-xs text-muted hover:text-text transition-colors"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => { onChange(toYMD(today)); setOpen(false) }}
                className="text-xs text-accent hover:text-accent/80 font-medium transition-colors"
              >
                Today
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
