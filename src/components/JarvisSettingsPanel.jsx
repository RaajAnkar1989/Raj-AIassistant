import React, { useState, useEffect } from 'react'
import {
  Drawer, Box, Typography, TextField, Button, IconButton, Divider, Slider, Switch,
  FormControlLabel, Chip, CircularProgress, MenuItem, Select, FormControl, InputLabel,
} from '@mui/material'
import { Close, Key, Link as LinkIcon, CheckCircle, ErrorOutline } from '@mui/icons-material'
import { useDispatch, useSelector } from 'react-redux'
import { setVoiceSettings } from '../store/slices/voiceSlice'
import {
  connectGoogle,
  getGoogleConnectionStatus,
  getOAuthJavaScriptOrigin,
  getOAuthOriginsToRegister,
  isGoogleConfigured,
  testGoogleIntegrations,
} from '../services/googleIntegration'
import {
  ELEVENLABS_AGENT_ID,
  getElevenLabsAgentId,
  getElevenLabsPromptSource,
  isPromptOverrideEnabled,
  setElevenLabsAgentId,
  setPromptOverrideEnabled,
  setUserSystemPromptOverride,
  getPreferredConnectionType,
  setPreferredConnectionType,
  getVoiceBackend,
  setVoiceBackend as persistVoiceBackend,
} from '../constants/elevenlabsAgent'
import {
  AI_PROVIDERS,
  getBrainModel,
  getBrainProvider,
  getProviderApiKey,
  hasBrainReady,
  setBrainModel,
  setBrainProvider,
  setProviderApiKey,
  sanitizeApiKey,
} from '../constants/aiProviders'
import { clearBrainHistory } from '../services/aiBrainService'
import { clearRajSession } from '../services/actionRouter'
import { syncFreeLLMAPIFromLocal } from '../services/freellmapiSync'
import { clearQuotaExceededCache, isQuotaExceededCached } from '../utils/openaiErrors'
import { DEFAULT_FREE_VOICE, FREE_NEURAL_VOICES } from '../constants/freeVoices'
import { loadVoicePro, saveVoicePro } from '../utils/voiceSettings'
import toast from 'react-hot-toast'

