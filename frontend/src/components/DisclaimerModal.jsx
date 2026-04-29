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
  'Your injury history and session data is stored securely and is never shared or sold.',
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
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-lg bg-panel2 border border-outline rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-accent3/10 border-b border-accent3/20 px-6 py-5 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent3/20 border border-accent3/30 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-accent3" />
          </div>
          <div>
            <p className="text-sm font-bold text-text">Medical Disclaimer &amp; Terms of Use</p>
            <p className="text-xs text-muted mt-0.5">Please read before continuing</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          <p className="text-sm text-muted leading-relaxed">
            CoreTriage provides general injury guidance for informational purposes only.
          </p>

          {/* Emergency callout */}
          <div className="flex items-center gap-3 bg-accent2/10 border border-accent2/30 rounded-xl px-4 py-3">
            <PhoneCall size={16} className="text-accent2 shrink-0" />
            <p className="text-xs font-semibold text-accent2">
              Emergency? Call 911 immediately — do not use this app.
            </p>
          </div>

          {/* Agreement points */}
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
              By continuing you acknowledge and agree that:
            </p>
            <ul className="space-y-2">
              {POINTS.map((point, i) => (
                <li key={i} className="flex gap-2 text-xs text-muted leading-relaxed">
                  <span className="text-accent3/60 shrink-0 mt-0.5">•</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {/* Privacy points */}
          {!readOnly && (
            <div className="border-t border-outline pt-4">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck size={13} className="text-accent" />
                <p className="text-xs font-semibold text-muted uppercase tracking-wide">
                  For users with saved data:
                </p>
              </div>
              <ul className="space-y-2">
                {PRIVACY_POINTS.map((point, i) => (
                  <li key={i} className="flex gap-2 text-xs text-muted leading-relaxed">
                    <span className="text-accent/60 shrink-0 mt-0.5">•</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-outline px-6 py-4">
          {readOnly ? (
            <button onClick={onExit} className="btn-secondary w-full text-sm">
              Close
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onExit}
                className="btn-secondary flex-1 text-sm order-2 sm:order-1"
              >
                Exit App
              </button>
              <button
                onClick={onAccept}
                className="btn-primary flex-1 text-sm order-1 sm:order-2"
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
