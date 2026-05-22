import {
  getBrainModel,
  setBrainModel,
  setBrainProvider,
  canUseOllama,
  isBrainUserLocked,
} from '../constants/aiProviders'

const CACHE_KEY = 'raj_ollama_sync_at'
const MODELS_KEY = 'raj_ollama_models'

export function getCachedOllamaModels() {
  try {
    const raw = sessionStorage.getItem(MODELS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** Probe local Ollama and cache installed model names (dev only). */
export async function syncOllamaFromLocal({ force = false } = {}) {
  if (!canUseOllama()) {
    return { running: false, models: [], model: getBrainModel() }
  }

  if (!force) {
    try {
      const last = Number(sessionStorage.getItem(CACHE_KEY) || 0)
      if (Date.now() - last < 30_000) {
        return {
          running: true,
          models: getCachedOllamaModels(),
          model: getBrainModel(),
          cached: true,
        }
      }
    } catch {}
  }

  try {
    const res = await fetch('/api/brain/ollama/api/tags')
    if (!res.ok) throw new Error('Ollama not reachable')
    const data = await res.json()
    const models = (data.models || []).map((m) => m.name).filter(Boolean)
    const preferred =
      models.find((n) => /^llama3\.1:8b$/i.test(n) || /llama3\.1.*8b/i.test(n)) ||
      models.find((n) => /llama3\.1/i.test(n)) ||
      models.find((n) => /llama3/i.test(n)) ||
      models.find((n) => /qwen/i.test(n))
    const envModel = import.meta.env.VITE_OLLAMA_MODEL?.trim()
    const model =
      (envModel && models.includes(envModel) && envModel) ||
      preferred ||
      models[0] ||
      envModel ||
      'llama3.1:8b'

    try {
      sessionStorage.setItem(MODELS_KEY, JSON.stringify(models))
      sessionStorage.setItem(CACHE_KEY, String(Date.now()))
      sessionStorage.setItem('raj_ollama_running', '1')
    } catch {}

    if (!isBrainUserLocked()) {
      setBrainProvider('ollama')
      setBrainModel(model)
    }

    return { running: true, models, model, cached: false }
  } catch {
    try {
      sessionStorage.setItem('raj_ollama_running', '0')
    } catch {}
    return { running: false, models: [], model: getBrainModel() }
  }
}
