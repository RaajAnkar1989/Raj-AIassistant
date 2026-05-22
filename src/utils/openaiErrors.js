import { getBrainProvider } from '../constants/aiProviders'

const QUOTA_RE = /quota|exceeds your quota|resource.?exhausted|rate limit|too many requests|429|limit:\s*0/i

export function isOpenAIQuotaError(message) {
  return QUOTA_RE.test(String(message || ''))
}

export function formatOpenAIError(message) {
  const msg = String(message || '')
  if (isOpenAIQuotaError(msg)) {
    return 'OpenAI credits used up. Add billing at platform.openai.com/account/billing — or switch to Gemini (free) in Settings.'
  }
  if (/invalid.*api key|401/i.test(msg)) {
    return 'Invalid OpenAI API key. Check Settings.'
  }
  return msg || 'OpenAI request failed'
}

/** Provider-aware — pass through Gemini/Groq messages when possible. */
export function formatBrainError(message, provider = 'openai') {
  const msg = String(message || '').trim()
  if (provider === 'openai') return formatOpenAIError(msg)

  if (provider === 'ollama') {
    if (/not running|ECONNREFUSED|503|fetch failed|not reachable|unreachable|tunnel/i.test(msg)) {
      return import.meta.env.PROD
        ? 'Ollama brain offline. On your Mac keep running: ollama serve and npm run tunnel:ollama — then npm run sync:ollama-netlify if tunnel URL changed.'
        : 'Ollama is not running. In Terminal run: ollama serve'
    }
    if (/model.*not found|does not exist/i.test(msg)) {
      return 'Model not installed. Run: ollama pull qwen2.5:7b (or pick an installed model in Settings)'
    }
    return msg || 'Ollama request failed'
  }

  if (provider === 'gemini') {
    if (/API key not valid|API_KEY_INVALID|API key expired/i.test(msg)) {
      return 'Gemini rejected the API key. In Google AI Studio create a new key, set Application restrictions to None, and paste the full key (starts with AIza).'
    }
    if (/limit:\s*0|requires billing|billing account|BILLING/i.test(msg)) {
      return 'Gemini free tier may need a billing account linked in Google Cloud (still free within limits). Check aistudio.google.com/apikey'
    }
    if (isOpenAIQuotaError(msg)) {
      return `Gemini quota hit. Wait 60 seconds, switch to Flash-Lite in Settings, or enable billing. Details: ${msg}`
    }
    if (/PERMISSION_DENIED|API has not been used|SERVICE_DISABLED/i.test(msg)) {
      return `Gemini API not enabled for this key/project. Enable Generative Language API in Google Cloud. (${msg})`
    }
    return msg || 'Gemini request failed'
  }

  if (/invalid.*api key|API_KEY_INVALID/i.test(msg)) {
    return `Invalid ${provider} API key. Check Settings → AI Brain.`
  }
  if (isOpenAIQuotaError(msg)) {
    return `${provider} rate limit or quota hit. Wait a minute or check your ${provider} dashboard.`
  }
  return msg || 'AI request failed'
}

export function markQuotaExceeded() {
  try {
    sessionStorage.setItem('raj_openai_quota_exceeded', '1')
  } catch {}
}

export function isQuotaExceededCached() {
  try {
    if (sessionStorage.getItem('raj_openai_quota_exceeded') !== '1') return false
    return getBrainProvider() === 'openai'
  } catch {
    return false
  }
}

export function clearQuotaExceededCache() {
  try {
    sessionStorage.removeItem('raj_openai_quota_exceeded')
  } catch {}
}
