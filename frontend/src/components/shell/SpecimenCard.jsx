import { useEffect, useState } from 'react'
import Pentagon from '../identity/Pentagon'
import { identityPhrase } from '../../lib/identity'
import { getMeState } from '../../api'
import { useRewardEngine } from '../../lib/rewardEngine'
import { levelFromTotalXP } from '../../lib/xp'

/**
 * SpecimenCard — the sidebar identity card in the Almanac shell.
 *
 * Layout (per sidebar mockup): a mini Pentagon emblem on the left; on the
 * right the climber's name (Fraunces), a plain-language identity line, and a
 * "LVL n · x / y XP" meter with a clay→ochre gradient fill.
 *
 * Data sources mirror the existing Hub surfaces so the card stays consistent:
 *   - pentagon axes come from the shared me-state payload (getMeState), the
 *     same source HubTab reads.
 *   - level / XP come from the reward engine (useRewardEngine + levelFromTotalXP),
 *     the same source HubHero reads.
 *
 * Empty state: when signed out, or before me-state loads, the card renders a
 * resting Pentagon plus an onboarding nudge so it never looks broken.
 *
 * Props:
 *   user: optional signed-in user (drives the display name + gating the fetch)
 */
export default function SpecimenCard({ user }) {
  const [axes, setAxes] = useState(null)
  const { state } = useRewardEngine()

  useEffect(() => {
    if (!user) {
      setAxes(null)
      return
    }
    let cancelled = false
    getMeState()
      .then((s) => {
        if (!cancelled) setAxes(s?.pentagon ?? null)
      })
      .catch(() => {
        if (!cancelled) setAxes(null)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  const name = user?.display_name || user?.name || user?.username || 'Climber'
  const { title } = identityPhrase(axes)
  const { level, xpInLevel, xpForNext } = levelFromTotalXP(state.totalXP)
  const pct = xpForNext > 0 ? Math.min(100, Math.round((xpInLevel / xpForNext) * 100)) : 0

  const idLine = user ? title : 'Sign in to log climbs'

  return (
    <div className="rounded-lg border border-ct-rim bg-card p-2.5 flex items-center gap-2.5 shadow-[0_3px_10px_rgba(42,39,34,0.08)] mb-3.5">
      <div className="shrink-0">
        <Pentagon axes={axes} mini size={58} animate={false} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-serif font-semibold text-[13px] leading-none text-ink truncate">
          {name}
        </div>
        <div className="text-[9.5px] text-ink-soft mt-0.5 mb-1.5 truncate">{idLine}</div>
        <div className="font-mono text-[8px] tracking-[0.08em] text-ink-muted mb-1">
          LVL {level} · {xpInLevel} / {xpForNext} XP
        </div>
        <div className="h-[5px] rounded-[3px] bg-[rgba(42,39,34,0.12)] overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-clay to-ochre"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}
