import HubHero from './hub/HubHero'
import TodaysQuestCard from './hub/TodaysQuestCard'
import HubToolsGrid from './hub/HubToolsGrid'
import HubProjectTile from './hub/HubProjectTile'
import HubRecentSends from './hub/HubRecentSends'

/**
 * Hub — the climber's home screen. Identity + reward-engine surface.
 *
 * Layout (top to bottom):
 *   1. HubHero — greeting + name + tier badge + stat radar + level meter + streak + style strip
 *   2. TodaysQuestCard — today's daily quest with progress
 *   3. HubProjectTile — your active project (the boss climb)
 *   4. HubToolsGrid — Recover / Train / Ask coach
 *   5. HubRecentSends — last 5 sends with XP earned per row
 */
export default function HubTab({ user }) {
  return (
    <div className="min-h-screen bg-ct-forest text-ct-cream p-4 pb-24 max-w-md mx-auto">
      <HubHero user={user} />
      <TodaysQuestCard />
      <HubProjectTile />
      <HubToolsGrid />
      <HubRecentSends />
    </div>
  )
}
