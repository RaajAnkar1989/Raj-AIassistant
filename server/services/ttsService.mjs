import { synthesizeEdgeSpeech } from '../../scripts/edgeTtsCore.mjs'
import { DEFAULT_FREE_VOICE } from '../../src/constants/freeVoices.js'

const PIPER_URL = (process.env.PIPER_URL || 'http://127.0.0.1:8769').replace(/\/$/, '')

/** Split streaming text into speakable sentences */
export function extractSentences(buffer, { minLen = 12 } = {}) {
  const sentences = []
  let rest = buffer
  const re = /([^.!?…]+[.!?…]+)\s*/g
  let m
  while ((m = re.exec(buffer)) !== null) {
    const s = m[1].trim()
    if (s.length >= minLen) sentences.push(s)
  }
  const lastBreak = Math.max(buffer.lastIndexOf('.'), buffer.lastIndexOf('!'), buffer.lastIndexOf('?'))
  if (lastBreak >= 0) {
    rest = buffer.slice(lastBreak + 1)
  } else {
    rest = buffer
  }
  return { sentences, rest }
}

async function synthesizePiper(text) {
  const res = await fetch(`${PIPER_URL}/synthesize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(15000),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Piper failed (${res.status})`)
  return { audioBase64: data.audioBase64, mime: data.mime || 'audio/wav' }
}

export async function probePiperServer() {
  try {
    const res = await fetch(`${PIPER_URL}/health`, { signal: AbortSignal.timeout(2000) })
    if (!res.ok) return { ok: false }
    return res.json()
  } catch {
    return { ok: false }
  }
}

export async function synthesizeSentence(text, voice = DEFAULT_FREE_VOICE) {
  const spoken = String(text || '').trim()
  if (!spoken) return { audioBase64: '', mime: 'audio/mpeg' }

  const jarvisVoice = voice || process.env.JARVIS_TTS_VOICE || DEFAULT_FREE_VOICE

  try {
    const audio = await synthesizeEdgeSpeech({ text: spoken, voice: jarvisVoice, rate: 1.08 })
    return { audioBase64: audio.toString('base64'), mime: 'audio/mpeg' }
  } catch (e) {
    console.warn('[Jarvis TTS] Edge unavailable, using Piper:', e.message)
  }

  return synthesizePiper(spoken)
}

export function splitForImmediateTts(text) {
  const trimmed = String(text || '').trim()
  if (!trimmed) return []
  const parts = trimmed.split(/(?<=[.!?…])\s+/).filter((p) => p.trim().length >= 8)
  return parts.length ? parts : [trimmed]
}
