import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useHubData } from '../hooks/useHubData'
import { workingTierFromHardest } from '../lib/tier'
import TierThemeRoot from './TierThemeRoot'
import HubGreeting from './HubGreeting'
import HubRingsCard from './HubRingsCard'
import HubProjectCard from './HubProjectCard'
import HubWeekStrip from './HubWeekStrip'
import HubFeedCard from './HubFeedCard'

export default function HubTab({ user }) {
  const navigate = useNavigate()
  const data = useHubData(user)
  const tierId = workingTierFromHardest(data.hardestSends)
  const today = new Date().toISOString().slice(0,10)

  if (data.loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={20} className="text-accent animate-spin" />
      </div>
    )
  }

  return (
    <TierThemeRoot hardest={data.hardestSends} global>
      <div className="relative px-4 py-6 md:py-8 max-w-2xl mx-auto"
           style={{
             background:
               'radial-gradient(circle at 50% -10%, color-mix(in srgb, var(--tier-c) 28%, transparent) 0%, transparent 55%)',
           }}>
        <HubGreeting user={user} data={data} tierId={tierId} />

        <div className="space-y-3">
          <HubRingsCard
            sends={data.ringSends}
            climbDays={data.ringClimbDays}
            pushAttempts={data.ringPushAttempts}
            streakDays={data.streakDays}
          />
          {data.currentProject && (
            <HubProjectCard
              project={data.currentProject}
              onContinue={() => navigate('/train')}
            />
          )}
          <HubWeekStrip
            loggedDates={data.weekLoggedDates}
            todayIso={today}
          />
          <HubFeedCard items={data.feedItems} />
        </div>
      </div>
    </TierThemeRoot>
  )
}
