/**
 * Body calibration — stores a per-user shoulderWidth + torsoLength
 * baseline so the rule engine can apply STABLE body-relative thresholds
 * across an entire clip (and across clips) instead of recalculating
 * scale every frame.
 *
 * Why stable beats per-frame:
 *   • Within a clip, the climber's projected shoulder width varies with
 *     pose — tight curls make it shrink ~30%; wide reaches make it grow.
 *     Per-frame body-relative thresholds drift with that variation. A
 *     "knee 33% of shoulderWidth from ankle" check produces different
 *     results frame-to-frame for the same actual knee position.
 *   • A clip-wide median (taken over only "good" frames passing the
 *     anatomical sanity check) is far more stable. Same threshold,
 *     consistent verdict.
 *   • A profile-wide running average is even better — outliers from
 *     bad clips get smoothed; new clips refine the estimate.
 *
 * Sources (in order of authority — higher wins when present):
 *   1. 'explicit'  — dedicated calibration clip (neutral pose). Locked.
 *   2. 'empirical' — running average from analysis clips.
 *   3. 'derived'   — computed from manual height + apeIndex anthropometric ratios.
 *
 * Storage: localStorage, scoped to this app. No backend yet — when a
 * climber-account system exists we'll migrate to server-side persistence
 * so calibration follows the user across devices.
 */

const STORAGE_KEY = 'coretriage:movementAnalyzer:bodyCalibration'

// Anthropometric ratios — average human body proportions. Used as the
// Day 1 baseline when the user enters height (+ optional apeIndex)
// before they've uploaded any clips. Sourced from standard
// ergonomic anthropometry tables (Pheasant 2003) — these are population
// averages and individual variation is ±10%.
const SHOULDER_TO_HEIGHT_RATIO = 0.23   // shoulder width ≈ 23% of standing height
const TORSO_TO_HEIGHT_RATIO    = 0.30   // shoulder-to-hip ≈ 30% of standing height

// Fallback baseline assumes "typical" framing — torso fills ~25% of
// frame height, shoulders span ~12%. Used when no calibration data
// at all. These match the magic numbers the rules were tuned against.
const DEFAULT_BASELINE = {
  shoulderWidth: 0.12,
  torsoLength: 0.25,
  source: 'default',
}

/**
 * Load saved calibration from localStorage. Returns DEFAULT_BASELINE
 * with `source: 'default'` if no record exists or storage is unavailable.
 */
export function loadCalibration() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_BASELINE, clipCount: 0 }
    const parsed = JSON.parse(raw)
    // Sanity-check the shape — guard against legacy data or tampering.
    if (typeof parsed.shoulderWidth !== 'number' || typeof parsed.torsoLength !== 'number') {
      return { ...DEFAULT_BASELINE, clipCount: 0 }
    }
    return parsed
  } catch {
    return { ...DEFAULT_BASELINE, clipCount: 0 }
  }
}

/**
 * Save calibration to localStorage. Silent no-op if storage is full
 * or unavailable — calibration is an enhancement, not a hard requirement.
 */
export function saveCalibration(cal) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...cal,
      lastUpdated: new Date().toISOString(),
    }))
  } catch {
    // Storage quota or private mode — silently skip.
  }
}

/**
 * Compute stable shoulderWidth + torsoLength from a pose-landmark cache
 * by taking the median across all frames (relying on the cache having
 * already passed the anatomical sanity outlier rejection upstream).
 *
 * Returns null if the cache has too few measurable frames — the rule
 * engine then falls back to per-frame body scale.
 */
