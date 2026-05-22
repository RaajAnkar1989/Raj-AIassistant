import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import dataService from '../../services/dataService'
import syncService from '../../services/syncService'

// Real todo service using IndexedDB and sync
export const fetchTodos = createAsyncThunk(
  'todo/fetchTodos',
  async (_, { rejectWithValue }) => {
    try {
      // Get todos from IndexedDB
      const todos = await dataService.getTodos()
      
      // If no todos exist, create some sample data
      if (todos.length === 0) {
        const sampleTodos = [
          {
            title: 'Review project proposal',
            description: 'Go through the Q4 project proposal and provide feedback',
            priority: 'high',
            dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            category: 'work',
            tags: ['project', 'review'],
            recurring: null,
            snooze: null,
            subTasks: [],
            remind: true,
          },
          {
            title: 'Prepare presentation slides',
            description: 'Create slides for the client meeting next week',
            priority: 'medium',
            dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
            category: 'work',
            tags: ['presentation', 'client'],
            recurring: null,
            snooze: null,
            subTasks: [],
            remind: true,
          },
          {
            title: 'Buy groceries',
            description: 'Get items for the week including milk, bread, and vegetables',
            priority: 'low',
            dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            category: 'personal',
            tags: ['shopping', 'groceries'],
            recurring: 'weekly',
            snooze: null,
            subTasks: [
              { id: '1', title: 'Milk', completed: false },
              { id: '2', title: 'Bread', completed: false },
              { id: '3', title: 'Vegetables', completed: false },
            ],
            remind: true,
          },
          {
            title: 'Schedule team meeting',
            description: 'Set up a meeting with the development team to discuss sprint planning',
            priority: 'medium',
            dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
            category: 'work',
            tags: ['meeting', 'planning'],
            recurring: 'weekly',
            snooze: null,
            subTasks: [],
            remind: true,
          },
          {
            title: 'Update documentation',
            description: 'Review and update the API documentation for the new features',
            priority: 'low',
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            category: 'work',
            tags: ['documentation', 'api'],
            recurring: null,
            snooze: null,
            subTasks: [],
            remind: true,
          },
        ]
        
        // Add sample todos to database
        for (const todoData of sampleTodos) {
          await dataService.addTodo(todoData)
        }
        
        // Return the newly created todos
        return await dataService.getTodos()
      }
      
      return todos
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

export const addTodo = createAsyncThunk(
  'todo/addTodo',
  async (todoData, { rejectWithValue, getState }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const newTodo = {
        id: Date.now().toString(),
        title: todoData.title,
        description: todoData.description || '',
        completed: false,
        priority: todoData.priority || 'medium',
        dueDate: todoData.dueDate || null,
        category: todoData.category || 'personal',
        tags: todoData.tags || [],
        recurring: todoData.recurring || null,
        snooze: todoData.snooze || null,
        subTasks: todoData.subTasks || [],
        remind: todoData.remind !== false,
        createdAt: new Date().toISOString(),
      }
      
      // Save to IndexedDB
      await dataService.addTodo(newTodo)
      
      return newTodo
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

export const updateTodo = createAsyncThunk(
  'todo/updateTodo',
  async (todoData, { rejectWithValue, getState }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Update in IndexedDB
      await dataService.update('todos', todoData)
      
      return todoData
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

export const deleteTodo = createAsyncThunk(
  'todo/deleteTodo',
  async (todoId, { rejectWithValue, getState }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Delete from IndexedDB
      await dataService.delete('todos', todoId)
      
      return todoId
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

export const toggleTodoComplete = createAsyncThunk(
  'todo/toggleTodoComplete',
  async (todoId, { rejectWithValue, getState }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const currentTodos = getState().todo.todos
      const todo = currentTodos.find(t => t.id === todoId)
      if (todo) {
        const updatedTodo = { ...todo, completed: !todo.completed }
        
        // Update in IndexedDB
        await dataService.update('todos', updatedTodo)
        
        return updatedTodo
      }
      throw new Error('Todo not found')
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

// New thunk for handling recurring tasks
export const processRecurringTasks = createAsyncThunk(
  'todo/processRecurringTasks',
  async (_, { rejectWithValue, getState }) => {
    try {
      const currentTodos = getState().todo.todos
      const now = new Date()
      let updated = false
      
      for (const todo of currentTodos) {
        if (todo.recurring && todo.completed && todo.dueDate) {
          const dueDate = new Date(todo.dueDate)
          if (dueDate < now) {
            // Create next occurrence
            let nextDueDate = new Date(dueDate)
            switch (todo.recurring) {
              case 'daily':
                nextDueDate.setDate(nextDueDate.getDate() + 1)
                break
              case 'weekly':
                nextDueDate.setDate(nextDueDate.getDate() + 7)
                break
              case 'monthly':
                nextDueDate.setMonth(nextDueDate.getMonth() + 1)
                break
              case 'yearly':
                nextDueDate.setFullYear(nextDueDate.getFullYear() + 1)
                break
            }
            
            const newTodo = {
              ...todo,
              id: Date.now().toString(),
              completed: false,
              dueDate: nextDueDate.toISOString(),
              createdAt: new Date().toISOString(),
            }
            
            await dataService.addTodo(newTodo)
            updated = true
          }
        }
      }
      
      if (updated) {
        return await dataService.getTodos()
      }
      
      return currentTodos
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

const initialState = {
  todos: [],
  isLoading: false,
  error: null,
  filters: {
    completed: 'all', // all, completed, pending
    priority: 'all',
    category: 'all',
    tags: [],
  },
  searchQuery: '',
  selectedTodo: null,
  createTodoOpen: false,
  editTodoOpen: false,
}

const todoSlice = createSlice({
  name: 'todo',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload }
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload
    },
    setSelectedTodo: (state, action) => {
      state.selectedTodo = action.payload
    },
    setCreateTodoOpen: (state, action) => {
      state.createTodoOpen = action.payload
    },
    setEditTodoOpen: (state, action) => {
      state.editTodoOpen = action.payload
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTodos.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchTodos.fulfilled, (state, action) => {
        state.isLoading = false
        state.todos = action.payload
        state.error = null
      })
      .addCase(fetchTodos.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      .addCase(addTodo.fulfilled, (state, action) => {
        state.todos.push(action.payload)
        state.createTodoOpen = false
      })
      .addCase(updateTodo.fulfilled, (state, action) => {
        const index = state.todos.findIndex(t => t.id === action.payload.id)
        if (index !== -1) {
          state.todos[index] = { ...state.todos[index], ...action.payload }
        }
        state.editTodoOpen = false
      })
      .addCase(deleteTodo.fulfilled, (state, action) => {
        state.todos = state.todos.filter(t => t.id !== action.payload)
        state.selectedTodo = null
      })
      .addCase(toggleTodoComplete.fulfilled, (state, action) => {
        const index = state.todos.findIndex(t => t.id === action.payload.id)
        if (index !== -1) {
          state.todos[index] = action.payload
        }
      })
      .addCase(processRecurringTasks.fulfilled, (state, action) => {
        state.todos = action.payload
      })
  },
})

export const {
  setFilters,
  setSearchQuery,
  setSelectedTodo,
  setCreateTodoOpen,
  setEditTodoOpen,
  clearError,
} = todoSlice.actions

export default todoSlice.reducer

// Selectors
export const selectTodos = (state) => state.todo.todos
export const selectIsLoading = (state) => state.todo.isLoading
export const selectError = (state) => state.todo.error
export const selectFilters = (state) => state.todo.filters
export const selectSearchQuery = (state) => state.todo.searchQuery
export const selectSelectedTodo = (state) => state.todo.selectedTodo
export const selectCreateTodoOpen = (state) => state.todo.createTodoOpen
export const selectEditTodoOpen = (state) => state.todo.editTodoOpen

// Filtered todos selector
export const selectFilteredTodos = (state) => {
  const { todos, filters, searchQuery } = state.todo
  
  return todos.filter(todo => {
    // Search filter
    if (searchQuery && !todo.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !todo.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    
    // Completed filter
    if (filters.completed === 'completed' && !todo.completed) {
      return false
    }
    if (filters.completed === 'pending' && todo.completed) {
      return false
    }
    
    // Priority filter
    if (filters.priority !== 'all' && todo.priority !== filters.priority) {
      return false
    }
    
    // Category filter
    if (filters.category !== 'all' && todo.category !== filters.category) {
      return false
    }
    
    // Tags filter
    if (filters.tags.length > 0 && !filters.tags.some(tag => todo.tags.includes(tag))) {
      return false
    }
    
    return true
  })
}

// Priority counts selector
export const selectPriorityCounts = (state) => {
  const { todos } = state.todo
  return todos.reduce((counts, todo) => {
    counts[todo.priority] = (counts[todo.priority] || 0) + 1
    return counts
  }, {})
}

// Category counts selector
export const selectCategoryCounts = (state) => {
  const { todos } = state.todo
  return todos.reduce((counts, todo) => {
    counts[todo.category] = (counts[todo.category] || 0) + 1
    return counts
  }, {})
}

// Recurring tasks selector
export const selectRecurringTasks = (state) => {
  const { todos } = state.todo
  return todos.filter(todo => todo.recurring !== null)
}

// Overdue tasks selector
export const selectOverdueTasks = (state) => {
  const { todos } = state.todo
  const now = new Date()
  return todos.filter(todo => 
    todo.dueDate && 
    new Date(todo.dueDate) < now && 
    !todo.completed
  )
}

// Today's tasks selector
export const selectTodayTasks = (state) => {
  const { todos } = state.todo
  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1)
  
  return todos.filter(todo => {
    if (!todo.dueDate) return false
    const dueDate = new Date(todo.dueDate)
    return dueDate >= todayStart && dueDate <= todayEnd
  })
}
