// Service Integration Manager
class ServiceManager {
  constructor() {
    this.services = new Map()
    this.serviceStatus = new Map()
    this.isInitialized = false
  }

  // Initialize all services
  async initialize() {
    try {
      console.log('Initializing service manager...')
      
      // Initialize Gmail service
      const gmailService = await this.initializeGmailService()
      
      // Initialize Calendar service
      const calendarService = await this.initializeCalendarService()
      
      // Initialize WhatsApp service
      const whatsappService = await this.initializeWhatsAppService()
      
      this.isInitialized = true
      console.log('Service manager initialized successfully')
      
      return {
        gmail: gmailService,
        calendar: calendarService,
        whatsapp: whatsappService
      }
    } catch (error) {
      console.error('Failed to initialize service manager:', error)
      return null
    }
  }

  // Initialize Gmail service
  async initializeGmailService() {
    try {
      const { default: gmailService } = await import('./gmailService.js')
      const success = await gmailService.initialize()
      
      if (success) {
        this.services.set('gmail', gmailService)
        this.serviceStatus.set('gmail', {
          isReady: true,
          isConnected: gmailService.isSignedIn(),
          lastSync: null
        })
        console.log('Gmail service initialized successfully')
        return gmailService
      } else {
        console.warn('Gmail service initialization failed')
        return null
      }
    } catch (error) {
      console.error('Error initializing Gmail service:', error)
      return null
    }
  }

  // Initialize Calendar service
  async initializeCalendarService() {
    try {
      const { default: calendarService } = await import('./calendarService.js')
      const success = await calendarService.initialize()
      
      if (success) {
        this.services.set('calendar', calendarService)
        this.serviceStatus.set('calendar', {
          isReady: true,
          isConnected: calendarService.isSignedIn(),
          lastSync: null
        })
        console.log('Calendar service initialized successfully')
        return calendarService
      } else {
        console.warn('Calendar service initialization failed')
        return null
      }
    } catch (error) {
      console.error('Error initializing Calendar service:', error)
      return null
    }
  }

  // Initialize WhatsApp service
  async initializeWhatsAppService() {
    try {
      const { default: whatsappService } = await import('./whatsappService.js')
      const success = await whatsappService.initialize()
      
      if (success) {
        this.services.set('whatsapp', whatsappService)
        this.serviceStatus.set('whatsapp', {
          isReady: true,
          isConnected: whatsappService.isReady(),
          lastSync: null
        })
        console.log('WhatsApp service initialized successfully')
        return whatsappService
      } else {
        console.warn('WhatsApp service initialization failed')
        return null
      }
    } catch (error) {
      console.error('Error initializing WhatsApp service:', error)
      return null
    }
  }

  // Get service by name
  getService(serviceName) {
    return this.services.get(serviceName)
  }

  // Get all services
  getAllServices() {
    return Array.from(this.services.entries()).map(([name, service]) => ({
      name,
      service,
      status: this.serviceStatus.get(name)
    }))
  }

  // Get service status
  getServiceStatus(serviceName) {
    return this.serviceStatus.get(serviceName) || {
      isReady: false,
      isConnected: false,
      lastSync: null
    }
  }

  // Update service status
  updateServiceStatus(serviceName, status) {
    this.serviceStatus.set(serviceName, {
      ...this.serviceStatus.get(serviceName),
      ...status
    })
  }

  // Check if service is ready
  isServiceReady(serviceName) {
    const status = this.serviceStatus.get(serviceName)
    return status ? status.isReady : false
  }

  // Check if service is connected
  isServiceConnected(serviceName) {
    const status = this.serviceStatus.get(serviceName)
    return status ? status.isConnected : false
  }

  // Connect to service
  async connectToService(serviceName) {
    try {
      const service = this.getService(serviceName)
      if (!service) {
        throw new Error(`Service ${serviceName} not found`)
      }

      let success = false
      
      switch (serviceName) {
        case 'gmail':
          success = await service.signIn()
          break
        case 'calendar':
          success = await service.signIn()
          break
        case 'whatsapp':
          success = await service.initialize()
          break
        default:
          throw new Error(`Unknown service: ${serviceName}`)
      }

      if (success) {
        this.updateServiceStatus(serviceName, {
          isConnected: true,
          lastSync: new Date().toISOString()
        })
        console.log(`Successfully connected to ${serviceName}`)
        return true
      } else {
        throw new Error(`Failed to connect to ${serviceName}`)
      }
    } catch (error) {
      console.error(`Error connecting to ${serviceName}:`, error)
      this.updateServiceStatus(serviceName, { isConnected: false })
      throw error
    }
  }

