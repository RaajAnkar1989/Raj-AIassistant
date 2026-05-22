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

/** iPhone: browser speech only (free). Whisper uses paid OpenAI — off for testing. */
export function shouldUseWhisperStt() {
  return false
}

export function getVoiceInputLabel() {
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
