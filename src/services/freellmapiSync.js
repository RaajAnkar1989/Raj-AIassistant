import {
  getBrainProvider,
  setBrainProvider,
  setBrainModel,
  setProviderApiKey,
  sanitizeApiKey,
  getProviderApiKey,
} from '../constants/aiProviders'

const SYNC_CACHE_KEY = 'raj_freellmapi_sync_at'
const PORT_CACHE_KEY = 'raj_freellmapi_port'

function getCachedPort() {
  try {
    return sessionStorage.getItem(PORT_CACHE_KEY) || ''
  } catch {
    return ''
  }
}

function setCachedPort(port) {
  try {
    if (port) sessionStorage.setItem(PORT_CACHE_KEY, String(port))
  } catch {}
}

function getHostedFreeLLMRoot() {
  const configured = import.meta.env.VITE_FREELLMAPI_URL?.trim()
  if (configured) return configured.replace(/\/v1\/?$/, '')
  return ''
}

function getAdminBaseUrl() {
  if (import.meta.env.DEV) return '/api/brain/freellmapi-admin'
  const hosted = getHostedFreeLLMRoot()
  if (hosted) return `${hosted}/api`
  return `http://127.0.0.1:${getCachedPort() || '3001'}/api`
}

function applyEnvFreeLLMAPIKey() {
  const envKey = sanitizeApiKey(import.meta.env.VITE_FREELLMAPI_KEY)
  if (!envKey?.startsWith('freellmapi-')) return null
  setProviderApiKey('freellmapi', envKey)
  setBrainProvider('freellmapi')
  setBrainModel('auto')
  return envKey
}

async function discoverPortInBrowser() {
  const ports = [getCachedPort(), '3001', '3011'].filter(Boolean)
  const tried = new Set()
  let best = { port: '3001', providerKeyCount: 0, apiKey: '' }

  for (const port of ports) {
    if (tried.has(port)) continue
    tried.add(port)
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/settings/api-key`)
      if (!res.ok) continue
      const { apiKey } = await res.json()
      const keysRes = await fetch(`http://127.0.0.1:${port}/api/keys`)
      const keys = keysRes.ok ? await keysRes.json() : []
      const providerKeyCount = Array.isArray(keys) ? keys.filter((k) => k.enabled).length : 0
      if (providerKeyCount >= best.providerKeyCount) {
        best = { port, providerKeyCount, apiKey: apiKey || '' }
      }
    } catch {}
  }

  if (best.apiKey) setCachedPort(best.port)
  return best
}

async function fetchJson(path) {
  const res = await fetch(`${getAdminBaseUrl()}${path}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error?.message || `FreeLLMAPI admin failed (${res.status})`)
  }
  return res.json()
}

/** Pull unified key (+ provider key count) from env, hosted FreeLLMAPI, or local dev. */
export async function syncFreeLLMAPIFromLocal({ force = false } = {}) {
  const envKey = applyEnvFreeLLMAPIKey()
  if (envKey) {
    return { apiKey: envKey, providerKeyCount: null, cached: false, fromEnv: true }
  }

  if (!force) {
    try {
      const last = Number(sessionStorage.getItem(SYNC_CACHE_KEY) || 0)
      if (Date.now() - last < 30_000 && getProviderApiKey('freellmapi')) {
        return { apiKey: getProviderApiKey('freellmapi'), cached: true }
      }
    } catch {}
  }

  let apiKey = ''
  let providerKeyCount = 0

  if (import.meta.env.DEV) {
    const data = await fetchJson('/settings/api-key')
    apiKey = data.apiKey
    try {
      const keys = await fetchJson('/keys')
      providerKeyCount = Array.isArray(keys) ? keys.filter((k) => k.enabled).length : 0
    } catch {}
  } else if (getHostedFreeLLMRoot()) {
    try {
      const data = await fetchJson('/settings/api-key')
      apiKey = data.apiKey
      try {
        const keys = await fetchJson('/keys')
        providerKeyCount = Array.isArray(keys) ? keys.filter((k) => k.enabled).length : 0
      } catch {}
    } catch {
      const discovered = await discoverPortInBrowser()
      apiKey = discovered.apiKey
      providerKeyCount = discovered.providerKeyCount
    }
  } else {
    const discovered = await discoverPortInBrowser()
    apiKey = discovered.apiKey
    providerKeyCount = discovered.providerKeyCount
  }

  const unified = sanitizeApiKey(apiKey)
  if (!unified.startsWith('freellmapi-')) {
    throw new Error(
      import.meta.env.PROD
        ? 'FreeLLMAPI not linked. Add VITE_FREELLMAPI_URL and VITE_FREELLMAPI_KEY in Netlify env vars.'
        : 'FreeLLMAPI not reachable or no unified key found. Run npm run dev.'
    )
  }

  setProviderApiKey('freellmapi', unified)
  setBrainProvider('freellmapi')
  setBrainModel('auto')

  try {
    sessionStorage.setItem(SYNC_CACHE_KEY, String(Date.now()))
  } catch {}

  return { apiKey: unified, providerKeyCount, cached: false }
}

export function clearFreeLLMAPISyncCache() {
  try {
    sessionStorage.removeItem(SYNC_CACHE_KEY)
  } catch {}
}
