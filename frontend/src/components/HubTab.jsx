import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getMeState, getPentagonSnapshots, getPrescription, checkPrescriptionDrill } from '../api'
import { useIsDesktop } from '../hooks/useIsDesktop'
import { useRewardEngine } from '../lib/rewardEngine'
import { useHubData } from '../hooks/useHubData'
import { levelFromTotalXP } from '../lib/xp'
import Pentagon from './identity/Pentagon'
import IdentityLabel from './identity/IdentityLabel'
import StreakFlame from './identity/StreakFlame'
import PentagonMorphTimeline from './identity/PentagonMorphTimeline'
import HubStyleStrip from './hub/HubStyleStrip'
import TodaysQuestCard from './hub/TodaysQuestCard'
import HubRecentSends from './hub/HubRecentSends'
import HubToolsGrid from './hub/HubToolsGrid'
import HubProjectTile from './hub/HubProjectTile'
import HomeSegmentNav from './hub/HomeSegmentNav'
import PrescriptionCard from './hub/PrescriptionCard'
import CelebrationOverlay from './ui/CelebrationOverlay'

/**
 * Hub — the climber's home screen, "all in one, no long scroll".
 *
 * A pinned identity hero (the single FIFA Pentagon + plain-language identity +
 * apex / streak / level) sits up top. Below it the content is split into three
 * compact sections:
 *   You    — shape over time (morph timeline) + style distribution
 *   Today  — today's quest + recent sends
 *   Tools  — Recover / Train / Coach + your project
 *
 * On mobile a floating frosted pill (HomeSegmentNav) swaps between them so each
 * is one screenful. On desktop there's room, so all three lay out in a grid.
 */

const SEG_TRANSITION = { duration: 0.16, ease: [0.2, 0.7, 0.2, 1] } // snappy

export default function HubTab({ user }) {
  const [state, setState] = useState(null)
  const [snapshots, setSnapshots] = useState([])
  const [seg, setSeg] = useState('today')
  const [rx, setRx] = useState(null)            // { gap_axis, prescription }
  const [checkingKey, setCheckingKey] = useState(null)
  const [celebrate, setCelebrate] = useState(null) // { xp } | null
  const isDesktop = useIsDesktop()
  const { state: engine, awardPrescription } = useRewardEngine()
  const { styleProfile } = useHubData(user)

  const today = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })()

  useEffect(() => {
    let cancelled = false
    Promise.all([getMeState(), getPentagonSnapshots(6), getPrescription(today)])
      .then(([s, ss, r]) => {
        if (cancelled) return
        setState(s)
        setSnapshots(
          (ss.snapshots || []).map((snap) => ({ capturedAt: snap.captured_at, axes: snap.axes })),
        )
        setRx(r)
      })
      .catch((err) => console.error('[HubTab] state fetch failed', err))
    return () => { cancelled = true }
  }, [])

  const { level, xpInLevel, xpForNext } = levelFromTotalXP(engine.totalXP)
  const xpPct = xpForNext > 0 ? Math.min(100, Math.round((xpInLevel / xpForNext) * 100)) : 0

  async function handleCheckDrill(drillKey) {
    if (checkingKey) return
    setCheckingKey(drillKey)
    try {
      const res = await checkPrescriptionDrill({ drill_key: drillKey, date: today })
      setRx((prev) => ({ ...prev, prescription: res.prescription }))
      if (res.completed) {
        if (awardPrescription(res.prescription?.id, res.xp)) setCelebrate({ xp: res.xp })
        // Re-fetch so the next block (new gap) or the balanced state appears.
        getPrescription(today).then(setRx).catch(() => {})
      }
    } catch (err) {
      console.error('[HubTab] check failed', err)
    } finally {
      setCheckingKey(null)
    }
  }

  const hero = (
    <section className="ct-surface p-4 md:p-5 flex flex-col sm:flex-row gap-4 sm:items-center mb-4">
      <div className="flex-shrink-0 mx-auto sm:mx-0">
        <Pentagon axes={state?.pentagon} size={150} tier={state?.tier} showLabels showValues animate />
      </div>
      <div className="flex-1 min-w-0">
        <p className="ct-eyebrow">You are</p>
        <div className="mt-1">
          <IdentityLabel axes={state?.pentagon} recentSends={state?.recent_sends} variant="inline" />
        </div>
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-ct-hairline font-mono text-[11px] text-ink">
          <span className="whitespace-nowrap">APEX <strong>{state?.apex_grade || '—'}</strong></span>
          <StreakFlame days={state?.streak_days_current || 0} size="md" />
          <span className="flex-1 min-w-0">
            <span className="text-ink-muted">LVL {level} · {xpInLevel}/{xpForNext}</span>
            <span className="block h-[5px] mt-1 rounded-full bg-[rgba(42,39,34,0.12)] overflow-hidden">
              <span
                className="block h-full rounded-full bg-gradient-to-r from-clay to-ochre"
                style={{ width: `${xpPct}%` }}
              />
            </span>
          </span>
        </div>
      </div>
    </section>
  )

  const youSection = (
    <div className="space-y-4">
      {snapshots.length >= 2 && <PentagonMorphTimeline snapshots={snapshots} />}
      <div className="ct-surface p-4">
        <HubStyleStrip profile={styleProfile} />
      </div>
    </div>
  )
  const todaySection = (
    <div className="space-y-4">
      <PrescriptionCard
        prescription={rx?.prescription}
        gapAxis={rx?.gap_axis}
        hasSends={!!state?.pentagon}
        onCheck={handleCheckDrill}
        checkingKey={checkingKey}
      />
      <TodaysQuestCard />
      <HubRecentSends />
    </div>
  )
  const toolsSection = (
    <div className="space-y-4">
      <HubToolsGrid />
      <HubProjectTile user={user} />
    </div>
  )

  return (
    <div className="p-4 md:p-6 max-w-md md:max-w-4xl mx-auto text-ink">
      {hero}

      {isDesktop ? (
        <div className="grid grid-cols-2 gap-4">
          <div>{todaySection}</div>
          <div>{toolsSection}</div>
          <div className="col-span-2">{youSection}</div>
        </div>
      ) : (
        <>
          <div className="pb-36">
            <AnimatePresence mode="wait">
              <motion.div
                key={seg}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={SEG_TRANSITION}
              >
                {seg === 'you' && youSection}
                {seg === 'today' && todaySection}
                {seg === 'tools' && toolsSection}
              </motion.div>
            </AnimatePresence>
          </div>
          <HomeSegmentNav value={seg} onChange={setSeg} />
        </>
      )}

      <CelebrationOverlay
        open={!!celebrate}
        onClose={() => setCelebrate(null)}
        title="BLOCK COMPLETE"
        subtitle={celebrate ? `+${celebrate.xp} XP` : ''}
      />
    </div>
  )
}
