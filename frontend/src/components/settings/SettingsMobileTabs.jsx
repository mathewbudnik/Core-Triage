import { useEffect, useRef } from 'react'
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
 * Mobile-only horizontal scrollable pill strip below the page header.
 * Sticks to the top of the viewport so the active section is always one tap
 * away as the user scrolls. Auto-scrolls the active pill into view when the
 * scroll-spy advances.
 */
export default function SettingsMobileTabs({ active, onNavigate }) {
  const activeBtnRef = useRef(null)

  useEffect(() => {
    // scrollIntoView isn't implemented in jsdom — guard so the unit test
    // suite doesn't crash on render. Browsers always have it.
    if (activeBtnRef.current && typeof activeBtnRef.current.scrollIntoView === 'function') {
      activeBtnRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      })
    }
  }, [active])

  return (
    <div className="lg:hidden sticky top-0 z-20 -mx-5 mb-5 bg-ct-forest/95 backdrop-blur-sm border-b border-ct-hairline">
      <div
        className="flex gap-1.5 overflow-x-auto px-5 py-3"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style>{`
          .settings-mobile-tabs::-webkit-scrollbar { display: none; }
        `}</style>
        {ITEMS.map(({ id, label, icon: Icon, danger }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              ref={isActive ? activeBtnRef : null}
              type="button"
              onClick={() => onNavigate?.(id)}
              className={
                'flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ' +
                (isActive
                  ? ''
                  : danger
                    ? 'text-red-400/55 border-transparent hover:text-red-400'
                    : 'text-ink-soft border-transparent hover:text-ct-cream')
              }
              style={isActive ? {
                background: 'rgba(197,138,119,0.14)',
                color: '#b06a4f',
                borderColor: 'rgba(197,138,119,0.40)',
              } : undefined}
            >
              <Icon size={13} strokeWidth={isActive ? 2.25 : 2} className="flex-shrink-0" />
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
