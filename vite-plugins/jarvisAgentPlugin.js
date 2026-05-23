/** Dev proxy — Jarvis agent WebSocket + HTTP on :8787 */
const AGENT_URL = (process.env.JARVIS_AGENT_URL || 'http://127.0.0.1:8787').replace(/\/$/, '')

const ALLOW_RESPONSE_HEADERS = new Set([
  'content-type',
  'content-length',
  'cache-control',
])

export function jarvisAgentPlugin() {
  return {
    name: 'jarvis-agent-proxy',
    configureServer(server) {
      server.middlewares.use('/api/agent', async (req, res, next) => {
        const path = req.url || '/'
        const target = `${AGENT_URL}/api/agent${path}`

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.end()
          return
        }

        try {
          const headers = {}
          if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type']
          if (req.headers.accept) headers.Accept = req.headers.accept

          const chunks = []
          for await (const chunk of req) chunks.push(chunk)
          const body = chunks.length ? Buffer.concat(chunks) : undefined

          const upstream = await fetch(target, { method: req.method, headers, body })
          res.statusCode = upstream.status
          upstream.headers.forEach((v, k) => {
            if (!ALLOW_RESPONSE_HEADERS.has(k.toLowerCase())) return
            res.setHeader(k, v)
          })
          const buf = Buffer.from(await upstream.arrayBuffer())
          res.end(buf)
        } catch (err) {
          res.statusCode = 503
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: err.message || 'Jarvis agent offline. Run: npm run agent' }))
        }
      })
    },
  }
}
