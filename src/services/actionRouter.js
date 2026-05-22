/**
 * Executes Jarvis intents — opens apps (iPhone deep links or Mac/browser).
 */
import gisCalendarService from './gisCalendarService'
import { summarizeInbox } from './googleIntegration'
import { getWeatherByCoords } from './weatherService'
import { recordRecentApp } from '../utils/recentApps'
import { resolveContactByVoice } from '../services/contactResolver'
import {
  clearActionSession,
  clearPendingAction,
  getActionSession,
  setActionSession,
  setPendingAction,
} from '../utils/actionSession'
import { format, parseISO, isToday, isTomorrow } from 'date-fns'
import {
  cancelVoiceTimers,
  formatDuration,
  parseDurationSeconds,
  startVoiceTimer,
} from './timerService'
import {
  formatCurrentDate,
  formatCurrentTime,
  pickLocalJoke,
  pickSongSnippet,
} from './utilityCommands'

const IOS_SCHEMES = {
  whatsapp: 'whatsapp://',
  messages: 'sms:',
  message: 'sms:',
  sms: 'sms:',
  instagram: 'instagram://',
  youtube: 'youtube://',
  spotify: 'spotify://',
  twitter: 'twitter://',
  x: 'twitter://',
  facebook: 'fb://',
  maps: 'maps://',
  map: 'maps://',
  mail: 'message://',
  gmail: 'googlegmail://',
  googlemail: 'googlegmail://',
  calendar: 'calshow:',
  phone: 'tel:',
  notes: 'mobilenotes://',
  reminders: 'x-apple-reminderkit://',
  settings: 'app-settings:',
  camera: 'camera://',
  photos: 'photos-redirect://',
  music: 'music://',
  clock: 'clock-worldclock://',
  safari: 'http://',
}

const DESKTOP_URLS = {
  youtube: 'https://www.youtube.com',
  yt: 'https://www.youtube.com',
  spotify: 'https://open.spotify.com',
  safari: 'https://www.apple.com/safari/',
  chrome: 'https://www.google.com/chrome/',
  google: 'https://www.google.com',
  gmail: 'https://mail.google.com',
  googlemail: 'https://mail.google.com',
  mail: 'https://mail.google.com',
  maps: 'https://maps.apple.com/',
  map: 'https://maps.apple.com/',
  calendar: 'https://calendar.google.com',
  instagram: 'https://www.instagram.com',
  twitter: 'https://twitter.com',
  x: 'https://twitter.com',
  facebook: 'https://www.facebook.com',
  whatsapp: 'https://web.whatsapp.com',
  music: 'music://',
  notes: 'notes://',
  photos: 'photos://',
  reminders: 'x-apple.reminders://',
  settings: 'x-apple.systempreferences:',
  terminal: 'terminal://',
  vscode: 'vscode://',
  cursor: 'cursor://',
  finder: 'file:///System/Library/CoreServices/Finder.app',
  netflix: 'https://www.netflix.com',
  amazon: 'https://www.amazon.com',
  prime: 'https://www.primevideo.com',
  linkedin: 'https://www.linkedin.com',
  zoom: 'zoommtg://',
  slack: 'slack://',
  discord: 'https://discord.com/app',
  tiktok: 'https://www.tiktok.com',
}

const APP_ALIASES = {
  yt: 'youtube',
  youtub: 'youtube',
  youtbe: 'youtube',
  gmaps: 'maps',
  applemaps: 'maps',
  imessage: 'messages',
  imessages: 'messages',
  texts: 'messages',
  fb: 'facebook',
  ig: 'instagram',
  mailapp: 'mail',
  systempreferences: 'settings',
  preferences: 'settings',
  prefs: 'settings',
}

import { isIOSDevice, isMobileDevice } from '../utils/device'

export function isMacDesktop() {
  if (typeof navigator === 'undefined') return false
  return /Mac/i.test(navigator.platform || navigator.userAgent) && !isIOSDevice()
}

export function normalizeAppName(raw) {
  const cleaned = String(raw || '')
    .toLowerCase()
    .replace(/^(the|my|app)\s+/g, '')
    .replace(/\s+on\s+(my\s+)?(mac|iphone|phone|computer|desktop|laptop).*$/g, '')
    .replace(/\s+app$/g, '')
    .trim()
  const key = cleaned.replace(/\s+/g, '')
  if (!key) return ''
  return APP_ALIASES[key] || key.split(/\s+/)[0]
}

