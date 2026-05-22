import { useCallback, useEffect, useState } from 'react'
import { format, isToday, isTomorrow, parseISO } from 'date-fns'
import { getRecentApps } from '../utils/recentApps'
import { getWeatherSnapshot } from '../services/weatherService'
import { getGoogleConnectionStatus, ensureGoogleTokenForTools } from '../services/googleIntegration'
import gisCalendarService from '../services/gisCalendarService'
import gisGmailService from '../services/gisGmailService'
import dataService from '../services/dataService'
import { getBatterySnapshot, startBatteryMonitoring, subscribeBattery } from '../utils/batteryService'

const DAILY_TIPS = [
  'Say: open YouTube',
  'Say: check the weather',
  'Say: read my calendar',
  'Say: open Spotify',
  'Say: read my emails',
  'Say: open WhatsApp',
  'Say: battery is 45 percent',
]

function formatSessionDuration(ms) {
  if (!ms || ms < 0) return '00:00'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function readMemoryStats() {
  const mem = typeof performance !== 'undefined' ? performance.memory : null
  if (mem?.jsHeapSizeLimit > 0) {
    const pct = Math.round((mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100)
    return {
      label: `${pct}%`,
      percent: Math.min(100, Math.max(0, pct)),
      detail: `${Math.round(mem.usedJSHeapSize / 1048576)} MB`,
    }
  }
  const deviceGb = typeof navigator !== 'undefined' ? navigator.deviceMemory : null
  if (deviceGb) {
    return { label: `${deviceGb} GB`, percent: Math.min(100, deviceGb * 12), detail: 'Device RAM' }
  }
  return { label: '—', percent: 0, detail: 'Unavailable' }
}

function formatEventTime(startTime) {
  const start = parseISO(startTime)
  if (isToday(start)) return `Today · ${format(start, 'h:mm a')}`
  if (isTomorrow(start)) return `Tomorrow · ${format(start, 'h:mm a')}`
  return format(start, 'EEE · h:mm a')
}

function formatTaskDue(dueDate) {
  if (!dueDate) return 'No due date'
  const due = parseISO(dueDate)
  if (isToday(due)) return `Today · ${format(due, 'h:mm a')}`
  if (isTomorrow(due)) return `Tomorrow · ${format(due, 'h:mm a')}`
  return format(due, 'MMM d')
}

async function fetchNextEvent() {
  const status = getGoogleConnectionStatus()
  if (!status.connected) return null

  try {
    await ensureGoogleTokenForTools()
    const events = await gisCalendarService.getEvents(6)
    const now = Date.now()
    const next = events
      .filter((e) => new Date(e.endTime).getTime() >= now)
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))[0]
    if (!next) return null
    return {
      title: next.title,
      when: formatEventTime(next.startTime),
    }
  } catch {
    return null
  }
}

async function fetchUnreadEmailCount() {
  const status = getGoogleConnectionStatus()
  if (!status.connected) return null

  try {
    await ensureGoogleTokenForTools()
    return await gisGmailService.getUnreadInboxCount()
  } catch {
    return null
  }
}

async function fetchTaskSummary() {
  try {
    const todos = await dataService.getTodos()
    const pending = todos.filter((t) => !t.completed)
    const dueToday = pending.filter((t) => t.dueDate && isToday(parseISO(t.dueDate)))
    const sorted = [...pending].sort((a, b) => {
      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER
      return aDue - bDue
    })
    return {
      pendingCount: pending.length,
      dueTodayCount: dueToday.length,
      topTasks: sorted.slice(0, 3).map((t) => ({
        id: t.id,
        title: t.title,
        when: formatTaskDue(t.dueDate),
        priority: t.priority || 'medium',
      })),
    }
  } catch {
    return { pendingCount: 0, dueTodayCount: 0, topTasks: [] }
  }
}

export function useJarvisHud({ sessionActive, sessionStartedAt } = {}) {
  const [clock, setClock] = useState(() => new Date())
  const [battery, setBattery] = useState(() => getBatterySnapshot())
  const [memory, setMemory] = useState(() => readMemoryStats())
  const [recentApps, setRecentApps] = useState(() => getRecentApps(3))
  const [weather, setWeather] = useState(null)
  const [nextEvent, setNextEvent] = useState(null)
  const [unreadEmailCount, setUnreadEmailCount] = useState(null)
  const [tasks, setTasks] = useState({ pendingCount: 0, dueTodayCount: 0, topTasks: [] })
  const [tips] = useState(() => {
    const hour = new Date().getHours()
    const offset = hour % DAILY_TIPS.length
    return [...DAILY_TIPS.slice(offset), ...DAILY_TIPS.slice(0, offset)].slice(0, 3)
  })

  const refreshRecentApps = useCallback(() => {
    setRecentApps(getRecentApps(3))
  }, [])

  const refreshMemory = useCallback(() => {
    setMemory(readMemoryStats())
  }, [])

  const refreshWeather = useCallback(async () => {
    try {
      const snap = await getWeatherSnapshot()
      setWeather(snap)
    } catch {
      setWeather(null)
    }
  }, [])

  const refreshCalendar = useCallback(async () => {
    const event = await fetchNextEvent()
    setNextEvent(event)
  }, [])

  const refreshEmail = useCallback(async () => {
    const count = await fetchUnreadEmailCount()
    setUnreadEmailCount(count)
  }, [])

  const refreshTasks = useCallback(async () => {
    const summary = await fetchTaskSummary()
    setTasks(summary)
  }, [])

  useEffect(() => {
    const tick = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    refreshMemory()
    const id = setInterval(refreshMemory, 5000)
    return () => clearInterval(id)
  }, [refreshMemory])

  useEffect(() => {
    refreshRecentApps()
    window.addEventListener('raj-recent-apps-change', refreshRecentApps)
    return () => window.removeEventListener('raj-recent-apps-change', refreshRecentApps)
  }, [refreshRecentApps])

  useEffect(() => {
    startBatteryMonitoring()
    return subscribeBattery(setBattery)
  }, [])

  useEffect(() => {
    refreshWeather()
    refreshCalendar()
    refreshEmail()
    refreshTasks()
    const weatherId = setInterval(refreshWeather, 30 * 60 * 1000)
    const calId = setInterval(refreshCalendar, 5 * 60 * 1000)
    const mailId = setInterval(refreshEmail, 3 * 60 * 1000)
    const taskId = setInterval(refreshTasks, 2 * 60 * 1000)
    return () => {
      clearInterval(weatherId)
      clearInterval(calId)
      clearInterval(mailId)
      clearInterval(taskId)
    }
  }, [refreshWeather, refreshCalendar, refreshEmail, refreshTasks])

  const sessionMs = sessionActive && sessionStartedAt ? Date.now() - sessionStartedAt : 0
  const googleStatus = getGoogleConnectionStatus()

  return {
    clock,
    battery,
    memory,
    recentApps,
    weather,
    nextEvent,
    unreadEmailCount,
    tasks,
    tips,
    googleConnected: googleStatus.connected,
    sessionLabel: sessionActive ? formatSessionDuration(sessionMs) : 'Idle',
    sessionActive,
  }
}
