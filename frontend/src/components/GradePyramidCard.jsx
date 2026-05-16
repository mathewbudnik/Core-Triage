import { useState, useEffect, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { getPyramid } from '../api'

/**
 * Full grade pyramid for ProgressTab. Two columns (Boulder · Route),
 * each row a horizontal stacked bar (flashes · sends · projects).
 * Time window pill: Month | All.
 */
function PyramidColumn({ label, data }) {
  if (!data || (!data.grades?.length && !data.hardest_send && !data.hardest_flash)) {
    return (
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-muted mb-2">
          {label}
        </p>
        <p className="text-xs text-muted/70 italic">No climbs logged yet.</p>
      </div>
    )
  }
  // For bar width: scale to the max counter SUM across the column's rows so
  // the heaviest row is fullest. We don't want columns scaled to each other —
  // boulder and route are independent.
  const maxRowTotal = Math.max(
    1, ...data.grades.map(g => g.s + g.f + g.p),
  )

  return (
    <div className="flex-1 min-w-0 space-y-2">
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-muted">
          {label}
        </p>
        <p className="text-[11px] text-muted">
          {data.hardest_send  && <>send <span className="text-text font-bold">{data.hardest_send}</span></>}
          {data.hardest_send && data.hardest_flash && ' · '}
          {data.hardest_flash && <>flash <span className="text-text font-bold">{data.hardest_flash}</span></>}
        </p>
      </div>
      {data.grades.map(({ grade, s, f, p }) => {
        const w = (n) => `${Math.round((n / maxRowTotal) * 100)}%`
        return (
          <div key={grade} className="space-y-1">
            <div className="flex items-baseline justify-between text-[11px]">
              <span className="text-text font-bold tabular-nums">{grade}</span>
              <span className="text-muted">
                {s > 0 && <>{s} send{s === 1 ? '' : 's'}</>}
                {f > 0 && <> · {f} flash{f === 1 ? '' : 'es'}</>}
                {p > 0 && <> · {p} project{p === 1 ? '' : 's'}</>}
              </span>
            </div>
            <div className="flex h-1.5 rounded-full bg-bg/40 overflow-hidden">
              {f > 0 && <span className="h-full bg-accent" style={{ width: w(f) }} />}
              {s - f > 0 && <span className="h-full bg-accent/60" style={{ width: w(s - f) }} />}
              {p > 0 && <span className="h-full bg-accent3" style={{ width: w(p) }} />}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function GradePyramidCard() {
  const [windowKey, setWindowKey] = useState(() => {
    try { return localStorage.getItem('ct_pyramid_window') || 'month' } catch { return 'month' }
  })
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    getPyramid({ window: windowKey })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [windowKey])

  useEffect(() => { load() }, [load])

  function pickWindow(w) {
    setWindowKey(w)
    try { localStorage.setItem('ct_pyramid_window', w) } catch {}
  }

  const empty = !loading && !error && data
    && !data.boulder?.grades?.length
    && !data.route?.grades?.length

  return (
    <div className="rounded-xl border border-outline bg-panel/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-extrabold text-text">Grade Pyramid</p>
        <div className="flex gap-1 bg-bg/40 rounded-lg p-0.5 text-[11px]">
          {[['month', 'Month'], ['all', 'All']].map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => pickWindow(k)}
              className={`px-2 py-1 rounded-md font-bold transition-colors ${
                windowKey === k ? 'bg-accent/20 text-accent' : 'text-muted hover:text-text'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="py-6 flex justify-center"><Loader2 size={16} className="animate-spin text-accent" /></div>}
      {error && <p className="text-xs text-accent2">{error}</p>}
      {empty && (
        <p className="text-xs text-muted">
          No climbs logged yet. Log a session in Train (set type to bouldering or routes) to see your pyramid grow.
        </p>
      )}
      {!loading && !error && !empty && data && (
        <div className="flex flex-col sm:flex-row gap-6">
          <PyramidColumn label="Boulder" data={data.boulder} />
          <PyramidColumn label="Route" data={data.route} />
        </div>
      )}
    </div>
  )
}
