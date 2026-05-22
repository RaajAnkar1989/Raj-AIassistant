// Lightweight Google Calendar via Google Identity Services (no gapi)

const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

class GisCalendarService {
  constructor() {
    this.googleLoaded = false
    this.loadingPromise = null
    this.accessToken = null
    this.tokenExpiryMs = null
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
    if (!this.accessToken || !this.tokenExpiryMs) return false
    return Date.now() < this.tokenExpiryMs - 30000
  }

  async requestAccessToken(scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ]) {
    await this.loadGisScript()
    const clientId = this.getClientId()
    if (!clientId) throw new Error('Missing Google Client ID')

    return new Promise((resolve, reject) => {
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: scopes.join(' '),
          callback: (response) => {
            if (response && response.access_token) {
              this.accessToken = response.access_token
              const expiresIn = typeof response.expires_in === 'number' ? response.expires_in : 3600
              this.tokenExpiryMs = Date.now() + expiresIn * 1000
              resolve(this.accessToken)
            } else {
              reject(new Error('No access token received'))
            }
          },
          error_callback: (err) => reject(err),
        })
        tokenClient.requestAccessToken()
      } catch (e) {
        reject(e)
      }
    })
  }

  async ensureAccessToken() {
    if (this.hasValidToken()) return this.accessToken
    return this.requestAccessToken()
  }

  async listEvents(maxResults = 25) {
    if (!this.hasValidToken()) {
      throw new Error('Calendar not connected. Connect Google in Settings first.')
    }
    const token = this.accessToken
    const timeMin = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&maxResults=${maxResults}`
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
        const needsEnable = /has not been used|is disabled|accessNotConfigured/i.test(detail)
        throw new Error(
          needsEnable
            ? `${detail} In Google Cloud Console → APIs & Services → Library → search "Google Calendar API" → Enable. Wait 2–5 minutes, then Settings → Connect Google again.`
            : detail ||
                'Calendar API access denied. Enable Google Calendar API in Cloud Console and reconnect.'
        )
      }
      throw new Error(detail || `Failed to list calendar events (${res.status})`)
    }
    const data = await res.json()
    return data.items || []
  }

  toLocalEvent(googleEvent) {
    const start = googleEvent.start?.dateTime || (googleEvent.start?.date ? `${googleEvent.start.date}T00:00:00Z` : new Date().toISOString())
    const end = googleEvent.end?.dateTime || (googleEvent.end?.date ? `${googleEvent.end.date}T23:59:59Z` : new Date().toISOString())
    return {
      id: googleEvent.id,
      title: googleEvent.summary || '(No title)',
      description: googleEvent.description || '',
      startTime: start,
      endTime: end,
      location: googleEvent.location || '',
      attendees: (googleEvent.attendees || []).map(a => a.email).filter(Boolean),
      isAllDay: !!googleEvent.start?.date,
      color: '#1976d2',
      type: 'event',
      priority: 'medium',
    }
  }

  async getEvents(maxResults = 25) {
    const items = await this.listEvents(maxResults)
    return items.map(this.toLocalEvent)
  }
}

const gisCalendarService = new GisCalendarService()
export default gisCalendarService


