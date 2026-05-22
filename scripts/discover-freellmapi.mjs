/** Find the local FreeLLMAPI instance (prefers the one with provider keys). */
const PORTS = [3001, 3011]

export async function discoverFreeLLMAPI({ fetchImpl = fetch } = {}) {
  let best = { port: 3011, providerKeyCount: 0, apiKey: '' }

  for (const port of PORTS) {
    try {
      const [settingsRes, keysRes] = await Promise.all([
        fetchImpl(`http://127.0.0.1:${port}/api/settings/api-key`),
        fetchImpl(`http://127.0.0.1:${port}/api/keys`),
      ])
      if (!settingsRes.ok) continue

      const settings = await settingsRes.json()
      const keys = keysRes.ok ? await keysRes.json() : []
      const providerKeyCount = Array.isArray(keys) ? keys.filter((k) => k.enabled).length : 0
      const apiKey = settings?.apiKey || ''

      if (
        providerKeyCount > best.providerKeyCount ||
        (providerKeyCount === best.providerKeyCount && providerKeyCount > 0 && port === 3001)
      ) {
        best = { port, providerKeyCount, apiKey }
      } else if (best.providerKeyCount === 0 && providerKeyCount === 0 && port === 3001) {
        best = { port, providerKeyCount, apiKey }
      }
    } catch {}
  }

  return {
    ...best,
    baseUrl: `http://127.0.0.1:${best.port}`,
  }
}

export async function isFreeLLMAPIRunning(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/ping`)
    return res.ok
  } catch {
    return false
  }
}
