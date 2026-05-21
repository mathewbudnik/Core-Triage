import { STYLE_ORDER } from './styleColors.js'

/**
 * Walk an array of training_logs and aggregate per-style counts from each
 * log's climbs.<discipline>.<grade>.styles map. Logs without a styles map
 * are "untagged" and skipped — they don't contribute to the profile.
 *
 * Returns:
 *   {
 *     counts:     Record<style, number>,
 *     pct:        Record<style, number>,                      // 0..100 ints
 *     total:      number,
 *     dominant:   style | null,
 *     weakest:    style | null,                               // only when total >= 6
 *     confidence: 'low' | 'medium' | 'high',
 *   }
 *
 * Confidence gates:
 *   low    — total < 6
 *   medium — 6 <= total < 20
 *   high   — total >= 20
 *
 * Ties broken in STYLE_ORDER for dominant; first wins on equal counts.
 */
export function deriveStyleProfile(trainingLogs) {
  const counts = Object.fromEntries(STYLE_ORDER.map((s) => [s, 0]))

  for (const log of trainingLogs || []) {
    const climbs = log?.climbs || {}
    for (const discipline of ['boulder', 'route']) {
      const grades = climbs[discipline] || {}
      for (const grade of Object.keys(grades)) {
        const entry = grades[grade] || {}
        const styles = entry.styles
        if (!styles || typeof styles !== 'object') continue
        for (const s of STYLE_ORDER) {
          counts[s] += Number(styles[s] || 0)
        }
      }
    }
  }

  const total = STYLE_ORDER.reduce((sum, s) => sum + counts[s], 0)

  const confidence =
    total >= 20 ? 'high' :
    total >= 6  ? 'medium' :
                  'low'

  const pct = Object.fromEntries(STYLE_ORDER.map((s) => [s, 0]))
  if (total > 0) {
    const rawPcts = {}
    for (const s of STYLE_ORDER) {
      rawPcts[s] = (counts[s] / total) * 100
    }
    // Find the index of the style with the largest fraction part to round up.
    let maxFracIdx = -1
    let maxFrac = 0
    const fractionalParts = {}
    for (let i = 0; i < STYLE_ORDER.length; i++) {
      const s = STYLE_ORDER[i]
      const frac = rawPcts[s] - Math.floor(rawPcts[s])
      fractionalParts[s] = frac
      if (frac > maxFrac) {
        maxFrac = frac
        maxFracIdx = i
      }
    }
    // Floor all, then ceil the one with the largest fractional part.
    for (let i = 0; i < STYLE_ORDER.length; i++) {
      const s = STYLE_ORDER[i]
      pct[s] = Math.floor(rawPcts[s])
      if (i === maxFracIdx && maxFrac > 0) {
        pct[s]++
      }
    }
  }

  // Tie-break: STYLE_ORDER for dominant (first wins on equal counts), and
  // also STYLE_ORDER for weakest (first wins on equal counts, alphabetically).
  let dominant = null
  let weakest  = null
  if (total > 0) {
    let domCount = -1
    let weakCount = Infinity
    for (const s of STYLE_ORDER) {
      if (counts[s] > domCount)  { domCount = counts[s];  dominant = s }
      if (counts[s] < weakCount) { weakCount = counts[s]; weakest = s }
    }
  }
  // Suppress weakest when we don't have enough data to trust it.
  if (total < 6) weakest = null

  return { counts, pct, total, dominant, weakest, confidence }
}
