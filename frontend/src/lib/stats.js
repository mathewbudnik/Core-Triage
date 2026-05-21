/**
 * Stat system for the RPG climber reward engine.
 * See spec §7.3 and §8.
 */

export const AXES = ['power', 'crimpy', 'dynamic', 'technical', 'mobility']

/**
 * Style chip → 5-axis stat increment per send.
 * Each chip's primary stat scores 3, with smaller contributions on adjacent axes.
 */
export const STYLE_CHIP_TO_STATS = {
  powerful:  { power: 3, crimpy: 1, dynamic: 1, technical: 0, mobility: 0 },
  crimpy:    { power: 1, crimpy: 3, dynamic: 0, technical: 1, mobility: 0 },
  dynamic:   { power: 1, crimpy: 0, dynamic: 3, technical: 1, mobility: 1 },
  technical: { power: 0, crimpy: 1, dynamic: 1, technical: 3, mobility: 1 },
  mobility:  { power: 0, crimpy: 0, dynamic: 1, technical: 1, mobility: 3 },
}

const ZERO_SHAPE = Object.freeze({
  power: 0, crimpy: 0, dynamic: 0, technical: 0, mobility: 0,
})

export function styleChipToStats(chipKey) {
  return STYLE_CHIP_TO_STATS[chipKey] ?? { ...ZERO_SHAPE }
}

const NULL_SHAPE = Object.freeze({
  power: null, crimpy: null, dynamic: null, technical: null, mobility: null,
})

// Style chip → primary stat axis. Note: "powerful" chip maps to "power" axis.
const STYLE_TO_AXIS = {
  powerful:  'power',
  crimpy:    'crimpy',
  dynamic:   'dynamic',
  technical: 'technical',
  mobility:  'mobility',
}

const V_GRADE_CAP = 10  // V10+ all cap at 10

/**
 * Compute the climber's stat shape — the max V-grade ticked in each style.
 *
 * @param {Array} sends — array of { stylePrimary: string, gradeNum: number }
 * @returns {object} { power, crimpy, dynamic, technical, mobility } — each is
 *   the max V-grade number sent in that style, or null if no sends in that style.
 *   Values are capped at 10 (V10+ all read as 10).
 */
export function deriveStatShape(sends) {
  if (!Array.isArray(sends) || sends.length === 0) return { ...NULL_SHAPE }
  const shape = { ...NULL_SHAPE }
  for (const send of sends) {
    if (!send || typeof send !== 'object') continue
    const axis = STYLE_TO_AXIS[send.stylePrimary]
    if (!axis) continue
    if (typeof send.gradeNum !== 'number' || !Number.isFinite(send.gradeNum)) continue
    const capped = Math.max(0, Math.min(V_GRADE_CAP, Math.floor(send.gradeNum)))
    if (shape[axis] === null || capped > shape[axis]) {
      shape[axis] = capped
    }
  }
  return shape
}
