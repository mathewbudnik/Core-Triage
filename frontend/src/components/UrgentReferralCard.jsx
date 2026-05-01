import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { URGENT_REFERRAL_CONTENT } from '../data/wizardConfigV2'

/**
 * Full-screen takeover for climbing-recognizable urgent referrals
 * (bowstringing, distal bicep tear, locked knee, scaphoid suspect, etc.).
 * Pass `flagKey` matching a key in URGENT_REFERRAL_CONTENT, plus an
 * `onAcknowledge` callback that exposes the triage output below.
 */
export default function UrgentReferralCard({ flagKey, onAcknowledge }) {
  const content = URGENT_REFERRAL_CONTENT[flagKey]
  if (!content) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-2xl mx-auto p-6"
      role="alertdialog"
      aria-live="assertive"
    >
      <div className="border-2 border-accent2 bg-accent2/10 rounded-2xl p-6 shadow-glow">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle size={28} className="text-accent2 shrink-0 mt-1" />
          <h1 className="text-xl font-semibold text-text">{content.title}</h1>
        </div>

        <p className="text-base text-text mb-5">{content.plain}</p>

        <div className="bg-panel border border-outline rounded-xl p-4 mb-5">
          <p className="text-base font-medium text-text">{content.action}</p>
        </div>

        <div className="mb-6">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-2">
            What NOT to do
          </h2>
          <ul className="space-y-1">
            {content.do_not.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text">
                <span className="w-1 h-1 rounded-full bg-accent2 mt-2 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          onClick={onAcknowledge}
          className="w-full py-3 px-4 bg-accent text-bg rounded-xl font-medium hover:bg-accent/90 transition-colors"
        >
          I understand
        </button>
      </div>
    </motion.div>
  )
}
