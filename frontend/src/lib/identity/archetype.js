/**
 * Map a 5-axis pentagon to an archetype name.
 * @param {{power, crimpy, dynamic, technical, mobility}} axes - values 0-10
 * @returns {string} archetype name
 */
export function computeArchetype(axes) {
  const { power, crimpy, dynamic, technical, mobility } = axes

  // All low → Apprentice
  if ([power, crimpy, dynamic, technical, mobility].every((v) => v < 5)) {
    return 'Apprentice'
  }

  // Crimper: POW+CRMP high, MOB low
  if (power > 7 && crimpy > 7 && mobility < 5) return 'Crimper'

  // Dynamo: POW+DYN high
  if (power > 7 && dynamic > 7) return 'Dynamo'

  // Slabber: TECH+MOB high, POW low
  if (technical > 8 && mobility > 6 && power < 6) return 'Slabber'

  // Spider: CRMP+MOB high, DYN low
  if (crimpy > 8 && mobility > 6 && dynamic < 5) return 'Spider'

  // Acrobat: DYN+MOB high, CRMP low
  if (dynamic > 7 && mobility > 7 && crimpy < 5) return 'Acrobat'

  // Brute: CRMP+DYN high, TECH low
  if (crimpy > 7 && dynamic > 7 && technical < 5) return 'Brute'

  // All-Rounder: balanced
  const values = [power, crimpy, dynamic, technical, mobility]
  const max = Math.max(...values)
  const min = Math.min(...values)
  if (max - min <= 1.5) return 'All-Rounder'

  // Fallback — name from highest single axis
  const dominant = ['power', 'crimpy', 'dynamic', 'technical', 'mobility']
    .reduce((best, k) => (axes[k] > axes[best] ? k : best), 'power')
  const map = {
    power: 'Brute', crimpy: 'Crimper', dynamic: 'Dynamo',
    technical: 'Slabber', mobility: 'Spider',
  }
  return map[dominant]
}
