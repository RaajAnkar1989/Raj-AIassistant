import { OLLAMA_URL } from '../config.mjs'

export async function listModels() {
  const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(4000) })
  if (!res.ok) throw new Error(`Ollama tags failed (${res.status})`)
  const data = await res.json()
  return (data.models || []).map((m) => m.name)
}

export function pickModel(preferred, available = []) {
  if (available.includes(preferred)) return preferred
  const base = preferred.split(':')[0]
  const fuzzy = available.find((m) => m.startsWith(`${base}:`) || m === base)
  if (fuzzy) return fuzzy
  return available[0] || preferred
}

/** Non-streaming chat — returns full assistant message string */
export async function chatOnce({ model, messages, format, options = {} }) {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      format: format || undefined,
      options,
    }),
    signal: AbortSignal.timeout(120000),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.error || `Ollama chat failed (${res.status})`)
  }
  return data.message?.content || ''
}

/**
 * Streaming chat — calls onToken(partialContent, delta) per chunk.
 * Returns final accumulated content.
 */
export async function chatStream({ model, messages, options = {}, onToken, signal }) {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      options,
    }),
    signal,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || `Ollama stream failed (${res.status})`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.trim()) continue
      let chunk
      try {
        chunk = JSON.parse(line)
      } catch {
        continue
      }
      const delta = chunk.message?.content || ''
      if (delta) {
        full += delta
        onToken?.(full, delta)
      }
      if (chunk.done) return full
    }
  }

  return full
}
