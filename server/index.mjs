import http from 'node:http'
import { WebSocketServer } from 'ws'
import { PORT } from './config.mjs'
import { handleUserMessage, handleSseMessage, handleTtsRequest } from './services/streamService.mjs'
import { listModels } from './services/ollamaClient.mjs'
import { FAST_MODEL, SMART_MODEL } from './config.mjs'
import { probeWhisperServer } from './services/sttService.mjs'
import { probePiperServer } from './services/ttsService.mjs'

const activeSessions = new Map()
const pendingToolResults = new Map()

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function waitForToolResult(sessionId, step, signal) {
  const key = `${sessionId}:${step}`
  return new Promise((resolve, reject) => {
    pendingToolResults.set(key, { resolve, reject })
    const onAbort = () => {
      pendingToolResults.delete(key)
      const err = new Error('Aborted')
      err.name = 'AbortError'
      reject(err)
    }
    if (signal?.aborted) {
      onAbort()
      return
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

async function handleHttp(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)

  if (url.pathname === '/health') {
    let ollama = false
    let models = []
    try {
      models = await listModels()
      ollama = models.length > 0
    } catch {}
    const [whisper, piper] = await Promise.all([probeWhisperServer(), probePiperServer()])
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        ok: true,
        ollama,
        models: models.slice(0, 8),
        fast: FAST_MODEL,
        smart: SMART_MODEL,
        whisper,
        piper,
        react: true,
      })
    )
    return
  }

  if (url.pathname === '/api/agent/chat' && req.method === 'POST') {
    const raw = await readBody(req)
    let body = {}
    try {
      body = JSON.parse(raw || '{}')
    } catch {}
    const accept = req.headers.accept || ''
    if (accept.includes('text/event-stream')) {
      await handleSseMessage(body.text || body.message || '', res)
      return
    }
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Use WebSocket or Accept: text/event-stream' }))
    return
  }

  if (url.pathname === '/api/agent/tts' && req.method === 'POST') {
    const raw = await readBody(req)
    let body = {}
    try {
      body = JSON.parse(raw || '{}')
    } catch {}
    try {
      const result = await handleTtsRequest(body.text, body.voice)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(result))
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: e.message }))
    }
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not found' }))
}

const server = http.createServer(handleHttp)
const wss = new WebSocketServer({ server, path: '/ws/agent' })

wss.on('connection', (ws) => {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const controller = new AbortController()
  activeSessions.set(id, { controller, ws })

  ws.send(
    JSON.stringify({
      type: 'ready',
      sessionId: id,
      states: ['idle', 'listening', 'thinking', 'speaking'],
      features: ['streaming', 'react', 'piper', 'whisper'],
    })
  )

  ws.on('message', async (raw) => {
    let msg
    try {
      msg = JSON.parse(String(raw))
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }))
      return
    }

    if (msg.type === 'cancel') {
      controller.abort()
      const next = new AbortController()
      activeSessions.set(id, { controller: next, ws })
      ws.send(JSON.stringify({ type: 'state', state: 'idle' }))
      return
    }

    if (msg.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong' }))
      return
    }

    if (msg.type === 'tool_result') {
      const key = `${id}:${msg.step}`
      const pending = pendingToolResults.get(key)
      if (pending) {
        pendingToolResults.delete(key)
        pending.resolve(String(msg.result ?? msg.message ?? 'ok'))
      }
      return
    }

    if (msg.type === 'user_message') {
      const session = activeSessions.get(id)
      try {
        await handleUserMessage(ws, msg.text || msg.message, {
          signal: session?.controller?.signal,
          waitForToolResult: (step, signal) => waitForToolResult(id, step, signal),
        })
      } catch (e) {
        if (e.name !== 'AbortError') {
          ws.send(JSON.stringify({ type: 'error', message: e.message || 'Agent failed' }))
          ws.send(JSON.stringify({ type: 'done', mode: 'error' }))
        }
      }
    }
  })

  ws.on('close', () => {
    controller.abort()
    activeSessions.delete(id)
    for (const key of pendingToolResults.keys()) {
      if (key.startsWith(`${id}:`)) pendingToolResults.delete(key)
    }
  })
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[jarvis-agent] http://127.0.0.1:${PORT}  ws://127.0.0.1:${PORT}/ws/agent`)
})

export { server, wss }
