#!/usr/bin/env node
/** Bootstrap local voice/brain tools if missing (no servers started). */
import { existsSync, readFileSync, writeFileSync, appendFileSync, cpSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import crypto from 'node:crypto'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FREELLM_DIR = path.join(ROOT, 'tools/freellmapi')
const CHATTERBOX_VENV = path.join(ROOT, 'tools/chatterbox/.venv/bin/python')

function run(cmd, args, cwd = ROOT) {
  const result = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: false })
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} failed (${result.status})`)
  }
}

export function ensureFreeLLMAPI() {
  if (!existsSync(path.join(FREELLM_DIR, 'package.json'))) {
    console.log('[setup] Cloning FreeLLMAPI…')
    run('git', ['clone', '--depth', '1', 'https://github.com/RaajAnkar1989/freellmapi.git', FREELLM_DIR])
  }

  if (!existsSync(path.join(FREELLM_DIR, 'node_modules'))) {
    console.log('[setup] Installing FreeLLMAPI dependencies…')
    run('npm', ['install'], FREELLM_DIR)
  }

  const envPath = path.join(FREELLM_DIR, '.env')
  if (!existsSync(envPath)) {
    cpSync(path.join(FREELLM_DIR, '.env.example'), envPath)
    appendFileSync(envPath, `\nENCRYPTION_KEY=${crypto.randomBytes(32).toString('hex')}\n`)
    appendFileSync(envPath, 'PORT=3001\n')
    appendFileSync(envPath, 'DASHBOARD_ORIGINS=http://localhost:3002,http://127.0.0.1:3002\n')
    console.log('[setup] Created tools/freellmapi/.env')
  } else if (!readFileSync(envPath, 'utf8').includes('PORT=')) {
    appendFileSync(envPath, 'PORT=3001\n')
  }

  const clientDist = path.join(FREELLM_DIR, 'client/dist/index.html')
  if (!existsSync(clientDist)) {
    console.log('[setup] Building FreeLLMAPI dashboard (one-time)…')
    run('npm', ['run', 'build', '-w', 'client'], FREELLM_DIR)
  }
}

export function hasChatterbox() {
  return existsSync(CHATTERBOX_VENV)
}

export function hasFreeLLMAPI() {
  return existsSync(path.join(FREELLM_DIR, 'package.json'))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    ensureFreeLLMAPI()
    if (!hasChatterbox()) {
      console.warn('[setup] Chatterbox venv missing — voice falls back to Edge/browser TTS')
      console.warn('        See docs/CHATTERBOX_SETUP.md')
    }
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }
}