export function computeStableScale(cache) {
  if (!cache || cache.size === 0) return null
  const shoulders = []
  const torsos    = []

  for (const landmarks of cache.values()) {
    if (!landmarks || landmarks.length < 25) continue
    const ls = landmarks[11], rs = landmarks[12]   // shoulders
    const lh = landmarks[23], rh = landmarks[24]   // hips
    if (!ls || !rs || !lh || !rh) continue
    const minVis = Math.min(ls.visibility ?? 1, rs.visibility ?? 1, lh.visibility ?? 1, rh.visibility ?? 1)
    if (minVis < 0.5) continue

    const shoulderWidth = Math.hypot(rs.x - ls.x, rs.y - ls.y)
    const sx = (ls.x + rs.x) / 2
    const sy = (ls.y + rs.y) / 2
    const hx = (lh.x + rh.x) / 2
    const hy = (lh.y + rh.y) / 2
    const torsoLength = Math.hypot(sx - hx, sy - hy)
    if (shoulderWidth >= 0.03 && torsoLength >= 0.05) {
      shoulders.push(shoulderWidth)
      torsos.push(torsoLength)
    }
  }

  // Need a minimum sample size for a trustworthy median.
  if (shoulders.length < 10) return null
  return {
    shoulderWidth: median(shoulders),
    torsoLength:   median(torsos),
    sampleCount:   shoulders.length,
  }
}

/**
 * Blend a fresh per-clip scale into the running-average profile.
 * Newer clips get slightly higher weight so the calibration drifts
 * toward "what the climber actually looks like today" rather than
 * being stuck on whatever the first clip happened to show.
 *
 * Authority rules:
 *   • 'explicit' calibration ignores empirical updates (locked).
 *   • 'derived' calibration is replaced by the first empirical clip.
 *   • 'empirical' calibration is averaged with new clips, weighted
 *     toward recent.
 */
export function updateFromClip(existing, clipScale) {
  if (!clipScale) return existing

  // Explicit calibration is locked — analysis clips don't drift it.
  if (existing.source === 'explicit') return existing

  // Derived calibration gets replaced by the first real clip.
  if (existing.source === 'derived' || existing.source === 'default') {
    return {
      ...existing,
      shoulderWidth: clipScale.shoulderWidth,
      torsoLength:   clipScale.torsoLength,
      clipCount: 1,
      source: 'empirical',
    }
  }

  // Empirical running average, recent-weighted.
  // Effective weight on new clip: 1 / (sqrt(N) + 1) — sub-linear so
  // many clips don't make the baseline rigid.
  const count = (existing.clipCount ?? 1)
  const wNew = 1 / (Math.sqrt(count) + 1)
  const wOld = 1 - wNew
  return {
    ...existing,
    shoulderWidth: existing.shoulderWidth * wOld + clipScale.shoulderWidth * wNew,
    torsoLength:   existing.torsoLength   * wOld + clipScale.torsoLength   * wNew,
    clipCount: count + 1,
    source: 'empirical',
  }
}

/**
 * Set explicit calibration from a dedicated calibration clip. Locks
 * future analysis clips out of drifting the baseline.
 */
export function setExplicitCalibration(existing, clipScale) {
  if (!clipScale) return existing
  return {
    ...existing,
    shoulderWidth: clipScale.shoulderWidth,
    torsoLength:   clipScale.torsoLength,
    clipCount: existing.clipCount ?? 0,
    source: 'explicit',
  }
}

/**
 * Update profile metadata (height + apeIndex) without touching the
 * empirical body scale. Sets source='derived' only when no empirical
 * data exists yet.
 *
 * @param {Object} existing
 * @param {{height?: number, apeIndex?: number}} measurements — cm
 */
export function updateMeasurements(existing, { height, apeIndex }) {
  const next = { ...existing }
  if (typeof height === 'number')   next.height = height
  if (typeof apeIndex === 'number') next.apeIndex = apeIndex

  // If we have no empirical baseline yet, derive one from the new
  // measurements. Anthropometric estimates are the cold-start fallback.
  if (existing.source === 'default' && typeof height === 'number' && height > 0) {
    next.shoulderWidth = SHOULDER_TO_HEIGHT_RATIO * (height / 175) * 0.12   // ~0.12 at 175cm
    next.torsoLength   = TORSO_TO_HEIGHT_RATIO   * (height / 175) * 0.25
    next.source = 'derived'
  }
  return next
}

function median(arr) {
  if (!arr.length) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/**
 * Project the stored calibration into the shape rules consume.
 * { shoulderWidth, torsoLength } — drops bookkeeping fields.
 */
export function asScale(cal) {
  if (!cal) return null
  if (typeof cal.shoulderWidth !== 'number' || typeof cal.torsoLength !== 'number') return null
  return { shoulderWidth: cal.shoulderWidth, torsoLength: cal.torsoLength }
}
