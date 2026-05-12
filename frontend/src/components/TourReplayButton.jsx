import { HelpCircle } from 'lucide-react'

export default function TourReplayButton({ onReplay }) {
  return (
    <button
      type="button"
      onClick={onReplay}
      aria-label="Replay tour"
      title="Replay tour"
      className="text-muted hover:text-accent transition-colors p-1 rounded-md"
    >
      <HelpCircle size={16} />
    </button>
  )
}
