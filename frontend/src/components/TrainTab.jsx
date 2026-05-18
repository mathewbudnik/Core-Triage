import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dumbbell, LogIn, Loader2, RefreshCw } from 'lucide-react'
import { getProfile, getActivePlan, generatePlan } from '../api'
import { useHubData } from '../hooks/useHubData'
import { workingTierFromHardest } from '../lib/tier'
import { currentWeekDates, dayStatusFor, sessionForDay } from '../lib/trainSessions'
import TierThemeRoot from './TierThemeRoot'
import ProfileSetup from './ProfileSetup'
import TrainHeader from './train/TrainHeader'
import TrainPlanArcChip from './train/TrainPlanArcChip'
import TrainWeekStrip from './train/TrainWeekStrip'
import TrainHeroCard from './train/TrainHeroCard'
import TrainNextUpRow from './train/TrainNextUpRow'
import PlanArcSheet from './train/PlanArcSheet'
import SessionDetailSheet from './train/SessionDetailSheet'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function currentWeekNumber(plan, todayDate = new Date()) {
  if (!plan?.start_date || !plan?.duration_weeks) return 1
  const start = new Date(plan.start_date + 'T00:00:00')
  const diff = Math.floor((todayDate - start) / 86400000)
  return Math.max(1, Math.min(plan.duration_weeks, Math.floor(diff / 7) + 1))
}

function friendlyPlanError(msg) {
  if (!msg) return 'Could not generate your plan.'
  if (msg.includes('plan_tier_required')) {
    return 'AI training plans unlock during your 14-day trial and stay unlocked with a $7.99/mo subscription. Tap "View plans & pricing" in the sidebar to subscribe.'
  }
  if (msg.includes('plan_limit_reached')) {
    return 'You already have an active plan. Generate a new one only when you\'re ready to start fresh.'
  }
  return msg
}

