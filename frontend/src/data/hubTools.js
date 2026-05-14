import { Activity, Stethoscope, Dumbbell, MessageSquare } from 'lucide-react'

// Single source of truth for the four hub tools. Other Hub components import
// from here so a colour/icon/route change happens in one place.
export const TOOLS = {
  triage: {
    key: 'triage',
    label: 'Triage',
    accent: 'coral',       // maps to Tailwind accent2 in ACCENT_CLASSES below
    icon: Activity,
    route: '/triage',
    pattern: 'pulse',
    emptyStatus: 'No active triage',
  },
  rehab: {
    key: 'rehab',
    label: 'Rehab',
    accent: 'teal',        // maps to Tailwind accent
    icon: Stethoscope,
    route: '/rehab',
    pattern: 'dots',
    emptyStatus: 'No active rehab',
  },
  train: {
    key: 'train',
    label: 'Train',
    accent: 'teal',
    icon: Dumbbell,
    route: '/train',
    pattern: 'stripes',
    emptyStatus: 'Build a plan',
  },
  chat: {
    key: 'chat',
    label: 'Chat',
    accent: 'gold',        // maps to Tailwind accent3
    icon: MessageSquare,
    route: '/chat',
    pattern: 'speech',
    emptyStatus: 'Ask anything',
  },
}

export const TOOL_KEYS = ['triage', 'rehab', 'train', 'chat']

// Accent → Tailwind class lookup. Use these instead of inlining bg-accent/10
// everywhere, so we can swap a colour mapping in one place.
export const ACCENT_CLASSES = {
  teal: {
    text:        'text-accent',
    border:      'border-accent/40',
    borderSoft:  'border-accent/25',
    bgSoft:      'bg-accent/10',
    bgGradient:  'bg-[linear-gradient(135deg,rgba(20,184,166,0.12),rgba(20,184,166,0.02))]',
    iconBg:      'bg-[linear-gradient(135deg,rgba(20,184,166,0.25),rgba(20,184,166,0.06))]',
    glow:        'bg-accent/40',
    dotClass:    'bg-accent shadow-[0_0_6px_rgba(20,184,166,0.7)]',
    progressBar: 'bg-gradient-to-r from-accent to-[#7dd3c0] shadow-[0_0_12px_rgba(20,184,166,0.6)]',
  },
  coral: {
    text:        'text-accent2',
    border:      'border-accent2/40',
    borderSoft:  'border-accent2/25',
    bgSoft:      'bg-accent2/10',
    bgGradient:  'bg-[linear-gradient(135deg,rgba(251,113,133,0.12),rgba(251,113,133,0.02))]',
    iconBg:      'bg-[linear-gradient(135deg,rgba(251,113,133,0.25),rgba(251,113,133,0.06))]',
    glow:        'bg-accent2/40',
    dotClass:    'bg-accent2 shadow-[0_0_6px_rgba(251,113,133,0.7)]',
    progressBar: 'bg-gradient-to-r from-accent2 to-[#fda4af] shadow-[0_0_12px_rgba(251,113,133,0.6)]',
  },
  gold: {
    text:        'text-accent3',
    border:      'border-accent3/40',
    borderSoft:  'border-accent3/25',
    bgSoft:      'bg-accent3/10',
    bgGradient:  'bg-[linear-gradient(135deg,rgba(251,191,36,0.12),rgba(251,191,36,0.02))]',
    iconBg:      'bg-[linear-gradient(135deg,rgba(251,191,36,0.25),rgba(251,191,36,0.06))]',
    glow:        'bg-accent3/36',
    dotClass:    'bg-accent3 shadow-[0_0_6px_rgba(251,191,36,0.7)]',
    progressBar: 'bg-gradient-to-r from-accent3 to-[#fcd34d] shadow-[0_0_12px_rgba(251,191,36,0.6)]',
  },
}
