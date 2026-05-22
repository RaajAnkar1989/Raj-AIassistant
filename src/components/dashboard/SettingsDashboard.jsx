import React, { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Slider,
  Button,
  Divider,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  InputAdornment,
} from '@mui/material'
import {
  Notifications,
  VolumeUp,
  Mic,
  Palette,
  Security,
  Language,
  Save,
  Storage,
  SmartToy,
  Settings as SettingsIcon,
  Api,
  Key,
  Link as LinkIcon,
  RecordVoiceOver,
  HeadsetMic,
  VoiceOverOff,
  AutoAwesome,
  Bolt,
} from '@mui/icons-material'
import { useSelector, useDispatch } from 'react-redux'
import { setVoiceSettings } from '../../store/slices/voiceSlice'
import { FREE_NEURAL_VOICES, DEFAULT_FREE_VOICE } from '../../constants/freeVoices'
import {
  loadVoicePro,
  saveVoicePro,
  migrateVoiceSettings,
  hasOpenAiKey,
  DEFAULT_VOICE_PRO,
} from '../../utils/voiceSettings'
import { unlockAudioPlayback } from '../../services/ttsService'
import { setPersonality } from '../../store/slices/aiSlice'
import { setSettings } from '../../store/slices/notificationSlice'
import toast from 'react-hot-toast'
import DataManagement from '../DataManagement'
// import ServiceIntegration from '../ServiceIntegration'
import SimpleGmailConnection from '../SimpleGmailConnection'

