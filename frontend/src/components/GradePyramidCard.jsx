import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { getPyramid } from '../api'
import { tokenForGrade } from '../lib/tier'
import Surface from './ui/Surface'
import Eyebrow from './ui/Eyebrow'

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
    <motion.div
      className="flex items-center gap-2.5 my-1"
      variants={{
        hidden:  { opacity: 0, y: 6 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.16, ease: [0.2, 0.7, 0.2, 1] } },
      }}
    >
      <span
        className="w-9 text-[12px] font-extrabold text-right tabular-nums tracking-tight"
        style={{ color: hasBar ? token.c : 'var(--ct-ink-muted, #8d8472)' }}
      >
        {grade}
      </span>
      <div className="flex-1 flex justify-center">
        {hasBar && (
          <motion.div
            className="h-[18px] rounded-[5px] flex overflow-hidden"
            style={{ boxShadow: `0 0 12px ${token.c}66` }}
            initial={{ width: 0 }}
            animate={{ width: `${barPct}%` }}
            whileHover={{ boxShadow: `0 0 16px ${token.c}99` }}
            transition={{ duration: 0.16, ease: [0, 0, 0.2, 1] }}
          >
            {f > 0 && (
              <span
                className="h-full"
                style={{ width: `${flashPct}%`, background: '#d7ac5b' }}
                aria-label={`${f} flash${f === 1 ? '' : 'es'}`}
              />
            )}
            <span
              className="h-full"
              style={{ width: `${sendPct}%`, background: token.c }}
              aria-label={`${total - f} send${total - f === 1 ? '' : 's'}`}
            />
          </motion.div>
        )}
      </div>
      <span className="text-[11px] text-ink-soft tabular-nums whitespace-nowrap min-w-[64px] text-left">
        {hasBar ? (
          <>
            {total}
            {f > 0 && <span className="text-ochre"> · ✦{f}</span>}
          </>
        ) : (
          <span className="text-ink-muted">—</span>
        )}
        {p > 0 && (
          <span className="ml-1.5 inline-flex items-center text-[10px] text-ink-muted bg-card border border-ct-rim px-1.5 py-[1px] rounded-full">
            +{p} proj
          </span>
        )}
      </span>
    </motion.div>
  )
}

/**
 * One discipline's pyramid (boulder OR route). Sorts grades hardest→easiest
 * so the hardest sits at the apex of the visible pyramid. The header line
 * doubles as the legend: "hardest V6" with V6 painted its own tier color.
 */
function PyramidColumn({ label, data }) {
  if (!data || (!data.grades?.length && !data.hardest_send && !data.hardest_flash)) {
    return (
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-ink-muted mb-2">
          {label}
        </p>
        <p className="text-xs text-ink-muted italic">No climbs logged yet.</p>
      </div>
    )
  }

  // Sort hardest first. grade_order from the backend is implicit in the
  // returned order (ascending V0→V10+, 5.6→5.15d). Reverse to put hardest
  // at the top of the rendered pyramid.
  const rowsTopDown = [...data.grades].reverse()

  // Bar width is normalised against the largest send-count in the column.
  // Projects (`p`) intentionally do not contribute — the bar represents
  // completed climbs only.
  const maxRowTotal = Math.max(1, ...data.grades.map((g) => g.s))

  const hardestSendToken  = data.hardest_send  ? tokenForGrade(data.hardest_send)  : null
  const hardestFlashToken = data.hardest_flash ? tokenForGrade(data.hardest_flash) : null

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-ink-muted">
          {label}
        </p>
        <p className="text-[11px] text-ink-soft">
          {data.hardest_send && (
            <>
              hardest{' '}
              <span className="font-extrabold" style={{ color: hardestSendToken?.c }}>
                {data.hardest_send}
              </span>
            </>
          )}
          {data.hardest_send && data.hardest_flash && data.hardest_flash !== data.hardest_send && (
            <>
              <span className="text-ink-muted"> · </span>
              flash{' '}
              <span className="font-extrabold" style={{ color: hardestFlashToken?.c }}>
                {data.hardest_flash}
              </span>
            </>
          )}
        </p>
      </div>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden:  { opacity: 1 },
          visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
        }}
      >
        {rowsTopDown.map((g) => (
          <PyramidRow
            key={g.grade}
            grade={g.grade}
            s={g.s}
            f={g.f}
            p={g.p}
            maxRowTotal={maxRowTotal}
          />
        ))}
      </motion.div>
      <p className="text-[10px] text-ink-muted mt-3 pt-2 border-t border-ct-hairline">
        <span className="inline-block w-2 h-2 bg-ochre rounded-sm mr-1.5 align-middle" />
        flash · row color reflects grade tier
      </p>
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
    <Surface tier="default" padding="md" rounded="rounded-2xl">
      <div className="flex items-center justify-between mb-3">
        <Eyebrow>Grade Pyramid</Eyebrow>
        <div className="flex gap-0.5 bg-panel2 border border-ct-hairline rounded-lg p-0.5 text-[11px]">
          {[['month', 'Month'], ['all', 'All']].map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => pickWindow(k)}
              className={`px-2.5 py-1 rounded-md font-bold transition-colors ${
                windowKey === k ? 'bg-clay text-cream' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="py-6 flex justify-center"><Loader2 size={16} className="animate-spin text-clay" /></div>}
      {error && <p className="text-xs text-clay-deep">{error}</p>}
      {empty && (
        <p className="text-xs text-ink-soft">
          No climbs logged yet. Log a session in Train (set type to bouldering or routes) to see your pyramid grow.
        </p>
      )}
      {!loading && !error && !empty && data && (
        <div className="flex flex-col sm:flex-row gap-6">
          <PyramidColumn label="Boulder" data={data.boulder} />
          <PyramidColumn label="Route" data={data.route} />
        </div>
      )}
    </Surface>
  )
}
