import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, X, Loader2, AlertTriangle, RefreshCw, CheckCircle2, XCircle,
  SlidersHorizontal, Video, ChevronDown, Compass, User, Smartphone, Sun,
  Ruler, Lock, Camera, Circle, Scissors,
} from 'lucide-react'
import { createPoseClient } from '../lib/poseWorkerClient'
import { isAdvancedGrade } from '../lib/gradeTier'
import { drawPose } from '../lib/poseDrawing'
import { smoothPoseCache } from '../lib/poseSmoothing'
import { runRules } from '../lib/poseRuleEngine'
import { cameraAngleProfile } from '../lib/posePrimitives'
import { getProfile, saveBodyMeasurements } from '../api'
import { UnitToggle, MeasurementField, defaultUnit, canRecordVideo } from './Measurements'
import {
  loadCalibration, saveCalibration, computeStableScale, asScale,
  updateFromClip, setExplicitCalibration, updateMeasurements,
} from '../lib/bodyCalibration'
import { S01 } from '../lib/poseRules/S01_bentArmsAtRest'
import { S04 } from '../lib/poseRules/S04_chickenWingElbow'
import { S05 } from '../lib/poseRules/S05_shruggedShoulders'
import { K01 } from '../lib/poseRules/K01_highStepNoFollow'
import { K02 } from '../lib/poseRules/K02_heelRaisedOnSmear'
import { G01 } from '../lib/poseRules/G01_headDown'
import { H01 } from '../lib/poseRules/H01_bananaSagOverhang'
import { H02 } from '../lib/poseRules/H02_squareHipsLadderClimbing'
import { H03 } from '../lib/poseRules/H03_huggingTheSlab'
import { H04 } from '../lib/poseRules/H04_crossLoadedCom'
import { H07 } from '../lib/poseRules/H07_coreSagOnRoof'
import { H08 } from '../lib/poseRules/H08_noFrogTurnout'
import { K03 } from '../lib/poseRules/K03_footSearchTapDance'
import { K04 } from '../lib/poseRules/K04_slappingFeet'
import { K05 } from '../lib/poseRules/K05_kneeValgusCollapse'
import { K06 } from '../lib/poseRules/K06_feetCutUncontrolled'
import { K07 } from '../lib/poseRules/K07_handsBeforeFeet'
import { W01 } from '../lib/poseRules/W01_pullingNotPushing'
import { W04 } from '../lib/poseRules/W04_stalling'
import { P01 } from '../lib/poseRules/P01_straightArmsOnRest'
import { P02 } from '../lib/poseRules/P02_hipOverHighFoot'
import { P03 } from '../lib/poseRules/P03_eyesUpTheWall'
import { P04 } from '../lib/poseRules/P04_stackedCom'
import { P05 } from '../lib/poseRules/P05_activeFrogTurnout'
import { P06 } from '../lib/poseRules/P06_buttOutNoseOverToes'
import { P07 } from '../lib/poseRules/P07_feetLedTheHands'
import { P08 } from '../lib/poseRules/P08_pushingThroughLegs'
import { P09 } from '../lib/poseRules/P09_silentFeet'
import { TRANSITIONS } from '../lib/motion'
import UploadContextForm from './UploadContextForm'
import AnalysisReport from './AnalysisReport'
import TimelineRibbon from './TimelineRibbon'

// Active rule catalog. v1 shortlist build-out — entries from the
// "Easy detectability" tier in docs/movement-analyzer/technique-catalog.md.
// Flags = mistakes to correct. Wins = positive technique moments that
// get surfaced in the "What worked" section of the report.
const ACTIVE_RULES = [
  S01, S04, S05,
  K01, K02, K03, K04, K05, K06, K07,
  G01,
  H01, H02, H03, H04, H07, H08,
  W01, W04,
  P01, P02, P03, P04, P05, P06, P07, P08, P09,
]

// Phase 1 toggle — flip false to silence the verification logs.
const DEBUG = true

const MAX_FILE_BYTES = 400 * 1024 * 1024       // 400 MB
const MAX_DURATION_S = 60                       // longest selectable trim window
const MAX_RAW_DURATION_S = 600                  // safety ceiling on uploaded clip length (10 min)
const ACCEPTED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']
const NO_DETECTION_THRESHOLD = 0.1              // ratio for "no body detected" banner
const ASSUMED_FPS = 30                          // phone clips are ~30 fps; no reliable cross-browser API

// Model-load state is decoupled from `status` now (see `modelReady`
// state) — the drop zone shows immediately and the load happens in
// parallel. STATUS only tracks what stage of the pipeline the user is
// in, not whether the model is ready.
const STATUS = {
  IDLE:                'idle',                // drop zone visible (model may still be loading)
  COLLECTING_CONTEXT:  'collecting-context',  // file dropped, video metadata loaded, form gates processing
  PROCESSING:          'processing',
  CALIBRATING:         'calibrating',         // dedicated body-calibration upload (neutral-pose clip)
  READY:               'ready',
  ERROR:               'error',
}

/**
 * Wait for a one-shot event on a media element, with a timeout.
 */
function waitFor(el, eventName, { timeoutMs = 5000 } = {}) {
  return new Promise((resolve, reject) => {
    const onEvent = () => { cleanup(); resolve() }
    const onError = () => { cleanup(); reject(new Error(`Media ${eventName} failed`)) }
    const timer = setTimeout(() => { cleanup(); reject(new Error(`Timeout waiting for ${eventName}`)) }, timeoutMs)
    function cleanup() {
      clearTimeout(timer)
      el.removeEventListener(eventName, onEvent)
      el.removeEventListener('error', onError)
    }
    el.addEventListener(eventName, onEvent, { once: true })
    el.addEventListener('error', onError, { once: true })
  })
}

/**
 * Returns the distance from shoulder midpoint to hip midpoint in normalized
 * image space. Used as an anatomical sanity primitive — if a frame's torso
 * length is wildly out of line with the clip's median, MediaPipe most likely
 * snapped landmarks onto background features rather than the climber.
 */
function torsoLength(landmarks) {
  if (!landmarks || landmarks.length < 25) return null
  const ls = landmarks[11], rs = landmarks[12]   // shoulders
  const lh = landmarks[23], rh = landmarks[24]   // hips
  if (!ls || !rs || !lh || !rh) return null
  // Require minimum visibility on the four landmarks we use.
  const minVis = Math.min(ls.visibility ?? 1, rs.visibility ?? 1, lh.visibility ?? 1, rh.visibility ?? 1)
  if (minVis < 0.5) return null
  const sx = (ls.x + rs.x) / 2
  const sy = (ls.y + rs.y) / 2
  const hx = (lh.x + rh.x) / 2
  const hy = (lh.y + rh.y) / 2
  return Math.hypot(sx - hx, sy - hy)
}

function median(arr) {
  if (!arr.length) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function nearestKey(sortedKeys, target) {
  if (!sortedKeys.length) return null
  let lo = 0, hi = sortedKeys.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (sortedKeys[mid] < target) lo = mid + 1
    else hi = mid
  }
  if (lo > 0 && Math.abs(sortedKeys[lo - 1] - target) < Math.abs(sortedKeys[lo] - target)) return sortedKeys[lo - 1]
  return sortedKeys[lo]
}

