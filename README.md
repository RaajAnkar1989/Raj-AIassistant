# AI Voice Assistant PWA

A comprehensive, voice-oriented personal AI assistant Progressive Web App (PWA) that integrates daily productivity tools into a single dashboard. Inspired by advanced AI systems like Grok AI and JARVIS from Iron Man.

## 🚀 Features

### Core Features
- **Voice-First Interface**: Control everything with your voice using advanced speech recognition
- **AI-Powered Assistant**: Conversational AI with personality and predictive insights
- **Real Gmail Integration**: Access and manage your actual Gmail emails with AI-powered analysis
- **Live Google Calendar**: View and manage your real calendar events and schedule meetings
- **WhatsApp Business API**: Send messages and manage templates through WhatsApp Business
- **Smart Task Management**: AI-suggested task prioritization with local data persistence
- **Real-Time Sync**: Automatic data synchronization across devices and services
- **Quick Meetings**: Instant Google Meet generation and WebRTC calling
- **PWA Support**: Offline capabilities and mobile app-like experience

### Service Integration
- **Gmail API**: Real-time email sync, AI analysis, and smart organization
- **Google Calendar API**: Live calendar data, event management, and scheduling
- **WhatsApp Business API**: Business messaging, templates, and delivery tracking
- **Local Data Storage**: IndexedDB with real-time synchronization
- **Cross-Device Sync**: Data consistency across multiple devices and tabs

### Voice Commands
- "Read my emails" - Fetch and display emails
- "Show calendar" - Load calendar events
- "Show todos" - Display task list
- "Start meeting" - Generate Google Meet link
- "What time is it" - Get current time
- "Tell me a joke" - AI humor response

## 🛠️ Tech Stack

- **Frontend**: React.js 18, Material-UI 5
- **State Management**: Redux Toolkit with async thunks
- **Data Storage**: IndexedDB + LocalStorage with real-time sync
- **External APIs**: Gmail API, Google Calendar API, WhatsApp Business API
- **PWA**: Service Workers, Manifest, Offline Support
- **Voice**: Web Speech API (SpeechRecognition & SpeechSynthesis)
- **Build Tool**: Vite with PWA plugin
- **Styling**: Emotion, CSS-in-JS

## 📋 Prerequisites

### Basic Requirements
- Node.js 16+ 
- npm or yarn
- Modern browser with Web Speech API support
- HTTPS connection (required for PWA features)

### For Gmail & Google Calendar Integration:
- Google Cloud Project with APIs enabled
- OAuth 2.0 credentials
- Valid Google account with Gmail/Calendar access

### For WhatsApp Business Integration:
- WhatsApp Business API account
- Verified phone number with Meta
- Access token and phone number ID

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-voice-assistant-pwa
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
# Google APIs (Gmail & Calendar)
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id
REACT_APP_GOOGLE_API_KEY=your-google-api-key

# WhatsApp Business API
REACT_APP_WHATSAPP_ACCESS_TOKEN=your-whatsapp-access-token
REACT_APP_WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
REACT_APP_WHATSAPP_BUSINESS_ACCOUNT_ID=your-business-account-id

# App Configuration
REACT_APP_APP_NAME=AI Voice Assistant
REACT_APP_APP_VERSION=1.0.0
```

### Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - Gmail API
   - Google Calendar API
4. Create OAuth 2.0 credentials:
   - Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
   - Set application type to "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:3000` (for development)
     - `https://yourdomain.com` (for production)
5. Copy the Client ID and API Key to your `.env` file

### WhatsApp Business API Setup

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create a WhatsApp Business app
3. Set up your business profile
4. Get your access token and phone number ID
5. Add them to your `.env` file

### Google API Setup (Optional)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Gmail API and Google Calendar API
4. Create OAuth 2.0 credentials
5. Add your domain to authorized origins

## 🔌 Service Integration

### Gmail Integration
- **Real-time email sync** from your Gmail account
- **AI-powered email analysis** and summarization
- **Smart response suggestions** based on email content
- **Priority detection** and importance marking
- **Attachment handling** and file management

### Google Calendar Integration
- **Live calendar data** from your Google Calendar
- **Event creation and management** with natural language
- **Smart scheduling** with conflict detection
- **Recurring events** and template support
- **Free/busy time slot** finding

### WhatsApp Business Integration
- **Send messages** to customers and contacts
- **Template messages** for business communication
- **Interactive messages** with buttons and lists
- **Media sharing** (images, documents, etc.)
- **Message delivery tracking**

## 📱 PWA Features

### Installation
- **Desktop**: Click the install button in the browser address bar
- **Mobile**: Add to home screen from browser menu
- **Chrome**: Install prompt will appear automatically

### Offline Support
- Service worker caches essential resources
- App works offline with cached data
- Background sync for pending actions

## 🎤 Voice Features

### Speech Recognition
- Uses Web Speech API
- Supports multiple languages
- Fallback to text input

### Speech Synthesis
- Text-to-speech for AI responses
- Configurable voice settings
- Natural language processing

## 🔄 Data Synchronization

### Local Storage
- **IndexedDB**: Fast, structured data storage
- **LocalStorage**: Settings and preferences
- **Service Worker**: Background sync and caching

### Real-time Sync
- **Cross-tab synchronization** for multiple browser tabs
- **Automatic sync** every 5 minutes when online
- **Conflict resolution** for data consistency
- **Export/Import** functionality for data portability

## 🏗️ Project Structure

```
src/
├── components/           # React components
│   ├── dashboard/       # Dashboard components
│   ├── LandingPage.jsx  # Landing page
│   ├── Dashboard.jsx    # Main dashboard
│   ├── VoiceListener.jsx # Voice recognition
│   ├── ServiceIntegration.jsx # Service management
│   └── DataManagement.jsx # Data export/import
├── services/            # External service integrations
│   ├── gmailService.js      # Gmail API integration
│   ├── calendarService.js   # Google Calendar API
│   ├── whatsappService.js   # WhatsApp Business API
│   ├── dataService.js       # Local data management
│   ├── syncService.js       # Real-time synchronization
│   └── serviceManager.js    # Service coordination
├── store/               # Redux store
│   ├── slices/         # Redux slices
│   └── store.js        # Store configuration
├── App.jsx             # Main app component
├── main.jsx            # Entry point
└── index.css           # Global styles

public/
├── sw.js               # Service worker
├── manifest.json       # PWA manifest
└── icons/              # PWA icons
```

## 🚀 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🔒 Security Features

- HTTPS required for PWA features
- Secure authentication flow
- Data encryption in transit
- Privacy-focused design

## 🌐 Browser Support

- **Chrome**: Full support
- **Firefox**: Full support
- **Safari**: Limited PWA support
- **Edge**: Full support
- **Mobile browsers**: Full support

## 📊 Performance

- Lazy loading of components
- Optimized bundle size
- Service worker caching
- Responsive design

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 🚀 Deployment

### Netlify
1. Connect your GitHub repository
2. Build command: `npm run build`
3. Publish directory: `dist`

### Vercel
1. Import your GitHub repository
2. Build command: `npm run build`
3. Output directory: `dist`

### GitHub Pages
1. Enable GitHub Pages in repository settings
2. Set source to GitHub Actions
3. Push to trigger deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by Grok AI and JARVIS
- Built with modern web technologies
- Community-driven development

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)
- **Email**: support@your-app.com

## 🔄 Updates

- **v1.0.0**: Initial release with core features
- **v1.1.0**: Enhanced voice recognition
- **v1.2.0**: Advanced AI features

---

**Built with ❤️ for productivity and innovation**
