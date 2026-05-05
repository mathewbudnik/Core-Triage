import { useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'

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
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.08 }}
        className="w-full max-w-2xl bg-panel2 border border-outline rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '85vh' }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline flex items-center justify-between bg-panel">
          <div>
            <h2 className="text-base font-bold text-text">{document.title}</h2>
            <p className="text-xs text-muted mt-0.5">Effective {document.effective}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-text transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="px-6 py-5 overflow-y-auto flex-1">
          <p className="text-sm text-muted leading-relaxed mb-5">
            {document.intro}
          </p>

          {document.sections.map((section, i) => (
            <div key={i} className="mb-5">
              <h3 className="text-sm font-semibold text-text mb-2">
                {section.heading}
              </h3>
              <div className="space-y-2">
                {section.body.map((para, j) => (
                  <p key={j} className="text-xs text-muted leading-relaxed">
                    {para}
                  </p>
                ))}
              </div>
            </div>
          ))}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-outline bg-panel flex justify-end">
          <button
            onClick={onClose}
            className="btn-secondary text-sm"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  )
}
