import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { TIER_NAMES, nextTier } from '../lib/tier'
import DiamondShimmer from './DiamondShimmer'

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
    <button
      type="button"
      onClick={() => navigate('/progress/awards')}
      aria-label="View all tiers and achievements"
      className="relative rounded-2xl p-4 overflow-hidden w-full text-left
                 transition-transform hover:scale-[1.005] active:scale-[0.995]"
      style={{
        background: 'linear-gradient(135deg, color-mix(in srgb, var(--tier-c) 22%, transparent), color-mix(in srgb, var(--tier-c) 6%, transparent))',
        border: '0.5px solid color-mix(in srgb, var(--tier-c) 45%, transparent)',
        boxShadow: 'inset 0 0 32px color-mix(in srgb, var(--tier-c) 18%, transparent)',
      }}>
      {tierId === 'v10' && <DiamondShimmer size="lg" intensity="soft" />}
      <div className="flex items-center justify-between mb-0 relative z-10">
        <div className="text-[11px] font-bold uppercase tracking-[0.08em]"
             style={{ color: 'var(--tier-light)' }}>
          Current tier
        </div>
        <ChevronRight size={14} className="text-muted/60" />
      </div>
      <div className="text-2xl font-bold text-text -tracking-[0.025em] mt-1 mb-0.5"
           style={{ textShadow: '0 0 14px var(--tier-glow)' }}>
        {tierId === 'v10' ? 'V10+' : tierId.toUpperCase()} · {tierName}
      </div>
      <div className="text-xs text-muted/80 mb-3">{metaLine}</div>

      {isApex ? (
        <div className="text-xs text-muted/70 italic">Apex tier — V10+ {tierName}.</div>
      ) : (
        <>
          <div className="flex items-baseline justify-between text-[11px] mb-1.5">
            <span className="text-muted uppercase tracking-[0.05em] font-semibold">
              Promotion to {nextId.toUpperCase()} · {nextName}
            </span>
            <span className="text-text font-bold tabular-nums -tracking-[0.01em]">
              {promotionProgress.current}
              <span className="text-muted/40 font-medium">/{promotionProgress.goal}</span>
            </span>
          </div>
          <div className="h-[5px] rounded-full overflow-hidden"
               style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div className="h-full rounded-full"
                 style={{
                   width: `${Math.round(frac * 100)}%`,
                   background: 'linear-gradient(90deg, var(--tier-c), var(--tier-light))',
                   boxShadow: '0 0 8px var(--tier-c)',
                 }} />
          </div>
          <div className="text-[11px] text-muted/70 mt-2">
            {remaining} more {nextId.toUpperCase()} send{remaining === 1 ? '' : 's'} within 30 days to advance to {nextName}
          </div>
        </>
      )}
    </button>
  )
}
