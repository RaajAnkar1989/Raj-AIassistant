/**
 * Smarter messaging & media actions — Gmail drafts, WhatsApp deep links, YouTube direct play.
 */
import gisGmailService from './gisGmailService'
import { ensureGoogleTokenForTools } from './googleIntegration'
import { isIOSDevice, isMobileDevice } from '../utils/device'
import { recordRecentApp } from '../utils/recentApps'

function isMacDesktop() {
  if (typeof navigator === 'undefined') return false
  return /Mac/i.test(navigator.platform || navigator.userAgent) && !isIOSDevice()
}

const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.in.projectsegfau.lt',
]

const DEFAULT_COUNTRY_CODE = '91'

function getDefaultCountryCode() {
  try {
    const stored = localStorage.getItem('raj_default_country_code')?.trim()
    if (stored && /^\d{1,3}$/.test(stored)) return stored
  } catch {}
  return DEFAULT_COUNTRY_CODE
}

export function normalizePhoneForWhatsApp(phone) {
  let digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 10) digits = `${getDefaultCountryCode()}${digits}`
  if (digits.startsWith('0')) digits = `${getDefaultCountryCode()}${digits.replace(/^0+/, '')}`
  return digits
}

export function openUrlSmart(url) {
  if (!url?.trim()) return false
  try {
    if (isMobileDevice()) {
      window.location.assign(url)
      return true
    }
    window.open(url, '_blank', 'noopener,noreferrer')
    return true
  } catch {
    return false
  }
}

export function buildGmailComposeUrl({ to, subject, body }) {
  const params = new URLSearchParams()
  params.set('view', 'cm')
  params.set('fs', '1')
  if (to) params.set('to', to)
  if (subject) params.set('su', subject)
  if (body) params.set('body', body)
  return `https://mail.google.com/mail/?${params.toString()}`
}

export function openComposeEmailSmart({ to, subject, body, useGmail = true }) {
  const safeSubject = String(subject || '').trim()
  const safeBody = String(body || '').trim()
  const safeTo = String(to || '').trim()

  if (useGmail || isMacDesktop()) {
    return openUrlSmart(buildGmailComposeUrl({ to: safeTo, subject: safeSubject, body: safeBody }))
  }

  const mailtoParts = []
  if (safeSubject) mailtoParts.push(`subject=${encodeURIComponent(safeSubject)}`)
  if (safeBody) mailtoParts.push(`body=${encodeURIComponent(safeBody)}`)
  const mailto = `mailto:${encodeURIComponent(safeTo)}${mailtoParts.length ? `?${mailtoParts.join('&')}` : ''}`
  return openUrlSmart(mailto)
}

export async function createGmailDraftSmart({ to, subject, body }) {
  try {
    await ensureGoogleTokenForTools()
    const draft = await gisGmailService.createDraft({ to, subject, body })
    const draftId = draft?.id
    const openUrl = draftId
      ? `https://mail.google.com/mail/u/0/#drafts?compose=${draft.message?.id || draftId}`
      : 'https://mail.google.com/mail/u/0/#drafts'
    openUrlSmart(openUrl)
    return { ok: true, draftId, openUrl, via: 'gmail_api' }
  } catch (e) {
    console.warn('[Jarvis] Gmail draft API failed, using compose URL:', e?.message)
  }

  const ok = openComposeEmailSmart({ to, subject, body, useGmail: true })
  return { ok, via: 'compose_url' }
}

export function showEmailDraftPreview(detail) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('raj-email-draft', { detail }))
}

export async function openEmailDraftSmart({ to, subject, body, toName, preview = true }) {
  const safeSubject = String(subject || '').trim() || `Message to ${toName || to}`
  const safeBody = String(body || '').trim()

  if (!safeBody) {
    return { ok: false, message: 'I need more context to write the email, Boss. Tell me what to say.' }
  }

  if (preview) {
    showEmailDraftPreview({
      to,
      toName: toName || to,
      subject: safeSubject,
      body: safeBody,
    })
  }

  const gmail = await createGmailDraftSmart({ to, subject: safeSubject, body: safeBody })
  if (gmail.ok) {
    return {
      ok: true,
      via: gmail.via,
      message:
        gmail.via === 'gmail_api'
          ? `Done, Boss. A full draft to ${toName || to} is in your Gmail — subject "${safeSubject}". Review and hit send.`
          : `Gmail compose is open for ${toName || to}, Boss. Your draft is ready to review.`,
    }
  }

  return { ok: false, message: `Couldn't open email for ${toName || to}. Check Gmail is installed or try again.` }
}

