import { canUseOllama, getProviderApiKey } from '../constants/aiProviders'
import { getCachedOllamaModels } from '../utils/ollamaModelsCache'

const IMAGE_GEN_MODELS = [
  'x/flux2-klein',
  'x/flux2-klein:latest',
  'x/z-image-turbo',
  'flux',
  'flux:latest',
]

const GEMINI_IMAGE_MODELS = [
  'gemini-2.0-flash-preview-image-generation',
  'gemini-2.5-flash-image',
  'gemini-2.0-flash-exp-image-generation',
]

const OPENAI_IMAGE_MODEL = 'dall-e-3'
const IMAGE_GEN_TIMEOUT_MS = 120_000

function getOllamaBase() {
  if (canUseOllama()) return '/api/brain/ollama'
  return ''
}

export function pickImageGenProvider() {
  if (getProviderApiKey('gemini')) return 'gemini'
  if (getProviderApiKey('openai')) return 'openai'
  if (canUseOllama() && pickOllamaImageModel(getCachedOllamaModels())) return 'ollama'
  return null
}

function pickOllamaImageModel(names) {
  const list = Array.isArray(names) ? names : []
  for (const want of IMAGE_GEN_MODELS) {
    if (list.includes(want)) return want
  }
  return list.find((n) => /flux|z-image|imagegen/i.test(n)) || null
}

async function fetchOllamaImageModels() {
  const cached = getCachedOllamaModels()
  if (cached.length) return cached
  const base = getOllamaBase()
  if (!base) return []
  const res = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(4500) })
  if (!res.ok) return []
  const data = await res.json()
  return (data.models || []).map((m) => m.name).filter(Boolean)
}

async function generateOpenAI(prompt, signal, onStatus) {
  let apiKey = getProviderApiKey('openai')
  if (!apiKey && import.meta.env.VITE_OPENAI_API_KEY) apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (!apiKey) throw new Error('OpenAI API key missing')

  onStatus?.('Creating image with DALL·E…')
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_IMAGE_MODEL,
      prompt,
      size: '1024x1024',
      quality: 'standard',
      response_format: 'b64_json',
      n: 1,
    }),
    signal: AbortSignal.timeout(IMAGE_GEN_TIMEOUT_MS),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error?.message || `OpenAI image failed (${res.status})`)

  const b64 = data.data?.[0]?.b64_json
  if (!b64) throw new Error('OpenAI returned no image')
  return {
    dataUrl: `data:image/png;base64,${b64}`,
    provider: 'openai',
    caption: `Created with DALL·E: ${prompt}`,
  }
}

async function generateGemini(prompt, signal, onStatus) {
  const apiKey = getProviderApiKey('gemini')
  if (!apiKey) throw new Error('Gemini API key missing')

  let lastErr = 'Gemini image generation failed'
  for (const model of GEMINI_IMAGE_MODELS) {
    onStatus?.(`Creating image with ${model}…`)
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: `Generate an image: ${prompt}` }] }],
            generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
          }),
          signal: AbortSignal.timeout(IMAGE_GEN_TIMEOUT_MS),
        },
      )

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        lastErr = data?.error?.message || lastErr
        continue
      }

      const parts = data.candidates?.[0]?.content?.parts || []
      let caption = ''
      let dataUrl = ''
      for (const part of parts) {
        if (part.text) caption = part.text.trim()
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType || 'image/png'
          dataUrl = `data:${mime};base64,${part.inlineData.data}`
        }
      }
      if (dataUrl) {
        return {
          dataUrl,
          provider: 'gemini',
          caption: caption || `Created: ${prompt}`,
        }
      }
      lastErr = 'Gemini returned no image — try OpenAI or local FLUX'
    } catch (e) {
      if (e.name === 'AbortError' || e.name === 'TimeoutError') throw e
      lastErr = e.message || lastErr
    }
  }
  throw new Error(lastErr)
}

async function generateOllama(prompt, signal, onStatus) {
  const models = await fetchOllamaImageModels()
  const model = pickOllamaImageModel(models)
  if (!model) {
    throw new Error(
      'No local image model. Run: ollama pull x/flux2-klein (needs Ollama 0.23+) — or add a Gemini/OpenAI key in Settings.',
    )
  }

  const base = getOllamaBase()
  onStatus?.(`Creating image with ${model}… (15–60s)`)

  const res = await fetch(`${base}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      stream: true,
      width: 768,
      height: 768,
      steps: 20,
    }),
    signal: AbortSignal.timeout(IMAGE_GEN_TIMEOUT_MS),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Ollama image failed (${res.status})`)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('Ollama returned no stream')

  const decoder = new TextDecoder()
  let buffer = ''
  let imageB64 = ''
  let completed = 0
  let total = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        const chunk = JSON.parse(trimmed)
        if (chunk.total) total = chunk.total
        if (chunk.completed != null) completed = chunk.completed
        if (total > 0) {
          onStatus?.(`Creating image… step ${completed}/${total}`)
        }
        if (chunk.image) imageB64 = chunk.image
        if (chunk.done && chunk.image) imageB64 = chunk.image
      } catch {
        /* partial */
      }
    }
  }

  if (!imageB64) {
    throw new Error(
      'Local image model returned empty. Update Ollama (ollama.com/download) and run: ollama pull x/flux2-klein',
    )
  }

  return {
    dataUrl: `data:image/png;base64,${imageB64}`,
    provider: 'ollama',
    caption: `Created locally: ${prompt}`,
  }
}

export async function generateChatImage({ prompt, signal, onStatus, provider: forced } = {}) {
  const provider = forced || pickImageGenProvider()
  if (!provider) {
    throw new Error(
      'Image creation needs a Gemini or OpenAI key in Settings, or local FLUX: ollama pull x/flux2-klein',
    )
  }

  if (provider === 'openai') return generateOpenAI(prompt, signal, onStatus)
  if (provider === 'gemini') return generateGemini(prompt, signal, onStatus)
  if (provider === 'ollama') return generateOllama(prompt, signal, onStatus)
  throw new Error('No image provider configured')
}
