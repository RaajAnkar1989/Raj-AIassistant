#!/usr/bin/env node
/**
 * Local whisper.cpp STT — HTTP + WebSocket streaming on :8768
 *
 * Setup (once):
 *   brew install ffmpeg
 *   # whisper.cpp: clone & build, or set WHISPER_CPP_BIN + WHISPER_MODEL
 *   export WHISPER_CPP_BIN=~/whisper.cpp/build/bin/whisper-cli
 *   export WHISPER_MODEL=~/whisper.cpp/models/ggml-base.en.bin
 */
import http from 'node:http'
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync, unlinkSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { WebSocketServer } from 'ws'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PORT = Number(process.env.WHISPER_PORT || 8768)
const TMP = path.join(ROOT, '.tmp/whisper')
const WHISPER_BIN = process.env.WHISPER_CPP_BIN || findWhisperBin()
const WHISPER_MODEL =
  process.env.WHISPER_MODEL ||
  process.env.WHISPER_CPP_MODEL ||
  findDefaultModel()

function findWhisperBin() {
  const candidates = [
    path.join(ROOT, 'tools/whisper.cpp/build/bin/whisper-cli'),
    path.join(ROOT, 'tools/whisper.cpp/main'),
    '/opt/homebrew/bin/whisper-cli',
    '/usr/local/bin/whisper-cli',
    'whisper-cli',
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
    path.join(ROOT, 'tools/whisper.cpp/models/ggml-base.en.bin'),
    path.join(ROOT, 'tools/whisper.cpp/models/ggml-small.en.bin'),
    path.join(process.env.HOME || '', 'whisper.cpp/models/ggml-base.en.bin'),
  ]
  return candidates.find((p) => existsSync(p)) || ''
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function readBodyBuffer(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function hasFfmpeg() {
  const r = spawnSync('which', ['ffmpeg'], { encoding: 'utf8' })
  return r.status === 0
}

async function toWav16k(inputPath, outputPath) {
  if (!hasFfmpeg()) {
    throw new Error('ffmpeg required for STT. Install: brew install ffmpeg')
  }
  return new Promise((resolve, reject) => {
    const ff = spawn(
      'ffmpeg',
      ['-y', '-i', inputPath, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', outputPath],
      { stdio: 'ignore' }
    )
    ff.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('ffmpeg conversion failed'))))
    ff.on('error', reject)
  })
}

function runWhisper(wavPath) {
  if (!WHISPER_BIN || !existsSync(WHISPER_BIN)) {
    throw new Error(
      'whisper.cpp not found. Set WHISPER_CPP_BIN and WHISPER_MODEL — see scripts/whisper_server.mjs header'
    )
  }
  if (!WHISPER_MODEL || !existsSync(WHISPER_MODEL)) {
    throw new Error(`Whisper model missing: ${WHISPER_MODEL || '(unset)'}`)
  }

  const result = spawnSync(
    WHISPER_BIN,
    ['-m', WHISPER_MODEL, '-f', wavPath, '-l', 'en', '--no-timestamps', '-nt'],
    { encoding: 'utf8', maxBuffer: 1024 * 1024 }
  )

  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || 'whisper-cli failed')
  }

  return (result.stdout || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join(' ')
    .trim()
}

async function transcribeBuffer(audioBuffer, ext = 'webm') {
  mkdirSync(TMP, { recursive: true })
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const inPath = path.join(TMP, `${id}.${ext}`)
  const wavPath = path.join(TMP, `${id}.wav`)

  try {
    writeFileSync(inPath, audioBuffer)
    await toWav16k(inPath, wavPath)
    return runWhisper(wavPath)
  } finally {
    for (const p of [inPath, wavPath]) {
      try {
        unlinkSync(p)
      } catch {}
    }
  }
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
        ok: Boolean(WHISPER_BIN && WHISPER_MODEL),
        whisperBin: WHISPER_BIN || null,
        model: WHISPER_MODEL || null,
        ffmpeg: hasFfmpeg(),
      })
    )
    return
  }

  if (url.pathname === '/transcribe' && req.method === 'POST') {
    try {
      const buf = await readBodyBuffer(req)
      if (buf.length < 400) {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ text: '' }))
        return
      }
      const ext = req.headers['x-audio-format'] || 'webm'
      const text = await transcribeBuffer(buf, ext)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ text }))
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: e.message }))
    }
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not found' }))
})

const wss = new WebSocketServer({ server, path: '/ws/stt' })

wss.on('connection', (ws) => {
  let chunks = []
  let chunkBytes = 0
  let transcribing = false

  ws.send(JSON.stringify({ type: 'ready', backend: 'whisper.cpp' }))

  const flush = async (final = false) => {
    if (transcribing || chunkBytes < 800) return
    transcribing = true
    const buf = Buffer.concat(chunks)
    chunks = []
    chunkBytes = 0
    try {
      const text = await transcribeBuffer(buf, 'webm')
      if (text.length >= 2) {
        ws.send(JSON.stringify({ type: final ? 'stt_final' : 'stt_partial', text }))
      }
    } catch (e) {
      ws.send(JSON.stringify({ type: 'stt_error', message: e.message }))
    } finally {
      transcribing = false
    }
  }

  ws.on('message', async (data, isBinary) => {
    if (!isBinary) {
      try {
        const msg = JSON.parse(String(data))
        if (msg.type === 'commit') await flush(true)
        if (msg.type === 'ping') ws.send(JSON.stringify({ type: 'pong' }))
      } catch {}
      return
    }
    chunks.push(Buffer.from(data))
    chunkBytes += data.length
    if (chunkBytes >= 24000) await flush(false)
  })
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[whisper] http://127.0.0.1:${PORT}  ws://127.0.0.1:${PORT}/ws/stt`)
  if (!WHISPER_BIN) console.warn('[whisper] WHISPER_CPP_BIN not set — STT will fail until configured')
  if (!WHISPER_MODEL) console.warn('[whisper] WHISPER_MODEL not set')
})
