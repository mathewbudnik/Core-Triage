import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Lock } from 'lucide-react'
import { useAwards } from '../hooks/useAwards'
import { AWARD_META } from '../lib/awardCatalog'
import { getPyramid } from '../api'
import { TIER_NAMES, TIER_TOKENS, V_TIERS, workingTierFromHardest } from '../lib/tier'
import AwardMedal from './AwardMedal'
import DiamondShimmer from './DiamondShimmer'

/**
 * Full awards + tiers page. Two sections:
 *   1. Tier ladder — all 11 tiers top-to-bottom. Tiers at or below the
 *      user's working tier are earned (color); higher are locked (greyed).
 *   2. Achievements grid — every catalog entry. Earned = full medal,
 *      locked = padlock or "???" (when mystery).
 *
 * Reached from /progress by clicking the Current-Tier hero or the
 * "View all" link on the awards strip.
 *
 * Props:
 *   user:    current auth user
 *
 * Fetches its own grade pyramid to derive the working tier — separate
 * from ProgressTab's fetch (cheap query, simpler than threading state).
 */
export default function AwardsPage({ user }) {
  const navigate = useNavigate()
  const { loading, earned, locked } = useAwards(user)
  const [pyramid, setPyramid] = useState(null)

  useEffect(() => {
    if (!user) { setPyramid(null); return }
    let cancelled = false
    getPyramid({ window: 'all' })
      .then((p) => { if (!cancelled) setPyramid(p) })
      .catch(() => { if (!cancelled) setPyramid(null) })
    return () => { cancelled = true }
  }, [user])

  // Working tier from the user's hardest send (all-time). Falls back to v0.
  const workingTier = useMemo(() => {
    const hardest = {
      boulder: pyramid?.boulder?.hardest_send,
      route:   pyramid?.route?.hardest_send,
    }
    return workingTierFromHardest(hardest)
  }, [pyramid])

  const workingIdx = V_TIERS.indexOf(workingTier)

  return (
    <div className="px-4 md:px-8 py-6 max-w-3xl mx-auto">
      <button
        type="button"
        onClick={() => navigate('/progress')}
        className="flex items-center gap-1 text-xs text-muted hover:text-text transition-colors mb-4"
      >
        <ArrowLeft size={13} />
        Back to Progress
      </button>

      {/* ── Tier ladder ───────────────────────────────────────────── */}
      <section className="mb-8">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.10em] text-muted mb-3">
          Tiers
        </p>
        <ul className="space-y-2">
          {[...V_TIERS].reverse().map((tierId) => {
            const idx = V_TIERS.indexOf(tierId)
            const isEarned = idx <= workingIdx
            const isCurrent = idx === workingIdx
            const t = TIER_TOKENS[tierId]
            const name = TIER_NAMES[tierId]
            const gradeLabel = tierId === 'v10' ? 'V10+' : tierId.toUpperCase()
            return (
              <li
                key={tierId}
                className={`relative overflow-hidden flex items-center gap-3 px-3.5 py-3 rounded-xl border-[0.5px]
                            transition-all
                            ${isCurrent
                              ? 'border-[var(--tier-c)] shadow-[0_0_24px_var(--tier-glow)]'
                              : isEarned
                                ? 'border-ink/[0.12]'
                                : 'border-ink/[0.08] opacity-50'}`}
                style={{
                  background: isEarned
                    ? `linear-gradient(135deg, ${t.c}30, ${t.c}10)`
                    : 'rgba(42,39,34,0.03)',
                }}
              >
                {tierId === 'v10' && isEarned && <DiamondShimmer size="sm" intensity="soft" />}
                {/* Color swatch / lock */}
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border-[0.5px]"
                  style={{
                    background: isEarned ? `linear-gradient(180deg, ${t.light}, ${t.c})` : 'rgba(42,39,34,0.05)',
                    borderColor: isEarned ? t.deep : 'rgba(42,39,34,0.14)',
                    color: isEarned ? '#fdf6ea' : 'rgba(42,39,34,0.38)',
                  }}
                >
                  {isEarned ? <Check size={14} strokeWidth={3} /> : <Lock size={13} />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span
                      className="text-sm font-extrabold tabular-nums -tracking-[0.01em]"
                      style={{ color: isEarned ? t.deep : 'rgba(42,39,34,0.45)' }}
                    >
                      {gradeLabel}
                    </span>
                    <span className={`text-[13px] font-bold truncate ${isEarned ? 'text-text' : 'text-muted/70'}`}>
                      {name}
                    </span>
                  </div>
                </div>

                {isCurrent && (
                  <span
                    className="text-[10px] font-extrabold uppercase tracking-[0.08em] px-2 py-0.5 rounded-full border-[0.5px]"
                    style={{ color: t.deep, borderColor: t.c, background: `${t.c}26` }}
                  >
                    Current
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      {/* ── Achievements grid ──────────────────────────────────────── */}
      <section>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.10em] text-muted mb-3">
          Achievements
        </p>

        {loading ? (
          <p className="text-xs text-muted/70 italic">Loading…</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-3 gap-y-5">
            {earned.map((a) => {
              const meta = AWARD_META[a.kind] || {}
              return <Tile key={`e-${a.kind}`} meta={meta} earned />
            })}
            {locked.map((a) => {
              const meta = AWARD_META[a.kind] || { name: a.label || a.kind }
              return <Tile key={`l-${a.kind}`} meta={meta} locked />
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function Tile({ meta, earned = false, locked = false }) {
  const isMystery = !!meta.mystery && locked
  const displayName = isMystery ? '???' : meta.name
  const displaySub  = isMystery ? 'Mystery' : meta.sub

  return (
    <div className="text-center">
      <AwardMedal
        size="md"
        light={meta.light}
        mid={meta.c}
        deep={meta.deep}
        icon={meta.icon}
        label={meta.label}
        locked={locked}
        mystery={isMystery}
      />
      <div className={`text-[11px] font-semibold mt-2 -tracking-[0.01em] truncate
                       ${earned ? 'text-text' : 'text-muted'}`}>
        {displayName}
      </div>
      {displaySub && (
        <div className="text-[10px] text-muted/50 mt-0.5 truncate">{displaySub}</div>
      )}
    </div>
  )
}
