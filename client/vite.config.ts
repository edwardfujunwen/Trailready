import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'TrailReady — Trip Planner',
        short_name: 'TrailReady',
        description: 'Plan your hiking, backpacking, climbing, and paddling adventures',
        theme_color: '#166534',
        background_color: '#0c0a09',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable'
          },
        ],
      },
      skipWaiting: true,
      clientsClaim: true,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          // Groq API — never cache (always needs live AI)
          {
            urlPattern: /^https:\/\/api\.groq\.com\/.*/i,
            handler: 'NetworkOnly',
          },
          // Nominatim geocoding — network first, short cache
          {
            urlPattern: /^https:\/\/nominatim\.openstreetmap\.org\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'nominatim-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          // NPS API — cache for 1 hour
          {
            urlPattern: /^https:\/\/developer\.nps\.gov\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'nps-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 },
            },
          },
          // OpenStreetMap tiles — cache for 7 days
          {
            urlPattern: /^https:\/\/.*tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          // Local API calls (packing list, trails, weather) — stale-while-revalidate
          // This lets the offline user see their last-loaded packing list
          {
            urlPattern: /^http:\/\/localhost:3001\/api\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'local-api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
