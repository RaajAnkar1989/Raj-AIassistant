/** Dev/preview proxy — Gemini from the browser often fails due to API key referrer rules. */
async function readJsonBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
}

async function handleGeminiProxy(req, res) {
  try {
    const apiKey = (req.headers['x-gemini-key'] || '').trim()
    if (!apiKey) {
      res.statusCode = 401
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: { message: 'Gemini API key missing. Add it in Settings → AI Brain.' } }))
      return
    }

    const { command, model = 'gemini-2.0-flash-lite', history = [], systemPrompt = '' } = await readJsonBody(req)
    if (!command?.trim()) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: { message: 'command required' } }))
      return
    }

    const contents = [
      ...history.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      { role: 'user', parts: [{ text: String(command).trim() }] },
    ]

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
        contents,
        generationConfig: {
          temperature: 0.4,
          responseMimeType: 'application/json',
        },
      }),
    })

    const text = await upstream.text()
    res.statusCode = upstream.status
    res.setHeader('Content-Type', 'application/json')
    res.end(text)
  } catch (err) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: { message: err?.message || 'Gemini proxy failed' } }))
  }
}

export function geminiBrainPlugin() {
  const attach = (server) => {
    server.middlewares.use(async (req, res, next) => {
      const path = req.url?.split('?')[0]
      if (path !== '/api/brain/gemini' || req.method !== 'POST') return next()
      await handleGeminiProxy(req, res)
    })
  }

  return {
    name: 'gemini-brain-proxy',
    configureServer: attach,
    configurePreviewServer: attach,
  }
}
