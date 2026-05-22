const ENV_AGENT_ID =
  typeof import.meta !== 'undefined' ? import.meta.env?.VITE_ELEVENLABS_AGENT_ID?.trim() : ''

/** Default agent — Raaj-AI-Assistant-New on ElevenLabs */
export const ELEVENLABS_AGENT_ID = ENV_AGENT_ID || 'agent_6401ks3bv7wafb5sr6dgwqstsa98'

export const ELEVENLABS_AGENT_NAME = 'Raaj-AI-Assistant-New'

/** Previous agent; clear if still stored so the new default is used */
const LEGACY_AGENT_IDS = ['agent_4301ks387vwce90a620z5wvq9yfb']

const AGENT_ID_STORAGE_KEY = 'elevenlabs_agent_id'
const PROMPT_STORAGE_KEY = 'elevenlabs_system_prompt'
const PROMPT_OVERRIDE_ENABLED_KEY = 'elevenlabs_prompt_override_enabled'
const CONNECTION_TYPE_KEY = 'elevenlabs_connection_type'
const VOICE_BACKEND_KEY = 'raj_voice_backend'

/** elevenlabs = Conversational AI (minutes quota). free = browser STT + TTS + OpenAI. */
export function getVoiceBackend() {
  if (typeof window === 'undefined') return 'free'
  const stored = localStorage.getItem(VOICE_BACKEND_KEY)
  return stored === 'elevenlabs' ? 'elevenlabs' : 'free'
}

export function setVoiceBackend(backend) {
  if (backend === 'elevenlabs') localStorage.setItem(VOICE_BACKEND_KEY, 'elevenlabs')
  else localStorage.setItem(VOICE_BACKEND_KEY, 'free')
}

/** websocket = no LiveKit (more stable). webrtc = lower latency. */
export function getPreferredConnectionType() {
  if (typeof window === 'undefined') return 'websocket'
  const stored = localStorage.getItem(CONNECTION_TYPE_KEY)
  return stored === 'webrtc' ? 'webrtc' : 'websocket'
}

export function setPreferredConnectionType(type) {
  if (type === 'webrtc') localStorage.setItem(CONNECTION_TYPE_KEY, 'webrtc')
  else localStorage.setItem(CONNECTION_TYPE_KEY, 'websocket')
}

export function isPromptOverrideEnabled() {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(PROMPT_OVERRIDE_ENABLED_KEY) === 'true'
}

export function setPromptOverrideEnabled(enabled) {
  if (enabled) localStorage.setItem(PROMPT_OVERRIDE_ENABLED_KEY, 'true')
  else localStorage.removeItem(PROMPT_OVERRIDE_ENABLED_KEY)
}

export function getElevenLabsAgentId() {
  if (typeof window === 'undefined') return ELEVENLABS_AGENT_ID
  const stored = localStorage.getItem(AGENT_ID_STORAGE_KEY)?.trim()
  if (stored && LEGACY_AGENT_IDS.includes(stored)) {
    localStorage.removeItem(AGENT_ID_STORAGE_KEY)
    return ELEVENLABS_AGENT_ID
  }
  return stored || ELEVENLABS_AGENT_ID
}

export function setElevenLabsAgentId(agentId) {
  const id = agentId?.trim()
  if (!id || id === ELEVENLABS_AGENT_ID) localStorage.removeItem(AGENT_ID_STORAGE_KEY)
  else localStorage.setItem(AGENT_ID_STORAGE_KEY, id)
}

export function getUserSystemPromptOverride() {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(PROMPT_STORAGE_KEY)?.trim() || ''
}

export function setUserSystemPromptOverride(prompt) {
  const text = prompt?.trim()
  if (!text) localStorage.removeItem(PROMPT_STORAGE_KEY)
  else localStorage.setItem(PROMPT_STORAGE_KEY, text)
}

export function getElevenLabsPromptSource() {
  if (isPromptOverrideEnabled() && getUserSystemPromptOverride()) return 'app_settings'
  if (import.meta.env.VITE_RAJ_USE_PROMPT_OVERRIDE === 'true') return 'app_builtin'
  return 'elevenlabs_dashboard'
}
