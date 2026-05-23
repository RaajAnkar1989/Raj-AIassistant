import { hasBrainReady } from '../constants/aiProviders'
import { isQuotaExceededCached } from '../utils/openaiErrors'

export function isIOSDevice() {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

export function hasWebSpeechRecognition() {
  if (typeof window === 'undefined') return false
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
}

let whisperCppAvailable = null

/** Probe once per session — local whisper.cpp server on Mac dev stack */
export async function checkWhisperCppAvailable() {
  if (whisperCppAvailable !== null) return whisperCppAvailable
  try {
    const { probeWhisperCpp } = await import('../services/whisperCppService')
    const info = await probeWhisperCpp()
    whisperCppAvailable = Boolean(info.ok)
    return whisperCppAvailable
  } catch {
    whisperCppAvailable = false
    return false
  }
}

export function resetWhisperCppCache() {
  whisperCppAvailable = null
}

/** Prefer local whisper.cpp when agent stack running (Mac dev) */
export function shouldUseWhisperCppStt() {
  try {
    const pref = localStorage.getItem('jarvis_stt_engine')
    if (pref === 'webspeech') return false
    if (pref === 'whisper_cpp') return true
  } catch {}
  if (import.meta.env.VITE_WHISPER_CPP_ENABLED === '0') return false
  if (import.meta.env.VITE_WHISPER_CPP_ENABLED === '1' || import.meta.env.VITE_WHISPER_CPP_ENABLED === 'true') {
    return true
  }
  return import.meta.env.DEV
}

/** Legacy OpenAI Whisper — paid, disabled by default */
export function shouldUseWhisperStt() {
  return false
}

export async function resolveSttEngine() {
  if (shouldUseWhisperCppStt() && (await checkWhisperCppAvailable())) return 'whisper_cpp'
  if (shouldUseWhisperStt()) return 'whisper'
  if (hasWebSpeechRecognition()) return 'webspeech'
  return 'none'
}

export function getVoiceInputLabel() {
  if (shouldUseWhisperCppStt()) return 'whisper.cpp (local)'
  if (shouldUseWhisperStt()) return 'ChatGPT Whisper'
  if (hasWebSpeechRecognition()) return 'Browser speech (free)'
  return 'Tap-to-type fallback'
}

export function getBrainLabel() {
  if (hasBrainReady()) return 'Ready'
  return 'Add free API key in Settings'
}

export function getPhoneSetupHint() {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const secure = typeof window !== 'undefined' && window.isSecureContext
  if (secure) {
    return `On iPhone Safari: open ${origin} · Settings → Gemini key · allow mic when prompted`
  }
  return `iPhone needs HTTPS. Use ${origin.replace(/^http:/, 'https:')} and trust the certificate warning.`
}
