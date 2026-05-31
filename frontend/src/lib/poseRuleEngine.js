/**
 * Pose rule engine — runs catalog rules against a preprocessed landmark
 * cache and emits Findings.
 *
 * Architecture (kept intentionally tiny for Phase 2 — will grow once
 * we have a phase-classifier FSM and 8+ rules):
 *
 *   runRules(cache, rules, context) → Finding[]
 *
 * For each rule:
 *   1. Check `appliesWhen(context)` — gating (e.g. wallAngle === 'slab').
 *   2. Resolve the rule's effective profile against context (grade tier,
 *      venue). Rules can declare `profileOverrides` to tighten
 *      minDurationMs / minConfidence at advanced grades or on system
 *      boards — see `resolveProfile()` below.
 *   3. Walk frames in timestamp order, calling `detect(frame, prev?)`.
 *   4. Group consecutive matched frames into "instances" — a span of
 *      at least `minDurationMs` continuously matched.
 *   5. Each rule emits one Finding (per the locked spec decision:
 *      single card per rule with all timestamps listed, not one card
 *      per instance).
 *
 * After all rules run:
 *   • Fall-window severity bump applied (locked decision: ±2s of fall
 *     elevates polish→important, important→critical).
 *
 * Finding shape (matches docs/movement-analyzer/feature-spec.md §3):
 *   {
 *     ruleId, name, cue, severity, bodyRegion,
 *     timestamps: number[],     // start of each instance, ms
 *     instanceCount: number,
 *     confidence: number,       // [0,1] — averaged across instances
 *     isFallProximal: boolean,
 *   }
 */

import { isAdvancedGrade } from './gradeTier'
import { computeStableScale, asScale } from './bodyCalibration'

const SEVERITY_ORDER = ['polish', 'important', 'critical']
const FALL_WINDOW_MS = 2000              // locked: ±2s around the fall
const WARM_UP_MS = 500                    // skip first 500ms of frames — pose can be unstable on fresh clip
const MIN_FRAMES_PER_RUN = 3              // a "match" needs ≥ 3 consecutive frames — rejects single-frame spikes
const MIN_AVG_CONFIDENCE = 0.55           // average confidence below this = discard the instance

/**
 * Resolve the effective minDurationMs + minConfidence for a rule given
 * the upload context. Rules opt in by declaring `profileOverrides`:
 *
 *   profileOverrides: {
 *     advancedGrade: { minDurationMs: 1500, minConfidence: 0.75 },
 *     board:         { minDurationMs: 2000, minConfidence: 0.80 },
 *   }
 *
 * When multiple overrides apply (V8 climber on a board), we take the
 * STRICTEST value per field — climbers know what they're doing AND the
 * board style is more dynamic, so both effects compound. Tightening
 * means more evidence required, never disabling — a genuine flag still
 * surfaces, it just has to clear a higher bar.
 */
function resolveProfile(rule, context) {
  const base = {
    minDurationMs: rule.minDurationMs ?? 1000,
    minConfidence: MIN_AVG_CONFIDENCE,
  }
  const overrides = rule.profileOverrides
  if (!overrides) return base

  const candidates = [base]
  if (isAdvancedGrade(context?.grade) && overrides.advancedGrade) {
    candidates.push(overrides.advancedGrade)
  }
  if (context?.venue === 'board' && overrides.board) {
    candidates.push(overrides.board)
  }
  return {
    minDurationMs: Math.max(...candidates.map((c) => c.minDurationMs ?? 0)),
    minConfidence: Math.max(...candidates.map((c) => c.minConfidence ?? 0)),
  }
}

function bumpSeverity(s) {
  const idx = SEVERITY_ORDER.indexOf(s)
  if (idx < 0 || idx === SEVERITY_ORDER.length - 1) return s
  return SEVERITY_ORDER[idx + 1]
}

/**
 * @param {Map<number, Array>} cache  — keyed by video timestamp ms
 * @param {Array} rules                — rule declarations (see poseRules/)
 * @param {Object} context             — UploadContext + profile
 * @returns {Array} findings
 */
