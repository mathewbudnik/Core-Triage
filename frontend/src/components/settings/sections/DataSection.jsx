import { Database, Download } from 'lucide-react'
import SettingsSection from '../SettingsSection'

const SUPPORT_EMAIL = 'mathewbudnik@gmail.com'

export default function DataSection({ user }) {
  const subject = encodeURIComponent(`Data export request — ${user?.email || ''}`)
  const body = encodeURIComponent(
    `Hi CoreTriage team,\n\n` +
    `Please send me a copy of the data associated with my account (${user?.email || ''}). ` +
    `Including: sessions, training logs, profile.\n\nThanks!`
  )
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`

  return (
    <SettingsSection id="data" icon={Database} title="Your data" sub="Export or delete what we store about you.">
      <div className="flex items-center gap-3.5 py-3.5">
        <span className="flex-shrink-0 w-9 h-9 rounded-xl bg-ct-cream/5 border border-ct-hairline inline-flex items-center justify-center text-ink-muted">
          <Download size={16} />
        </span>
        <div className="flex-1">
          <div className="text-sm font-semibold text-ct-cream">Request a data export</div>
          <div className="text-[11px] text-ink-muted mt-0.5">We'll email a copy of your sessions, training logs, and profile within 30 days.</div>
        </div>
        <a href={mailto} className="px-3.5 py-1.5 rounded-lg border border-ct-hairline text-ink-soft text-xs font-semibold hover:border-ct-terracotta/35 hover:text-ct-terracotta">
          Email a request
        </a>
      </div>
    </SettingsSection>
  )
}
