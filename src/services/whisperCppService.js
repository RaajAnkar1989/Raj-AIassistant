/**
 * whisper.cpp streaming STT client — WebSocket + MediaRecorder chunks
 */

const WHISPER_HTTP = import.meta.env.DEV
  ? 'http://127.0.0.1:8768'
  : import.meta.env.VITE_WHISPER_URL || ''

const WHISPER_WS = import.meta.env.DEV
  ? 'ws://127.0.0.1:8768/ws/stt'
  : import.meta.env.VITE_WHISPER_WS || ''

export async function probeWhisperCpp() {
  const base = WHISPER_HTTP
  if (!base) return { ok: false }
  try {
    const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(2500) })
    if (!res.ok) return { ok: false }
    return res.json()
  } catch {
    return { ok: false }
  }
}

function pickRecorderMime() {
  if (typeof MediaRecorder === 'undefined') return ''
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t
  }
  return ''
}

/** HTTP fallback — short clip transcribe */
export async function transcribeClip(blob) {
  const base = WHISPER_HTTP
  if (!base || !blob?.size) return ''
  const res = await fetch(`${base}/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream', 'X-Audio-Format': 'webm' },
    body: blob,
    signal: AbortSignal.timeout(25000),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Whisper transcribe failed')
  return String(data.text || '').trim()
}

/**
 * Streaming STT loop — sends audio chunks over WebSocket, receives partial/final text.
 */
export function startWhisperCppStream({
  stream,
  shouldContinue,
  isPaused,
  onPartial,
  onFinal,
  onListeningChange,
  onError,
  chunkMs = 1800,
}) {
  let ws = null
  let recorder = null
  let stopped = false
  let chunkTimer = null

  const connect = () =>
    new Promise((resolve, reject) => {
      if (!WHISPER_WS) {
        reject(new Error('Whisper WebSocket URL not configured'))
        return
      }
      ws = new WebSocket(WHISPER_WS)
      ws.binaryType = 'arraybuffer'
      const t = setTimeout(() => reject(new Error('Whisper WS timeout')), 5000)
      ws.onopen = () => {
        clearTimeout(t)
        resolve()
      }
      ws.onerror = () => {
        clearTimeout(t)
        reject(new Error('Whisper WS failed'))
      }
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data)
          if (msg.type === 'stt_partial' && msg.text) onPartial?.(msg.text)
          if (msg.type === 'stt_final' && msg.text) onFinal?.(msg.text)
          if (msg.type === 'stt_error') onError?.(new Error(msg.message))
        } catch {}
      }
    })

  const startRecorder = () => {
    const mime = pickRecorderMime()
    recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
    recorder.ondataavailable = async (e) => {
      if (!e.data?.size || stopped || isPaused?.()) return
      if (ws?.readyState === WebSocket.OPEN) {
        const buf = await e.data.arrayBuffer()
        ws.send(buf)
      }
    }
    recorder.start(300)
    chunkTimer = setInterval(() => {
      if (stopped || isPaused?.()) return
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'commit' }))
      }
    }, chunkMs)
  }

  const run = async () => {
    try {
      await connect()
      onListeningChange?.(true)
      startRecorder()
      while (!stopped && shouldContinue()) {
        if (isPaused?.()) {
          await new Promise((r) => setTimeout(r, 200))
          continue
        }
        await new Promise((r) => setTimeout(r, 400))
      }
    } catch (e) {
      if (!stopped) onError?.(e)
    } finally {
      onListeningChange?.(false)
      try {
        recorder?.stop()
      } catch {}
      clearInterval(chunkTimer)
      ws?.close()
    }
  }

  run()

  return () => {
    stopped = true
    try {
      recorder?.stop()
    } catch {}
    clearInterval(chunkTimer)
    ws?.close()
    onListeningChange?.(false)
  }
}

/** Clip-based loop (lower latency setup without WS) — 2s clips */
export function startWhisperCppClipLoop({
  stream,
  shouldContinue,
  isPaused,
  onTranscript,
  onListeningChange,
  onError,
  clipMs = 2200,
}) {
  let stopped = false
  const mime = pickRecorderMime()

  const recordClip = () =>
    new Promise((resolve, reject) => {
      let recorder
      try {
        recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      } catch (e) {
        reject(e)
        return
      }
      const chunks = []
      recorder.ondataavailable = (e) => {
        if (e.data?.size) chunks.push(e.data)
      }
      recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || mime || 'audio/webm' }))
      recorder.onerror = () => reject(new Error('Record failed'))
      recorder.start(200)
      setTimeout(() => {
        try {
          if (recorder.state === 'recording') recorder.stop()
        } catch {}
      }, clipMs)
    })

  const run = async () => {
    while (!stopped && shouldContinue()) {
      if (isPaused?.()) {
        await new Promise((r) => setTimeout(r, 250))
        continue
      }
      try {
        onListeningChange?.(true)
        const blob = await recordClip()
        onListeningChange?.(false)
        const text = await transcribeClip(blob)
        if (text.length >= 2) onTranscript(text)
      } catch (e) {
        onListeningChange?.(false)
        if (!stopped) onError?.(e)
        await new Promise((r) => setTimeout(r, 800))
      }
    }
    onListeningChange?.(false)
  }

  run()
  return () => {
    stopped = true
    onListeningChange?.(false)
  }
}
