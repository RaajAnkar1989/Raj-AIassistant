#!/usr/bin/env node
/**
 * Push local Raj secrets to Netlify as encrypted env vars (one command).
 * Reads .env, local FreeLLMAPI, and decrypts provider keys from your FreeLLMAPI DB.
 *
 * Usage:
 *   netlify login          # once
 *   npm run sync:netlify-env
 */
import { spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_SITE = process.env.NETLIFY_SITE_NAME || 'raaj-jarvis'
const FREELLMAPI_PORTS = (process.env.FREELLMAPI_PORTS || '3001,3011').split(',').map((p) => p.trim())
const TEMP_ENV = path.join(ROOT, '.env.netlify')

const SECRET_KEYS = new Set([
  'VITE_GEMINI_API_KEY',
  'VITE_FREELLMAPI_KEY',
  'VITE_OPENAI_API_KEY',
  'VITE_ELEVENLABS_API_KEY',
  'VITE_GOOGLE_CLIENT_ID',
])

function parseDotEnv(text) {
  const out = {}
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (val) out[key] = val
  }
  return out
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return {}
  return parseDotEnv(readFileSync(filePath, 'utf8'))
}

function isPublicUrl(url) {
  if (!url?.trim()) return false
  try {
    const u = new URL(url.trim())
    const host = u.hostname.toLowerCase()
    return host !== 'localhost' && host !== '127.0.0.1' && !host.endsWith('.local')
  } catch {
    return false
  }
}

async function fetchJson(url, timeoutMs = 2500) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function discoverFreeLLMAPI() {
  let best = null
  for (const port of FREELLMAPI_PORTS) {
    const base = `http://127.0.0.1:${port}`
    const keyData = await fetchJson(`${base}/api/settings/api-key`)
    if (!keyData?.apiKey) continue
    const keys = await fetchJson(`${base}/api/keys`)
    const providerKeyCount = Array.isArray(keys) ? keys.filter((k) => k.enabled).length : 0
    if (!best || providerKeyCount >= best.providerKeyCount) {
      best = { port, base, unifiedKey: keyData.apiKey, providerKeyCount }
    }
  }
  return best
}

function findFreeLLMAPIRoot() {
  const candidates = [
    path.join(homedir(), 'freellmapi'),
    path.join(ROOT, 'tools/freellmapi'),
  ]
  let best = null
  for (const dir of candidates) {
    const db = path.join(dir, 'server/data/freeapi.db')
    if (!existsSync(db)) continue
    const countRes = spawnSync(
      'sqlite3',
      [db, 'SELECT COUNT(*) FROM api_keys WHERE enabled=1;'],
      { encoding: 'utf8' },
    )
    const count = Number(countRes.stdout?.trim() || 0)
    if (!best || count > best.count) best = { dir, db, count }
  }
  return best
}

function readEncryptionKey(freellmapiDir) {
  const envPath = path.join(freellmapiDir, '.env')
  if (!existsSync(envPath)) return null
  const text = readFileSync(envPath, 'utf8')
  const match = text.match(/^ENCRYPTION_KEY=([0-9a-fA-F]{64})/m)
  return match ? match[1] : null
}

function decryptProviderKey(dbPath, encryptionKeyHex, platform) {
  const sql = `SELECT encrypted_key, iv, auth_tag FROM api_keys WHERE platform='${platform}' AND enabled=1 LIMIT 1;`
  const result = spawnSync('sqlite3', [dbPath, sql], { encoding: 'utf8' })
  if (result.status !== 0 || !result.stdout.trim()) return ''
  const [encrypted, iv, authTag] = result.stdout.trim().split('|')
  if (!encrypted || !iv || !authTag) return ''

  const key = Buffer.from(encryptionKeyHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'))
  decipher.setAuthTag(Buffer.from(authTag, 'hex'))
  let plain = decipher.update(encrypted, 'hex', 'utf8')
  plain += decipher.final('utf8')
  return plain.trim()
}

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
  const link = runNetlify(['link', '--name', DEFAULT_SITE], { inherit: true })
  return link.status === 0
}

