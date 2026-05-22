import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

// Mock authentication - in real app, this would integrate with Google OAuth
export const authenticateUser = createAsyncThunk(
  'auth/authenticateUser',
  async (credentials, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock user data
      const user = {
        id: '1',
        email: credentials.email,
        name: 'John Doe',
        avatar: 'https://via.placeholder.com/150',
        isAuthenticated: true,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      }
      
      return user
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      // Simulate logout API call
      await new Promise(resolve => setTimeout(resolve, 500))
      return null
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isGoogleAuthLoading: false,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setGoogleAuthLoading: (state, action) => {
      state.isGoogleAuthLoading = action.payload
    },
    clearError: (state) => {
      state.error = null
    },
    updateUserProfile: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(authenticateUser.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(authenticateUser.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(authenticateUser.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      .addCase(logoutUser.pending, (state) => {
        state.isLoading = true
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isLoading = false
        state.user = null
        state.isAuthenticated = false
        state.error = null
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
  },
})

export const { setGoogleAuthLoading, clearError, updateUserProfile } = authSlice.actions
export default authSlice.reducer

// Selectors
export const selectUser = (state) => state.auth.user
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated
export const selectIsLoading = (state) => state.auth.isLoading
export const selectError = (state) => state.auth.error
export const selectIsGoogleAuthLoading = (state) => state.auth.isGoogleAuthLoading
