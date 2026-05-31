/**
 * Pose detection Web Worker. Owns the PoseLandmarker instance so inference
 * runs off the main thread.
 *
 * Two-stage init:
 *   1. Main thread fetches /models/pose_landmarker_lite.task itself (so it
 *      can stream byte-progress to the UI) and posts the ArrayBuffer here.
 *   2. We hand the buffer to PoseLandmarker.createFromOptions via
 *      `modelAssetBuffer` (avoids a second fetch inside the Worker).
 *
 * Message protocol (all tagged with `id` so the client can match responses):
 *   { id, type: 'init', modelBuffer: ArrayBuffer, wasmFilesetUrl: string }
 *     → { id, type: 'ready' } or { id, type: 'error', message }
 *
 *   { id, type: 'detect', bitmap: ImageBitmap, timestampMs }
 *     → { id, type: 'detected', landmarks, worldLandmarks }
 *
 *   { id, type: 'close' }
 *     → { id, type: 'closed' }
 */
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'

let landmarker = null

async function handleInit(modelBuffer, wasmFilesetUrl) {
  const fileset = await FilesetResolver.forVisionTasks(wasmFilesetUrl)
  landmarker = await PoseLandmarker.createFromOptions(fileset, {
    baseOptions: {
      modelAssetBuffer: new Uint8Array(modelBuffer),
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    numPoses: 1,
    // Tightened confidence thresholds — climbing footage from behind/overhead
    // angles confuses the Lite model on default thresholds (it'll return
    // low-confidence positions snapped to background holds instead of
    // refusing to detect). Raising these makes the model more conservative
    // about firing on partial / unclear poses.
    //
    // Defaults are 0.5/0.5/0.5; we push detection higher because a missing
    // skeleton on a hard frame is better than a wrong skeleton.
    minPoseDetectionConfidence: 0.7,
    minPosePresenceConfidence:  0.6,
    minTrackingConfidence:      0.6,
  })
}

async function handleDetect(bitmap, timestampMs) {
  if (!landmarker) throw new Error('Landmarker not initialized')
  const result = landmarker.detectForVideo(bitmap, timestampMs)
  if (typeof bitmap.close === 'function') bitmap.close()
  return {
    landmarks: result.landmarks?.[0] ?? null,
    worldLandmarks: result.worldLandmarks?.[0] ?? null,
  }
}

self.onmessage = async (event) => {
  const { id, type } = event.data
  try {
    if (type === 'init') {
      await handleInit(event.data.modelBuffer, event.data.wasmFilesetUrl)
      self.postMessage({ id, type: 'ready' })
    } else if (type === 'detect') {
      const result = await handleDetect(event.data.bitmap, event.data.timestampMs)
      self.postMessage({ id, type: 'detected', ...result })
    } else if (type === 'close') {
      if (landmarker) {
        landmarker.close()
        landmarker = null
      }
      self.postMessage({ id, type: 'closed' })
      self.close()
    } else {
      throw new Error(`Unknown message type: ${type}`)
    }
  } catch (err) {
    self.postMessage({ id, type: 'error', message: err?.message || String(err) })
  }
}
