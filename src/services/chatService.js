import { getBrainModel, getBrainProvider, getProviderApiKey, canUseOllama } from '../constants/aiProviders'
import {
  CHAT_SYSTEM_PROMPT,
  CHAT_VISION_SYSTEM_PROMPT,
  MAX_VISION_HISTORY,
  VISION_JPEG_QUALITY,
  VISION_MAX_SIDE,
  VISION_REQUEST_TIMEOUT_MS,
} from '../constants/chatAppStorage'
import { compressChatImage } from '../utils/compressChatImage'
import { getCachedOllamaModels, setCachedOllamaModels } from '../utils/ollamaModelsCache'
import { pickVisionOllamaModel } from '../utils/ollamaModelPick'

function getOllamaBase() {
  if (canUseOllama()) return '/api/brain/ollama'
  return ''
}

function getFreeLLMBase() {
  if (import.meta.env.DEV) return '/api/brain/freellmapi'
  const url = import.meta.env.VITE_FREELLMAPI_URL?.trim()
  return url ? url.replace(/\/$/, '') : ''
}

function stripDataUrl(dataUrl) {
  const s = String(dataUrl || '')
  const i = s.indexOf(',')
  return i >= 0 ? s.slice(i + 1) : s
}

function messagesHaveImages(messages) {
  return (messages || []).some(
    (m) =>
      m.role === 'user' &&
      (m.attachments || []).some((a) => a.kind === 'image' && a.dataUrl),
  )
}

function trimMessagesForVision(messages) {
  if (messages.length <= MAX_VISION_HISTORY) return messages
  return messages.slice(-MAX_VISION_HISTORY)
}

function lastUserMessageIndex(messages) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === 'user') return i
  }
  return -1
}

/** Build Ollama/OpenAI-compatible message list from stored chat messages */
export function buildApiMessages(messages, { system = CHAT_SYSTEM_PROMPT } = {}) {
  const hasImages = messagesHaveImages(messages)
  const systemPrompt = hasImages ? CHAT_VISION_SYSTEM_PROMPT : system
  const out = [{ role: 'system', content: systemPrompt }]
  const batch = hasImages ? trimMessagesForVision(messages) : messages
  const imageTurnIdx = hasImages ? lastUserMessageIndex(batch) : -1

  for (let i = 0; i < batch.length; i += 1) {
    const msg = batch[i]
    const text = String(msg.content || '').trim()
    let body = text
    for (const a of msg.attachments || []) {
      if (a.kind === 'file' && a.textContent) {
        body += `\n\n--- ${a.name} ---\n${a.textContent.slice(0, 8000)}`
      }
    }

    const imageAttachments = (msg.attachments || []).filter((a) => a.kind === 'image' && a.dataUrl)
    const sendImages = hasImages && i === imageTurnIdx
    const images = sendImages ? imageAttachments.map((a) => stripDataUrl(a.dataUrl)) : []

    if (!sendImages && imageAttachments.length) {
      body += `\n[Earlier image: ${imageAttachments.map((a) => a.name).join(', ')}]`
    }

    const nonImageAttachments = (msg.attachments || []).filter((a) => a.kind !== 'image')
    const attachmentNote =
      !images.length && nonImageAttachments.length > 0
        ? `\n\n[Attachments: ${nonImageAttachments.map((a) => a.name).join(', ')}]`
        : ''

    if (msg.role === 'user') {
      const row = { role: 'user', content: (body + attachmentNote).trim() || '(attachment)' }
      if (images.length) row.images = images
      out.push(row)
    } else if (msg.role === 'assistant') {
      out.push({ role: 'assistant', content: text })
    }
  }
  return out
}

