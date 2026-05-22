import openaiService from './openaiService'
import { formatOpenAIError, isOpenAIQuotaError, markQuotaExceeded } from '../utils/openaiErrors'

function pickRecorderMime() {
  if (typeof MediaRecorder === 'undefined') return ''
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac', 'audio/mpeg']
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t
  }
  return ''
}

export function recordAudioClip(stream, durationMs = 5500) {
  return new Promise((resolve, reject) => {
    if (!stream?.active) {
      reject(new Error('Microphone stream not active'))
      return
    }
    const mime = pickRecorderMime()
    let recorder
    try {
      recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
    } catch (e) {
      reject(new Error('Recording not supported in this browser'))
      return
    }

    const chunks = []
    recorder.ondataavailable = (e) => {
      if (e.data?.size) chunks.push(e.data)
    }
    recorder.onstop = () => {
      const type = recorder.mimeType || mime || 'audio/webm'
      resolve(new Blob(chunks, { type }))
    }
    recorder.onerror = () => reject(new Error('Recording failed'))

    try {
      recorder.start(250)
    } catch (e) {
      reject(e)
      return
    }

    setTimeout(() => {
      try {
        if (recorder.state === 'recording') recorder.stop()
      } catch {}
    }, durationMs)
  })
}

export async function transcribeWhisper(blob) {
  if (!blob?.size || blob.size < 800) return ''

  const apiKey = openaiService.getApiKey()
  if (!apiKey) {
    throw new Error('Add ChatGPT API key in Settings on this device.')
  }

  const ext = blob.type.includes('mp4') || blob.type.includes('aac') ? 'm4a' : 'webm'
  const form = new FormData()
  form.append('file', blob, `voice.${ext}`)
  form.append('model', 'whisper-1')
  form.append('language', 'en')

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err.error?.message || `Whisper failed (${res.status})`
    if (res.status === 401) throw new Error('Invalid ChatGPT API key on this device.')
    if (isOpenAIQuotaError(msg) || res.status === 429) {
      markQuotaExceeded()
      const e = new Error(formatOpenAIError(msg))
      e.code = 'OPENAI_QUOTA'
      throw e
    }
    throw new Error(formatOpenAIError(msg))
  }

  const data = await res.json()
  return (data.text || '').trim()
}

/** Record → Whisper loop for iPhone (replaces browser SpeechRecognition). */
export function startWhisperListenLoop({
  stream,
  shouldContinue,
  isPaused,
  onTranscript,
  onListeningChange,
  onError,
  clipMs = 5500,
}) {
  let stopped = false

  const run = async () => {
    while (!stopped && shouldContinue()) {
      if (isPaused?.()) {
        await new Promise((r) => setTimeout(r, 350))
        continue
      }

      try {
        onListeningChange(true)
        const blob = await recordAudioClip(stream, clipMs)
        const text = await transcribeWhisper(blob)
        onListeningChange(false)

        if (text.length >= 2) {
          onTranscript(text)
        }
      } catch (e) {
        onListeningChange(false)
        if (!stopped) onError(e)
        await new Promise((r) => setTimeout(r, 1200))
      }

      await new Promise((r) => setTimeout(r, 300))
    }
    onListeningChange(false)
  }

  run()

  return () => {
    stopped = true
    onListeningChange(false)
  }
}