export function parseOpenAppCommand(command) {
  const lower = String(command || '').toLowerCase().trim()
  const match = lower.match(/^open\s+(?:the\s+)?(.+)$/)
  if (!match) return null
  const name = normalizeAppName(match[1])
  return name || null
}

export function openUrl(url) {
  if (!url?.trim()) return false
  try {
    if (isMobileDevice()) {
      window.location.assign(url)
      return true
    }
    if (/^https?:\/\//i.test(url)) {
      window.open(url, '_blank', 'noopener,noreferrer')
      return true
    }
    const link = document.createElement('a')
    link.href = url
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    link.remove()
    return true
  } catch {
    return false
  }
}

export function openWhatsApp({ text, phone }) {
  const encoded = encodeURIComponent(text || '')
  if (phone) {
    const digits = phone.replace(/\D/g, '')
    if (!digits) return openUrl(`whatsapp://send?text=${encoded}`)
    if (isIOSDevice()) {
      return openUrl(`whatsapp://send?phone=${digits}&text=${encoded}`)
    }
    return openUrl(`https://wa.me/${digits}?text=${encoded}`)
  }
  if (isMacDesktop()) {
    return openUrl(`https://web.whatsapp.com/send?text=${encoded}`)
  }
  return openUrl(`whatsapp://send?text=${encoded}`)
}

export function openSms({ text, phone }) {
  const body = encodeURIComponent(text || '')
  if (phone) {
    return openUrl(`sms:${phone.replace(/\s/g, '')}?body=${body}`)
  }
  return openUrl(`sms:&body=${body}`)
}

export function openComposeEmail({ to, subject, body, useGmail }) {
  const q = new URLSearchParams()
  if (to) q.set('to', to)
  if (subject) q.set('subject', subject)
  if (body) q.set('body', body)
  if (useGmail && !isMacDesktop()) {
    return openUrl(`googlegmail:///co?${q.toString()}`)
  }
  if (isMacDesktop()) {
    return openUrl(`https://mail.google.com/mail/?view=cm&${q.toString()}`)
  }
  return openUrl(`mailto:${to || ''}?${q.toString()}`)
}

export { isIOSDevice, isMobileDevice, isAndroidDevice } from '../utils/device'

function buildYouTubeSearchUrl(query) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
}

function buildSpotifySearchUrl(query) {
  return `https://open.spotify.com/search/${encodeURIComponent(query)}`
}

export function openYouTubeSearch(query) {
  const q = String(query || '').trim()
  if (!q) return openApp('youtube')
  const url = buildYouTubeSearchUrl(q)
  const ok = openUrl(url)
  if (ok) recordRecentApp('youtube')
  return {
    ok,
    message: ok ? `Playing ${q} on YouTube.` : `Couldn't search YouTube for ${q}.`,
  }
}

export function openSpotifySearch(query) {
  const q = String(query || '').trim()
  if (!q) return openApp('spotify')
  const url = isMobileDevice() ? `spotify:search:${encodeURIComponent(q)}` : buildSpotifySearchUrl(q)
  const ok = openUrl(url)
  if (ok) recordRecentApp('spotify')
  return {
    ok,
    message: ok ? `Playing ${q} on Spotify.` : `Couldn't search Spotify for ${q}.`,
  }
}

export function openAppAction({ appName, searchQuery, needsSearchQuery } = {}) {
  const key = normalizeAppName(appName || 'app')

  if (needsSearchQuery && !searchQuery) {
    return { ok: false, needsSearchQuery: true, appName: key, message: 'Which song or video?' }
  }

  if (searchQuery) {
    if (key === 'youtube' || key === 'yt') return openYouTubeSearch(searchQuery)
    if (key === 'spotify') return openSpotifySearch(searchQuery)
    if (isMacDesktop()) {
      const ok = openUrl(`https://www.google.com/search?q=${encodeURIComponent(`${searchQuery} ${key}`)}`)
      return { ok, message: ok ? `Searching for ${searchQuery}.` : 'Search failed.' }
    }
  }

  return openApp(appName)
}