async function readStreamTokens(res, onToken, { firstTokenTimeoutMs = 0, onStatus } = {}) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Chat failed (${res.status})`)
  }
  if (!res.body) {
    const data = await res.json()
    const text = data.message?.content || data.choices?.[0]?.message?.content || ''
    if (text) onToken(text, text)
    return text
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''
  let gotToken = false

  const waitForFirstToken =
    firstTokenTimeoutMs > 0
      ? new Promise((_, reject) => {
          setTimeout(() => {
            if (!gotToken) {
              reject(
                new Error(
                  'Vision is slow on this Mac. Try a smaller crop, or install a faster model: ollama pull moondream',
                ),
              )
            }
          }, firstTokenTimeoutMs)
        })
      : null

  const readLoop = (async () => {
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
          const data = JSON.parse(trimmed)
          const delta = data.message?.content || data.choices?.[0]?.delta?.content || ''
          if (delta) {
            gotToken = true
            full += delta
            onToken(delta, full)
          }
          if (data.done) break
        } catch {
          /* partial line */
        }
      }
    }
    return full
  })()

  if (waitForFirstToken) {
    onStatus?.('Analyzing image…')
    return Promise.race([readLoop, waitForFirstToken])
  }

  return readLoop
}

async function fetchInstalledOllamaModels() {
  const cached = getCachedOllamaModels()
  if (cached.length) return cached

  const res = await fetch('/api/brain/ollama/api/tags', {
    signal: AbortSignal.timeout(4500),
  })
  if (!res.ok) throw new Error('Ollama not reachable')
  const data = await res.json()
  const models = (data.models || []).map((m) => m.name).filter(Boolean)
  setCachedOllamaModels(models)
  return models
}

async function resolveOllamaChatModel(apiMessages, modelOverride) {
  if (modelOverride) return modelOverride

  const hasImages = apiMessages.some((m) => m.images?.length)
  if (!hasImages) return getBrainModel('ollama')

  const installed = await fetchInstalledOllamaModels()
  const visionModel = pickVisionOllamaModel(installed)
  if (!visionModel) {
    throw new Error(
      'Image chat needs a vision model. Run: ollama pull qwen3-vl:8b — then try again.',
    )
  }
  return visionModel
}

let visionWarmupPromise = null

function linkAbortSignals(signals) {
  const active = signals.filter(Boolean)
  if (!active.length) return undefined
  if (active.length === 1) return active[0]
  const controller = new AbortController()
  for (const sig of active) {
    if (sig.aborted) {
      controller.abort(sig.reason)
      return controller.signal
    }
    sig.addEventListener('abort', () => controller.abort(sig.reason), { once: true })
  }
  return controller.signal
}

/** Pre-load vision weights in the background when user attaches an image. */
export function warmupVisionModel() {
  if (!canUseOllama()) return Promise.resolve(null)
  if (visionWarmupPromise) return visionWarmupPromise

  visionWarmupPromise = (async () => {
    const installed = await fetchInstalledOllamaModels()
    const model = pickVisionOllamaModel(installed)
    if (!model) return null

    const base = getOllamaBase()
    await fetch(`${base}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: ' ',
        stream: false,
        keep_alive: '10m',
        options: { num_predict: 1, num_ctx: 512 },
      }),
      signal: AbortSignal.timeout(90_000),
    }).catch(() => null)

    return model
  })().finally(() => {
    visionWarmupPromise = null
  })

  return visionWarmupPromise
}

async function streamOllama(apiMessages, model, onToken, signal, onStatus) {
  const base = getOllamaBase()
  if (!base) throw new Error('Ollama not available. Run ollama serve on your Mac.')
  const hasImages = apiMessages.some((m) => m.images?.length)
  const resolvedModel = await resolveOllamaChatModel(apiMessages, model)

  if (hasImages) {
    onStatus?.(`Analyzing with ${resolvedModel}…`)
    void warmupVisionModel()
  }

  const requestSignal = linkAbortSignals([
    signal,
    hasImages ? AbortSignal.timeout(VISION_REQUEST_TIMEOUT_MS) : null,
  ])

  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: resolvedModel,
      messages: apiMessages,
      stream: true,
      keep_alive: '10m',
      options: hasImages
        ? { temperature: 0.4, num_ctx: 4096, num_predict: 384, top_p: 0.9 }
        : { temperature: 0.7, num_ctx: 8192 },
    }),
    signal: requestSignal,
  }).catch((err) => {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      throw new Error(
        `Image analysis timed out after ${VISION_REQUEST_TIMEOUT_MS / 1000}s. Install a faster vision model: ollama pull moondream`,
      )
    }
    throw err
  })

  return readStreamTokens(res, onToken, {
    firstTokenTimeoutMs: hasImages ? VISION_REQUEST_TIMEOUT_MS : 0,
    onStatus,
  })
}

