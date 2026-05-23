#!/usr/bin/env node
/** Check local Ollama and pick a Qwen model if available. */
import { pickInstalledOllamaModel } from '../src/utils/ollamaModelPick.js'

const OLLAMA_URL = (process.env.OLLAMA_URL || 'http://127.0.0.1:11434').replace(/\/$/, '')
const DEFAULT_MODEL = process.env.VITE_OLLAMA_MODEL || process.env.OLLAMA_MODEL || 'llama3.2:latest'

function pickDefaultModel(names) {
  return pickInstalledOllamaModel(names, DEFAULT_MODEL)
}

export async function isOllamaRunning() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}

export async function discoverOllama() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) })
    if (!res.ok) return { running: false, models: [], model: DEFAULT_MODEL }
    const data = await res.json()
    const names = (data.models || []).map((m) => m.name).filter(Boolean)
    const model = pickDefaultModel(names)
    return { running: true, models: names, model, baseUrl: OLLAMA_URL }
  } catch {
    return { running: false, models: [], model: DEFAULT_MODEL, baseUrl: OLLAMA_URL }
  }
}
