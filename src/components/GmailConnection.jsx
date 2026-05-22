import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
} from '@mui/material'
import {
  Email,
  CheckCircle,
  Error,
  Warning,
  Refresh,
  Settings,
  Link,
  LinkOff,
  Sync,
  Info,
  Security,
  CloudDone,
  CloudOff,
  Person,
  Lock,
  Storage,
} from '@mui/icons-material'
import gmailService from '../services/gmailService'
import toast from 'react-hot-toast'

const GmailConnection = ({ open, onClose, onConnectionChange }) => {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [gmailStats, setGmailStats] = useState(null)
  const [syncSettings, setSyncSettings] = useState({
    autoSync: true,
    syncInterval: 5,
    maxEmails: 100,
  })
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    if (open) {
      checkConnectionStatus()
    }
  }, [open])

  const checkConnectionStatus = async () => {
    try {
      const isSignedIn = gmailService.isUserSignedIn()
      setIsConnected(isSignedIn)
      setConnectionStatus(isSignedIn ? 'connected' : 'disconnected')
      
      if (isSignedIn) {
        await loadGmailStats()
      }
    } catch (error) {
      console.error('Error checking connection status:', error)
      setConnectionStatus('error')
    }
  }

  const loadGmailStats = async () => {
    try {
      const stats = await gmailService.getEmailStats()
      setGmailStats(stats)
    } catch (error) {
      console.error('Error loading Gmail stats:', error)
    }
  }

  const handleConnect = async () => {
    try {
      setIsConnecting(true)
      setConnectionStatus('connecting')
      
      // Initialize Gmail service if not already done
      if (!gmailService.isInitialized) {
        await gmailService.initialize()
      }
      
      // Sign in to Gmail
      const success = await gmailService.signIn()
      
      if (success) {
        setIsConnected(true)
        setConnectionStatus('connected')
        await loadGmailStats()
        toast.success('Successfully connected to Gmail!')
        onConnectionChange?.(true)
      } else {
        setConnectionStatus('error')
        toast.error('Failed to connect to Gmail')
      }
    } catch (error) {
      console.error('Gmail connection error:', error)
      setConnectionStatus('error')
      toast.error(`Connection failed: ${error.message}`)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      setIsConnecting(true)
      await gmailService.signOut()
      setIsConnected(false)
      setConnectionStatus('disconnected')
      setGmailStats(null)
      toast.success('Disconnected from Gmail')
      onConnectionChange?.(false)
    } catch (error) {
      console.error('Gmail disconnection error:', error)
      toast.error(`Disconnection failed: ${error.message}`)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleSyncNow = async () => {
    try {
      setIsConnecting(true)
      await loadGmailStats()
      toast.success('Gmail data refreshed successfully')
    } catch (error) {
      console.error('Sync error:', error)
      toast.error(`Sync failed: ${error.message}`)
    } finally {
      setIsConnecting(false)
    }
  }

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle color="success" />
      case 'connecting':
        return <CircularProgress size={20} />
      case 'error':
        return <Error color="error" />
      case 'disconnected':
        return <CloudOff color="action" />
      default:
        return <Warning color="warning" />
    }
  }

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'success'
      case 'connecting':
        return 'info'
      case 'error':
        return 'error'
      case 'disconnected':
        return 'default'
      default:
        return 'warning'
    }
  }

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected'
      case 'connecting':
        return 'Connecting...'
      case 'error':
        return 'Connection Error'
      case 'disconnected':
        return 'Not Connected'
      default:
        return 'Unknown Status'
    }
  }

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
              {getStatusIcon()}
              <Typography variant="h6">
                Connection Status
              </Typography>
              <Chip
                label={getStatusText()}
                color={getStatusColor()}
                variant="outlined"
              />
            </Box>
            
            {connectionStatus === 'connected' ? (
              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Your Gmail account is connected and ready for use.
                </Typography>
              </Alert>
            ) : connectionStatus === 'error' ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  There was an error connecting to Gmail. Please try again.
                </Typography>
              </Alert>
            ) : (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Connect your Gmail account to access real emails and enable AI-powered features.
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
                  disabled={isConnecting}
                >
                  {isConnecting ? 'Connecting...' : 'Connect Gmail'}
                </Button>
              ) : (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<Sync />}
                    onClick={handleSyncNow}
                    disabled={isConnecting}
                  >
                    {isConnecting ? 'Syncing...' : 'Sync Now'}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<LinkOff />}
                    onClick={handleDisconnect}
                    disabled={isConnecting}
                    color="error"
                  >
                    Disconnect
                  </Button>
                </>
              )}
              
              <Button
                variant="outlined"
                startIcon={<Settings />}
                onClick={() => setSettingsOpen(true)}
                disabled={!isConnected}
              >
                Settings
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Gmail Statistics */}
        {isConnected && gmailStats && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Gmail Account Information
              </Typography>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ textAlign: 'center', minWidth: 120 }}>
                  <Typography variant="h4" color="primary" sx={{ fontWeight: 700 }}>
                    {gmailStats.messagesTotal?.toLocaleString() || '0'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Messages
                  </Typography>
                </Box>
                
                <Box sx={{ textAlign: 'center', minWidth: 120 }}>
                  <Typography variant="h4" color="success.main" sx={{ fontWeight: 700 }}>
                    {gmailStats.threadsTotal?.toLocaleString() || '0'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Threads
                  </Typography>
                </Box>
                
                <Box sx={{ textAlign: 'center', minWidth: 120 }}>
                  <Typography variant="h4" color="info.main" sx={{ fontWeight: 700 }}>
                    {gmailStats.inboxCount?.toLocaleString() || '0'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Inbox Messages
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Email Address: <strong>{gmailStats.emailAddress}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  History ID: <strong>{gmailStats.historyId}</strong>
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}

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
              
              <ListItem>
                <ListItemIcon>
                  <CheckCircle color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="Cross-Device Sync"
                  secondary="Access your organized emails from any device"
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Gmail Sync Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={syncSettings.autoSync}
                  onChange={(e) => setSyncSettings(prev => ({ ...prev, autoSync: e.target.checked }))}
                />
              }
              label="Enable automatic synchronization"
            />
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Sync Interval (minutes)</InputLabel>
              <Select
                value={syncSettings.syncInterval}
                onChange={(e) => setSyncSettings(prev => ({ ...prev, syncInterval: e.target.value }))}
                label="Sync Interval (minutes)"
              >
                <MenuItem value={1}>1 minute</MenuItem>
                <MenuItem value={5}>5 minutes</MenuItem>
                <MenuItem value={15}>15 minutes</MenuItem>
                <MenuItem value={30}>30 minutes</MenuItem>
                <MenuItem value={60}>1 hour</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Maximum emails to sync</InputLabel>
              <Select
                value={syncSettings.maxEmails}
                onChange={(e) => setSyncSettings(prev => ({ ...prev, maxEmails: e.target.value }))}
                label="Maximum emails to sync"
              >
                <MenuItem value={50}>50 emails</MenuItem>
                <MenuItem value={100}>100 emails</MenuItem>
                <MenuItem value={250}>250 emails</MenuItem>
                <MenuItem value={500}>500 emails</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Save Settings</Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  )
}

export default GmailConnection