export default function MovementAnalyzer() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const stageRef = useRef(null)
  const cancelRef = useRef(false)
  const rvfcHandleRef = useRef(null)
  const objectUrlRef = useRef(null)
  const sortedKeysRef = useRef([])
  // Per-mount pose client (own worker, own state). StrictMode-safe.
  const poseClientRef = useRef(null)
  // Monotonic timestamp for MediaPipe's `detectForVideo` API. The
  // PoseLandmarker singleton in the Worker keeps internal state across
  // uploads, so feeding it the new clip's video-time (which restarts
  // at 0) gets rejected with "timestamp mismatch". We instead hand it
  // a session-wide counter that only ever increases; video-time stays
  // the cache key for playback lookup. Starts at 1 because MediaPipe's
  // first-call minimum expected timestamp is also 1.
  const inferenceTimestampRef = useRef(1)

  const [status, setStatus] = useState(STATUS.IDLE)
  const [modelReady, setModelReady] = useState(false)
  const [modelProgress, setModelProgress] = useState({ loaded: 0, total: 0 })
  const [contextReady, setContextReady] = useState(false)  // true once form submitted, used to gate processing if model still loading
  const [uploadContext, setUploadContext] = useState(null) // the form's data, carried through to processing + ready states
  const [clipDurationS, setClipDurationS] = useState(0)    // exposed to FallScrubber for slider bounds
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState({ frame: 0, total: 0, startedAt: 0 })
  const [landmarksByMs, setLandmarksByMs] = useState(null)
  const [findings, setFindings] = useState([])
  const [thumbnails, setThumbnails] = useState({})  // { [ruleId]: dataURL }
  const [noBodyWarning, setNoBodyWarning] = useState(false)
  const [angleWarning, setAngleWarning] = useState(null)   // { category, ratio } | null
  const [clipQuality, setClipQuality] = useState(null)     // { detectionRatio, droppedSanity, totalFrames, angleCategory }
  const [aspect, setAspect] = useState('16 / 9')
  // Body calibration — loaded from localStorage on mount, refined on
  // every analysis clip, can be locked by an explicit calibration upload.
  // Pulled into rule-engine context so detectors share a stable baseline.
  const [calibration, setCalibration] = useState(() => loadCalibration())
  const [calibrationFlash, setCalibrationFlash] = useState(null)  // 'updated' | 'locked' | null

  // ── Initialize the Worker on mount ─────────────────────────────────
  // Show drop zone immediately; let model load in parallel with user
  // reading the page. If they pick a file before the model is ready,
  // we queue it and process as soon as init completes.
  //
  // The pose client is created per-mount so React StrictMode's
  // double-mount in dev can't race shared state. Each mount's cleanup
  // tears down its own client cleanly.
  useEffect(() => {
    let cancelled = false
    const client = createPoseClient()
    poseClientRef.current = client
    client.initPoseWorker((p) => {
      if (!cancelled) setModelProgress(p)
    })
      .then(() => {
        if (cancelled) return
        setModelReady(true)
        if (DEBUG) console.log('[MovementAnalyzer] Pose worker ready')
      })
      .catch((err) => {
        if (cancelled) return
        console.error('[MovementAnalyzer] Worker init failed', err)
        const detail = err?.message ? ` (${err.message})` : ''
        setError({ kind: 'init', message: `Could not load pose model${detail}. Refresh to retry.` })
        // Unblock anyone waiting on the queued file — reset the pipeline
        // so the user isn't stuck on "waiting for pose model" forever.
        cancelRef.current = true
        setContextReady(false)
        setProgress({ frame: 0, total: 0, startedAt: 0 })
        setStatus(STATUS.IDLE)
      })
    return () => {
      cancelled = true
      client.closePoseWorker()
      poseClientRef.current = null
    }
  }, [])

  // ── Cleanup any in-flight object URL on unmount ────────────────────
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
      const v = videoRef.current
      if (rvfcHandleRef.current && v?.cancelVideoFrameCallback) {
        v.cancelVideoFrameCallback(rvfcHandleRef.current)
        rvfcHandleRef.current = null
      }
    }
  }, [])

  // ── Sync canvas size to displayed video size (DPR-aware) ───────────
  // CSS dimensions come from the parent's aspect-ratio + w-full/h-full;
  // we only set the backing-buffer dimensions here for HiDPI sharpness.
  // Crucially: do NOT apply `ctx.scale(dpr, dpr)`. MediaPipe's
  // DrawingUtils derives pixel positions from `canvas.width/.height`
  // (the backing buffer, already dpr-multiplied below). Adding a ctx
  // scale would double-multiply and shove every landmark to the
  // bottom-right corner of the canvas.
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video || !video.clientWidth) return
    const dpr = window.devicePixelRatio || 1
    canvas.width  = Math.round(video.clientWidth  * dpr)
    canvas.height = Math.round(video.clientHeight * dpr)
  }, [])

  // ── ResizeObserver: keep canvas in sync as the layout shifts ───────
  useEffect(() => {
    if (status !== STATUS.READY) return
    const target = stageRef.current
    if (!target) return
    const ro = new ResizeObserver(() => resizeCanvas())
    ro.observe(target)
    return () => ro.disconnect()
  }, [status, resizeCanvas])

  // ── Playback overlay loop (runs when status === 'ready') ───────────
  useEffect(() => {
    if (status !== STATUS.READY) return
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const ctx = canvas.getContext('2d')
    resizeCanvas()

    function onFrame(_now, metadata) {
      const ts = Math.round(metadata.mediaTime * 1000)
      const keys = sortedKeysRef.current
      const key = nearestKey(keys, ts)
      const landmarks = key != null ? landmarksByMs.get(key) : null
      drawPose(ctx, landmarks)
      rvfcHandleRef.current = video.requestVideoFrameCallback(onFrame)
    }

    if (video.requestVideoFrameCallback) {
      rvfcHandleRef.current = video.requestVideoFrameCallback(onFrame)
      return () => {
        if (rvfcHandleRef.current && video.cancelVideoFrameCallback) {
          video.cancelVideoFrameCallback(rvfcHandleRef.current)
          rvfcHandleRef.current = null
        }
      }
    }

    // Fallback: redraw on timeupdate (coarser but functional)
    const onTimeUpdate = () => {
      const ts = Math.round(video.currentTime * 1000)
      const key = nearestKey(sortedKeysRef.current, ts)
      drawPose(ctx, key != null ? landmarksByMs.get(key) : null)
    }
    video.addEventListener('timeupdate', onTimeUpdate)
    return () => video.removeEventListener('timeupdate', onTimeUpdate)
  }, [status, landmarksByMs, resizeCanvas])

  // ── File selection / drag-drop ─────────────────────────────────────
  // Validate the file, set up the Blob URL, load metadata, then route
  // the user into COLLECTING_CONTEXT so the upload form can run before
  // processing kicks off. Model load can finish in parallel.
  const onPickFile = useCallback(async (file) => {
    if (!file) return
    setError(null)
    setNoBodyWarning(false)
    setAngleWarning(null)

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError({ kind: 'format', message: 'Unsupported format. Use MP4, WebM, or MOV.' })
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setError({ kind: 'size', message: 'Video too large — please upload under 400 MB.' })
      return
    }

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = URL.createObjectURL(file)
    cancelRef.current = false
    setUploadContext(null)
    setContextReady(false)

    // Load the video metadata so the form has duration + aspect-ratio.
    const video = videoRef.current
    if (!video) return
    video.src = objectUrlRef.current
    video.load()
    try {
      await waitFor(video, 'loadedmetadata', { timeoutMs: 8000 })
    } catch (err) {
      console.error('[MovementAnalyzer] Could not load video metadata', err)
      setError({ kind: 'format', message: 'Could not read this video. Try MP4 or WebM.' })
      return
    }

    if (video.duration > MAX_RAW_DURATION_S + 0.5) {
      setError({ kind: 'duration', message: `Clip is too long. Please upload under ${MAX_RAW_DURATION_S / 60} minutes — you can trim a longer window inside the app.` })
      // Clean up the URL we just created
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
      return
    }

    setClipDurationS(video.duration)
    if (video.videoWidth && video.videoHeight) {
      setAspect(`${video.videoWidth} / ${video.videoHeight}`)
    }
    setStatus(STATUS.COLLECTING_CONTEXT)
  }, [])

  // ── Form-submit / cancel handlers ──────────────────────────────────

  const handleContextSubmit = useCallback((context) => {
    if (DEBUG) console.log('[MovementAnalyzer] Upload context captured', context)
    setUploadContext(context)
    setContextReady(true)
    if (modelReady) {
      // Start processing immediately
      processVideoSafely(context)
    } else {
      // Wait for model — effect below will pick this up once init resolves
      setStatus(STATUS.PROCESSING)
      setProgress({ frame: 0, total: 0, startedAt: Date.now() })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelReady])

  const handleContextCancel = useCallback(() => {
    cancelRef.current = true
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.removeAttribute('src')
      videoRef.current.load()
    }
    setUploadContext(null)
    setContextReady(false)
    setClipDurationS(0)
    setStatus(STATUS.IDLE)
  }, [])

  function processVideoSafely(context) {
    processVideo(context).catch((err) => {
      console.error('[MovementAnalyzer] Pre-process failed', err)
      setError({ kind: 'processing', message: err?.message || 'Could not process video.' })
      setStatus(STATUS.IDLE)
    })
  }

  // ── Trigger processing once the model becomes ready + form already submitted ──
  useEffect(() => {
    if (!modelReady || !contextReady || status !== STATUS.PROCESSING) return
    if (!uploadContext) return  // belt-and-suspenders
    setContextReady(false)  // consume the gate so this effect doesn't re-fire
    processVideoSafely(uploadContext)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelReady, contextReady, status, uploadContext])

  // ── The pre-process pipeline ───────────────────────────────────────
  async function processVideo(context) {
    const video = videoRef.current
    if (!video || !objectUrlRef.current) return

    setStatus(STATUS.PROCESSING)
    setProgress({ frame: 0, total: 0, startedAt: Date.now() })

    // Video metadata is already loaded by onPickFile; the src is set.
    // Skip the loadedmetadata wait — just guard against the rare case
    // where the element got reset between picking and processing.
    if (!video.src || !video.duration) {
      video.src = objectUrlRef.current
      video.load()
      await waitFor(video, 'loadedmetadata', { timeoutMs: 8000 })
    }

    const fps = ASSUMED_FPS
    // Trim window — defaults to the whole clip if the context form didn't
    // supply one (e.g. legacy callers). Frames outside [startS, endS] are
    // skipped entirely; cache keys remain absolute video ms.
    const startS = Math.max(0, (context?.trimStartMs ?? 0) / 1000)
    const endS = Math.min(video.duration, (context?.trimEndMs ?? video.duration * 1000) / 1000)
    const windowS = Math.max(0, endS - startS)
    const totalFrames = Math.max(1, Math.floor(windowS * fps))
    const cache = new Map()
    let framesWithDetection = 0

    if (DEBUG) console.log('[MovementAnalyzer] Processing', {
      duration: video.duration,
      trim: { startS, endS, windowS },
      fps,
      totalFrames,
      context,  // Captured form data — for now just verification; Phase 2 detectors will read this.
    })

    setProgress({ frame: 0, total: totalFrames, startedAt: Date.now() })

    for (let i = 0; i < totalFrames; i++) {
      if (cancelRef.current) {
        if (DEBUG) console.log('[MovementAnalyzer] Cancelled at frame', i)
        return resetToIdle()
      }
      const t = startS + i / fps
      video.currentTime = t
      try {
        await waitFor(video, 'seeked', { timeoutMs: 5000 })
      } catch (err) {
        if (i > 0) break  // tail-end seek failure is common — accept partial
        throw err
      }

      const bitmap = await createImageBitmap(video)
      // MediaPipe timestamp: session-monotonic counter (NOT the video's
      // current time, which would restart at 0 on a new upload and trip
      // MediaPipe's "timestamp mismatch" guard).
      const mediapipeTs = inferenceTimestampRef.current
      inferenceTimestampRef.current = mediapipeTs + 1
      const client = poseClientRef.current
      if (!client) throw new Error('Pose client gone — view was unmounted')
      const result = await client.detectPose(bitmap, mediapipeTs)
      // Cache key: video time in ms (so playback can look up by mediaTime).
      const videoMs = Math.round(t * 1000)
      if (result.landmarks) {
        cache.set(videoMs, result.landmarks)
        framesWithDetection++
      }
      setProgress((p) => ({ ...p, frame: i + 1 }))

      if (DEBUG && i % fps === 0) {
        console.log('[MovementAnalyzer]', { frame: i, t, landmarks: result.landmarks })
      }
    }

    if (cancelRef.current) return resetToIdle()

    // ── Temporal smoothing (One-Euro filter) ───────────────────────
    // Reduces frame-to-frame jitter from MediaPipe's per-frame inference.
    // Heavy smoothing during stillness; adaptive light smoothing during
    // dynamic moves so deadpoints don't lag. Visibility scores get a
    // separate EMA so a single low-confidence frame doesn't flash a
    // limb off and back on.
    smoothPoseCache(cache)

    // ── Anatomical sanity pass ─────────────────────────────────────
    // MediaPipe sometimes snaps landmarks onto background features (climbing
    // holds shaped like blobs, etc.) when the climber is partially occluded
    // or the camera angle is unusual. Those mis-detections show up as wild
    // changes in torso length frame-to-frame. We drop frames whose torso
    // length is way off baseline.
    //
    // Baseline preference order:
    //   1. User's calibrated profile torsoLength (most stable across clips)
    //   2. This clip's median torsoLength (current behavior)
    // The profile baseline catches mis-detections more aggressively because
    // it doesn't get pulled toward the (potentially-bad) clip itself.
    const torsoLengths = []
    for (const lms of cache.values()) {
      const len = torsoLength(lms)
      if (len != null) torsoLengths.push(len)
    }
    let droppedSanityFrames = 0
    let sanityBaselineSource = 'none'
    if (torsoLengths.length >= 5) {
      const clipMedianTorso = median(torsoLengths)
      const profileScale = asScale(calibration)
      // Use profile baseline when it exists AND the clip median is within
      // a reasonable factor of it (so we don't lock to a stale profile if
      // the climber's camera setup changed dramatically).
      const baseline = profileScale &&
        profileScale.torsoLength > 0 &&
        clipMedianTorso / profileScale.torsoLength > 0.5 &&
        clipMedianTorso / profileScale.torsoLength < 2.0
          ? profileScale.torsoLength
          : clipMedianTorso
      sanityBaselineSource = baseline === clipMedianTorso ? 'clip-median' : 'profile'
      // ±60% acceptance window around the baseline.
      const lo = baseline * 0.4
      const hi = baseline * 1.6
      for (const [key, lms] of [...cache.entries()]) {
        const len = torsoLength(lms)
        if (len == null || len < lo || len > hi) {
          cache.delete(key)
          droppedSanityFrames++
        }
      }
    }

    const effectiveDetections = cache.size
    const detectionRatio = effectiveDetections / totalFrames
    if (DEBUG) {
      const midKey = [...cache.keys()].sort((a, b) => a - b)[Math.floor(cache.size / 2)]
      console.log('[MovementAnalyzer] Pre-process complete', {
        totalFrames,
        framesWithDetection,
        droppedSanityFrames,
        effectiveDetections,
        durationMs: Math.round(video.duration * 1000),
        fps,
        detectionRatio: detectionRatio.toFixed(3),
        sampleLandmarksAtMidpoint: midKey != null ? cache.get(midKey) : null,
      })
    }

    sortedKeysRef.current = [...cache.keys()].sort((a, b) => a - b)
    setLandmarksByMs(cache)
    setNoBodyWarning(detectionRatio < NO_DETECTION_THRESHOLD)

    // ── Camera-angle profile ─────────────────────────────────────────
    // Estimate the climber's facing direction from shoulderWidth vs.
    // torsoLength ratio. If the camera is way off (side-on, severe
    // up-shot), lateral-measurement rules will be less reliable. We
    // surface this as a warning so the climber understands why fewer
    // findings might appear on a weird-angle clip.
    const angleProfile = cameraAngleProfile(cache)
    if (angleProfile && (angleProfile.category === 'side-on' || angleProfile.category === 'frontal')) {
      setAngleWarning(angleProfile)
    } else {
      setAngleWarning(null)
    }

    // ── Refresh body calibration from this clip's stable median scale ──
    // Computed BEFORE rules run so the engine sees the freshest baseline.
    // Locked profiles (source='explicit') aren't drifted by analysis clips.
    const clipScale = computeStableScale(cache)
    let nextCalibration = calibration
    if (clipScale) {
      nextCalibration = updateFromClip(calibration, clipScale)
      if (nextCalibration !== calibration) {
        setCalibration(nextCalibration)
        saveCalibration(nextCalibration)
        setCalibrationFlash(calibration.source === 'explicit' ? 'locked' : 'updated')
      }
    }

    // ── Clip-quality summary ────────────────────────────────────────
    // Single source of truth for the analyzer's confidence in this clip.
    // Driven into the ClipQualityChip rendered above the AnalysisReport.
    setClipQuality({
      detectionRatio,
      droppedSanity: droppedSanityFrames,
      totalFrames,
      effectiveDetections,
      angleCategory: angleProfile?.category ?? 'unknown',
      calibrationSource: nextCalibration.source,
    })

    // ── Run the rule engine over the (smoothed, sanity-checked) cache ──
    let computedFindings = []
    try {
      // Inject the most-current calibration so the engine can use it as
      // a fallback when this clip's own median scale isn't reliable.
      const ctxWithCal = { ...context, bodyCalibration: nextCalibration }
      computedFindings = runRules(cache, ACTIVE_RULES, ctxWithCal)
    } catch (err) {
      console.error('[MovementAnalyzer] Rule engine threw', err)
    }
    if (DEBUG) console.log('[MovementAnalyzer] Findings', computedFindings)

    // ── Capture a thumbnail per finding (first instance) ──────────
    // Seek the video to each finding's first timestamp, grab a still
    // off the painted frame, store as a data URL. Lets the report show
    // the climber what they're looking at without playing the video.
    const thumbs = {}
    if (computedFindings.length > 0 && video.videoWidth) {
      const thumbW = 240
      const thumbH = Math.round(thumbW * (video.videoHeight / video.videoWidth))
      const canvas = document.createElement('canvas')
      canvas.width = thumbW
      canvas.height = thumbH
      const ctx2d = canvas.getContext('2d')
      for (const f of computedFindings) {
        if (cancelRef.current) break
        const ts = f.timestamps[0]
        if (ts == null) continue
        try {
          video.currentTime = ts / 1000
          await waitFor(video, 'seeked', { timeoutMs: 3000 })
          ctx2d.drawImage(video, 0, 0, thumbW, thumbH)
          thumbs[f.ruleId] = canvas.toDataURL('image/jpeg', 0.7)
        } catch (err) {
          // Non-fatal — finding card just won't show a thumbnail
          if (DEBUG) console.warn(`[MovementAnalyzer] Thumbnail failed for ${f.ruleId}`, err)
        }
      }
    }

    setFindings(computedFindings)
    setThumbnails(thumbs)
    setStatus(STATUS.READY)

    // Start playback at the trim start so the first thing the user sees is
    // the analyzed window, not whatever pre-roll they didn't pick.
    video.currentTime = startS
    await video.play().catch(() => { /* autoplay may be blocked; user can hit play */ })
  }

  // ── Dedicated body-calibration flow ────────────────────────────────
  // A neutral-pose clip (3-5s of climber standing in front of camera)
  // gets processed through the pose pipeline and its median scale becomes
  // the LOCKED calibration baseline. After this runs, future analysis
  // clips won't drift the baseline — they'll just be measured against it.
  const onPickCalibrationFile = useCallback(async (file) => {
    if (!file) return
    setError(null)

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError({ kind: 'format', message: 'Unsupported format. Use MP4, WebM, or MOV.' })
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setError({ kind: 'size', message: 'Video too large — please upload under 400 MB.' })
      return
    }

    if (!modelReady) {
      setError({ kind: 'init', message: 'Pose model still loading — try again in a moment.' })
      return
    }

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = URL.createObjectURL(file)
    cancelRef.current = false

    const video = videoRef.current
    if (!video) return
    video.src = objectUrlRef.current
    video.load()
    try {
      await waitFor(video, 'loadedmetadata', { timeoutMs: 8000 })
    } catch {
      setError({ kind: 'format', message: 'Could not read this video. Try MP4 or WebM.' })
      return
    }

    setStatus(STATUS.CALIBRATING)
    setProgress({ frame: 0, total: 0, startedAt: Date.now() })

    // Cap calibration sampling at 3 seconds — neutral-pose clips don't
    // need to be long; sampling a longer window mostly adds variance.
    const CALIBRATION_MAX_S = 3
    const fps = ASSUMED_FPS
    const sampleSeconds = Math.min(CALIBRATION_MAX_S, video.duration)
    const totalFrames = Math.max(1, Math.floor(sampleSeconds * fps))
    const cache = new Map()
    setProgress({ frame: 0, total: totalFrames, startedAt: Date.now() })

    try {
      for (let i = 0; i < totalFrames; i++) {
        if (cancelRef.current) return resetToIdle()
        const t = i / fps
        video.currentTime = t
        try {
          await waitFor(video, 'seeked', { timeoutMs: 5000 })
        } catch {
          if (i > 0) break
          throw new Error('Could not seek calibration video')
        }
        const bitmap = await createImageBitmap(video)
        const mediapipeTs = inferenceTimestampRef.current
        inferenceTimestampRef.current = mediapipeTs + 1
        const client = poseClientRef.current
        if (!client) throw new Error('Pose client gone — view was unmounted')
        const result = await client.detectPose(bitmap, mediapipeTs)
        if (result.landmarks) cache.set(Math.round(t * 1000), result.landmarks)
        setProgress((p) => ({ ...p, frame: i + 1 }))
      }

      smoothPoseCache(cache)
      const scale = computeStableScale(cache)
      if (!scale) {
        setError({ kind: 'processing', message: 'Could not extract body proportions from this clip. Make sure your full body is visible in a neutral standing pose.' })
        return resetToIdle()
      }

      // Save as explicit calibration — locks future analysis clips out
      // of drifting this baseline.
      const next = setExplicitCalibration(calibration, scale)
      setCalibration(next)
      saveCalibration(next)
      setCalibrationFlash('locked')

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
      setStatus(STATUS.IDLE)
      setProgress({ frame: 0, total: 0, startedAt: 0 })
    } catch (err) {
      console.error('[MovementAnalyzer] Calibration failed', err)
      setError({ kind: 'processing', message: err?.message || 'Could not process calibration clip.' })
      resetToIdle()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelReady, calibration])

  // Persist height + apeIndex measurements. Writes BOTH to localStorage
  // (immediate effect for calibration) AND to the user profile via the
  // partial /api/profile/body endpoint (canonical store across surfaces).
  // The backend save is fire-and-forget; failures don't block local UX
  // — climbers without auth or with network blips still get accurate
  // analysis from the localStorage cache.
  const handleMeasurementsChange = useCallback((measurements) => {
    setCalibration((cur) => {
      const next = updateMeasurements(cur, measurements)
      saveCalibration(next)
      return next
    })
    // Mirror to backend profile. Convert the local shape to the API
    // shape ({ height, apeIndex } → { height_cm, ape_index_cm }).
    const payload = {}
    if ('height' in measurements)   payload.height_cm    = measurements.height
    if ('apeIndex' in measurements) payload.ape_index_cm = measurements.apeIndex
    if (Object.keys(payload).length === 0) return
    saveBodyMeasurements(payload).catch((err) => {
      console.warn('[MovementAnalyzer] saveBodyMeasurements failed', err)
    })
  }, [])

  // On mount: pull height/ape from backend profile and seed the
  // calibration cache. Profile is the canonical source — the wizard
  // captures it during onboarding, so reading from there means a
  // climber's measurements are available even before they've opened
  // the Movement Analyzer.
  useEffect(() => {
    let cancelled = false
    getProfile()
      .then((profile) => {
        if (cancelled || !profile) return
        const measurements = {}
        if (typeof profile.height_cm    === 'number') measurements.height   = profile.height_cm
        if (typeof profile.ape_index_cm === 'number') measurements.apeIndex = profile.ape_index_cm
        if (Object.keys(measurements).length === 0) return
        setCalibration((cur) => {
          const next = updateMeasurements(cur, measurements)
          saveCalibration(next)
          return next
        })
      })
      .catch(() => {
        // 404 (profile not yet set up) or 401 (not logged in) — fine,
        // calibration falls back to localStorage / population defaults.
      })
    return () => { cancelled = true }
  }, [])

  // Reset calibration to default — useful if the saved profile is wrong.
  const handleResetCalibration = useCallback(() => {
    const fresh = { shoulderWidth: 0.12, torsoLength: 0.25, source: 'default', clipCount: 0 }
    setCalibration(fresh)
    saveCalibration(fresh)
    setCalibrationFlash(null)
  }, [])

  // ── Reset to idle (cancel or replace) ──────────────────────────────
  function resetToIdle() {
    cancelRef.current = true
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.removeAttribute('src')
      videoRef.current.load()
    }
    setLandmarksByMs(null)
    sortedKeysRef.current = []
    setProgress({ frame: 0, total: 0, startedAt: 0 })
    setUploadContext(null)
    setContextReady(false)
    setClipDurationS(0)
    setFindings([])
    setThumbnails({})
    setClipQuality(null)
    setAngleWarning(null)
    setStatus(STATUS.IDLE)
  }

  // ── Computed display values ────────────────────────────────────────
  const elapsed = progress.startedAt ? (Date.now() - progress.startedAt) / 1000 : 0
  const pct = progress.total > 0 ? Math.round((progress.frame / progress.total) * 100) : 0
  const eta = progress.frame > 5 && progress.total > 0
    ? Math.max(0, Math.round((elapsed / progress.frame) * (progress.total - progress.frame)))
    : null

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full px-4 md:px-6 py-6 md:py-8 flex-1 flex flex-col gap-4">

        {/* Model-load progress pill — visible until model is ready */}
        <AnimatePresence>
          {!modelReady && !error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={TRANSITIONS.dialog_in}
              className="rounded-xl bg-ct-forest-deep border border-ct-hairline p-3"
            >
              <ModelLoadProgress progress={modelProgress} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-2 text-xs text-ct-terracotta px-3 py-2 rounded-lg bg-ct-terra-tint border border-ct-terracotta/30">
            <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
            <div className="flex-1 flex flex-col gap-2">
              <span>{error.message}</span>
              {error.kind === 'init' && (
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="self-start text-[11px] font-bold px-2 py-1 rounded bg-ct-terracotta text-ct-cream hover:brightness-110 transition"
                >
                  Reload
                </button>
              )}
            </div>
          </div>
        )}

        {/* Drop zone — always interactive when idle. If the model isn't
            ready yet and the user picks a file, the form still gates
            processing so they have something to do while the model loads.
            The recording-tips pill sits above so first-time uploaders see
            the angle/framing guidance before they hit "Choose video." */}
        {status === STATUS.IDLE && (
          <>
            <CalibrationPanel
              calibration={calibration}
              modelReady={modelReady}
              flash={calibrationFlash}
              onDismissFlash={() => setCalibrationFlash(null)}
              onMeasurementsChange={handleMeasurementsChange}
              onPickCalibrationFile={onPickCalibrationFile}
              onReset={handleResetCalibration}
            />
            <RecordingTips />
            <DropZone onPick={onPickFile} modelReady={modelReady} />
          </>
        )}

        {/* Calibration in-progress UI — minimal, just progress + cancel. */}
        {status === STATUS.CALIBRATING && (
          <div className="rounded-2xl bg-ct-forest-deep border border-ct-hairline p-4 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Ruler size={14} className="text-ct-terra-soft" />
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-ct-cream">
                Calibrating body proportions
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="h-1.5 rounded-full bg-ct-hairline overflow-hidden">
                <div
                  className="h-full bg-ct-terracotta transition-[width] duration-150"
                  style={{ width: `${progress.total > 0 ? Math.round((progress.frame / progress.total) * 100) : 0}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-ct-cream/60 ct-tnum">
                <span>Sampling frame {progress.frame} of {progress.total}</span>
                <span>{progress.total > 0 ? Math.round((progress.frame / progress.total) * 100) : 0}%</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { cancelRef.current = true; resetToIdle() }}
              className="self-end flex items-center gap-1.5 text-xs text-ct-cream/70 hover:text-ct-cream px-3 py-1.5 rounded-lg bg-ct-hairline border border-ct-rim hover:border-ct-terracotta/50 transition-colors"
            >
              <X size={12} />
              Cancel
            </button>
          </div>
        )}

        {/* Per-upload context form — gates processing. Video metadata
            already loaded so durationS is available for FallScrubber. */}
        {status === STATUS.COLLECTING_CONTEXT && (
          <UploadContextForm
            videoRef={videoRef}
            durationS={clipDurationS}
            maxTrimS={MAX_DURATION_S}
            onSubmit={handleContextSubmit}
            onCancel={handleContextCancel}
          />
        )}

        {/* Processing UI */}
        {status === STATUS.PROCESSING && (
          <div className="rounded-2xl bg-ct-forest-deep border border-ct-hairline p-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="h-1.5 rounded-full bg-ct-hairline overflow-hidden">
                <div
                  className="h-full bg-ct-terracotta transition-[width] duration-150"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-ct-cream/60 ct-tnum">
                <span>
                  {contextReady && !modelReady
                    ? 'Waiting for pose model…'
                    : <>Analyzing frame {progress.frame} of {progress.total} · {Math.round(elapsed)}s elapsed{eta != null && ` · ~${eta}s left`}</>}
                </span>
                <span>{contextReady && !modelReady ? '' : `${pct}%`}</span>
              </div>
            </div>
            {contextReady && !modelReady && (
              <ModelLoadProgress progress={modelProgress} />
            )}
            <button
              type="button"
              onClick={() => {
                cancelRef.current = true
                resetToIdle()
              }}
              className="self-end flex items-center gap-1.5 text-xs text-ct-cream/70 hover:text-ct-cream px-3 py-1.5 rounded-lg bg-ct-hairline border border-ct-rim hover:border-ct-terracotta/50 transition-colors"
            >
              <X size={12} />
              Cancel
            </button>
          </div>
        )}

        {/* "No body detected" banner (only after processing) */}
        {status === STATUS.READY && noBodyWarning && (
          <div className="flex items-start gap-2 text-xs text-ct-terra-soft px-3 py-2 rounded-lg bg-ct-terra-tint border border-ct-terracotta/30">
            <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
            <span>No climber detected in this clip — try one where the full body is visible.</span>
          </div>
        )}

        {/* Camera-angle warning — the clip was shot at a degenerate angle
            for the geometric rules (side-on or head-on). Findings can
            still surface but their lateral measurements are less accurate. */}
        {status === STATUS.READY && angleWarning && (
          <AngleWarningBanner profile={angleWarning} />
        )}

        {/* Context-summary chip — shows the form's captured data above the
            video in READY state so the user can see what we know. */}
        {status === STATUS.READY && uploadContext && (
          <ContextSummary context={uploadContext} />
        )}

        {/* Clip-quality chip — analyzer confidence signals (detection
            ratio, camera angle, calibration source). Helps the climber
            understand WHY a clip produced a particular report. */}
        {status === STATUS.READY && clipQuality && (
          <ClipQualityChip quality={clipQuality} />
        )}

        {/* Always-mounted video + canvas. Visibility / size controlled by status.
            Keeping the <video> element mounted across status changes preserves
            its src/playback state and the ref. During COLLECTING_CONTEXT the
            main element is hidden — the FallScrubber renders its own preview
            video pointed at the same Blob URL. */}
        <div
          ref={stageRef}
          className={`relative w-full bg-black overflow-hidden ${
            status === STATUS.READY ? 'rounded-2xl' :
            status === STATUS.PROCESSING ? 'rounded-lg max-h-64' :
            'hidden'
          }`}
          style={status === STATUS.READY ? { aspectRatio: aspect } : undefined}
        >
          <video
            ref={videoRef}
            className={
              status === STATUS.READY
                ? 'absolute inset-0 w-full h-full'
                : 'w-full max-h-64 object-contain'
            }
            muted
            playsInline
            controls={status === STATUS.READY}
            preload="metadata"
          />
          {status === STATUS.READY && (
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />
          )}
        </div>

        {/* Timeline ribbon — colored markers per finding instance, fall icon
            at the user-marked fall moment, tap to jump video to that frame. */}
        {status === STATUS.READY && (
          <TimelineRibbon
            findings={findings}
            durationS={clipDurationS}
            startMs={uploadContext?.trimStartMs ?? 0}
            endMs={uploadContext?.trimEndMs ?? null}
            fallTimeMs={uploadContext?.fallTimeMs ?? null}
            onJumpTo={(ms) => {
              const v = videoRef.current
              if (!v) return
              v.currentTime = ms / 1000
            }}
          />
        )}

        {/* Ready-state toolbar */}
        {status === STATUS.READY && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-ct-cream/45 leading-snug">
              Processed entirely on-device — your video never leaves your phone.
            </p>
            <button
              type="button"
              onClick={resetToIdle}
              className="flex items-center gap-1.5 text-xs text-ct-cream/70 hover:text-ct-cream px-3 py-1.5 rounded-lg bg-ct-hairline border border-ct-rim hover:border-ct-terracotta/50 transition-colors"
            >
              <RefreshCw size={12} />
              Replace video
            </button>
          </div>
        )}

        {/* Analysis report — top takeaway + collapsible finding cards. */}
        {status === STATUS.READY && (
          <AnalysisReport
            findings={findings}
            thumbnails={thumbnails}
            onJumpTo={(ms) => {
              const v = videoRef.current
              if (!v) return
              v.currentTime = ms / 1000
              // If paused, give the user a frame to look at; if playing,
              // they're going to seek and continue. Don't force play.
            }}
          />
        )}
      </div>
    </div>
  )
}

// ── DropZone ─────────────────────────────────────────────────────────

function DropZone({ onPick, modelReady }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer?.files?.[0]
        if (file) onPick(file)
      }}
      className={`flex flex-col items-center justify-center gap-3 px-6 py-12 rounded-2xl border-2 border-dashed transition-colors ${
        dragOver
          ? 'border-ct-terracotta bg-ct-terra-tint'
          : 'border-ct-hairline hover:border-ct-terracotta/50'
      }`}
    >
      <div className="w-12 h-12 rounded-full flex items-center justify-center bg-ct-terra-tint text-ct-terra-soft">
        <Upload size={20} />
      </div>
      <p className="text-sm font-bold text-ct-cream text-center">Drop a climbing clip here</p>
      <p className="text-xs text-ct-cream/60 text-center max-w-[280px]">
        MP4, WebM, or MOV. Up to 400 MB. Trim a window up to {MAX_DURATION_S} seconds inside the app — shorter clips give the cleanest reads. Processed entirely on-device — your video never leaves your phone.
      </p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="btn-primary mt-2"
      >
        Choose video
      </button>
      {!modelReady && (
        <p className="text-[10px] text-ct-cream/50 text-center mt-1">
          You can pick a video now — analysis will start once the model finishes loading.
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onPick(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}

// ── ClipQualityChip ──────────────────────────────────────────────────

/**
 * Compact summary of the analyzer's confidence in the just-processed
 * clip. Sits between the ContextSummary chip and the report, gives
 * the climber a clear "here's what the system thinks of this clip"
 * signal so they can interpret missing findings or odd results.
 *
 * Signals (left to right):
 *   • Tracking — % of frames where a body was reliably detected.
 *     Anything <80% means MediaPipe struggled on this footage.
 *   • Body baseline — source of the calibration the engine used
 *     (default / derived / empirical / locked).
 *   • Camera angle — frontal / angled / ok / side-on. "ok" is the
 *     ~45° band the recording-tips pill coaches users toward.
 *
 * Each signal gets a colored dot: green for good, amber for borderline,
 * dim for default/unknown. Hover/tap on signals show longer copy.
 */
function ClipQualityChip({ quality }) {
  const { detectionRatio, totalFrames, effectiveDetections, droppedSanity,
          angleCategory, calibrationSource } = quality
  const trackedPct = Math.round(detectionRatio * 100)
  const trackingTone = detectionRatio >= 0.9 ? 'good' : detectionRatio >= 0.75 ? 'borderline' : 'bad'

  const angleTone = angleCategory === 'ok' ? 'good'
                  : angleCategory === 'angled' ? 'good'
                  : angleCategory === 'unknown' ? 'borderline' : 'borderline'
  const angleLabel = angleCategory === 'ok' ? '~45°'
                    : angleCategory === 'angled' ? 'angled'
                    : angleCategory === 'side-on' ? 'side-on'
                    : angleCategory === 'frontal' ? 'head-on'
                    : 'unknown'

  const calLabel = {
    default:   'default proportions',
    derived:   'estimated from height',
    empirical: 'tuned to your body',
    explicit:  'locked from calibration',
  }[calibrationSource] || 'default'
  const calTone = calibrationSource === 'explicit' ? 'good'
                : calibrationSource === 'empirical' ? 'good'
                : calibrationSource === 'derived' ? 'borderline' : 'borderline'

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-ct-cream/65 px-1">
      <span className="font-bold uppercase tracking-[0.12em] text-ct-cream/45">
        Analyzer
      </span>
      <QualitySignal tone={trackingTone}>
        Tracking <span className="text-ct-cream/85 ct-tnum font-semibold">{trackedPct}%</span>
        {droppedSanity > 0 && (
          <span className="text-ct-cream/45 ct-tnum"> ({droppedSanity} dropped)</span>
        )}
      </QualitySignal>
      <QualitySignal tone={angleTone}>
        Angle <span className="text-ct-cream/85 font-semibold">{angleLabel}</span>
      </QualitySignal>
      <QualitySignal tone={calTone}>
        Baseline <span className="text-ct-cream/85 font-semibold">{calLabel}</span>
      </QualitySignal>
    </div>
  )
}

const SIGNAL_DOT = {
  good:       'bg-emerald-400',
  borderline: 'bg-ct-terra-soft',
  bad:        'bg-red-400',
}

function QualitySignal({ tone, children }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${SIGNAL_DOT[tone] || SIGNAL_DOT.borderline}`} />
      {children}
    </span>
  )
}

// ── AngleWarningBanner ───────────────────────────────────────────────

/**
 * Surfaces a heads-up when the clip's shoulderWidth/torsoLength ratio
 * indicates the camera was at a degenerate angle for the geometric
 * rules. We never silently degrade — the climber sees the warning so
 * fewer findings (or odd findings) can be attributed to angle, not bug.
 */
function AngleWarningBanner({ profile }) {
  if (!profile) return null
  const isSideOn = profile.category === 'side-on'
  const msg = isSideOn
    ? "This clip looks like it was shot near 90° to the wall. Lateral-balance rules (barn-door, knee position, hip rotation) will be less accurate from this angle."
    : "This clip looks like it was shot head-on with the climber facing the camera. Vertical-body-line rules will be less accurate from this angle."
  return (
    <div className="flex items-start gap-2 text-xs text-ct-cream/80 px-3 py-2 rounded-lg bg-ct-hairline border border-ct-rim">
      <Compass size={13} className="flex-shrink-0 mt-0.5 text-ct-terra-soft" />
      <div className="flex-1 leading-snug">
        <span className="font-bold text-ct-cream">Camera angle: </span>{msg}{' '}
        <span className="text-ct-cream/55">For most accurate results, film at about 45° to the wall.</span>
      </div>
    </div>
  )
}

// ── CalibrationPanel ─────────────────────────────────────────────────

/**
 * Optional body-calibration panel shown on IDLE. Collapsed by default
 * (the empty state stays clean). Open: lets the climber enter height +
 * ape index, see their current calibration state, and run an explicit
 * neutral-pose calibration clip if they want maximum accuracy.
 *
 * Source visualization tells the climber where their baseline came from:
 *   • default   — population average. Rules use it as a fallback.
 *   • derived   — computed from manual height entry.
 *   • empirical — refined from analysis clips (running average).
 *   • explicit  — locked, from a dedicated neutral-pose calibration.
 *
 * Climbers who never open the panel still benefit from the calibration
 * system — every analysis clip silently refines the empirical baseline.
 */
// UnitToggle, MeasurementField, defaultUnit, canRecordVideo are imported
// from ../Measurements so the wizard and analyzer share one implementation.

function CalibrationPanel({
  calibration, modelReady, flash, onDismissFlash,
  onMeasurementsChange, onPickCalibrationFile, onReset,
}) {
  const [open, setOpen] = useState(false)
  const [unit, setUnit] = useState(defaultUnit)
  const [recording, setRecording] = useState(false)
  const fileInputRef = useRef(null)
  const { source, clipCount, height, apeIndex } = calibration

  const sourceLabel = {
    default:   'Using default proportions',
    derived:   'Estimated from height',
    empirical: `Refined from ${clipCount} clip${clipCount === 1 ? '' : 's'}`,
    explicit:  'Locked from calibration clip',
  }[source] || 'Using default proportions'

  const SourceIcon = source === 'explicit' ? Lock : Ruler

  const supportsRecording = canRecordVideo()

  return (
    <div className="rounded-xl border border-ct-rim bg-ct-forest-deep overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-ct-hairline/40 transition-colors"
      >
        <SourceIcon size={14} className={source === 'explicit' ? 'text-emerald-300 flex-shrink-0' : 'text-ct-cream/60 flex-shrink-0'} />
        <span className="text-xs font-bold text-ct-cream flex-1">
          Your body proportions
        </span>
        <span className="text-[10px] text-ct-cream/55 mr-1">{sourceLabel}</span>
        <ChevronDown
          size={14}
          className={`text-ct-cream/45 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {flash && (
        <div className="px-3 py-2 border-t border-ct-rim bg-emerald-500/[0.06] flex items-center gap-2">
          <CheckCircle2 size={12} className="text-emerald-300 flex-shrink-0" />
          <span className="text-[11px] text-ct-cream/85 flex-1">
            {flash === 'locked'
              ? 'Calibration saved — analysis is locked to your body proportions.'
              : 'Your body baseline was refined from this clip.'}
          </span>
          <button
            type="button"
            onClick={onDismissFlash}
            className="text-ct-cream/55 hover:text-ct-cream"
            aria-label="Dismiss"
          >
            <X size={12} />
          </button>
        </div>
      )}
      {open && (
        <div className="border-t border-ct-rim px-3 py-3 flex flex-col gap-4">
          <p className="text-[11px] text-ct-cream/60 leading-snug">
            The analyzer measures your technique relative to YOUR body —
            knee position vs. ankle, hip position vs. shoulder, etc.
            Calibrating gives those measurements a stable, accurate
            baseline. Optional: every analysis clip already refines it.
          </p>

          {/* Unit toggle — applies to both inputs below. Stored values
              are always cm regardless of display. */}
          <div className="flex items-center justify-end">
            <UnitToggle unit={unit} onChange={setUnit} />
          </div>

          {/* Manual measurements */}
          <div className="grid grid-cols-2 gap-2.5">
            <MeasurementField
              label={`Height (${unit})`}
              unit={unit}
              valueCm={height}
              placeholder={unit === 'cm' ? '175' : '69'}
              onCommitCm={(cm) => onMeasurementsChange({ height: cm })}
            />
            <MeasurementField
              label={`Ape index (${unit})`}
              hint="Arm span − height. Climbers know this."
              unit={unit}
              valueCm={apeIndex}
              placeholder="0"
              onCommitCm={(cm) => onMeasurementsChange({ apeIndex: cm })}
              allowNegative
            />
          </div>

          {/* Calibration actions: in-app record OR file upload */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {supportsRecording && (
              <button
                type="button"
                onClick={() => setRecording(true)}
                disabled={!modelReady}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-ct-terracotta text-ct-cream hover:brightness-110 disabled:opacity-40 transition"
              >
                <Camera size={12} />
                Record now
              </button>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!modelReady}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40 transition ${
                supportsRecording
                  ? 'bg-ct-hairline border border-ct-rim text-ct-cream hover:border-ct-terracotta/60'
                  : 'bg-ct-terracotta text-ct-cream hover:brightness-110'
              }`}
            >
              <Upload size={12} />
              Upload video
            </button>
            {source !== 'default' && (
              <button
                type="button"
                onClick={onReset}
                className="text-[11px] text-ct-cream/55 hover:text-ct-cream px-2 py-1 transition-colors ml-auto"
              >
                Reset
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onPickCalibrationFile(file)
                e.target.value = ''
              }}
            />
          </div>
          <p className="text-[10px] text-ct-cream/45 leading-snug">
            Stand straight, arms at your sides, facing the camera, full body in frame. 3 seconds is enough.
          </p>
        </div>
      )}

      {recording && (
        <CalibrationCameraCapture
          onDone={(file) => {
            setRecording(false)
            if (file) onPickCalibrationFile(file)
          }}
          onCancel={() => setRecording(false)}
        />
      )}
    </div>
  )
}

