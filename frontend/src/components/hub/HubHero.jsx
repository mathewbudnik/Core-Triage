import Surface from '../ui/Surface'
import TierBadge from '../ui/TierBadge'
import Pentagon from '../identity/Pentagon'
import LevelMeter from '../ui/LevelMeter'
import StatStrip from '../ui/StatStrip'
import StreakEmblem from '../ui/StreakEmblem'
import HubStyleStrip from './HubStyleStrip'
import { useRewardEngine } from '../../lib/rewardEngine'
import { useHubData } from '../../hooks/useHubData'
import { vGradeToTier, TIER_NAMES, TIER_TOKENS } from '../../lib/tier'
import { levelFromTotalXP } from '../../lib/xp'
import { deriveStatShape } from '../../lib/stats'

/**
 * Top hero panel — greeting + name + V-grade tier badge.
 * Stat radar + level meter + streak + style strip added in Tasks 10-11.
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

      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-ct-hairline">
        <Pentagon axes={shape} size={110} />
        <div className="flex-1 min-w-0">
          <LevelMeter
            level={level}
            xpInLevel={xpInLevel}
            xpForNext={xpForNext}
            animateOnMount
          />
        </div>
      </div>

      {(state.streak.days > 0 || state.streak.best > 0) && (
        <div className="mt-4">
          <StreakEmblem days={state.streak.days} best={state.streak.best} />
        </div>
      )}

      <div className="mt-4">
        <StatStrip stats={shape} />
      </div>

      <div className="mt-5 pt-4 border-t border-ct-hairline">
        <HubStyleStrip profile={styleProfile} />
      </div>
    </Surface>
  )
}
