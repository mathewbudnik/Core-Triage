import { ChevronRight } from 'lucide-react'

/**
 * Current-project card. Coral-themed, fixed (does NOT re-tier).
 *
 * Props:
 *   project: {
 *     name:           string,     // 'The Sentinel'
 *     grade:          string,     // 'V8'
 *     failedTries:    number,     // historical tap-outs
 *     hasCurrentTry:  boolean,    // whether to show the current dot
 *     futureTryCount: number,     // optional visual budget for upcoming tries
 *   } | null
 *   onContinue:  () => void
 *
 * If project === null, the card renders nothing (caller hides the section).
 */
export default function HubProjectCard({ project, onContinue }) {
  if (!project) return null

  const dots = []
  for (let i = 0; i < project.failedTries; i++) {
    dots.push('failed')
  }
  if (project.hasCurrentTry) dots.push('current')
  for (let i = 0; i < (project.futureTryCount || 0); i++) {
    dots.push('future')
  }

  return (
    <div className="rounded-2xl p-4"
         style={{
           background: 'linear-gradient(135deg, rgba(251,113,133,0.16), rgba(251,113,133,0.04))',
           border: '0.5px solid rgba(251,113,133,0.32)',
           boxShadow: 'inset 0 0 24px rgba(251,113,133,0.06)',
         }}>
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-accent2">
        Current project
      </div>
      <div className="text-base font-bold text-text -tracking-[0.02em] mt-1 mb-2.5">
        {project.name} · {project.grade}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {dots.map((kind, i) => (
            <span key={i} className="w-2.5 h-2.5 rounded-full border-[1.5px]"
                  style={{
                    background:
                      kind === 'failed' ? 'rgba(251,113,133,0.35)' :
                      kind === 'current' ? 'rgba(251,191,36,0.45)' :
                      'transparent',
                    borderColor:
                      kind === 'failed' ? '#fb7185' :
                      kind === 'current' ? '#fbbf24' :
                      'rgba(255,255,255,0.18)',
                    boxShadow: kind === 'current' ? '0 0 6px rgba(251,191,36,0.5)' : 'none',
                  }} />
          ))}
        </div>
        <button onClick={onContinue}
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-accent2/90 hover:text-accent2">
          Try {project.failedTries + 1}
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  )
}
