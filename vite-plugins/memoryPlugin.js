/** Dev proxy — /api/memory → local memory server (file-backed folder). */
const MEMORY_URL = (process.env.RAJ_MEMORY_URL || 'http://127.0.0.1:8766').replace(/\/$/, '')

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

async function proxyMemory(req, res, upstreamPath) {
  const target = `${MEMORY_URL}${upstreamPath}`

  try {
    const headers = {}
    if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type']

    const body =
      req.method === 'GET' || req.method === 'HEAD' || req.method === 'DELETE'
        ? undefined
        : await readBody(req)

    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
    })

    const buffer = Buffer.from(await upstream.arrayBuffer())
    res.statusCode = upstream.status
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json')
    res.setHeader('Cache-Control', 'no-store')
    res.end(buffer)
  } catch (err) {
    res.statusCode = 503
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: err?.message || 'Memory server not running' }))
  }
}

export function memoryPlugin() {
  const attach = (server) => {
    server.middlewares.use(async (req, res, next) => {
      const url = req.url?.split('?')[0] || ''
      if (!url.startsWith('/api/memory')) return next()

      const upstreamPath = url.replace('/api/memory', '') || '/'
      await proxyMemory(req, res, upstreamPath)
    })
  }

  return {
    name: 'raj-memory-proxy',
    configureServer: attach,
    configurePreviewServer: attach,
  }
}
