/** Free-first AI providers for Raj brain (testing). */

import { getCachedOllamaModels } from '../utils/ollamaModelsCache'
import { pickInstalledOllamaModel } from '../utils/ollamaModelPick'

export const BRAIN_PROVIDER_KEY = 'raj_brain_provider'
export const BRAIN_MODEL_KEY = 'raj_brain_model'
export const BRAIN_USER_LOCKED_KEY = 'raj_brain_user_locked'
export const BRAIN_HISTORY_KEY = 'raj_chat_history'

export const AI_PROVIDERS = {
  keyword: {
    id: 'keyword',
    label: 'Basic (100% free)',
    subtitle: 'No API key · simple commands only',
    keyUrl: null,
    signupLabel: null,
    models: [{ id: 'rules', label: 'Keyword rules' }],
    defaultModel: 'rules',
    free: true,
  },
  ollama: {
    id: 'ollama',
    label: 'Ollama (local, free)',
    subtitle: 'Qwen on your Mac — free, no API keys. For phone: run tunnel:ollama on Mac.',
    keyUrl: 'https://ollama.com/download',
    signupLabel: 'Get Ollama for Mac',
    models: [
      { id: 'llama3.2:latest', label: 'Llama 3.2 (default, fast)' },
      { id: 'llama3.1:8b', label: 'Llama 3.1 8B' },
      { id: 'llama3.1:latest', label: 'Llama 3.1 latest' },
      { id: 'llama3:8b', label: 'Llama 3 8B' },
      { id: 'qwen3-vl:8b', label: 'Qwen 3 VL 8B (vision, slower)' },
      { id: 'moondream:latest', label: 'Moondream (fast vision — recommended for images)' },
      { id: 'qwen3:8b', label: 'Qwen 3 8B' },
      { id: 'qwen3:4b', label: 'Qwen 3 4B' },
      { id: 'qwen2.5-coder:1.5b', label: 'Qwen 2.5 Coder 1.5B (fast)' },
      { id: 'qwen2.5:7b', label: 'Qwen 2.5 7B' },
      { id: 'llama3.2:3b', label: 'Llama 3.2 3B' },
      { id: 'deepseek-r1:latest', label: 'DeepSeek R1' },
    ],
    defaultModel: 'llama3.2:latest',
    free: true,
    local: true,
  },
  freellmapi: {
    id: 'freellmapi',
    label: 'FreeLLMAPI (auto)',
    subtitle: 'Auto model routing — same stack as local npm run dev. Set VITE_FREELLMAPI_URL + VITE_FREELLMAPI_KEY on Netlify.',
    keyUrl: null,
    signupLabel: null,
    models: [
      { id: 'auto', label: 'Auto (best available — recommended)' },
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (Groq)' },
    ],
    defaultModel: 'auto',
    free: true,
  },
  gemini: {
    id: 'gemini',
    label: 'Google Gemini (direct)',
    subtitle: 'Secondary fallback · free tier · needs Gemini API key',
    keyUrl: 'https://aistudio.google.com/apikey',
    signupLabel: 'Get free Gemini API key',
    models: [
      { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash-Lite (best free quota)' },
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    ],
    defaultModel: 'gemini-2.0-flash-lite',
    free: true,
  },
  groq: {
    id: 'groq',
    label: 'Groq',
    subtitle: 'Free tier · very fast Llama models',
    keyUrl: 'https://console.groq.com/keys',
    signupLabel: 'Get free Groq API key',
    models: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
      { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (fastest)' },
    ],
    defaultModel: 'llama-3.3-70b-versatile',
    free: true,
  },
  openai: {
    id: 'openai',
    label: 'OpenAI ChatGPT',
    subtitle: 'Paid · needs billing credits',
    keyUrl: 'https://platform.openai.com/api-keys',
    signupLabel: 'OpenAI API keys (paid)',
    models: [
      { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
      { id: 'gpt-4o', label: 'GPT-4o' },
    ],
    defaultModel: 'gpt-4o-mini',
    free: false,
  },
}

export const DEFAULT_BRAIN_PROVIDER = 'ollama'

export function getBrainProvider() {
  if (typeof window === 'undefined') return DEFAULT_BRAIN_PROVIDER
  const stored = localStorage.getItem(BRAIN_PROVIDER_KEY)
  return AI_PROVIDERS[stored] ? stored : DEFAULT_BRAIN_PROVIDER
}

export function isBrainUserLocked() {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(BRAIN_USER_LOCKED_KEY) === '1'
}

/** Persist explicit user choice — stops auto-switching to Gemini. */
export function setBrainUserChoice(provider, model) {
  const id = AI_PROVIDERS[provider] ? provider : DEFAULT_BRAIN_PROVIDER
  localStorage.setItem(BRAIN_PROVIDER_KEY, id)
  localStorage.setItem(
    BRAIN_MODEL_KEY,
    model || AI_PROVIDERS[id]?.defaultModel || AI_PROVIDERS.ollama.defaultModel,
  )
  localStorage.setItem(BRAIN_USER_LOCKED_KEY, '1')
}

export function clearBrainUserLock() {
  localStorage.removeItem(BRAIN_USER_LOCKED_KEY)
}

export function setBrainProvider(provider) {
  const id = AI_PROVIDERS[provider] ? provider : DEFAULT_BRAIN_PROVIDER
  localStorage.setItem(BRAIN_PROVIDER_KEY, id)
  if (!localStorage.getItem(BRAIN_MODEL_KEY)) {
    localStorage.setItem(BRAIN_MODEL_KEY, AI_PROVIDERS[id].defaultModel)
  }
}

export function getBrainModel(provider = getBrainProvider()) {
  const def = AI_PROVIDERS[provider]?.defaultModel || AI_PROVIDERS.ollama.defaultModel
  if (typeof window === 'undefined') return def
  const stored = localStorage.getItem(BRAIN_MODEL_KEY)?.trim()
  const catalog = AI_PROVIDERS[provider]?.models || []

  if (provider === 'ollama') {
    const installed = getCachedOllamaModels()
    const preferred = stored || import.meta.env.VITE_OLLAMA_MODEL?.trim() || def
    if (installed.length) {
      return pickInstalledOllamaModel(installed, preferred)
    }
    if (stored && catalog.some((m) => m.id === stored)) return stored
    return import.meta.env.VITE_OLLAMA_MODEL?.trim() || def
  }

  if (stored && catalog.some((m) => m.id === stored)) return stored
  return def
}

export function setBrainModel(model) {
  if (model) localStorage.setItem(BRAIN_MODEL_KEY, model)
}

export function getProviderKeyStorageKey(provider) {
  return `raj_api_key_${provider}`
}

export function sanitizeApiKey(key) {
  if (!key) return ''
  return String(key).trim().replace(/^['"]|['"]$/g, '').replace(/\s+/g, '')
}

export function getProviderApiKey(provider = getBrainProvider()) {
  if (typeof window === 'undefined') return ''
  if (provider === 'keyword') return ''
  if (provider === 'ollama') return 'local'
  if (provider === 'openai') {
    const stored = sanitizeApiKey(localStorage.getItem(getProviderKeyStorageKey('openai')))
    if (stored) return stored
    if (import.meta.env.VITE_OPENAI_API_KEY?.trim()) return sanitizeApiKey(import.meta.env.VITE_OPENAI_API_KEY)
    return sanitizeApiKey(localStorage.getItem('openai_api_key'))
  }
  if (provider === 'freellmapi') {
    const stored = sanitizeApiKey(localStorage.getItem(getProviderKeyStorageKey('freellmapi')))
    if (stored) return stored
    if (import.meta.env.VITE_FREELLMAPI_KEY?.trim()) return sanitizeApiKey(import.meta.env.VITE_FREELLMAPI_KEY)
    return ''
  }
  if (provider === 'gemini') {
    const stored = sanitizeApiKey(localStorage.getItem(getProviderKeyStorageKey('gemini')))
    if (stored) return stored
    if (import.meta.env.VITE_GEMINI_API_KEY?.trim()) return sanitizeApiKey(import.meta.env.VITE_GEMINI_API_KEY)
    return ''
  }
  return sanitizeApiKey(localStorage.getItem(getProviderKeyStorageKey(provider)))
}

export function setProviderApiKey(provider, key) {
  if (!AI_PROVIDERS[provider] || provider === 'keyword' || provider === 'ollama') return
  const trimmed = sanitizeApiKey(key)
  localStorage.setItem(getProviderKeyStorageKey(provider), trimmed)
  if (provider === 'openai') localStorage.setItem('openai_api_key', trimmed)
}

export function hasBrainReady() {
  const { provider, ready } = resolveBrainConfig({ persist: false })
  if (provider === 'keyword') return true
  if (provider === 'ollama') {
    if (!canUseOllama()) return false
    try {
      return sessionStorage.getItem('raj_ollama_running') === '1'
    } catch {
      return false
    }
  }
  return ready
}

export function getActiveProviderInfo() {
  const id = getBrainProvider()
  return { id, ...AI_PROVIDERS[id], model: getBrainModel() }
}

function readEnvBrainKey(provider) {
  if (typeof import.meta === 'undefined') return ''
  if (provider === 'freellmapi') {
    return sanitizeApiKey(import.meta.env.VITE_FREELLMAPI_KEY)
  }
  if (provider === 'gemini') {
    return sanitizeApiKey(import.meta.env.VITE_GEMINI_API_KEY)
  }
  return ''
}

function isPublicFreeLLMAPIUrl(url) {
  if (!url?.trim()) return false
  try {
    const host = new URL(url.trim()).hostname.toLowerCase()
    return host !== 'localhost' && host !== '127.0.0.1' && !host.endsWith('.local')
  } catch {
    return false
  }
}

function readStoredKey(provider) {
  if (typeof window === 'undefined') return ''
  return sanitizeApiKey(localStorage.getItem(getProviderKeyStorageKey(provider)))
}

export function canUseFreeLLMAPI() {
  const key = readEnvBrainKey('freellmapi') || readStoredKey('freellmapi')
  if (!key?.startsWith('freellmapi-')) return false
  if (import.meta.env.DEV) return true
  return isPublicFreeLLMAPIUrl(import.meta.env.VITE_FREELLMAPI_URL?.trim())
}

export function canUseGemini() {
  const key = readEnvBrainKey('gemini') || readStoredKey('gemini')
  return Boolean(key?.startsWith('AIza'))
}

export function canUseOllama() {
  if (import.meta.env.DEV) return true
  const flag = import.meta.env.VITE_OLLAMA_ENABLED
  return flag === 'true' || flag === '1'
}

function readStoredProvider() {
  const stored = localStorage.getItem(BRAIN_PROVIDER_KEY)
  return AI_PROVIDERS[stored] ? stored : null
}

function providerIsReady(provider) {
  if (provider === 'keyword') return true
  if (provider === 'ollama') return canUseOllama()
  if (provider === 'gemini') return canUseGemini()
  if (provider === 'freellmapi') return canUseFreeLLMAPI()
  return Boolean(readStoredKey(provider) || readEnvBrainKey(provider))
}

function getDefaultOllamaModel() {
  const env = import.meta.env.VITE_OLLAMA_MODEL?.trim()
  if (env) return env
  const stored = localStorage.getItem(BRAIN_MODEL_KEY)?.trim()
  if (stored && AI_PROVIDERS.ollama.models.some((m) => m.id === stored)) return stored
  return AI_PROVIDERS.ollama.defaultModel
}

function applyAutoDefault(provider, model) {
  setBrainProvider(provider)
  if (model) setBrainModel(model)
}

/** Pick brain: user choice first, then Ollama, then Gemini fallback. */
export function resolveBrainConfig({ persist = false } = {}) {
  if (typeof window === 'undefined') {
    return { provider: DEFAULT_BRAIN_PROVIDER, ready: false, source: 'none' }
  }

  if (isBrainUserLocked()) {
    const stored = readStoredProvider() || DEFAULT_BRAIN_PROVIDER
    if (providerIsReady(stored)) {
      return { provider: stored, ready: true, source: 'user' }
    }
  }

  if (canUseOllama()) {
    const model = getDefaultOllamaModel()
    if (persist && !isBrainUserLocked()) applyAutoDefault('ollama', model)
    return {
      provider: 'ollama',
      ready: true,
      source: isBrainUserLocked() ? 'user-fallback' : 'auto',
    }
  }

  if (canUseGemini()) {
    const key = readEnvBrainKey('gemini') || readStoredKey('gemini')
    if (persist && !isBrainUserLocked()) {
      setProviderApiKey('gemini', key)
      applyAutoDefault('gemini', AI_PROVIDERS.gemini.defaultModel)
    }
    return { provider: 'gemini', ready: true, source: 'fallback' }
  }

  if (canUseFreeLLMAPI()) {
    const key = readEnvBrainKey('freellmapi') || readStoredKey('freellmapi')
    if (persist && !isBrainUserLocked()) {
      setProviderApiKey('freellmapi', key)
      applyAutoDefault('freellmapi', 'auto')
    }
    return { provider: 'freellmapi', ready: true, source: readEnvBrainKey('freellmapi') ? 'env' : 'local' }
  }

  const stored = readStoredProvider() || DEFAULT_BRAIN_PROVIDER
  if (stored === 'keyword' || stored === 'ollama') {
    return {
      provider: stored,
      ready: stored === 'keyword' || canUseOllama(),
      source: 'local',
    }
  }

  const key = readStoredKey(stored) || readEnvBrainKey(stored)
  return { provider: stored, ready: Boolean(key), source: key ? 'local' : 'none' }
}

/** Netlify/production: bake in brain config from VITE_* env (same as local auto-link). */
export function applyBuiltInBrainConfig() {
  const resolved = resolveBrainConfig({ persist: !isBrainUserLocked() })
  return { applied: resolved.ready && resolved.provider !== 'keyword', provider: resolved.provider }
}

/** One-time fixes: wrong provider/key slot, stale OpenAI quota flag. */
export function migrateBrainSettings() {
  if (typeof window === 'undefined') return

  const geminiKey = readStoredKey('gemini')
  const openaiKey = localStorage.getItem('openai_api_key')?.trim()
  let aiKey = ''
  try {
    aiKey = JSON.parse(localStorage.getItem('ai_pro_settings') || '{}').apiKey?.trim() || ''
  } catch {}

  const looksLikeGemini = (key) => Boolean(key?.startsWith('AIza'))

  if (!geminiKey && looksLikeGemini(openaiKey)) {
    localStorage.setItem(getProviderKeyStorageKey('gemini'), openaiKey)
  }
  if (!readStoredKey('gemini') && looksLikeGemini(aiKey)) {
    localStorage.setItem(getProviderKeyStorageKey('gemini'), aiKey)
  }

  // Stale FreeLLMAPI key on hosted site (localhost brain) — let Gemini env take over.
  if (import.meta.env.PROD && !canUseFreeLLMAPI() && canUseGemini()) {
    if (localStorage.getItem(BRAIN_PROVIDER_KEY) === 'freellmapi') {
      localStorage.removeItem(getProviderKeyStorageKey('freellmapi'))
    }
  }

  resolveBrainConfig({ persist: !isBrainUserLocked() })

  if (canUseOllama() && !isBrainUserLocked()) {
    const current = localStorage.getItem(BRAIN_PROVIDER_KEY)
    if (current === 'gemini' || current === 'freellmapi') {
      setBrainProvider('ollama')
    }
  }

  if (localStorage.getItem(BRAIN_PROVIDER_KEY) === 'gemini') {
    const model = localStorage.getItem(BRAIN_MODEL_KEY)
    if (model === 'gemini-2.0-flash' || model === 'gemini-1.5-flash') {
      localStorage.setItem(BRAIN_MODEL_KEY, 'gemini-2.0-flash-lite')
    }
  }

  const storedModel = localStorage.getItem(BRAIN_MODEL_KEY)
  const activeProvider = localStorage.getItem(BRAIN_PROVIDER_KEY) || DEFAULT_BRAIN_PROVIDER

  if (activeProvider === 'ollama') {
    const installed = getCachedOllamaModels()
    if (installed.length && storedModel && !installed.includes(storedModel)) {
      setBrainModel(pickInstalledOllamaModel(installed, storedModel))
    }
  }

  const validModels = AI_PROVIDERS[activeProvider]?.models || []
  if (storedModel && !validModels.some((m) => m.id === storedModel)) {
    localStorage.setItem(BRAIN_MODEL_KEY, AI_PROVIDERS[activeProvider]?.defaultModel || 'auto')
  }
}
