import { ArrowLeft } from 'lucide-react'
import MovementAnalyzer from './MovementAnalyzer'

/**
 * Wraps MovementAnalyzer with the same header-bar style as the other
 * Coach views (CoachChatView, AIChatView, CoachInboxView) so the back-
 * to-picker affordance sits in a consistent place.
 */
export default function MovementAnalyzerView({ onBack }) {
  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-ct-hairline px-4 md:px-6 py-3 flex items-center gap-3 bg-[linear-gradient(180deg,rgba(253,246,234,0.85),rgba(244,236,219,0.4))]">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-ink-soft hover:text-ink transition-colors"
          aria-label="Back to picker"
        >
          <ArrowLeft size={13} />
          Back
        </button>
        <span className="text-xs font-semibold text-clay-deep">Movement Analyzer</span>
      </div>
      <div className="flex-1 min-h-0">
        <MovementAnalyzer />
      </div>
    </div>
  )
}
