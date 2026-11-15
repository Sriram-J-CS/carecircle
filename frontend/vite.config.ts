import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'carecircle-logo.svg'],
      workbox: {
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // 6MB for face-api models
      },
      manifest: {
        name: 'CareCircle — AI Elder Care',
        short_name: 'CareCircle',
        description: 'AI elder-care companion with Face ID, medicine reminders, and health check-ins.',
        theme_color: '#0F5C5A',
        background_color: '#FBF8F3',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 5173,
    host: true,
  },
});
