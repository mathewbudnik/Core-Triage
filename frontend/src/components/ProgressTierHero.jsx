import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { TIER_NAMES, nextTier } from '../lib/tier'
import DiamondShimmer from './DiamondShimmer'
import Surface from './ui/Surface'

/**
 * Tier hero card on the Progress page.
 *
 * Props:
 *   tierId:               'v0'..'v10'
 *   metaLine:             string   — e.g. "Hardest send last 30 days · 4 V7s · 2 V8 attempts"
 *   promotionProgress:    { current: number, goal: number } | null
 *     // null at v10 (apex) — show "Apex tier" message instead
 */
export default function ProgressTierHero({ tierId, metaLine, promotionProgress }) {
  const navigate = useNavigate()
  const nextId = nextTier(tierId)
  const tierName = TIER_NAMES[tierId]
  const nextName = nextId ? TIER_NAMES[nextId] : null
  const isApex = !nextId
  const frac = promotionProgress
    ? Math.min(1, promotionProgress.current / Math.max(1, promotionProgress.goal))
    : 0
  const remaining = promotionProgress ? Math.max(0, promotionProgress.goal - promotionProgress.current) : 0

  return (
    <Surface
      as="button"
      tier="hero"
      padding="md"
      rounded="rounded-2xl"
      type="button"
      onClick={() => navigate('/progress/awards')}
      aria-label="View all tiers and achievements"
      className="w-full text-left transition-transform hover:scale-[1.005] active:scale-[0.995]">
      {tierId === 'v10' && <DiamondShimmer size="lg" intensity="soft" />}
      <div className="flex items-center justify-between mb-0 relative z-10">
        <p className="ct-eyebrow text-ct-terra-soft">Current tier</p>
        <ChevronRight size={14} className="text-ink-muted" />
      </div>
      <div className="text-2xl font-bold text-ct-cream -tracking-[0.025em] mt-1 mb-0.5">
        {tierId === 'v10' ? 'V10+' : tierId.toUpperCase()} · {tierName}
      </div>
      <div className="text-xs text-ink-soft mb-3">{metaLine}</div>

      {isApex ? (
        <div className="text-xs text-ink-muted italic">Apex tier — V10+ {tierName}.</div>
      ) : (
        <>
          <div className="flex items-baseline justify-between text-[11px] mb-1.5">
            <span className="text-ink-soft uppercase tracking-[0.05em] font-semibold">
              Promotion to {nextId.toUpperCase()} · {nextName}
            </span>
            <span className="text-ct-cream font-bold tabular-nums -tracking-[0.01em]">
              {promotionProgress.current}
              <span className="text-ink-muted font-medium">/{promotionProgress.goal}</span>
            </span>
          </div>
          <div className="h-[5px] rounded-full overflow-hidden bg-ct-hairline">
            <div className="h-full rounded-full bg-gradient-to-r from-ct-terracotta to-ct-terra-soft"
                 style={{ width: `${Math.round(frac * 100)}%` }} />
          </div>
          <div className="text-[11px] text-ink-muted mt-2">
            {remaining} more {nextId.toUpperCase()} send{remaining === 1 ? '' : 's'} within 30 days to advance to {nextName}
          </div>
        </>
      )}
    </Surface>
  )
}
