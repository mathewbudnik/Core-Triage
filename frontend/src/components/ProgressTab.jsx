import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Trophy, LogIn, Loader2, Dumbbell, Plus } from 'lucide-react'
import { getProfile, getMe, getPyramid } from '../api'
import { workingTierFromHardest, nextTier } from '../lib/tier'
import { useIsDesktop } from '../hooks/useIsDesktop'
import TierThemeRoot from './TierThemeRoot'
import LogDrawer from './log/LogDrawer'
import ProgressTierHero from './ProgressTierHero'
import GradePyramidCard from './GradePyramidCard'
import AwardsStrip from './AwardsStrip'
import ProgressTrendGraph from './ProgressTrendGraph'
import StatTrends7Day from './progress/StatTrends7Day'
import SegmentNav from './shell/SegmentNav'
import DisplayNamePromptModal from './DisplayNamePromptModal'

const SEG_TRANSITION = { duration: 0.16, ease: [0.2, 0.7, 0.2, 1] } // snappy
const PROGRESS_SEGMENTS = [
  { id: 'tier', label: 'Tier' },
  { id: 'pyramid', label: 'Pyramid' },
  { id: 'trends', label: 'Trends' },
]

function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 py-16 space-y-5">
      <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/25 flex items-center justify-center">
        <Icon size={24} className="text-accent" />
      </div>
      <div>
        <p className="font-semibold text-text">{title}</p>
        <p className="text-sm text-muted mt-1 max-w-xs">{body}</p>
      </div>
      {action}
    </div>
  )
}

export default function ProgressTab({ user, onUserChange, onLoginClick }) {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const [state, setState] = useState('loading')
  const [error, setError] = useState(null)
  const [displayName, setDisplayName] = useState(user?.display_name ?? null)
  const [logOpen, setLogOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [pyramid, setPyramid] = useState(null)
  const [seg, setSeg] = useState('tier')

  useEffect(() => { setDisplayName(user?.display_name ?? null) }, [user?.display_name])

  const load = useCallback(async () => {
    if (!user) { setState('no-auth'); return }
    setState('loading'); setError(null)
    try {
      const p = await getProfile().catch((err) => {
        if (err.message?.includes('404') || err.message?.includes('not set')) return null
        throw err
      })
      if (!p) { setState('no-profile'); return }
      if (!displayName) { setState('needs-name'); return }
      const pyr = await getPyramid({ window: 'month' }).catch(() => null)
      setPyramid(pyr)
      setState('ready')
    } catch (err) {
      setError(err.message); setState('error')
    }
  }, [user, displayName])

  useEffect(() => { load() }, [load, refreshKey])

  if (state === 'no-auth') {
    return (
      <EmptyState icon={Trophy} title="Sign in to see your progress"
        body="Track your tier, grade pyramid, awards, and how you stack up against other climbers."
        action={<button onClick={onLoginClick} className="btn-primary flex items-center gap-2"><LogIn size={15}/>Log in or create account</button>} />
    )
  }
  if (state === 'loading') {
    return <div className="flex items-center justify-center h-full py-24"><Loader2 size={24} className="text-accent animate-spin"/></div>
  }
  if (state === 'no-profile') {
    return (
      <EmptyState icon={Dumbbell} title="Set up your training profile first"
        body="Pop over to the Train tab to enter your experience level — then your stats and tier will appear here."
        action={<button onClick={() => navigate('/train')} className="btn-primary flex items-center gap-2"><Dumbbell size={15}/>Go to Train</button>} />
    )
  }
  if (state === 'error') {
    return <EmptyState icon={Trophy} title="Something went wrong" body={error||'Could not load your progress data.'}
      action={<button onClick={load} className="btn-secondary">Retry</button>} />
  }
  if (state === 'needs-name') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <DisplayNamePromptModal onDone={async (name) => {
          // Update local state immediately so this render advances past the
          // 'needs-name' gate. Then refresh the user object from /me and
          // lift it up so App.jsx's `user` carries the new display_name —
          // without this, navigating away and back re-seeds null into the
          // local displayName state via the user-prop sync effect, and the
          // modal pops again.
          setDisplayName(name)
          try {
            const fresh = await getMe()
            if (fresh) onUserChange?.(fresh)
          } catch {}
          setState('ready')
        }} />
      </div>
    )
  }

  // state === 'ready'
  const hardest = {
    boulder: pyramid?.boulder?.hardest_send || null,
    route:   pyramid?.route?.hardest_send   || null,
  }
  const tierId = workingTierFromHardest(hardest)
  const nextId = nextTier(tierId)
  // Promotion progress: count sends at next tier this month (from pyramid grades)
  let promotionProgress = null
  if (nextId) {
    const nextV = nextId.toUpperCase()
    const row = (pyramid?.boulder?.grades || []).find(r => r.grade === nextV)
    const current = row ? (row.s + row.f) : 0
    promotionProgress = { current, goal: 5 }
  }
  const sendsAtHardest = hardest.boulder
    ? (pyramid?.boulder?.grades?.find(g => g.grade === hardest.boulder)?.s || 0)
    : 0
  const metaLine = hardest.boulder
    ? `Hardest send last 30 days · ${sendsAtHardest} ${hardest.boulder} send${sendsAtHardest === 1 ? '' : 's'}${nextId && promotionProgress ? ` · ${promotionProgress.current} ${nextId.toUpperCase()} attempts` : ''}`
    : 'Hardest send last 30 days · no boulder sends yet'

  const logBar = (
    <>
      <button
        onClick={() => setLogOpen(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold
                   bg-clay text-cream hover:brightness-105 active:brightness-95 transition-all">
        <Plus size={15} /> Log a session
      </button>
      <LogDrawer
        open={logOpen}
        onOpenChange={setLogOpen}
        user={user}
        onLogged={() => { setLogOpen(false); setRefreshKey(k => k + 1) }}
      />
    </>
  )

  const tierSection = (
    <div className="space-y-4">
      <ProgressTierHero
        tierId={tierId}
        metaLine={metaLine}
        promotionProgress={promotionProgress}
      />
      <AwardsStrip user={user} />
    </div>
  )
  const pyramidSection = <GradePyramidCard key={refreshKey} />
  const trendsSection = (
    <div className="space-y-4">
      <StatTrends7Day />
      <ProgressTrendGraph />
    </div>
  )

  return (
    <TierThemeRoot hardest={hardest} global>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className="p-4 md:p-6 max-w-md md:max-w-4xl mx-auto text-ink"
        style={{
          background:
            'radial-gradient(circle at 50% -10%, color-mix(in srgb, var(--tier-c) 28%, transparent) 0%, transparent 55%)',
        }}>

        <div className="px-1 pb-3">
          <h1 className="ct-display">Progress</h1>
          <p className="ct-meta mt-1">Grade pyramid, awards, and your XP trend</p>
        </div>

        <div className="mb-4">{logBar}</div>

        {isDesktop ? (
          <div className="grid grid-cols-2 gap-4">
            <div>{tierSection}</div>
            <div>{pyramidSection}</div>
            <div className="col-span-2">{trendsSection}</div>
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
                  {seg === 'tier' && tierSection}
                  {seg === 'pyramid' && pyramidSection}
                  {seg === 'trends' && trendsSection}
                </motion.div>
              </AnimatePresence>
            </div>
            <SegmentNav
              segments={PROGRESS_SEGMENTS}
              value={seg}
              onChange={setSeg}
              layoutId="progress-seg-pill"
            />
          </>
        )}
      </motion.div>
    </TierThemeRoot>
  )
}
