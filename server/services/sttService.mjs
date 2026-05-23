import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

const WHISPER_URL = (process.env.WHISPER_URL || 'http://127.0.0.1:8768').replace(/\/$/, '')

export function getSttBackend() {
  return process.env.JARVIS_STT || 'whisper.cpp'
}

export async function probeWhisperServer() {
  try {
    const res = await fetch(`${WHISPER_URL}/health`, { signal: AbortSignal.timeout(2000) })
    if (!res.ok) return { ok: false }
    return res.json()
  } catch {
    return { ok: false }
  }
}

export async function transcribeAudioBuffer(buffer, ext = 'webm') {
  const res = await fetch(`${WHISPER_URL}/transcribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'X-Audio-Format': ext,
    },
    body: buffer,
    signal: AbortSignal.timeout(30000),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Whisper STT failed (${res.status})`)
  return String(data.text || '').trim()
}

export function whisperConfigured() {
  const bin = process.env.WHISPER_CPP_BIN || ''
  const model = process.env.WHISPER_MODEL || ''
  if (bin && model && existsSync(bin) && existsSync(model)) return true
  const r = spawnSync('which', ['whisper-cli'], { encoding: 'utf8' })
  return r.status === 0
}
