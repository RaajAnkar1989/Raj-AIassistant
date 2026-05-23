/** Pick an Ollama model tag that is actually installed locally. */

const FALLBACK_MODEL = 'llama3.2:latest'

const VISION_MODEL_PATTERNS = [
  /moondream/i,
  /minicpm-v/i,
  /llava.*phi/i,
  /llava/i,
  /bakllava/i,
  /gemma.*vision/i,
  /qwen2-vl/i,
  /qwen3-vl/i,
  /qwen.*vl/i,
  /llama.*vision/i,
]

export function isVisionOllamaModel(name) {
  return VISION_MODEL_PATTERNS.some((re) => re.test(String(name || '')))
}

/** Prefer an installed vision model for image attachments. */
export function pickVisionOllamaModel(names) {
  const list = Array.isArray(names) ? names.filter(Boolean) : []
  for (const re of VISION_MODEL_PATTERNS) {
    const match = list.find((n) => re.test(n))
    if (match) return match
  }
  return null
}

export function pickInstalledOllamaModel(names, preferred) {
  const list = Array.isArray(names) ? names.filter(Boolean) : []
  if (!list.length) {
    return preferred?.trim() || FALLBACK_MODEL
  }

  const want = preferred?.trim()
  if (want && list.includes(want)) return want

  if (want) {
    const base = want.split(':')[0]
    const fuzzy = list.find((n) => n === want || n.startsWith(`${base}:`))
    if (fuzzy) return fuzzy
  }

  return (
    list.find((n) => /^llama3\.2:latest$/i.test(n)) ||
    list.find((n) => /llama3\.2/i.test(n)) ||
    list.find((n) => /^llama3\.1:8b$/i.test(n) || /llama3\.1.*8b/i.test(n)) ||
    list.find((n) => /llama3\.1/i.test(n)) ||
    list.find((n) => /^llama3:8b$/i.test(n)) ||
    list.find((n) => /llama3/i.test(n)) ||
    list.find((n) => /qwen3/i.test(n)) ||
    list.find((n) => /qwen/i.test(n)) ||
    list[0]
  )
}
