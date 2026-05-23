#!/usr/bin/env node
/**
 * Expose local Jarvis agent server (:8787) via Cloudflare quick tunnel.
 * Required for phone/Netlify streaming agent access.
 *
 * Usage:
 *   npm run agent          # if not already running via npm run dev
 *   npm run tunnel:agent
 *   npm run sync:agent-netlify
 */
import { spawn } from 'node:child_process'
import { existsSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TUNNEL_FILE = path.join(ROOT, '.agent-tunnel-url')
const AGENT_URL = (process.env.JARVIS_AGENT_URL || 'http://127.0.0.1:8787').replace(/\/$/, '')
const CLOUDFLARED_CANDIDATES = [
  process.env.CLOUDFLARED_PATH,
  '/opt/homebrew/bin/cloudflared',
  '/usr/local/bin/cloudflared',
  'cloudflared',
].filter(Boolean)

function findCloudflared() {
  for (const bin of CLOUDFLARED_CANDIDATES) {
    if (bin.includes('/') && existsSync(bin)) return bin
    if (!bin.includes('/')) return bin
  }
  return null
}

function extractTunnelUrl(line) {
  const match = line.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i)
  return match ? match[0] : null
}

async function probeAgent() {
  try {
    const res = await fetch(`${AGENT_URL}/health`, { signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch {
    return false
  }
}

async function main() {
  const up = await probeAgent()
  if (!up) {
    console.error('Jarvis agent is not running. Start it first:\n  npm run agent   # or npm run dev')
    process.exit(1)
  }

  const cloudflared = findCloudflared()
  if (!cloudflared) {
    console.error('cloudflared not found. Install with:\n  brew install cloudflared')
    process.exit(1)
  }

  console.log('')
  console.log('  Jarvis agent tunnel (Cloudflare)')
  console.log('  ─────────────────────────────────────')
  console.log(`  Local:   ${AGENT_URL}`)
  console.log('  Keep this terminal open while using streaming Jarvis on phone/Netlify.')
  console.log('  Then run (new terminal): npm run sync:agent-netlify')
  console.log('')

  const child = spawn(
    cloudflared,
    ['tunnel', '--url', AGENT_URL, '--http-host-header', '127.0.0.1:8787'],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  )

  let saved = false
  const onLine = (line) => {
    process.stdout.write(`${line}\n`)
    if (saved) return
    const url = extractTunnelUrl(line)
    if (!url) return
    writeFileSync(TUNNEL_FILE, `${url}\n`, { mode: 0o600 })
    saved = true
    console.log('')
    console.log(`  ✓ Tunnel URL saved to .agent-tunnel-url`)
    console.log(`  ✓ Next: npm run sync:agent-netlify`)
    console.log('')
  }

  child.stdout.on('data', (chunk) => {
    for (const line of chunk.toString().split('\n')) {
      if (line.trim()) onLine(line)
    }
  })
  child.stderr.on('data', (chunk) => {
    for (const line of chunk.toString().split('\n')) {
      if (line.trim()) onLine(line)
    }
  })

  child.on('exit', (code) => process.exit(code ?? 0))
  process.on('SIGINT', () => {
    try {
      child.kill('SIGTERM')
    } catch {}
    process.exit(0)
  })
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
