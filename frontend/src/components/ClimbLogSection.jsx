import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp } from 'lucide-react'
import GradeCounterRow from './GradeCounterRow'
import StyleChipStrip from './StyleChipStrip'
import { STYLE_ORDER } from '../lib/styleColors'
import { getActiveStyle, setActiveStyle } from '../lib/styleStore'

const V_GRADES   = Array.from({ length: 18 }, (_, i) => `V${i}`)
const YDS_GRADES = [
  '5.6', '5.7', '5.8', '5.9',
  ...['10', '11', '12', '13', '14', '15'].flatMap(n => ['a', 'b', 'c', 'd'].map(l => `5.${n}${l}`)),
]

// Default visible range — keeps the form short for beginners.
const BOULDER_DEFAULT_VISIBLE = 6  // V0–V5
const ROUTE_DEFAULT_VISIBLE   = 6  // 5.6–5.11a

/**
 * Collapsible structured-climbs section. Two sub-tabs (Boulder · Route);
 * each row has Sends · Flashes · Projects counters.
 *
 * Props:
 *   value:       { boulder?: {...}, route?: {...} }   — current climbs dict
 *   onChange:    (next) => void                       — receives a fully replaced climbs dict
 *   defaultTab:  'boulder' | 'route'                  — initial tab; overridden by localStorage if present
 */
export default function ClimbLogSection({ value, onChange, defaultTab = 'boulder', onStyleChange }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState(() => {
    try { return localStorage.getItem('ct_climb_tab') || defaultTab } catch { return defaultTab }
  })
  const [extraBoulder, setExtraBoulder] = useState(0)  // how many "+ harder" clicks
  const [extraRoute, setExtraRoute]     = useState(0)

  const [activeStyle, _setActiveStyle] = useState(getActiveStyle)

  function changeStyle(next) {
    _setActiveStyle(next)
    setActiveStyle(next)
    onStyleChange?.(next)
  }

  const boulderGrades = useMemo(
    () => V_GRADES.slice(0, BOULDER_DEFAULT_VISIBLE + extraBoulder),
    [extraBoulder],
  )
  const routeGrades = useMemo(
    () => YDS_GRADES.slice(0, ROUTE_DEFAULT_VISIBLE + extraRoute),
    [extraRoute],
  )

  function switchTab(t) {
    setTab(t)
    try { localStorage.setItem('ct_climb_tab', t) } catch {}
  }

  function updateCounter(discipline, grade, counters) {
    const next = {
      ...value,
      [discipline]: {
        ...(value?.[discipline] || {}),
        [grade]: counters,
      },
    }
    // Strip fully-zero rows to keep the JSONB compact.
    if (counters.s === 0 && counters.f === 0 && counters.p === 0) {
      delete next[discipline][grade]
    }
    if (Object.keys(next[discipline]).length === 0) {
      delete next[discipline]
    }
    onChange(next)
  }

  return (
    <div className="rounded-lg border border-outline bg-panel/60">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-text"
      >
        Log climbs <span className="text-muted/60 font-normal">(optional)</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3">
              {/* Style chip strip */}
              <StyleChipStrip value={activeStyle} onChange={changeStyle} />

              {/* Tab strip */}
              <div className="flex gap-1 bg-bg/40 rounded-lg p-1">
                {[['boulder', 'Boulder'], ['route', 'Route']].map(([k, label]) => (
                  <button
                    type="button"
                    key={k}
                    onClick={() => switchTab(k)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${
                      tab === k ? 'bg-accent/20 text-accent' : 'text-muted hover:text-text'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Header */}
              <div className="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-1 sm:gap-2 px-1">
                <span />
                <span className="text-[10px] uppercase tracking-wide text-muted text-center">Sends</span>
                <span className="text-[10px] uppercase tracking-wide text-muted text-center">Flashes</span>
                <span className="text-[10px] uppercase tracking-wide text-muted text-center">Projects</span>
              </div>

              {/* Rows */}
              {tab === 'boulder' && (
                <>
                  {boulderGrades.map(g => (
                    <GradeCounterRow
                      key={g}
                      grade={g}
                      counters={value?.boulder?.[g] || { s: 0, f: 0, p: 0 }}
                      activeStyle={activeStyle}
                      onChange={(c) => updateCounter('boulder', g, c)}
                    />
                  ))}
                  {extraBoulder + BOULDER_DEFAULT_VISIBLE < V_GRADES.length && (
                    <button
                      type="button"
                      onClick={() => setExtraBoulder(n => n + 3)}
                      className="text-xs text-accent font-bold hover:underline"
                    >
                      + harder
                    </button>
                  )}
                </>
              )}
              {tab === 'route' && (
                <>
                  {routeGrades.map(g => (
                    <GradeCounterRow
                      key={g}
                      grade={g}
                      counters={value?.route?.[g] || { s: 0, f: 0, p: 0 }}
                      activeStyle={activeStyle}
                      onChange={(c) => updateCounter('route', g, c)}
                    />
                  ))}
                  {extraRoute + ROUTE_DEFAULT_VISIBLE < YDS_GRADES.length && (
                    <button
                      type="button"
                      onClick={() => setExtraRoute(n => n + 4)}
                      className="text-xs text-accent font-bold hover:underline"
                    >
                      + harder
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
