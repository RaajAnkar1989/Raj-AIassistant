#!/usr/bin/env node
/** File-backed Raj brain memory — stored in data/raj-memory/ */
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const MEMORY_DIR = path.join(ROOT, 'data/raj-memory')
export const MEMORY_FILE = path.join(MEMORY_DIR, 'memory.json')

const MAX_STORED_MESSAGES = 5000
const DEFAULT_CONTEXT_MESSAGES = 50
const LONG_TERM_MAX_CHARS = 8000

function emptyMemory() {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    messages: [],
    notes: [],
  }
}

function ensureDir() {
  if (!existsSync(MEMORY_DIR)) mkdirSync(MEMORY_DIR, { recursive: true })
}

export function loadMemoryFile() {
  ensureDir()
  if (!existsSync(MEMORY_FILE)) return emptyMemory()
  try {
    const parsed = JSON.parse(readFileSync(MEMORY_FILE, 'utf8'))
    if (!parsed || typeof parsed !== 'object') return emptyMemory()
    return {
      ...emptyMemory(),
      ...parsed,
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
    }
  } catch {
    return emptyMemory()
  }
}

function saveMemoryFile(data) {
  ensureDir()
  const next = {
    ...data,
    updatedAt: new Date().toISOString(),
    messages: (data.messages || []).slice(-MAX_STORED_MESSAGES),
  }
  writeFileSync(MEMORY_FILE, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
  return next
}

export function getMemoryStats(data = loadMemoryFile()) {
  const userCount = data.messages.filter((m) => m.role === 'user').length
  return {
    messageCount: data.messages.length,
    userCount,
    noteCount: data.notes.length,
    updatedAt: data.updatedAt,
    path: MEMORY_FILE,
  }
}

export function appendExchange(userText, assistantPayload) {
  const data = loadMemoryFile()
  const at = new Date().toISOString()
  data.messages.push({ role: 'user', content: String(userText || ''), at })
  data.messages.push({
    role: 'assistant',
    content: JSON.stringify(assistantPayload || {}),
    at,
  })
  return saveMemoryFile(data)
}

export function addNote(text) {
  const data = loadMemoryFile()
  const trimmed = String(text || '').trim()
  if (!trimmed) return data
  data.notes.push({ text: trimmed, at: new Date().toISOString() })
  return saveMemoryFile(data)
}

export function clearMemoryFile() {
  ensureDir()
  try {
    if (existsSync(MEMORY_FILE)) unlinkSync(MEMORY_FILE)
  } catch {}
  return emptyMemory()
}

export function buildLongTermMemoryBlock(data = loadMemoryFile(), { maxChars = LONG_TERM_MAX_CHARS } = {}) {
  const lines = []
  for (const note of data.notes.slice(-100)) {
    lines.push(`- ${note.text}`)
  }
  const userMessages = data.messages.filter((m) => m.role === 'user').slice(-1500)
  for (const msg of userMessages) {
    const line = `- User said: ${msg.content.replace(/\s+/g, ' ').trim()}`
    lines.push(line.length > 220 ? `${line.slice(0, 217)}…` : line)
  }
  if (!lines.length) return ''
  let block = lines.join('\n')
  if (block.length > maxChars) {
    block = `…(older memory truncated)\n${block.slice(block.length - maxChars + 24)}`
  }
  return block
}

/** Messages for LLM chat API ({ role, content }). */
export function getContextMessages(limit = DEFAULT_CONTEXT_MESSAGES) {
  const data = loadMemoryFile()
  return data.messages.slice(-limit).map(({ role, content }) => ({ role, content }))
}

export function getMemoryForClient() {
  const data = loadMemoryFile()
  return {
    stats: getMemoryStats(data),
    longTermPreview: buildLongTermMemoryBlock(data, { maxChars: 800 }),
  }
}
