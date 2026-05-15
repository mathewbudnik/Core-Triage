import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Trophy, LogIn, Loader2, Dumbbell } from 'lucide-react'
import { getProfile, getMe } from '../api'
import TrainStatsPanel from './TrainStatsPanel'
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
  const [state, setState] = useState('loading') // loading | no-auth | no-profile | needs-name | ready | error
  const [error, setError] = useState(null)
  const [displayName, setDisplayName] = useState(user?.display_name ?? null)

  useEffect(() => {
    setDisplayName(user?.display_name ?? null)
  }, [user?.display_name])

  const load = useCallback(async () => {
    if (!user) { setState('no-auth'); return }
    setState('loading')
    setError(null)
    try {
      const p = await getProfile().catch((err) => {
        if (err.message?.includes('404') || err.message?.includes('not set')) return null
        throw err
      })
      if (!p) { setState('no-profile'); return }
      if (!displayName) { setState('needs-name'); return }
      setState('ready')
    } catch (err) {
      setError(err.message)
      setState('error')
    }
  }, [user, displayName])

  useEffect(() => { load() }, [load])

  if (state === 'no-auth') {
    return (
      <EmptyState
        icon={Trophy}
        title="Sign in to see your progress"
        body="Track your training hours, streaks, and how you stack up against other climbers."
        action={
          <button onClick={onLoginClick} className="btn-primary flex items-center gap-2">
            <LogIn size={15} />
            Log in or create account
          </button>
        }
      />
    )
  }

  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <Loader2 size={24} className="text-accent animate-spin" />
      </div>
    )
  }

  if (state === 'no-profile') {
    return (
      <EmptyState
        icon={Dumbbell}
        title="Set up your training profile first"
        body="Pop over to the Train tab to enter your experience level — then your stats and leaderboard rank will appear here."
        action={
          <button onClick={() => navigate('/train')} className="btn-primary flex items-center gap-2">
            <Dumbbell size={15} />
            Go to Train
          </button>
        }
      />
    )
  }

  if (state === 'error') {
    return (
      <EmptyState
        icon={Trophy}
        title="Something went wrong"
        body={error || 'Could not load your progress data.'}
        action={
          <button onClick={load} className="btn-secondary">Retry</button>
        }
      />
    )
  }

  if (state === 'needs-name') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <DisplayNamePromptModal
          onDone={async (name) => {
            setDisplayName(name)
            try { await getMe() } catch {}
            setState('ready')
          }}
        />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="max-w-2xl mx-auto px-4 py-8"
    >
      <TrainStatsPanel user={user} />
    </motion.div>
  )
}
