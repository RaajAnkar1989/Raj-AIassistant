/** Proxy Raj brain calls to your Mac Ollama (OLLAMA_URL = Cloudflare/ngrok tunnel). */
const ALLOW_HEADERS = new Set(['content-type', 'content-length', 'cache-control'])

function upstreamPathFromRequest(url) {
  let path = url.pathname
  const marker = '/ollama-brain'
  const idx = path.indexOf(marker)
  if (idx >= 0) path = path.slice(idx + marker.length) || '/'
  else if (path.startsWith('/api/brain/ollama')) path = path.replace('/api/brain/ollama', '') || '/'
  if (!path.startsWith('/')) path = `/${path}`
  return `${path}${url.search}`
}

export default async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  const ollamaBase = process.env.OLLAMA_URL?.replace(/\/$/, '')
  if (!ollamaBase) {
    return new Response(
      JSON.stringify({
        error:
          'OLLAMA_URL not set on Netlify. On your Mac run: npm run tunnel:ollama then npm run sync:ollama-netlify',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const url = new URL(request.url)
  const target = `${ollamaBase}${upstreamPathFromRequest(url)}`

  try {
    const headers = { Host: 'localhost:11434' }
    const ct = request.headers.get('content-type')
    if (ct) headers['Content-Type'] = ct

    const init = { method: request.method, headers }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      init.body = await request.arrayBuffer()
    }

    const upstream = await fetch(target, init)
    const body = await upstream.arrayBuffer()
    const outHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    }
    upstream.headers.forEach((value, key) => {
      if (ALLOW_HEADERS.has(key.toLowerCase())) outHeaders[key] = value
    })
    if (!outHeaders['Content-Type']) outHeaders['Content-Type'] = 'application/json'

    return new Response(body, { status: upstream.status, headers: outHeaders })
  } catch (err) {
    return new Response(
      JSON.stringify({
        error:
          err?.message ||
          'Ollama unreachable. Keep your Mac on with ollama serve and npm run tunnel:ollama running.',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
