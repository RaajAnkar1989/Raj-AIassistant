import React, { useEffect, useState } from 'react'
import {
  Box, Typography, Card, CardContent, Switch, FormControlLabel, Slider, Button,
  TextField, Select, MenuItem, FormControl, InputLabel, Alert, Grid, IconButton,
} from '@mui/material'
import { ArrowBack, HeadsetMic, SmartToy, Key } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { setVoiceSettings } from '../store/slices/voiceSlice'
import {
  saveVoicePro, migrateVoiceSettings, hasOpenAiKey,
} from '../utils/voiceSettings'
import { unlockAudioPlayback } from '../services/ttsService'
import toast from 'react-hot-toast'

const JarvisSettings = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const voiceSettings = useSelector((s) => s.voice.settings)
  const [voicePro, setVoicePro] = useState(() => migrateVoiceSettings())
  const [aiKey, setAiKey] = useState('')
  const [elevenKey, setElevenKey] = useState('')
  const [googleClientId, setGoogleClientId] = useState('')

  useEffect(() => {
    saveVoicePro(voicePro)
  }, [voicePro])

  useEffect(() => {
    try {
      const ai = JSON.parse(localStorage.getItem('ai_pro_settings') || '{}')
      if (ai.apiKey) setAiKey(ai.apiKey)
    } catch {}
    setGoogleClientId(localStorage.getItem('gmail_client_id') || '')
    setElevenKey(localStorage.getItem('elevenlabs_api_key') || '')
  }, [])

  const saveElevenKey = () => {
    localStorage.setItem('elevenlabs_api_key', elevenKey.trim())
    toast.success('ElevenLabs key saved — refresh the page')
  }

  const saveAiKey = () => {
    const trimmed = aiKey.trim()
    localStorage.setItem('openai_api_key', trimmed)
    localStorage.setItem('ai_pro_settings', JSON.stringify({ apiKey: trimmed, provider: 'openai', model: 'gpt-4o-mini' }))
    toast.success('API key saved')
  }

  const saveGoogle = () => {
    if (googleClientId.trim()) {
      localStorage.setItem('gmail_client_id', googleClientId.trim())
      toast.success('Google Client ID saved — enables calendar read-aloud')
    }
  }

  const testVoice = async () => {
    try {
      await unlockAudioPlayback()
      const tts = (await import('../services/ttsService')).default
      const { getTtsOptions } = await import('../utils/voiceSettings')
      const r = await tts.speak("Raj online. I'm ready.", getTtsOptions({ engine: voicePro.ttsEngine }))
      toast.success(`Voice OK (${r?.engine})`)
    } catch (e) {
      toast.error(e?.message || 'Voice test failed')
    }
  }

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto', p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton onClick={() => navigate('/assistant')} sx={{ color: '#94a3b8' }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Settings</Typography>
      </Box>

      <Card sx={{ mb: 2, bgcolor: '#161b22', border: '1px solid #30363d' }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>ElevenLabs (Raj voice)</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Agent: Raaj-AI-Assistant-New. Add your API key if the agent is private. Client tools on the agent
            dashboard should use names like: open_whatsapp, compose_email, read_calendar, get_weather.
          </Typography>
          <TextField
            fullWidth
            type="password"
            label="ElevenLabs API Key"
            value={elevenKey}
            onChange={(e) => setElevenKey(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Button variant="contained" onClick={saveElevenKey} sx={{ mb: 1 }}>Save ElevenLabs key</Button>
          <Alert severity="info">Refresh after saving if connection fails.</Alert>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2, bgcolor: '#161b22', border: '1px solid #30363d' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Key color="primary" />
            <Typography variant="h6">OpenAI (legacy / optional)</Typography>
          </Box>
          <TextField
            fullWidth
            type="password"
            label="API Key"
            value={aiKey}
            onChange={(e) => setAiKey(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Button variant="contained" onClick={saveAiKey}>Save key</Button>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2, bgcolor: '#161b22', border: '1px solid #30363d' }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>Google Calendar (optional)</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            OAuth Client ID so Raj can read your schedule aloud — opens Calendar app, not an in-app calendar.
          </Typography>
          <TextField
            fullWidth
            label="Google OAuth Client ID"
            value={googleClientId}
            onChange={(e) => setGoogleClientId(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Button variant="outlined" onClick={saveGoogle}>Save</Button>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2, bgcolor: '#161b22', border: '1px solid #30363d' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <SmartToy color="primary" />
            <Typography variant="h6">Voice</Typography>
          </Box>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>TTS Engine</InputLabel>
            <Select
              value={voicePro.ttsEngine || 'auto'}
              label="TTS Engine"
              onChange={(e) => setVoicePro({ ...voicePro, ttsEngine: e.target.value })}
            >
              <MenuItem value="auto">Auto (recommended)</MenuItem>
              <MenuItem value="openai">OpenAI</MenuItem>
              <MenuItem value="web-speech">Browser</MenuItem>
              <MenuItem value="azure">Azure Neural</MenuItem>
            </Select>
          </FormControl>
          {voicePro.ttsEngine === 'openai' && (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>OpenAI voice</InputLabel>
              <Select
                value={voicePro.voiceName || 'nova'}
                label="OpenAI voice"
                onChange={(e) => setVoicePro({ ...voicePro, voiceName: e.target.value })}
              >
                {['nova', 'shimmer', 'alloy', 'echo', 'fable', 'onyx'].map((v) => (
                  <MenuItem key={v} value={v}>{v}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <Alert severity="info" sx={{ mb: 2 }}>
            {hasOpenAiKey() ? 'Auto uses OpenAI for natural speech.' : 'Add API key above for human-like voice.'}
          </Alert>
          <Button variant="outlined" startIcon={<HeadsetMic />} onClick={testVoice}>Test voice</Button>
        </CardContent>
      </Card>

      <Card sx={{ bgcolor: '#161b22', border: '1px solid #30363d' }}>
        <CardContent>
          <Typography variant="body2" gutterBottom>Speech rate: {voiceSettings.rate}</Typography>
          <Slider value={voiceSettings.rate} min={0.7} max={1.3} step={0.05}
            onChange={(_, v) => dispatch(setVoiceSettings({ rate: v }))} sx={{ mb: 2 }} />
          <Typography variant="body2" gutterBottom>Volume: {voiceSettings.volume}</Typography>
          <Slider value={voiceSettings.volume} min={0} max={1} step={0.1}
            onChange={(_, v) => dispatch(setVoiceSettings({ volume: v }))} sx={{ mb: 2 }} />
          <FormControlLabel
            control={<Switch checked={voiceSettings.autoSpeak}
              onChange={(e) => dispatch(setVoiceSettings({ autoSpeak: e.target.checked }))} />}
            label="Speak responses aloud"
          />
        </CardContent>
      </Card>
    </Box>
  )
}

export default JarvisSettings
