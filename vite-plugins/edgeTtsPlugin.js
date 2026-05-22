/** Dev-server proxy: free Microsoft neural TTS (no API key). */
function formatEdgeRate(rate) {
  if (rate == null || Number.isNaN(Number(rate))) return undefined
  const pct = Math.round((Number(rate) - 1) * 100)
  if (pct === 0) return undefined
  return `${pct >= 0 ? '+' : ''}${pct}%`
}

function formatEdgePitch(pitch) {
  if (pitch == null || Number.isNaN(Number(pitch))) return undefined
  const hz = Math.round((Number(pitch) - 1) * 50)
  if (hz === 0) return undefined
  return `${hz >= 0 ? '+' : ''}${hz}Hz`
}

async function handleEdgeTts(req, res) {
  try {
    const chunks = []
    for await (const chunk of req) {
      chunks.push(chunk)
    }
    const raw = Buffer.concat(chunks).toString('utf8')
    const { text, voice = 'en-IN-NeerjaNeural', rate, pitch } = JSON.parse(raw || '{}')

    if (!text || !String(text).trim()) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'text required' }))
      return
    }

    const { EdgeTTS } = await import('edge-tts-universal')
    const prosody = {}
    const edgeRate = formatEdgeRate(rate)
    const edgePitch = formatEdgePitch(pitch)
    if (edgeRate) prosody.rate = edgeRate
    if (edgePitch) prosody.pitch = edgePitch

    const tts = new EdgeTTS(String(text).trim(), voice, prosody)
    const result = await tts.synthesize()
    const buffer = Buffer.from(await result.audio.arrayBuffer())

    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Content-Length', String(buffer.length))
    res.statusCode = 200
    res.end(buffer)
  } catch (err) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: err?.message || 'Edge TTS failed' }))
  }
}

export function edgeTtsPlugin() {
  const attach = (server) => {
    server.middlewares.use(async (req, res, next) => {
      const url = req.url?.split('?')[0]
      if (url !== '/api/tts/edge' || req.method !== 'POST') {
        return next()
      }
      await handleEdgeTts(req, res)
    })
  }

  return {
    name: 'edge-tts-proxy',
    configureServer: attach,
    configurePreviewServer: attach,
  }
}
