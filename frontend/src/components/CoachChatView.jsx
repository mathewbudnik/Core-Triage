import { ArrowLeft } from 'lucide-react'
import CoachChat from './CoachChat'

/**
 * Wraps CoachChat with the same header-bar style as AIChatView so the
 * "← Back to picker" link sits in a consistent place across all sub-views.
 */
export default function CoachChatView({ user, onLoginClick, onBack }) {
  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-ct-hairline px-4 md:px-6 py-3 flex items-center gap-3 bg-ct-forest-deep/40">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-ink-soft hover:text-ct-cream transition-colors"
          aria-label="Back to picker"
        >
          <ArrowLeft size={13} />
          Back
        </button>
        <span className="text-xs font-semibold text-ct-terra-soft">1:1 with Budnik</span>
      </div>
      <div className="flex-1 min-h-0">
        <CoachChat user={user} onLoginClick={onLoginClick} />
      </div>
    </div>
  )
}
