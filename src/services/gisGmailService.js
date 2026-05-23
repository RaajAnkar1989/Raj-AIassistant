// Lightweight Gmail integration using Google Identity Services (GIS)
// - No gapi dependency
// - Uses OAuth2 token client to fetch Gmail via REST

const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

class GisGmailService {
  constructor() {
    this.googleLoaded = false
    this.loadingPromise = null
    this.accessToken = null
    this.tokenExpiryMs = null
    try {
      const raw =
        (typeof sessionStorage !== 'undefined' &&
          (sessionStorage.getItem('google_access_token') || sessionStorage.getItem('gis_gmail_token'))) ||
        (typeof localStorage !== 'undefined' && localStorage.getItem('google_access_token'))
      const stored = raw ? JSON.parse(raw) : null
      if (stored?.token && stored?.expiry && Date.now() < stored.expiry - 30000) {
        this.accessToken = stored.token
        this.tokenExpiryMs = stored.expiry
      }
    } catch {}
  }

  persistToken(token, expiry) {
    this.accessToken = token
    this.tokenExpiryMs = expiry
    const payload = JSON.stringify({ token, expiry })
    try {
      sessionStorage.setItem('google_access_token', payload)
      sessionStorage.setItem('gis_gmail_token', payload)
      localStorage.setItem('google_access_token', payload)
    } catch {}
  }

