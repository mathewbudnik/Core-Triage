import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Trophy, LogIn, Loader2, Dumbbell, Plus } from 'lucide-react'
import { getProfile, getMe, getPyramid } from '../api'
import { workingTierFromHardest, nextTier } from '../lib/tier'
import TierThemeRoot from './TierThemeRoot'
import TrainingLogEntry from './TrainingLogEntry'
import ProgressTierHero from './ProgressTierHero'
import GradePyramidCard from './GradePyramidCard'
import AwardsStrip from './AwardsStrip'
import ProgressTrendGraph from './ProgressTrendGraph'
import DisplayNamePromptModal from './DisplayNamePromptModal'

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

export default function ProgressTab({ user, onLoginClick }) {
  const navigate = useNavigate()
  const [state, setState] = useState('loading')
  const [error, setError] = useState(null)
  const [displayName, setDisplayName] = useState(user?.display_name ?? null)
  const [logOpen, setLogOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [pyramid, setPyramid] = useState(null)

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
        <DisplayNamePromptModal onDone={async (name) => { setDisplayName(name); try { await getMe() } catch {}; setState('ready') }} />
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

  return (
    <TierThemeRoot hardest={hardest} global>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className="max-w-2xl mx-auto px-4 py-6 md:py-8 space-y-3"
        style={{
          background:
            'radial-gradient(circle at 50% -10%, color-mix(in srgb, var(--tier-c) 28%, transparent) 0%, transparent 55%)',
        }}>

        <div className="px-1 pt-1 pb-2">
          <h1 className="text-2xl sm:text-[28px] font-bold text-text -tracking-[0.025em]">Progress</h1>
          <p className="text-xs text-muted mt-1">Leaderboard, grade pyramid, and your stats</p>
        </div>

        <AnimatePresence mode="wait">
          {logOpen ? (
            <motion.div key="log-form" initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}}>
              <TrainingLogEntry
                onSave={() => { setLogOpen(false); setRefreshKey(k => k+1) }}
                onCancel={() => setLogOpen(false)} />
            </motion.div>
          ) : (
            <motion.button key="log-button" initial={{opacity:0}} animate={{opacity:1}}
              onClick={() => setLogOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold"
              style={{
                background: 'color-mix(in srgb, var(--tier-c) 14%, transparent)',
                border: '0.5px solid color-mix(in srgb, var(--tier-c) 40%, transparent)',
                color: 'var(--tier-light)',
              }}>
              <Plus size={15} /> Log a session
            </motion.button>
          )}
        </AnimatePresence>

        <ProgressTierHero
          tierId={tierId}
          metaLine={metaLine}
          promotionProgress={promotionProgress}
        />
        <GradePyramidCard key={refreshKey} />
        <AwardsStrip user={user} />
        <ProgressTrendGraph />
      </motion.div>
    </TierThemeRoot>
  )
}
