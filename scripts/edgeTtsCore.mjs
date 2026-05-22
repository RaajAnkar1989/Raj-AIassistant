import { DEFAULT_FREE_VOICE } from '../src/constants/freeVoices.js'

export function formatEdgeRate(rate) {
  if (rate == null || Number.isNaN(Number(rate))) return undefined
  const pct = Math.round((Number(rate) - 1) * 100)
  if (pct === 0) return undefined
  return `${pct >= 0 ? '+' : ''}${pct}%`
}

export function formatEdgePitch(pitch) {
  if (pitch == null || Number.isNaN(Number(pitch))) return undefined
  const hz = Math.round((Number(pitch) - 1) * 50)
  if (hz === 0) return undefined
  return `${hz >= 0 ? '+' : ''}${hz}Hz`
}

export function trimForSpeech(text, maxLen = 180) {
  const t = String(text || '').trim()
  if (!t) return ''
  if (t.length <= maxLen) return t
  const cut = t.slice(0, maxLen)
  const lastPeriod = cut.lastIndexOf('.')
  if (lastPeriod > 40) return cut.slice(0, lastPeriod + 1)
  return `${cut.trim()}…`
}

/** Shared Edge TTS synthesis — used by Vite dev proxy and Netlify function. */
export async function synthesizeEdgeSpeech(body = {}) {
  const spoken = trimForSpeech(body.text)
  if (!spoken) {
    throw new Error('text required')
  }

  const voice = body.voice || body.azureVoiceName || DEFAULT_FREE_VOICE
  const { EdgeTTS } = await import('edge-tts-universal')

  const prosody = {}
  const edgeRate = formatEdgeRate(body.rate)
  const edgePitch = formatEdgePitch(body.pitch)
  if (edgeRate) prosody.rate = edgeRate
  if (edgePitch) prosody.pitch = edgePitch

  const tts = new EdgeTTS(spoken, voice, prosody)
  const result = await tts.synthesize()
  return Buffer.from(await result.audio.arrayBuffer())
}
