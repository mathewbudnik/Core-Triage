#!/usr/bin/env node
/**
 * Copy MediaPipe Tasks-Vision WASM files from node_modules into public/ so
 * they're served same-origin instead of fetched from jsDelivr. Self-hosting
 * removes ~1-3s of CDN handshake on cold loads and makes the files cacheable
 * by our Service Worker (Workbox glob in vite.config.js precaches *.wasm).
 *
 * Runs automatically after `npm install` (see package.json "postinstall").
 * Idempotent — safe to re-run.
 */
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname, fileURLToPath, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const SRC = join(here, '..', 'node_modules', '@mediapipe', 'tasks-vision', 'wasm')
const DEST = join(here, '..', 'public', 'mp-wasm')

if (!existsSync(SRC)) {
  // tasks-vision may not be installed yet during initial dependency
  // resolution; skip silently. The next npm install pass will re-run this.
  console.warn(`[copy-mediapipe-wasm] source missing, skipping: ${SRC}`)
  process.exit(0)
}

mkdirSync(DEST, { recursive: true })
cpSync(SRC, DEST, { recursive: true })

const files = readdirSync(DEST)
console.log(`[copy-mediapipe-wasm] copied ${files.length} files → ${DEST}`)