const SettingsDashboard = () => {
  const dispatch = useDispatch()
  const [dataManagementOpen, setDataManagementOpen] = useState(false)
  const [serviceIntegrationOpen, setServiceIntegrationOpen] = useState(false)
  const [integrationsDialogOpen, setIntegrationsDialogOpen] = useState(false)
  const [gmailDialogOpen, setGmailDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const [availableVoices, setAvailableVoices] = useState([])
  const [audioInputs, setAudioInputs] = useState([])
  const [audioOutputs, setAudioOutputs] = useState([])
  const [aiSettings, setAiSettings] = useState({
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4o-mini',
    temperature: 0.4,
    maxTokens: 1024,
    systemPrompt: 'You are a proactive, voice-first personal AI assistant. Provide concise, helpful answers and take actions when asked.',
    safety: {
      blockSensitive: true,
      piiRedaction: true,
    },
  })
  const [voiceProSettings, setVoiceProSettings] = useState(() => migrateVoiceSettings())

  useEffect(() => {
    saveVoicePro(voiceProSettings)
  }, [voiceProSettings])
  const [automations, setAutomations] = useState([
    // simple demo rules
    { id: 1, name: 'Morning briefing', enabled: true, trigger: '8:00 AM', action: 'Summarize today’s calendar and top 5 emails' },
  ])
  
  const voiceSettings = useSelector(state => state.voice.settings)
  const aiPersonality = useSelector(state => state.ai.personality)
  const notificationSettings = useSelector(state => state.notifications.settings)

  const handleVoiceSettingChange = (setting, value) => {
    dispatch(setVoiceSettings({ [setting]: value }))
  }

  const handlePersonalityChange = (setting, value) => {
    dispatch(setPersonality({ [setting]: value }))
    toast.success('AI personality updated')
  }

  const handleNotificationSettingChange = (setting, value) => {
    dispatch(setSettings({ [setting]: value }))
    toast.success('Notification setting updated')
  }

  useEffect(() => {
    const loadVoices = () => {
      if (window.speechSynthesis) {
        setAvailableVoices(window.speechSynthesis.getVoices() || [])
      }
    }
    loadVoices()
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices
    }

    const loadDevices = async () => {
      try {
        if (navigator.mediaDevices?.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices()
          setAudioInputs(devices.filter(d => d.kind === 'audioinput'))
          setAudioOutputs(devices.filter(d => d.kind === 'audiooutput'))
        }
      } catch {}
    }
    loadDevices()
  }, [])

  const testSpeak = async (text) => {
    try {
      await unlockAudioPlayback()
      const msg = text || "Hey! I'm Raj, your personal assistant. I'm ready to help."
      const ttsService = (await import('../../services/ttsService')).default
      const { getTtsOptions } = await import('../../utils/voiceSettings')
      const result = await ttsService.speak(msg, {
        ...getTtsOptions({
          engine: voiceProSettings.ttsEngine,
          voiceName: voiceProSettings.voiceName,
          azureVoiceName: voiceProSettings.azure?.voiceName,
          key: voiceProSettings.azure?.key,
          region: voiceProSettings.azure?.region,
          style: voiceProSettings.azure?.style,
          elevenLabsKey: voiceProSettings.elevenLabs?.key,
          elevenLabsVoiceId: voiceProSettings.elevenLabs?.voiceId,
        }),
        rate: voiceSettings.rate,
        pitch: voiceSettings.pitch,
        volume: voiceSettings.volume,
      })
      toast.success(`Voice OK (${result?.engine || 'ready'})`)
    } catch (e) {
      toast.error(e?.message || 'Could not play voice. Add OpenAI key or use Browser voice.')
    }
  }

  const saveAiSettings = () => {
    localStorage.setItem('ai_pro_settings', JSON.stringify(aiSettings))
    toast.success('AI settings saved')
  }

  const saveVoiceProSettings = () => {
    saveVoicePro(voiceProSettings)
    toast.success('Voice settings saved')
  }

  const addAutomation = () => {
    const name = `Automation ${automations.length + 1}`
    setAutomations([...automations, { id: Date.now(), name, enabled: true, trigger: 'Voice command', action: 'Custom action' }])
  }

  const renderAiTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <SmartToy color="primary" />
              <Typography variant="h6">AI Provider & Model</Typography>
            </Box>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Provider</InputLabel>
              <Select value={aiSettings.provider} label="Provider" onChange={(e) => setAiSettings({ ...aiSettings, provider: e.target.value })}>
                <MenuItem value="openai">OpenAI</MenuItem>
                <MenuItem value="azure-openai">Azure OpenAI</MenuItem>
                <MenuItem value="local">Local (custom API)</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="API Key"
              type="password"
              value={aiSettings.apiKey}
              onChange={(e) => setAiSettings({ ...aiSettings, apiKey: e.target.value })}
              placeholder="sk-..."
              sx={{ mb: 2 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><Key /></InputAdornment> }}
            />
            <TextField
              fullWidth
              label="Model"
              value={aiSettings.model}
              onChange={(e) => setAiSettings({ ...aiSettings, model: e.target.value })}
              placeholder="gpt-4o-mini"
              sx={{ mb: 2 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><Api /></InputAdornment> }}
            />
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2">Temperature: {aiSettings.temperature}</Typography>
                <Slider min={0} max={1} step={0.05} value={aiSettings.temperature} onChange={(_, v) => setAiSettings({ ...aiSettings, temperature: v })} />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2">Max Tokens: {aiSettings.maxTokens}</Typography>
                <Slider min={256} max={4096} step={128} value={aiSettings.maxTokens} onChange={(_, v) => setAiSettings({ ...aiSettings, maxTokens: v })} />
              </Grid>
            </Grid>
            <TextField
              fullWidth
              label="System Prompt"
              multiline
              rows={4}
              value={aiSettings.systemPrompt}
              onChange={(e) => setAiSettings({ ...aiSettings, systemPrompt: e.target.value })}
              sx={{ mt: 2 }}
            />
            <FormControlLabel
              control={<Switch checked={aiSettings.safety.blockSensitive} onChange={(e) => setAiSettings({ ...aiSettings, safety: { ...aiSettings.safety, blockSensitive: e.target.checked } })} />}
              label="Block sensitive content"
            />
            <FormControlLabel
              control={<Switch checked={aiSettings.safety.piiRedaction} onChange={(e) => setAiSettings({ ...aiSettings, safety: { ...aiSettings.safety, piiRedaction: e.target.checked } })} />}
              label="PII redaction"
            />
            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button variant="contained" onClick={saveAiSettings} startIcon={<Save />}>Save</Button>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <AutoAwesome color="primary" />
              <Typography variant="h6">Behavior & Style</Typography>
            </Box>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>AI Name</InputLabel>
              <Select value={aiPersonality.name} label="AI Name" onChange={(e) => handlePersonalityChange('name', e.target.value)}>
                <MenuItem value="JARVIS">JARVIS</MenuItem>
                <MenuItem value="FRIDAY">FRIDAY</MenuItem>
                <MenuItem value="EDITH">EDITH</MenuItem>
                <MenuItem value="KAREN">KAREN</MenuItem>
                <MenuItem value="Custom">Custom</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Style</InputLabel>
              <Select value={aiPersonality.style} label="Style" onChange={(e) => handlePersonalityChange('style', e.target.value)}>
                <MenuItem value="professional">Professional</MenuItem>
                <MenuItem value="casual">Casual</MenuItem>
                <MenuItem value="friendly">Friendly</MenuItem>
                <MenuItem value="formal">Formal</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Humor</InputLabel>
              <Select value={aiPersonality.humor} label="Humor" onChange={(e) => handlePersonalityChange('humor', e.target.value)}>
                <MenuItem value="none">None</MenuItem>
                <MenuItem value="subtle">Subtle</MenuItem>
                <MenuItem value="moderate">Moderate</MenuItem>
                <MenuItem value="high">High</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Response Length</InputLabel>
              <Select value={aiPersonality.responseLength} label="Response Length" onChange={(e) => handlePersonalityChange('responseLength', e.target.value)}>
                <MenuItem value="concise">Concise</MenuItem>
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="detailed">Detailed</MenuItem>
              </Select>
            </FormControl>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )

  const renderVoiceTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <RecordVoiceOver color="primary" />
              <Typography variant="h6">Voice & Wake Word</Typography>
            </Box>
            <FormControlLabel control={<Switch checked={voiceProSettings.wakeWordEnabled} onChange={(e) => setVoiceProSettings({ ...voiceProSettings, wakeWordEnabled: e.target.checked })} />} label="Enable wake word" />
            <TextField fullWidth label="Wake word" value={voiceProSettings.wakeWord} onChange={(e) => setVoiceProSettings({ ...voiceProSettings, wakeWord: e.target.value })} sx={{ mb: 2 }} />
            <FormControlLabel control={<Switch checked={voiceProSettings.pushToTalk} onChange={(e) => setVoiceProSettings({ ...voiceProSettings, pushToTalk: e.target.checked })} />} label={`Push-to-talk (${voiceProSettings.pushToTalkKey})`} />
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>STT Engine</InputLabel>
                  <Select value={voiceProSettings.sttEngine} label="STT Engine" onChange={(e) => setVoiceProSettings({ ...voiceProSettings, sttEngine: e.target.value })}>
                    <MenuItem value="web-speech">Web Speech API</MenuItem>
                    <MenuItem value="whisper">Whisper API</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>TTS Engine</InputLabel>
                  <Select value={voiceProSettings.ttsEngine} label="TTS Engine" onChange={(e) => setVoiceProSettings({ ...voiceProSettings, ttsEngine: e.target.value })}>
                    <MenuItem value="auto">Auto (best available) — recommended</MenuItem>
                    <MenuItem value="openai">OpenAI TTS (human-like, uses API key)</MenuItem>
                    <MenuItem value="azure">Azure Neural (free tier)</MenuItem>
                    <MenuItem value="chatterbox">Chatterbox (local, free — starts with npm run dev)</MenuItem>
                    <MenuItem value="edge">Edge TTS (dev only, free)</MenuItem>
                    <MenuItem value="web-speech">Browser voice (always works)</MenuItem>
                    <MenuItem value="elevenlabs">ElevenLabs</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Alert severity="info" sx={{ mt: 2 }}>
              {hasOpenAiKey()
                ? 'Auto uses your OpenAI key for natural speech. Changes apply immediately.'
                : 'Add an OpenAI API key in the AI tab for human-like voice, or pick Browser voice.'}
              {import.meta.env.DEV &&
                ' npm run dev starts Chatterbox voice + FreeLLMAPI brain automatically. Add provider keys at http://127.0.0.1:3011'}
            </Alert>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Voice</InputLabel>
              <Select
                value={
                  voiceProSettings.ttsEngine === 'edge' || voiceProSettings.ttsEngine === 'azure'
                    ? (voiceProSettings.azure?.voiceName || DEFAULT_FREE_VOICE)
                    : voiceProSettings.voiceName
                }
                label="Voice"
                onChange={(e) => {
                  const val = e.target.value
                  if (voiceProSettings.ttsEngine === 'edge' || voiceProSettings.ttsEngine === 'azure') {
                    setVoiceProSettings({
                      ...voiceProSettings,
                      voiceName: val,
                      azure: { ...voiceProSettings.azure, voiceName: val },
                    })
                  } else {
                    setVoiceProSettings({ ...voiceProSettings, voiceName: val })
                  }
                }}
              >
                {voiceProSettings.ttsEngine === 'elevenlabs' ? (
                  <MenuItem value="custom">Custom (Set ID Below)</MenuItem>
                ) : voiceProSettings.ttsEngine === 'openai' ? (
                  ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].map(v => (
                    <MenuItem key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</MenuItem>
                  ))
                ) : voiceProSettings.ttsEngine === 'edge' || voiceProSettings.ttsEngine === 'azure' ? (
                  FREE_NEURAL_VOICES.map(v => (
                    <MenuItem key={v.id} value={v.id}>{v.label}</MenuItem>
                  ))
                ) : (
                  <>
                    <MenuItem value="">Best available (auto)</MenuItem>
                    {availableVoices.map(v => (
                      <MenuItem key={v.name} value={v.name}>{v.name} ({v.lang})</MenuItem>
                    ))}
                  </>
                )}
              </Select>
            </FormControl>
            {voiceProSettings.ttsEngine === 'elevenlabs' && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>ElevenLabs Settings</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth type="password" label="ElevenLabs API Key" placeholder="Your API Key" value={voiceProSettings.elevenLabs?.key || ''} onChange={(e) => setVoiceProSettings({ ...voiceProSettings, elevenLabs: { ...voiceProSettings.elevenLabs, key: e.target.value } })} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth label="Voice ID" placeholder="21m00Tcm4TlvDq8ikWAM" value={voiceProSettings.elevenLabs?.voiceId || ''} onChange={(e) => setVoiceProSettings({ ...voiceProSettings, elevenLabs: { ...voiceProSettings.elevenLabs, voiceId: e.target.value } })} />
                  </Grid>
                </Grid>
              </Box>
            )}
            {voiceProSettings.ttsEngine === 'azure' && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Azure Neural TTS</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth label="Azure Region" placeholder="eastus" value={voiceProSettings.azure.region} onChange={(e) => setVoiceProSettings({ ...voiceProSettings, azure: { ...voiceProSettings.azure, region: e.target.value } })} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth type="password" label="Azure Key" placeholder="XXXXXXXX" value={voiceProSettings.azure.key} onChange={(e) => setVoiceProSettings({ ...voiceProSettings, azure: { ...voiceProSettings.azure, key: e.target.value } })} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth label="Neural Voice" placeholder="en-IN-NeerjaNeural" value={voiceProSettings.azure.voiceName} onChange={(e) => setVoiceProSettings({ ...voiceProSettings, azure: { ...voiceProSettings.azure, voiceName: e.target.value } })} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Style</InputLabel>
                      <Select value={voiceProSettings.azure.style} label="Style" onChange={(e) => setVoiceProSettings({ ...voiceProSettings, azure: { ...voiceProSettings.azure, style: e.target.value } })}>
                        <MenuItem value="chat">Chat</MenuItem>
                        <MenuItem value="conversational">Conversational</MenuItem>
                        <MenuItem value="newscast">Newscast</MenuItem>
                        <MenuItem value="customerservice">Customer Service</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Box>
            )}
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Mic device</InputLabel>
                  <Select value={voiceProSettings.inputDeviceId} label="Mic device" onChange={(e) => setVoiceProSettings({ ...voiceProSettings, inputDeviceId: e.target.value })}>
                    <MenuItem value="">Default</MenuItem>
                    {audioInputs.map(d => (
                      <MenuItem key={d.deviceId} value={d.deviceId}>{d.label || 'Microphone'}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Speaker device</InputLabel>
                  <Select value={voiceProSettings.outputDeviceId} label="Speaker device" onChange={(e) => setVoiceProSettings({ ...voiceProSettings, outputDeviceId: e.target.value })}>
                    <MenuItem value="">Default</MenuItem>
                    {audioOutputs.map(d => (
                      <MenuItem key={d.deviceId} value={d.deviceId}>{d.label || 'Speaker'}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button variant="contained" startIcon={<HeadsetMic />} onClick={() => testSpeak()}>
                Test Voice
              </Button>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Settings save automatically when you change them.
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Mic color="primary" />
              <Typography variant="h6">Voice Controls</Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                Speech Rate: {voiceSettings.rate}
              </Typography>
              <Slider value={voiceSettings.rate} onChange={(_, v) => handleVoiceSettingChange('rate', v)} min={0.5} max={2} step={0.1} />
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                Pitch: {voiceSettings.pitch}
              </Typography>
              <Slider value={voiceSettings.pitch} onChange={(_, v) => handleVoiceSettingChange('pitch', v)} min={0.5} max={2} step={0.1} />
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                Volume: {voiceSettings.volume}
              </Typography>
              <Slider value={voiceSettings.volume} onChange={(_, v) => handleVoiceSettingChange('volume', v)} min={0} max={1} step={0.1} />
            </Box>
            <FormControlLabel control={<Switch checked={voiceSettings.autoSpeak} onChange={(e) => handleVoiceSettingChange('autoSpeak', e.target.checked)} />} label="Auto-speak responses" />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )

  const renderIntegrationsTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <LinkIcon color="primary" />
              <Typography variant="h6">Accounts & Services</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Connect Gmail, Calendar, and messaging to sync real data across the app.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button variant="outlined" onClick={() => setGmailDialogOpen(true)}>Gmail</Button>
              <Button variant="outlined" disabled>Google Calendar</Button>
              <Button variant="outlined" disabled>Slack</Button>
              <Button variant="outlined" disabled>Microsoft Teams</Button>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Bolt color="primary" />
              <Typography variant="h6">Automations</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Create simple routines that run on a schedule or voice trigger.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Button variant="contained" onClick={addAutomation}>Add Automation</Button>
            </Box>
            {automations.map(a => (
              <Box key={a.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle2">{a.name}</Typography>
                  <FormControlLabel control={<Switch checked={a.enabled} onChange={(e) => setAutomations(automations.map(x => x.id === a.id ? { ...x, enabled: e.target.checked } : x))} />} label={a.enabled ? 'On' : 'Off'} />
                </Box>
                <Typography variant="caption" color="text.secondary">Trigger: {a.trigger}</Typography>
                <Typography variant="caption" color="text.secondary" display="block">Action: {a.action}</Typography>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )

  const renderPrivacyTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Security color="primary" />
              <Typography variant="h6">Privacy & Storage</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Your data is stored locally (offline-first). Export or manage your data anytime.
            </Typography>
            <Button variant="outlined" startIcon={<Storage />} onClick={() => setDataManagementOpen(true)}>Manage Data</Button>
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="caption">Local-only by default. Cloud sync can be added later per account settings.</Typography>
            </Alert>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Notifications color="primary" />
              <Typography variant="h6">Notifications</Typography>
            </Box>
            <FormControlLabel control={<Switch checked={notificationSettings.emailNotifications} onChange={(e) => handleNotificationSettingChange('emailNotifications', e.target.checked)} />} label="Email Notifications" />
            <FormControlLabel control={<Switch checked={notificationSettings.pushNotifications} onChange={(e) => handleNotificationSettingChange('pushNotifications', e.target.checked)} />} label="Push Notifications" />
            <FormControlLabel control={<Switch checked={notificationSettings.soundEnabled} onChange={(e) => handleNotificationSettingChange('soundEnabled', e.target.checked)} />} label="Sound Notifications" />
            <FormControlLabel control={<Switch checked={notificationSettings.desktopNotifications} onChange={(e) => handleNotificationSettingChange('desktopNotifications', e.target.checked)} />} label="Desktop Notifications" />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        Settings & Preferences
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Customize your AI assistant and configure app preferences
      </Typography>

      {/* Top-level Pro tabs */}
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab label="AI" icon={<SmartToy />} iconPosition="start" />
        <Tab label="Voice" icon={<RecordVoiceOver />} iconPosition="start" />
        <Tab label="Integrations" icon={<LinkIcon />} iconPosition="start" />
        <Tab label="Privacy" icon={<Security />} iconPosition="start" />
      </Tabs>

      {activeTab === 0 && renderAiTab()}
      {activeTab === 1 && renderVoiceTab()}
      {activeTab === 2 && renderIntegrationsTab()}
      {activeTab === 3 && renderPrivacyTab()}

      {/* Data Management Dialog */}
      <DataManagement
        open={dataManagementOpen}
        onClose={() => setDataManagementOpen(false)}
      />

      {/* Pro Integrations Dialog */}
      <Dialog open={integrationsDialogOpen} onClose={() => setIntegrationsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Integrations</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Connect accounts to enable real data sync across the app.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="subtitle1">Gmail</Typography>
                      <Typography variant="caption" color="text.secondary">Read and manage emails</Typography>
                    </Box>
                    <Button variant="outlined" size="small" onClick={() => setGmailDialogOpen(true)}>Configure</Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="subtitle1">Google Calendar</Typography>
                      <Typography variant="caption" color="text.secondary">Sync events and reminders</Typography>
                    </Box>
                    <Button variant="outlined" size="small" disabled>Coming soon</Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIntegrationsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Gmail Config Dialog (reusing existing component) */}
      <SimpleGmailConnection
        open={gmailDialogOpen}
        onClose={() => setGmailDialogOpen(false)}
        onConnectionChange={() => {}}
      />
    </Box>
  )
}

export default SettingsDashboard
