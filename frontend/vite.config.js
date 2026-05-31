/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { createReadStream, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Vite plugin: serve /mp-wasm/* from frontend/public/mp-wasm/
 * via a raw middleware that runs BEFORE Vite's transform middleware.
 *
 * Two problems this plugin solves at once:
 *
 * 1. Vite's dev server refuses to serve files under /public/ as imported
 *    modules ("This file is in /public and ... should not be imported from
 *    source code"). MediaPipe loads its WASM JS glue via importScripts()
 *    (in classic workers) or dynamic import() (in module workers — which
 *    is Vite's dev default). The intercept blocks both paths.
 *
 * 2. The Emscripten-generated vision_wasm_internal.js uses
 *    `var ModuleFactory = (...)` and a UMD bottom block. In a CLASSIC
 *    worker (importScripts) the `var` becomes a global of the worker
 *    scope, so `self.ModuleFactory` resolves. In a MODULE worker
 *    (Vite dev) the dynamic-import fallback scopes `var` to the module,
 *    so `self.ModuleFactory` stays undefined and MediaPipe throws
 *    "ModuleFactory not set." This middleware appends an explicit
 *    `self.ModuleFactory = ModuleFactory` to the served JS so both
 *    paths work.
 *
 * In production builds the files are copied to dist/ by Vite's normal
 * static-asset handling and this plugin is a no-op. Production workers
 * are IIFE/classic per worker.format default, so the appended line
 * harmlessly assigns to self (the worker global).
 */
function serveMediaPipeWasm() {
  const wasmDir = resolve(__dirname, 'public', 'mp-wasm')

  // Append: expose the factory on `self`. The Emscripten glue uses
  // `var ModuleFactory = ...` which is module-scoped under dynamic
  // import() in a module worker (Vite dev default). MediaPipe checks
  // `self.ModuleFactory` after loading and throws "ModuleFactory not
  // set." if it's missing.
  const GLOBAL_PATCH = "\n// Patched by serveMediaPipeWasm: expose factory on the global so the\n// dynamic-import fallback in MediaPipe's loader can find it in module\n// worker contexts (Vite dev default).\nif (typeof self !== 'undefined') { self.ModuleFactory = ModuleFactory; }\n"

  // The Emscripten glue declares `function custom_dbg(text) {...}` inside
  // an `else { if {} }` block, then calls `custom_dbg(...)` outside that
  // inner block. This works under Annex-B non-strict hoisting but not in
  // strict mode (which all ES modules implicitly are). Result:
  // "custom_dbg is not defined" the first time MediaPipe emits a debug
  // line. Replace the broken block with a var-assignment so the binding
  // hoists to the enclosing function in strict mode too.
  const CUSTOM_DBG_BROKEN = `function custom_emscripten_dbgn(str, len) {
  if (typeof (dbg) !== "undefined") {
    dbg(UTF8ToString(str, len));
  } else {
    if (typeof (custom_dbg) === "undefined") {
      function custom_dbg(text) {
        console.warn.apply(console, arguments);
      }
    }
    custom_dbg(UTF8ToString(str, len));
  }
}`
  const CUSTOM_DBG_FIXED = `function custom_emscripten_dbgn(str, len) {
  // Patched by serveMediaPipeWasm: var so the binding hoists to the
  // enclosing function in strict mode.
  var custom_dbg = function (text) { console.warn.apply(console, arguments); };
  if (typeof (dbg) !== "undefined") {
    dbg(UTF8ToString(str, len));
  } else {
    custom_dbg(UTF8ToString(str, len));
  }
}`

  return {
    name: 'serve-mp-wasm',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/mp-wasm/')) return next()
        const relPath = req.url.split('?')[0].split('#')[0].replace('/mp-wasm/', '')
        const filePath = resolve(wasmDir, relPath)
        if (!filePath.startsWith(wasmDir) || !existsSync(filePath)) return next()
        const isJs = filePath.endsWith('.js')
        res.setHeader('Content-Type', isJs ? 'application/javascript' : 'application/wasm')
        // No-cache in dev so iterating on the patches doesn't get stuck
        // behind a stale browser cache. Production serves these as static
        // dist/ assets where Vite adds content-hashed URLs, so caching
        // aggressively is safe there.
        res.setHeader('Cache-Control', 'no-store')
        if (isJs) {
          import('node:fs').then(({ readFileSync }) => {
            let body = readFileSync(filePath, 'utf8')
            // Strict-mode fix: replace the broken custom_dbg block.
            // No-op if the snippet is absent (e.g. on the module variant
            // which is the same source — both ship the same snippet).
            body = body.replace(CUSTOM_DBG_BROKEN, CUSTOM_DBG_FIXED)
            // Global assignment for the dynamic-import path.
            body += GLOBAL_PATCH
            res.end(body)
          })
        } else {
          createReadStream(filePath).pipe(res)
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [
    serveMediaPipeWasm(),
    react(),
    VitePWA({
      // Use generateSW (Workbox builds the service worker for us). Auto-update
      // means new SW takes over on the next page load — no user action needed.
      registerType: 'autoUpdate',
      includeAssets: ['logo.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'CoreTriage',
        short_name: 'CoreTriage',
        description: 'Climbing-injury triage, rehab, and 1:1 coaching',
        theme_color: '#0b1220',
        background_color: '#0b1220',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Cache-first for static assets so repeat visits are instant.
        // Note the explicit mediapipe entries: we only want the SIMD
        // variant precached (modern browsers all support SIMD). The
        // `vision_wasm_module*` and `vision_wasm_nosimd*` variants live
        // on disk for fallback but aren't eagerly cached — that would
        // triple the PWA cache size to ~40 MB for no real benefit.
        globPatterns: [
          '**/*.{js,css,html,svg,png,ico,woff,woff2,task}',
          'mp-wasm/vision_wasm_internal.{js,wasm}',
        ],
        // Bump precache cap so the MediaPipe assets fit — the .task model
        // is ~6 MB and the SIMD WASM binary is ~11 MB. 16 MiB gives some
        // headroom if we swap to the Full pose model later.
        maximumFileSizeToCacheInBytes: 16 * 1024 * 1024,
        // Don't precache the API responses — they're dynamic. Only static.
        navigateFallbackDenylist: [/^\/api\//],
        // Bump cleanup limits so the service worker doesn't fight cached fonts/icons
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'node',
    globals: true,
  },
  build: {
    rollupOptions: {
      output: {
        // Separate vendor libraries into their own chunks. Vendors change less
        // often than app code, so the user's browser can keep them cached
        // across deploys — only the (smaller) app chunks re-download on each
        // update.
        manualChunks: {
          'vendor-react':       ['react', 'react-dom', 'react-router-dom'],
          'vendor-motion':      ['framer-motion'],
          'vendor-sentry':      ['@sentry/react'],
          'vendor-markdown':    ['react-markdown'],
          'vendor-icons':       ['lucide-react'],
        },
      },
    },
    // We code-split routes — chunks land in the 100–400 KB range which is
    // expected. Quiet the "chunk over 500 KB" warning so it doesn't drown
    // out the actually-useful build output.
    chunkSizeWarningLimit: 700,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
