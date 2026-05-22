/**
 * Persistent Raj brain memory — file on Mac via /api/memory, localStorage fallback.
 */
import { BRAIN_HISTORY_KEY } from '../constants/aiProviders'

const LOCAL_KEY = 'raj_brain_memory_v1'
const LOCAL_STATS_KEY = 'raj_brain_memory_stats'
const MAX_STORED_MESSAGES = 5000

const API = '/api/memory'

function readLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeLocal(messages) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)))
    localStorage.setItem(LOCAL_STATS_KEY, JSON.stringify({ updatedAt: new Date().toISOString() }))
  } catch {}
}

function readLocalStats() {
  try {
    const messages = readLocal()
    const raw = localStorage.getItem(LOCAL_STATS_KEY)
    const meta = raw ? JSON.parse(raw) : {}
    return {
      messageCount: messages.length,
      userCount: messages.filter((m) => m.role === 'user').length,
      noteCount: 0,
      updatedAt: meta.updatedAt || null,
      source: 'browser',
    }
  } catch {
    return { messageCount: 0, userCount: 0, noteCount: 0, source: 'browser' }
  }
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || `Memory API failed (${res.status})`)
  return data
}

export async function getMemoryStats() {
  try {
    const data = await apiFetch('/')
    return { ...data.stats, source: 'file' }
  } catch {
    return readLocalStats()
  }
}

export async function loadContextMessages(limit = 50) {
  try {
    const data = await apiFetch('/context')
    if (Array.isArray(data.messages)) return data.messages.slice(-limit)
  } catch {}

  return readLocal().slice(-limit)
}

export async function loadLongTermMemoryBlock() {
  try {
    const data = await apiFetch('/long-term')
    if (data.block) return data.block
  } catch {}

  try {
    const data = await apiFetch('/')
    if (data.longTermPreview) return data.longTermPreview
  } catch {}

  const messages = readLocal()
  const lines = []
  for (const msg of messages.filter((m) => m.role === 'user').slice(-1500)) {
    const line = `- User said: ${String(msg.content).replace(/\s+/g, ' ').trim()}`
    lines.push(line.length > 220 ? `${line.slice(0, 217)}…` : line)
  }
  const block = lines.join('\n')
  return block.length > 8000 ? block.slice(block.length - 8000) : block
}

export async function appendBrainExchange(userText, assistantPayload) {
  try {
    await apiFetch('/append', {
      method: 'POST',
      body: JSON.stringify({ user: userText, assistant: assistantPayload }),
    })
    return
  } catch {}

  const messages = readLocal()
  messages.push({ role: 'user', content: userText })
  messages.push({ role: 'assistant', content: JSON.stringify(assistantPayload) })
  writeLocal(messages)
}

export async function clearAllBrainMemory() {
  try {
    await apiFetch('/', { method: 'DELETE' })
  } catch {}

  try {
    localStorage.removeItem(LOCAL_KEY)
    localStorage.removeItem(LOCAL_STATS_KEY)
    sessionStorage.removeItem(BRAIN_HISTORY_KEY)
  } catch {}
}
