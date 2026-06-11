import { SKILL_KEYS, skillColor } from '../../lib/skills'

const ABBR = { power: 'POW', crimp: 'CRMP', dynamic: 'DYN', technique: 'TEC', mobility: 'MOB' }

/**
 * Box-score row: POW 9 · CRMP 7 · DYN 6 · TEC 8 · MOB 5
 *
 * Props:
 *   scores:    object keyed by skill → numeric value
 *   className: extra classes
 */
export default function StatScoreLine({ scores = {}, className = '' }) {
  return (
    <div className={`inline-flex items-center font-mono text-[11px] tracking-wider uppercase ${className}`}>
      {SKILL_KEYS.map((k, i) => (
        <span key={k} className="inline-flex items-center">
          {i > 0 && <span className="mx-2 h-3 w-px bg-ct-hairline" aria-hidden="true" />}
          <span style={{ color: skillColor(k) }}>
            {ABBR[k]} {scores[k] ?? '—'}
          </span>
        </span>
      ))}
    </div>
  )
}
