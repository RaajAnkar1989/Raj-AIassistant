/** Dev proxy — route Raj brain calls to local Ollama (no CORS, no API key). */
const OLLAMA_URL = (process.env.OLLAMA_URL || 'http://127.0.0.1:11434').replace(/\/$/, '')

const ALLOW_RESPONSE_HEADERS = new Set([
  'content-type',
  'content-length',
  'cache-control',
])

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

async function proxyToOllama(req, res, upstreamPath) {
  const target = `${OLLAMA_URL}${upstreamPath}`

  try {
    const headers = {}
    if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type']

    const body =
      req.method === 'GET' || req.method === 'HEAD' ? undefined : await readBody(req)

    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
    })

    res.statusCode = upstream.status
    upstream.headers.forEach((value, key) => {
      if (!ALLOW_RESPONSE_HEADERS.has(key.toLowerCase())) return
      res.setHeader(key, value)
    })

    const buffer = Buffer.from(await upstream.arrayBuffer())
    if (!res.getHeader('content-type')) {
      res.setHeader('Content-Type', 'application/json')
    }
    if (!res.getHeader('content-length')) {
      res.setHeader('Content-Length', String(buffer.length))
    }
    res.end(buffer)
  } catch (err) {
    res.statusCode = 503
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        error: err?.message || 'Ollama not running. Start it with: ollama serve',
      }),
    )
  }
}

export function ollamaBrainPlugin() {
  const attach = (server) => {
    server.middlewares.use(async (req, res, next) => {
      const url = req.url?.split('?')[0] || ''
      if (!url.startsWith('/api/brain/ollama')) return next()

      const upstreamPath = url.replace('/api/brain/ollama', '') || '/'
      await proxyToOllama(req, res, upstreamPath)
    })
  }

  return {
    name: 'ollama-brain-proxy',
    configureServer: attach,
    configurePreviewServer: attach,
  }
}
