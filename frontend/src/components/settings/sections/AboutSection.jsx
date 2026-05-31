import { Info } from 'lucide-react'
import SettingsSection from '../SettingsSection'

const VERSION = import.meta.env.VITE_APP_VERSION || 'dev'
const COMMIT = (import.meta.env.VITE_APP_COMMIT_SHA || 'dev').slice(0, 7)
const SUPPORT_EMAIL = 'mathewbudnik@gmail.com'

export default function AboutSection() {
  return (
    <SettingsSection id="about" icon={Info} title="About" sub="Version, legal, and contact.">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Cell label="Version">
          <div className="text-sm text-ct-cream font-semibold">{VERSION}</div>
          <div className="text-[11px] text-ct-cream/40 mt-0.5">build {COMMIT}</div>
        </Cell>
        <Cell label="Legal">
          <LinkRow href="#">Terms of Use</LinkRow>
          <LinkRow href="#">Privacy Policy</LinkRow>
          <LinkRow href="#">Disclaimer</LinkRow>
        </Cell>
        <Cell label="Support">
          <LinkRow href={`mailto:${SUPPORT_EMAIL}?subject=CoreTriage%20support`}>Email support</LinkRow>
          <LinkRow href={`mailto:${SUPPORT_EMAIL}?subject=CoreTriage%20feedback`}>Send feedback</LinkRow>
        </Cell>
      </div>
    </SettingsSection>
  )
}

function Cell({ label, children }) {
  return (
    <div className="rounded-xl bg-black/15 border border-ct-hairline px-4 py-3.5">
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ct-cream/50 mb-1.5">{label}</div>
      {children}
    </div>
  )
}

function LinkRow({ href, children }) {
  return (
    <a href={href} className="block py-0.5 text-xs text-ct-cream/70 hover:text-ct-terracotta transition-colors">
      {children} →
    </a>
  )
}
