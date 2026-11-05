/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Everything the demo needs is precached by the service worker on the first
// online load. There are no lazy chunks: anything fetched after an incident
// starts would show up on the network-requests counter, which must read 0.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Pinpoint Showcase Demo',
        short_name: 'Pinpoint',
        description: 'Showcase demo, not for patient care. The record that survives every handoff.',
        start_url: '/phone',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0b0d10',
        theme_color: '#0b0d10',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        // The speech runtime (~22 MB) is only for the phone. It is cached on
        // first use (the speech spike / setup step), not pushed to the monitors.
        globIgnores: ['ort/**'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/ort/'),
            handler: 'CacheFirst',
            options: { cacheName: 'pinpoint-ort', expiration: { maxEntries: 8 } },
          },
        ],
        maximumFileSizeToCacheInBytes: 30 * 1024 * 1024,
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
  build: {
    target: 'es2022',
    // The app is one bundle. The only separate chunk is the optional speech
    // engine, which is precached and loaded at app open, before an incident.
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