function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-8 py-16 space-y-5">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
           style={{
             background: 'color-mix(in srgb, var(--tier-c) 12%, transparent)',
             border: '0.5px solid color-mix(in srgb, var(--tier-c) 32%, transparent)',
           }}>
        <Icon size={22} className="text-[var(--tier-light)]" />
      </div>
      <div>
        <p className="text-[15px] font-extrabold text-text -tracking-[0.01em]">{title}</p>
        <p className="text-[12.5px] font-semibold text-muted mt-1 max-w-xs leading-snug">{body}</p>
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

  const [selectedDay, setSelectedDay] = useState(() => todayIso())
  const [sheetOpen, setSheetOpen] = useState(false)
  const [planSheetOpen, setPlanSheetOpen] = useState(false)

  const hub = useHubData(user)
  const tierId = workingTierFromHardest(hub.hardestSends)

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
      await generatePlan({ use_injury_data: true })
      const activePlan = await getActivePlan()
      setPlan(activePlan)
      setState('ready')
    } catch (err) {
      setError(friendlyPlanError(err.message))
      setState('ready')
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
    } catch (err) {
      setError(friendlyPlanError(err.message))
    } finally {
      setGenerating(false)
    }
  }

  const weekDates = useMemo(() => currentWeekDates(selectedDay), [selectedDay])
  const session   = useMemo(() => sessionForDay(plan, selectedDay), [plan, selectedDay])
  const dayStatus = useMemo(() => dayStatusFor(selectedDay, plan), [plan, selectedDay])
  const curWeek   = useMemo(() => currentWeekNumber(plan), [plan])

  // ── Render branches ──────────────────────────────────────────────────────

  if (state === 'no-auth') {
    return (
      <TierThemeRoot hardest={hub.hardestSends} global>
        <div className="max-w-2xl mx-auto px-4 py-8">
          <EmptyState
            icon={Dumbbell}
            title="Sign in to access training"
            body="Your training plan and progress are private. Create a free account to get started."
            action={
              <button onClick={onLoginClick}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-extrabold text-[12.5px]"
                      style={{ background: 'var(--tier-c)', color: 'var(--bg, #06120f)' }}>
                <LogIn size={14} />
                Log in or create account
              </button>
            }
          />
        </div>
      </TierThemeRoot>
    )
  }

  if (state === 'loading') {
    return (
      <TierThemeRoot hardest={hub.hardestSends} global>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 size={22} className="text-[var(--tier-light)] animate-spin" />
        </div>
      </TierThemeRoot>
    )
  }

  if (state === 'setup') {
    return (
      <TierThemeRoot hardest={hub.hardestSends} global>
        <AnimatePresence>
          <motion.div key="setup" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <ProfileSetup user={user} onComplete={handleProfileComplete} />
          </motion.div>
        </AnimatePresence>
      </TierThemeRoot>
    )
  }

  if (state === 'generating') {
    return (
      <TierThemeRoot hardest={hub.hardestSends} global>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center px-8">
          <Loader2 size={28} className="text-[var(--tier-light)] animate-spin" />
          <div>
            <p className="text-[15px] font-extrabold text-text -tracking-[0.01em]">Building your plan…</p>
            <p className="text-[12.5px] font-semibold text-muted mt-1">
              Personalising sessions based on your profile and injury history.
            </p>
          </div>
        </div>
      </TierThemeRoot>
    )
  }

  if (state === 'error') {
    return (
      <TierThemeRoot hardest={hub.hardestSends} global>
        <div className="max-w-2xl mx-auto px-4 py-8">
          <EmptyState
            icon={Dumbbell}
            title="Something went wrong"
            body={error || 'Could not load your training data.'}
            action={
              <button onClick={load}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl
                                 text-[12px] font-bold text-text
                                 bg-white/[0.04] border-[0.5px] border-white/[0.10]
                                 hover:bg-white/[0.06]">
                <RefreshCw size={13} />
                Retry
              </button>
            }
          />
        </div>
      </TierThemeRoot>
    )
  }

  // state === 'ready'
  return (
    <TierThemeRoot hardest={hub.hardestSends} global>
      <div className="relative max-w-2xl mx-auto px-4 py-6 md:py-8"
           style={{
             background:
               'radial-gradient(circle at 50% -10%, color-mix(in srgb, var(--tier-c) 22%, transparent) 0%, transparent 55%)',
           }}>

        {plan && (
          <div className="px-1 mb-1">
            <TrainPlanArcChip
              currentWeek={curWeek}
              totalWeeks={plan.duration_weeks}
              phase={plan.phase}
              onOpen={() => setPlanSheetOpen(true)}
            />
          </div>
        )}

        <TrainHeader tierId={tierId} plan={plan} streakDays={hub.streakDays} />

        <TrainWeekStrip
          weekDates={weekDates}
          plan={plan}
          loggedDates={hub.weekLoggedDates}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
        />

        {plan ? (
          <TrainHeroCard
            session={session}
            dayStatus={dayStatus}
            isoDate={selectedDay}
            onStart={() => setSheetOpen(true)}
          />
        ) : (
          <TrainHeroCard
            noPlan
            onGenerate={handleGeneratePlan}
            generating={generating}
            planError={error}
          />
        )}

        {plan && (
          <TrainNextUpRow
            weekDates={weekDates}
            plan={plan}
            fromDay={selectedDay}
            onSelectDay={setSelectedDay}
          />
        )}

        <button
          onClick={() => setState('setup')}
          className="mt-6 px-1 text-[11px] font-bold text-muted hover:text-text transition-colors"
        >
          Edit profile ›
        </button>

        <PlanArcSheet
          open={planSheetOpen}
          plan={plan}
          onClose={() => setPlanSheetOpen(false)}
          onSelectWeek={(mondayIso) => setSelectedDay(mondayIso)}
        />

        <SessionDetailSheet
          open={sheetOpen}
          session={session}
          onClose={() => setSheetOpen(false)}
          onLogged={load}
        />
      </div>
    </TierThemeRoot>
  )
}