export function openApp(appName) {
  const key = normalizeAppName(appName)
  const label = key || 'app'
  if (!key) {
    return { ok: false, message: 'Which app should I open?' }
  }

  const onMac = isMacDesktop()
  const url = onMac ? DESKTOP_URLS[key] || IOS_SCHEMES[key] : IOS_SCHEMES[key] || DESKTOP_URLS[key]

  if (!url) {
    const guess = onMac ? `https://www.google.com/search?q=${encodeURIComponent(label)}` : `${key}://`
    const ok = openUrl(guess)
    if (ok) recordRecentApp(key)
    return {
      ok,
      message: ok
        ? onMac
          ? `Opening ${label} in your browser.`
          : `Trying to open ${label}.`
        : `I couldn't open ${label} on this device.`,
    }
  }

  const ok = openUrl(url)
  const via = /^https?:/i.test(url) ? 'browser' : 'app'
  if (ok) recordRecentApp(key)
  return {
    ok,
    message: ok
      ? via === 'browser'
        ? `Opening ${label} in your browser.`
        : `Opening ${label}.`
      : `I couldn't open ${label}. Try opening it manually.`,
  }
}

export function openCalendarApp() {
  if (isMacDesktop()) return openUrl('https://calendar.google.com')
  return openUrl('calshow:')
}

function formatEventForSpeech(ev) {
  const start = parseISO(ev.startTime)
  let when = format(start, 'EEEE, MMMM d at h:mm a')
  if (isToday(start)) when = `today at ${format(start, 'h:mm a')}`
  else if (isTomorrow(start)) when = `tomorrow at ${format(start, 'h:mm a')}`
  return `${ev.title} ${when}${ev.location ? ` at ${ev.location}` : ''}`
}

async function resolvePerson(d) {
  const query = d.contact || d.recipient || d.toName || ''
  let displayName = d.displayName || d.toName || query || 'them'
  let phone = d.phone || ''
  let email = d.to && String(d.to).includes('@') ? d.to : ''

  if (query || (!phone && !email)) {
    const hit = await resolveContactByVoice(query || displayName)
    if (hit) {
      displayName = hit.name || displayName
      phone = phone || hit.phone || ''
      email = email || hit.email || ''
    }
  }

  return { displayName, phone, email }
}

function rememberLastAction(payload) {
  setActionSession({ pending: null, lastAction: { ...payload, at: Date.now() } })
}

async function executeSessionConfirm(speak) {
  const session = getActionSession()
  let pending = session?.pending

  if (!pending && session?.lastAction) {
    const last = session.lastAction
    if (last.intent === 'send_whatsapp' && last.phone && last.text) {
      openWhatsApp({ text: last.text, phone: last.phone })
      await speak(`Reopened WhatsApp for ${last.displayName}. Tap send.`)
      return
    }
    if (last.intent === 'compose_email' && last.to) {
      openComposeEmail({
        to: last.to,
        subject: last.subject || '',
        body: last.body || '',
      })
      await speak(`Reopened your email to ${last.displayName}.`)
      return
    }
  }

  if (!pending) {
    await speak('Nothing pending. What would you like?')
    return
  }

  if (pending.intent === 'compose_email' || pending.type === 'email') {
    const person = pending.to ? null : await resolvePerson(pending)
    const to = pending.to || person?.email
    if (!to) {
      await speak(
        `I couldn't find an email for ${pending.displayName || pending.contact} in your Google contacts. Connect Google in Settings.`
      )
      return
    }
    openComposeEmail({
      to,
      subject: pending.subject || '',
      body: pending.body || '',
      useGmail: pending.useGmail !== false,
    })
    rememberLastAction({
      intent: 'compose_email',
      displayName: pending.toName || pending.displayName,
      to,
      subject: pending.subject,
      body: pending.body,
      opened: true,
    })
    await speak(`Done. Review the email to ${pending.toName || pending.displayName}, then send.`)
    return
  }

  if (pending.intent === 'send_whatsapp' || pending.type === 'whatsapp') {
    const person = pending.phone ? { phone: pending.phone, displayName: pending.displayName } : await resolvePerson(pending)
    if (!person.phone) {
      await speak(
        `I couldn't find ${pending.displayName || pending.contact} in your Google contacts. Connect Google in Settings — I'll find them from your voice.`
      )
      return
    }
    openWhatsApp({ text: pending.rewrittenText || '', phone: person.phone })
    rememberLastAction({
      intent: 'send_whatsapp',
      displayName: pending.displayName || person.displayName,
      phone: person.phone,
      text: pending.rewrittenText,
      opened: true,
    })
    await speak(`WhatsApp is ready for ${pending.displayName || person.displayName}. Tap send.`)
    return
  }

  if (pending.intent === 'send_sms') {
    const person = pending.phone ? { phone: pending.phone } : await resolvePerson(pending)
    openSms({ text: pending.rewrittenText || '', phone: person.phone })
    rememberLastAction({ intent: 'send_sms', displayName: pending.displayName, opened: true })
    await speak('Messages is ready. Tap send.')
  }
}

