// Gmail API Integration Service - Real Gmail Integration
class GmailService {
  constructor() {
    let savedKeys = {};
    try {
      const stored = localStorage.getItem('google_api_keys');
      if (stored) savedKeys = JSON.parse(stored);
    } catch (e) {}

    let envClientId = '';
    let envApiKey = '';
    try {
      envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || process.env.REACT_APP_GOOGLE_CLIENT_ID;
      envApiKey = import.meta.env.VITE_GOOGLE_API_KEY || process.env.REACT_APP_GOOGLE_API_KEY;
    } catch(e) {}

    this.clientId = savedKeys.clientId || envClientId || 'your-google-client-id';
    this.apiKey = savedKeys.apiKey || envApiKey || 'your-google-api-key';
    
    this.discoveryDocs = ['https://gmail.googleapis.com/$discovery/rest?version=v1'];
    this.scopes = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.modify';
    this.gapi = null;
    this.isInitialized = false;
    this.isSignedIn = false;
  }

  setKeys(clientId, apiKey) {
    this.clientId = clientId;
    this.apiKey = apiKey;
    localStorage.setItem('google_api_keys', JSON.stringify({ clientId, apiKey }));
  }

  hasValidKeys() {
    return this.clientId && this.clientId !== 'your-google-client-id' && this.apiKey && this.apiKey !== 'your-google-api-key';
  }

  // Initialize Gmail API
  async initialize() {
    try {
      console.log('🔄 Initializing Gmail service...')
      
      // Check if Google API is loaded
      if (!window.gapi) {
        console.error('❌ Google API not loaded. Please check your internet connection.')
        return false
      }

      // Load the Gmail API
      await new Promise((resolve, reject) => {
        window.gapi.load('client:auth2', resolve)
      })

      // Initialize the client
      await window.gapi.client.init({
        apiKey: this.apiKey,
        clientId: this.clientId,
        discoveryDocs: this.discoveryDocs,
        scope: this.scopes,
      })

      console.log('✅ Gmail API initialized successfully')
      this.isInitialized = true
      return true
    } catch (error) {
      console.error('❌ Failed to initialize Gmail API:', error)
      return false
    }
  }

  // Sign in to Gmail
  async signIn() {
    try {
      console.log('🔐 Signing in to Gmail...')
      
      if (!this.isInitialized) {
        await this.initialize()
      }

      const authInstance = window.gapi.auth2.getAuthInstance()
      if (!authInstance.isSignedIn.get()) {
        const result = await authInstance.signIn()
        console.log('✅ Gmail sign-in successful:', result)
        this.isSignedIn = true
        return true
      } else {
        console.log('✅ Already signed in to Gmail')
        this.isSignedIn = true
        return true
      }
    } catch (error) {
      console.error('❌ Gmail sign-in failed:', error)
      return false
    }
  }

  // Sign out of Gmail
  async signOut() {
    try {
      if (this.isInitialized && window.gapi) {
        const authInstance = window.gapi.auth2.getAuthInstance()
        await authInstance.signOut()
        console.log('✅ Gmail sign-out successful')
      }
      this.isSignedIn = false
      return true
    } catch (error) {
      console.error('❌ Gmail sign-out failed:', error)
      return false
    }
  }

  // Check if user is signed in
  isUserSignedIn() {
    if (!this.isInitialized || !window.gapi) return false
    return window.gapi.auth2.getAuthInstance().isSignedIn.get()
  }

  // Get emails from Gmail
  async getEmails(maxResults = 20) {
    try {
      if (!this.isUserSignedIn()) {
        throw new Error('User not signed in to Gmail')
      }

      console.log('📧 Fetching emails from Gmail...')
      
      const response = await window.gapi.client.gmail.users.messages.list({
        userId: 'me',
        maxResults: maxResults,
        labelIds: ['INBOX']
      })

      const messages = response.result.messages || []
      console.log(`📨 Found ${messages.length} emails`)

      // Get full email details for each message
      const emails = []
      for (const message of messages) {
        try {
          const email = await this.getEmailDetails(message.id)
          if (email) {
            emails.push(email)
          }
        } catch (error) {
          console.warn(`⚠️ Failed to get details for email ${message.id}:`, error)
        }
      }

      console.log(`✅ Successfully loaded ${emails.length} emails`)
      return emails
    } catch (error) {
      console.error('❌ Failed to get Gmail emails:', error)
      throw error
    }
  }

  // Get email details
  async getEmailDetails(messageId) {
    try {
      const response = await window.gapi.client.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      })

      const message = response.result
      const headers = message.payload.headers
      
