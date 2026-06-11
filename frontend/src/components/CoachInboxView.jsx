import { ArrowLeft, Inbox } from 'lucide-react'
import CoachInbox from './CoachInbox'

/**
 * Wraps CoachInbox (admin only) with the consistent header bar so Budnik
 * has the same "← Back" affordance to flip to the picker (and from there
 * into AI / Coach views).
 */
export default function CoachInboxView({ onBack }) {
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
        <span className="flex items-center gap-1.5 text-xs font-semibold text-clay-deep">
          <Inbox size={12} />
          Inbox
        </span>
      </div>
      <div className="flex-1 min-h-0">
        <CoachInbox />
      </div>
    </div>
  )
}