async function executeSessionContinue(speak) {
  const session = getActionSession()
  const pending = session?.pending
  const last = session?.lastAction

  if (pending?.status === 'awaiting_message') {
    await speak(`What should I tell ${pending.displayName || pending.contact}?`)
    return
  }

  if (pending?.status === 'awaiting_confirm') {
    const preview = pending.body ? pending.body.slice(0, 120) : ''
    await speak(
      `Draft for ${pending.toName || pending.displayName}. Subject: ${pending.subject || 'none'}. ${preview}. Say send it when ready, or tell me changes.`
    )
    return
  }

  if (last?.opened) {
    if (last.intent === 'compose_email') {
      await speak(`Your email draft to ${last.displayName} is still ready. Say send it to open it again, or ask for changes.`)
      return
    }
    if (last.intent === 'send_whatsapp') {
      await speak(`WhatsApp to ${last.displayName} is ready. Say send it if you need me to reopen it.`)
      return
    }
  }

  await speak('What should we pick up? You can draft a message, email someone, or open an app.')
}

export async function readCalendarAloud() {
  try {
    const events = await gisCalendarService.getEvents(15)
    const now = Date.now()
    const upcoming = events
      .filter((e) => new Date(e.endTime).getTime() >= now)
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
      .slice(0, 8)

    if (!upcoming.length) {
      return 'You have nothing coming up on your calendar.'
    }
    const lines = upcoming.map((e, i) => `${i + 1}. ${formatEventForSpeech(e)}`)
    return `You have ${upcoming.length} upcoming events. ${lines.join('. ')}`
  } catch (e) {
    if (String(e.message).includes('Client ID')) {
      return 'Connect Google Calendar in settings first, then I can read your schedule aloud.'
    }
    throw e
  }
}

