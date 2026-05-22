// Google Calendar API Integration Service
class CalendarService {
  constructor() {
    this.clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || 'your-google-client-id'
    this.apiKey = process.env.REACT_APP_GOOGLE_API_KEY || 'your-google-api-key'
    this.discoveryDocs = ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest']
    this.scopes = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events'
    this.gapi = null
    this.isInitialized = false
  }

  // Initialize Calendar API
  async initialize() {
    try {
      // For now, just mark as initialized without external dependencies
      // This will be enhanced when Google APIs are properly configured
      console.log('Calendar service initialized (mock mode)')
      this.isInitialized = true
      return true
    } catch (error) {
      console.error('Failed to initialize Calendar API:', error)
      return false
    }
  }

  // Load Google API client
  loadGoogleAPI() {
    return new Promise((resolve, reject) => {
      if (window.gapi) {
        resolve(window.gapi)
        return
      }

      const script = document.createElement('script')
      script.src = 'https://apis.google.com/js/api.js'
      script.onload = () => {
        window.gapi.load('client:auth2', () => {
          resolve(window.gapi)
        })
      }
      script.onerror = reject
      document.head.appendChild(script)
    })
  }

  // Update sign-in status
  updateSigninStatus(isSignedIn) {
    if (isSignedIn) {
      console.log('User signed in to Google Calendar')
      this.loadCalendarList()
    } else {
      console.log('User signed out of Google Calendar')
    }
  }

  // Sign in to Google Calendar
  async signIn() {
    if (!this.isInitialized) {
      await this.initialize()
    }
    
    try {
      const authInstance = window.gapi.auth2.getAuthInstance()
      if (!authInstance.isSignedIn.get()) {
        await authInstance.signIn()
        return true
      }
      return true
    } catch (error) {
      console.error('Calendar sign-in failed:', error)
      return false
    }
  }

  // Sign out of Google Calendar
  async signOut() {
    if (!this.isInitialized) return false
    
    try {
      const authInstance = window.gapi.auth2.getAuthInstance()
      await authInstance.signOut()
      return true
    } catch (error) {
      console.error('Calendar sign-out failed:', error)
      return false
    }
  }

  // Check if user is signed in
  isSignedIn() {
    // For now, return false to simulate not signed in
    // This will be enhanced when Google APIs are properly configured
    return false
  }

  // Load calendar list
  async loadCalendarList() {
    try {
      const response = await window.gapi.client.calendar.calendarList.list()
      return response.result.items
    } catch (error) {
      console.error('Failed to load calendar list:', error)
      return []
    }
  }

  // Get events from calendar
  async getEvents(calendarId = 'primary', timeMin = null, timeMax = null, maxResults = 50) {
    try {
      const params = {
        calendarId: calendarId,
        maxResults: maxResults,
        singleEvents: true,
        orderBy: 'startTime'
      }

      if (timeMin) params.timeMin = timeMin
      if (timeMax) params.timeMax = timeMax

      const response = await window.gapi.client.calendar.events.list(params)
      return response.result.items || []
    } catch (error) {
      console.error('Failed to get calendar events:', error)
      return []
    }
  }

  // Get upcoming events
  async getUpcomingEvents(calendarId = 'primary', maxResults = 10) {
    const now = new Date()
    const timeMin = now.toISOString()
    const timeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
    
    return await this.getEvents(calendarId, timeMin, timeMax, maxResults)
  }

  // Get events for specific date
  async getEventsForDate(calendarId = 'primary', date) {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)
    
    const timeMin = startOfDay.toISOString()
    const timeMax = endOfDay.toISOString()
    
