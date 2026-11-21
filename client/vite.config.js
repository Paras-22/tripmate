import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    // Here I set up the PWA. I use injectManifest because I wrote my own service worker for push.
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'service-worker.js',
      injectRegister: 'auto',
      manifest: {
        name: 'TripMate - Group Trip Planner',
        short_name: 'TripMate',
        description: 'One shared trip plan for the whole group, even offline.',
        theme_color: '#0f6b62',
        background_color: '#f7f3ec',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  // Here I send API calls to the Express server while developing
  server: { proxy: { '/api': 'http://localhost:5000' } },
  test: { environment: 'jsdom', globals: true },
})
