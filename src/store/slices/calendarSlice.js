import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { format, addDays, startOfDay, endOfDay } from 'date-fns'
import dataService from '../../services/dataService'
import syncService from '../../services/syncService'
import gisCalendarService from '../../services/gisCalendarService'

// Real calendar service using IndexedDB and sync
export const fetchCalendarEvents = createAsyncThunk(
  'calendar/fetchCalendarEvents',
  async (dateRange, { rejectWithValue }) => {
    try {
      // Try real Google Calendar first
      try {
        const realEvents = await gisCalendarService.getEvents(50)
        return Array.isArray(realEvents) ? realEvents : []
      } catch (e) {
        const hasClient = typeof window !== 'undefined' && !!localStorage.getItem('gmail_client_id')
        if (hasClient) {
          return []
        }
      }

      // Get events from IndexedDB
      const events = await dataService.getEvents()

      // If no events exist, create some sample data
      if (events.length === 0) {
        const today = new Date()
        const sampleEvents = [
          {
            title: 'Team Standup Meeting',
            description: 'Daily team sync to discuss progress and blockers',
            startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0).toISOString(),
            endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 30).toISOString(),
            location: 'Google Meet',
            attendees: ['john.doe@company.com', 'jane.smith@company.com'],
            isAllDay: false,
            color: '#1976d2',
            type: 'meeting',
            priority: 'high',
          },
          {
            title: 'Project Review',
            description: 'Review Q4 project deliverables and milestones',
            startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0).toISOString(),
            endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 30).toISOString(),
            location: 'Conference Room A',
            attendees: ['project.team@company.com'],
            isAllDay: false,
            color: '#dc004e',
            type: 'meeting',
            priority: 'medium',
          },
          {
            title: 'Client Presentation',
            description: 'Present quarterly results to key client',
            startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 10, 0).toISOString(),
            endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 11, 0).toISOString(),
            location: 'Zoom',
            attendees: ['client@clientcompany.com'],
            isAllDay: false,
            color: '#388e3c',
            type: 'presentation',
            priority: 'high',
          },
          {
            title: 'Lunch with Team',
            description: 'Team lunch to celebrate project completion',
            startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 12, 0).toISOString(),
            endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 13, 0).toISOString(),
            location: 'Local Restaurant',
            attendees: ['team@company.com'],
            isAllDay: false,
            color: '#ff9800',
            type: 'social',
            priority: 'low',
          },
          {
            title: 'Weekly Planning',
            description: 'Plan next week\'s tasks and priorities',
            startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 16, 0).toISOString(),
            endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 17, 0).toISOString(),
            location: 'Office',
            attendees: ['manager@company.com'],
            isAllDay: false,
            color: '#9c27b0',
            type: 'planning',
            priority: 'medium',
          },
        ]
        
        // Add sample events to database
        for (const eventData of sampleEvents) {
          await dataService.addEvent(eventData)
        }
        
        // Return the newly created events
        return await dataService.getEvents()
      }
      
      return events
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

export const addCalendarEvent = createAsyncThunk(
  'calendar/addCalendarEvent',
  async (eventData, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 600))
      
      const newEvent = {
        id: Date.now().toString(),
        title: eventData.title,
        description: eventData.description || '',
        startTime: eventData.startTime,
        endTime: eventData.endTime,
        location: eventData.location || '',
        attendees: eventData.attendees || [],
        isAllDay: eventData.isAllDay || false,
        color: eventData.color || '#1976d2',
        type: eventData.type || 'event',
        priority: eventData.priority || 'medium',
      }
      
      return newEvent
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

export const updateCalendarEvent = createAsyncThunk(
  'calendar/updateCalendarEvent',
  async (eventData, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 600))
      return eventData
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

export const deleteCalendarEvent = createAsyncThunk(
  'calendar/deleteCalendarEvent',
  async (eventId, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 400))
      return eventId
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

const initialState = {
  events: [],
  isLoading: false,
  error: null,
  selectedDate: new Date(),
  selectedEvent: null,
  createEventOpen: false,
  editEventOpen: false,
  viewMode: 'week', // day, week, month
  filters: {
    types: [],
    priorities: [],
    attendees: [],
  },
}

const calendarSlice = createSlice({
  name: 'calendar',
  initialState,
  reducers: {
    setSelectedDate: (state, action) => {
      state.selectedDate = action.payload
    },
    setSelectedEvent: (state, action) => {
      state.selectedEvent = action.payload
    },
    setCreateEventOpen: (state, action) => {
      state.createEventOpen = action.payload
    },
    setEditEventOpen: (state, action) => {
      state.editEventOpen = action.payload
    },
    setViewMode: (state, action) => {
      state.viewMode = action.payload
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload }
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCalendarEvents.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchCalendarEvents.fulfilled, (state, action) => {
        state.isLoading = false
        state.events = action.payload
        state.error = null
      })
      .addCase(fetchCalendarEvents.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      .addCase(addCalendarEvent.fulfilled, (state, action) => {
        state.events.push(action.payload)
        state.createEventOpen = false
      })
      .addCase(updateCalendarEvent.fulfilled, (state, action) => {
        const index = state.events.findIndex(e => e.id === action.payload.id)
        if (index !== -1) {
          state.events[index] = action.payload
        }
        state.editEventOpen = false
      })
      .addCase(deleteCalendarEvent.fulfilled, (state, action) => {
        state.events = state.events.filter(e => e.id !== action.payload)
        state.selectedEvent = null
      })
  },
})

export const {
  setSelectedDate,
  setSelectedEvent,
  setCreateEventOpen,
  setEditEventOpen,
  setViewMode,
  setFilters,
  clearError,
} = calendarSlice.actions

export default calendarSlice.reducer

// Selectors
export const selectEvents = (state) => state.calendar.events
export const selectIsLoading = (state) => state.calendar.isLoading
export const selectError = (state) => state.calendar.error
export const selectSelectedDate = (state) => state.calendar.selectedDate
export const selectSelectedEvent = (state) => state.calendar.selectedEvent
export const selectCreateEventOpen = (state) => state.calendar.createEventOpen
export const selectEditEventOpen = (state) => state.calendar.editEventOpen
export const selectViewMode = (state) => state.calendar.viewMode
export const selectFilters = (state) => state.calendar.filters

// Filtered events selector
export const selectFilteredEvents = (state) => {
  const { events, filters } = state.calendar
  
  return events.filter(event => {
    // Type filter
    if (filters.types.length > 0 && !filters.types.includes(event.type)) {
      return false
    }
    
    // Priority filter
    if (filters.priorities.length > 0 && !filters.priorities.includes(event.priority)) {
      return false
    }
    
    // Attendees filter
    if (filters.attendees.length > 0 && !filters.attendees.some(attendee => 
      event.attendees.includes(attendee))) {
      return false
    }
    
    return true
  })
}

// Events for specific date selector
export const selectEventsForDate = (state, date) => {
  const { events } = state.calendar
  const targetDate = startOfDay(date)
  const targetEndDate = endOfDay(date)
  
  return events.filter(event => {
    const eventStart = new Date(event.startTime)
    const eventEnd = new Date(event.endTime)
    
    return eventStart <= targetEndDate && eventEnd >= targetDate
  })
}

// Upcoming events selector
export const selectUpcomingEvents = (state) => {
  const { events } = state.calendar
  const now = new Date()
  
  return events
    .filter(event => new Date(event.startTime) > now)
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
    .slice(0, 5)
}
