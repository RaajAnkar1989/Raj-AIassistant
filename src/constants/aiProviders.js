/** Free-first AI providers for Raj brain (testing). */

export const BRAIN_PROVIDER_KEY = 'raj_brain_provider'
export const BRAIN_MODEL_KEY = 'raj_brain_model'
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
    subtitle: 'Free tier · single provider · needs Gemini API key',
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

export const DEFAULT_BRAIN_PROVIDER = 'freellmapi'

export function getBrainProvider() {
  if (typeof window === 'undefined') return DEFAULT_BRAIN_PROVIDER
  const stored = localStorage.getItem(BRAIN_PROVIDER_KEY)
  return AI_PROVIDERS[stored] ? stored : DEFAULT_BRAIN_PROVIDER
}

export function setBrainProvider(provider) {
  const id = AI_PROVIDERS[provider] ? provider : DEFAULT_BRAIN_PROVIDER
  localStorage.setItem(BRAIN_PROVIDER_KEY, id)
  if (!localStorage.getItem(BRAIN_MODEL_KEY)) {
    localStorage.setItem(BRAIN_MODEL_KEY, AI_PROVIDERS[id].defaultModel)
  }
}

export function getBrainModel() {
  const provider = getBrainProvider()
  const def = AI_PROVIDERS[provider]?.defaultModel || 'gemini-2.0-flash-lite'
  if (typeof window === 'undefined') return def
  const stored = localStorage.getItem(BRAIN_MODEL_KEY)?.trim()
  const models = AI_PROVIDERS[provider]?.models || []
  if (stored && models.some((m) => m.id === stored)) return stored
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
  if (!AI_PROVIDERS[provider] || provider === 'keyword') return
  const trimmed = sanitizeApiKey(key)
  localStorage.setItem(getProviderKeyStorageKey(provider), trimmed)
  if (provider === 'openai') localStorage.setItem('openai_api_key', trimmed)
}

export function hasBrainReady() {
  const provider = getBrainProvider()
  if (provider === 'keyword') return true
  return Boolean(getProviderApiKey(provider))
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

/** Netlify/production: bake in brain config from VITE_* env (same as local auto-link). */
export function applyBuiltInBrainConfig() {
  if (typeof window === 'undefined') return { applied: false }

  const freellmKey = readEnvBrainKey('freellmapi')
  if (freellmKey?.startsWith('freellmapi-')) {
    setProviderApiKey('freellmapi', freellmKey)
    setBrainProvider('freellmapi')
    setBrainModel('auto')
    return { applied: true, provider: 'freellmapi' }
  }

  const geminiKey = readEnvBrainKey('gemini')
  if (geminiKey?.startsWith('AIza')) {
    setProviderApiKey('gemini', geminiKey)
    setBrainProvider('gemini')
    setBrainModel('gemini-2.0-flash-lite')
    return { applied: true, provider: 'gemini' }
  }

  return { applied: false }
}

/** One-time fixes: wrong provider/key slot, stale OpenAI quota flag. */
export function migrateBrainSettings() {
  if (typeof window === 'undefined') return

  applyBuiltInBrainConfig()

  const provider = localStorage.getItem(BRAIN_PROVIDER_KEY)
  const geminiKey = localStorage.getItem(getProviderKeyStorageKey('gemini'))?.trim()
  const openaiKey = localStorage.getItem('openai_api_key')?.trim()
  let aiKey = ''
  try {
    aiKey = JSON.parse(localStorage.getItem('ai_pro_settings') || '{}').apiKey?.trim() || ''
  } catch {}

  const looksLikeGemini = (key) => Boolean(key?.startsWith('AIza'))

  if (!geminiKey && looksLikeGemini(openaiKey)) {
    localStorage.setItem(getProviderKeyStorageKey('gemini'), openaiKey)
  }
  if (!localStorage.getItem(getProviderKeyStorageKey('gemini'))?.trim() && looksLikeGemini(aiKey)) {
    localStorage.setItem(getProviderKeyStorageKey('gemini'), aiKey)
  }

  const resolvedGemini = localStorage.getItem(getProviderKeyStorageKey('gemini'))?.trim()
  const freellmKey = localStorage.getItem(getProviderKeyStorageKey('freellmapi'))?.trim()

  if (freellmKey?.startsWith('freellmapi-')) {
    localStorage.setItem(BRAIN_PROVIDER_KEY, 'freellmapi')
  } else if (resolvedGemini && (!provider || provider === 'openai' || provider === 'keyword')) {
    localStorage.setItem(BRAIN_PROVIDER_KEY, 'gemini')
  }

  if (!localStorage.getItem(BRAIN_PROVIDER_KEY)) {
    localStorage.setItem(BRAIN_PROVIDER_KEY, DEFAULT_BRAIN_PROVIDER)
  }

  if ((localStorage.getItem(BRAIN_PROVIDER_KEY) || DEFAULT_BRAIN_PROVIDER) === 'freellmapi') {
    if (!localStorage.getItem(BRAIN_MODEL_KEY)) {
      localStorage.setItem(BRAIN_MODEL_KEY, 'auto')
    }
  }

  if (localStorage.getItem(BRAIN_PROVIDER_KEY) === 'gemini') {
    const model = localStorage.getItem(BRAIN_MODEL_KEY)
    if (model === 'gemini-2.0-flash') {
      localStorage.setItem(BRAIN_MODEL_KEY, 'gemini-2.0-flash-lite')
    }
    if (model === 'gemini-1.5-flash') {
      localStorage.setItem(BRAIN_MODEL_KEY, 'gemini-2.0-flash-lite')
    }
  }

  const storedModel = localStorage.getItem(BRAIN_MODEL_KEY)
  const activeProvider = localStorage.getItem(BRAIN_PROVIDER_KEY) || DEFAULT_BRAIN_PROVIDER
  const validModels = AI_PROVIDERS[activeProvider]?.models || []
  if (storedModel && !validModels.some((m) => m.id === storedModel)) {
    localStorage.setItem(BRAIN_MODEL_KEY, AI_PROVIDERS[activeProvider]?.defaultModel || 'auto')
  }
}
