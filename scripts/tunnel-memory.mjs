#!/usr/bin/env node
/** Expose Raj memory server (port 8766) for phone/Netlify sync. */
import { spawn } from 'node:child_process'
import { existsSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TUNNEL_FILE = path.join(ROOT, '.raj-memory-tunnel-url')
const MEMORY_URL = (process.env.RAJ_MEMORY_URL || 'http://127.0.0.1:8766').replace(/\/$/, '')
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

async function main() {
  try {
    const res = await fetch(`${MEMORY_URL}/`, { signal: AbortSignal.timeout(2000) })
    if (!res.ok) throw new Error('not ok')
  } catch {
    console.error('Memory server not running. Start: npm run dev  (or node scripts/memory-server.mjs)')
    process.exit(1)
  }

  const cloudflared = findCloudflared()
  if (!cloudflared) {
    console.error('cloudflared not found. Install: brew install cloudflared')
    process.exit(1)
  }

  console.log('')
  console.log('  Raj memory tunnel (Cloudflare)')
  console.log(`  Local: ${MEMORY_URL} → data/raj-memory/`)
  console.log('  Keep open. Then: npm run sync:ollama-netlify')
  console.log('')

  const child = spawn(cloudflared, ['tunnel', '--url', MEMORY_URL], { stdio: ['ignore', 'pipe', 'pipe'] })
  let saved = false
  const onLine = (line) => {
    process.stdout.write(`${line}\n`)
    if (saved) return
    const url = extractTunnelUrl(line)
    if (!url) return
    writeFileSync(TUNNEL_FILE, `${url}\n`, { mode: 0o600 })
    saved = true
    console.log(`\n  ✓ Saved .raj-memory-tunnel-url\n  ✓ Run: npm run sync:ollama-netlify\n`)
  }

  child.stdout.on('data', (chunk) => {
    for (const line of chunk.toString().split('\n')) if (line.trim()) onLine(line)
  })
  child.stderr.on('data', (chunk) => {
    for (const line of chunk.toString().split('\n')) if (line.trim()) onLine(line)
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
