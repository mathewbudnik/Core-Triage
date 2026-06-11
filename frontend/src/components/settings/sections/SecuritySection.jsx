import { useState } from 'react'
import { Lock, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import SettingsSection from '../SettingsSection'
import { resendVerification } from '../../../api'

export default function SecuritySection({ user, onToast }) {
  const navigate = useNavigate()
  const [resendBusy, setResendBusy] = useState(false)

  async function handleResend() {
    if (resendBusy) return
    setResendBusy(true)
    try {
      await resendVerification()
      onToast?.({ kind: 'success', message: 'Verification email sent.' })
    } catch (err) {
      onToast?.({ kind: 'error', message: err.message || 'Could not resend verification.' })
    } finally {
      setResendBusy(false)
    }
  }

  function changePassword() {
    const email = encodeURIComponent(user?.email || '')
    navigate(`/forgot-password?email=${email}`)
  }

  return (
    <SettingsSection id="security" icon={Lock} title="Security" sub="Password and account verification.">
      <div className="space-y-2">
        <StatusRow
          status={user?.email_verified ? 'ok' : 'warn'}
          title="Email verification"
          sub={user?.email}
          action={user?.email_verified
            ? <span className="text-[11px] font-bold text-accent">VERIFIED</span>
            : (
              <button onClick={handleResend} disabled={resendBusy} className="px-3 py-1.5 rounded-lg border border-ct-hairline text-ink-soft text-xs font-semibold hover:border-ct-terracotta/35 hover:text-ct-terracotta disabled:opacity-50">
                {resendBusy ? <Loader2 size={11} className="animate-spin inline-block mr-1" /> : null}
                Resend
              </button>
            )
          }
        />
        <StatusRow
          status="ok"
          title="Password"
          sub="We'll send a reset link to your inbox."
          action={
            <button onClick={changePassword} className="px-3 py-1.5 rounded-lg border border-ct-hairline text-ink-soft text-xs font-semibold hover:border-ct-terracotta/35 hover:text-ct-terracotta">
              Change password
            </button>
          }
        />
      </div>
    </SettingsSection>
  )
}

function StatusRow({ status, title, sub, action }) {
  const dotClass = status === 'warn' ? 'bg-accent3' : 'bg-sage'
  const dotGlow = status === 'warn' ? '0 0 12px #d7ac5b' : '0 0 12px #97a886'
  return (
    <div className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl bg-side border border-ct-hairline">
      <span aria-hidden className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotClass}`} style={{ boxShadow: dotGlow }} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-ct-cream">{title}</div>
        <div className="text-[11px] text-ink-muted mt-0.5 truncate">{sub}</div>
      </div>
      {action}
    </div>
  )
}
