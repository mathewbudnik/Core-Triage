import { useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { TRANSITIONS } from '../lib/motion'

/**
 * Generic full-screen modal for long-form legal text (Privacy Policy,
 * Terms of Service). Pass `document` from data/legal.js.
 */
export default function LegalModal({ document, onClose }) {
  const handleEscape = useCallback((e) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [handleEscape])

  const handleOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget) onClose()
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-bg/90 backdrop-blur-md p-4"
      onClick={handleOverlayClick}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, filter: 'blur(6px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        transition={TRANSITIONS.dialog_in}
        className="w-full max-w-2xl max-h-[calc(100dvh-2rem)] bg-ct-forest-deep border border-ct-hairline rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-ct-hairline flex items-center justify-between bg-ct-forest">
          <div>
            <h2 className="text-base font-bold text-ct-cream">{document.title}</h2>
            <p className="text-xs text-ct-cream/60 mt-0.5">Effective {document.effective}</p>
          </div>
          <button
            onClick={onClose}
            className="text-ct-cream/60 hover:text-ct-cream transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="px-6 py-5 overflow-y-auto flex-1">
          <p className="text-sm text-ct-cream/60 leading-relaxed mb-5">
            {document.intro}
          </p>

          {document.sections.map((section, i) => (
            <div key={i} className="mb-5">
              <h3 className="text-sm font-semibold text-ct-cream mb-2">
                {section.heading}
              </h3>
              <div className="space-y-2">
                {section.body.map((para, j) => (
                  <p key={j} className="text-xs text-ct-cream/60 leading-relaxed">
                    {para}
                  </p>
                ))}
              </div>
            </div>
          ))}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-ct-hairline bg-ct-forest flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-ct-hairline text-ct-cream/80 border border-ct-rim hover:brightness-110 transition-all duration-200"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  )
}
