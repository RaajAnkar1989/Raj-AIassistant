/** Voice timers — runs in-browser, notifies when done. */

const STORAGE_KEY = 'raj_active_timers'
export const TIMER_DONE_EVENT = 'raj-timer-done'

const activeTimers = new Map()
let restorePromise = null

function requestNotificationPermission() {
  if (typeof Notification === 'undefined') return
  if (Notification.permission === 'default') {
    void Notification.requestPermission()
  }
}

function persistTimers() {
  if (typeof localStorage === 'undefined') return
  const entries = [...activeTimers.values()].map(({ label, endsAt, seconds }) => ({
    label,
    endsAt,
    seconds,
  }))
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    /* ignore */
  }
}

function fireTimerDone(label) {
  const message = `${label} is done, Boss.`
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TIMER_DONE_EVENT, { detail: { message, label } }))
  }
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      new Notification('Jarvis — timer finished', { body: message })
    } catch {
      /* ignore */
    }
  }
}

function scheduleTimerEntry(id, { label, endsAt, seconds }) {
  const delay = Math.max(0, endsAt - Date.now())
  const timeoutId = setTimeout(() => {
    activeTimers.delete(id)
    persistTimers()
    fireTimerDone(label)
  }, delay)

  activeTimers.set(id, { timeoutId, label, endsAt, seconds })
  persistTimers()
}

export function restoreVoiceTimers() {
  if (restorePromise) return restorePromise
  restorePromise = Promise.resolve().then(() => {
    if (typeof localStorage === 'undefined') return
    let saved = []
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    } catch {
      saved = []
    }

    const now = Date.now()
    for (const entry of saved) {
      if (!entry?.endsAt || entry.endsAt <= now) {
        if (entry?.label && entry.endsAt && entry.endsAt <= now && now - entry.endsAt < 60_000) {
          fireTimerDone(entry.label || 'Timer')
        }
        continue
      }
      const id = `${entry.endsAt}-${Math.random().toString(36).slice(2, 7)}`
      scheduleTimerEntry(id, {
        label: entry.label || 'Timer',
        endsAt: entry.endsAt,
        seconds: entry.seconds || Math.round((entry.endsAt - now) / 1000),
      })
    }
  })
  return restorePromise
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void restoreVoiceTimers()
  })
}

export function formatDuration(seconds) {
  const s = Math.max(1, Math.round(Number(seconds) || 0))
  if (s < 60) return `${s} second${s === 1 ? '' : 's'}`
  const mins = Math.floor(s / 60)
  const rem = s % 60
  if (mins < 60) {
    if (!rem) return `${mins} minute${mins === 1 ? '' : 's'}`
    return `${mins} minute${mins === 1 ? '' : 's'} and ${rem} second${rem === 1 ? '' : 's'}`
  }
  const hours = Math.floor(mins / 60)
  const leftMins = mins % 60
  if (!leftMins) return `${hours} hour${hours === 1 ? '' : 's'}`
  return `${hours} hour${hours === 1 ? '' : 's'} and ${leftMins} minute${leftMins === 1 ? '' : 's'}`
}

export function parseDurationSeconds(text) {
  const lower = String(text || '').toLowerCase().trim()
  if (!lower) return 0

  let total = 0
  const hourMatch = lower.match(/(\d+)\s*(?:hours?|hrs?|h)\b/)
  const minMatch = lower.match(/(\d+)\s*(?:minutes?|mins?|m)\b/)
  const secMatch = lower.match(/(\d+)\s*(?:seconds?|secs?|s)\b/)

  if (hourMatch) total += Number(hourMatch[1]) * 3600
  if (minMatch) total += Number(minMatch[1]) * 60
  if (secMatch) total += Number(secMatch[1])

  if (!total) {
    const bare = lower.match(/\b(\d+)\b/)
    if (bare) total = Number(bare[1]) * 60
  }

  return Math.min(Math.max(total, 1), 24 * 3600)
}

export function startVoiceTimer({ seconds, label = 'Timer' } = {}) {
  void restoreVoiceTimers()
  const duration = Math.min(Math.max(Math.round(Number(seconds) || 0), 1), 24 * 3600)
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const endsAt = Date.now() + duration * 1000
  requestNotificationPermission()
  scheduleTimerEntry(id, { label, endsAt, seconds: duration })
  return { id, seconds: duration, label, endsAt }
}

export function cancelVoiceTimers() {
  for (const entry of activeTimers.values()) {
    clearTimeout(entry.timeoutId)
  }
  const count = activeTimers.size
  activeTimers.clear()
  persistTimers()
  return count
}

export function getActiveTimerCount() {
  return activeTimers.size
}

export function getActiveTimers() {
  const now = Date.now()
  return [...activeTimers.values()]
    .map(({ label, endsAt, seconds }) => ({
      label,
      endsAt,
      seconds,
      remainingSeconds: Math.max(0, Math.round((endsAt - now) / 1000)),
    }))
    .filter((t) => t.remainingSeconds > 0)
    .sort((a, b) => a.endsAt - b.endsAt)
}
