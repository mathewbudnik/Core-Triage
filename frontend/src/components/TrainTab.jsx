import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dumbbell, LogIn, Loader2, Sparkles, RefreshCw } from 'lucide-react'
import { getProfile, getActivePlan, generatePlan } from '../api'
import ProfileSetup from './ProfileSetup'
import PlanView from './PlanView'

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

export default function TrainTab({ user, dbReady, onLoginClick }) {
  const [state, setState] = useState('loading') // loading | no-auth | setup | generating | ready | error
  const [profile, setProfile] = useState(null)
  const [plan, setPlan] = useState(null)
  const [error, setError] = useState(null)
  const [generating, setGenerating] = useState(false)

  const load = useCallback(async () => {
    if (!user) { setState('no-auth'); return }
    setState('loading')
    setError(null)
    try {
      const p = await getProfile().catch((err) => {
        if (err.message?.includes('404') || err.message?.includes('not set')) return null
        throw err
      })
      if (!p) { setState('setup'); return }
      setProfile(p)
      const activePlan = await getActivePlan().catch((err) => {
        if (err.message?.includes('404') || err.message?.includes('No active')) return null
        throw err
      })
      setPlan(activePlan)
      setState('ready')
    } catch (err) {
      setError(err.message)
      setState('error')
    }
  }, [user])

  useEffect(() => { load() }, [load])

  async function handleProfileComplete(savedProfile) {
    setProfile(savedProfile)
    setState('generating')
    setGenerating(true)
    setError(null)
    try {
      const result = await generatePlan({ use_injury_data: true })
      setPlan(result.plan ? { ...result.plan, id: result.id, plan_data: result.plan.plan_data } : null)
      // Reload from server for proper format
      const activePlan = await getActivePlan()
      setPlan(activePlan)
      setState('ready')
    } catch (err) {
      setError(err.message)
      setState('ready') // fall through to plan-less ready state
    } finally {
      setGenerating(false)
    }
  }

  async function handleGeneratePlan() {
    setGenerating(true)
    setError(null)
    try {
      await generatePlan({ use_injury_data: true })
      const activePlan = await getActivePlan()
      setPlan(activePlan)
      setState('ready')
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  // ---- Render states ----

  if (state === 'no-auth') {
    return (
      <EmptyState
        icon={Dumbbell}
        title="Sign in to access training"
        body="Your training plan and progress are private. Create a free account to get started."
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

  if (state === 'setup') {
    return (
      <AnimatePresence>
        <motion.div
          key="setup"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="h-full overflow-auto"
        >
          <ProfileSetup onComplete={handleProfileComplete} />
        </motion.div>
      </AnimatePresence>
    )
  }

  if (state === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 space-y-4 text-center px-8">
        <Loader2 size={28} className="text-accent animate-spin" />
        <div>
          <p className="font-semibold text-text">Building your plan…</p>
          <p className="text-sm text-muted mt-1">Personalising sessions based on your profile and injury history.</p>
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <EmptyState
        icon={Dumbbell}
        title="Something went wrong"
        body={error || 'Could not load your training data.'}
        action={
          <button onClick={load} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={14} />
            Retry
          </button>
        }
      />
    )
  }

  // state === 'ready'
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Profile summary strip */}
      {profile && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-outline bg-panel px-4 py-3 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center">
              <Dumbbell size={16} className="text-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text capitalize">
                {profile.experience_level} · {profile.primary_discipline}
              </p>
              <p className="text-xs text-muted">
                {profile.days_per_week}×/wk · goal: {profile.primary_goal?.replace(/_/g, ' ')}
                {profile.max_grade_boulder ? ` · max ${profile.max_grade_boulder}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={() => setState('setup')}
            className="text-xs text-muted hover:text-text border border-outline px-2.5 py-1 rounded-lg hover:border-accent/40 transition-colors"
          >
            Edit
          </button>
        </motion.div>
      )}

      {/* Plan or CTA to generate */}
      <AnimatePresence mode="wait">
        {plan ? (
          <motion.div key="plan" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <PlanView plan={plan} onRefresh={load} />
          </motion.div>
        ) : (
          <motion.div
            key="no-plan"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-accent/25 bg-accent/5 px-6 py-10 flex flex-col items-center text-center space-y-5"
          >
            <div className="w-14 h-14 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center">
              <Sparkles size={22} className="text-accent" />
            </div>
            <div>
              <p className="font-bold text-text text-lg">Ready to build your plan</p>
              <p className="text-sm text-muted mt-1 max-w-sm">
                We'll generate a 4-week personalised training plan based on your profile
                and adapt it around any injuries in your history.
              </p>
            </div>
            {error && <p className="text-xs text-accent2">{error}</p>}
            <button
              onClick={handleGeneratePlan}
              disabled={generating}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              {generating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {generating ? 'Generating…' : 'Generate my plan'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
