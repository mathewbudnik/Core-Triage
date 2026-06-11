import Sidebar from './Sidebar'
import Header from './Header'
import BottomNav from './BottomNav'

/**
 * AppShell — the Almanac responsive frame.
 *
 * Composes the Sidebar (desktop: a ~204px sticky column; mobile: an off-canvas
 * drawer toggled by `sidebarOpen`), the Header, a scrollable <main> for the
 * page content, and the mobile-only BottomNav. Self-contained: the wiring step
 * passes real props and an account slot.
 *
 * Props:
 *   user:            optional signed-in user (forwarded to Sidebar/SpecimenCard)
 *   activeTabId:     current tab id (forwarded; reserved for future highlight use)
 *   pageTitle:       Header title
 *   pageDateline:    Header mono dateline
 *   streak:          streak count shown in the Header
 *   onLogClick:      Header "+ Log a climb" handler
 *   accountSlot:     react node rendered at the far right of the Header
 *   weekDays:        boolean[7] forwarded to the sidebar's WeekDots
 *   children:        page content rendered inside <main>
 *   sidebarOpen:     controls the mobile drawer's open/closed state
 *   onSidebarToggle: (open: boolean) => void — open/close the mobile drawer
 *   onCoachingClick: forwarded to the sidebar coaching CTA
 *   onFooterClick:   forwarded to the sidebar footer links
 */
export default function AppShell({
  user,
  activeTabId, // eslint-disable-line no-unused-vars -- reserved for nav highlight wiring
  pageTitle,
  pageDateline,
  streak,
  onLogClick,
  accountSlot,
  weekDays = [],
  children,
  sidebarOpen = false,
  onSidebarToggle,
  onCoachingClick,
  onFooterClick,
}) {
  const closeDrawer = () => onSidebarToggle?.(false)

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Mobile drawer scrim */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-ink/30 backdrop-blur-sm md:hidden"
          onClick={closeDrawer}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — fixed drawer on mobile, sticky column on desktop */}
      <aside
        className={`
          fixed md:sticky md:top-0 inset-y-0 md:inset-y-auto left-0 z-40
          md:h-screen w-[204px] shrink-0
          transition-transform duration-150 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <Sidebar
          user={user}
          weekDays={weekDays}
          onNavClick={closeDrawer}
          onCoachingClick={onCoachingClick}
          onFooterClick={onFooterClick}
        />
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        <Header
          title={pageTitle}
          dateline={pageDateline}
          streak={streak}
          onLogClick={onLogClick}
          accountSlot={accountSlot}
          onMenuClick={() => onSidebarToggle?.(true)}
        />
        <main className="flex-1 min-w-0 overflow-auto">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  )
}
