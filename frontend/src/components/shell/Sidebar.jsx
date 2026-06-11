import { Home, Dumbbell, TrendingUp, MessageCircle, Stethoscope } from 'lucide-react'
import NavItem from './NavItem'
import WeekDots from './WeekDots'
import SpecimenCard from './SpecimenCard'

/**
 * Sidebar — the Almanac shell's vertical chrome.
 *
 * Top cluster (anchored to the top): brand wordmark + mono sub-line,
 * SpecimenCard, and the 5-item nav. A flexible spacer pushes the bottom
 * cluster (WeekDots, 1:1 coaching CTA, footer links) to the bottom.
 *
 * Props:
 *   user:       optional signed-in user (passed to SpecimenCard)
 *   weekDays:   boolean[7] for the "this week" dots
 *   onNavClick: optional callback fired when any nav item is tapped (used by
 *               AppShell to close the mobile drawer)
 *   onCoachingClick: optional callback for the coaching CTA
 *   onFooterClick:   optional (key) => void for About / Privacy / Terms links
 */
const NAV = [
  { to: '/home', icon: Home, label: 'Home' },
  { to: '/train', icon: Dumbbell, label: 'Train' },
  { to: '/progress', icon: TrendingUp, label: 'Progress' },
  { to: '/coach', icon: MessageCircle, label: 'Coach' },
  { to: '/recover', icon: Stethoscope, label: 'Recover' },
]

const FOOTER = ['About', 'Privacy', 'Terms']

export default function Sidebar({
  user,
  weekDays = [],
  onNavClick,
  onCoachingClick,
  onFooterClick,
}) {
  return (
    <div className="h-full flex flex-col bg-side border-r border-ct-rim px-3 py-4">
      {/* Brand */}
      <div className="font-serif font-semibold text-[18px] text-ink px-1.5 pt-0.5">
        CoreTriage
      </div>
      <div className="font-mono text-[8px] tracking-[0.18em] uppercase text-ink-muted px-1.5 pb-3">
        climb · progress
      </div>

      {/* Identity card */}
      <SpecimenCard user={user} />

      {/* Nav */}
      <nav className="flex flex-col gap-0.5">
        {NAV.map((item) => (
          <NavItem
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            onClick={onNavClick}
          />
        ))}
      </nav>

      {/* Flexible spacer pins the bottom cluster down */}
      <div className="flex-1 min-h-[14px]" />

      {/* This-week dots */}
      <WeekDots days={weekDays} />

      {/* 1:1 Coaching CTA */}
      <button
        type="button"
        onClick={onCoachingClick}
        className="text-left rounded-lg border border-ct-hairline bg-card p-3 mt-3.5"
      >
        <div className="font-mono text-[8px] tracking-[0.14em] uppercase text-sage-deep">
          1:1 Coaching
        </div>
        <div className="font-serif text-[12.5px] leading-tight text-ink mt-1 mb-1">
          Personal review from a V13 boulderer
        </div>
        <div className="text-[11px] font-semibold text-clay-deep">Apply →</div>
      </button>

      {/* Footer links */}
      <div className="flex gap-2 px-1.5 mt-3 font-mono text-[8px] tracking-[0.1em] uppercase text-ink-muted">
        {FOOTER.map((label, i) => (
          <span key={label} className="flex gap-2">
            {i > 0 && <span aria-hidden="true">·</span>}
            <button
              type="button"
              onClick={() => onFooterClick?.(label.toLowerCase())}
              className="hover:text-ink-soft transition-colors"
            >
              {label}
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}
