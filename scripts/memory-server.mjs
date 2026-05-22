#!/usr/bin/env node
/** Local HTTP API for Raj brain memory (file-backed). Port 8766 */
import http from 'node:http'
import {
  addNote,
  appendExchange,
  buildLongTermMemoryBlock,
  clearMemoryFile,
  getMemoryForClient,
  getContextMessages,
  MEMORY_DIR,
} from './memoryStore.mjs'

const PORT = Number(process.env.RAJ_MEMORY_PORT || 8766)

function sendJson(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(payload)
}

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  if (!chunks.length) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    return null
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`)
  const path = url.pathname.replace(/\/$/, '') || '/'

  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {})
    return
  }

  try {
    if (req.method === 'GET' && path === '/') {
      sendJson(res, 200, getMemoryForClient())
      return
    }

    if (req.method === 'GET' && path === '/context') {
      sendJson(res, 200, { messages: getContextMessages() })
      return
    }

    if (req.method === 'GET' && path === '/long-term') {
      sendJson(res, 200, { block: buildLongTermMemoryBlock() })
      return
    }

    if (req.method === 'POST' && path === '/append') {
      const body = await readBody(req)
      if (body === null) {
        sendJson(res, 400, { error: 'Invalid JSON' })
        return
      }
      const data = appendExchange(body.user, body.assistant)
      sendJson(res, 200, { ok: true, stats: getMemoryForClient().stats })
      return
    }

    if (req.method === 'POST' && path === '/note') {
      const body = await readBody(req)
      if (body === null || !body.text?.trim()) {
        sendJson(res, 400, { error: 'text required' })
        return
      }
      addNote(body.text)
      sendJson(res, 200, { ok: true, stats: getMemoryForClient().stats })
      return
    }

    if (req.method === 'DELETE' && path === '/') {
      clearMemoryFile()
      sendJson(res, 200, { ok: true, stats: getMemoryForClient().stats })
      return
    }

    sendJson(res, 404, { error: 'Not found' })
  } catch (err) {
    sendJson(res, 500, { error: err?.message || 'Memory server error' })
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[memory] Raj memory API http://127.0.0.1:${PORT}`)
  console.log(`[memory] Folder: ${MEMORY_DIR}`)
})
