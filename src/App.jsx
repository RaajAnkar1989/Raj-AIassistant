import React, { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Box, CssBaseline } from '@mui/material'
import { migrateVoiceSettings } from './utils/voiceSettings'
import { migrateBrainSettings, getBrainProvider } from './constants/aiProviders'
import { clearQuotaExceededCache } from './utils/openaiErrors'
import { getVoiceBackend } from './constants/elevenlabsAgent'

const AssistantShell = lazy(() => import('./components/AssistantShell'))
const FreeAssistantHome = lazy(() => import('./components/FreeAssistantHome'))
const ChatApp = lazy(() => import('./components/chat/ChatApp'))

function LoadingScreen({ label = 'Loading Raj…' }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#22d3ee',
        letterSpacing: 3,
        fontSize: '0.85rem',
        bgcolor: '#050810',
      }}
    >
      {label}
    </Box>
  )
}

function VoiceHome() {
  const [backend, setBackend] = useState(() => getVoiceBackend())

  useEffect(() => {
    migrateVoiceSettings()
    migrateBrainSettings()
    if (getBrainProvider() !== 'openai') clearQuotaExceededCache()
  }, [])

  useEffect(() => {
    const refresh = () => setBackend(getVoiceBackend())
    window.addEventListener('storage', refresh)
    window.addEventListener('raj-voice-backend-change', refresh)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('raj-voice-backend-change', refresh)
    }
  }, [])

  const VoiceUI = backend === 'elevenlabs' ? AssistantShell : FreeAssistantHome

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#050810', overflow: 'hidden' }}>
      <CssBaseline />
      <Suspense fallback={<LoadingScreen />}>
        <VoiceUI key={backend} />
      </Suspense>
    </Box>
  )
}

const App = () => (
  <BrowserRouter>
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<VoiceHome />} />
        <Route path="/chat" element={<ChatApp />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
)

export default App