export function runRules(cache, rules, context) {
  if (!cache || cache.size === 0) return []

  const sortedKeys = [...cache.keys()].sort((a, b) => a - b)
  const findings = []

  // Compute a stable body scale (median across the cache) and inject it
  // into context. The bodyScale() primitive picks this up automatically,
  // so every rule evaluates against the same clip-wide baseline instead
  // of recalculating per-frame. Falls back to the user's profile scale
  // when the clip itself can't produce a reliable stable scale (too few
  // good frames). Final fallback: per-frame bodyScale() inside each rule.
  const clipScale = computeStableScale(cache)
  const profileScale = asScale(context?.bodyCalibration)
  const stableScale = clipScale ?? profileScale ?? null
  const ctxWithScale = stableScale
    ? { ...context, stableScale }
    : context

  for (const rule of rules) {
    if (rule.appliesWhen && !rule.appliesWhen(context)) continue

    // Walk frames, calling detect() per frame. Track consecutive matches
    // as "runs"; close a run when detection drops or a gap > maxGapMs
    // appears between frames (so a single noisy frame doesn't break a
    // span — but a real pause does).
    const maxGapMs = rule.maxGapMs ?? 200
    const profile = resolveProfile(rule, context)
    const minDurationMs = profile.minDurationMs
    const minConfidence = profile.minConfidence

    const runs = []
    let runStart = null
    let runLast = null
    let runConfidenceSum = 0
    let runFrameCount = 0
    let lastMatchedKey = null

    // Per-run state slot the rule's detect() can write to (e.g. prev frame).
    // Fresh per rule per call to runRules — never leaks between clips.
    const ruleState = {}

    // Warm-up: skip the earliest frames so a noisy first-second doesn't
    // spike a false-positive. Compute relative to the clip's first frame
    // (which is typically near 0 but not exactly).
    const clipStart = sortedKeys[0]

    for (const key of sortedKeys) {
      // Skip warm-up frames
      if (key - clipStart < WARM_UP_MS) continue
      const landmarks = cache.get(key)
      let result
      try {
        result = rule.detect({ landmarks, timestamp: key }, ctxWithScale, ruleState)
      } catch (err) {
        console.warn(`[poseRuleEngine] ${rule.id} threw on frame ${key}:`, err)
        continue
      }

      const matched = result && result.matched
      const gapTooLarge = lastMatchedKey != null && (key - lastMatchedKey) > maxGapMs

      if (matched && (runStart == null || gapTooLarge)) {
        // Closing a previous run (if any) due to gap
        if (runStart != null && gapTooLarge) {
          runs.push({
            start: runStart,
            end: runLast,
            frameCount: runFrameCount,
            avgConfidence: runConfidenceSum / runFrameCount,
          })
        }
        runStart = key
        runLast = key
        runConfidenceSum = result.confidence ?? 1
        runFrameCount = 1
      } else if (matched) {
        runLast = key
        runConfidenceSum += result.confidence ?? 1
        runFrameCount += 1
      } else if (runStart != null) {
        // Close current run on first non-match
        runs.push({
          start: runStart,
          end: runLast,
          frameCount: runFrameCount,
          avgConfidence: runConfidenceSum / runFrameCount,
        })
        runStart = null
        runLast = null
        runConfidenceSum = 0
        runFrameCount = 0
      }
      if (matched) lastMatchedKey = key
    }
    if (runStart != null) {
      runs.push({
        start: runStart,
        end: runLast,
        frameCount: runFrameCount,
        avgConfidence: runConfidenceSum / runFrameCount,
      })
    }

    // Apply quality gates. A run becomes an "instance" only when it's
    // sustained (≥ minDurationMs), has at least MIN_FRAMES_PER_RUN
    // consecutive frames (kills single-frame spikes), AND has average
    // confidence ≥ minConfidence (rejects borderline detections).
    // minDurationMs + minConfidence both come from `resolveProfile()`
    // so context-aware tightening lives in one place.
    const qualified = runs.filter((r) =>
      (r.end - r.start) >= minDurationMs &&
      r.frameCount >= MIN_FRAMES_PER_RUN &&
      r.avgConfidence >= minConfidence,
    )
    if (qualified.length === 0) continue

    findings.push({
      ruleId:        rule.id,
      name:          rule.name,
      cue:           rule.cue,
      whyItMatters:  rule.whyItMatters,
      howToFix:      rule.howToFix,
      whenYouSeeIt:  rule.whenYouSeeIt,
      severity:      rule.severity,
      bodyRegion:    rule.bodyRegion,
      // 'flag' = something the climber should correct (default); 'win' = a
      // positive technique moment to reinforce. Rendered in separate
      // sections of the report.
      kind:          rule.kind ?? 'flag',
      timestamps:    qualified.map(r => r.start),
      instanceCount: qualified.length,
      confidence:    qualified.reduce((s, r) => s + r.avgConfidence, 0) / qualified.length,
      isFallProximal: false,
    })
  }

  // Fall-window severity bump (locked decision: ±2s of fall, polish →
  // important, important → critical). Wins are not bumped — a positive
  // moment near a fall is just a positive moment.
  if (context?.outcome === 'fell' && context.fallTimeMs != null) {
    for (const finding of findings) {
      if (finding.kind !== 'flag') continue
      const proximal = finding.timestamps.some(t =>
        Math.abs(t - context.fallTimeMs) <= FALL_WINDOW_MS
      )
      if (proximal) {
        finding.isFallProximal = true
        finding.severity = bumpSeverity(finding.severity)
      }
    }
  }

  return findings
}
