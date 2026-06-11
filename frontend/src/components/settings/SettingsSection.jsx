/**
 * Reusable section card. Used by every settings section except the hero (which
 * has its own layout) and the danger zone (which has a warmer treatment).
 *
 * Props:
 *   - id:    HTML id for in-page anchor links (e.g. "climbing").
 *   - icon:  lucide icon component.
 *   - title: section heading.
 *   - sub:   small description under the title.
 *   - children: section body.
 *   - tone:  'default' | 'danger'.  Danger renders a red-tinted treatment.
 */

// Offset used by scrollIntoView() so a clicked sidebar/pill-strip nav lands
// the section title comfortably below the app's sticky topbar (and the mobile
// pill strip on small viewports).
const SCROLL_MARGIN = '110px'
export default function SettingsSection({ id, icon: Icon, title, sub, children, tone = 'default' }) {
  const isDanger = tone === 'danger'
  return (
    <section
      id={id}
      className={
        isDanger
          ? 'relative overflow-hidden rounded-2xl border border-red-500/25 p-6 mt-6'
          : 'rounded-2xl border border-ct-hairline bg-ct-forest-deep p-6 mb-4'
      }
      style={
        isDanger
          ? {
              backgroundImage: 'linear-gradient(180deg, rgba(244,114,114,0.04), rgba(244,114,114,0.01))',
              scrollMarginTop: SCROLL_MARGIN,
            }
          : { scrollMarginTop: SCROLL_MARGIN }
      }
    >
      {isDanger && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-[0.08]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, transparent, transparent 14px, rgba(244,114,114,0.55) 14px, rgba(244,114,114,0.55) 16px)',
          }}
        />
      )}
      <div className="relative flex items-start gap-3 mb-5">
        <span
          className={
            isDanger
              ? 'flex-shrink-0 w-9 h-9 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30 inline-flex items-center justify-center'
              : 'flex-shrink-0 w-9 h-9 rounded-xl text-ct-terracotta border border-ct-terracotta/20 inline-flex items-center justify-center'
          }
          style={
            isDanger
              ? undefined
              : { backgroundImage: 'linear-gradient(135deg, rgba(197,138,119,0.16), rgba(197,138,119,0.05))' }
          }
        >
          {Icon ? <Icon size={18} /> : null}
        </span>
        <div>
          <h3 className={isDanger ? 'text-red-400 font-bold text-[17px] tracking-tight m-0' : 'text-ct-cream font-bold text-[17px] tracking-tight m-0'}>
            {title}
          </h3>
          {sub && (
            <div className={isDanger ? 'text-red-400/65 text-xs mt-1' : 'text-ink-muted text-xs mt-1'}>
              {sub}
            </div>
          )}
        </div>
      </div>
      <div className="relative">{children}</div>
    </section>
  )
}