async function streamOpenAI(apiMessages, model, onToken, signal) {
  let apiKey = getProviderApiKey('openai')
  if (!apiKey && import.meta.env.VITE_OPENAI_API_KEY) apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (!apiKey) throw new Error('OpenAI API key missing')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages: apiMessages,
      stream: true,
      temperature: 0.7,
    }),
    signal,
  })
  return readStreamTokens(res, onToken)
}

async function streamGemini(apiMessages, model, onToken, signal) {
  const apiKey = getProviderApiKey('gemini')
  if (!apiKey) throw new Error('Gemini API key missing')

  const contents = apiMessages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

  const sys = apiMessages.find((m) => m.role === 'system')?.content
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-2.0-flash-lite'}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: sys ? { parts: [{ text: sys }] } : undefined,
      contents,
      generationConfig: { temperature: 0.7 },
    }),
    signal,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Gemini failed (${res.status})`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const chunks = buffer.split('\n')
    buffer = chunks.pop() || ''
    for (const line of chunks) {
      if (!line.startsWith('data:')) continue
      const raw = line.slice(5).trim()
      if (!raw || raw === '[DONE]') continue
      try {
        const data = JSON.parse(raw)
        const delta = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
        if (delta) {
          full += delta
          onToken(delta, full)
        }
      } catch {}
    }
  }
  return full
}

export async function streamChatReply({
  messages,
  onToken,
  onStatus,
  signal,
  model: modelOverride,
} = {}) {
  const provider = getBrainProvider()
  const apiMessages = buildApiMessages(messages)

  const tryOllama = async () => streamOllama(apiMessages, modelOverride, onToken, signal, onStatus)

  const handlers = {
    ollama: tryOllama,
    openai: () => streamOpenAI(apiMessages, modelOverride, onToken, signal),
    gemini: () => streamGemini(apiMessages, modelOverride, onToken, signal),
    freellmapi: async () => {
      const base = getFreeLLMBase()
      const key = getProviderApiKey('freellmapi')
      if (!base || !key) throw new Error('FreeLLMAPI not configured')
      const res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: modelOverride || 'auto',
          messages: apiMessages,
          stream: true,
          temperature: 0.7,
        }),
        signal,
      })
      return readStreamTokens(res, onToken)
    },
  }

  const primary = handlers[provider] || tryOllama
  try {
    return await primary()
  } catch (e) {
    if (provider !== 'ollama' && canUseOllama()) {
      return tryOllama()
    }
    throw e
  }
}

export async function readFileAsAttachment(file) {
  const kind = file.type.startsWith('image/') ? 'image' : 'file'
  const attachment = {
    id: crypto.randomUUID(),
    name: file.name,
    mime: file.type || 'application/octet-stream',
    size: file.size,
    kind,
    dataUrl: '',
    textContent: '',
  }

  if (kind === 'image') {
    const compressed = await compressChatImage(file, {
      maxSide: VISION_MAX_SIDE,
      quality: VISION_JPEG_QUALITY,
    })
    if (compressed?.dataUrl) {
      attachment.dataUrl = compressed.dataUrl
      attachment.mime = compressed.mime
      attachment.size = compressed.size
      attachment.name = file.name.replace(/\.\w+$/, '') + '.jpg'
      void warmupVisionModel()
      return attachment
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (file.type === 'application/pdf') {
        attachment.dataUrl = typeof result === 'string' ? result : ''
      } else if (typeof result === 'string') {
        attachment.textContent = result.slice(0, 12000)
      }
      resolve(attachment)
    }
    reader.onerror = () => reject(new Error('Could not read file'))
    if (file.type === 'application/pdf') {
      reader.readAsDataURL(file)
    } else if (kind === 'image') {
      reader.readAsDataURL(file)
    } else {
      reader.readAsText(file)
    }
  })
}
