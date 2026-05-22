#!/usr/bin/env node
/**
 * Push Ollama tunnel URL + model to Netlify so the hosted app uses your Mac brain.
 *
 * Prerequisites:
 *   npm run tunnel:ollama   (keep running in another terminal)
 *   netlify login           (once)
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, unlinkSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { discoverOllama } from './discover-ollama.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_SITE = process.env.NETLIFY_SITE_NAME || 'raaj-jarvis'
const TUNNEL_FILE = path.join(ROOT, '.ollama-tunnel-url')
const MEMORY_TUNNEL_FILE = path.join(ROOT, '.raj-memory-tunnel-url')

const SECRET_KEYS = new Set(['OLLAMA_URL', 'RAJ_MEMORY_URL', 'VITE_GEMINI_API_KEY', 'VITE_FREELLMAPI_KEY'])

function runNetlify(args, { inherit = false } = {}) {
  return spawnSync('npx', ['--yes', 'netlify-cli@17', ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: inherit ? 'inherit' : 'pipe',
  })
}

function isNetlifyLoggedIn() {
  const status = runNetlify(['status'])
  const out = `${status.stdout || ''}${status.stderr || ''}`
  return /Current Netlify User/i.test(out) && !/Not logged in/i.test(out)
}

function ensureNetlifyLinked() {
  const status = runNetlify(['status'])
  const out = `${status.stdout || ''}${status.stderr || ''}`
  if (/Linked to/i.test(out) || /Site URL/i.test(out)) return true
  console.log(`Linking Netlify site "${DEFAULT_SITE}"…`)
  return runNetlify(['link', '--name', DEFAULT_SITE], { inherit: true }).status === 0
}

function readMemoryTunnelUrl() {
  const fromEnv = process.env.RAJ_MEMORY_TUNNEL_URL?.trim() || process.env.RAJ_MEMORY_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  if (!existsSync(MEMORY_TUNNEL_FILE)) return ''
  return readFileSync(MEMORY_TUNNEL_FILE, 'utf8').trim().replace(/\/$/, '')
}

function readTunnelUrl() {
  const fromEnv = process.env.OLLAMA_TUNNEL_URL?.trim() || process.env.OLLAMA_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  if (!existsSync(TUNNEL_FILE)) return ''
  return readFileSync(TUNNEL_FILE, 'utf8').trim().replace(/\/$/, '')
}

async function verifyTunnel(url) {
  try {
    const res = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(8000) })
    return res.ok
  } catch {
    return false
  }
}

function pushVar(key, value, secret = false) {
  const args = ['env:set', key, value, '--context', 'production', '--force']
  if (secret || SECRET_KEYS.has(key)) args.push('--secret')
  return runNetlify(args, { inherit: true }).status === 0
}

async function main() {
  const ollama = await discoverOllama()
  if (!ollama.running) {
    console.error('Ollama is not running locally. Start: ollama serve')
    process.exit(1)
  }

  const tunnelUrl = readTunnelUrl()
  if (!tunnelUrl) {
    console.error('No tunnel URL. Run in another terminal:\n  npm run tunnel:ollama')
    process.exit(1)
  }

  console.log(`Verifying tunnel ${tunnelUrl} …`)
  const ok = await verifyTunnel(tunnelUrl)
  if (!ok) {
    console.error('Tunnel not reachable. Keep npm run tunnel:ollama running, then retry.')
    process.exit(1)
  }

  const model = process.env.VITE_OLLAMA_MODEL?.trim() || ollama.model
  const memoryUrl = readMemoryTunnelUrl()
  const vars = {
    OLLAMA_URL: tunnelUrl,
    VITE_OLLAMA_ENABLED: '1',
    VITE_OLLAMA_MODEL: model,
  }
  if (memoryUrl) vars.RAJ_MEMORY_URL = memoryUrl

  console.log('\nPushing to Netlify production:')
  console.log(`  OLLAMA_URL=${tunnelUrl}`)
  console.log(`  VITE_OLLAMA_MODEL=${model}`)
  console.log('  VITE_OLLAMA_ENABLED=1')
  if (memoryUrl) console.log(`  RAJ_MEMORY_URL=${memoryUrl}`)
  console.log('')

  if (!isNetlifyLoggedIn()) {
    console.log('Netlify CLI not logged in. Run: npx netlify login')
    console.log('\nOr set these manually in Netlify → Site settings → Environment variables.')
    process.exit(0)
  }

  if (!ensureNetlifyLinked()) {
    console.error('Netlify link failed.')
    process.exit(1)
  }

  let pushed = true
  for (const [key, value] of Object.entries(vars)) {
    if (!pushVar(key, value)) pushed = false
  }

  if (!pushed) {
    console.error('\nSome variables failed to push.')
    process.exit(1)
  }

  console.log('\nDeploying production build…')
  const deploy = runNetlify(['deploy', '--prod', '--build'], { inherit: true })
  if (deploy.status !== 0) process.exit(deploy.status ?? 1)

  console.log('\nDone. Open https://raaj-jarvis.netlify.app on your phone.')
  console.log('Keep ollama serve + npm run tunnel:ollama running on your Mac.')
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
