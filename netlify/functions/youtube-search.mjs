const INVIDIOUS = [
  'https://inv.nadeko.net',
  'https://yewtu.be',
  'https://invidious.fdn.fr',
  'https://invidious.privacydev.net',
]

const PIPED = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.in.projectsegfau.lt',
]

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  }
}

async function fetchJson(url, timeoutMs = 8000) {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function searchInvidious(q) {
  for (const base of INVIDIOUS) {
    try {
      const data = await fetchJson(
        `${base}/api/v1/search?q=${encodeURIComponent(q)}&type=video&sort=relevance`
      )
      const first = Array.isArray(data) ? data[0] : null
      const videoId = first?.videoId
      if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return { videoId, title: first.title || q, source: 'invidious' }
      }
    } catch {
      /* try next */
    }
  }
  return null
}

async function searchPiped(q) {
  for (const base of PIPED) {
    try {
      const data = await fetchJson(`${base}/search?q=${encodeURIComponent(q)}&filter=music_songs`)
      const first = data?.items?.[0]
      const videoId =
        first?.url?.match(/[?&]v=([^&]+)/)?.[1] ||
        (typeof first?.id === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(first.id) ? first.id : null)
      if (videoId) return { videoId, title: first.title || q, source: 'piped' }
    } catch {
      /* try next */
    }
  }
  return null
}

export async function handler(event) {
  const q = (event.queryStringParameters?.q || '').trim()
  if (!q) return json(400, { error: 'Missing q parameter' })

  const hit = (await searchInvidious(q)) || (await searchPiped(q))
  if (!hit) return json(404, { error: 'No video found', query: q })
  return json(200, hit)
}
