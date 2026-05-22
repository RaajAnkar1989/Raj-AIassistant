/** Dev-server proxy: local Chatterbox TTS (free, runs on your Mac). */
const CHATTERBOX_URL = process.env.CHATTERBOX_URL || 'http://127.0.0.1:8765'

export function chatterboxTtsPlugin() {
  return {
    name: 'chatterbox-tts-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0]
        if (url !== '/api/tts/chatterbox' || req.method !== 'POST') {
          return next()
        }

        try {
          const chunks = []
          for await (const chunk of req) {
            chunks.push(chunk)
          }
          const raw = Buffer.concat(chunks).toString('utf8')
          const payload = JSON.parse(raw || '{}')

          const upstream = await fetch(`${CHATTERBOX_URL}/api/tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })

          if (!upstream.ok) {
            const detail = await upstream.text()
            res.statusCode = upstream.status
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: detail || 'Chatterbox TTS failed' }))
            return
          }

          const buffer = Buffer.from(await upstream.arrayBuffer())
          res.setHeader('Content-Type', upstream.headers.get('content-type') || 'audio/wav')
          res.statusCode = 200
          res.end(buffer)
        } catch (err) {
          res.statusCode = 503
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              error:
                err?.message ||
                'Chatterbox server not running. Start it with: npm run chatterbox',
            }),
          )
        }
      })
    },
  }
}
