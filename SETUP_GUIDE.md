# 🚀 Setup Guide: Connect Your Real Services

This guide will help you connect your AI Voice Assistant to real services like Gmail, Google Calendar, and WhatsApp Business.

## 📋 Prerequisites

Before you start, make sure you have:
- A Google account with Gmail and Calendar access
- A WhatsApp Business account (optional)
- Basic knowledge of web development

## 🔑 Step 1: Create Environment File

1. In your project root, create a `.env` file
2. Copy the following template and fill in your API keys:

```env
# Google APIs (Gmail & Calendar)
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id-here
REACT_APP_GOOGLE_API_KEY=your-google-api-key-here

# WhatsApp Business API (Optional)
REACT_APP_WHATSAPP_ACCESS_TOKEN=your-whatsapp-access-token-here
REACT_APP_WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id-here
REACT_APP_WHATSAPP_BUSINESS_ACCOUNT_ID=your-business-account-id-here

# App Configuration
REACT_APP_APP_NAME=AI Voice Assistant
REACT_APP_APP_VERSION=1.0.0
```

## 🌐 Step 2: Google Cloud Setup (Gmail & Calendar)

### 2.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter a project name (e.g., "AI Voice Assistant")
4. Click "Create"

### 2.2 Enable APIs

1. In your project, go to "APIs & Services" → "Library"
2. Search for and enable these APIs:
   - **Gmail API**
   - **Google Calendar API**
3. Click "Enable" for each

### 2.3 Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Add authorized redirect URIs:
   - `http://localhost:3000` (for development)
   - `https://yourdomain.com` (for production)
5. Click "Create"
6. Copy the **Client ID** and **API Key**

### 2.4 Update Environment File

Replace the placeholders in your `.env` file:
```env
REACT_APP_GOOGLE_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com
REACT_APP_GOOGLE_API_KEY=AIzaSyB...your-actual-api-key
```

## 📱 Step 3: WhatsApp Business Setup (Optional)

### 3.1 Create Meta Developer Account

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click "Get Started" and log in with Facebook
3. Create a new app or use existing one

### 3.2 Set Up WhatsApp Business

1. In your app, go to "Add Product"
2. Find "WhatsApp" and click "Set Up"
3. Follow the setup wizard
4. Get your **Access Token** and **Phone Number ID**

### 3.3 Update Environment File

```env
REACT_APP_WHATSAPP_ACCESS_TOKEN=EAAG...your-actual-token
REACT_APP_WHATSAPP_PHONE_NUMBER_ID=123456789
REACT_APP_WHATSAPP_BUSINESS_ACCOUNT_ID=987654321
```

## 🚀 Step 4: Test Your Setup

### 4.1 Start the App

```bash
npm run dev
```

### 4.2 Connect Gmail

1. Go to the **Email** tab in your dashboard
2. Click **"Connect Gmail"** button
3. Sign in with your Google account
4. Grant permissions when prompted
5. You should see "Gmail Connected" status

### 4.3 Test Calendar

1. Go to the **Calendar** tab
2. If Gmail is connected, Calendar should work automatically
3. Try creating a new event

### 4.4 Test WhatsApp (if configured)

1. Go to **Settings** → **Service Integration**
2. Check WhatsApp service status
3. Test sending a message

## 🔧 Troubleshooting

### Common Issues

#### "Google API not working"
- ✅ Check if APIs are enabled in Google Cloud Console
- ✅ Verify OAuth credentials are correct
- ✅ Ensure redirect URIs match your domain
- ✅ Check browser console for error messages

#### "Calendar sync issues"
- ✅ Verify calendar sharing permissions
- ✅ Check OAuth scopes include calendar access
- ✅ Clear browser cache and cookies
- ✅ Try refreshing the page

#### "Voice recognition not working"
- ✅ Ensure microphone permissions are granted
- ✅ Check if browser supports SpeechRecognition API
- ✅ Try refreshing the page
- ✅ Use HTTPS (required for PWA features)

#### "PWA not installing"
- ✅ Check if HTTPS is enabled
- ✅ Verify manifest.json is properly configured
- ✅ Clear browser cache
- ✅ Try in incognito mode

### Debug Mode

Enable debug logging in browser console:
```javascript
localStorage.setItem('debug', 'true')
```

### Check Service Status

1. Go to **Settings** → **Service Integration**
2. View the status of each service
3. Use "Test" buttons to verify connections
4. Check "Last Sync" timestamps

## 🔒 Security Notes

- **Never commit your `.env` file** to version control
- **Keep your API keys secure** and don't share them
- **Use environment variables** for production deployments
- **Regularly rotate** your access tokens
- **Monitor API usage** to avoid quota limits

## 📚 Additional Resources

- [Google Cloud Console](https://console.cloud.google.com/)
- [Google APIs Documentation](https://developers.google.com/apis)
- [Meta for Developers](https://developers.facebook.com/)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
- [PWA Documentation](https://web.dev/progressive-web-apps/)

## 🆘 Need Help?

If you're still having issues:

1. **Check the browser console** for error messages
2. **Verify your API keys** are correct
3. **Ensure all prerequisites** are met
4. **Try the troubleshooting steps** above
5. **Check the main README** for more details

---

**Happy coding! 🎉**

Your AI Voice Assistant should now be connected to real services and ready to boost your productivity!