const JarvisSettingsPanel = ({ open, onClose }) => {
  const dispatch = useDispatch()
  const voiceSettings = useSelector((s) => s.voice.settings)
  const [elevenKey, setElevenKey] = useState('')
  const [agentId, setAgentId] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [promptSource, setPromptSource] = useState('elevenlabs_dashboard')
  const [usePromptOverride, setUsePromptOverride] = useState(false)
  const [connectionType, setConnectionType] = useState('websocket')
  const [voiceBackend, setVoiceBackendChoice] = useState('free')
  const [brainProvider, setBrainProviderChoice] = useState('freellmapi')
  const [brainModel, setBrainModelChoice] = useState('auto')
  const [brainApiKey, setBrainApiKey] = useState('')
  const [googleId, setGoogleId] = useState('')
  const [googleStatus, setGoogleStatus] = useState({ configured: false, connected: false })
  const [connecting, setConnecting] = useState(false)
  const [testingGoogle, setTestingGoogle] = useState(false)
  const [testingBrain, setTestingBrain] = useState(false)
  const [freellmLinked, setFreellmLinked] = useState(null)
  const [oauthOrigins, setOauthOrigins] = useState([])
  const [ttsEngine, setTtsEngine] = useState('auto')
  const [neuralVoice, setNeuralVoice] = useState(DEFAULT_FREE_VOICE)

  const refreshGoogleStatus = () => setGoogleStatus(getGoogleConnectionStatus())

  useEffect(() => {
    if (!open) return
    setElevenKey(localStorage.getItem('elevenlabs_api_key') || '')
    setAgentId(getElevenLabsAgentId())
    setSystemPrompt(localStorage.getItem('elevenlabs_system_prompt') || '')
    setUsePromptOverride(isPromptOverrideEnabled())
    setConnectionType(getPreferredConnectionType())
    setVoiceBackendChoice(getVoiceBackend())
    setBrainProviderChoice(getBrainProvider())
    setBrainModelChoice(getBrainModel())
    setBrainApiKey(getProviderApiKey(getBrainProvider()))
    setPromptSource(getElevenLabsPromptSource())
    setGoogleId(localStorage.getItem('gmail_client_id') || '')
    refreshGoogleStatus()
    setOauthOrigins(getOAuthOriginsToRegister())
    const pro = loadVoicePro()
    setTtsEngine(pro.ttsEngine || 'auto')
    setNeuralVoice(pro.azure?.voiceName || DEFAULT_FREE_VOICE)

    if (getBrainProvider() === 'freellmapi') {
      syncFreeLLMAPIFromLocal()
        .then(({ apiKey, providerKeyCount }) => {
          setBrainApiKey(apiKey)
          setFreellmLinked({ providerKeyCount })
        })
        .catch(() => setFreellmLinked(null))
    } else {
      setFreellmLinked(null)
    }
  }, [open])

  const copyOAuthOrigin = async () => {
    const origins = getOAuthOriginsToRegister()
    const text = origins.join('\n')
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Origins copied — paste each into Google Cloud Console')
    } catch {
      toast.error(`Copy manually:\n${text}`)
    }
  }

  const handleTestBrain = async () => {
    if (brainProvider === 'keyword') {
      toast.success('Basic mode works without a key. Try: "open WhatsApp" or "what\'s the weather".')
      return
    }

    setTestingBrain(true)
    try {
      if (brainProvider === 'freellmapi') {
        const linked = await syncFreeLLMAPIFromLocal({ force: true })
        setBrainApiKey(linked.apiKey)
        setFreellmLinked({ providerKeyCount: linked.providerKeyCount })
        if (!linked.providerKeyCount) {
          toast.error('FreeLLMAPI linked, but no provider keys yet. Add keys at http://127.0.0.1:3011 or localhost:5173/keys')
          return
        }
      } else if (!brainApiKey.trim()) {
        toast.error('Paste your API key first.')
        return
      }

      setBrainProvider(brainProvider)
      setBrainModel(brainModel)
      setProviderApiKey(brainProvider, sanitizeApiKey(brainApiKey))
      if (brainProvider !== 'openai') clearQuotaExceededCache()
      clearBrainHistory()

      const { default: aiBrainService } = await import('../services/aiBrainService')
      const reply = await aiBrainService.testBrain()
      toast.success(`Brain connected (${AI_PROVIDERS[brainProvider]?.label}): ${String(reply).slice(0, 100)}`, {
        duration: 10000,
      })
      window.dispatchEvent(new CustomEvent('raj-brain-settings-change'))
    } catch (e) {
      toast.error(e?.message || 'Brain test failed', { duration: 12000 })
    } finally {
      setTestingBrain(false)
    }
  }

  const save = () => {
    localStorage.setItem('elevenlabs_api_key', elevenKey.trim())
    setElevenLabsAgentId(agentId.trim() || ELEVENLABS_AGENT_ID)
    setUserSystemPromptOverride(systemPrompt)
    setPromptOverrideEnabled(usePromptOverride)
    setPreferredConnectionType(connectionType)
    persistVoiceBackend(voiceBackend)
    try {
      const pro = loadVoicePro()
      if (voiceBackend === 'free') {
        pro.ttsEngine = ttsEngine || pro.ttsEngine || 'auto'
        pro.azure = { ...pro.azure, voiceName: neuralVoice || pro.azure?.voiceName || DEFAULT_FREE_VOICE }
      }
      saveVoicePro(pro)
    } catch {}
    setBrainProvider(brainProvider)
    setBrainModel(brainModel)
    if (brainProvider !== 'keyword') {
      setProviderApiKey(brainProvider, sanitizeApiKey(brainApiKey))
    }
    if (brainProvider !== 'openai') {
      clearQuotaExceededCache()
    } else if (brainApiKey.trim()) {
      clearQuotaExceededCache()
    }
    setPromptSource(getElevenLabsPromptSource())
    localStorage.setItem('gmail_client_id', googleId.trim())
    refreshGoogleStatus()
    window.dispatchEvent(new CustomEvent('raj-voice-backend-change'))
    window.dispatchEvent(new CustomEvent('raj-brain-settings-change'))
    toast.success(voiceBackend === 'free' ? 'Saved — switching to Free voice mode' : 'Saved — switching to ElevenLabs')
    onClose()
  }

  const handleTestGoogle = async () => {
    if (!googleStatus.connected) {
      toast.error('Connect Google first')
      return
    }
    setTestingGoogle(true)
    try {
      const { inbox, calendar } = await testGoogleIntegrations()
      toast.success('Gmail & Calendar OK', { duration: 5000 })
      console.info('[Raj] Gmail test:', inbox)
      console.info('[Raj] Calendar test:', calendar)
    } catch (e) {
      toast.error(e?.message || 'Gmail/Calendar test failed', { duration: 8000 })
    } finally {
      setTestingGoogle(false)
    }
  }

  const handleConnectGoogle = async () => {
    if (!googleId.trim() && !isGoogleConfigured()) {
      toast.error('Save your Google Client ID first')
      return
    }
    if (googleId.trim()) localStorage.setItem('gmail_client_id', googleId.trim())
    setConnecting(true)
    try {
      await connectGoogle()
      refreshGoogleStatus()
      toast.success('Gmail & Calendar connected')
    } catch (e) {
      toast.error(e?.message || 'Google connect failed')
    } finally {
      setConnecting(false)
    }
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 380 },
          bgcolor: 'rgba(8, 14, 28, 0.98)',
          borderLeft: '1px solid rgba(34, 211, 238, 0.2)',
        },
      }}
    >
      <Box sx={{ p: 3, pb: 6 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ color: '#e0f2fe', fontWeight: 600, letterSpacing: 2 }}>
            CONFIG
          </Typography>
          <IconButton onClick={onClose} sx={{ color: '#64748b' }}>
            <Close />
          </IconButton>
        </Box>

        <Typography variant="caption" sx={{ color: '#22d3ee', mb: 1, display: 'block' }}>
          VOICE BACKEND
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Button
            size="small"
            variant={voiceBackend === 'free' ? 'contained' : 'outlined'}
            onClick={() => setVoiceBackendChoice('free')}
            sx={
              voiceBackend === 'free'
                ? { bgcolor: '#0369a1', fontSize: '0.75rem' }
                : { color: '#94a3b8', borderColor: '#334155', fontSize: '0.75rem' }
            }
          >
            Free (no quota)
          </Button>
          <Button
            size="small"
            variant={voiceBackend === 'elevenlabs' ? 'contained' : 'outlined'}
            onClick={() => setVoiceBackendChoice('elevenlabs')}
            sx={
              voiceBackend === 'elevenlabs'
                ? { bgcolor: '#0369a1', fontSize: '0.75rem' }
                : { color: '#94a3b8', borderColor: '#334155', fontSize: '0.75rem' }
            }
          >
            ElevenLabs
          </Button>
        </Box>
        <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 2, lineHeight: 1.45 }}>
          <strong>Free</strong> = local neural voice + Gemini/Groq brain (free tiers). No payment needed for testing.
        </Typography>

        {voiceBackend === 'free' && (
          <Box sx={{ mb: 2 }}>
            <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
              <InputLabel sx={{ color: '#64748b' }}>Speech engine</InputLabel>
              <Select
                value={ttsEngine}
                label="Speech engine"
                onChange={(e) => setTtsEngine(e.target.value)}
                sx={{ color: '#e2e8f0', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#1e3a5f' } }}
              >
                <MenuItem value="auto">Auto (Chatterbox → Edge neural)</MenuItem>
                <MenuItem value="chatterbox">Chatterbox (local clone voice)</MenuItem>
                <MenuItem value="edge">Edge neural (fast)</MenuItem>
              </Select>
            </FormControl>
            {(ttsEngine === 'edge' || ttsEngine === 'auto') && (
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: '#64748b' }}>Voice</InputLabel>
                <Select
                  value={neuralVoice}
                  label="Voice"
                  onChange={(e) => setNeuralVoice(e.target.value)}
                  sx={{ color: '#e2e8f0', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#1e3a5f' } }}
                >
                  {FREE_NEURAL_VOICES.map((v) => (
                    <MenuItem key={v.id} value={v.id}>
                      {v.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>
        )}

        <Typography variant="caption" sx={{ color: '#22d3ee', mb: 1, display: 'block' }}>
          AI BRAIN (pick a free provider)
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
          <Chip
            size="small"
            icon={hasBrainReady() ? <CheckCircle /> : <ErrorOutline />}
            label={
              hasBrainReady()
                ? `${AI_PROVIDERS[brainProvider]?.label || 'Brain'} · ${brainModel}`
                : 'Not configured'
            }
            sx={{
              bgcolor: hasBrainReady() ? 'rgba(34,197,94,0.15)' : 'rgba(100,116,139,0.2)',
              color: hasBrainReady() ? '#4ade80' : '#94a3b8',
            }}
          />
          {brainProvider === 'openai' && isQuotaExceededCached() && (
            <Chip size="small" label="OpenAI quota used up" sx={{ bgcolor: 'rgba(251,191,36,0.15)', color: '#fbbf24' }} />
          )}
        </Box>

        <FormControl fullWidth size="small" sx={{ mb: 1 }}>
          <InputLabel sx={{ color: '#64748b' }}>Provider</InputLabel>
          <Select
            value={brainProvider}
            label="Provider"
            onChange={(e) => {
              const p = e.target.value
              setBrainProviderChoice(p)
              setBrainModelChoice(AI_PROVIDERS[p]?.defaultModel || '')
              setBrainApiKey(getProviderApiKey(p))
            }}
            sx={{ color: '#e2e8f0', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#1e3a5f' } }}
          >
            {Object.values(AI_PROVIDERS).map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.label} {p.free ? '· free' : '· paid'}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {AI_PROVIDERS[brainProvider]?.subtitle && (
          <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 1, lineHeight: 1.45 }}>
            {AI_PROVIDERS[brainProvider].subtitle}
          </Typography>
        )}

        {AI_PROVIDERS[brainProvider]?.keyUrl && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<LinkIcon />}
            href={AI_PROVIDERS[brainProvider].keyUrl}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ mb: 1.5, color: '#22d3ee', borderColor: '#1e3a5f', textTransform: 'none' }}
          >
            {AI_PROVIDERS[brainProvider].signupLabel}
          </Button>
        )}

        {brainProvider === 'freellmapi' ? (
          <Box sx={{ mb: 1 }}>
            <TextField
              fullWidth
              size="small"
              type="password"
              label="FreeLLMAPI unified key (auto-linked)"
              value={brainApiKey}
              InputProps={{ readOnly: true }}
              sx={{ mb: 1, '& .MuiOutlinedInput-root': { color: '#e2e8f0', '& fieldset': { borderColor: '#1e3a5f' } } }}
            />
            <Typography variant="caption" sx={{ color: freellmLinked ? '#4ade80' : '#64748b', display: 'block', lineHeight: 1.45 }}>
              {freellmLinked
                ? `Linked from FreeLLMAPI · ${freellmLinked.providerKeyCount} provider key(s) loaded`
                : 'Linking to FreeLLMAPI… add keys at localhost:5173/keys or http://127.0.0.1:3011'}
            </Typography>
          </Box>
        ) : brainProvider !== 'keyword' ? (
          <TextField
            fullWidth
            size="small"
            type="password"
            placeholder={`${AI_PROVIDERS[brainProvider]?.label} API key`}
            value={brainApiKey}
            onChange={(e) => setBrainApiKey(sanitizeApiKey(e.target.value))}
            sx={{ mb: 1, '& .MuiOutlinedInput-root': { color: '#e2e8f0', '& fieldset': { borderColor: '#1e3a5f' } } }}
          />
        ) : null}

        {brainProvider !== 'keyword' && (
          <Button
            size="small"
            variant="outlined"
            disabled={testingBrain}
            onClick={handleTestBrain}
            sx={{ mb: 1, color: '#22d3ee', borderColor: '#1e3a5f', textTransform: 'none' }}
          >
            {testingBrain ? 'Testing brain…' : `Test ${AI_PROVIDERS[brainProvider]?.label} connection`}
          </Button>
        )}

        <Typography variant="caption" sx={{ color: '#fbbf24', display: 'block', mb: 1, lineHeight: 1.45 }}>
          {brainProvider === 'freellmapi'
            ? 'Provider keys pasted in FreeLLMAPI (localhost:5173/keys) are used automatically — no need to copy them here.'
            : 'Enter the key on each device (iPhone and Mac separately). In Google AI Studio set key restrictions to None. Model: Flash-Lite has the best free quota.'}
        </Typography>

        {brainProvider !== 'keyword' && (
          <FormControl fullWidth size="small" sx={{ mb: 1 }}>
            <InputLabel sx={{ color: '#64748b' }}>Model</InputLabel>
            <Select
              value={brainModel}
              label="Model"
              onChange={(e) => setBrainModelChoice(e.target.value)}
              sx={{ color: '#e2e8f0', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#1e3a5f' } }}
            >
              {(AI_PROVIDERS[brainProvider]?.models || []).map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <Button
          size="small"
          variant="text"
          onClick={() => {
            clearBrainHistory()
            clearRajSession()
            toast.success('Conversation & action memory cleared')
          }}
          sx={{ mb: 2, color: '#64748b', textTransform: 'none' }}
        >
          Clear chat memory
        </Button>

        <Typography variant="caption" sx={{ color: '#64748b', mb: 1, display: 'block' }}>
          Free mode uses your speech engine above (Chatterbox or Edge neural). ElevenLabs key below is only for ElevenLabs backend.
        </Typography>

        <Typography variant="caption" sx={{ color: '#64748b', mb: 1, display: 'block' }}>
          ElevenLabs (only if backend = ElevenLabs)
        </Typography>
        <TextField
          fullWidth
          size="small"
          type="password"
          placeholder="API key (if agent is private)"
          value={elevenKey}
          onChange={(e) => setElevenKey(e.target.value)}
          sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: '#e2e8f0', '& fieldset': { borderColor: '#1e3a5f' } } }}
        />

        <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 1 }}>
          Voice connection
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Button
            size="small"
            variant={connectionType === 'websocket' ? 'contained' : 'outlined'}
            onClick={() => setConnectionType('websocket')}
            sx={
              connectionType === 'websocket'
                ? { bgcolor: '#0369a1', fontSize: '0.7rem' }
                : { color: '#94a3b8', borderColor: '#334155', fontSize: '0.7rem' }
            }
          >
            Stable (WebSocket)
          </Button>
          <Button
            size="small"
            variant={connectionType === 'webrtc' ? 'contained' : 'outlined'}
            onClick={() => setConnectionType('webrtc')}
            sx={
              connectionType === 'webrtc'
                ? { bgcolor: '#0369a1', fontSize: '0.7rem' }
                : { color: '#94a3b8', borderColor: '#334155', fontSize: '0.7rem' }
            }
          >
            Low latency (WebRTC)
          </Button>
        </Box>
        <Typography variant="caption" sx={{ color: '#fbbf24', display: 'block', mb: 2, lineHeight: 1.4 }}>
          Use Stable if you see LiveKit disconnected errors. Save, refresh, then start a new session.
        </Typography>

        <TextField
          fullWidth
          size="small"
          placeholder={`Agent ID (default ${ELEVENLABS_AGENT_ID})`}
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: '#e2e8f0', '& fieldset': { borderColor: '#1e3a5f' } } }}
        />

        <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 1, lineHeight: 1.45 }}>
          System prompt in use:{' '}
          <strong style={{ color: '#94a3b8' }}>
            {promptSource === 'app_settings'
              ? 'Raj Settings (your pasted prompt)'
              : promptSource === 'app_builtin'
                ? 'App built-in'
                : 'ElevenLabs published version only'}
          </strong>
        </Typography>

        <FormControlLabel
          sx={{ mb: 1, ml: 0 }}
          control={
            <Switch
              checked={usePromptOverride}
              onChange={(e) => setUsePromptOverride(e.target.checked)}
              sx={{ '& .Mui-checked': { color: '#22d3ee' } }}
            />
          }
          label={
            <Typography variant="body2" sx={{ color: '#94a3b8' }}>
              Override ElevenLabs prompt from box below (off = use dashboard prompt)
            </Typography>
          }
        />
        <TextField
          fullWidth
          multiline
          minRows={3}
          maxRows={8}
          size="small"
          placeholder="Optional — only used if override switch is ON"
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          disabled={!usePromptOverride}
          sx={{ mb: 1, '& .MuiOutlinedInput-root': { color: '#e2e8f0', '& fieldset': { borderColor: '#1e3a5f' } } }}
        />
        <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 2, lineHeight: 1.45 }}>
          Leave override OFF for the new agent to work. Enable only if you turned on prompt override in ElevenLabs Security.
        </Typography>

        <Divider sx={{ borderColor: 'rgba(34,211,238,0.15)', my: 2 }} />

        <Typography variant="caption" sx={{ color: '#22d3ee', mb: 1, display: 'block' }}>
          GOOGLE — GMAIL & CALENDAR
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b', mb: 2, fontSize: '0.8rem' }}>
          Powers voice commands: read inbox, send email, read schedule, create events (like the Jarvis demo).
        </Typography>

        <TextField
          fullWidth
          size="small"
          placeholder="Google OAuth Client ID"
          value={googleId}
          onChange={(e) => setGoogleId(e.target.value)}
          sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: '#e2e8f0', '& fieldset': { borderColor: '#1e3a5f' } } }}
        />

        <Box
          sx={{
            mb: 2,
            p: 1.5,
            borderRadius: 1,
            border: '1px solid rgba(251,191,36,0.35)',
            bgcolor: 'rgba(251,191,36,0.08)',
          }}
        >
          <Typography variant="caption" sx={{ color: '#fbbf24', display: 'block', mb: 0.5 }}>
            Authorized JavaScript origins (add all of these in Google Cloud)
          </Typography>
          {(oauthOrigins.length ? oauthOrigins : [getOAuthJavaScriptOrigin() || 'https://localhost:3002']).map((origin) => (
            <Typography
              key={origin}
              variant="body2"
              sx={{ color: '#e2e8f0', fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all', mb: 0.5 }}
            >
              {origin}
            </Typography>
          ))}
          <Button
            size="small"
            onClick={copyOAuthOrigin}
            sx={{ mt: 1, color: '#fbbf24', borderColor: 'rgba(251,191,36,0.5)' }}
            variant="outlined"
          >
            Copy origins
          </Button>
          <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 1, lineHeight: 1.4 }}>
            Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID (Web) → Authorized JavaScript origins.
            Use <strong>https</strong> (not http) if Raj opens at https://localhost:3002. On iPhone, also add your network URL (e.g. https://192.168.x.x:3002).
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Chip
            size="small"
            icon={googleStatus.connected ? <CheckCircle /> : <ErrorOutline />}
            label={googleStatus.connected ? 'Connected' : 'Not connected'}
            sx={{
              bgcolor: googleStatus.connected ? 'rgba(34,197,94,0.15)' : 'rgba(100,116,139,0.2)',
              color: googleStatus.connected ? '#4ade80' : '#94a3b8',
            }}
          />
          <Chip size="small" label="Gmail" sx={{ bgcolor: 'rgba(34,211,238,0.1)', color: '#7dd3fc' }} />
          <Chip size="small" label="Calendar" sx={{ bgcolor: 'rgba(34,211,238,0.1)', color: '#7dd3fc' }} />
        </Box>

        <Button
          fullWidth
          variant="outlined"
          startIcon={connecting ? <CircularProgress size={18} /> : <LinkIcon />}
          onClick={handleConnectGoogle}
          disabled={connecting || testingGoogle}
          sx={{ mb: 1, borderColor: '#22d3ee', color: '#22d3ee' }}
        >
          {connecting ? 'Connecting…' : 'Connect Google'}
        </Button>

        <Button
          fullWidth
          variant="outlined"
          onClick={handleTestGoogle}
          disabled={!googleStatus.connected || connecting || testingGoogle}
          sx={{ mb: 2, borderColor: '#64748b', color: '#94a3b8' }}
        >
          {testingGoogle ? 'Testing Gmail & Calendar…' : 'Test Gmail & Calendar'}
        </Button>

        <Typography variant="caption" sx={{ color: '#22d3ee', display: 'block', mb: 2, lineHeight: 1.45 }}>
          Connect Google here before voice chat. OAuth popups often fail during a live call.
        </Typography>

        <Typography variant="caption" sx={{ color: '#475569', display: 'block', mb: 1, lineHeight: 1.5 }}>
          In Cloud Console → APIs & Services → Library: enable <strong>Gmail API</strong>, <strong>Google Calendar API</strong>, and <strong>People API</strong> (for voice contact lookup).
          After enabling People API, tap <strong>Connect Google</strong> again so Raj can find wife, Saritha, etc. from your Google contacts.
        </Typography>
        <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 3, lineHeight: 1.4 }}>
          If Raj says it cannot access email after Google connect, the agent dashboard tools/prompt need updating — not your Google login.
        </Typography>

        <Divider sx={{ borderColor: 'rgba(34,211,238,0.15)', my: 2 }} />

        <Typography variant="body2" sx={{ color: '#94a3b8', mb: 1 }}>Volume</Typography>
        <Slider
          value={voiceSettings.volume}
          min={0}
          max={1}
          step={0.05}
          onChange={(_, v) => dispatch(setVoiceSettings({ volume: v }))}
          sx={{ color: '#22d3ee', mb: 2 }}
        />
        <FormControlLabel
          control={
            <Switch
              checked={voiceSettings.autoSpeak !== false}
              onChange={(e) => dispatch(setVoiceSettings({ autoSpeak: e.target.checked }))}
            />
          }
          label={<Typography variant="body2" sx={{ color: '#94a3b8' }}>Voice responses</Typography>}
        />

        <Button
          fullWidth
          variant="contained"
          startIcon={<Key />}
          onClick={save}
          sx={{ mt: 3, py: 1.5, background: 'linear-gradient(90deg, #0369a1, #22d3ee)' }}
        >
          Save settings
        </Button>
      </Box>
    </Drawer>
  )
}

export default JarvisSettingsPanel
