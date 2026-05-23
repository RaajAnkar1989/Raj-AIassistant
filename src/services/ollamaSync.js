import {
  getBrainModel,
  setBrainModel,
  setBrainProvider,
  canUseOllama,
  isBrainUserLocked,
} from '../constants/aiProviders'
import { pickInstalledOllamaModel } from '../utils/ollamaModelPick'
import { getCachedOllamaModels, setCachedOllamaModels } from '../utils/ollamaModelsCache'

const CACHE_KEY = 'raj_ollama_sync_at'

export { getCachedOllamaModels }

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
    const res = await fetch('/api/brain/ollama/api/tags', {
      signal: AbortSignal.timeout(4500),
    })
    if (!res.ok) throw new Error('Ollama not reachable')
    const data = await res.json()
    const models = (data.models || []).map((m) => m.name).filter(Boolean)
    const envModel = import.meta.env.VITE_OLLAMA_MODEL?.trim()
    const current = getBrainModel('ollama')
    const model = pickInstalledOllamaModel(models, envModel || current)

    try {
      setCachedOllamaModels(models)
      sessionStorage.setItem(CACHE_KEY, String(Date.now()))
      sessionStorage.setItem('raj_ollama_running', '1')
    } catch {}

    const installedMismatch = models.length && !models.includes(current)
    if (!isBrainUserLocked() || installedMismatch) {
      setBrainProvider('ollama')
      if (model !== current) setBrainModel(model)
    }

    return { running: true, models, model, cached: false }
  } catch {
    try {
      sessionStorage.setItem('raj_ollama_running', '0')
    } catch {}
    return { running: false, models: [], model: getBrainModel() }
  }
}
