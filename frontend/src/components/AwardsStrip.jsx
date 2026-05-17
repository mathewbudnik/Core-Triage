import { useAwards } from '../hooks/useAwards'
import { AWARD_META } from '../lib/awardCatalog'
import AwardMedal from './AwardMedal'

/**
 * Horizontal-scroll awards strip on the Progress page.
 * Earned medals come first (newest first), then up to N locked.
 *
 * Props:
 *   user:    current user (passed to useAwards)
 *   maxLocked: number  — cap on locked-tier shown (default 4)
 */
export default function AwardsStrip({ user, maxLocked = 4 }) {
  const { loading, earned, locked } = useAwards(user)

  return (
    <div className="rounded-2xl p-4"
         style={{ background: 'rgba(0,0,0,0.35)', border: '0.5px solid rgba(255,255,255,0.1)' }}>
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted mb-3">
        Awards
      </div>
      {loading ? (
        <div className="text-xs text-muted">Loading…</div>
      ) : earned.length === 0 && locked.length === 0 ? (
        <div className="text-xs text-muted/70 italic">No awards yet — log a session to start earning.</div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
          {earned.map((a) => {
            const meta = AWARD_META[a.kind] || {}
            return (
              <AwardTile key={a.kind} meta={meta} sub={meta.sub || formatDate(a.earned_at)} />
            )
          })}
          {locked.slice(0, maxLocked).map((a) => {
            const meta = AWARD_META[a.kind] || { name: a.label || a.kind }
            return <AwardTile key={a.kind} meta={meta} locked sub="Locked" />
          })}
        </div>
      )}
    </div>
  )
}

function AwardTile({ meta, locked = false, sub }) {
  return (
    <div className="shrink-0 w-24 text-center">
      <AwardMedal size="md"
        light={meta.light} mid={meta.c} deep={meta.deep}
        icon={meta.icon} label={meta.label} locked={locked} />
      <div className={`text-[11px] font-semibold mt-2 -tracking-[0.01em] ${locked ? 'text-muted' : 'text-text'}`}>
        {meta.name}
      </div>
      <div className="text-[10px] text-muted/50 mt-0.5">{sub}</div>
    </div>
  )
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const days = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (days < 1) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days/7)}w ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
