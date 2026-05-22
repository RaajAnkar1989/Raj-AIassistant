import { synthesizeEdgeSpeech } from '../scripts/edgeTtsCore.mjs'

/** Dev-server proxy: free Microsoft neural TTS (no API key). */
async function handleEdgeTts(req, res) {
  try {
    const chunks = []
    for await (const chunk of req) {
      chunks.push(chunk)
    }
    const raw = Buffer.concat(chunks).toString('utf8')
    const body = JSON.parse(raw || '{}')
    const buffer = await synthesizeEdgeSpeech(body)

    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Content-Length', String(buffer.length))
    res.statusCode = 200
    res.end(buffer)
  } catch (err) {
    res.statusCode = err.message === 'text required' ? 400 : 500
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
