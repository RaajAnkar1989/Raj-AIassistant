#!/usr/bin/env node
/**
 * Local Piper TTS on :8769 — fully offline neural voice
 *
 * Setup:
 *   brew install piper   OR download from https://github.com/rhasspy/piper
 *   export PIPER_MODEL=~/piper/en_US-lessac-medium.onnx
 *   export PIPER_CONFIG=~/piper/en_US-lessac-medium.onnx.json
 */
import http from 'node:http'
import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PORT = Number(process.env.PIPER_PORT || 8769)
const PIPER_BIN = process.env.PIPER_BIN || findPiperBin()
const PIPER_MODEL = process.env.PIPER_MODEL || findDefaultModel()
const PIPER_CONFIG = process.env.PIPER_CONFIG || `${PIPER_MODEL}.json`

function findPiperBin() {
  const candidates = [
    path.join(ROOT, 'tools/chatterbox/.venv/bin/piper'),
    path.join(ROOT, 'tools/piper/piper/piper'),
    '/opt/homebrew/bin/piper',
    '/usr/local/bin/piper',
    'piper',
  ]
  for (const bin of candidates) {
    if (bin.includes('/') && existsSync(bin)) return bin
    if (!bin.includes('/')) {
      const r = spawnSync('which', [bin], { encoding: 'utf8' })
      if (r.status === 0 && r.stdout.trim()) return r.stdout.trim()
    }
  }
  return ''
}

function findDefaultModel() {
  const candidates = [
    path.join(ROOT, 'tools/piper/en_GB-alan-medium.onnx'),
    path.join(ROOT, 'tools/piper/en_US-lessac-medium.onnx'),
    path.join(process.env.HOME || '', 'piper/en_GB-alan-medium.onnx'),
  ]
  return candidates.find((p) => existsSync(p)) || ''
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function synthesizePiper(text) {
  if (!PIPER_BIN || !existsSync(PIPER_BIN)) {
    throw new Error('Piper not found. Install: brew install piper — or set PIPER_BIN + PIPER_MODEL')
  }
  if (!PIPER_MODEL || !existsSync(PIPER_MODEL)) {
    throw new Error(`Piper model missing: ${PIPER_MODEL || '(unset)'}`)
  }

  return new Promise((resolve, reject) => {
    const args = ['--model', PIPER_MODEL, '--output_file', '-']
    if (existsSync(PIPER_CONFIG)) args.push('--config', PIPER_CONFIG)

    const child = spawn(PIPER_BIN, args, { stdio: ['pipe', 'pipe', 'pipe'] })
    const out = []
    const err = []

    child.stdout.on('data', (c) => out.push(c))
    child.stderr.on('data', (c) => err.push(c))
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(Buffer.concat(err).toString() || 'piper failed'))
        return
      }
      resolve(Buffer.concat(out))
    })

    child.stdin.write(String(text || '').trim())
    child.stdin.end()
  })
}

const server = http.createServer(async (req, res) => {
  cors(res)
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const url = new URL(req.url || '/', `http://localhost:${PORT}`)

  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        ok: Boolean(PIPER_BIN && PIPER_MODEL),
        piperBin: PIPER_BIN || null,
        model: PIPER_MODEL || null,
      })
    )
    return
  }

  if (url.pathname === '/synthesize' && req.method === 'POST') {
    try {
      const raw = await readBody(req)
      const body = JSON.parse(raw || '{}')
      const text = String(body.text || '').trim()
      if (!text) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'text required' }))
        return
      }
      const wav = await synthesizePiper(text)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          audioBase64: wav.toString('base64'),
          mime: 'audio/wav',
        })
      )
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: e.message }))
    }
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not found' }))
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[piper] http://127.0.0.1:${PORT}/synthesize`)
  if (!PIPER_BIN) console.warn('[piper] PIPER_BIN not set — install Piper for local TTS')
})
