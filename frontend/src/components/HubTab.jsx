import { useEffect, useState } from 'react'
import HubHero from './hub/HubHero'
import TodaysQuestCard from './hub/TodaysQuestCard'
import HubToolsGrid from './hub/HubToolsGrid'
import HubProjectTile from './hub/HubProjectTile'
import HubRecentSends from './hub/HubRecentSends'
import { getMeState, getPentagonSnapshots } from '../api'
import Pentagon from './identity/Pentagon'
import IdentityLabel from './identity/IdentityLabel'
import StreakFlame from './identity/StreakFlame'
import PentagonMorphTimeline from './identity/PentagonMorphTimeline'

/**
 * Hub — the climber's home screen. Identity + reward-engine surface.
 *
 * Layout (top to bottom):
 *   0. Identity hero strip — Pentagon + IdentityLabel + StreakFlame + apex grade
 *      (Plan #1 addition — sits above the legacy HubHero. Plan #4 will rebuild
 *      the full surface; for now both coexist.)
 *   0b. PentagonMorphTimeline — last N monthly snapshots, when available.
 *   1. HubHero — greeting + name + tier badge + stat radar + level meter + streak + style strip
 *   2. TodaysQuestCard — today's daily quest with progress
 *   3. HubProjectTile — your active project (the boss climb)
 *   4. HubToolsGrid — Recover / Train / Ask coach
 *   5. HubRecentSends — last 5 sends with XP earned per row
 */
export default function HubTab({ user }) {
  const [state, setState] = useState(null)
  const [snapshots, setSnapshots] = useState([])

  useEffect(() => {
    let cancelled = false
    Promise.all([getMeState(), getPentagonSnapshots(6)])
      .then(([s, ss]) => {
        if (cancelled) return
        setState(s)
        setSnapshots(ss.snapshots || [])
      })
      .catch((err) => console.error('[HubTab] state fetch failed', err))
    return () => { cancelled = true }
  }, [])

  return (
    <div className="min-h-screen bg-ct-forest text-ct-cream p-4 pb-24 max-w-md mx-auto">
      {state && state.pentagon && (
        <section
          className="rounded-2xl p-5 md:p-6 flex flex-col md:flex-row gap-5 md:items-center mb-4"
          style={{ background: 'var(--ct-paper-base)', border: '1px solid var(--ct-ink-quiet)' }}
        >
          <div className="flex-shrink-0 mx-auto md:mx-0">
            <Pentagon
              axes={state.pentagon}
              size={180}
              tier={state.tier}
              showLabels
              animate
            />
          </div>
          <div className="flex-1 flex flex-col gap-3">
            <div className="font-mono text-[10px] tracking-[0.22em] uppercase font-bold" style={{ color: 'var(--ct-ink-quiet)' }}>
              you are
            </div>
            <IdentityLabel
              axes={state.pentagon}
              recentSends={state.recent_sends}
              variant="inline"
            />
            <div className="flex items-center gap-4 mt-2 pt-3" style={{ borderTop: '1px dashed var(--ct-ink-quiet)' }}>
              <StreakFlame days={state.streak_days_current} size="md" />
              <div className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--ct-ink-quiet)' }}>
                APEX <strong style={{ color: 'var(--ct-ink)' }}>{state.apex_grade || '—'}</strong>
              </div>
            </div>
          </div>
        </section>
      )}

      {snapshots.length >= 2 && (
        <section className="mb-4">
          <PentagonMorphTimeline snapshots={snapshots} />
        </section>
      )}

      <HubHero user={user} />
      <TodaysQuestCard />
      <HubProjectTile user={user} />
      <HubToolsGrid />
      <HubRecentSends />
    </div>
  )
}
