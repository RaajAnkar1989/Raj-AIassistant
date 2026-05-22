import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { VitePWA } from 'vite-plugin-pwa'
import { edgeTtsPlugin } from './vite-plugins/edgeTtsPlugin.js'
import { chatterboxTtsPlugin } from './vite-plugins/chatterboxTtsPlugin.js'
import { freellmapiBrainPlugin } from './vite-plugins/freellmapiBrainPlugin.js'
import { geminiBrainPlugin } from './vite-plugins/geminiBrainPlugin.js'

export default defineConfig(({ command }) => {
  const devPlugins =
    command === 'serve'
      ? [basicSsl(), edgeTtsPlugin(), chatterboxTtsPlugin(), freellmapiBrainPlugin(), geminiBrainPlugin()]
      : []

  return {
    plugins: [
      ...devPlugins,
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'Raj Assistant',
          short_name: 'Raj',
          description: 'Jarvis-style voice assistant — speak to Raj, opens real iPhone apps',
          theme_color: '#050810',
          background_color: '#050810',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
          ],
        },
      }),
    ],
    server: {
      port: 3002,
      strictPort: true,
      host: true,
      open: true,
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  }
})
