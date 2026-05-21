import { AlertTriangle, Check, X } from 'lucide-react'

// Severity → palette. Hex values match the existing tailwind tokens
// (accent/accent2/accent3) so the hero color-matches the rest of the app.
const PALETTE = {
  mild:     { color: '#14b8a6', tintFrom: 'rgba(20,184,166,0.18)',  tintTo: 'rgba(20,184,166,0.04)',  border: 'rgba(20,184,166,0.40)',  glow: 'rgba(20,184,166,0.10)',  label: 'Mild' },
  moderate: { color: '#fbbf24', tintFrom: 'rgba(251,191,36,0.18)',  tintTo: 'rgba(251,191,36,0.04)',  border: 'rgba(251,191,36,0.40)',  glow: 'rgba(251,191,36,0.10)',  label: 'Moderate' },
  severe:   { color: '#fb7185', tintFrom: 'rgba(251,113,133,0.18)', tintTo: 'rgba(251,113,133,0.04)', border: 'rgba(251,113,133,0.50)', glow: 'rgba(251,113,133,0.12)', label: 'Severe' },
}

/**
 * Severity hero. Variant by severity tier:
 *   - mild/moderate: gradient hero with title + 1-paragraph why + ✓/✗ action chips
 *   - severe:        red-flag callout shape (warning icon + headline + paragraph,
 *                    NO action chips — actions are clinical, not self-managed)
 *
 * Props:
 *   severity:    'mild' | 'moderate' | 'severe'
 *   title:       headline (e.g. "Wrist flexor tendinopathy")
 *   why:         one-paragraph reasoning
 *   actions:     Array<{ kind: 'do' | 'dont', text: string }> — ignored for severe
 *   redFlagBody: only used for severe — paragraph explaining the urgent guidance
 */
export default function TriageHero({ severity, title, why, actions = [], redFlagBody }) {
  const p = PALETTE[severity] || PALETTE.moderate

  if (severity === 'severe') {
    return (
      <section
        className="relative overflow-hidden rounded-2xl p-[18px] mb-3
                   border-[0.5px]"
        style={{
          background: `linear-gradient(180deg, ${p.tintFrom} 0%, ${p.tintTo} 100%)`,
          borderColor: p.border,
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full"
                style={{ background: 'rgba(251,113,133,0.30)', color: '#fda4af' }}>
            <AlertTriangle size={11} strokeWidth={2.6} />
          </span>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.10em]"
             style={{ color: '#fda4af' }}>
            {p.label} · See a clinician
          </p>
        </div>
        <h2 className="text-[17px] font-extrabold leading-tight mb-1">{title}</h2>
        <p className="text-[12px] text-ct-cream/60 leading-relaxed">{redFlagBody || why}</p>
      </section>
    )
  }

  return (
    <section
      className="relative overflow-hidden rounded-2xl p-[18px] mb-3 border-[0.5px]"
      style={{
        background: `linear-gradient(180deg, ${p.tintFrom} 0%, ${p.tintTo} 100%)`,
        borderColor: p.border,
        boxShadow: `0 0 36px ${p.glow}`,
      }}
    >
      <span
        className="inline-flex items-center gap-1.5 text-[10px] font-extrabold
                   uppercase tracking-[0.10em] px-2.5 py-1 rounded-full mb-2.5
                   border-[0.5px]"
        style={{ color: p.color, background: `${p.tintFrom}`, borderColor: p.border }}
      >
        ● {p.label}
      </span>
      <h2 className="text-[18px] font-extrabold tracking-[-0.01em] leading-tight mb-1.5">{title}</h2>
      <p className="text-[13px] text-ct-cream/60 leading-relaxed">{why}</p>

      {actions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3.5 pt-3.5
                        border-t-[0.5px] border-[rgba(255,255,255,0.10)]">
          {actions.map((a, i) => (
            <span key={i}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold
                             px-2.5 py-1 rounded-full
                             bg-white/[0.05] border-[0.5px] border-white/12">
              <span className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-full
                                ${a.kind === 'do'
                                  ? 'bg-[rgba(20,184,166,0.25)] text-[#5eead4]'
                                  : 'bg-[rgba(251,113,133,0.22)] text-[#fda4af]'}`}>
                {a.kind === 'do' ? <Check size={9} strokeWidth={3}/> : <X size={9} strokeWidth={3}/>}
              </span>
              {a.text}
            </span>
          ))}
        </div>
      )}
    </section>
  )
}
