import React, { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material'
import {
  Email,
  CheckCircle,
  Info,
  Link,
  Settings,
  Warning,
} from '@mui/icons-material'
import toast from 'react-hot-toast'
import gisGmailService from '../services/gisGmailService'

const SimpleGmailConnection = ({ open, onClose, onConnectionChange }) => {
  const [isConnected, setIsConnected] = useState(false)
  const [clientId, setClientId] = useState('')
  const [showSetup, setShowSetup] = useState(false)

  const handleConnect = async () => {
    if (!clientId) {
      setShowSetup(true)
      return
    }

    try {
      // Save client id and request a token lazily on first fetch
      localStorage.setItem('gmail_client_id', clientId)
      setIsConnected(true)
      toast.success('Gmail connection configured successfully!')
      onConnectionChange?.(true)
      onClose()
    } catch (error) {
      toast.error('Failed to connect to Gmail')
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      if (!clientId) {
        setShowSetup(true)
        return
      }
      localStorage.setItem('gmail_client_id', clientId)
      await gisGmailService.requestAccessToken([
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.metadata',
        'https://www.googleapis.com/auth/calendar.readonly',
      ], { prompt: 'consent' })
      setIsConnected(true)
      toast.success('Google sign-in successful')
      onConnectionChange?.(true)
    } catch (e) {
      const msg = (e && e.message) ? e.message : 'Sign-in failed'
      toast.error(msg.includes('origin') ? 'Sign-in failed: add http://localhost:3000 to Authorized JavaScript origins in Google Cloud Console.' : msg)
    }
  }

  const handleDisconnect = () => {
    setIsConnected(false)
    setClientId('')
    toast.success('Disconnected from Gmail')
    onConnectionChange?.(false)
  }

  const handleSaveCredentials = () => {
    if (clientId && apiKey) {
      // Store credentials in localStorage for now
      localStorage.setItem('gmail_client_id', clientId)
      localStorage.setItem('gmail_api_key', apiKey)
      setShowSetup(false)
      toast.success('Credentials saved! Now click Connect Gmail')
    } else {
      toast.error('Please fill in both Client ID and API Key')
    }
  }

  // Load saved credentials on component mount
  React.useEffect(() => {
    const savedClientId = localStorage.getItem('gmail_client_id')
    if (savedClientId) {
      setClientId(savedClientId)
    }
  }, [])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Email color="primary" />
          Gmail Integration
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {/* Connection Status */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              {isConnected ? (
                <CheckCircle color="success" />
              ) : (
                <Info color="info" />
              )}
              <Typography variant="h6">
                Connection Status
              </Typography>
              <Chip
                label={isConnected ? 'Connected' : 'Not Connected'}
                color={isConnected ? 'success' : 'default'}
                variant="outlined"
              />
            </Box>
            
            {isConnected ? (
              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Your Gmail account is configured and ready for use.
                </Typography>
              </Alert>
            ) : (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Configure your Google OAuth Client ID to enable real Gmail integration.
                </Typography>
              </Alert>
            )}

            {/* Connection Actions */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {!isConnected ? (
                <Button
                  variant="contained"
                  startIcon={<Link />}
                  onClick={handleConnect}
                >
                  Connect Gmail
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  startIcon={<Settings />}
                  onClick={() => setShowSetup(true)}
                >
                  Configure
                </Button>
              )}
              <Button variant="outlined" onClick={handleGoogleSignIn} disabled={!clientId}>
                Sign in with Google
              </Button>
              
              {isConnected && (
                <Button
                  variant="outlined"
                  startIcon={<Email />}
                  color="error"
                  onClick={handleDisconnect}
                >
                  Disconnect
                </Button>
              )}
            </Box>
          </CardContent>
        </Card>

        {/* Setup Instructions */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              How to Set Up Gmail Integration
            </Typography>
            
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <Info color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Step 1: Create Google Cloud Project"
                  secondary="Go to Google Cloud Console and create a new project"
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <Info color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Step 2: Enable Gmail API"
                  secondary="Enable the Gmail API in your project"
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <Info color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Step 3: Create OAuth Credentials"
                  secondary="Create OAuth 2.0 client ID and API key"
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <Info color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Step 4: Add Credentials"
                  secondary="Click Configure and add your Client ID and API Key"
                />
              </ListItem>
            </List>
            
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Note:</strong> This is a simplified setup. For production use, 
                see the detailed setup guide in SETUP_GUIDE.md
              </Typography>
            </Alert>
          </CardContent>
        </Card>

        {/* Features Available */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Features Available with Gmail Integration
            </Typography>
            
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <CheckCircle color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="Real-time Email Sync"
                  secondary="Access your actual Gmail emails instead of mock data"
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <CheckCircle color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="AI-Powered Analysis"
                  secondary="Get intelligent summaries and insights from your emails"
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <CheckCircle color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="Smart Organization"
                  secondary="Automatically categorize and prioritize emails"
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <CheckCircle color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="Voice Commands"
                  secondary="Control your emails using natural voice commands"
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>

      {/* Setup Dialog */}
      <Dialog open={showSetup} onClose={() => setShowSetup(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Configure Google OAuth Client</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enter your Google Cloud OAuth 2.0 Client ID. We'll use Google Identity Services to obtain a token at runtime.
            </Typography>
            
            <TextField
              fullWidth
              label="Client ID"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="123456789-abcdef.apps.googleusercontent.com"
              sx={{ mb: 2 }}
            />
            
            <Alert severity="info">
              <Typography variant="body2">
                <strong>Need help?</strong> See SETUP_GUIDE.md for detailed instructions on getting a Web application Client ID from Google Cloud Console.
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSetup(false)}>Cancel</Button>
          <Button onClick={() => {
            if (clientId) {
              localStorage.setItem('gmail_client_id', clientId)
              toast.success('Client ID saved')
              setShowSetup(false)
            } else {
              toast.error('Client ID is required')
            }
          }} variant="contained">
            Save Credentials
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  )
}

export default SimpleGmailConnection
