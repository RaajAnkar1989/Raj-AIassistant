// Real-time sync service for data synchronization
class SyncService {
  constructor() {
    this.syncInterval = null
    this.lastSyncTime = null
    this.isOnline = navigator.onLine
    this.pendingChanges = []
    this.syncCallbacks = new Map()
    
    this.initSync()
  }

  // Initialize sync service
  initSync() {
    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline())
    window.addEventListener('offline', () => this.handleOffline())
    
    // Start periodic sync
    this.startPeriodicSync()
    
    // Listen for storage events (cross-tab sync)
    window.addEventListener('storage', (e) => this.handleStorageChange(e))
    
    // Listen for visibility change (sync when tab becomes visible)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.syncData()
      }
    })
  }

  // Handle online event
  handleOnline() {
    this.isOnline = true
    console.log('Device is online, syncing data...')
    this.syncData()
  }

  // Handle offline event
  handleOffline() {
    this.isOnline = false
    console.log('Device is offline, queuing changes...')
  }

  // Handle storage changes from other tabs
  handleStorageChange(event) {
    if (event.key === 'ai-assistant-sync') {
      console.log('Data changed in another tab, updating...')
      this.notifyDataChange(event.newValue)
    }
  }

  // Start periodic sync
  startPeriodicSync() {
    // Sync every 5 minutes
    this.syncInterval = setInterval(() => {
      if (this.isOnline) {
        this.syncData()
      }
    }, 5 * 60 * 1000)
  }

  // Stop periodic sync
  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  // Register callback for data changes
  onDataChange(callback) {
    const id = Date.now().toString()
    this.syncCallbacks.set(id, callback)
    return id
  }

  // Unregister callback
  offDataChange(id) {
    this.syncCallbacks.delete(id)
  }

  // Notify all callbacks of data change
  notifyDataChange(data) {
    this.syncCallbacks.forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error('Error in sync callback:', error)
      }
    })
  }

  // Queue change for sync
  queueChange(change) {
    this.pendingChanges.push({
      ...change,
      timestamp: Date.now(),
      id: Date.now().toString()
    })
    
    // Store pending changes in localStorage
    localStorage.setItem('ai-assistant-pending-changes', JSON.stringify(this.pendingChanges))
    
    // Try to sync immediately if online
    if (this.isOnline) {
      this.syncData()
    }
  }

  // Get pending changes
  getPendingChanges() {
    const stored = localStorage.getItem('ai-assistant-pending-changes')
    if (stored) {
      this.pendingChanges = JSON.parse(stored)
    }
    return this.pendingChanges
  }

  // Clear pending changes
  clearPendingChanges() {
    this.pendingChanges = []
    localStorage.removeItem('ai-assistant-pending-changes')
  }

  // Sync data with cloud storage (if available)
  async syncData() {
    if (!this.isOnline) {
      console.log('Device is offline, cannot sync')
      return false
    }

    try {
      // Get pending changes
      const changes = this.getPendingChanges()
      if (changes.length === 0) {
        return true
      }

      console.log(`Syncing ${changes.length} pending changes...`)

      // Process each change
      for (const change of changes) {
        await this.processChange(change)
      }

      // Clear pending changes after successful sync
      this.clearPendingChanges()
      this.lastSyncTime = new Date().toISOString()
      
      // Store last sync time
      localStorage.setItem('ai-assistant-last-sync', this.lastSyncTime)
      
      console.log('Data sync completed successfully')
      return true
    } catch (error) {
      console.error('Data sync failed:', error)
      return false
    }
  }

  // Process individual change
  async processChange(change) {
    try {
      switch (change.type) {
        case 'email':
          await this.syncEmailChange(change)
          break
        case 'event':
          await this.syncEventChange(change)
          break
        case 'todo':
          await this.syncTodoChange(change)
          break
        case 'conversation':
          await this.syncConversationChange(change)
          break
        default:
          console.warn('Unknown change type:', change.type)
      }
    } catch (error) {
      console.error(`Failed to process change ${change.id}:`, error)
      throw error
    }
  }

  // Sync email changes
  async syncEmailChange(change) {
    // In a real app, this would sync with Gmail API
    // For now, we'll just simulate the sync
    await new Promise(resolve => setTimeout(resolve, 100))
    
    if (change.action === 'create') {
      console.log('Syncing email creation:', change.data.subject)
    } else if (change.action === 'update') {
      console.log('Syncing email update:', change.data.id)
    } else if (change.action === 'delete') {
      console.log('Syncing email deletion:', change.data.id)
    }
  }

  // Sync event changes
  async syncEventChange(change) {
    // In a real app, this would sync with Google Calendar API
    await new Promise(resolve => setTimeout(resolve, 100))
    
    if (change.action === 'create') {
      console.log('Syncing event creation:', change.data.title)
    } else if (change.action === 'update') {
      console.log('Syncing event update:', change.data.id)
    } else if (change.action === 'delete') {
      console.log('Syncing event deletion:', change.data.id)
    }
  }

  // Sync todo changes
  async syncTodoChange(change) {
    // For todos, we'll sync with localStorage for now
    await new Promise(resolve => setTimeout(resolve, 50))
    
    if (change.action === 'create') {
      console.log('Syncing todo creation:', change.data.title)
    } else if (change.action === 'update') {
      console.log('Syncing todo update:', change.data.id)
    } else if (change.action === 'delete') {
      console.log('Syncing todo deletion:', change.data.id)
    }
  }

  // Sync conversation changes
  async syncConversationChange(change) {
    // For conversations, we'll sync with localStorage for now
    await new Promise(resolve => setTimeout(resolve, 50))
    
    if (change.action === 'create') {
      console.log('Syncing conversation creation:', change.data.prompt)
    }
  }

  // Create change for email
  createEmailChange(action, data) {
    const change = {
      type: 'email',
      action,
      data,
      timestamp: Date.now(),
      id: Date.now().toString()
    }
    
    this.queueChange(change)
    return change.id
  }

  // Create change for event
  createEventChange(action, data) {
    const change = {
      type: 'event',
      action,
      data,
      timestamp: Date.now(),
      id: Date.now().toString()
    }
    
    this.queueChange(change)
    return change.id
  }

  // Create change for todo
  createTodoChange(action, data) {
    const change = {
      type: 'todo',
      action,
      data,
      timestamp: Date.now(),
      id: Date.now().toString()
    }
    
    this.queueChange(change)
    return change.id
  }

  // Create change for conversation
  createConversationChange(action, data) {
    const change = {
      type: 'conversation',
      action,
      data,
      timestamp: Date.now(),
      id: Date.now().toString()
    }
    
    this.queueChange(change)
    return change.id
  }

  // Get sync status
  getSyncStatus() {
    return {
      isOnline: this.isOnline,
      lastSyncTime: this.lastSyncTime,
      pendingChanges: this.pendingChanges.length,
      isSyncing: false // Could be enhanced to track actual sync state
    }
  }

  // Force sync
  async forceSync() {
    console.log('Force sync requested...')
    return await this.syncData()
  }

  // Cleanup
  destroy() {
    this.stopPeriodicSync()
    this.syncCallbacks.clear()
    window.removeEventListener('online', this.handleOnline)
    window.removeEventListener('offline', this.handleOffline)
    window.removeEventListener('storage', this.handleStorageChange)
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
  }
}

// Create and export a singleton instance
const syncService = new SyncService()
export default syncService
