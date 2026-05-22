import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import emailReducer from './slices/emailSlice'
import calendarReducer from './slices/calendarSlice'
import todoReducer from './slices/todoSlice'
import voiceReducer from './slices/voiceSlice'
import aiReducer from './slices/aiSlice'
import notificationReducer from './slices/notificationSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    email: emailReducer,
    calendar: calendarReducer,
    todo: todoReducer,
    voice: voiceReducer,
    ai: aiReducer,
    notifications: notificationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
})

export default store
