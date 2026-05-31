import { useState } from 'react'
import { CreditCard, Check, Sparkles } from 'lucide-react'
import SettingsSection from '../SettingsSection'
import { openBillingPortal } from '../../../api'

const TRIAL_DAYS = 14

export default function SubscriptionSection({ user, onUpgradeClick, onToast }) {
  const [billingBusy, setBillingBusy] = useState(false)
  const sub = user?.subscription_state || {}
  const state = sub.state
  const daysRemaining = sub.days_remaining
  const daysUsed = daysRemaining != null ? Math.max(0, TRIAL_DAYS - daysRemaining) : null
  const fillPct = daysUsed != null ? Math.min(100, Math.round((daysUsed / TRIAL_DAYS) * 100)) : 0

  const isPaid = state === 'active' || state === 'coaching'
  const planName = state === 'active' ? 'Pro'
                  : state === 'coaching' ? 'Coaching'
                  : state === 'trial' ? 'Free Trial'
                  : state === 'expired' ? 'Trial ended'
                  : 'Free'

  async function manage() {
    if (billingBusy) return
    setBillingBusy(true)
    try {
      const { url } = await openBillingPortal()
      window.location.href = url
    } catch (err) {
      onToast?.({ kind: 'error', message: err.message || 'Could not open billing portal.' })
      setBillingBusy(false)
    }
  }

  return (
    <SettingsSection id="subscription" icon={CreditCard} title="Plan" sub="Your subscription and billing.">
      <div
        className="relative overflow-hidden p-5 rounded-2xl border"
        style={{
          backgroundImage: 'linear-gradient(135deg, rgba(217,119,87,0.18), rgba(217,119,87,0.04))',
          borderColor: 'rgba(217,119,87,0.30)',
        }}
      >
        <div
          aria-hidden
          className="absolute -right-10 -top-10 w-[200px] h-[200px] rounded-full pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(240,168,117,0.18), transparent 70%)' }}
        />
        <div className="relative flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[18px] font-extrabold text-ct-cream tracking-tight inline-flex items-center gap-2.5">
              {planName}
              {state === 'trial' && (
                <span className="text-[10px] font-bold uppercase tracking-[0.10em] px-2 py-0.5 rounded-full border border-accent/30 text-accent" style={{ background: 'rgba(20,184,166,0.10)' }}>
                  Trial
                </span>
              )}
            </div>
            {state === 'trial' && daysRemaining != null && (
              <div className="text-ct-cream/50 text-xs mt-1">{daysRemaining} day{daysRemaining === 1 ? '' : 's'} remaining</div>
            )}
            {isPaid && (
              <div className="text-ct-cream/50 text-xs mt-1">{sub.product_name || 'Subscribed'}</div>
            )}
          </div>

          {isPaid ? (
            <button onClick={manage} disabled={billingBusy} className="px-4 py-2.5 rounded-xl bg-black/30 border border-ct-hairline text-ct-cream text-sm font-bold hover:border-ct-terracotta/40 disabled:opacity-50">
              {billingBusy ? 'Opening…' : 'Manage subscription'}
            </button>
          ) : (
            <button onClick={onUpgradeClick} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-ct-cream text-sm font-bold transition-transform hover:-translate-y-px" style={{ backgroundImage: 'linear-gradient(135deg, #d97757, #f0a875)', boxShadow: '0 8px 24px -6px rgba(217,119,87,0.5)' }}>
              <Sparkles size={13} />
              Upgrade to Pro
            </button>
          )}
        </div>

        {state === 'trial' && daysRemaining != null && (
          <div className="relative mt-4">
            <div className="h-1.5 rounded-full overflow-hidden bg-black/30">
              <div className="h-full rounded-full transition-[width]" style={{ width: `${fillPct}%`, backgroundImage: 'linear-gradient(90deg, #14b8a6, #d97757)' }} />
            </div>
            <div className="flex justify-between text-[11px] text-ct-cream/50 mt-2">
              <span><strong className="text-ct-cream font-bold">{daysUsed}</strong> of {TRIAL_DAYS} days used</span>
              <span><strong className="text-ct-cream font-bold">{daysRemaining}</strong> days remaining</span>
            </div>
          </div>
        )}

        <div className="relative flex flex-wrap gap-3 mt-4">
          <Bullet>Unlimited AI chat</Bullet>
          <Bullet>Personalized training plans</Bullet>
          <Bullet>Movement Analyzer</Bullet>
        </div>
      </div>
    </SettingsSection>
  )
}

function Bullet({ children }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ct-cream/70">
      <Check size={12} strokeWidth={3} className="text-accent" />
      {children}
    </span>
  )
}
