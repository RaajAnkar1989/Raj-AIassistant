// Data Service for real data management with localStorage and IndexedDB
class DataService {
  constructor() {
    this.dbName = 'ai-voice-assistant-db'
    this.dbVersion = 1
    this.db = null
    this.initDatabase()
  }

  // Initialize IndexedDB
  async initDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = event.target.result

        // Create object stores for different data types
        if (!db.objectStoreNames.contains('emails')) {
          const emailStore = db.createObjectStore('emails', { keyPath: 'id', autoIncrement: true })
          emailStore.createIndex('timestamp', 'timestamp', { unique: false })
          emailStore.createIndex('isRead', 'isRead', { unique: false })
          emailStore.createIndex('isImportant', 'isImportant', { unique: false })
        }

        if (!db.objectStoreNames.contains('events')) {
          const eventStore = db.createObjectStore('events', { keyPath: 'id', autoIncrement: true })
          eventStore.createIndex('startTime', 'startTime', { unique: false })
          eventStore.createIndex('type', 'type', { unique: false })
          eventStore.createIndex('priority', 'priority', { unique: false })
        }

        if (!db.objectStoreNames.contains('todos')) {
          const todoStore = db.createObjectStore('todos', { keyPath: 'id', autoIncrement: true })
          todoStore.createIndex('completed', 'completed', { unique: false })
          todoStore.createIndex('priority', 'priority', { unique: false })
          todoStore.createIndex('category', 'category', { unique: false })
        }

