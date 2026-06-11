import Surface from '../ui/Surface'
import TierBadge from '../ui/TierBadge'
import LevelMeter from '../ui/LevelMeter'
import StatStrip from '../ui/StatStrip'
import HubStyleStrip from './HubStyleStrip'
import { useRewardEngine } from '../../lib/rewardEngine'
import { useHubData } from '../../hooks/useHubData'
import { vGradeToTier, TIER_NAMES, TIER_TOKENS } from '../../lib/tier'
import { levelFromTotalXP } from '../../lib/xp'
import { deriveStatShape } from '../../lib/stats'

/**
 * Progress panel — greeting + V-grade tier badge + level meter + stat strip
 * + style strip. The identity radar and streak live in the single hero
 * identity strip above (HubTab), so they're intentionally not repeated here.
 */
export default function HubHero({ user }) {
  const { state } = useRewardEngine()
  const { styleProfile } = useHubData(user)

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

  const shape = deriveStatShape(state.sends)
  const { level, xpInLevel, xpForNext } = levelFromTotalXP(state.totalXP)

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

      <div className="mt-4 pt-4 border-t border-ct-hairline">
        <LevelMeter
          level={level}
          xpInLevel={xpInLevel}
          xpForNext={xpForNext}
          animateOnMount
        />
      </div>

      <div className="mt-4">
        <StatStrip stats={shape} />
      </div>

      <div className="mt-5 pt-4 border-t border-ct-hairline">
        <HubStyleStrip profile={styleProfile} />
      </div>
    </Surface>
  )
}
