/** Proxy Raj memory API to your Mac (RAJ_MEMORY_URL = cloudflare tunnel to :8766). */
function upstreamPathFromRequest(url) {
  let path = url.pathname
  const marker = '/memory-api'
  const idx = path.indexOf(marker)
  if (idx >= 0) path = path.slice(idx + marker.length) || '/'
  else if (path.startsWith('/api/memory')) path = path.replace('/api/memory', '') || '/'
  if (!path.startsWith('/')) path = `/${path}`
  return `${path}${url.search}`
}

export default async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  const base = process.env.RAJ_MEMORY_URL?.replace(/\/$/, '')
  if (!base) {
    return Response.json(
      {
        error:
          'RAJ_MEMORY_URL not set. On Mac run memory server + tunnel, then npm run sync:ollama-netlify',
      },
      { status: 503 },
    )
  }

  const url = new URL(request.url)
  const target = `${base}${upstreamPathFromRequest(url)}`

  try {
    const headers = {}
    const ct = request.headers.get('content-type')
    if (ct) headers['Content-Type'] = ct

    const init = { method: request.method, headers }
    if (request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'DELETE') {
      init.body = await request.arrayBuffer()
    }

    const upstream = await fetch(target, init)
    const body = await upstream.arrayBuffer()
    return new Response(body, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'application/json',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    return Response.json(
      {
        error:
          err?.message ||
          'Memory server unreachable. Start npm run dev (memory on :8766) and tunnel port 8766.',
      },
      { status: 503 },
    )
  }
}
