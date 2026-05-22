const STORAGE_KEY = 'raj_recent_apps'
const MAX_STORED = 8

const DISPLAY_NAMES = {
  youtube: 'YouTube',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  spotify: 'Spotify',
  gmail: 'Gmail',
  googlemail: 'Gmail',
  calendar: 'Calendar',
  maps: 'Maps',
  netflix: 'Netflix',
  linkedin: 'LinkedIn',
  slack: 'Slack',
  discord: 'Discord',
  zoom: 'Zoom',
  vscode: 'VS Code',
  cursor: 'Cursor',
  safari: 'Safari',
  chrome: 'Chrome',
  messages: 'Messages',
  music: 'Music',
  photos: 'Photos',
  notes: 'Notes',
  reminders: 'Reminders',
  twitter: 'X',
  x: 'X',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  amazon: 'Amazon',
  prime: 'Prime Video',
}

export function formatAppDisplayName(appName) {
  const key = (appName || '').trim().toLowerCase()
  if (!key) return 'App'
  if (DISPLAY_NAMES[key]) return DISPLAY_NAMES[key]
  return key.charAt(0).toUpperCase() + key.slice(1)
}

export function recordRecentApp(appName) {
  const key = (appName || '').trim().toLowerCase()
  if (!key) return

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const list = raw ? JSON.parse(raw) : []
    const filtered = Array.isArray(list) ? list.filter((e) => e?.name !== key) : []
    filtered.unshift({ name: key, label: formatAppDisplayName(key), at: Date.now() })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, MAX_STORED)))
    window.dispatchEvent(new CustomEvent('raj-recent-apps-change'))
  } catch {}
}

export function getRecentApps(limit = 3) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const list = raw ? JSON.parse(raw) : []
    if (!Array.isArray(list)) return []
    return list.slice(0, limit).map((e) => ({
      name: e.name,
      label: e.label || formatAppDisplayName(e.name),
      at: e.at,
    }))
  } catch {
    return []
  }
}
