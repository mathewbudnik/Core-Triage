import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useAwards } from '../hooks/useAwards'
import { AWARD_META } from '../lib/awardCatalog'
import AwardMedal from './AwardMedal'
import Surface from './ui/Surface'
import Eyebrow from './ui/Eyebrow'

/**
 * Horizontal-scroll awards strip on the Progress page.
 * Earned medals come first (newest first), then up to N locked.
 * Header includes a "View all" link to the full /progress/awards page.
 *
 * Props:
 *   user:    current user (passed to useAwards)
 *   maxLocked: number  — cap on locked-tier shown (default 4)
 */
export default function AwardsStrip({ user, maxLocked = 4 }) {
  const navigate = useNavigate()
  const { loading, earned, locked } = useAwards(user)

  return (
    <Surface tier="default" padding="md" rounded="rounded-2xl" className="!overflow-visible">
      <div className="flex items-center justify-between mb-3">
        <Eyebrow>Awards</Eyebrow>
        <button
          type="button"
          onClick={() => navigate('/progress/awards')}
          className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-muted hover:text-text transition-colors"
        >
          View all
          <ChevronRight size={11} />
        </button>
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
    </Surface>
  )
}

function AwardTile({ meta, locked = false, sub }) {
  const isMystery = !!meta.mystery && locked
  const displayName = isMystery ? '???' : meta.name
  const displaySub  = isMystery ? 'Mystery' : sub
  return (
    <div className="shrink-0 w-24 text-center">
      <AwardMedal size="md"
        light={meta.light} mid={meta.c} deep={meta.deep}
        icon={meta.icon} label={meta.label} locked={locked} mystery={isMystery} />
      <div className={`text-[11px] font-semibold mt-2 -tracking-[0.01em] ${locked ? 'text-muted' : 'text-text'}`}>
        {displayName}
      </div>
      <div className="text-[10px] text-muted/50 mt-0.5">{displaySub}</div>
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