        if (!db.objectStoreNames.contains('conversations')) {
          const conversationStore = db.createObjectStore('conversations', { keyPath: 'id', autoIncrement: true })
          conversationStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        if (!db.objectStoreNames.contains('notifications')) {
          const notificationStore = db.createObjectStore('notifications', { keyPath: 'id', autoIncrement: true })
          notificationStore.createIndex('timestamp', 'timestamp', { unique: false })
          notificationStore.createIndex('isRead', 'isRead', { unique: false })
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' })
        }
      }
    })
  }

  // Generic CRUD operations
  async add(storeName, data) {
    await this.ensureDatabase()
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.add(data)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async update(storeName, data) {
    await this.ensureDatabase()
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.put(data)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async delete(storeName, id) {
    await this.ensureDatabase()
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.delete(id)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async get(storeName, id) {
    await this.ensureDatabase()
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getAll(storeName, indexName = null, indexValue = null) {
    await this.ensureDatabase()
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      let request

      if (indexName && indexValue !== null) {
        const index = store.index(indexName)
        request = index.getAll(indexValue)
      } else {
        request = store.getAll()
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async ensureDatabase() {
    if (!this.db) {
      await this.initDatabase()
    }
  }

  // Email-specific operations
  async getEmails(filters = {}) {
    let emails = await this.getAll('emails')
    
    if (filters.unread) {
      emails = emails.filter(email => !email.isRead)
    }
    if (filters.important) {
      emails = emails.filter(email => email.isImportant)
    }
    if (filters.priority && filters.priority !== 'all') {
      emails = emails.filter(email => email.priority === filters.priority)
    }
    
    return emails.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  }

  async addEmail(emailData) {
    const email = {
      ...emailData,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      isRead: false,
      isImportant: false,
      priority: emailData.priority || 'medium',
      labels: emailData.labels || []
    }
    return await this.add('emails', email)
  }

  async updateEmail(emailId, updates) {
    const email = await this.get('emails', emailId)
    if (email) {
      const updatedEmail = { ...email, ...updates }
      return await this.update('emails', updatedEmail)
    }
    throw new Error('Email not found')
  }

  // Event-specific operations
  async getEvents(filters = {}) {
    let events = await this.getAll('events')
    
    if (filters.type && filters.type.length > 0) {
      events = events.filter(event => filters.type.includes(event.type))
    }
    if (filters.priority && filters.priority.length > 0) {
      events = events.filter(event => filters.priority.includes(event.priority))
    }
    
    return events.sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
  }

  async addEvent(eventData) {
    const event = {
      ...eventData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      priority: eventData.priority || 'medium',
      type: eventData.type || 'event'
    }
    return await this.add('events', event)
  }

  // Todo-specific operations
  async getTodos(filters = {}) {
    let todos = await this.getAll('todos')
    
    if (filters.completed !== 'all') {
      todos = todos.filter(todo => 
        filters.completed === 'completed' ? todo.completed : !todo.completed
      )
    }
    if (filters.priority && filters.priority !== 'all') {
      todos = todos.filter(todo => todo.priority === filters.priority)
    }
    if (filters.category && filters.category !== 'all') {
      todos = todos.filter(todo => todo.category === filters.category)
    }
    
    return todos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  async addTodo(todoData) {
    const todo = {
      ...todoData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      completed: false,
      priority: todoData.priority || 'medium',
      category: todoData.category || 'personal'
    }
    return await this.add('todos', todo)
  }

  async toggleTodoComplete(todoId) {
    const todo = await this.get('todos', todoId)
    if (todo) {
      todo.completed = !todo.completed
      return await this.update('todos', todo)
    }
    throw new Error('Todo not found')
  }

  // Conversation-specific operations
  async getConversations(limit = 50) {
    const conversations = await this.getAll('conversations')
    return conversations
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit)
  }

  async addConversation(conversationData) {
    const conversation = {
      ...conversationData,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    }
    return await this.add('conversations', conversation)
  }

  // Settings operations
  async getSetting(key, defaultValue = null) {
    try {
      const setting = await this.get('settings', key)
      return setting ? setting.value : defaultValue
    } catch {
      return defaultValue
    }
  }

  async setSetting(key, value) {
    const setting = { key, value }
    return await this.update('settings', setting)
  }

  // Data synchronization
  async syncToLocalStorage() {
    const data = {
      emails: await this.getAll('emails'),
      events: await this.getAll('events'),
      todos: await this.getAll('todos'),
      conversations: await this.getAll('conversations'),
      lastSync: new Date().toISOString()
    }
    
    localStorage.setItem('ai-assistant-sync', JSON.stringify(data))
    return data
  }

  async syncFromLocalStorage() {
    const syncData = localStorage.getItem('ai-assistant-sync')
    if (syncData) {
      const data = JSON.parse(syncData)
      
      // Clear existing data
      await this.clearAllData()
      
      // Restore data
      if (data.emails) {
        for (const email of data.emails) {
          await this.add('emails', email)
        }
      }
      if (data.events) {
        for (const event of data.events) {
          await this.add('events', event)
        }
      }
      if (data.todos) {
        for (const todo of data.todos) {
          await this.add('todos', todo)
        }
      }
      if (data.conversations) {
        for (const conversation of data.conversations) {
          await this.add('conversations', conversation)
        }
      }
      
      return data
    }
    return null
  }

  async clearAllData() {
    const stores = ['emails', 'events', 'todos', 'conversations', 'notifications']
    for (const storeName of stores) {
      const transaction = this.db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      await store.clear()
    }
  }

  // Export/Import functionality
  async exportData() {
    const data = await this.syncToLocalStorage()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `ai-assistant-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    
    URL.revokeObjectURL(url)
  }

  async importData(jsonData) {
    try {
      const data = JSON.parse(jsonData)
      await this.clearAllData()
      
      if (data.emails) {
        for (const email of data.emails) {
          await this.add('emails', email)
        }
      }
      if (data.events) {
        for (const event of data.events) {
          await this.add('events', event)
        }
      }
      if (data.todos) {
        for (const todo of data.todos) {
          await this.add('todos', todo)
        }
      }
      if (data.conversations) {
        for (const conversation of data.conversations) {
          await this.add('conversations', conversation)
        }
      }
      
      return { success: true, message: 'Data imported successfully' }
    } catch (error) {
      return { success: false, message: 'Failed to import data: ' + error.message }
    }
  }
}

// Create and export a singleton instance
const dataService = new DataService()
export default dataService
