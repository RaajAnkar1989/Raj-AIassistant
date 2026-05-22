import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Alert,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Divider,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material'
import {
  Email,
  CalendarToday,
  WhatsApp,
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
} from '@mui/icons-material'
import serviceManager from '../services/serviceManager'
import toast from 'react-hot-toast'

const ServiceIntegration = () => {
  const [services, setServices] = useState([])
  const [serviceHealth, setServiceHealth] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [selectedService, setSelectedService] = useState(null)
  const [testDialogOpen, setTestDialogOpen] = useState(false)
  const [testResult, setTestResult] = useState(null)

  useEffect(() => {
    loadServices()
    const interval = setInterval(loadServices, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const loadServices = async () => {
    try {
      const allServices = serviceManager.getAllServices()
      const health = serviceManager.getServiceHealth()
      
      setServices(allServices)
      setServiceHealth(health)
    } catch (error) {
      console.error('Error loading services:', error)
    }
  }

  const handleConnectService = async (serviceName) => {
    try {
      setIsLoading(true)
      await serviceManager.connectToService(serviceName)
      toast.success(`Successfully connected to ${serviceName}`)
      loadServices()
    } catch (error) {
      toast.error(`Failed to connect to ${serviceName}: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnectService = async (serviceName) => {
    try {
      setIsLoading(true)
      await serviceManager.disconnectFromService(serviceName)
      toast.success(`Successfully disconnected from ${serviceName}`)
      loadServices()
    } catch (error) {
      toast.error(`Failed to disconnect from ${serviceName}: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSyncService = async (serviceName) => {
    try {
      setIsLoading(true)
      const data = await serviceManager.syncFromService(serviceName)
      toast.success(`Successfully synced data from ${serviceName}`)
      loadServices()
      return data
    } catch (error) {
      toast.error(`Failed to sync from ${serviceName}: ${error.message}`)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestService = async (serviceName) => {
    try {
      setSelectedService(serviceName)
      setTestDialogOpen(true)
      setTestResult(null)
      
      const result = await serviceManager.testServiceConnection(serviceName)
      setTestResult(result)
    } catch (error) {
      setTestResult({ success: false, error: error.message })
    }
  }

  const getServiceIcon = (serviceName) => {
    switch (serviceName) {
      case 'gmail':
        return <Email />
      case 'calendar':
        return <CalendarToday />
      case 'whatsapp':
        return <WhatsApp />
      default:
        return <Info />
    }
  }

  const getServiceColor = (status) => {
    if (status.isConnected) return 'success'
    if (status.isReady) return 'warning'
    return 'error'
  }

  const getServiceStatusText = (status) => {
    if (status.isConnected) return 'Connected'
    if (status.isReady) return 'Ready'
    return 'Not Ready'
  }

  const getServiceStatusIcon = (status) => {
    if (status.isConnected) return <CheckCircle />
    if (status.isReady) return <Warning />
    return <Error />
  }

  const formatLastSync = (timestamp) => {
    if (!timestamp) return 'Never'
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return date.toLocaleDateString()
  }

  const getServiceDescription = (serviceName) => {
    switch (serviceName) {
      case 'gmail':
        return 'Access and manage your Gmail emails, send messages, and organize your inbox'
      case 'calendar':
        return 'View and manage your Google Calendar events, schedule meetings, and track appointments'
      case 'whatsapp':
        return 'Send WhatsApp Business messages, manage templates, and track message delivery'
      default:
        return 'External service integration'
    }
  }

  const getServiceRequirements = (serviceName) => {
    switch (serviceName) {
      case 'gmail':
        return [
          'Google account with Gmail access',
          'Google Cloud Project with Gmail API enabled',
          'OAuth 2.0 credentials configured'
        ]
      case 'calendar':
        return [
          'Google account with Calendar access',
          'Google Cloud Project with Calendar API enabled',
          'OAuth 2.0 credentials configured'
        ]
      case 'whatsapp':
        return [
          'WhatsApp Business API account',
          'Phone number verified with Meta',
          'Access token and phone number ID'
        ]
      default:
        return []
    }
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        Service Integration
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Connect and manage your external service accounts for real-time data synchronization
      </Typography>

      {/* Service Health Overview */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <CloudDone color="primary" />
            <Typography variant="h6">Service Health Overview</Typography>
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary" sx={{ fontWeight: 700 }}>
                  {serviceHealth.totalServices || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Services
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main" sx={{ fontWeight: 700 }}>
                  {serviceHealth.connectedServices || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Connected
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main" sx={{ fontWeight: 700 }}>
                  {serviceHealth.readyServices || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Ready
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Individual Services */}
      <Grid container spacing={3}>
        {services.map(({ name, service, status }) => (
          <Grid item xs={12} md={6} lg={4} key={name}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  {getServiceIcon(name)}
                  <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    {name.charAt(0).toUpperCase() + name.slice(1)}
                  </Typography>
                  <Chip
                    icon={getServiceStatusIcon(status)}
                    label={getServiceStatusText(status)}
                    color={getServiceColor(status)}
                    size="small"
                  />
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {getServiceDescription(name)}
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Last Sync: {formatLastSync(status.lastSync)}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {status.isConnected ? (
                    <>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Sync />}
                        onClick={() => handleSyncService(name)}
                        disabled={isLoading}
                      >
                        Sync
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<LinkOff />}
                        onClick={() => handleDisconnectService(name)}
                        disabled={isLoading}
                        color="error"
                      >
                        Disconnect
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<Link />}
                      onClick={() => handleConnectService(name)}
                      disabled={isLoading}
                    >
                      Connect
                    </Button>
                  )}
                  
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Settings />}
                    onClick={() => handleTestService(name)}
                    disabled={isLoading}
                  >
                    Test
                  </Button>
                </Box>

                {/* Service Requirements */}
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    Requirements:
                  </Typography>
                  <List dense sx={{ py: 0 }}>
                    {getServiceRequirements(name).map((requirement, index) => (
                      <ListItem key={index} sx={{ py: 0, px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 20 }}>
                          <Info fontSize="small" color="action" />
                        </ListItemIcon>
                        <ListItemText
                          primary={requirement}
                          primaryTypographyProps={{ variant: 'caption' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Loading Overlay */}
      {isLoading && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <Box sx={{ textAlign: 'center', color: 'white' }}>
            <CircularProgress color="inherit" sx={{ mb: 2 }} />
            <Typography>Processing...</Typography>
          </Box>
        </Box>
      )}

      {/* Test Connection Dialog */}
      <Dialog open={testDialogOpen} onClose={() => setTestDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Test Service Connection
          {selectedService && (
            <Typography variant="subtitle2" color="text.secondary">
              Testing {selectedService} service
            </Typography>
          )}
        </DialogTitle>
        
        <DialogContent>
          {!testResult ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress />
              <Typography sx={{ mt: 2 }}>Testing connection...</Typography>
            </Box>
          ) : testResult.success ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Connection Test Successful!
              </Typography>
              <Typography variant="body2">
                The service is working correctly and responding to requests.
              </Typography>
            </Alert>
          ) : (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Connection Test Failed
              </Typography>
              <Typography variant="body2">
                {testResult.error}
              </Typography>
            </Alert>
          )}

          {testResult && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Test Details:
              </Typography>
              <pre style={{ 
                background: '#f5f5f5', 
                padding: '12px', 
                borderRadius: '4px',
                fontSize: '12px',
                overflow: 'auto'
              }}>
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default ServiceIntegration
