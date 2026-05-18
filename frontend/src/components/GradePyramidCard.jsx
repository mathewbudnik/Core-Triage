import { useState, useEffect, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { getPyramid } from '../api'
import { tokenForGrade } from '../lib/tier'

/**
 * One row in the pyramid: tier-colored bar + grade label + count.
 *
 * Bar segmentation:
 *   - flash portion (gold)        — width = (f / s) of the bar
 *   - send  portion (tier color)  — width = ((s - f) / s) of the bar
 * The bar's overall width is `(s / maxRowTotal) * 100%`. Projects (p) do NOT
 * contribute to bar width — they only render as the footer chip.
 */
function PyramidRow({ grade, s, f, p, maxRowTotal }) {
  const token = tokenForGrade(grade)
  const total = Math.max(0, s)
  const flashPct = total > 0 ? (f / total) * 100 : 0
  const sendPct  = total > 0 ? ((total - f) / total) * 100 : 0
  const barPct   = maxRowTotal > 0 ? (total / maxRowTotal) * 100 : 0
  const hasBar   = barPct > 0
  return (
    <div className="flex items-center gap-2.5 my-1">
      <span
        className="w-9 text-[12px] font-extrabold text-right tabular-nums tracking-tight"
        style={{ color: hasBar ? token.c : 'rgba(232,238,252,0.45)' }}
      >
        {grade}
      </span>
      <div className="flex-1 flex justify-center">
        {hasBar && (
          <div
            className="h-[18px] rounded-[5px] flex overflow-hidden"
            style={{
              width: `${barPct}%`,
              boxShadow: `0 0 12px ${token.c}66`,
            }}
          >
            {f > 0 && (
              <span
                className="h-full"
                style={{ width: `${flashPct}%`, background: '#fbbf24' }}
                aria-label={`${f} flash${f === 1 ? '' : 'es'}`}
              />
            )}
            <span
              className="h-full"
              style={{ width: `${sendPct}%`, background: token.c }}
              aria-label={`${total - f} send${total - f === 1 ? '' : 's'}`}
            />
          </div>
        )}
      </div>
      <span className="text-[11px] text-muted tabular-nums whitespace-nowrap min-w-[64px] text-left">
        {hasBar ? (
          <>
            {total}
            {f > 0 && <span className="text-accent3"> · ✦{f}</span>}
          </>
        ) : (
          <span className="text-muted/60">—</span>
        )}
        {p > 0 && (
          <span className="ml-1.5 inline-flex items-center text-[10px] text-muted/80 bg-white/[0.06] border border-white/10 px-1.5 py-[1px] rounded-full">
            +{p} proj
          </span>
        )}
      </span>
    </div>
  )
}

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
        {/* Legend doubles as hardest-grade summary. Colors mirror the bar
            segments so the user can decode the rows without a separate key:
            gold = flash, teal/green = send, coral/muted = project. */}
        <p className="text-[11px] text-muted">
          {data.hardest_send  && (
            <>
              <span className="text-accent">send </span>
              <span className="text-accent font-bold">{data.hardest_send}</span>
            </>
          )}
          {data.hardest_send && data.hardest_flash && <span className="text-muted/40"> · </span>}
          {data.hardest_flash && (
            <>
              <span className="text-accent3">flash </span>
              <span className="text-accent3 font-bold">{data.hardest_flash}</span>
            </>
          )}
        </p>
      </div>
      {data.grades.map(({ grade, s, f, p }) => {
        const w = (n) => `${Math.round((n / maxRowTotal) * 100)}%`
        // Non-flash sends = total sends minus flashes (don't double-count).
        const regularSends = Math.max(0, s - f)
        return (
          <div key={grade} className="space-y-1">
            <div className="flex items-baseline justify-between text-[11px]">
              <span className="text-text font-bold tabular-nums">{grade}</span>
              {/* Single muted line — the bar below is the visual key.
                  Tiny colored dots act as the legend without flooding the
                  text with three competing colors. */}
              <span className="text-muted flex items-center gap-1.5">
                {f > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent3" />
                    {f} flash{f === 1 ? '' : 'es'}
                  </span>
                )}
                {regularSends > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    {regularSends} send{regularSends === 1 ? '' : 's'}
                  </span>
                )}
                {p > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-text/30" />
                    {p} project{p === 1 ? '' : 's'}
                  </span>
                )}
              </span>
            </div>
            {/* 8a.nu-aligned palette:
                  flash   = gold/amber  (highest distinction — first try clean)
                  send    = teal/green  (solid achievement)
                  project = muted gray  (in progress, no warning connotation) */}
            <div className="flex h-1.5 rounded-full bg-bg/40 overflow-hidden">
              {f > 0           && <span className="h-full bg-accent3" style={{ width: w(f) }} />}
              {regularSends > 0 && <span className="h-full bg-accent"  style={{ width: w(regularSends) }} />}
              {p > 0           && <span className="h-full bg-text/25"  style={{ width: w(p) }} />}
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
