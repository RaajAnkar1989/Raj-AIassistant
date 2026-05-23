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

export function setCachedOllamaModels(models) {
  try {
    sessionStorage.setItem(MODELS_KEY, JSON.stringify(models))
  } catch {}
}

export { MODELS_KEY }
