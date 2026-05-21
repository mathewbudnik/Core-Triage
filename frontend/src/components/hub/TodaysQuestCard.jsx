import QuestCard from '../ui/QuestCard'
import { useRewardEngine } from '../../lib/rewardEngine'
import { QUEST_TYPES } from '../../lib/quests'

/**
 * Wraps the QuestCard primitive with engine state — surfaces today's
 * quest and its progress. If no quest (unlikely after ensureDailyQuest
 * runs), renders nothing.
 */
export default function TodaysQuestCard() {
  const { state } = useRewardEngine()
  const quest = QUEST_TYPES.find((q) => q.id === state.quest.id)
  if (!quest) return null

  return (
    <QuestCard
      title={quest.title}
      why={quest.why}
      xp={quest.xp}
      progress={{
        current: state.quest.progress.current,
        target:  state.quest.progress.target,
      }}
      className="mb-3"
    />
  )
}
