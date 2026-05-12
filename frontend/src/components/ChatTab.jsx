import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import ChatPicker from './ChatPicker'
import AIChatView from './AIChatView'
import CoachChatView from './CoachChatView'
import CoachInboxView from './CoachInboxView'
import UpgradeModal from './UpgradeModal'

const VIEW_KEY = 'coretriage_chat_view'

/**
 * Chat tab router.
 *
 * Decides which sub-view to render based on user state + persisted preference:
 *   - Mathew (coach role)         → Inbox by default
 *   - Coaching subscriber         → Coach chat by default
 *   - Everyone else, first visit  → Picker
 *   - Everyone else, returning    → Last picked view (localStorage)
 *
 * Each sub-view receives an `onBack` callback that returns the user to the
 * picker, clears the persisted choice, and lets them re-pick.
 */
export default function ChatTab({ k, user, onLoginClick }) {
  const isCoach = user?.is_coach === true
  const tier = user?.tier ?? 'free'
  const isCoachingSub = tier === 'coaching'
  const [showUpgrade, setShowUpgrade] = useState(false)

  // Compute initial view once. Re-runs on user change via the effect below.
  const [view, setView] = useState(() => initialView({ isCoach, isCoachingSub }))

  // If the user logs in / out / changes tier mid-session, recompute the
  // default view. Don't override if they've already explicitly picked one
  // this session — the persisted key takes precedence.
  useEffect(() => {
    setView(initialView({ isCoach, isCoachingSub }))
  }, [isCoach, isCoachingSub])

  const persistView = useCallback((next) => {
    setView(next)
    if (next === 'picker') {
      localStorage.removeItem(VIEW_KEY)
    } else {
      try { localStorage.setItem(VIEW_KEY, next) } catch {}
    }
  }, [])

  const handleBack = useCallback(() => persistView('picker'), [persistView])

  const handleSelectCoach = useCallback(() => {
    if (!user) {
      onLoginClick && onLoginClick()
      return
    }
    if (isCoachingSub || isCoach) {
      persistView('coach')
      return
    }
    // Free / Pro user → upsell to coaching plan
    setShowUpgrade(true)
  }, [user, isCoach, isCoachingSub, onLoginClick, persistView])

  const handleSelectAI = useCallback(() => persistView('ai'), [persistView])

  return (
    <>
      {view === 'picker' && (
        <ChatPicker user={user} onSelectCoach={handleSelectCoach} onSelectAI={handleSelectAI} />
      )}
      {view === 'coach' && (
        <CoachChatView user={user} onLoginClick={onLoginClick} onBack={handleBack} />
      )}
      {view === 'inbox' && isCoach && (
        <CoachInboxView onBack={handleBack} />
      )}
      {view === 'ai' && (
        <AIChatView k={k} user={user} onBack={handleBack} />
      )}

      <AnimatePresence>
        {showUpgrade && (
          <UpgradeModal
            onClose={() => setShowUpgrade(false)}
            trigger="coaching"
            user={user}
            onSignInClick={onLoginClick}
          />
        )}
      </AnimatePresence>
    </>
  )
}

function initialView({ isCoach, isCoachingSub }) {
  if (isCoach) return 'inbox'
  if (isCoachingSub) return 'coach'
  if (typeof window === 'undefined') return 'picker'
  const saved = localStorage.getItem(VIEW_KEY)
  if (saved === 'coach' || saved === 'ai' || saved === 'inbox') return saved
  return 'picker'
}
