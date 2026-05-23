import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { Toaster } from 'react-hot-toast'

import { migrateBrainSettings, getBrainProvider, resolveBrainConfig, isBrainUserLocked } from './constants/aiProviders'
import { clearQuotaExceededCache } from './utils/openaiErrors'
import { restoreVoiceTimers } from './services/timerService'
import { syncFreeLLMAPIFromLocal } from './services/freellmapiSync'
import { syncOllamaFromLocal } from './services/ollamaSync'
import App from './App.jsx'
import { store } from './store/store.js'
import './index.css'

const APP_SHELL_VERSION = '9-boot-fix'

/** Old PWA/service worker caches served the dashboard UI — clear them once. */
async function migrateAppShell() {
  const key = 'raj_app_shell_version'
  const prev = localStorage.getItem(key)

  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations()
    const shouldPurge = import.meta.env.DEV || (prev && prev !== APP_SHELL_VERSION)
    if (shouldPurge) {
      await Promise.all(regs.map((r) => r.unregister()))
    }
  }

  if ('caches' in window && (import.meta.env.DEV || (prev && prev !== APP_SHELL_VERSION))) {
    const names = await caches.keys()
    await Promise.all(names.map((n) => caches.delete(n)))
  }

  if (prev !== APP_SHELL_VERSION) {
    localStorage.setItem(key, APP_SHELL_VERSION)
    if (prev && prev !== APP_SHELL_VERSION) {
      window.location.reload()
      return false
    }
  }
  return true
}

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#22d3ee' },
    background: { default: '#050810', paper: '#0c1929' },
    text: { primary: '#e0f2fe', secondary: '#64748b' },
  },
  typography: {
    fontFamily: '"Inter", system-ui, sans-serif',
  },
})

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

async function boot() {
  try {
    migrateBrainSettings()
    resolveBrainConfig({ persist: !isBrainUserLocked() })
    if (getBrainProvider() !== 'openai') clearQuotaExceededCache()
    void restoreVoiceTimers()
  } catch (e) {
    console.warn('[Raj] boot setup failed:', e)
  }

  const ok = await migrateAppShell()
  if (!ok) return

  ReactDOM.createRoot(document.getElementById('root')).render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: 'rgba(8, 14, 28, 0.95)',
              color: '#e0f2fe',
              border: '1px solid rgba(34, 211, 238, 0.2)',
              backdropFilter: 'blur(12px)',
            },
          }}
        />
      </ThemeProvider>
    </Provider>
  )

  // Never block first paint on local Ollama / FreeLLMAPI probes (Netlify can hang 20s+).
  if (import.meta.env.DEV || import.meta.env.VITE_OLLAMA_ENABLED === '1' || import.meta.env.VITE_OLLAMA_ENABLED === 'true') {
    void syncOllamaFromLocal().catch(() => {})
  }

  if (import.meta.env.DEV) {
    void syncFreeLLMAPIFromLocal().catch(() => {})
  }
}

boot().catch((e) => {
  console.error('[Raj] fatal boot error:', e)
  const root = document.getElementById('root')
  if (root) {
    root.innerHTML =
      '<div style="color:#e0f2fe;font-family:system-ui;padding:24px;text-align:center">Raj failed to start. Pull down to refresh or clear site data in browser settings.</div>'
  }
})
