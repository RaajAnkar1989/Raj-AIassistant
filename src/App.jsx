import React, { lazy, Suspense, useEffect, useState } from 'react'
import { Box, CssBaseline } from '@mui/material'
import { migrateVoiceSettings } from './utils/voiceSettings'
import { migrateBrainSettings, getBrainProvider } from './constants/aiProviders'
import { clearQuotaExceededCache } from './utils/openaiErrors'
import { getVoiceBackend } from './constants/elevenlabsAgent'

const AssistantShell = lazy(() => import('./components/AssistantShell'))
const FreeAssistantHome = lazy(() => import('./components/FreeAssistantHome'))

const App = () => {
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
      <Suspense
        fallback={
          <Box
            sx={{
              minHeight: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#22d3ee',
              letterSpacing: 3,
              fontSize: '0.85rem',
            }}
          >
            Loading Raj…
          </Box>
        }
      >
        <VoiceUI key={backend} />
      </Suspense>
    </Box>
  )
}

export default App
