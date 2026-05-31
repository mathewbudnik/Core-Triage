/**
 * Compound-moment detection.
 *
 * When several flag rules fire on the same move, that's a higher-leverage
 * coaching signal than any single rule alone. A climber whose shoulders
 * shrug AND elbow chicken-wings AND head pitches down on the same pull
 * has a layered upper-body issue worth a single attention chunk, not
 * three separate cards spread across the report.
 *
 * Grouping logic:
 *   1. Expand each flag finding into per-instance records.
 *   2. Walk in timestamp order, greedily collecting all instances within
 *      WINDOW_MS of the earliest unconsumed one.
 *   3. Promote a group to a "moment" when it satisfies AT LEAST one of:
 *        • 2+ rules in the same bodyRegion (deep regional issue), OR
 *        • 3+ distinct rules total (general cascade).
 *      Both gates kill the trivial "any two rules happened to overlap"
 *      case from spamming the section.
 *
 * Wins are excluded — compound moments are about flag clusters that
 * deserve coaching attention. Positive moments live in the "What
 * worked" section.
 *
 * Each instance can only contribute to ONE moment — once consumed it
 * doesn't double-count into the next window.
 */

const WINDOW_MS = 1000  // 1-second window: roughly one climbing move

/**
 * @param {Array} findings — output from runRules()
 * @returns {Array} moments — { ts, ruleIds, rules: [{ruleId,name,severity,bodyRegion}], bodyRegions }
 */
export function findCompoundMoments(findings) {
  if (!findings) return []

  // Flag-only: wins don't deserve a compound-moment surface.
  const flags = findings.filter((f) => f.kind !== 'win')

  // Expand each flag into per-instance records so a multi-instance rule
  // can compound with itself across distinct moves in the clip.
  const instances = []
  for (const f of flags) {
    for (const ts of f.timestamps ?? []) {
      instances.push({
        ts,
        ruleId: f.ruleId,
        name: f.name,
        severity: f.severity,
        bodyRegion: f.bodyRegion,
        cue: f.cue,
      })
    }
  }
  instances.sort((a, b) => a.ts - b.ts)

  const consumed = new Set()
  const moments = []

  for (let i = 0; i < instances.length; i++) {
    if (consumed.has(i)) continue
    const start = instances[i]
    const group = [start]
    consumed.add(i)

    for (let j = i + 1; j < instances.length; j++) {
      if (consumed.has(j)) continue
      if (instances[j].ts - start.ts > WINDOW_MS) break
      // Don't double-count the same rule firing twice within the window.
      if (group.some((g) => g.ruleId === instances[j].ruleId)) continue
      group.push(instances[j])
      consumed.add(j)
    }

    if (group.length < 2) continue

    // Threshold to qualify: 2+ rules in same region OR 3+ total rules.
    const regionCounts = new Map()
    for (const item of group) {
      regionCounts.set(item.bodyRegion, (regionCounts.get(item.bodyRegion) ?? 0) + 1)
    }
    const hasRegionPair = [...regionCounts.values()].some((c) => c >= 2)
    if (!hasRegionPair && group.length < 3) continue

    moments.push({
      ts: start.ts,
      ruleIds: group.map((g) => g.ruleId),
      rules: group,
      bodyRegions: [...new Set(group.map((g) => g.bodyRegion))],
      // Highest severity among contributors drives the moment's color.
      severity: dominantSeverity(group),
    })
  }

  return moments
}

const SEVERITY_RANK = { polish: 1, important: 2, critical: 3 }

function dominantSeverity(group) {
  let best = 'polish'
  for (const item of group) {
    if ((SEVERITY_RANK[item.severity] ?? 0) > (SEVERITY_RANK[best] ?? 0)) {
      best = item.severity
    }
  }
  return best
}

/**
 * Human-readable label for a body-region key. Centralized here so the
 * compound UI and any future region-summary chips agree.
 */
export function bodyRegionLabel(region) {
  switch (region) {
    case 'shoulders-arms': return 'shoulders / arms'
    case 'hips-core':       return 'hips / core'
    case 'knees-feet':      return 'knees / feet'
    case 'head-gaze':       return 'head / gaze'
    default:                return region || 'unknown'
  }
}
