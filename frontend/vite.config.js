import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
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
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        // Don't precache the API responses — they're dynamic. Only static.
        navigateFallbackDenylist: [/^\/api\//],
        // Bump cleanup limits so the service worker doesn't fight cached fonts/icons
        cleanupOutdatedCaches: true,
      },
    }),
  ],
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