      // Extract email information
      const email = {
        id: message.id,
        threadId: message.threadId,
        snippet: message.snippet,
        timestamp: new Date(parseInt(message.internalDate)).toISOString(),
        isRead: !message.labelIds.includes('UNREAD'),
        isImportant: message.labelIds.includes('IMPORTANT'),
        isStarred: message.labelIds.includes('STARRED'),
        from: this.getHeaderValue(headers, 'From'),
        to: this.getHeaderValue(headers, 'To'),
        subject: this.getHeaderValue(headers, 'Subject'),
        date: this.getHeaderValue(headers, 'Date'),
        body: this.extractEmailBody(message.payload),
        priority: this.getPriority(headers),
        labels: this.getLabels(message.labelIds)
      }

      return email
    } catch (error) {
      console.error(`❌ Failed to get email details for ${messageId}:`, error)
      return null
    }
  }

  // Get header value
  getHeaderValue(headers, name) {
    const header = headers.find(h => h.name === name)
    return header ? header.value : ''
  }

  // Extract email body
  extractEmailBody(payload) {
    if (payload.body && payload.body.data) {
      return this.decodeBase64(payload.body.data)
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body && part.body.data) {
          return this.decodeBase64(part.body.data)
        }
        if (part.mimeType === 'text/html' && part.body && part.body.data) {
          return this.decodeBase64(part.body.data)
        }
      }
    }

    return ''
  }

  // Get priority from headers
  getPriority(headers) {
    const priority = this.getHeaderValue(headers, 'X-Priority')
    const importance = this.getHeaderValue(headers, 'Importance')
    
    if (priority === '1' || importance === 'high') return 'high'
    if (priority === '3' || importance === 'normal') return 'medium'
    if (priority === '5' || importance === 'low') return 'low'
    
    return 'medium'
  }

  // Get labels
  getLabels(labelIds) {
    const labels = []
    const labelMap = {
      'INBOX': 'inbox',
      'SENT': 'sent',
      'DRAFT': 'draft',
      'SPAM': 'spam',
      'TRASH': 'trash',
      'IMPORTANT': 'important',
      'STARRED': 'starred',
      'UNREAD': 'unread'
    }

    for (const labelId of labelIds) {
      if (labelMap[labelId]) {
        labels.push(labelMap[labelId])
      }
    }

    return labels
  }

  // Decode base64
  decodeBase64(data) {
    try {
      return decodeURIComponent(escape(atob(data)))
    } catch (error) {
      return ''
    }
  }

  // Get email statistics
  async getEmailStats() {
    try {
      if (!this.isUserSignedIn()) {
        throw new Error('User not signed in to Gmail')
      }

      const response = await window.gapi.client.gmail.users.getProfile({
        userId: 'me'
      })

      const profile = response.result
      
      // Get inbox count
      const inboxResponse = await window.gapi.client.gmail.users.messages.list({
        userId: 'me',
        labelIds: ['INBOX'],
        maxResults: 1
      })

      const totalMessages = inboxResponse.result.resultSizeEstimate || 0

      return {
        emailAddress: profile.emailAddress,
        messagesTotal: profile.messagesTotal,
        threadsTotal: profile.threadsTotal,
        historyId: profile.historyId,
        inboxCount: totalMessages
      }
    } catch (error) {
      console.error('❌ Failed to get email stats:', error)
      throw error
    }
  }

  // Trash an email
  async trashEmail(messageId) {
    try {
      if (!this.isUserSignedIn()) throw new Error('User not signed in')
      await window.gapi.client.gmail.users.messages.trash({
        userId: 'me',
        id: messageId
      })
      return true
    } catch (error) {
      console.error(`❌ Failed to trash email ${messageId}:`, error)
      return false
    }
  }

  // Clean inbox (trash promotional/social/spam)
  async cleanInbox() {
    try {
      if (!this.isUserSignedIn()) throw new Error('User not signed in')
      console.log('🧹 Starting inbox cleanup...')
      
      // Search for emails that are likely clutter
      const response = await window.gapi.client.gmail.users.messages.list({
        userId: 'me',
        q: 'category:promotions OR category:social OR label:spam OR older_than:1y',
        maxResults: 50 // process up to 50 at a time for safety
      })

      const messages = response.result.messages || []
      if (messages.length === 0) {
        return { count: 0, status: 'clean' }
      }

      let count = 0
      for (const msg of messages) {
        const success = await this.trashEmail(msg.id)
        if (success) count++
      }

      console.log(`🧹 Cleaned up ${count} emails`)
      return { count, status: 'success' }
    } catch (error) {
      console.error('❌ Failed to clean inbox:', error)
      throw error
    }
  }

  // Check if service is ready
  isReady() {
    return this.isInitialized && this.apiKey && this.clientId
  }

  // Get service status
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isSignedIn: this.isUserSignedIn(),
      hasApiKey: !!this.apiKey,
      hasClientId: !!this.clientId,
      isReady: this.isReady()
    }
  }
}

// Create and export a singleton instance
const gmailService = new GmailService()
export default gmailService
