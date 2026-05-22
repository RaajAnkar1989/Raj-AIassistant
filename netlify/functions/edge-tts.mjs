import { synthesizeEdgeSpeech } from '../../scripts/edgeTtsCore.mjs'

/** Bundled Jarvis neural voice on Netlify — same /api/tts/edge path as local dev. */
export default async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await request.json()
    const audio = await synthesizeEdgeSpeech(body)
    return new Response(audio, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    const status = err.message === 'text required' ? 400 : 500
    return new Response(JSON.stringify({ error: err?.message || 'Edge TTS failed' }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