// ── CalibrationCameraCapture ─────────────────────────────────────────

/**
 * Full-screen modal that captures a calibration clip directly from the
 * device camera via getUserMedia + MediaRecorder. The recorded Blob is
 * wrapped as a File and handed back to onPickCalibrationFile so the
 * rest of the calibration pipeline runs unchanged.
 *
 * Flow:
 *   requesting → preview → countdown (3 → 1) → recording (~3s) → review
 *   The user can confirm or retry at the review step.
 *
 * Important caveats:
 *   • Requires a secure context (HTTPS or localhost). The "Record" button
 *     surfaces a clean permission-error UI when the underlying stream fails.
 *   • Picks a MIME the browser actually supports — webm/vp9 → webm/vp8 →
 *     webm → mp4 (Safari). Falls through to "no MIME hint" if all fail,
 *     which MediaRecorder treats as browser-default.
 *   • Cleans up the camera stream on every exit path (cancel / done /
 *     error / unmount). Forgetting this leaks the camera indicator,
 *     which annoys users immediately.
 */
function CalibrationCameraCapture({ onDone, onCancel }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const [stage, setStage] = useState('requesting')   // requesting | preview | countdown | recording | review | error
  const [countdown, setCountdown] = useState(0)
  const [recordedBlob, setRecordedBlob] = useState(null)
  const [recordedUrl, setRecordedUrl] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)

  // Acquire camera on mount.
  useEffect(() => {
    let active = true
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
        if (!active) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
        setStage('preview')
      } catch (err) {
        if (!active) return
        setErrorMsg(err?.name === 'NotAllowedError'
          ? 'Camera permission denied. Use Upload instead, or allow camera access in your browser settings.'
          : err?.name === 'NotFoundError'
          ? 'No camera detected on this device.'
          : `Could not access camera (${err?.message || err?.name || 'unknown'}).`)
        setStage('error')
      }
    }
    start()
    return () => {
      active = false
      cleanup()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function cleanup() {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop() } catch { /* already stopped */ }
    }
    recorderRef.current = null
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (recordedUrl) URL.revokeObjectURL(recordedUrl)
  }

  function pickMimeType() {
    const candidates = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4',
    ]
    for (const m of candidates) {
      if (MediaRecorder.isTypeSupported?.(m)) return m
    }
    return ''
  }

  // Countdown then record.
  const startCountdown = useCallback(() => {
    setStage('countdown')
    setCountdown(3)
    let n = 3
    const tick = setInterval(() => {
      n -= 1
      if (n > 0) {
        setCountdown(n)
      } else {
        clearInterval(tick)
        beginRecording()
      }
    }, 800)
  }, [])

  function beginRecording() {
    if (!streamRef.current) return
    const mimeType = pickMimeType()
    let recorder
    try {
      recorder = mimeType ? new MediaRecorder(streamRef.current, { mimeType }) : new MediaRecorder(streamRef.current)
    } catch (err) {
      setErrorMsg(`Could not start recording (${err?.message || err?.name || 'unknown'}).`)
      setStage('error')
      return
    }
    chunksRef.current = []
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' })
      const url = URL.createObjectURL(blob)
      setRecordedBlob(blob)
      setRecordedUrl(url)
      setStage('review')
    }
    recorderRef.current = recorder
    recorder.start()
    setStage('recording')

    // Auto-stop after 3.5 seconds.
    setTimeout(() => {
      if (recorderRef.current && recorderRef.current.state === 'recording') {
        recorderRef.current.stop()
      }
    }, 3500)
  }

  function handleConfirm() {
    if (!recordedBlob) return
    const ext = (recordedBlob.type.includes('mp4') ? 'mp4' : 'webm')
    const file = new File([recordedBlob], `calibration.${ext}`, { type: recordedBlob.type })
    cleanup()
    onDone(file)
  }

  function handleRetry() {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl)
    setRecordedBlob(null)
    setRecordedUrl(null)
    setStage('preview')
  }

  function handleCancel() {
    cleanup()
    onCancel()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      role="dialog"
      aria-label="Body calibration camera"
    >
      <div className="relative w-full max-w-md max-h-full flex flex-col bg-ct-forest-deep border border-ct-hairline rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-ct-hairline">
          <div className="flex items-center gap-2">
            <Camera size={14} className="text-ct-terra-soft" />
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-ct-cream">
              Calibrate body proportions
            </span>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="text-ct-cream/55 hover:text-ct-cream"
            aria-label="Cancel"
          >
            <X size={14} />
          </button>
        </div>

        {/* Preview / recorded video */}
        <div className="relative bg-black aspect-[3/4] sm:aspect-[4/3] w-full overflow-hidden">
          {stage !== 'review' && (
            <video
              ref={videoRef}
              muted
              playsInline
              autoPlay
              className="absolute inset-0 w-full h-full object-cover [transform:scaleX(-1)]"
            />
          )}
          {stage === 'review' && recordedUrl && (
            <video
              src={recordedUrl}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover [transform:scaleX(-1)]"
            />
          )}

          {/* Stage overlays */}
          {stage === 'requesting' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 size={20} className="text-ct-terra-soft animate-spin" />
            </div>
          )}
          {stage === 'countdown' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-8xl font-bold text-ct-cream ct-tnum drop-shadow-lg">
                {countdown}
              </div>
            </div>
          )}
          {stage === 'recording' && (
            <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/90 text-white text-[10px] font-bold uppercase tracking-wider">
              <Circle size={8} fill="currentColor" className="animate-pulse" />
              Recording
            </div>
          )}
        </div>

        {/* Footer / actions */}
        <div className="px-3 py-3 flex flex-col gap-2">
          {stage === 'preview' && (
            <>
              <p className="text-[11px] text-ct-cream/60 leading-snug text-center">
                Stand back so your full body is in frame. Arms at your sides, facing the camera. We&rsquo;ll record 3 seconds.
              </p>
              <button
                type="button"
                onClick={startCountdown}
                className="self-center flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold bg-ct-terracotta text-ct-cream hover:brightness-110 transition"
              >
                <Circle size={12} fill="currentColor" />
                Start recording
              </button>
            </>
          )}
          {(stage === 'countdown' || stage === 'recording') && (
            <p className="text-[11px] text-ct-cream/60 leading-snug text-center">
              Hold still — full body visible.
            </p>
          )}
          {stage === 'review' && (
            <>
              <p className="text-[11px] text-ct-cream/60 leading-snug text-center">
                Looks good?
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-ct-hairline border border-ct-rim text-ct-cream/85 hover:text-ct-cream hover:border-ct-terracotta/60 transition"
                >
                  <RefreshCw size={11} />
                  Retake
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-ct-terracotta text-ct-cream hover:brightness-110 transition"
                >
                  <CheckCircle2 size={11} />
                  Use this clip
                </button>
              </div>
            </>
          )}
          {stage === 'error' && (
            <div className="flex items-start gap-2 text-xs text-ct-terra-soft px-2 py-2 rounded-lg bg-ct-terra-tint border border-ct-terracotta/30">
              <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
              <span className="flex-1">{errorMsg}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// UnitToggle and MeasurementField are imported from ../Measurements.

// ── RecordingTips ────────────────────────────────────────────────────

/**
 * Collapsible "how to film" guidance. Shown above the drop zone on
 * IDLE. Closed by default so the empty state stays clean; the
 * terracotta accent is enough to draw the eye for first-time uploaders
 * without forcing them to dismiss anything.
 *
 * The four tips encode what the pose detector + rule engine actually
 * need: 45° angle (captures both lateral and vertical body lines),
 * full-body framing (no cropped limbs), phone orientation/distance,
 * and lighting (backlit silhouettes kill landmark visibility).
 */
function RecordingTips() {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-ct-terracotta/40 bg-ct-terra-tint/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-ct-terra-tint transition-colors"
      >
        <Video size={14} className="text-ct-terra-soft flex-shrink-0" />
        <span className="text-xs font-bold text-ct-cream flex-1">
          How to film for best results
        </span>
        <ChevronDown
          size={14}
          className={`text-ct-terra-soft transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="border-t border-ct-terracotta/25 px-3 py-3 flex flex-col gap-2.5">
          <TipRow Icon={Scissors} title="Short clips read cleanest">
            Aim for 5–15 seconds of the move or sequence you want feedback on. You can upload longer and trim a window inside the app.
          </TipRow>
          <TipRow Icon={Compass} title="Film from ~45° to the wall">
            Best angle for the pose detector to read body line and side-to-side balance at once.
          </TipRow>
          <TipRow Icon={User} title="Full body in frame">
            Head to feet through the whole clip — don't crop limbs.
          </TipRow>
          <TipRow Icon={Smartphone} title="Landscape, chest-height">
            Phone sideways, tripod or wedged surface, about 10 ft back.
          </TipRow>
          <TipRow Icon={Sun} title="Even lighting, no backlight">
            Avoid windows or bright lights behind the climber — silhouettes break tracking.
          </TipRow>
        </div>
      )}
    </div>
  )
}

function TipRow({ Icon, title, children }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-6 h-6 rounded-md bg-ct-terracotta/15 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={12} className="text-ct-terra-soft" />
      </div>
      <div className="flex-1">
        <p className="text-xs font-bold text-ct-cream leading-snug">{title}</p>
        <p className="text-[11px] text-ct-cream/65 leading-snug mt-0.5">{children}</p>
      </div>
    </div>
  )
}

// ── ModelLoadProgress ────────────────────────────────────────────────

function formatMB(bytes) {
  return (bytes / (1024 * 1024)).toFixed(1)
}

// ── ContextSummary ───────────────────────────────────────────────────

/**
 * Inline chip summarizing the upload-context the user provided. Shown
 * above the video in READY state. Phase 1.5 deliverable — proves the
 * form's data is being captured + carried through the pipeline.
 */
function ContextSummary({ context }) {
  const { venue, wallAngle, discipline, grade, outcome, fallTimeMs, focus } = context
  const fallStr = fallTimeMs != null ? ` at ${formatFallTime(fallTimeMs)}` : ''
  const OutcomeIcon = outcome === 'sent' ? CheckCircle2 : XCircle

  // Calibration line: only shown when at least one of the engine's
  // profile overrides is active. Lets the climber know that the
  // report has a higher evidence bar than default — so fewer findings
  // doesn't read as "the analyzer broke."
  const advanced = isAdvancedGrade(grade)
  const board    = venue === 'board'
  const calibrationParts = []
  if (advanced) calibrationParts.push(`advanced grade (${grade.value})`)
  if (board)    calibrationParts.push('board climbing')

  return (
    <div className="flex flex-col gap-1.5 px-1">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-ct-cream/60">
        <span className="font-bold uppercase tracking-[0.12em] text-ct-cream/45">This clip</span>
        {venue && <Chip>{venueLabel(venue)}</Chip>}
        <Chip>{capitalize(wallAngle)}</Chip>
        <Chip>{capitalize(discipline)}</Chip>
        <Chip>{grade.value}</Chip>
        <Chip tone="accent">
          <OutcomeIcon size={10} strokeWidth={2.4} />
          {outcome === 'sent' ? 'Sent' : `Fell${fallStr}`}
        </Chip>
        {focus.length > 0 && (
          <span className="text-ct-cream/45">
            Focus: <span className="text-ct-cream/70">{focus.map(capitalize).join(', ')}</span>
          </span>
        )}
      </div>
      {calibrationParts.length > 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-ct-cream/50 leading-snug">
          <SlidersHorizontal size={10} className="text-ct-terra-soft/80 flex-shrink-0" />
          <span>
            Calibrated for {calibrationParts.join(' + ')} — only sustained, high-confidence flags surface.
          </span>
        </div>
      )}
    </div>
  )
}

function venueLabel(v) {
  if (v === 'indoor')  return 'Indoor'
  if (v === 'outdoor') return 'Outdoor'
  if (v === 'board')   return 'Board'
  return capitalize(v)
}

function Chip({ children, tone }) {
  const toneClass =
    tone === 'accent' ? 'border-ct-terracotta/40 text-ct-terra-soft bg-ct-terra-tint' :
                        'border-ct-rim text-ct-cream/70 bg-ct-hairline'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold ${toneClass}`}>
      {children}
    </span>
  )
}

function capitalize(s) {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatFallTime(ms) {
  const total = Math.round(ms / 100) / 10
  const m = Math.floor(total / 60)
  const s = total - m * 60
  return `${m}:${s.toFixed(1).padStart(4, '0')}`
}

function ModelLoadProgress({ progress }) {
  const { loaded, total } = progress
  const pct = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0
  const loadedMB = formatMB(loaded)
  const totalMB = total > 0 ? formatMB(total) : '?'

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 text-xs text-ct-cream/70">
        <Loader2 size={12} className="animate-spin text-ct-terra-soft flex-shrink-0" />
        <span className="flex-1">Loading pose model…</span>
        <span className="ct-tnum text-ct-cream/50">
          {loadedMB} / {totalMB} MB
        </span>
      </div>
      <div className="h-1 rounded-full bg-ct-hairline overflow-hidden">
        <div
          className="h-full bg-ct-terra-soft transition-[width] duration-150"
          style={{ width: total > 0 ? `${pct}%` : '20%' }}
        />
      </div>
    </div>
  )
}
