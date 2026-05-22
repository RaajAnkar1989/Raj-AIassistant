#!/usr/bin/env node
/** One command: Raj app + Chatterbox voice + Ollama brain (local). FreeLLMAPI optional fallback. */
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ensureFreeLLMAPI, hasChatterbox, hasFreeLLMAPI } from './ensure-local-services.mjs'
import { discoverFreeLLMAPI, isFreeLLMAPIRunning } from './discover-freellmapi.mjs'
import { discoverOllama } from './discover-ollama.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FREELLM_DIR = path.join(ROOT, 'tools/freellmapi')
const CHATTERBOX_PY = path.join(ROOT, 'tools/chatterbox/.venv/bin/python')
const CHATTERBOX_SERVER = path.join(ROOT, 'scripts/chatterbox_server.py')

const children = []
let shuttingDown = false
let freellmapiBaseUrl = process.env.FREELLMAPI_URL || 'http://127.0.0.1:3001'

function log(label, message) {
  console.log(`[${label}] ${message}`)
}

function pipe(label, child) {
  const prefix = (line) => `[${label}] ${line}`
  child.stdout?.on('data', (chunk) => {
    for (const line of chunk.toString().split('\n')) {
      if (line.trim()) process.stdout.write(`${prefix(line)}\n`)
    }
  })
  child.stderr?.on('data', (chunk) => {
    for (const line of chunk.toString().split('\n')) {
      if (line.trim()) process.stderr.write(`${prefix(line)}\n`)
    }
  })
  child.on('exit', (code, signal) => {
    if (shuttingDown) return
    if (code && code !== 0) {
      console.error(`[${label}] exited (${signal || code})`)
      shutdown(code || 1)
    }
  })
  children.push(child)
  return child
}

function spawnService(label, command, args, options = {}) {
  log(label, `starting…`)
  return pipe(
    label,
    spawn(command, args, {
      cwd: options.cwd || ROOT,
      env: { ...process.env, FREELLMAPI_URL: freellmapiBaseUrl, ...options.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    }),
  )
}

function shutdown(code = 0) {
  if (shuttingDown) return
  shuttingDown = true
  log('raj', 'shutting down local stack…')
  for (const child of children) {
    try {
      child.kill('SIGTERM')
    } catch {}
  }
  setTimeout(() => process.exit(code), 500)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

async function main() {
  const skipLocal = process.env.RAJ_LOCAL_SERVICES === '0'

  if (!skipLocal) {
    const discovered = await discoverFreeLLMAPI()
    freellmapiBaseUrl = discovered.baseUrl
    process.env.FREELLMAPI_URL = freellmapiBaseUrl
  }

  const brainPort = new URL(freellmapiBaseUrl).port || '3001'
  const ollama = skipLocal ? { running: false, models: [], model: 'llama3.1:8b' } : await discoverOllama()

  console.log('')
  console.log('  Raj local stack')
  console.log('  ─────────────────────────────────────')
  console.log('  App (UI):     https://localhost:3002')
  console.log('  Voice API:    http://127.0.0.1:8765  (Chatterbox)')
  console.log('  Memory API:   http://127.0.0.1:8766  (data/raj-memory/)')
  if (ollama.running) {
    console.log(`  Brain (AI):   Ollama · ${ollama.model} · ${ollama.models.length} model(s)`)
    console.log('  Phone/Netlify: npm run tunnel:ollama  →  npm run sync:ollama-netlify')
  } else {
    console.log('  Brain (AI):   Ollama — run: ollama serve  (then: ollama pull llama3.1:8b)')
  }
  console.log(`  Brain alt:    ${freellmapiBaseUrl}/v1  (FreeLLMAPI — optional)`)
  console.log(`  Brain admin:  ${freellmapiBaseUrl}  (or localhost:5173/keys)`)
  console.log('  Skip locals:  RAJ_LOCAL_SERVICES=0 npm run dev')
  console.log('')

  if (!skipLocal) {
    try {
      ensureFreeLLMAPI()
    } catch (err) {
      console.warn(`[setup] FreeLLMAPI bootstrap failed: ${err.message}`)
    }

    if (hasChatterbox()) {
      spawnService('voice', CHATTERBOX_PY, [CHATTERBOX_SERVER])
    } else {
      log('voice', 'skipped — Chatterbox not installed (Edge/browser TTS still works)')
    }

    spawnService('memory', process.execPath, [path.join(ROOT, 'scripts/memory-server.mjs')])

    const alreadyRunning = await isFreeLLMAPIRunning(brainPort)
    if (alreadyRunning) {
      const discovered = await discoverFreeLLMAPI()
      log(
        'brain',
        `using existing FreeLLMAPI on :${brainPort} (${discovered.providerKeyCount} provider key(s))`,
      )
    } else if (hasFreeLLMAPI()) {
      spawnService('brain', 'npm', ['run', 'dev', '-w', 'server'], {
        cwd: FREELLM_DIR,
        env: { PORT: brainPort },
      })
    } else {
      log('brain', 'skipped — FreeLLMAPI not installed')
    }
  }

  const vite = spawnService('app', process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite'])
  vite.on('exit', (code) => shutdown(code ?? 0))
}

main().catch((err) => {
  console.error(err)
  shutdown(1)
})
