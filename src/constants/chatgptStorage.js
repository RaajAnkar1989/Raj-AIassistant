export const CHATGPT_MODEL_KEY = 'raj_chatgpt_model'
export const CHATGPT_HISTORY_KEY = 'raj_chat_history'

export const CHATGPT_MODELS = [
  { id: 'gpt-4o-mini', label: 'GPT-4o mini (fast, cheap)' },
  { id: 'gpt-4o', label: 'GPT-4o (smarter)' },
]

export const DEFAULT_CHATGPT_MODEL = 'gpt-4o-mini'

export function getChatGptModel() {
  if (typeof window === 'undefined') return DEFAULT_CHATGPT_MODEL
  try {
    const ai = JSON.parse(localStorage.getItem('ai_pro_settings') || '{}')
    if (ai.model && CHATGPT_MODELS.some((m) => m.id === ai.model)) return ai.model
  } catch {}
  const stored = localStorage.getItem(CHATGPT_MODEL_KEY)?.trim()
  if (stored && CHATGPT_MODELS.some((m) => m.id === stored)) return stored
  return DEFAULT_CHATGPT_MODEL
}

export function setChatGptModel(model) {
  const id = CHATGPT_MODELS.some((m) => m.id === model) ? model : DEFAULT_CHATGPT_MODEL
  localStorage.setItem(CHATGPT_MODEL_KEY, id)
  try {
    const ai = JSON.parse(localStorage.getItem('ai_pro_settings') || '{}')
    localStorage.setItem('ai_pro_settings', JSON.stringify({ ...ai, provider: 'openai', model: id }))
  } catch {
    localStorage.setItem('ai_pro_settings', JSON.stringify({ provider: 'openai', model: id }))
  }
}

export function hasChatGptApiKey() {
  if (typeof window === 'undefined') return false
  if (import.meta.env.VITE_OPENAI_API_KEY?.trim()) return true
  try {
    const ai = JSON.parse(localStorage.getItem('ai_pro_settings') || '{}')
    if (ai.apiKey?.trim()) return true
  } catch {}
  return Boolean(localStorage.getItem('openai_api_key')?.trim())
}
