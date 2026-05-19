import { useState, useRef, useEffect } from 'react'
import { Info } from 'lucide-react'
import { QUALIFIER_GLOSSARY } from '../../lib/qualifierGlossary'

/**
 * Small pill that renders a triage qualifier ("possible", "must rule out", etc.)
 * and pops a tooltip with a plain-English definition on hover or tap. Used in
 * the diagnosis UI so no label leaves the user guessing what it means.
 *
 * Props:
 *   - qualifier: lowercase key from QUALIFIER_GLOSSARY (e.g. "possible")
 *   - size: 'sm' | 'md' (default 'md')
 *
 * Renders nothing if the qualifier isn't in the glossary — graceful no-op for
 * future qualifiers we haven't added definitions for yet.
 */
const TONE_STYLES = {
  teal:  { bg: 'rgba(125,211,192,0.15)', border: 'rgba(125,211,192,0.35)', text: '#7dd3c0' },
  muted: { bg: 'rgba(138,147,166,0.15)', border: 'rgba(138,147,166,0.30)', text: '#a9b7d0' },
  amber: { bg: 'rgba(247,187,81,0.15)',  border: 'rgba(247,187,81,0.35)',  text: '#f7bb51' },
  coral: { bg: 'rgba(244,114,114,0.15)', border: 'rgba(244,114,114,0.40)', text: '#fda4af' },
}

export default function QualifierChip({ qualifier, size = 'md' }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    function handleEsc(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [open])

  const meta = QUALIFIER_GLOSSARY[qualifier?.toLowerCase()]
  if (!meta) return null
  const tone = TONE_STYLES[meta.tone] || TONE_STYLES.muted

  const padding = size === 'sm'
    ? 'px-1.5 py-0.5 text-[9px]'
    : 'px-2 py-0.5 text-[10px]'

  return (
    <span ref={wrapRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        aria-expanded={open}
        aria-label={`${meta.label} — ${meta.summary}`}
        className={`inline-flex items-center gap-1 font-extrabold uppercase tracking-wider rounded-full border ${padding}`}
        style={{ background: tone.bg, color: tone.text, borderColor: tone.border }}
      >
        {meta.label}
        <Info size={size === 'sm' ? 8 : 9} strokeWidth={2.4} className="opacity-80" />
      </button>

      {open && (
        <span
          role="tooltip"
          className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-30 w-52 p-2.5 rounded-lg shadow-xl border border-outline bg-panel2 text-[11px] text-text/90 leading-snug normal-case font-normal tracking-normal"
        >
          <span className="block font-bold mb-1" style={{ color: tone.text }}>
            {meta.label}
          </span>
          {meta.summary}
        </span>
      )}
    </span>
  )
}