export function openWhatsAppSmart({ text, phone, displayName }) {
  const message = String(text || '').trim()
  if (!message) {
    return { ok: false, message: 'What should I tell them, Boss?' }
  }

  const encoded = encodeURIComponent(message)
  const digits = normalizePhoneForWhatsApp(phone)

  let url
  if (digits) {
    url = `https://api.whatsapp.com/send/?phone=${digits}&text=${encoded}&type=phone_number&app_absent=0`
    if (isIOSDevice()) {
      url = `whatsapp://send?phone=${digits}&text=${encoded}`
    }
  } else if (isMacDesktop()) {
    url = `https://web.whatsapp.com/send?text=${encoded}`
  } else {
    url = `whatsapp://send?text=${encoded}`
  }

  const ok = openUrlSmart(url)
  recordRecentApp('whatsapp')
  const preview = message.length > 80 ? `${message.slice(0, 80)}…` : message
  return {
    ok,
    message: ok
      ? `WhatsApp is open for ${displayName || 'your contact'}, Boss. Message ready: "${preview}". Tap send to deliver it.`
      : `Couldn't open WhatsApp for ${displayName || 'that contact'}.`,
  }
}

async function searchYouTubeVideoId(query) {
  const q = String(query || '').trim()
  if (!q) return null

  try {
    const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}`, {
      signal: AbortSignal.timeout(10000),
    })
    if (res.ok) {
      const data = await res.json()
      if (data?.videoId) return data.videoId
    }
  } catch {
    /* fall through to client-side search */
  }

  for (const base of PIPED_INSTANCES) {
    try {
      const url = `${base}/search?q=${encodeURIComponent(q)}&filter=music_songs`
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
      if (!res.ok) continue
      const data = await res.json()
      const first = data?.items?.[0]
      const videoId =
        first?.url?.match(/[?&]v=([^&]+)/)?.[1] ||
        first?.id ||
        (typeof first?.url === 'string' && first.url.length === 11 ? first.url : null)
      if (videoId) return videoId
    } catch {
      /* try next instance */
    }
  }

  return null
}

function buildYouTubePlayUrl(videoId) {
  if (isIOSDevice()) {
    return `youtube://watch?v=${videoId}`
  }
  if (isMobileDevice()) {
    return `vnd.youtube://${videoId}?autoplay=1`
  }
  return `https://www.youtube.com/watch?v=${videoId}&autoplay=1`
}

export async function openYouTubePlaySmart(query) {
  const q = String(query || '').trim()
  if (!q) {
    openUrlSmart('https://www.youtube.com')
    return { ok: true, message: 'Opening YouTube, Boss.' }
  }

  const videoId = await searchYouTubeVideoId(q)
  if (!videoId) {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`
    openUrlSmart(searchUrl)
    recordRecentApp('youtube')
    return { ok: true, message: `Searching YouTube for ${q}, Boss.` }
  }

  const url = buildYouTubePlayUrl(videoId)
  const ok = openUrlSmart(url)
  recordRecentApp('youtube')
  return {
    ok,
    videoId,
    message: ok ? `Playing ${q} on YouTube now, Boss.` : `Couldn't play ${q} on YouTube.`,
  }
}

export async function openSpotifyPlaySmart(query) {
  const q = String(query || '').trim()
  if (!q) return { ok: openUrlSmart('https://open.spotify.com'), message: 'Opening Spotify, Boss.' }

  const url = isMobileDevice()
    ? `spotify:search:${encodeURIComponent(q)}`
    : `https://open.spotify.com/search/${encodeURIComponent(q)}`
  const ok = openUrlSmart(url)
  recordRecentApp('spotify')
  return { ok, message: ok ? `Playing ${q} on Spotify, Boss.` : `Couldn't open Spotify.` }
}
