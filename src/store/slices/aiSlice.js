import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

// Mock AI service - in real app, this would integrate with OpenAI API
export const generateAIResponse = createAsyncThunk(
  'ai/generateAIResponse',
  async (prompt, { rejectWithValue }) => {
    try {
      // Simulate AI API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock AI responses based on prompt
      let response = ''
      
      if (prompt.toLowerCase().includes('email')) {
        response = "I can help you with your emails. I can read, summarize, and even suggest responses. What would you like me to do?"
      } else if (prompt.toLowerCase().includes('calendar') || prompt.toLowerCase().includes('schedule')) {
        response = "I can help you manage your calendar. I can show upcoming events, add new ones, and even suggest optimal meeting times."
      } else if (prompt.toLowerCase().includes('todo') || prompt.toLowerCase().includes('task')) {
        response = "I can help you manage your tasks. I can add new ones, prioritize them, and even suggest what to work on next based on your schedule."
      } else if (prompt.toLowerCase().includes('meeting') || prompt.toLowerCase().includes('call')) {
        response = "I can help you start meetings or calls. I can generate Google Meet links, initiate WebRTC calls, or help you schedule them."
      } else if (prompt.toLowerCase().includes('weather')) {
        response = "I can check the weather for you. Just let me know which city you're interested in."
      } else if (prompt.toLowerCase().includes('joke') || prompt.toLowerCase().includes('funny')) {
        response = "Why did the AI go to therapy? Because it had too many processing issues! 😄"
      } else {
        response = "I'm your AI assistant, ready to help with emails, calendar, tasks, meetings, and more. What can I do for you today?"
      }
      
      return {
        id: Date.now().toString(),
        prompt,
        response,
        timestamp: new Date().toISOString(),
        type: 'assistant',
      }
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

export const analyzeEmailContent = createAsyncThunk(
  'ai/analyzeEmailContent',
  async (emailContent, { rejectWithValue }) => {
    try {
      // Simulate AI analysis
      await new Promise(resolve => setTimeout(resolve, 800))
      
      const analysis = {
        summary: emailContent.length > 100 ? 
          `${emailContent.substring(0, 100)}...` : emailContent,
        priority: emailContent.toLowerCase().includes('urgent') ? 'high' : 
                 emailContent.toLowerCase().includes('important') ? 'medium' : 'low',
        sentiment: emailContent.toLowerCase().includes('thank') ? 'positive' : 'neutral',
        suggestedResponse: generateSuggestedResponse(emailContent),
        keywords: extractKeywords(emailContent),
      }
      
      return analysis
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

export const generateTaskSuggestions = createAsyncThunk(
  'ai/generateTaskSuggestions',
  async (context, { rejectWithValue }) => {
    try {
      // Simulate AI task suggestions
      await new Promise(resolve => setTimeout(resolve, 600))
      
      const suggestions = [
        "Review and respond to urgent emails",
        "Prepare for upcoming meetings",
        "Update project documentation",
        "Schedule team check-ins",
        "Review weekly goals and progress",
      ]
      
      return suggestions
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

// Helper functions
function generateSuggestedResponse(emailContent) {
  const content = emailContent.toLowerCase()
  
  if (content.includes('meeting')) {
    return "Thank you for the meeting invitation. I'll review my schedule and get back to you shortly."
  } else if (content.includes('urgent')) {
    return "I understand this is urgent. I'll prioritize this and respond with a solution as soon as possible."
  } else if (content.includes('thank')) {
    return "You're welcome! I'm glad I could help. Let me know if you need anything else."
  } else {
    return "Thank you for your message. I'll review this and get back to you soon."
  }
}

function extractKeywords(content) {
  const words = content.toLowerCase().split(/\s+/)
  const keywords = words.filter(word => 
    word.length > 3 && 
    !['the', 'and', 'for', 'with', 'this', 'that', 'have', 'will', 'from'].includes(word)
  )
  return [...new Set(keywords)].slice(0, 5)
}

const initialState = {
  conversations: [],
  isGenerating: false,
  currentAnalysis: null,
  taskSuggestions: [],
  error: null,
  personality: {
    name: 'JARVIS',
    style: 'professional',
    humor: 'moderate',
    responseLength: 'concise',
  },
}

const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {
    addConversation: (state, action) => {
      state.conversations.unshift(action.payload)
      if (state.conversations.length > 100) {
        state.conversations.pop()
      }
    },
    clearConversations: (state) => {
      state.conversations = []
    },
    setPersonality: (state, action) => {
      state.personality = { ...state.personality, ...action.payload }
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(generateAIResponse.pending, (state) => {
        state.isGenerating = true
        state.error = null
      })
      .addCase(generateAIResponse.fulfilled, (state, action) => {
        state.isGenerating = false
        state.conversations.unshift(action.payload)
        if (state.conversations.length > 100) {
          state.conversations.pop()
        }
        state.error = null
      })
      .addCase(generateAIResponse.rejected, (state, action) => {
        state.isGenerating = false
        state.error = action.payload
      })
      .addCase(analyzeEmailContent.pending, (state) => {
        state.isGenerating = true
      })
      .addCase(analyzeEmailContent.fulfilled, (state, action) => {
        state.isGenerating = false
        state.currentAnalysis = action.payload
        state.error = null
      })
      .addCase(analyzeEmailContent.rejected, (state, action) => {
        state.isGenerating = false
        state.error = action.payload
      })
      .addCase(generateTaskSuggestions.pending, (state) => {
        state.isGenerating = true
      })
      .addCase(generateTaskSuggestions.fulfilled, (state, action) => {
        state.isGenerating = false
        state.taskSuggestions = action.payload
        state.error = null
      })
      .addCase(generateTaskSuggestions.rejected, (state, action) => {
        state.isGenerating = false
        state.error = action.payload
      })
  },
})

export const {
  addConversation,
  clearConversations,
  setPersonality,
  clearError,
} = aiSlice.actions

export default aiSlice.reducer

// Selectors
export const selectConversations = (state) => state.ai.conversations
export const selectIsGenerating = (state) => state.ai.isGenerating
export const selectCurrentAnalysis = (state) => state.ai.currentAnalysis
export const selectTaskSuggestions = (state) => state.ai.taskSuggestions
export const selectAIError = (state) => state.ai.error
export const selectPersonality = (state) => state.ai.personality
