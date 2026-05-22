/**
 * Resolve contacts by voice using Google Contacts (no manual list in Settings).
 */
import { ensureGoogleTokenForTools, getGoogleConnectionStatus } from './googleIntegration'
import gisGmailService from './gisGmailService'

const CACHE_KEY = 'raj_voice_contact_cache'
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

const RELATION_ALIASES = {
  wife: ['wife', 'spouse', 'partner'],
  husband: ['husband', 'spouse', 'partner'],
  mom: ['mom', 'mum', 'mother'],
  dad: ['dad', 'father'],
  brother: ['brother'],
  sister: ['sister'],
  son: ['son'],
  daughter: ['daughter'],
}

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s@.+]/g, ' ')
    .replace(/\s+/g, ' ')
}

function digitsOnly(phone) {
  return String(phone || '').replace(/\D/g, '')
}

function parsePhoneFromQuery(query) {
  const raw = String(query || '')
  const match = raw.match(/(\+?\d[\d\s-]{7,}\d)/)
  if (!match) return ''
  const digits = digitsOnly(match[1])
  return digits.length >= 10 ? digits : ''
}

function loadCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return {}
    const { entries, at } = JSON.parse(raw)
    if (!at || Date.now() - at > CACHE_TTL_MS) return {}
    return entries || {}
  } catch {
    return {}
  }
}

function saveCacheEntry(key, value) {
  const entries = loadCache()
  entries[normalize(key)] = { ...value, at: Date.now() }
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ entries, at: Date.now() }))
  } catch {}
}

function personToContact(person) {
  const name = person.names?.[0]?.displayName || person.names?.[0]?.givenName || ''
  const phone = person.phoneNumbers?.[0]?.value || person.phoneNumbers?.[0]?.canonicalForm || ''
  const email = person.emailAddresses?.[0]?.value || ''
  return {
    name: name || 'Contact',
    phone: digitsOnly(phone) || phone,
    email: email.trim(),
    resourceName: person.resourceName,
  }
}

function scorePerson(person, query) {
  const q = normalize(query)
  if (!q) return 0
  let score = 0

  const names = person.names || []
  for (const n of names) {
    const parts = [n.displayName, n.givenName, n.familyName, n.unstructuredName].filter(Boolean).map(normalize)
    for (const p of parts) {
      if (p === q) score += 100
      else if (p.includes(q) || q.includes(p)) score += 70
    }
  }

  for (const nick of person.nicknames || []) {
    const v = normalize(nick.value)
    if (v === q) score += 90
    else if (v.includes(q) || q.includes(v)) score += 60
  }

  for (const rel of person.relations || []) {
    const label = normalize(rel.formattedType || rel.type || '')
    const aliases = RELATION_ALIASES[q] || [q]
    if (aliases.some((a) => label.includes(a) || a.includes(label))) score += 85
  }

  if (person.phoneNumbers?.length) score += 5
  if (person.emailAddresses?.length) score += 3

  return score
}

async function googleFetch(path, token, timeoutMs = 4000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`https://people.googleapis.com/v1/${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
    if (!res.ok) {
      let detail = ''
      try {
        const j = await res.json()
        detail = j?.error?.message || ''
      } catch {}
      throw new Error(detail || `Google Contacts failed (${res.status})`)
    }
    return res.json()
  } finally {
    clearTimeout(timer)
  }
}

async function searchGoogleContacts(query, token) {
  const readMask = encodeURIComponent('names,phoneNumbers,emailAddresses,relations,nicknames')
  const data = await googleFetch(
    `people:searchContacts?query=${encodeURIComponent(query)}&readMask=${readMask}&pageSize=15`,
    token
  )
  return (data.results || []).map((r) => r.person).filter(Boolean)
}

async function listGoogleConnections(token) {
  const people = []
  let pageToken = ''
  for (let i = 0; i < 3; i += 1) {
    const fields = encodeURIComponent('names,phoneNumbers,emailAddresses,relations,nicknames')
    const path = `people/me/connections?personFields=${fields}&pageSize=500${pageToken ? `&pageToken=${pageToken}` : ''}`
    const data = await googleFetch(path, token)
    people.push(...(data.connections || []))
    pageToken = data.nextPageToken
    if (!pageToken) break
  }
  return people
}

async function lookupGoogleContact(query) {
  const status = getGoogleConnectionStatus()
  if (!status.connected) return null

  try {
    await ensureGoogleTokenForTools()
  } catch {
    return null
  }

  const token = gisGmailService.accessToken
  if (!token) return null

  const q = normalize(query)
  if (!q) return null

  try {
    const searched = await searchGoogleContacts(q, token)
    let best = null
    let bestScore = 0
    for (const person of searched) {
      const score = scorePerson(person, q)
      if (score > bestScore) {
        bestScore = score
        best = person
      }
    }

    if (bestScore < 40) {
      const connections = await listGoogleConnections(token)
      for (const person of connections) {
        const score = scorePerson(person, q)
        if (score > bestScore) {
          bestScore = score
          best = person
        }
      }
    }

    if (!best || bestScore < 35) return null
    const contact = personToContact(best)
    if (!contact.phone && !contact.email) return null
    saveCacheEntry(q, contact)
    return contact
  } catch (e) {
    console.warn('[Raj] Google contact lookup failed:', e.message)
    return null
  }
}

/** Resolve a person from voice — Google Contacts first, then session cache. */
export async function resolveContactByVoice(query) {
  const q = String(query || '').trim()
  if (!q) return null

  if (q.includes('@')) {
    return { name: q.split('@')[0], phone: '', email: q }
  }

  const phoneFromQuery = parsePhoneFromQuery(q)
  if (phoneFromQuery) {
    return { name: q, phone: phoneFromQuery, email: '' }
  }

  const cached = loadCache()[normalize(q)]
  if (cached?.phone || cached?.email) {
    return {
      name: cached.name,
      phone: cached.phone || '',
      email: cached.email || '',
    }
  }

  return lookupGoogleContact(q)
}

export function contactsPromptHint() {
  return ''
}
