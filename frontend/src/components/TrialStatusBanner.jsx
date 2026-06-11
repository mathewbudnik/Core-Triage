import { Clock, Lock, Sparkles } from 'lucide-react'

/**
 * Slim banner that shows the user's trial status. Renders nothing for
 * paying / coaching users, and stays out of the way for trial users
 * with plenty of time left — only surfaces in the last few days of
 * trial and after expiry.
 *
 * Props:
 *   - user: the /me response (needs subscription_state)
 *   - onUpgradeClick: opens the upgrade modal
 *
 * Render rules:
 *   - state === 'trial' AND days_remaining <= 5 → soft countdown
 *   - state === 'expired'                       → hard paywall banner
 *   - everything else                           → null
 */
export default function TrialStatusBanner({ user, onUpgradeClick }) {
  const sub = user?.subscription_state
  if (!sub) return null

  // Coaching + active subscribers — no banner ever.
  if (sub.state === 'active' || sub.state === 'coaching') return null

  // Trial winding down (≤ 5 days left)
  if (sub.state === 'trial') {
    const days = sub.days_remaining
    if (days == null || days > 5) return null
    return (
      <div className="border-y border-ct-hairline bg-ct-forest-deep px-4 md:px-8 py-2.5 flex items-center gap-3 text-xs">
        <Clock size={13} className="text-accent flex-shrink-0" />
        <span className="text-ct-cream flex-1">
          <b className="text-accent">{days} day{days === 1 ? '' : 's'}</b> left in your free trial.
          Subscribe now and your access stays uninterrupted.
        </span>
        <button
          onClick={onUpgradeClick}
          className="text-[11px] font-bold bg-ct-terracotta text-ct-cream hover:brightness-110 px-3 py-1 rounded-md whitespace-nowrap"
        >
          Subscribe — $7.99/mo →
        </button>
      </div>
    )
  }

  // Trial ended — paywall banner. Restrictive but not hostile: app still
  // works for viewing past data, triage, and Phase 1 rehab.
  if (sub.state === 'expired') {
    return (
      <div className="border-y border-ct-hairline bg-ct-forest-deep px-4 md:px-8 py-2.5 flex items-start gap-3 text-xs">
        <Lock size={13} className="text-accent2 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-ct-cream font-semibold leading-snug">
            Your free trial ended.
          </p>
          <p className="text-ink-soft leading-snug mt-0.5">
            Triage, past sessions, and Phase 1 rehab stay open. Subscribe to
            unlock training plan generation, unlimited AI chat, and Phase 2/3
            rehab progressions.
          </p>
        </div>
        <button
          onClick={onUpgradeClick}
          className="flex items-center gap-1.5 text-[11px] font-bold text-ct-cream bg-ct-terracotta hover:brightness-110 px-3 py-1.5 rounded-md whitespace-nowrap"
        >
          <Sparkles size={11} />
          $7.99/mo
        </button>
      </div>
    )
  }

  return null
}
