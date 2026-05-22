// Configuration file for AI Voice Assistant PWA
// Copy this file to config.local.js and fill in your actual API keys

const config = {
  // Google APIs (Gmail & Calendar)
  google: {
    clientId: 'your-google-client-id-here',
    apiKey: 'your-google-api-key-here',
  },
  
  // WhatsApp Business API (Optional)
  whatsapp: {
    accessToken: 'your-whatsapp-access-token-here',
    phoneNumberId: 'your-phone-number-id-here',
    businessAccountId: 'your-business-account-id-here',
  },
  
  // App Configuration
  app: {
    name: 'AI Voice Assistant',
    version: '1.0.0',
    debug: true,
  }
}

// Override with local config if it exists
try {
  const localConfig = require('./config.local.js')
  Object.assign(config, localConfig)
} catch (e) {
  console.log('No local config found, using default config')
}

export default config
