import { AlertTriangle, Check, X } from 'lucide-react'

// Severity → palette. Hex values match the existing tailwind tokens
// (accent/accent2/accent3) so the hero color-matches the rest of the app.
const PALETTE = {
  mild:     { color: '#5f7a4e', tintFrom: 'rgba(151,168,134,0.22)', tintTo: 'rgba(151,168,134,0.05)', border: 'rgba(151,168,134,0.45)', glow: 'rgba(151,168,134,0.12)', label: 'Mild' },
  moderate: { color: '#9a7820', tintFrom: 'rgba(215,172,91,0.22)',  tintTo: 'rgba(215,172,91,0.05)',  border: 'rgba(215,172,91,0.45)',  glow: 'rgba(215,172,91,0.12)',  label: 'Moderate' },
  severe:   { color: '#b06a4f', tintFrom: 'rgba(176,106,79,0.22)',  tintTo: 'rgba(176,106,79,0.05)',  border: 'rgba(176,106,79,0.50)',  glow: 'rgba(176,106,79,0.14)',  label: 'Severe' },
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
                style={{ background: 'rgba(176,106,79,0.22)', color: '#b06a4f' }}>
            <AlertTriangle size={11} strokeWidth={2.6} />
          </span>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.10em]"
             style={{ color: '#b06a4f' }}>
            {p.label} · See a clinician
          </p>
        </div>
        <h2 className="text-[17px] font-extrabold leading-tight mb-1">{title}</h2>
        <p className="text-[12px] text-ink-soft leading-relaxed">{redFlagBody || why}</p>
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
      <p className="text-[13px] text-ink-soft leading-relaxed">{why}</p>

      {actions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3.5 pt-3.5
                        border-t-[0.5px] border-ct-hairline">
          {actions.map((a, i) => (
            <span key={i}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold
                             px-2.5 py-1 rounded-full
                             bg-ink/[0.05] border-[0.5px] border-ink/[0.12]">
              <span className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-full
                                ${a.kind === 'do'
                                  ? 'bg-[rgba(151,168,134,0.30)] text-[#5f7a4e]'
                                  : 'bg-[rgba(176,106,79,0.25)] text-[#b06a4f]'}`}>
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
