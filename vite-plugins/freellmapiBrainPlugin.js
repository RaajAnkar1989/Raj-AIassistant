/** Dev proxy — route Raj brain calls to local FreeLLMAPI without CORS. */
const FREELLMAPI_URL = process.env.FREELLMAPI_URL || 'http://127.0.0.1:3001'

/** Vite dev server uses HTTP/2 — only forward safe response headers. */
const ALLOW_RESPONSE_HEADERS = new Set([
  'content-type',
  'content-length',
  'cache-control',
  'etag',
  'last-modified',
  'x-request-id',
])

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

async function proxyToFreeLLMAPI(req, res, upstreamPath, { includeAuth = false } = {}) {
  const target = `${FREELLMAPI_URL}${upstreamPath}`

  try {
    const headers = {}
    if (includeAuth && req.headers.authorization) headers.Authorization = req.headers.authorization
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
        error: {
          message:
            err?.message ||
            'FreeLLMAPI not running. Start it with: npm run dev',
        },
      }),
    )
  }
}

export function freellmapiBrainPlugin() {
  const attach = (server) => {
    server.middlewares.use(async (req, res, next) => {
      const url = req.url || ''

      if (url.startsWith('/api/brain/freellmapi-admin')) {
        const upstreamPath = url.replace('/api/brain/freellmapi-admin', '/api')
        await proxyToFreeLLMAPI(req, res, upstreamPath)
        return
      }

      if (!url.startsWith('/api/brain/freellmapi')) return next()

      const upstreamPath = url.replace('/api/brain/freellmapi', '/v1')
      await proxyToFreeLLMAPI(req, res, upstreamPath, { includeAuth: true })
    })
  }

  return {
    name: 'freellmapi-brain-proxy',
    configureServer: attach,
    configurePreviewServer: attach,
  }
}
