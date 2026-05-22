// WhatsApp Business API Integration Service
class WhatsAppService {
  constructor() {
    this.accessToken = process.env.REACT_APP_WHATSAPP_ACCESS_TOKEN || 'your-whatsapp-access-token'
    this.phoneNumberId = process.env.REACT_APP_WHATSAPP_PHONE_NUMBER_ID || 'your-phone-number-id'
    this.businessAccountId = process.env.REACT_APP_WHATSAPP_BUSINESS_ACCOUNT_ID || 'your-business-account-id'
    this.apiVersion = 'v18.0'
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`
    this.isInitialized = false
  }

  // Initialize WhatsApp service
  async initialize() {
    try {
      // For now, just mark as initialized without external dependencies
      // This will be enhanced when WhatsApp API is properly configured
      console.log('WhatsApp service initialized (mock mode)')
      this.isInitialized = true
      return true
    } catch (error) {
      console.error('Failed to initialize WhatsApp service:', error)
      return false
    }
  }

  // Verify API credentials
  async verifyCredentials() {
    try {
      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}?access_token=${this.accessToken}`)
      const data = await response.json()
      return !data.error
    } catch (error) {
      console.error('Error verifying WhatsApp credentials:', error)
      return false
    }
  }

  // Send text message
  async sendTextMessage(to, message) {
    try {
      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: 'text',
          text: {
            body: message
          }
        })
      })

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error.message)
      }

      return {
        id: data.messages[0].id,
        to: to,
        message: message,
        timestamp: new Date().toISOString(),
        status: 'sent'
      }
    } catch (error) {
      console.error('Failed to send WhatsApp message:', error)
      throw error
    }
  }

  // Send media message (image, document, etc.)
  async sendMediaMessage(to, mediaType, mediaUrl, caption = '') {
    try {
      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: mediaType,
          [mediaType]: {
            link: mediaUrl,
            caption: caption
          }
        })
      })

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error.message)
      }

      return {
        id: data.messages[0].id,
        to: to,
        mediaType: mediaType,
        mediaUrl: mediaUrl,
        caption: caption,
        timestamp: new Date().toISOString(),
        status: 'sent'
      }
    } catch (error) {
      console.error('Failed to send WhatsApp media message:', error)
      throw error
    }
  }

  // Send template message
  async sendTemplateMessage(to, templateName, languageCode = 'en_US', components = []) {
    try {
      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: languageCode
            },
            components: components
          }
        })
      })

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error.message)
      }

      return {
        id: data.messages[0].id,
        to: to,
        templateName: templateName,
        languageCode: languageCode,
        components: components,
        timestamp: new Date().toISOString(),
        status: 'sent'
      }
    } catch (error) {
      console.error('Failed to send WhatsApp template message:', error)
      throw error
    }
  }

  // Send interactive message (buttons, lists, etc.)
  async sendInteractiveMessage(to, interactiveType, interactiveData) {
    try {
      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: 'interactive',
          interactive: {
            type: interactiveType,
            ...interactiveData
          }
        })
      })

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error.message)
      }

      return {
        id: data.messages[0].id,
        to: to,
        interactiveType: interactiveType,
        interactiveData: interactiveData,
        timestamp: new Date().toISOString(),
        status: 'sent'
      }
    } catch (error) {
      console.error('Failed to send WhatsApp interactive message:', error)
      throw error
    }
  }

  // Send button message
  async sendButtonMessage(to, bodyText, buttons) {
    const interactiveData = {
      body: {
        text: bodyText
      },
      action: {
        buttons: buttons.map((button, index) => ({
          type: 'reply',
          reply: {
            id: `btn_${index}`,
            title: button.title
          }
        }))
      }
    }

    return await this.sendInteractiveMessage(to, 'button', interactiveData)
  }

  // Send list message
  async sendListMessage(to, bodyText, buttonText, sections) {
    const interactiveData = {
      body: {
        text: bodyText
      },
      action: {
        button: buttonText,
        sections: sections
      }
    }

    return await this.sendInteractiveMessage(to, 'list', interactiveData)
  }

  // Send quick reply message
  async sendQuickReplyMessage(to, bodyText, quickReplies) {
    const interactiveData = {
      body: {
        text: bodyText
      },
      action: {
        buttons: quickReplies.map((reply, index) => ({
          type: 'reply',
          reply: {
            id: `qr_${index}`,
            title: reply.title
          }
        }))
      }
    }

    return await this.sendInteractiveMessage(to, 'button', interactiveData)
  }

  // Get message status
  async getMessageStatus(messageId) {
    try {
      const response = await fetch(`${this.baseUrl}/${messageId}?access_token=${this.accessToken}`)
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error.message)
      }

      return {
        id: data.id,
        status: data.status,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Failed to get message status:', error)
      throw error
    }
    }

  // Get business profile
  async getBusinessProfile() {
    try {
      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}?fields=verified_name,code_verification_status,quality_rating,is_pin_enabled&access_token=${this.accessToken}`)
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error.message)
      }

      return {
        verifiedName: data.verified_name,
        codeVerificationStatus: data.code_verification_status,
        qualityRating: data.quality_rating,
        isPinEnabled: data.is_pin_enabled
      }
    } catch (error) {
      console.error('Failed to get business profile:', error)
      throw error
    }
  }

  // Get phone numbers
  async getPhoneNumbers() {
    try {
      const response = await fetch(`${this.baseUrl}/${this.businessAccountId}/phone_numbers?access_token=${this.accessToken}`)
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error.message)
      }

      return data.data.map(phone => ({
        id: phone.id,
        phoneNumber: phone.phone_number,
        displayPhoneNumber: phone.display_phone_number,
        qualityRating: phone.quality_rating,
        verifiedName: phone.verified_name
      }))
    } catch (error) {
      console.error('Failed to get phone numbers:', error)
      throw error
    }
  }

  // Get message templates
  async getMessageTemplates() {
    try {
      const response = await fetch(`${this.baseUrl}/${this.businessAccountId}/message_templates?access_token=${this.accessToken}`)
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error.message)
      }

      return data.data.map(template => ({
        id: template.id,
        name: template.name,
        status: template.status,
        category: template.category,
        language: template.language,
        components: template.components
      }))
    } catch (error) {
      console.error('Failed to get message templates:', error)
      throw error
    }
  }

  // Create message template
  async createMessageTemplate(name, category, language, components) {
    try {
      const response = await fetch(`${this.baseUrl}/${this.businessAccountId}/message_templates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name,
          category: category,
          language: language,
          components: components
        })
      })

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error.message)
      }

      return {
        id: data.id,
        name: data.name,
        status: data.status,
        category: data.category,
        language: data.language
      }
    } catch (error) {
      console.error('Failed to create message template:', error)
      throw error
    }
  }

  // Delete message template
  async deleteMessageTemplate(templateId) {
    try {
      const response = await fetch(`${this.baseUrl}/${templateId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.message || 'Failed to delete template')
      }

      return { success: true, templateId }
    } catch (error) {
      console.error('Failed to delete message template:', error)
      throw error
    }
  }

  // Get webhook configuration
  async getWebhookConfiguration() {
    try {
      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}/subscribed_apps?access_token=${this.accessToken}`)
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error.message)
      }

      return data.data
    } catch (error) {
      console.error('Failed to get webhook configuration:', error)
      throw error
    }
  }

  // Set webhook URL
  async setWebhookUrl(webhookUrl, verifyToken) {
    try {
      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}/subscribed_apps`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          callback_url: webhookUrl,
          verify_token: verifyToken
        })
      })

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error.message)
      }

      return { success: true, webhookUrl }
    } catch (error) {
      console.error('Failed to set webhook URL:', error)
      throw error
    }
  }

  // Get conversation analytics
  async getConversationAnalytics(startDate, endDate) {
    try {
      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}/insights?metric=conversation_start_rate&start=${startDate}&end=${endDate}&access_token=${this.accessToken}`)
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error.message)
      }

      return data.data.map(metric => ({
        name: metric.name,
        values: metric.values,
        totalValue: metric.total_value
      }))
    } catch (error) {
      console.error('Failed to get conversation analytics:', error)
      throw error
    }
  }

  // Check if service is ready
  isReady() {
    return this.isInitialized && this.accessToken && this.phoneNumberId
  }

  // Get service status
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      hasAccessToken: !!this.accessToken,
      hasPhoneNumberId: !!this.phoneNumberId,
      isReady: this.isReady()
    }
  }
}

// Create and export a singleton instance
const whatsappService = new WhatsAppService()
export default whatsappService
