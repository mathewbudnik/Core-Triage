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
 * Sticky left-rail nav. Hidden on mobile (<= 920px). Click → smooth-scroll to
 * the matching section. `active` is controlled by the SettingsPage's scroll-spy.
 */
export default function SettingsSidebar({ active }) {
  return (
    <aside className="hidden lg:block sticky top-[78px] self-start">
      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-ct-cream/30 mb-3 px-3">
        Settings
      </div>
      <nav aria-label="Settings sections" className="flex flex-col">
        {ITEMS.map(({ id, label, icon: Icon, danger }) => {
          const isActive = active === id
          return (
            <a
              key={id}
              href={`#${id}`}
              className={
                'relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ' +
                (isActive
                  ? 'bg-ct-terra-tint text-ct-terracotta font-semibold'
                  : danger
                    ? 'text-red-400/55 hover:text-red-400 hover:bg-red-500/5'
                    : 'text-ct-cream/50 hover:text-ct-cream hover:bg-ct-cream/[0.03]')
              }
            >
              {isActive && (
                <span aria-hidden className="absolute left-0 top-2 bottom-2 w-[3px] rounded bg-ct-terracotta" />
              )}
              <Icon size={15} className="flex-shrink-0 opacity-80" />
              {label}
            </a>
          )
        })}
      </nav>
    </aside>
  )
}