  getClientId() {
    const envClientId = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GOOGLE_CLIENT_ID) || null
    const storedClientId = typeof window !== 'undefined' ? localStorage.getItem('gmail_client_id') : null
    return envClientId || storedClientId || ''
  }

  async loadGisScript() {
    if (this.googleLoaded) return true
    if (this.loadingPromise) return this.loadingPromise
    this.loadingPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        resolve(false)
        return
      }

      if (window.google && window.google.accounts) {
        this.googleLoaded = true
        resolve(true)
        return
      }

      const script = document.createElement('script')
      script.src = GIS_SCRIPT_SRC
      script.async = true
      script.defer = true
      script.onload = () => {
        this.googleLoaded = true
        resolve(true)
      }
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
      document.head.appendChild(script)
    })
    return this.loadingPromise
  }

  hasValidToken() {
    if (!this.accessToken) return false
    if (!this.tokenExpiryMs) return false
    return Date.now() < this.tokenExpiryMs - 30000 // 30s early refresh
  }

  async requestAccessToken(scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.metadata'
  ], { prompt = 'none' } = {}) {
    await this.loadGisScript()
    const clientId = this.getClientId()
    if (!clientId) throw new Error('Missing Google Client ID. Set VITE_GOOGLE_CLIENT_ID or save it in Settings.')

    return new Promise((resolve, reject) => {
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: scopes.join(' '),
          callback: (response) => {
            if (response && response.access_token) {
              const expiresIn = typeof response.expires_in === 'number' ? response.expires_in : 3600
              const expiry = Date.now() + expiresIn * 1000
              this.persistToken(response.access_token, expiry)
              resolve(this.accessToken)
            } else {
              reject(new Error('No access token received'))
            }
          },
          error_callback: (err) => reject(err),
        })
        tokenClient.requestAccessToken({ prompt })
      } catch (e) {
        reject(e)
      }
    })
  }

  async ensureAccessToken({ allowInteractive = false } = {}) {
    if (this.hasValidToken()) return this.accessToken
    // Try silent first
    try {
      return await this.requestAccessToken(undefined, { prompt: 'none' })
    } catch (e) {
      if (allowInteractive) {
        return this.requestAccessToken(undefined, { prompt: 'consent' })
      }
      throw e
    }
  }

  /** Fast unread count for HUD (uses resultSizeEstimate, no full message fetch). */
  async getUnreadInboxCount() {
    if (!this.hasValidToken()) {
      throw new Error('Gmail not connected. Connect Google in Settings first.')
    }
    const token = this.accessToken
    const url =
      'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=1&labelIds=INBOX&q=' +
      encodeURIComponent('is:unread')
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      let detail = ''
      try {
        const j = await res.json()
        detail = j?.error?.message || ''
      } catch {}
      throw new Error(detail || `Failed to count unread mail (${res.status})`)
    }
    const data = await res.json()
    if (typeof data.resultSizeEstimate === 'number') return data.resultSizeEstimate
    return Array.isArray(data.messages) ? data.messages.length : 0
  }

  async listMessageIds(maxResults = 20, query = '') {
    if (!this.hasValidToken()) {
      throw new Error('Gmail not connected. Connect Google in Settings first.')
    }
    const token = this.accessToken
    const q = query ? `&q=${encodeURIComponent(query)}` : ''
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&labelIds=INBOX${q}`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      let detail = ''
      try {
        const j = await res.json()
        detail = j?.error?.message || ''
      } catch {}
      if (res.status === 403) {
        throw new Error(
          detail ||
            'Gmail API access denied. Enable Gmail API in Google Cloud and reconnect with Connect Google.'
        )
      }
      throw new Error(detail || `Failed to list Gmail messages (${res.status})`)
    }
    const data = await res.json()
    return data.messages || []
  }

  async getMessage(messageId) {
    const token = this.hasValidToken() ? this.accessToken : await this.ensureAccessToken()
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      let detail = ''
      try { const j = await res.json(); detail = (j && j.error && j.error.message) ? j.error.message : '' } catch {}
      if (res.status === 403) {
        // Fallback to metadata-only fetch (works with gmail.metadata scope)
        return this.getMessageMetadata(messageId)
      }
      throw new Error(`Failed to get message ${messageId}: ${res.status} ${detail}`)
    }
    return res.json()
  }

  async getMessageMetadata(messageId) {
    const token = await this.ensureAccessToken()
    const metaUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`
    const res = await fetch(metaUrl, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      let detail = ''
      try { const j = await res.json(); detail = (j && j.error && j.error.message) ? j.error.message : '' } catch {}
      throw new Error(`Failed to get message metadata ${messageId}: ${res.status} ${detail}`)
    }
    const message = await res.json()
    // Synthesize a minimal message-like structure compatible with downstream parsing
    return {
      id: message.id,
      threadId: message.threadId,
      labelIds: message.labelIds || [],
      snippet: message.snippet || '',
      internalDate: message.internalDate,
      payload: { headers: message.payload?.headers || [] },
    }
  }

  decodeBase64Url(data) {
    try {
      // Gmail uses base64url
      const base64 = data.replace(/-/g, '+').replace(/_/g, '/')
      const decoded = atob(base64)
      // Handle UTF-8
      try {
        return decodeURIComponent(escape(decoded))
      } catch {
        return decoded
      }
    } catch {
      return ''
    }
  }

  extractBody(payload) {
    if (!payload) return ''
    if (payload.body && payload.body.data) return this.decodeBase64Url(payload.body.data)
    if (payload.parts && Array.isArray(payload.parts)) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body && part.body.data) return this.decodeBase64Url(part.body.data)
      }
      for (const part of payload.parts) {
        if (part.mimeType === 'text/html' && part.body && part.body.data) return this.decodeBase64Url(part.body.data)
      }
    }
    return ''
  }

  headerValue(headers, name) {
    const h = (headers || []).find(h => h.name === name)
    return h ? h.value : ''
  }

  labelMap(labelIds = []) {
    const map = {
      INBOX: 'inbox',
      SENT: 'sent',
      DRAFT: 'draft',
      SPAM: 'spam',
      TRASH: 'trash',
      IMPORTANT: 'important',
      STARRED: 'starred',
      UNREAD: 'unread',
    }
    return labelIds.map(id => map[id]).filter(Boolean)
  }

  priorityFromHeaders(headers) {
    const pri = this.headerValue(headers, 'X-Priority')
    const imp = this.headerValue(headers, 'Importance')
    if (pri === '1' || imp.toLowerCase() === 'high') return 'high'
    if (pri === '5' || imp.toLowerCase() === 'low') return 'low'
    return 'medium'
  }

  async getEmailsWithStatus(maxResults = 20, query = '') {
    const ids = await this.listMessageIds(maxResults, query)
    const emails = []
    const errors = []
    const concurrency = 5
    let index = 0
    const runNext = async () => {
      if (index >= ids.length) return
      const current = index++
      try {
        const m = await this.getMessage(ids[current].id)
        const headers = m.payload?.headers || []
        emails.push({
          id: m.id,
          threadId: m.threadId,
          snippet: m.snippet || '',
          timestamp: m.internalDate ? new Date(parseInt(m.internalDate, 10)).toISOString() : new Date().toISOString(),
          isRead: !(m.labelIds || []).includes('UNREAD'),
          isImportant: (m.labelIds || []).includes('IMPORTANT'),
          from: this.headerValue(headers, 'From'),
          to: this.headerValue(headers, 'To'),
          subject: this.headerValue(headers, 'Subject') || '(no subject)',
          date: this.headerValue(headers, 'Date'),
          body: this.extractBody(m.payload),
          priority: this.priorityFromHeaders(headers),
          labels: this.labelMap(m.labelIds),
        })
      } catch (e) {
        errors.push(e?.message || 'Failed to load message')
      }
      return runNext()
    }
    const workers = Array.from({ length: Math.min(concurrency, Math.max(ids.length, 1)) }, () => runNext())
    await Promise.all(workers)
    emails.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    return { emails, errors }
  }

  /** Fast path for voice — metadata only (avoids long tool calls that drop WebRTC). */
  async getEmailsSummaryFast(maxResults = 5, query = '') {
    const ids = await this.listMessageIds(maxResults, query)
    const emails = []
    for (const { id } of ids) {
      try {
        const m = await this.getMessageMetadata(id)
        const headers = m.payload?.headers || []
        emails.push({
          from: this.headerValue(headers, 'From'),
          subject: this.headerValue(headers, 'Subject') || '(no subject)',
          isRead: !(m.labelIds || []).includes('UNREAD'),
        })
      } catch {
        // skip single message
      }
    }
    return emails
  }

  async getEmails(maxResults = 20, query = '') {
    const { emails } = await this.getEmailsWithStatus(maxResults, query)
    return emails
  }

  toBase64Url(str) {
    const b64 = btoa(unescape(encodeURIComponent(str)))
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
  }

  buildRawEmail({ to, subject, body }) {
    return [
      `To: ${to}`,
      'Content-Type: text/plain; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${subject}`,
      '',
      body || '',
    ].join('\r\n')
  }

  async createDraft({ to, subject, body }) {
    if (!this.hasValidToken()) {
      await this.ensureAccessToken({ allowInteractive: false })
    }
    if (!this.hasValidToken()) {
      throw new Error('Gmail not connected. Connect Google in Settings first.')
    }
    const token = this.accessToken
    const encoded = this.toBase64Url(this.buildRawEmail({ to, subject, body }))
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: { raw: encoded } }),
    })
    if (!res.ok) {
      let detail = ''
      try {
        const j = await res.json()
        detail = j?.error?.message || ''
      } catch {}
      throw new Error(detail || `Failed to create Gmail draft (${res.status})`)
    }
    return res.json()
  }

  async sendEmail({ to, subject, body }) {
    // Ensure send scope
    await this.requestAccessToken([
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.metadata',
    ], { prompt: 'consent' })
    const token = await this.ensureAccessToken()
    const raw = this.buildRawEmail({ to, subject, body })
    const encoded = this.toBase64Url(raw)
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encoded }),
    })
    if (!res.ok) {
      let detail = ''
      try { const j = await res.json(); detail = (j && j.error && j.error.message) ? j.error.message : '' } catch {}
      throw new Error(`Failed to send email: ${res.status} ${detail}`)
    }
    return res.json()
  }
}

const gisGmailService = new GisGmailService()
export default gisGmailService


