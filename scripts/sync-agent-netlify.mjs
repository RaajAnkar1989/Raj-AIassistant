#!/usr/bin/env node
/**
 * Push Jarvis agent tunnel URL to Netlify for phone streaming.
 *
 * Prerequisites:
 *   npm run agent            (or npm run dev)
 *   npm run tunnel:agent     (keep running)
 *   netlify login            (once)
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_SITE = process.env.NETLIFY_SITE_NAME || 'raaj-jarvis'
const TUNNEL_FILE = path.join(ROOT, '.agent-tunnel-url')
const AGENT_LOCAL = (process.env.JARVIS_AGENT_URL || 'http://127.0.0.1:8787').replace(/\/$/, '')

function runNetlify(args, { inherit = false } = {}) {
  return spawnSync('npx', ['--yes', 'netlify-cli@17', ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: inherit ? 'inherit' : 'pipe',
  })
}

function readTunnelUrl() {
  const fromEnv = process.env.JARVIS_AGENT_TUNNEL_URL?.trim() || process.env.VITE_JARVIS_AGENT_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  if (!existsSync(TUNNEL_FILE)) return ''
  return readFileSync(TUNNEL_FILE, 'utf8').trim().replace(/\/$/, '')
}

async function verifyAgent(url) {
  try {
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(12000) })
    if (!res.ok) return false
    const data = await res.json()
    return Boolean(data.ok)
  } catch {
    return false
  }
}

function pushVar(key, value, secret = false) {
  const args = ['env:set', key, value, '--context', 'production', '--force']
  if (secret) args.push('--secret')
  return runNetlify(args, { inherit: true }).status === 0
}

async function main() {
  try {
    const local = await fetch(`${AGENT_LOCAL}/health`, { signal: AbortSignal.timeout(3000) })
    if (!local.ok) throw new Error('offline')
  } catch {
    console.error('Jarvis agent not running locally. Start: npm run agent  (or npm run dev)')
    process.exit(1)
  }

  const tunnelUrl = readTunnelUrl()
  if (!tunnelUrl) {
    console.error('No agent tunnel URL. Run in another terminal:\n  npm run tunnel:agent')
    process.exit(1)
  }

  console.log(`Verifying agent tunnel ${tunnelUrl} …`)
  const ok = await verifyAgent(tunnelUrl)
  if (!ok) {
    console.error('Agent tunnel not reachable. Keep npm run tunnel:agent running, then retry.')
    process.exit(1)
  }

  const wsUrl = `${tunnelUrl.replace(/^http/, 'ws')}/ws/agent`

  const vars = {
    VITE_JARVIS_AGENT_URL: tunnelUrl,
    VITE_JARVIS_AGENT_WS: wsUrl,
    VITE_JARVIS_AGENT_ENABLED: '1',
  }

  console.log('\nPushing to Netlify production:')
  console.log(`  VITE_JARVIS_AGENT_URL=${tunnelUrl}`)
  console.log(`  VITE_JARVIS_AGENT_WS=${wsUrl}`)
  console.log('  VITE_JARVIS_AGENT_ENABLED=1')
  console.log('')

  const status = runNetlify(['status'])
  const out = `${status.stdout || ''}${status.stderr || ''}`
  if (/Not logged in/i.test(out)) {
    console.log('Run: npx netlify login')
    process.exit(0)
  }

  let pushed = true
  for (const [key, value] of Object.entries(vars)) {
    if (!pushVar(key, value)) pushed = false
  }

  if (!pushed) {
    console.error('Some env vars failed to push.')
    process.exit(1)
  }

  console.log('\nDeploying…')
  const deploy = runNetlify(['deploy', '--prod', '--build'], { inherit: true })
  process.exit(deploy.status === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