    return await this.getEvents(calendarId, timeMin, timeMax, 100)
  }

  // Get events for date range
  async getEventsForDateRange(calendarId = 'primary', startDate, endDate) {
    const timeMin = startDate.toISOString()
    const timeMax = endDate.toISOString()
    
    return await this.getEvents(calendarId, timeMin, timeMax, 100)
  }

  // Create calendar event
  async createEvent(calendarId = 'primary', eventData) {
    try {
      const event = {
        summary: eventData.summary,
        description: eventData.description || '',
        location: eventData.location || '',
        start: {
          dateTime: eventData.start.dateTime,
          timeZone: eventData.start.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: eventData.end.dateTime,
          timeZone: eventData.end.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        attendees: eventData.attendees || [],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 10 }
          ]
        },
        colorId: eventData.colorId || '1',
        transparency: eventData.transparency || 'opaque'
      }

      const response = await window.gapi.client.calendar.events.insert({
        calendarId: calendarId,
        resource: event
      })

      return response.result
    } catch (error) {
      console.error('Failed to create calendar event:', error)
      throw error
    }
  }

  // Update calendar event
  async updateEvent(calendarId = 'primary', eventId, eventData) {
    try {
      const event = {
        summary: eventData.summary,
        description: eventData.description || '',
        location: eventData.location || '',
        start: {
          dateTime: eventData.start.dateTime,
          timeZone: eventData.start.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: eventData.end.dateTime,
          timeZone: eventData.end.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        attendees: eventData.attendees || [],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 10 }
          ]
        },
        colorId: eventData.colorId || '1',
        transparency: eventData.transparency || 'opaque'
      }

      const response = await window.gapi.client.calendar.events.update({
        calendarId: calendarId,
        eventId: eventId,
        resource: event
      })

      return response.result
    } catch (error) {
      console.error('Failed to update calendar event:', error)
      throw error
    }
  }

  // Delete calendar event
  async deleteEvent(calendarId = 'primary', eventId) {
    try {
      await window.gapi.client.calendar.events.delete({
        calendarId: calendarId,
        eventId: eventId
      })

      return { success: true, eventId }
    } catch (error) {
      console.error('Failed to delete calendar event:', error)
      throw error
    }
  }

  // Get event details
  async getEventDetails(calendarId = 'primary', eventId) {
    try {
      const response = await window.gapi.client.calendar.events.get({
        calendarId: calendarId,
        eventId: eventId
      })

      return response.result
    } catch (error) {
      console.error('Failed to get event details:', error)
      throw error
    }
  }

  // Search events
  async searchEvents(calendarId = 'primary', query, maxResults = 50) {
    try {
      const response = await window.gapi.client.calendar.events.list({
        calendarId: calendarId,
        q: query,
        maxResults: maxResults,
        singleEvents: true,
        orderBy: 'startTime'
      })

      return response.result.items || []
    } catch (error) {
      console.error('Failed to search events:', error)
      return []
    }
  }

  // Get free/busy information
  async getFreeBusy(calendarId = 'primary', timeMin, timeMax) {
    try {
      const response = await window.gapi.client.calendar.freebusy.query({
        resource: {
          timeMin: timeMin,
          timeMax: timeMax,
          items: [{ id: calendarId }]
        }
      })

      return response.result
    } catch (error) {
      console.error('Failed to get free/busy information:', error)
      throw error
    }
  }

  // Find available time slots
  async findAvailableTimeSlots(calendarId = 'primary', duration, startDate, endDate, workingHours = { start: '09:00', end: '17:00' }) {
    try {
      const freeBusy = await this.getFreeBusy(calendarId, startDate.toISOString(), endDate.toISOString())
      const busy = freeBusy.calendars[calendarId].busy || []
      
      const availableSlots = []
      let currentTime = new Date(startDate)
      
      while (currentTime < endDate) {
        // Check if current time is within working hours
        const currentHour = currentTime.getHours()
        const workingStart = parseInt(workingHours.start.split(':')[0])
        const workingEnd = parseInt(workingHours.end.split(':')[0])
        
        if (currentHour >= workingStart && currentHour < workingEnd) {
          const slotEnd = new Date(currentTime.getTime() + duration * 60 * 1000)
          
          // Check if slot conflicts with busy times
          let isAvailable = true
          for (const busyTime of busy) {
            const busyStart = new Date(busyTime.start)
            const busyEnd = new Date(busyTime.end)
            
            if (currentTime < busyEnd && slotEnd > busyStart) {
              isAvailable = false
              break
            }
          }
          
          if (isAvailable) {
            availableSlots.push({
              start: new Date(currentTime),
              end: slotEnd
            })
          }
        }
        
        // Move to next 30-minute slot
        currentTime.setMinutes(currentTime.getMinutes() + 30)
      }
      
      return availableSlots
    } catch (error) {
      console.error('Failed to find available time slots:', error)
      return []
    }
  }

  // Create recurring event
  async createRecurringEvent(calendarId = 'primary', eventData, recurrence) {
    try {
      const event = {
        summary: eventData.summary,
        description: eventData.description || '',
        location: eventData.location || '',
        start: {
          dateTime: eventData.start.dateTime,
          timeZone: eventData.start.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: eventData.end.dateTime,
          timeZone: eventData.end.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        attendees: eventData.attendees || [],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 10 }
          ]
        },
        recurrence: [recurrence], // e.g., "RRULE:FREQ=WEEKLY;COUNT=10"
        colorId: eventData.colorId || '1'
      }

      const response = await window.gapi.client.calendar.events.insert({
        calendarId: calendarId,
        resource: event
      })

      return response.result
    } catch (error) {
      console.error('Failed to create recurring event:', error)
      throw error
    }
  }

  // Get calendar settings
  async getCalendarSettings(calendarId = 'primary') {
    try {
      const response = await window.gapi.client.calendar.calendars.get({
        calendarId: calendarId
      })

      return response.result
    } catch (error) {
      console.error('Failed to get calendar settings:', error)
      throw error
    }
  }

  // Update calendar settings
  async updateCalendarSettings(calendarId = 'primary', settings) {
    try {
      const response = await window.gapi.client.calendar.calendars.update({
        calendarId: calendarId,
        resource: settings
      })

      return response.result
    } catch (error) {
      console.error('Failed to update calendar settings:', error)
      throw error
    }
  }

  // Get calendar colors
  async getCalendarColors() {
    try {
      const response = await window.gapi.client.calendar.colors.get()
      return response.result
    } catch (error) {
      console.error('Failed to get calendar colors:', error)
      return {}
    }
  }

  // Check if service is ready
  isReady() {
    return this.isInitialized && this.apiKey && this.clientId
  }

  // Get service status
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      hasApiKey: !!this.apiKey,
      hasClientId: !!this.clientId,
      isReady: this.isReady()
    }
  }
}

// Create and export a singleton instance
const calendarService = new CalendarService()
export default calendarService
