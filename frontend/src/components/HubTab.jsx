import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useHubData } from '../hooks/useHubData'
import { pickFeatured, hasTriageWithin } from '../lib/pickFeatured'
import { rehabProgress } from '../lib/rehabHeuristic'
import HubGreeting from './HubGreeting'
import HubFeaturedCard from './HubFeaturedCard'
import HubToolCard from './HubToolCard'
import HubSocialStrip from './HubSocialStrip'

// Map a plan session's `type` field to the human label used on Train tab.
// (Mirrors TYPE_LABEL in PlanView.jsx — kept inline to avoid a cross-file
// import for one mapping.)
const SESSION_TYPE_LABEL = {
  hangboard: 'Hangboard', power: 'Power', project: 'Project',
  strength: 'Strength', endurance: 'Endurance',
  technique: 'Technique', rest: 'Rest',
}

// ── Derive each tool's status + (for the featured slot) its rich content ──

function statusForTriage(data) {
  if (data.lastTriage) {
    return { status: data.lastTriage.injury_area, isLive: true }
  }
  return { status: 'No active triage', isLive: false }
}

function statusForRehab(data) {
  const rp = rehabProgress(data.lastTriage?.created_at)
  if (!rp || !data.lastTriage || !hasTriageWithin(data, 90)) {
    return { status: 'No active rehab', isLive: false, progress: null }
  }
  return {
    status: `Phase ${rp.phase} · Day ${rp.dayInPhase}`,
    isLive: false,
    progress: rp.progress,
  }
}

function statusForTrain(data) {
  if (!data.activePlan) {
    return { status: 'Build a plan', isLive: false }
  }
  if (data.todayLogged) {
    return { status: 'Logged today', isLive: false }
  }
  if (data.todaySession) {
    return { status: "Today's session ready", isLive: true }
  }
  return { status: 'Rest day', isLive: false }
}

function statusForChat(data) {
  if (hasTriageWithin(data, 90)) {
    return { status: 'Ask about your recovery', isLive: false }
  }
  return { status: 'Ask anything', isLive: false }
}

const STATUS_FNS = {
  triage: statusForTriage,
  rehab:  statusForRehab,
  train:  statusForTrain,
  chat:   statusForChat,
}

// ── Rich content for the featured slot ───────────────────────────────────

function featuredContent(toolKey, data) {
  if (toolKey === 'train' && data.todaySession) {
    const s = data.todaySession
    const exercises = (s.main || []).slice(0, 3).map((e) => e.exercise).join(' · ')
    const totalSessions = data.activePlan?.plan_data?.sessions?.length || 1
    return {
      eyebrow:   'Today · Train',
      title:     `${SESSION_TYPE_LABEL[s.type] || s.type} · ${s.duration_min} min`,
      detail:    `Week ${s.week} · Day ${s.day_in_week}${data.lastTriage ? ' — be mindful of your ' + data.lastTriage.injury_area.toLowerCase() : ''}.`,
      subDetail: exercises || null,
      progress:  { value: (s.session_index + 1) / totalSessions,
                   label: `Session ${s.session_index + 1} of ${totalSessions}` },
      ctaLabel:  'Start session',
      onCta:     (nav) => nav(`/train`),
    }
  }
  if (toolKey === 'train' && !data.todaySession) {
    return {
      eyebrow:   'Today · Train',
      title:     data.activePlan ? 'Rest day' : 'No active plan',
      detail:    data.activePlan
        ? 'Today is a scheduled rest day — recover hard so tomorrow lands.'
        : 'Generate a 4-week training plan tailored to your goals.',
      subDetail: null,
      progress:  null,
      ctaLabel:  data.activePlan ? 'View this week' : 'Build a plan',
      onCta:     (nav) => nav('/train'),
    }
  }
  if (toolKey === 'rehab' && data.lastTriage) {
    const rp = rehabProgress(data.lastTriage.created_at)
    return {
      eyebrow:   'Today · Rehab',
      title:     `Phase ${rp.phase} · ${data.lastTriage.injury_area}`,
      detail:    `Day ${rp.dayInPhase} of ${rp.phaseLength} — week ${Math.ceil(rp.dayInPhase/7)} of ${Math.ceil(rp.phaseLength/7)}.`,
      subDetail: 'Follow your phase exercises — keep pain at or below 3/10.',
      progress:  { value: rp.progress, label: `Phase ${rp.phase} · ${Math.round(rp.progress*100)}% complete` },
      ctaLabel:  'Continue rehab',
      onCta:     (nav) => nav(`/rehab/${data.lastTriage.injury_area.toLowerCase().replace(/\s+/g, '-')}`),
    }
  }
  if (toolKey === 'triage') {
    return {
      eyebrow:   'Start here',
      title:     'Where does it hurt?',
      detail:    'Answer a few quick questions and get red-flag screening plus likely injury patterns.',
      subDetail: 'Educational only — not a medical diagnosis.',
      progress:  null,
      ctaLabel:  'Start triage',
      onCta:     (nav) => nav('/triage'),
    }
  }
  // Chat as featured — rarely picked but handle gracefully
  return {
    eyebrow:   'Ask',
    title:     'Chat with the assistant',
    detail:    'Ask anything about training, climbing injuries, load management, or recovery.',
    subDetail: null,
    progress:  null,
    ctaLabel:  'Open chat',
    onCta:     (nav) => nav('/chat'),
  }
}

// ── The page ─────────────────────────────────────────────────────────────

export default function HubTab({ user }) {
  const navigate = useNavigate()
  const data = useHubData(user)
  const autoPick = useMemo(() => pickFeatured(data), [data])

  // The user can manually swap the featured slot. While `manualPick` is null
  // we use the auto-picked tool; once set it sticks for this mount.
  const [manualPick, setManualPick] = useState(null)
  const featuredKey = manualPick || autoPick

  if (data.loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={20} className="text-accent animate-spin" />
      </div>
    )
  }

  const smallKeys = ['triage', 'rehab', 'train', 'chat'].filter((k) => k !== featuredKey)
  const fc = featuredContent(featuredKey, data)

  return (
    <div className="relative px-4 py-8 md:py-10 max-w-2xl mx-auto">
      {/* Ambient orbs — same language as App.jsx + Landing */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-20 -left-10 w-72 h-72 bg-accent/16 rounded-full blur-3xl" />
        <div className="absolute -top-16 -right-10 w-64 h-64 bg-accent2/12 rounded-full blur-3xl" />
      </div>

      <HubGreeting user={user} data={data} />

      <div className="grid grid-cols-1 md:grid-cols-[1.55fr_1fr] gap-3 mb-5">
        {/* `key` forces a remount when the featured tool changes — that's
            what triggers the fade-in animation and (more importantly)
            guarantees the card always mounts with fresh state. The previous
            shared-layoutId approach was leaving this slot empty after swaps. */}
        <HubFeaturedCard
          key={featuredKey}
          toolKey={featuredKey}
          eyebrow={fc.eyebrow}
          title={fc.title}
          detail={fc.detail}
          subDetail={fc.subDetail}
          progress={fc.progress}
          ctaLabel={fc.ctaLabel}
          onCta={() => fc.onCta(navigate)}
        />
        <div className="flex flex-col gap-2.5">
          {smallKeys.map((k) => {
            const s = STATUS_FNS[k](data)
            return (
              <HubToolCard
                key={k}
                toolKey={k}
                status={s.status}
                isLive={s.isLive}
                progress={s.progress ?? null}
                onTap={() => setManualPick(k)}
              />
            )
          })}
        </div>
      </div>

      <HubSocialStrip rank={data.rank} />
    </div>
  )
}
