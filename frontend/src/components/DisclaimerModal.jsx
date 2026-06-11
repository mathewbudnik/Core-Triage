import { useCallback } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, PhoneCall, ShieldCheck } from 'lucide-react'

const POINTS = [
  'CoreTriage is NOT a medical diagnosis tool and does not replace professional medical advice, diagnosis, or treatment.',
  'Information provided is for general educational purposes about common climbing injuries.',
  'You should always consult a qualified healthcare professional for any injury or medical concern.',
  'In case of emergency, call 911 immediately — do not use this app.',
  'CoreTriage is not liable for any decisions made based on information provided in this app.',
  'If you have a serious or worsening injury, stop using this app and seek immediate medical attention.',
]

const PRIVACY_POINTS = [
  'Your injury history and session data are stored securely and are never shared or sold.',
  'You can request deletion of your data at any time by contacting support.',
  'Data is stored in compliance with applicable privacy laws.',
]

export default function DisclaimerModal({ onAccept, onExit, readOnly = false }) {
  // Prevent closing by clicking outside or pressing Escape — use onKeyDown on the overlay
  const blockEscape = useCallback((e) => {
    if (e.key === 'Escape') e.preventDefault()
  }, [])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-bg/90 backdrop-blur-md p-4"
      onKeyDown={blockEscape}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.08 }}
        className="w-full max-w-lg max-h-[calc(100dvh-2rem)] bg-ct-forest-deep border border-ct-hairline rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-ct-terracotta/10 border-b border-ct-terracotta/20 px-6 py-5 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-ct-terracotta/15 border border-ct-terracotta/25 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-ct-terracotta" />
          </div>
          <div>
            <p className="text-sm font-bold text-ct-cream">Medical Disclaimer &amp; Terms of Use</p>
            <p className="text-xs text-ink-soft mt-0.5">Please read before continuing</p>
          </div>
        </div>

        {/* Body — flex-1 + overflow-y-auto lets the body scroll while the
            header and footer (accept/exit buttons) stay visible on short
            viewports like iPhone SE portrait. */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
          <p className="text-sm text-ink-soft leading-relaxed">
            CoreTriage provides general injury guidance for informational purposes only.
          </p>

          {/* Emergency callout */}
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">
            <PhoneCall size={16} className="text-red-400 shrink-0" />
            <p className="text-xs font-semibold text-red-400">
              Emergency? Call 911 immediately — do not use this app.
            </p>
          </div>

          {/* Agreement points */}
          <div>
            <p className="text-xs font-semibold text-ink-soft uppercase tracking-wide mb-3">
              By continuing you acknowledge and agree that:
            </p>
            <ul className="space-y-2">
              {POINTS.map((point, i) => (
                <li key={i} className="flex gap-2 text-xs text-ink-soft leading-relaxed">
                  <span className="text-ct-terracotta/60 shrink-0 mt-0.5">•</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {/* Privacy points */}
          {!readOnly && (
            <div className="border-t border-ct-hairline pt-4">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck size={13} className="text-ct-terracotta" />
                <p className="text-xs font-semibold text-ink-soft uppercase tracking-wide">
                  For users with saved data:
                </p>
              </div>
              <ul className="space-y-2">
                {PRIVACY_POINTS.map((point, i) => (
                  <li key={i} className="flex gap-2 text-xs text-ink-soft leading-relaxed">
                    <span className="text-ct-terracotta/60 shrink-0 mt-0.5">•</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-ct-hairline px-6 py-4">
          {readOnly ? (
            <button
              onClick={onExit}
              className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-ct-hairline text-ink-soft border border-ct-rim hover:brightness-110 transition-all duration-200"
            >
              Close
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onExit}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-ct-hairline text-ink-soft border border-ct-rim hover:brightness-110 transition-all duration-200 order-2 sm:order-1"
              >
                Exit App
              </button>
              <button
                onClick={onAccept}
                className="flex-1 px-5 py-2.5 rounded-lg text-sm font-semibold bg-ct-terracotta text-ct-cream hover:brightness-110 active:brightness-95 transition-all duration-200 order-1 sm:order-2"
              >
                I Understand &amp; Agree
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
