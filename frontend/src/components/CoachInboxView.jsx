import { ArrowLeft, Inbox } from 'lucide-react'
import CoachInbox from './CoachInbox'

/**
 * Wraps CoachInbox (admin only) with the consistent header bar so Mathew
 * has the same "← Back" affordance to flip to the picker (and from there
 * into AI / Coach views).
 */
export default function CoachInboxView({ onBack }) {
  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-outline px-4 md:px-6 py-3 flex items-center gap-3 bg-panel2/40">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-muted hover:text-text transition-colors"
          aria-label="Back to picker"
        >
          <ArrowLeft size={13} />
          Back
        </button>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-accent">
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
