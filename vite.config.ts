import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'logo.webp',
        'apple-touch-icon.png',
        'favicon-32.png',
        'courses/black-desert.jpg',
      ],
      manifest: {
        name: '2026 Sweaty Balls Cup',
        short_name: 'Sweaty Balls',
        description: 'Quota game + skins tracker for the 2026 Sweaty Balls Cup in St. George, Utah.',
        theme_color: '#1f2915',
        background_color: '#ece5d4',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the whole app shell so it opens with no signal on the course.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,jpg,woff2}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: {
    host: true,
  },
})
