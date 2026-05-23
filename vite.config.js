import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { VitePWA } from 'vite-plugin-pwa'
import { jarvisAgentPlugin } from './vite-plugins/jarvisAgentPlugin.js'
import { edgeTtsPlugin } from './vite-plugins/edgeTtsPlugin.js'
import { chatterboxTtsPlugin } from './vite-plugins/chatterboxTtsPlugin.js'
import { freellmapiBrainPlugin } from './vite-plugins/freellmapiBrainPlugin.js'
import { ollamaBrainPlugin } from './vite-plugins/ollamaBrainPlugin.js'
import { memoryPlugin } from './vite-plugins/memoryPlugin.js'
import { geminiBrainPlugin } from './vite-plugins/geminiBrainPlugin.js'

export default defineConfig(({ command }) => {
  const devPlugins =
    command === 'serve'
      ? [basicSsl(), jarvisAgentPlugin(), edgeTtsPlugin(), chatterboxTtsPlugin(), freellmapiBrainPlugin(), ollamaBrainPlugin(), memoryPlugin(), geminiBrainPlugin()]
      : []

  return {
    plugins: [
      ...devPlugins,
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['favicon.ico', 'jarvis-icon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
        manifest: {
          name: 'Raj Assistant',
          short_name: 'Raj',
          description: 'Jarvis voice assistant and Raj Chat — local AI on your Mac',
          theme_color: '#050810',
          background_color: '#050810',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          shortcuts: [
            {
              name: 'Jarvis Voice',
              short_name: 'Voice',
              description: 'Wake-word voice assistant',
              url: '/',
              icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
            },
            {
              name: 'Raj Chat',
              short_name: 'Chat',
              description: 'Natural chat with attachments',
              url: '/chat',
              icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
            },
          ],
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,ico,png,svg,html}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//, /^\/\.netlify\//],
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.mode === 'navigate',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'raj-pages',
                networkTimeoutSeconds: 5,
              },
            },
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
