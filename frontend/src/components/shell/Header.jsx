import { Flame, Menu } from 'lucide-react'
import Button from '../ui/Button'

/**
 * Header — the Almanac shell's top bar (the v6-head from the mockup).
 *
 * Left: the page title (Fraunces) over a mono dateline. Right: the streak
 * (lucide Flame + count in clay-deep), a primary "+ Log a climb" action, and a
 * caller-supplied account slot. A faint ochre hairline accent sits under the
 * whole bar. On small screens a hamburger appears to open the mobile drawer.
 *
 * Props:
 *   title:       page title (Fraunces)
 *   dateline:    mono sub-line under the title
 *   streak:      streak day count; the Flame + number hide when falsy/0
 *   onLogClick:  handler for the "+ Log a climb" button
 *   accountSlot: react node rendered at the far right (e.g. an avatar / menu)
 *   onMenuClick: opens the mobile drawer (hamburger, small screens only)
 */
export default function Header({
  title,
  dateline,
  streak,
  onLogClick,
  accountSlot,
  onMenuClick,
}) {
  return (
    <header className="relative flex items-center justify-between gap-3 px-4 md:px-[18px] py-3.5 border-b border-ct-hairline">
      {/* Ochre hairline accent under the header */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-0 right-0 bottom-[-1px] h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(215,172,91,0.6), transparent)',
        }}
      />

      {/* Left: hamburger (mobile) + title + dateline */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="md:hidden shrink-0 text-ink-soft hover:text-ink p-1 -ml-1"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          <h1 className="font-serif font-semibold text-[20px] leading-none text-ink truncate">
            {title}
          </h1>
          {dateline && (
            <div className="font-mono text-[9px] tracking-[0.12em] uppercase text-ink-muted mt-1 truncate">
              {dateline}
            </div>
          )}
        </div>
      </div>

      {/* Right: streak + log button + account slot */}
      <div className="flex items-center gap-3 shrink-0">
        {streak ? (
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-clay-deep">
            <Flame size={15} />
            {streak}
          </span>
        ) : null}
        <Button variant="primary" onClick={onLogClick} className="hidden sm:inline-flex">
          + Log a climb
        </Button>
        {accountSlot}
      </div>
    </header>
  )
}
