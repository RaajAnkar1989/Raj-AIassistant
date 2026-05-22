/** Voice timers — runs in-browser, notifies when done. */

const activeTimers = new Map()
export const TIMER_DONE_EVENT = 'raj-timer-done'

function requestNotificationPermission() {
  if (typeof Notification === 'undefined') return
  if (Notification.permission === 'default') {
    void Notification.requestPermission()
  }
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
  const duration = Math.min(Math.max(Math.round(Number(seconds) || 0), 1), 24 * 3600)
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const endsAt = Date.now() + duration * 1000
  requestNotificationPermission()

  const timeoutId = setTimeout(() => {
    activeTimers.delete(id)
    const message = `${label} is done.`
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(TIMER_DONE_EVENT, { detail: { message, label } }))
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification('Raj — timer finished', { body: message })
      } catch {}
    }
  }, duration * 1000)

  activeTimers.set(id, { timeoutId, label, endsAt, seconds: duration })
  return { id, seconds: duration, label, endsAt }
}

export function cancelVoiceTimers() {
  for (const entry of activeTimers.values()) {
    clearTimeout(entry.timeoutId)
  }
  const count = activeTimers.size
  activeTimers.clear()
  return count
}

export function getActiveTimerCount() {
  return activeTimers.size
}
