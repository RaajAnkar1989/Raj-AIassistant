import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

export const createNotification = createAsyncThunk(
  'notifications/createNotification',
  async (notificationData, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const notification = {
        id: Date.now().toString(),
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type || 'info', // info, success, warning, error
        priority: notificationData.priority || 'medium',
        timestamp: new Date().toISOString(),
        isRead: false,
        action: notificationData.action || null,
        expiresAt: notificationData.expiresAt || null,
      }
      
      // Show browser notification if supported
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          tag: notification.id,
        })
      }
      
      return notification
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

export const markNotificationAsRead = createAsyncThunk(
  'notifications/markNotificationAsRead',
  async (notificationId, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 200))
      return notificationId
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

export const deleteNotification = createAsyncThunk(
  'notifications/deleteNotification',
  async (notificationId, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 200))
      return notificationId
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

export const scheduleReminder = createAsyncThunk(
  'notifications/scheduleReminder',
  async (reminderData, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 400))
      
      const reminder = {
        id: Date.now().toString(),
        title: reminderData.title,
        message: reminderData.message,
        scheduledFor: reminderData.scheduledFor,
        isActive: true,
        createdAt: new Date().toISOString(),
        type: 'reminder',
        priority: reminderData.priority || 'medium',
      }
      
      // Schedule the reminder
      const timeUntilReminder = new Date(reminderData.scheduledFor).getTime() - Date.now()
      if (timeUntilReminder > 0) {
        setTimeout(() => {
          // This would trigger a notification when the time comes
          // In a real app, this would use a service worker or background task
          console.log(`Reminder: ${reminder.title}`)
        }, timeUntilReminder)
      }
      
      return reminder
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

const initialState = {
  notifications: [],
  reminders: [],
  isLoading: false,
  error: null,
  unreadCount: 0,
  settings: {
    emailNotifications: true,
    pushNotifications: true,
    soundEnabled: true,
    desktopNotifications: true,
  },
}

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setSettings: (state, action) => {
      state.settings = { ...state.settings, ...action.payload }
    },
    clearAllNotifications: (state) => {
      state.notifications = []
      state.unreadCount = 0
    },
    clearError: (state) => {
      state.error = null
    },
    updateUnreadCount: (state) => {
      state.unreadCount = state.notifications.filter(n => !n.isRead).length
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createNotification.fulfilled, (state, action) => {
        state.notifications.unshift(action.payload)
        if (action.payload.type === 'reminder') {
          state.reminders.push(action.payload)
        }
        state.unreadCount += 1
      })
      .addCase(markNotificationAsRead.fulfilled, (state, action) => {
        const notification = state.notifications.find(n => n.id === action.payload)
        if (notification && !notification.isRead) {
          notification.isRead = true
          state.unreadCount = Math.max(0, state.unreadCount - 1)
        }
      })
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const notification = state.notifications.find(n => n.id === action.payload)
        if (notification && !notification.isRead) {
          state.unreadCount = Math.max(0, state.unreadCount - 1)
        }
        state.notifications = state.notifications.filter(n => n.id !== action.payload)
        state.reminders = state.reminders.filter(r => r.id !== action.payload)
      })
      .addCase(scheduleReminder.fulfilled, (state, action) => {
        state.reminders.push(action.payload)
      })
  },
})

export const {
  setSettings,
  clearAllNotifications,
  clearError,
  updateUnreadCount,
} = notificationSlice.actions

export default notificationSlice.reducer

// Selectors
export const selectNotifications = (state) => state.notifications.notifications
export const selectReminders = (state) => state.notifications.reminders
export const selectIsLoading = (state) => state.notifications.isLoading
export const selectError = (state) => state.notifications.error
export const selectUnreadCount = (state) => state.notifications.unreadCount
export const selectSettings = (state) => state.notifications.settings

// Unread notifications selector
export const selectUnreadNotifications = (state) => {
  return state.notifications.notifications.filter(n => !n.isRead)
}

// Active reminders selector
export const selectActiveReminders = (state) => {
  return state.notifications.reminders.filter(r => r.isActive)
}

// Notifications by type selector
export const selectNotificationsByType = (state, type) => {
  return state.notifications.notifications.filter(n => n.type === type)
}

// High priority notifications selector
export const selectHighPriorityNotifications = (state) => {
  return state.notifications.notifications.filter(n => n.priority === 'high')
}
