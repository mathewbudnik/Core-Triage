import { motion } from 'framer-motion'
import { User, Mountain, CreditCard, Lock, Eye, Database, Info, AlertTriangle } from 'lucide-react'

const ITEMS = [
  { id: 'profile',      label: 'Profile',     icon: User },
  { id: 'climbing',     label: 'Climbing',    icon: Mountain },
  { id: 'subscription', label: 'Plan',        icon: CreditCard },
  { id: 'security',     label: 'Security',    icon: Lock },
  { id: 'privacy',      label: 'Visibility',  icon: Eye },
  { id: 'data',         label: 'Data',        icon: Database },
  { id: 'about',        label: 'About',       icon: Info },
  { id: 'danger',       label: 'Danger zone', icon: AlertTriangle, danger: true },
]

/**
 * Sticky left-rail nav (desktop only). Click → smooth-scroll via `onNavigate`.
 * Visual treatment mirrors the main app sidebar at App.jsx — terracotta tint
 * on active, soft glow, and a layoutId-animated indicator dot that slides
 * between active items.
 */
export default function SettingsSidebar({ active, onNavigate }) {
  return (
    <aside className="hidden lg:block sticky top-[78px] self-start">
      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted mb-3 px-3">
        Settings
      </div>
      <nav aria-label="Settings sections" className="flex flex-col space-y-1">
        {ITEMS.map(({ id, label, icon: Icon, danger }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate?.(id)}
              className={
                `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-100 border text-left ` +
                (isActive
                  ? ''
                  : danger
                    ? 'text-red-400/55 hover:text-red-400 hover:bg-red-500/5 border-transparent'
                    : 'text-ink-soft hover:text-ct-cream hover:bg-ct-hairline border-transparent')
              }
              style={isActive ? {
                background: 'rgba(197,138,119,0.14)',
                color: '#b06a4f',
                borderColor: 'rgba(197,138,119,0.40)',
                boxShadow: '0 0 12px rgba(197,138,119,0.18)',
              } : undefined}
            >
              <Icon size={16} strokeWidth={isActive ? 2.25 : 2} className="flex-shrink-0" />
              {label}
              {isActive && (
                <motion.div
                  layoutId="settings-nav-indicator"
                  transition={{ duration: 0.12, ease: [0, 0, 0.2, 1] }}
                  className="ml-auto w-1.5 h-1.5 rounded-full"
                  style={{
                    background: '#c58a77',
                    boxShadow: '0 0 6px rgba(197,138,119,0.55)',
                  }}
                />
              )}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
