import { NavLink } from 'react-router-dom'

/**
 * NavItem — a single Almanac sidebar nav row (react-router NavLink).
 *
 * Active state is a "clay stamp": clay fill, cream text, semibold, a subtle
 * shadow, plus a small registration tick (the printer's crosshair) pinned to
 * the right edge. Inactive rows are ink-soft with a faint hover wash.
 *
 * Props:
 *   to:    route path (e.g. '/home')
 *   icon:  a lucide-react icon component
 *   label: visible label text
 */
export default function NavItem({ to, icon: Icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-colors duration-100 ${
          isActive
            ? 'bg-clay text-cream font-semibold shadow-[0_2px_8px_rgba(176,106,79,0.35)]'
            : 'text-ink-soft font-medium hover:bg-[rgba(42,39,34,0.05)]'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {Icon && <Icon size={16} className="shrink-0" />}
          <span className="truncate">{label}</span>
          {isActive && (
            <svg
              aria-hidden="true"
              width="11"
              height="11"
              viewBox="0 0 11 11"
              className="ml-auto shrink-0 opacity-85"
            >
              <line x1="5.5" y1="0" x2="5.5" y2="11" stroke="#fdf6ea" strokeWidth="1" />
              <line x1="0" y1="5.5" x2="11" y2="5.5" stroke="#fdf6ea" strokeWidth="1" />
            </svg>
          )}
        </>
      )}
    </NavLink>
  )
}
