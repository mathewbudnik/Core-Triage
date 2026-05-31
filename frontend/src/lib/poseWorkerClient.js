/**
 * Main-thread client for the pose detection Worker. Returned by
 * `createPoseClient()` — one instance per consumer mount.
 *
 * Why a factory instead of a module singleton: React StrictMode in dev
 * mounts components twice (mount → cleanup → mount). With a module-level
 * singleton, mount 1's cleanup and mount 2's init race on shared state:
 *   - mount 1 starts model fetch
 *   - cleanup terminates the worker mid-init
 *   - mount 2 sees a stale `initPromise` and skips re-init
 *   - `setModelReady(true)` fires for a worker that's been killed
 *   - first `detectPose` after that throws "Landmarker not initialized"
 *
 * Each `createPoseClient()` call owns its own worker, pending map, and
 * init state. Mount 1's client and mount 2's client are fully isolated.
 *
 * We fetch the .task model on the main thread (so we can stream byte
 * progress to the UI), then transfer the ArrayBuffer to the worker for
 * one-shot init. WASM is served same-origin from /mp-wasm/ — files are
 * copied out of node_modules by scripts/copy-mediapipe-wasm.mjs on
 * postinstall, and patched at dev-time by serveMediaPipeWasm in
 * vite.config.js (see that file for the strict-mode patches).
 */
import PoseWorker from '../workers/poseWorker.js?worker'

// Pose Landmarker model. Upgraded from Lite (~5.5 MB) to Full (~9 MB)
// for noticeably better accuracy — especially on partial / occluded
// poses and unusual camera angles (behind, overhead) which climbing
// footage hits frequently. Trade-off: +4 MB cold-load download,
// roughly 2× slower per-frame inference during the preprocessing pass.
const MODEL_URL = '/models/pose_landmarker_full.task'
const WASM_FILESET_URL = '/mp-wasm'

export function createPoseClient() {
  let worker = null
  let nextId = 1
  const pending = new Map()
  let initPromise = null
  let isClosed = false

  function ensureWorker() {
    if (isClosed) throw new Error('Pose client is closed')
    if (worker) return worker
    worker = new PoseWorker()
    worker.onmessage = (event) => {
      const { id, type } = event.data
      const entry = pending.get(id)
      if (!entry) return
      pending.delete(id)
      if (type === 'error') entry.reject(new Error(event.data.message))
      else entry.resolve(event.data)
    }
    worker.onerror = (event) => {
      // Worker died — reject everything pending so callers see a clean error.
      const err = new Error(event.message || 'Pose worker crashed')
      for (const entry of pending.values()) entry.reject(err)
      pending.clear()
      worker = null
    }
    return worker
  }

  function send(message, transfer) {
    if (isClosed) return Promise.reject(new Error('Pose client is closed'))
    const id = nextId++
    ensureWorker().postMessage({ id, ...message }, transfer || [])
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject })
    })
  }

  /**
   * Fetch the pose model with streaming progress so callers can render a
   * "X.X / Y.Y MB" indicator instead of staring at a spinner. Returns the
   * full ArrayBuffer once complete.
   */
  async function fetchModelWithProgress(onProgress) {
    const res = await fetch(MODEL_URL)
    if (!res.ok) throw new Error(`Pose model fetch failed: ${res.status}`)

    const totalHeader = res.headers.get('content-length')
    const total = totalHeader ? parseInt(totalHeader, 10) : 0

    if (!res.body || !onProgress) {
      return await res.arrayBuffer()
    }

    const reader = res.body.getReader()
    const chunks = []
    let loaded = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      loaded += value.byteLength
      onProgress({ loaded, total })
    }

    const out = new Uint8Array(loaded)
    let offset = 0
    for (const chunk of chunks) {
      out.set(chunk, offset)
      offset += chunk.byteLength
    }
    return out.buffer
  }

  /**
   * Initialize the Worker's PoseLandmarker. Resolves when the model is ready
   * to accept detect() calls. Safe to call multiple times — subsequent calls
   * resolve to the same promise.
   *
   * @param {(progress: { loaded: number, total: number }) => void} [onProgress]
   */
  function initPoseWorker(onProgress) {
    if (initPromise) return initPromise
    initPromise = (async () => {
      try {
        const modelBuffer = await fetchModelWithProgress(onProgress)
        if (isClosed) throw new Error('Pose client closed before init')
        await send(
          { type: 'init', modelBuffer, wasmFilesetUrl: WASM_FILESET_URL },
          [modelBuffer],  // transfer the ArrayBuffer — main thread no longer needs it
        )
      } catch (err) {
        initPromise = null  // allow retry
        throw err
      }
    })()
    return initPromise
  }

  /**
   * Run pose detection on a single frame. `bitmap` is transferred to the
   * Worker (zero-copy) — do not use it on the main thread after calling.
   */
  function detectPose(bitmap, timestampMs) {
    return send({ type: 'detect', bitmap, timestampMs }, [bitmap])
  }

  /**
   * Tear down the Worker. Idempotent — safe to call multiple times.
   * Synchronously nulls state so any concurrent operations fail fast.
   */
  function closePoseWorker() {
    if (isClosed) return
    isClosed = true
    const w = worker
    worker = null
    initPromise = null
    // Best-effort graceful close so MediaPipe frees the GPU context.
    // We don't await — caller's cleanup runs synchronously.
    if (w) {
      try { w.postMessage({ id: -1, type: 'close' }) } catch {}
      // Give the worker ~100ms to finish .close() on its PoseLandmarker
      // before we hard-terminate. If the page is unloading this never
      // fires, but that's fine — the page going away frees everything.
      setTimeout(() => { try { w.terminate() } catch {} }, 100)
    }
    for (const entry of pending.values()) entry.reject(new Error('Pose client closed'))
    pending.clear()
  }

  return { initPoseWorker, detectPose, closePoseWorker }
}