  // Disconnect from service
  async disconnectFromService(serviceName) {
    try {
      const service = this.getService(serviceName)
      if (!service) {
        throw new Error(`Service ${serviceName} not found`)
      }

      let success = false
      
      switch (serviceName) {
        case 'gmail':
          success = await service.signOut()
          break
        case 'calendar':
          success = await service.signOut()
          break
        case 'whatsapp':
          // WhatsApp doesn't have a sign-out method
          success = true
          break
        default:
          throw new Error(`Unknown service: ${serviceName}`)
      }

      if (success) {
        this.updateServiceStatus(serviceName, {
          isConnected: false,
          lastSync: null
        })
        console.log(`Successfully disconnected from ${serviceName}`)
        return true
      } else {
        throw new Error(`Failed to disconnect from ${serviceName}`)
      }
    } catch (error) {
      console.error(`Error disconnecting from ${serviceName}:`, error)
      throw error
    }
  }

  // Sync data from service
  async syncFromService(serviceName) {
    try {
      const service = this.getService(serviceName)
      if (!service) {
        throw new Error(`Service ${serviceName} not found`)
      }

      if (!this.isServiceConnected(serviceName)) {
        throw new Error(`Service ${serviceName} is not connected`)
      }

      let data = null
      
      switch (serviceName) {
        case 'gmail':
          data = await service.getEmails()
          break
        case 'calendar':
          data = await service.getUpcomingEvents()
          break
        case 'whatsapp':
          // WhatsApp doesn't have a get messages method in this implementation
          data = []
          break
        default:
          throw new Error(`Unknown service: ${serviceName}`)
      }

      // Update last sync time
      this.updateServiceStatus(serviceName, {
        lastSync: new Date().toISOString()
      })

      console.log(`Successfully synced data from ${serviceName}`)
      return data
    } catch (error) {
      console.error(`Error syncing from ${serviceName}:`, error)
      throw error
    }
  }

  // Get overall service health
  getServiceHealth() {
    const health = {
      totalServices: this.services.size,
      readyServices: 0,
      connectedServices: 0,
      services: {}
    }

    for (const [name, status] of this.serviceStatus) {
      health.services[name] = status
      if (status.isReady) health.readyServices++
      if (status.isConnected) health.connectedServices++
    }

    return health
  }

  // Get service configuration
  getServiceConfiguration() {
    const config = {}
    
    for (const [name, service] of this.services) {
      config[name] = {
        status: this.serviceStatus.get(name),
        config: service.getStatus ? service.getStatus() : {}
      }
    }

    return config
  }

  // Test service connection
  async testServiceConnection(serviceName) {
    try {
      const service = this.getService(serviceName)
      if (!service) {
        return { success: false, error: 'Service not found' }
      }

      let testResult = null
      
      switch (serviceName) {
        case 'gmail':
          testResult = await service.getEmailStats()
          break
        case 'calendar':
          testResult = await service.getCalendarSettings()
          break
        case 'whatsapp':
          testResult = await service.getBusinessProfile()
          break
        default:
          return { success: false, error: 'Unknown service' }
      }

      return { success: true, data: testResult }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // Get available services
  getAvailableServices() {
    return Array.from(this.services.keys())
  }

  // Check if manager is ready
  isReady() {
    return this.isInitialized && this.services.size > 0
  }

  // Get manager status
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      totalServices: this.services.size,
      serviceHealth: this.getServiceHealth(),
      availableServices: this.getAvailableServices()
    }
  }

  // Cleanup services
  async cleanup() {
    try {
      for (const [name, service] of this.services) {
        if (service.destroy) {
          await service.destroy()
        }
      }
      
      this.services.clear()
      this.serviceStatus.clear()
      this.isInitialized = false
      
      console.log('Service manager cleaned up successfully')
    } catch (error) {
      console.error('Error cleaning up service manager:', error)
    }
  }
}

// Create and export a singleton instance
const serviceManager = new ServiceManager()
export default serviceManager
