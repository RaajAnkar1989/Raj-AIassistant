import { DEFAULT_FREE_VOICE } from '../constants/freeVoices'
import { getVoiceBackend } from '../constants/elevenlabsStorage'
import { isMobileDevice } from './device'

const STORAGE_KEY = 'voice_pro_settings'
const LEGACY_VOICE_KEY = 'voice_settings'

export const DEFAULT_VOICE_PRO = {
  wakeWordEnabled: true,
  wakeWord: 'jarvis',
  pushToTalk: false,
  pushToTalkKey: 'Space',
  sttEngine: 'web-speech',
  ttsEngine: 'auto',
  azure: { key: '', region: '', voiceName: DEFAULT_FREE_VOICE, style: 'chat' },
  elevenLabs: { key: '', voiceId: '21m00Tcm4TlvDq8ikWAM' },
  voiceName: 'nova',
  inputDeviceId: '',
  outputDeviceId: '',
}

export const DEFAULT_VOICE_UI = {
  language: 'en-IN',
  rate: 1.14,
  pitch: 1,
  volume: 1,
  autoSpeak: true,
}

export function hasOpenAiKey() {
  try {
    const ai = JSON.parse(localStorage.getItem('ai_pro_settings') || '{}')
    if (ai.apiKey?.trim()) return true
  } catch {}
  return Boolean(localStorage.getItem('openai_api_key')?.trim())
}

export function hasAzureKeys(pro = loadVoicePro()) {
  return Boolean(pro.azure?.key?.trim() && pro.azure?.region?.trim())
}

export function hasElevenLabsKey(pro = loadVoicePro()) {
  return Boolean(pro.elevenLabs?.key?.trim())
}

/** Best engine that will actually work right now */
export function resolveWorkingEngine(requested, pro) {
  const settings = pro || loadVoicePro()
  const want = requested || settings.ttsEngine || 'auto'

  const tryEngine = (engine) => {
    if (getVoiceBackend() === 'free' && engine === 'openai') return null
    if (engine === 'openai' && hasOpenAiKey()) return 'openai'
    if (engine === 'azure' && hasAzureKeys(settings)) return 'azure'
    if (engine === 'elevenlabs' && hasElevenLabsKey(settings)) return 'elevenlabs'
    if (engine === 'chatterbox' && import.meta.env.DEV) return 'chatterbox'
    if (engine === 'edge') return 'edge'
    if (engine === 'web-speech') return 'web-speech'
    return null
  }

  if (want !== 'auto') {
    const resolved = tryEngine(want)
    if (resolved) return resolved
  }

  if (want === 'auto' && import.meta.env.DEV) {
    return tryEngine('chatterbox') || tryEngine('edge') || 'web-speech'
  }

  if (want === 'auto' && !import.meta.env.DEV) {
    return tryEngine('edge') || 'web-speech'
  }

  if (want === 'auto' && isMobileDevice()) {
    return tryEngine('edge') || tryEngine('chatterbox') || 'web-speech'
  }

  return (
    tryEngine('chatterbox') ||
    tryEngine('edge') ||
    tryEngine('web-speech') ||
    (getVoiceBackend() === 'free' ? null : tryEngine('openai')) ||
    tryEngine('azure') ||
    'web-speech'
  )
}

export function loadVoicePro() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_VOICE_PRO }
    const parsed = JSON.parse(raw)
    return {
      ...DEFAULT_VOICE_PRO,
      ...parsed,
      azure: { ...DEFAULT_VOICE_PRO.azure, ...parsed.azure },
      elevenLabs: { ...DEFAULT_VOICE_PRO.elevenLabs, ...parsed.elevenLabs },
    }
  } catch {
    return { ...DEFAULT_VOICE_PRO }
  }
}

export function loadVoiceUi() {
  try {
    const raw = localStorage.getItem(LEGACY_VOICE_KEY)
    if (raw) return { ...DEFAULT_VOICE_UI, ...JSON.parse(raw) }
  } catch {}
  return { ...DEFAULT_VOICE_UI }
}

export function saveVoicePro(pro) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pro))
}

export function saveVoiceUi(ui) {
  localStorage.setItem(LEGACY_VOICE_KEY, JSON.stringify(ui))
}

/** One-time migration: broken edge default outside dev */
export function migrateVoiceSettings() {
  const pro = loadVoicePro()
  let changed = false

  if (import.meta.env.DEV && getVoiceBackend() === 'free') {
    if (!pro.ttsEngine || pro.ttsEngine === 'auto' || pro.ttsEngine === 'edge' || pro.ttsEngine === 'web-speech') {
      pro.ttsEngine = 'chatterbox'
      changed = true
    }
  }

  if (pro.ttsEngine === 'chatterbox' && !import.meta.env.DEV) {
    pro.ttsEngine = 'edge'
    changed = true
  }

  if (pro.ttsEngine === 'edge' && isMobileDevice() && import.meta.env.DEV) {
    pro.ttsEngine = 'chatterbox'
    changed = true
  }

  if (pro.azure?.voiceName === 'en-IN-NeerjaNeural' || pro.azure?.voiceName === 'en-US-JennyNeural') {
    pro.azure = { ...pro.azure, voiceName: DEFAULT_FREE_VOICE }
    changed = true
  }

  if (getVoiceBackend() === 'free' && pro.ttsEngine === 'openai') {
    pro.ttsEngine = 'web-speech'
    changed = true
  }

  if (pro.voiceName && !/Neural|Multilingual/i.test(pro.voiceName)) {
    const engine = resolveWorkingEngine(pro.ttsEngine, pro)
    if (engine === 'openai' && !['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].includes(pro.voiceName)) {
      pro.voiceName = 'nova'
      changed = true
    }
    if ((engine === 'edge' || engine === 'azure') && pro.azure?.voiceName) {
      pro.voiceName = pro.azure.voiceName
    }
  }

  if (!pro.azure?.voiceName) {
    pro.azure = { ...pro.azure, voiceName: DEFAULT_FREE_VOICE }
    changed = true
  }

  if (pro.wakeWord === 'hey raj' || pro.wakeWord === 'hey Raj') {
    pro.wakeWord = 'jarvis'
    changed = true
  }
  if (pro.wakeWordEnabled === false && pro.wakeWord === 'hey raj') {
    pro.wakeWordEnabled = true
    changed = true
  }

  if (changed) saveVoicePro(pro)
  return pro
}

export function getTtsOptions(overrides = {}) {
  const pro = migrateVoiceSettings()
  const ui = loadVoiceUi()
  const engine = resolveWorkingEngine(overrides.engine || pro.ttsEngine, pro)

  return {
    engine,
    voiceName:
      overrides.voiceName ||
      (engine === 'openai' ? pro.voiceName || 'nova' : undefined),
    webSpeechVoiceName:
      overrides.webSpeechVoiceName ||
      (engine === 'web-speech' && pro.voiceName ? pro.voiceName : undefined),
    azureVoiceName: overrides.azureVoiceName || pro.azure?.voiceName || DEFAULT_FREE_VOICE,
    key: overrides.key || pro.azure?.key,
    region: overrides.region || pro.azure?.region,
    style: overrides.style || pro.azure?.style || 'chat',
    elevenLabsKey: overrides.elevenLabsKey || pro.elevenLabs?.key,
    elevenLabsVoiceId: overrides.elevenLabsVoiceId || pro.elevenLabs?.voiceId,
    lang: overrides.lang || ui.language || 'en-IN',
    rate: overrides.rate ?? ui.rate,
    pitch: overrides.pitch ?? ui.pitch,
    volume: overrides.volume ?? ui.volume,
  }
}
