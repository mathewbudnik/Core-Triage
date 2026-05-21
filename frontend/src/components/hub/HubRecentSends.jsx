import Surface from '../ui/Surface'
import Eyebrow from '../ui/Eyebrow'
import { useRewardEngine } from '../../lib/rewardEngine'
import { formatGrade } from '../../lib/gradeUtil'

/**
 * Last 5 sends, newest first. Each row shows the grade badge, name or
 * style descriptor, and XP earned. Climbers see the reward loop close —
 * "I logged that V6, I got 180 XP, it's right there in my history."
 */
export default function HubRecentSends() {
  const { state } = useRewardEngine()
  const recent = [...state.sends].reverse().slice(0, 5)

  if (recent.length === 0) {
    return (
      <Surface tier="default" padding="lg" className="mb-3">
        <Eyebrow>Recent sends</Eyebrow>
        <p className="text-[13px] text-ct-cream-soft mt-2">
          Nothing logged. Send something.
        </p>
      </Surface>
    )
  }

  return (
    <Surface tier="default" padding="lg" className="mb-3">
      <Eyebrow divider className="mb-3">Recent sends</Eyebrow>
      <ul className="space-y-2">
        {recent.map((s, i) => (
          <li key={s.ts ?? i}
              className="flex items-center justify-between text-[12px]">
            <span className="flex items-center gap-2 min-w-0 flex-1">
              <span className="bg-ct-terracotta text-ct-forest px-2 py-0.5 rounded text-[11px] font-extrabold tracking-[0.04em]">
                {formatGrade(s.gradeNum)}
              </span>
              <span className="text-ct-cream truncate">
                {s.outcome === 'flash' ? 'flash' : s.outcome === 'project' ? 'project' : 'redpoint'}
                {' · '}
                {s.stylePrimary}
              </span>
            </span>
            <span className="text-ct-terra-soft font-extrabold tabular-nums shrink-0">
              +{s.xpEarned} XP
            </span>
          </li>
        ))}
      </ul>
    </Surface>
  )
}
