import { NavLink } from 'react-router-dom'
import { Home, Dumbbell, TrendingUp, MessageCircle, Stethoscope } from 'lucide-react'

/**
 * BottomNav — the Almanac shell's mobile-only bottom tab bar (md:hidden).
 *
 * Same 5 tabs as the sidebar nav (icon + label). The active tab gets a clay
 * stamp; inactive tabs are ink-soft. Fixed to the bottom with a safe-area
 * inset so tap targets clear the iPhone home indicator.
 */
const NAV = [
  { to: '/home', icon: Home, label: 'Home' },
  { to: '/train', icon: Dumbbell, label: 'Train' },
  { to: '/progress', icon: TrendingUp, label: 'Progress' },
  { to: '/coach', icon: MessageCircle, label: 'Coach' },
  { to: '/recover', icon: Stethoscope, label: 'Recover' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 md:hidden bg-[rgba(224,212,182,0.82)] backdrop-blur-lg border-t border-ct-rim pb-[env(safe-area-inset-bottom)]">
      <div className="flex">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 min-w-0 flex flex-col items-center gap-1 pt-2 pb-2.5 text-[10px] font-medium leading-tight transition-colors duration-100 ${
                isActive ? 'text-clay font-semibold' : 'text-ink-soft'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex items-center justify-center w-9 h-7 rounded-full ${
                    isActive ? 'bg-clay text-cream' : ''
                  }`}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.25 : 2} />
                </span>
                <span className="truncate max-w-full px-0.5">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
