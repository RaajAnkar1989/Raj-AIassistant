import { isIOSDevice } from './device'

const REPORT_KEY = 'raj_battery_report'
const REMIND_KEY = 'raj_battery_reminder_state'
const REPORT_MAX_AGE_MS = 45 * 60 * 1000
const POLL_MS = 45_000

let snapshot = {
  level: null,
  charging: false,
  supported: false,
  source: 'none',
  updatedAt: null,
  iosLimited: false,
}
let subscribers = new Set()
let batteryManager = null
let pollId = null
let syncHandler = null
let started = false

function loadReminderState() {
  try {
    const raw = localStorage.getItem(REMIND_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed === 'object' ? parsed : { reminded: [], charging: false }
  } catch {
    return { reminded: [], charging: false }
  }
}

function saveReminderState(state) {
  try {
    localStorage.setItem(REMIND_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

function readStoredReport() {
  try {
    const raw = localStorage.getItem(REPORT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function applySnapshot(next) {
  snapshot = { ...snapshot, ...next }
  subscribers.forEach((fn) => {
    try {
      fn(getBatterySnapshot())
    } catch {
      /* ignore subscriber errors */
    }
  })
}

function syncFromBatteryManager(battery) {
  applySnapshot({
    level: Math.round(battery.level * 100),
    charging: Boolean(battery.charging),
    supported: true,
    source: 'api',
    updatedAt: Date.now(),
    iosLimited: false,
  })
}

function syncFromStoredReport() {
  const report = readStoredReport()
  if (!report?.level && report?.level !== 0) return false
  const age = Date.now() - (report.at || 0)
  if (age > REPORT_MAX_AGE_MS) return false
  applySnapshot({
    level: Math.min(100, Math.max(0, Math.round(report.level))),
    charging: Boolean(report.charging),
    supported: true,
    source: 'reported',
    updatedAt: report.at || Date.now(),
    iosLimited: isIOSDevice(),
  })
  return true
}

function isSecureContext() {
  return typeof window !== 'undefined' && window.isSecureContext === true
}

export function getBatterySnapshot() {
  return { ...snapshot }
}

export function subscribeBattery(listener) {
  subscribers.add(listener)
  listener(getBatterySnapshot())
  return () => subscribers.delete(listener)
}

export function reportBatteryLevel(level, charging = false) {
  const safe = Math.min(100, Math.max(0, Math.round(Number(level))))
  const at = Date.now()
  try {
    localStorage.setItem(REPORT_KEY, JSON.stringify({ level: safe, charging, at }))
  } catch {
    /* ignore */
  }
  applySnapshot({
    level: safe,
    charging,
    supported: true,
    source: batteryManager ? 'api' : 'reported',
    updatedAt: at,
    iosLimited: isIOSDevice() && !batteryManager,
  })
  return safe
}

export function parseBatteryReport(command) {
  const text = String(command || '').trim()
  if (!text) return null

  const patterns = [
    /(?:battery|charge)\s*(?:is|at|level|:)?\s*(\d{1,3})\s*(?:percent|%)/i,
    /(\d{1,3})\s*(?:percent|%)\s*(?:battery|charge|left)/i,
    /(?:update|set)\s+battery\s*(?:to\s*)?(\d{1,3})/i,
    /(?:my\s+)?battery\s*(?:is\s*)?(\d{1,3})$/i,
  ]

  for (const re of patterns) {
    const m = text.match(re)
    if (!m?.[1]) continue
    const level = Math.min(100, Math.max(0, parseInt(m[1], 10)))
    if (Number.isNaN(level)) continue
    return { level, charging: /charg/i.test(text) }
  }
  return null
}

function reminderMessage(threshold, level) {
  if (threshold >= 50) {
    return `Just a gentle note — you're at ${level} percent. When you have a moment, topping up would keep everything running smoothly.`
  }
  if (threshold >= 30) {
    return `Your battery is at ${level} percent. If you can plug in soon, you'll stay comfortably ahead of the day.`
  }
  if (threshold >= 20) {
    return `Heads up — you're at ${level} percent now. A quick charge would be wise before you're caught without power.`
  }
  return `You're down to ${level} percent, Boss. I'd recommend finding a charger fairly soon.`
}

export function evaluateBatteryReminder(snap = getBatterySnapshot()) {
  if (snap.level == null || snap.charging) return null

  const thresholds = [50, 30, 20, 10]
  const state = loadReminderState()

  if (snap.charging) {
    if (state.reminded.length || state.charging) {
      saveReminderState({ reminded: [], charging: true })
    }
    return null
  }

  if (state.charging) {
    state.charging = false
    state.reminded = []
    saveReminderState(state)
  }

  for (const threshold of thresholds) {
    if (snap.level <= threshold) {
      if (!state.reminded.includes(threshold)) {
        state.reminded.push(threshold)
        saveReminderState(state)
        return reminderMessage(threshold, snap.level)
      }
    }
  }

  if (snap.level >= 58 && state.reminded.length) {
    saveReminderState({ reminded: [], charging: false })
  }

  return null
}

function ingestUrlBatteryParam() {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams(window.location.search)
  const raw = params.get('battery') || params.get('rajBattery')
  if (!raw) return
  const level = parseInt(raw, 10)
  if (Number.isNaN(level)) return
  reportBatteryLevel(level, params.get('charging') === '1')
  const clean = new URL(window.location.href)
  clean.searchParams.delete('battery')
  clean.searchParams.delete('rajBattery')
  clean.searchParams.delete('charging')
  window.history.replaceState({}, '', `${clean.pathname}${clean.search}${clean.hash}`)
}

export function startBatteryMonitoring() {
  if (started || typeof navigator === 'undefined') return
  started = true
  ingestUrlBatteryParam()

  snapshot.iosLimited = isIOSDevice()

  if (isSecureContext() && typeof navigator.getBattery === 'function') {
    navigator
      .getBattery()
      .then((battery) => {
        batteryManager = battery
        syncHandler = () => syncFromBatteryManager(battery)
        syncHandler()
        battery.addEventListener('levelchange', syncHandler)
        battery.addEventListener('chargingchange', syncHandler)
      })
      .catch(() => {
        if (!syncFromStoredReport()) {
          applySnapshot({ supported: false, source: 'none', iosLimited: isIOSDevice() })
        }
      })
  } else if (!syncFromStoredReport()) {
    applySnapshot({ supported: false, source: 'none', iosLimited: isIOSDevice() })
  }

  pollId = setInterval(() => {
    if (batteryManager && syncHandler) {
      syncHandler()
      return
    }
    if (!batteryManager) syncFromStoredReport()
  }, POLL_MS)
}

export function stopBatteryMonitoring() {
  if (pollId) clearInterval(pollId)
  pollId = null
  if (batteryManager && syncHandler) {
    batteryManager.removeEventListener('levelchange', syncHandler)
    batteryManager.removeEventListener('chargingchange', syncHandler)
  }
  batteryManager = null
  syncHandler = null
  started = false
}
