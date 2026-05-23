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

const APP_SHELL_VERSION = '10-sw-fix'

/** Clear stale PWA caches — old service workers served deleted JS bundles (blank screen). */
async function migrateAppShell() {
  const key = 'raj_app_shell_version'
  let prev = null
  try {
    prev = localStorage.getItem(key)
  } catch {
    /* private mode */
  }
  const versionChanged = prev !== APP_SHELL_VERSION

  if ('serviceWorker' in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister()))
    } catch {
      /* ignore */
    }
  }

  if (versionChanged && 'caches' in window) {
    try {
      const names = await caches.keys()
      await Promise.all(names.map((n) => caches.delete(n)))
    } catch {
      /* ignore */
    }
  }

  if (versionChanged) {
    try {
      localStorage.setItem(key, APP_SHELL_VERSION)
    } catch {
      /* ignore */
    }
    if (prev) {
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

// Service worker disabled — stale cached index.html pointed at deleted JS (404 blank screen).
// Re-enable after users have cleared old SW, or use NetworkFirst for navigations only.

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
