/**
 * One-Euro filter for temporal smoothing of MediaPipe Pose landmarks.
 *
 * The default Kalman smoothing inside MediaPipe is tuned for stationary
 * upper-body (postural analysis), not athletic motion — climbing footage
 * jitters noticeably without an extra pass. One-Euro adapts to motion
 * velocity: heavy smoothing during stillness (kills jitter), light
 * smoothing during fast moves (no lag).
 *
 * Reference: Géry Casiez et al., "1€ Filter" — CHI 2012.
 * https://cristal.univ-lille.fr/~casiez/1euro/
 *
 * Tuning notes (defaults below):
 *   - min_cutoff: minimum cutoff frequency. Lower = more smoothing at low
 *                 speeds. 1.0 Hz balances jitter vs latency on 30fps video.
 *   - beta: speed-coefficient. Higher = less smoothing during fast motion.
 *           0.04 keeps dynamic moves (deadpoints, dynos) snappy.
 *   - d_cutoff: derivative cutoff. Keep at 1.0 Hz (standard).
 */

const DEFAULT_MIN_CUTOFF = 1.0
const DEFAULT_BETA       = 0.04
const DEFAULT_D_CUTOFF   = 1.0

function lowpassAlpha(cutoff, dt) {
  const tau = 1 / (2 * Math.PI * cutoff)
  return 1 / (1 + tau / dt)
}

class OneEuroFilter {
  constructor(minCutoff = DEFAULT_MIN_CUTOFF, beta = DEFAULT_BETA, dCutoff = DEFAULT_D_CUTOFF) {
    this.minCutoff = minCutoff
    this.beta = beta
    this.dCutoff = dCutoff
    this.xPrev = null
    this.dxPrev = 0
  }

  filter(x, dt) {
    if (this.xPrev == null) {
      this.xPrev = x
      return x
    }
    const dx = (x - this.xPrev) / dt
    const aD = lowpassAlpha(this.dCutoff, dt)
    this.dxPrev = aD * dx + (1 - aD) * this.dxPrev
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dxPrev)
    const a = lowpassAlpha(cutoff, dt)
    const xSmooth = a * x + (1 - a) * this.xPrev
    this.xPrev = xSmooth
    return xSmooth
  }
}

const LANDMARK_COUNT = 33

/**
 * Smooth an entire cache of landmarks in place. Mutates the cache.
 *
 * Each landmark's x/y/z gets its own One-Euro filter; visibility gets a
 * simple exponential moving average (so a single low-confidence frame
 * doesn't flash a limb off and on — that's the "disappearing leg" bug).
 *
 * @param {Map<number, Array<{x:number,y:number,z:number,visibility?:number}>>} cache
 *   Keyed by video timestamp in ms. Values are 33-landmark arrays.
 */
export function smoothPoseCache(cache) {
  const sortedKeys = [...cache.keys()].sort((a, b) => a - b)
  if (sortedKeys.length < 2) return

  // One filter per (landmark, component). Plus visibility EMA state.
  const filters = []
  const visEMA = []
  for (let i = 0; i < LANDMARK_COUNT; i++) {
    filters.push({
      x: new OneEuroFilter(),
      y: new OneEuroFilter(),
      z: new OneEuroFilter(),
    })
    visEMA.push(null)
  }

  const visAlpha = 0.7  // 70% new value, 30% history — soft smoothing

  let prevKey = sortedKeys[0]
  // Seed filters with the first frame
  const first = cache.get(prevKey)
  for (let i = 0; i < LANDMARK_COUNT; i++) {
    const lm = first[i]
    if (!lm) continue
    filters[i].x.filter(lm.x, 1)  // dt=1 just seeds xPrev
    filters[i].y.filter(lm.y, 1)
    filters[i].z.filter(lm.z, 1)
    visEMA[i] = lm.visibility ?? 1
  }

  for (let k = 1; k < sortedKeys.length; k++) {
    const key = sortedKeys[k]
    const dt = (key - prevKey) / 1000
    if (dt <= 0) { prevKey = key; continue }

    const landmarks = cache.get(key)
    const smoothed = new Array(LANDMARK_COUNT)
    for (let i = 0; i < LANDMARK_COUNT; i++) {
      const lm = landmarks[i]
      if (!lm) { smoothed[i] = lm; continue }
      const rawVis = lm.visibility ?? 1
      visEMA[i] = visAlpha * rawVis + (1 - visAlpha) * (visEMA[i] ?? rawVis)
      smoothed[i] = {
        x: filters[i].x.filter(lm.x, dt),
        y: filters[i].y.filter(lm.y, dt),
        z: filters[i].z.filter(lm.z, dt),
        visibility: visEMA[i],
      }
    }
    cache.set(key, smoothed)
    prevKey = key
  }
}