export async function executeIntent(intent, aiData, speak) {
  const d = aiData || {}

  if (intent === 'session_confirm') {
    await executeSessionConfirm(speak)
    return
  }
  if (intent === 'session_continue') {
    await executeSessionContinue(speak)
    return
  }
  if (intent === 'session_cancel') {
    clearPendingAction()
    await speak('Cancelled.')
    return
  }

  switch (intent) {
    case 'send_whatsapp': {
      const person = await resolvePerson(d)
      const text = (d.rewrittenText || d.message || '').trim()
      const displayName = person.displayName

      if (!text || d.needsMessage) {
        setPendingAction({
          intent: 'send_whatsapp',
          type: 'whatsapp',
          status: 'awaiting_message',
          contact: d.contact || displayName,
          displayName,
          phone: person.phone,
        })
        await speak(`What should I tell ${displayName}?`)
        return
      }

      if (!person.phone) {
        await speak(
          `I couldn't find ${displayName} in your Google contacts. Connect Google in Settings once — I'll match names from your voice.`
        )
        return
      }

      openWhatsApp({ text, phone: person.phone })
      rememberLastAction({
        intent: 'send_whatsapp',
        displayName,
        phone: person.phone,
        text,
        opened: true,
      })
      await speak(`WhatsApp ready for ${displayName}. Tap send.`)
      return
    }
    case 'send_sms': {
      const person = await resolvePerson(d)
      const text = (d.rewrittenText || d.message || '').trim()

      if (!text || d.needsMessage) {
        setPendingAction({
          intent: 'send_sms',
          status: 'awaiting_message',
          contact: d.contact || person.displayName,
          displayName: person.displayName,
          phone: person.phone,
        })
        await speak(`What should I text ${person.displayName}?`)
        return
      }

      openSms({ text, phone: person.phone })
      rememberLastAction({ intent: 'send_sms', displayName: person.displayName, opened: true })
      await speak('Messages ready. Tap send.')
      return
    }
    case 'compose_email': {
      const person = await resolvePerson(d)
      const to = person.email
      const toName = d.toName || person.displayName
      const subject = (d.subject || d.topic || '').trim()
      const body = (d.body || d.rewrittenText || '').trim()

      if (!to) {
        setPendingAction({
          intent: 'compose_email',
          type: 'email',
          status: 'awaiting_confirm',
          contact: d.contact || toName,
          displayName: toName,
          toName,
          subject,
          body,
        })
        await speak(
          `I couldn't find an email for ${toName} in your Google contacts. Connect Google in Settings so I can look them up by voice.`
        )
        return
      }

      if (d.awaitConfirm !== false && !d.confirmed && (subject || body)) {
        setPendingAction({
          intent: 'compose_email',
          type: 'email',
          status: 'awaiting_confirm',
          contact: d.contact || toName,
          displayName: toName,
          toName,
          to,
          subject,
          body,
          useGmail: d.useGmail !== false,
        })
        const preview = body.length > 100 ? `${body.slice(0, 100)}…` : body
        await speak(
          `Draft to ${toName}. Subject: ${subject || 'no subject'}. ${preview}. Say send it to open, or tell me what to change.`
        )
        return
      }

      openComposeEmail({ to, subject, body, useGmail: d.useGmail !== false })
      rememberLastAction({ intent: 'compose_email', displayName: toName, to, subject, body, opened: true })
      await speak(`Done. Email to ${toName} is ready. Review and send.`)
      return
    }
    case 'open_app': {
      if (d.needsSearchQuery && !d.searchQuery) {
        setPendingAction({
          intent: 'open_app',
          appName: d.appName || 'youtube',
          status: 'awaiting_search',
        })
        await speak('Which song or video?')
        return
      }
      const result = openAppAction({
        appName: d.appName || 'app',
        searchQuery: d.searchQuery,
      })
      if (result.ok && d.searchQuery) clearPendingAction()
      if (result.ok) {
        void speak(result.message || 'Done.')
      } else {
        await speak(result.message || 'Could not open that.')
      }
      return
    }
    case 'open_calendar': {
      openCalendarApp()
      void speak('Done.')
      return
    }
    case 'read_calendar': {
      const summary = await readCalendarAloud()
      await speak(summary)
      return
    }
    case 'read_emails': {
      const summary = await summarizeInbox({ max: 5 })
      await speak(summary)
      return
    }
    case 'weather': {
      const summary = await getWeatherByCoords()
      await speak(summary)
      return
    }
    case 'call_contact': {
      const person = await resolvePerson(d)
      const phone = person.phone || d.phone
      if (phone) {
        openUrl(`tel:${phone.replace(/\s/g, '')}`)
        await speak(`Calling ${person.displayName} now.`)
      } else {
        await speak(`I couldn't find ${person.displayName} in your Google contacts. Connect Google in Settings.`)
      }
      return
    }
    case 'show_time': {
      await speak(`It is ${formatCurrentTime()}.`)
      return
    }
    case 'show_date': {
      await speak(`Today is ${formatCurrentDate()}.`)
      return
    }
    case 'set_timer': {
      const seconds =
        Number(d.durationSeconds) > 0
          ? Number(d.durationSeconds)
          : parseDurationSeconds(d.duration || d.label || '')
      if (!seconds) {
        await speak('How long should I set the timer for? Try five minutes.')
        return
      }
      const label = (d.label || 'Timer').trim()
      startVoiceTimer({ seconds, label })
      const confirm =
        d.responseText ||
        `${formatDuration(seconds)} timer started${label && label !== 'Timer' ? ` for ${label}` : ''}.`
      await speak(confirm)
      return
    }
    case 'cancel_timers': {
      const count = cancelVoiceTimers()
      await speak(
        count > 0
          ? `Cancelled ${count} active timer${count === 1 ? '' : 's'}.`
          : 'No active timers right now.'
      )
      return
    }
    case 'tell_joke': {
      const joke = (d.responseText || '').trim() || pickLocalJoke()
      await speak(joke)
      return
    }
    case 'sing_song': {
      const lyrics =
        (d.responseText || '').trim() ||
        pickSongSnippet(d.songTitle || d.title || '') ||
        'La la la — give me a song name and I will do my best.'
      const intro = d.songTitle ? `Here is ${d.songTitle}. ` : ''
      await speak(`${intro}${lyrics}`)
      return
    }
    case 'calculate': {
      const answer = d.result || d.responseText
      if (answer) {
        await speak(d.responseText || `That equals ${answer}.`)
        return
      }
      await speak('I could not calculate that. Try saying it like twenty-five times four.')
      return
    }
    case 'open_reminders': {
      openApp('reminders')
      await speak(d.responseText || 'Opening Reminders.')
      return
    }
    case 'general_chat': {
      await speak(d.responseText || "I'm here. What would you like me to do?")
      return
    }
    case 'help': {
      await speak(
        d.responseText ||
          'Try: what time is it, set a five minute timer, tell me a joke, sing a song, message my wife on WhatsApp, open YouTube, or check weather.'
      )
      return
    }
    default: {
      await speak("Try: open YouTube, draft an email, or message someone on WhatsApp.")
    }
  }
}

export function clearRajSession() {
  clearActionSession()
}
