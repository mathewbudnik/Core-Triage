import Surface from '../ui/Surface'
import TierBadge from '../ui/TierBadge'
import { useRewardEngine } from '../../lib/rewardEngine'
import { vGradeToTier, TIER_NAMES, TIER_TOKENS } from '../../lib/tier'

/**
 * Top hero panel — greeting + name + V-grade tier badge.
 * Stat radar + level meter + streak + style strip added in Tasks 10-11.
 */
export default function HubHero() {
  const { state } = useRewardEngine()

  // Highest grade across all styles drives the tier badge.
  // bestPerStyle values are numbers 0-10 (or null); -1 sentinel means no sends.
  const bestGrade = Math.max(
    -1,
    ...Object.values(state.bestPerStyle).filter((v) => v !== null && v !== undefined),
  )
  const hasAnySend = bestGrade >= 0
  const tierId = hasAnySend ? vGradeToTier(`V${Math.min(bestGrade, 10)}`) : null
  const tier = tierId
    ? { name: TIER_NAMES[tierId], color: TIER_TOKENS[tierId]?.c }
    : null

  return (
    <Surface tier="hero" padding="lg" className="mb-3">
      <div className="flex justify-between items-start">
        <div>
          <p className="ct-meta">Welcome back</p>
          <h1 className="text-[22px] font-extrabold text-ct-cream leading-tight tracking-[-0.02em] mt-1">
            Climb Clean.
          </h1>
        </div>
        {tier && (
          <TierBadge
            name={(tier.name || 'CLIMBER').toString().toUpperCase()}
            color={tier.color || '#d97757'}
          />
        )}
      </div>
    </Surface>
  )
}
