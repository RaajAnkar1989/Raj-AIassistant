/**
 * Unified Google OAuth for Gmail + Calendar (GIS).
 * One Client ID, one connect flow — powers voice client tools.
 */
import gisGmailService from './gisGmailService'
import gisCalendarService from './gisCalendarService'
import { format, parseISO, addHours, addMinutes, isToday, isTomorrow } from 'date-fns'

const GIS_SCRIPT = 'https://accounts.google.com/gsi/client'

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/contacts.readonly',
]

export function getGoogleClientId() {
  return (
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    localStorage.getItem('gmail_client_id') ||
    ''
  ).trim()
}

export function isGoogleConfigured() {
  return Boolean(getGoogleClientId())
}

/** Exact origin Google OAuth checks — must match Cloud Console entry. */
export function getOAuthJavaScriptOrigin() {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}

/** All origins to register in Google Cloud (current + common dev variants). */
export function getOAuthOriginsToRegister() {
  if (typeof window === 'undefined') return []
  const origins = new Set([window.location.origin])
  const { protocol, hostname, port } = window.location
  if (hostname === 'localhost' && protocol === 'https:') {
    origins.add(`http://localhost${port ? `:${port}` : ''}`)
  }
  if (hostname === '127.0.0.1') {
    origins.add(`${protocol}//127.0.0.1${port ? `:${port}` : ''}`)
  }
  return [...origins]
}

export function formatGoogleOAuthError(err) {
  const msg = String(err?.message || err?.type || err || '')
  const origin = getOAuthJavaScriptOrigin()
  if (/origin_mismatch|redirect_uri_mismatch|invalid.*origin/i.test(msg)) {
    return (
      `OAuth origin mismatch. In Google Cloud Console → Credentials → your Web client → ` +
      `Authorized JavaScript origins, add exactly: ${origin} ` +
      `(no trailing slash). Then wait 1–2 minutes and try Connect Google again.`
    )
  }
  if (/access_denied|popup_closed/i.test(msg)) return 'Google sign-in was cancelled.'
  return msg || 'Google connect failed'
}

function loadGisScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts) {
      resolve()
      return
    }
    const existing = document.querySelector(`script[src="${GIS_SCRIPT}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      return
    }
    const script = document.createElement('script')
    script.src = GIS_SCRIPT
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google sign-in'))
    document.head.appendChild(script)
  })
}

/** Connect Gmail + Calendar (opens Google consent). */
export async function connectGoogle() {
  const clientId = getGoogleClientId()
  if (!clientId) {
    throw new Error('Add your Google OAuth Client ID in Settings first.')
  }
  await loadGisScript()
  return new Promise((resolve, reject) => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES.join(' '),
      callback: (response) => {
        if (response?.access_token) {
          const expiry = Date.now() + (response.expires_in || 3600) * 1000
          const stored = { token: response.access_token, expiry }
          try {
            sessionStorage.setItem('google_access_token', JSON.stringify(stored))
          } catch {}
          persistGoogleTokens(response.access_token, expiry)
          resolve(true)
        } else {
          reject(new Error('Google sign-in cancelled'))
        }
      },
      error_callback: (err) => reject(new Error(formatGoogleOAuthError(err))),
    })
    tokenClient.requestAccessToken({ prompt: 'consent' })
  })
}

function persistGoogleTokens(token, expiry) {
  gisGmailService.accessToken = token
  gisGmailService.tokenExpiryMs = expiry
  gisCalendarService.accessToken = token
  gisCalendarService.tokenExpiryMs = expiry
  const payload = JSON.stringify({ token, expiry })
  try {
    sessionStorage.setItem('google_access_token', payload)
    sessionStorage.setItem('gis_gmail_token', payload)
  } catch {}
}

function applyStoredToken() {
  try {
    const raw =
      sessionStorage.getItem('google_access_token') ||
      sessionStorage.getItem('gis_gmail_token')
    if (!raw) return false
    const { token, expiry } = JSON.parse(raw)
    if (!token || Date.now() >= expiry - 30000) return false
    persistGoogleTokens(token, expiry)
    return true
  } catch {
    return false
  }
}

const NOT_CONNECTED_MSG =
  'Google is not connected. Open Raj Settings (gear icon), tap Connect Google, allow Gmail and Calendar access, then ask again.'

/** For voice client tools — never open OAuth popup mid-call (often blocked). */
export async function ensureGoogleTokenForTools() {
  if (!isGoogleConfigured()) {
    throw new Error('Google not configured. Add your Google Client ID in Settings first.')
  }
  if (applyStoredToken()) return gisGmailService.accessToken
  throw new Error(NOT_CONNECTED_MSG)
}

async function ensureGoogleToken(interactive = false) {
  if (!isGoogleConfigured()) {
    throw new Error('Google not configured. Add Client ID in Settings, then say connect Google.')
  }
  if (applyStoredToken()) return gisGmailService.accessToken
  if (interactive) return connectGoogle()
  throw new Error(NOT_CONNECTED_MSG)
}

function formatEmailLine(e, i) {
  const from = (e.from || '').replace(/<.*>/, '').trim() || 'Unknown'
  const subj = e.subject || '(no subject)'
  const unread = e.isRead ? '' : ', unread'
  return `${i + 1}. From ${from}, subject: ${subj}${unread}`
}

/** Read inbox summary for Raj to speak (API, no in-app UI). */
export async function summarizeInbox({ max = 5, unreadOnly = false } = {}) {
  await ensureGoogleTokenForTools()
  const query = unreadOnly ? 'is:unread in:inbox' : 'in:inbox'
  const emails = await gisGmailService.getEmailsSummaryFast(max, query)
  const errors = []
  if (!emails.length) {
    if (errors.length) {
      throw new Error(errors[0])
    }
    return unreadOnly
      ? 'You have no unread emails in your inbox.'
      : 'Your inbox is empty.'
  }
  const lines = emails.map(formatEmailLine)
  const suffix = errors.length ? ` (${errors.length} messages could not be loaded.)` : ''
  return `Here are your ${unreadOnly ? 'unread ' : ''}emails. ${lines.join('. ')}${suffix}`
}

/** Send email via Gmail API (like the Jarvis video). */
export async function sendGmailMessage({ to, subject, body }) {
  if (!to) throw new Error('Recipient email address is required')
  await ensureGoogleToken(true)
  await gisGmailService.sendEmail({ to, subject: subject || '', body: body || '' })
  return `Email sent to ${to} with subject: ${subject || 'no subject'}.`
}

function formatEventSpeech(ev, i) {
  const start = parseISO(ev.startTime)
  let when = format(start, 'EEEE MMMM d at h:mm a')
  if (isToday(start)) when = `today at ${format(start, 'h:mm a')}`
  else if (isTomorrow(start)) when = `tomorrow at ${format(start, 'h:mm a')}`
  return `${i + 1}. ${ev.title}, ${when}${ev.location ? `, at ${ev.location}` : ''}`
}

export async function summarizeCalendar({ max = 8 } = {}) {
  await ensureGoogleTokenForTools()
  const events = await gisCalendarService.getEvents(max)
  const now = Date.now()
  const upcoming = events
    .filter((e) => new Date(e.endTime).getTime() >= now)
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
    .slice(0, max)

  if (!upcoming.length) return 'You have no upcoming events on your calendar.'
  return `You have ${upcoming.length} upcoming events. ${upcoming.map(formatEventSpeech).join('. ')}`
}

/** Create calendar event via API. */
export async function createCalendarEvent({
  title,
  startTime,
  durationMinutes = 60,
  description = '',
  location = '',
  attendeeEmail = '',
}) {
  await ensureGoogleToken(true)
  const token = gisCalendarService.accessToken
  const start = startTime ? new Date(startTime) : addHours(new Date(), 1)
  const end = addMinutes(start, durationMinutes)

  const event = {
    summary: title || 'Meeting',
    description,
    location,
    start: { dateTime: start.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    end: { dateTime: end.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
  }
  if (attendeeEmail) {
    event.attendees = [{ email: attendeeEmail }]
  }

  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Calendar create failed (${res.status})`)
  }
  const created = await res.json()
  return `Scheduled "${title}" on ${format(start, 'EEEE MMMM d at h:mm a')}.${attendeeEmail ? ` Invitation sent to ${attendeeEmail}.` : ''} Event id ${created.id}.`
}

export function getGoogleConnectionStatus() {
  applyStoredToken()
  const connected = Boolean(
    gisGmailService.accessToken &&
    gisGmailService.tokenExpiryMs &&
    Date.now() < gisGmailService.tokenExpiryMs - 30000
  )
  return {
    configured: isGoogleConfigured(),
    connected,
  }
}

/** Settings panel — verify Gmail + Calendar APIs work. */
export async function testGoogleIntegrations() {
  const inbox = await summarizeInbox({ max: 3 })
  const calendar = await summarizeCalendar({ max: 3 })
  return { inbox, calendar }
}
