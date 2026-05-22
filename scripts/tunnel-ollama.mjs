#!/usr/bin/env node
/**
 * Expose local Ollama to the internet via Cloudflare quick tunnel.
 * Required for phone/Netlify — Ollama only listens on your Mac otherwise.
 *
 * Usage:
 *   ollama serve          # if not already running
 *   npm run tunnel:ollama
 *   npm run sync:ollama-netlify
 */
import { spawn } from 'node:child_process'
import { existsSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { discoverOllama } from './discover-ollama.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TUNNEL_FILE = path.join(ROOT, '.ollama-tunnel-url')
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
  const ollama = await discoverOllama()
  if (!ollama.running) {
    console.error('Ollama is not running. Start it first:\n  ollama serve')
    process.exit(1)
  }

  const cloudflared = findCloudflared()
  if (!cloudflared) {
    console.error('cloudflared not found. Install with:\n  brew install cloudflared')
    process.exit(1)
  }

  console.log('')
  console.log('  Ollama tunnel (Cloudflare)')
  console.log('  ─────────────────────────────────────')
  console.log(`  Local:   ${ollama.baseUrl}`)
  console.log(`  Model:   ${ollama.model}`)
  console.log('  Keep this terminal open while using Raj on phone/Netlify.')
  console.log('  Then run (new terminal): npm run sync:ollama-netlify')
  console.log('')

  const child = spawn(
    cloudflared,
    [
      'tunnel',
      '--url',
      ollama.baseUrl,
      '--http-host-header',
      'localhost:11434',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
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
    console.log(`  ✓ Tunnel URL saved to .ollama-tunnel-url`)
    console.log(`  ✓ Next: npm run sync:ollama-netlify`)
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
