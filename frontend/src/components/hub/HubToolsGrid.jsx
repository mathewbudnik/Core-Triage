import { useNavigate } from 'react-router-dom'
import { Stethoscope, Dumbbell, MessageSquare } from 'lucide-react'

/**
 * Three small navigation tiles for Recover / Train / Chat. Smaller
 * footprint than they had in the old Hub — the RPG layer is now the
 * centerpiece; these are tools you reach for.
 */
const TOOLS = [
  { key: 'recover', label: 'RECOVER',   icon: Stethoscope,    color: '#7dd3c0', route: '/recover' },
  { key: 'train',   label: 'TRAIN',     icon: Dumbbell,       color: '#a78bfa', route: '/train' },
  { key: 'chat',    label: 'ASK COACH', icon: MessageSquare,  color: '#f0a875', route: '/chat' },
]

export default function HubToolsGrid() {
  const navigate = useNavigate()
  return (
    <div className="grid grid-cols-3 gap-2 mb-3">
      {TOOLS.map((tool) => {
        const Icon = tool.icon
        return (
          <button
            key={tool.key}
            type="button"
            onClick={() => navigate(tool.route)}
            className="ct-surface rounded-lg p-3 text-center hover:border-ct-rim transition-colors"
          >
            <Icon size={22} color={tool.color} strokeWidth={2} />
            <p className="text-[9px] tracking-[0.18em] uppercase font-extrabold text-ct-moss mt-2">
              {tool.label}
            </p>
          </button>
        )
      })}
    </div>
  )
}
