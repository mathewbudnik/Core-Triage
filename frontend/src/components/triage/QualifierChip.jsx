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
  teal:  { bg: 'rgba(151,168,134,0.18)', border: 'rgba(151,168,134,0.40)', text: '#5f7a4e' },
  muted: { bg: 'rgba(141,132,114,0.15)', border: 'rgba(141,132,114,0.30)', text: '#5f594c' },
  amber: { bg: 'rgba(215,172,91,0.18)',  border: 'rgba(215,172,91,0.40)',  text: '#9a7820' },
  coral: { bg: 'rgba(176,106,79,0.15)',  border: 'rgba(176,106,79,0.40)',  text: '#b06a4f' },
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
          className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-30 w-52 p-2.5 rounded-lg shadow-xl border border-ct-hairline bg-ct-forest-deep text-[11px] text-ct-cream leading-snug normal-case font-normal tracking-normal"
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
