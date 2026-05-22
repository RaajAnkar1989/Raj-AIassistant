import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import dataService from '../../services/dataService'
import syncService from '../../services/syncService'
import gisGmailService from '../../services/gisGmailService'

// Real email service using IndexedDB and sync
export const fetchEmails = createAsyncThunk(
  'email/fetchEmails',
  async (query = '', { rejectWithValue }) => {
    try {
      // Try real Gmail first via GIS token
      try {
        const gmailEmails = await gisGmailService.getEmails(25, query)
        // Return even if empty to avoid seeding dummy data when connected
        return Array.isArray(gmailEmails) ? gmailEmails : []
      } catch (e) {
        // If user has configured a client id, avoid seeding and return empty
        const hasClient = typeof window !== 'undefined' && !!localStorage.getItem('gmail_client_id')
        if (hasClient) {
          return []
        }
      }

      // Fallback: return what we have locally (may be empty on first run)
      const localEmails = await dataService.getEmails()
      
      // If still nothing, seed once (only when no Gmail client configured)
      if (localEmails.length === 0) {
        const sampleEmails = [
          {
            from: 'john.doe@company.com',
            to: 'user@example.com',
            subject: 'Project Update - Urgent Review Required',
            body: 'Hi team, we need to review the latest project deliverables by end of day. This is urgent and requires immediate attention.',
            priority: 'high',
            labels: ['work', 'urgent'],
          },
          {
            from: 'meeting@calendar.com',
            to: 'user@example.com',
            subject: 'Team Standup Meeting Reminder',
            body: 'Reminder: Team standup meeting in 15 minutes. Please join the Google Meet link.',
            priority: 'medium',
            labels: ['meeting', 'reminder'],
          },
          {
            from: 'hr@company.com',
            to: 'user@example.com',
            subject: 'Benefits Enrollment Deadline',
            body: 'Thank you for your interest in our benefits program. The enrollment deadline is approaching. Please review your options.',
            priority: 'low',
            labels: ['hr', 'benefits'],
          },
          {
            from: 'client@clientcompany.com',
            to: 'user@example.com',
            subject: 'Proposal Feedback',
            body: 'Thank you for the proposal. We have some feedback and would like to schedule a call to discuss further.',
            priority: 'medium',
            labels: ['client', 'proposal'],
          },
          {
            from: 'system@company.com',
            to: 'user@example.com',
            subject: 'Weekly Report Generated',
            body: 'Your weekly activity report has been generated and is ready for review.',
            priority: 'low',
            labels: ['system', 'report'],
          },
        ]
        for (const emailData of sampleEmails) {
          await dataService.addEmail(emailData)
        }
        return await dataService.getEmails()
      }
      
      return localEmails
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

export const markEmailAsRead = createAsyncThunk(
  'email/markEmailAsRead',
  async (emailId, { rejectWithValue }) => {
    try {
      // Update email in IndexedDB
      await dataService.updateEmail(emailId, { isRead: true })
      
      // Queue sync change
      syncService.createEmailChange('update', { id: emailId, isRead: true })
      
      return emailId
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

export const markEmailAsImportant = createAsyncThunk(
  'email/markEmailAsImportant',
  async (emailId, { rejectWithValue }) => {
    try {
      // Get current email to toggle importance
      const email = await dataService.get('emails', emailId)
      if (!email) {
        throw new Error('Email not found')
      }
      
      // Update email in IndexedDB
      await dataService.updateEmail(emailId, { isImportant: !email.isImportant })
      
      // Queue sync change
      syncService.createEmailChange('update', { id: emailId, isImportant: !email.isImportant })
      
      return emailId
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

export const sendEmail = createAsyncThunk(
  'email/sendEmail',
  async (emailData, { rejectWithValue }) => {
    try {
      // Try real Gmail send first
      try {
        await gisGmailService.sendEmail({ to: emailData.to, subject: emailData.subject, body: emailData.body })
      } catch {}
      // Create local sent copy
      const sentEmail = {
        from: 'me',
        to: emailData.to,
        subject: emailData.subject,
        body: emailData.body,
        priority: 'normal',
        labels: ['sent'],
        timestamp: new Date().toISOString(),
        isRead: true,
        isImportant: false,
      }
      const emailId = await dataService.addEmail(sentEmail)
      syncService.createEmailChange('create', sentEmail)
      return await dataService.get('emails', emailId)
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

const initialState = {
  emails: [],
  isLoading: false,
  error: null,
  filters: {
    unread: false,
    important: false,
    priority: 'all',
    labels: [],
  },
  selectedEmails: [],
  composeOpen: false,
  currentEmail: null,
  searchQuery: '',
}

const emailSlice = createSlice({
  name: 'email',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload }
    },
    toggleEmailSelection: (state, action) => {
      const emailId = action.payload
      if (state.selectedEmails.includes(emailId)) {
        state.selectedEmails = state.selectedEmails.filter(id => id !== emailId)
      } else {
        state.selectedEmails.push(emailId)
      }
    },
    clearSelection: (state) => {
      state.selectedEmails = []
    },
    setComposeOpen: (state, action) => {
      state.composeOpen = action.payload
    },
    setCurrentEmail: (state, action) => {
      state.currentEmail = action.payload
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmails.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchEmails.fulfilled, (state, action) => {
        state.isLoading = false
        state.emails = action.payload
        state.error = null
      })
      .addCase(fetchEmails.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      .addCase(markEmailAsRead.fulfilled, (state, action) => {
        const email = state.emails.find(e => e.id === action.payload)
        if (email) {
          email.isRead = true
        }
      })
      .addCase(markEmailAsImportant.fulfilled, (state, action) => {
        const email = state.emails.find(e => e.id === action.payload)
        if (email) {
          email.isImportant = !email.isImportant
        }
      })
      .addCase(sendEmail.fulfilled, (state, action) => {
        state.emails.unshift(action.payload)
        state.composeOpen = false
      })
  },
})

export const {
  setFilters,
  toggleEmailSelection,
  clearSelection,
  setComposeOpen,
  setCurrentEmail,
  setSearchQuery,
  clearError,
} = emailSlice.actions

export default emailSlice.reducer

// Selectors
export const selectEmails = (state) => state.email.emails
export const selectIsLoading = (state) => state.email.isLoading
export const selectError = (state) => state.email.error
export const selectFilters = (state) => state.email.filters
export const selectSelectedEmails = (state) => state.email.selectedEmails
export const selectComposeOpen = (state) => state.email.composeOpen
export const selectCurrentEmail = (state) => state.email.currentEmail
export const selectSearchQuery = (state) => state.email.searchQuery

// Filtered emails selector
export const selectFilteredEmails = (state) => {
  const { emails, filters, searchQuery } = state.email
  
  return emails.filter(email => {
    // Search filter
    if (searchQuery && !email.subject.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !email.body.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !email.from.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    
    // Unread filter
    if (filters.unread && email.isRead) {
      return false
    }
    
    // Important filter
    if (filters.important && !email.isImportant) {
      return false
    }
    
    // Priority filter
    if (filters.priority !== 'all' && email.priority !== filters.priority) {
      return false
    }
    
    // Labels filter
    if (filters.labels.length > 0 && !filters.labels.some(label => email.labels.includes(label))) {
      return false
    }
    
    return true
  })
}