function pushToNetlify(vars) {
  if (!ensureNetlifyLinked()) {
    console.error('\nNetlify link failed. Run: npx netlify login')
    return false
  }

  let ok = true
  for (const [key, value] of Object.entries(vars)) {
    const args = ['env:set', key, value, '--context', 'production', '--force']
    if (SECRET_KEYS.has(key)) args.push('--secret')
    const res = runNetlify(args, { inherit: true })
    if (res.status !== 0) ok = false
  }
  return ok
}

async function main() {
  console.log('Collecting local Raj secrets for Netlify…\n')

  const localEnv = {
    ...loadEnvFile(path.join(ROOT, '.env')),
    ...loadEnvFile(path.join(ROOT, '.env.local')),
  }

  const freellm = await discoverFreeLLMAPI()
  const merged = { ...localEnv }

  if (freellm) {
    console.log(`FreeLLMAPI on :${freellm.port} (${freellm.providerKeyCount} provider key(s))`)
    const publicUrl = merged.VITE_FREELLMAPI_URL?.trim()
    if (isPublicUrl(publicUrl)) {
      merged.VITE_FREELLMAPI_URL = publicUrl.replace(/\/$/, '')
      merged.VITE_FREELLMAPI_KEY = freellm.unifiedKey
      console.log('  → will sync hosted FreeLLMAPI URL + unified key')
    } else {
      console.log('  → no public FreeLLMAPI URL (localhost cannot run on Netlify)')
      delete merged.VITE_FREELLMAPI_URL
      delete merged.VITE_FREELLMAPI_KEY
    }
  }

  const freellmRoot = findFreeLLMAPIRoot()
  if (freellmRoot) {
    const encKey = readEncryptionKey(freellmRoot.dir)
    if (encKey) {
      const gemini = decryptProviderKey(freellmRoot.db, encKey, 'google')
      if (gemini.startsWith('AIza')) {
        merged.VITE_GEMINI_API_KEY = gemini
        console.log('  → Gemini key pulled from local FreeLLMAPI (encrypted store)')
      }
    }
  }

  const netlifyVars = {}
  for (const key of [
    'VITE_GEMINI_API_KEY',
    'VITE_FREELLMAPI_URL',
    'VITE_FREELLMAPI_KEY',
    'VITE_GOOGLE_CLIENT_ID',
    'VITE_ELEVENLABS_API_KEY',
    'VITE_ELEVENLABS_AGENT_ID',
    'VITE_OPENAI_API_KEY',
  ]) {
    const val = merged[key]?.trim()
    if (val) netlifyVars[key] = val
  }

  if (!Object.keys(netlifyVars).length) {
    console.error('Nothing to sync. Add keys to .env or run local FreeLLMAPI (npm run dev).')
    process.exit(1)
  }

  const lines = Object.entries(netlifyVars).map(([k, v]) => `${k}=${v}`)
  writeFileSync(TEMP_ENV, `${lines.join('\n')}\n`, { mode: 0o600 })
  console.log('\nPrepared (gitignored): .env.netlify')
  console.log('Keys to push:', Object.keys(netlifyVars).join(', '))

  if (!isNetlifyLoggedIn()) {
    console.log('\nNetlify CLI not logged in.')
    console.log('Run once:  npx netlify login')
    console.log('Then:      npm run sync:netlify-env')
    console.log('\nOr paste .env.netlify into Netlify → Site settings → Environment variables.')
    process.exit(0)
  }

  console.log('\nPushing encrypted secrets to Netlify production…')
  const pushed = pushToNetlify(netlifyVars)
  try {
    unlinkSync(TEMP_ENV)
  } catch {}

  if (!pushed) {
    console.error('\nSome variables failed to push. Re-run after fixing errors.')
    process.exit(1)
  }

  console.log('\nDone. Triggering production deploy…')
  runNetlify(['deploy', '--prod', '--build'], { inherit: true })
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
