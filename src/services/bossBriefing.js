import { format, isToday, parseISO } from 'date-fns'
import { getBatterySnapshot } from '../utils/batteryService'
import { getWeatherSnapshot } from './weatherService'
import { getGoogleConnectionStatus, ensureGoogleTokenForTools } from './googleIntegration'
import gisCalendarService from './gisCalendarService'
import gisGmailService from './gisGmailService'
import dataService from './dataService'
import { getActiveTimers, formatDuration } from './timerService'

function greetingForHour(hour) {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

async function fetchTodayEvents(max = 3) {
  const status = getGoogleConnectionStatus()
  if (!status.connected) return []

  try {
    await ensureGoogleTokenForTools()
    const events = await gisCalendarService.getEvents(8)
    const now = Date.now()
    return events
      .filter((e) => new Date(e.endTime).getTime() >= now)
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
      .slice(0, max)
      .map((e) => {
        const start = parseISO(e.startTime)
        const when = isToday(start) ? format(start, 'h:mm a') : format(start, 'EEE h:mm a')
        return `${e.title} at ${when}`
      })
  } catch {
    return []
  }
}

async function fetchUnreadCount() {
  const status = getGoogleConnectionStatus()
  if (!status.connected) return null
  try {
    await ensureGoogleTokenForTools()
    return await gisGmailService.getUnreadInboxCount()
  } catch {
    return null
  }
}

async function fetchDueTasks(max = 2) {
  try {
    const todos = await dataService.getTodos()
    return todos
      .filter((t) => !t.completed && t.dueDate && isToday(parseISO(t.dueDate)))
      .slice(0, max)
      .map((t) => t.title)
  } catch {
    return []
  }
}

export async function buildBossWelcomeBriefing() {
  const hour = new Date().getHours()
  const greet = greetingForHour(hour)
  const parts = [`${greet}, Boss. I'm online and ready.`]

  const [events, unread, tasks, weather] = await Promise.all([
    fetchTodayEvents(),
    fetchUnreadCount(),
    fetchDueTasks(),
    getWeatherSnapshot().catch(() => null),
  ])

  const battery = getBatterySnapshot()
  if (battery.level != null) {
    parts.push(
      `You're at ${battery.level} percent${battery.charging ? ', and charging nicely' : ''}.`
    )
  }

  if (weather?.summary) {
    parts.push(weather.summary.replace(/\.$/, '') + '.')
  }

  const timers = getActiveTimers()
  if (timers.length > 0) {
    const next = timers[0]
    const left = Math.max(1, Math.round((next.endsAt - Date.now()) / 1000))
    parts.push(`Your ${next.label} finishes in ${formatDuration(left)}.`)
  }

  if (events.length > 0) {
    parts.push(`Coming up: ${events.join(', ')}.`)
  } else if (getGoogleConnectionStatus().connected) {
    parts.push('Your calendar looks clear for now.')
  }

  if (unread != null && unread > 0) {
    parts.push(`You have ${unread} unread email${unread === 1 ? '' : 's'}.`)
  }

  if (tasks.length > 0) {
    parts.push(`Due today: ${tasks.join(' and ')}.`)
  }

  parts.push('What shall I handle first?')
  return parts.join(' ')
}
