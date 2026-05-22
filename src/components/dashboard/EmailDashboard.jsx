import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Divider,
  Badge,
  Tooltip,
  Alert,
} from '@mui/material'
import {
  Email,
  Search,
  FilterList,
  Add,
  Reply,
  Forward,
  Delete,
  Star,
  StarBorder,
  MarkEmailRead,
  MarkEmailUnread,
  MoreVert,
  Send,
  Close,
  AttachFile,
  Link,
  CloudOff,
} from '@mui/icons-material'
import { format } from 'date-fns'
import {
  selectEmails,
  selectFilteredEmails,
  selectIsLoading,
  selectFilters,
  selectSearchQuery,
  fetchEmails,
  markEmailAsRead,
  markEmailAsImportant,
  setFilters,
  setSearchQuery,
  setComposeOpen,
  setCurrentEmail,
} from '../../store/slices/emailSlice'
import {
  analyzeEmailContent,
  selectCurrentAnalysis,
  selectIsGenerating,
} from '../../store/slices/aiSlice'
import toast from 'react-hot-toast'
import SimpleGmailConnection from '../SimpleGmailConnection'
import gisGmailService from '../../services/gisGmailService'

const EmailDashboard = () => {
  const dispatch = useDispatch()
  const emails = useSelector(selectEmails)
  const filteredEmails = useSelector(selectFilteredEmails)
  const isLoading = useSelector(selectIsLoading)
  const filters = useSelector(selectFilters)
  const searchQuery = useSelector(selectSearchQuery)
  const currentAnalysis = useSelector(selectCurrentAnalysis)
  const isGenerating = useSelector(selectIsGenerating)

  const [selectedEmails, setSelectedEmails] = useState([])
  const [composeOpen, setComposeOpen] = useState(false)
  const [emailDetailOpen, setEmailDetailOpen] = useState(false)
  const [currentEmail, setCurrentEmail] = useState(null)
  const [loadingFullBody, setLoadingFullBody] = useState(false)
  const [fullBodyError, setFullBodyError] = useState('')
  const [composeData, setComposeData] = useState({
    to: '',
    subject: '',
    body: '',
  })
  const [gmailConnectionOpen, setGmailConnectionOpen] = useState(false)
  const [isGmailConnected, setIsGmailConnected] = useState(false)
  const [searchText, setSearchText] = useState('')

  useEffect(() => {
    const refresh = async () => {
      try {
        // Try silent token refresh; if it works, fetch real emails
        await gisGmailService.ensureAccessToken({ allowInteractive: false })
        setIsGmailConnected(true)
      } catch (e) {
        setIsGmailConnected(false)
      }
      const todaysMode = typeof window !== 'undefined' ? sessionStorage.getItem('email_todays_mode') : null
      const storedQuery = typeof window !== 'undefined' ? sessionStorage.getItem('email_query') : null
      if (todaysMode === '1') {
        // Gmail supports newer_than:1d and newer_than:0d isn't valid, so use after: today as date
        const today = new Date()
        const yyyy = today.getFullYear()
        const mm = String(today.getMonth() + 1).padStart(2, '0')
        const dd = String(today.getDate()).padStart(2, '0')
        const after = `${yyyy}/${mm}/${dd}`
        const q = `after:${after}`
        setSearchText(q)
        dispatch(fetchEmails(q))
      } else if (storedQuery) {
        setSearchText(storedQuery)
        dispatch(fetchEmails(storedQuery))
      } else {
        dispatch(fetchEmails())
      }
    }
    refresh()
  }, [dispatch])

  // Keep local searchText in sync on mount
  useEffect(() => {
    setSearchText(searchQuery || '')
  }, [])

  // Wire search to real Gmail when connected; otherwise update local filtering
  useEffect(() => {
    const handler = setTimeout(() => {
      if (isGmailConnected) {
        dispatch(fetchEmails(searchText || ''))
      } else {
        dispatch(setSearchQuery(searchText || ''))
      }
    }, 400)
    return () => clearTimeout(handler)
  }, [searchText, isGmailConnected, dispatch])

  const handleEmailClick = (email) => {
    setCurrentEmail(email)
    setEmailDetailOpen(true)
    if (!email.isRead) {
      dispatch(markEmailAsRead(email.id))
    }
  }

  const decodeBase64Url = (data) => {
    try {
      const base64 = data.replace(/-/g, '+').replace(/_/g, '/')
      const decoded = atob(base64)
      try { return decodeURIComponent(escape(decoded)) } catch { return decoded }
    } catch { return '' }
  }

  const extractBodyFromPayload = (payload) => {
    if (!payload) return ''
    if (payload.body && payload.body.data) return decodeBase64Url(payload.body.data)
    if (payload.parts && Array.isArray(payload.parts)) {
      const textPart = payload.parts.find(p => p.mimeType === 'text/plain' && p.body && p.body.data)
      if (textPart) return decodeBase64Url(textPart.body.data)
      const htmlPart = payload.parts.find(p => p.mimeType === 'text/html' && p.body && p.body.data)
      if (htmlPart) return decodeBase64Url(htmlPart.body.data)
    }
    return ''
  }

  const loadFullEmailBody = async () => {
    if (!currentEmail) return
    setLoadingFullBody(true)
    setFullBodyError('')
    try {
      // Ask for consent with full gmail.readonly scope if needed
      await gisGmailService.requestAccessToken([
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.metadata',
      ], { prompt: 'consent' })
      const message = await gisGmailService.getMessage(currentEmail.id)
      const body = extractBodyFromPayload(message.payload)
      const headers = message.payload?.headers || []
      const headerVal = (name) => {
        const h = headers.find(h => h.name === name)
        return h ? h.value : ''
      }
      setCurrentEmail(prev => ({
        ...prev,
        from: headerVal('From') || prev?.from,
        to: headerVal('To') || prev?.to,
        subject: headerVal('Subject') || prev?.subject,
        timestamp: message.internalDate ? new Date(parseInt(message.internalDate, 10)).toISOString() : prev?.timestamp,
        body: body || prev?.body || '(No content)'
      }))
      toast.success('Loaded full email')
    } catch (e) {
      setFullBodyError('Unable to load full content. Permission may be limited.')
      toast.error('Could not load full content')
    } finally {
      setLoadingFullBody(false)
    }
  }

  const handleMarkAsRead = (emailId) => {
    dispatch(markEmailAsRead(emailId))
  }

  const handleMarkAsImportant = (emailId) => {
    dispatch(markEmailAsImportant(emailId))
  }

  const handleAnalyzeEmail = async (email) => {
    try {
      await dispatch(analyzeEmailContent(email.body)).unwrap()
      toast.success('Email analyzed successfully')
    } catch (error) {
      toast.error('Failed to analyze email')
    }
  }

  const handleComposeSubmit = (e) => {
    e.preventDefault()
    dispatch(sendEmail({ to: composeData.to, subject: composeData.subject, body: composeData.body }))
      .unwrap()
      .then(() => {
        toast.success('Email sent')
        setComposeOpen(false)
        setComposeData({ to: '', subject: '', body: '' })
      })
      .catch(() => toast.error('Failed to send'))
  }

  const handleFilterChange = (filterType, value) => {
    if (filterType === 'labels') {
      const newLabels = filters.labels.includes(value)
        ? filters.labels.filter(label => label !== value)
        : [...filters.labels, value]
      dispatch(setFilters({ labels: newLabels }))
    } else {
      dispatch(setFilters({ [filterType]: value }))
    }
  }

  // Apply filters client-side when using Gmail results
  const applyFilters = (email) => {
    if (filters.unread && email.isRead) return false
    if (filters.important && !email.isImportant) return false
    if (filters.priority !== 'all' && email.priority !== filters.priority) return false
    if (filters.labels.length > 0 && !(email.labels || []).some(l => filters.labels.includes(l))) return false
    return true
  }

  const displayedEmails = isGmailConnected ? emails.filter(applyFilters) : filteredEmails

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'error'
      case 'medium': return 'warning'
      case 'low': return 'success'
      default: return 'default'
    }
  }

  const getUnreadCount = () => emails.filter(email => !email.isRead).length
  const getImportantCount = () => emails.filter(email => email.isImportant).length

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              Email Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your emails with AI-powered insights and smart organization
            </Typography>
          </Box>
          
          {/* Gmail Connection Button */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {isGmailConnected ? (
              <Chip
                icon={<Email color="success" />}
                label="Gmail Connected"
                color="success"
                variant="outlined"
                onClick={() => setGmailConnectionOpen(true)}
                sx={{ cursor: 'pointer' }}
              />
            ) : (
              <Button
                variant="outlined"
                startIcon={<Link />}
                onClick={() => setGmailConnectionOpen(true)}
                color="primary"
              >
                Connect Gmail
              </Button>
            )}
          </Box>
        </Box>
        
        {/* Gmail Connection Alert */}
        {!isGmailConnected && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Tip:</strong> Connect your Gmail account to access real emails instead of sample data. 
              Click "Connect Gmail" to get started.
            </Typography>
          </Alert>
        )}
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Emails
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {emails.length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                  <Email />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Unread
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {getUnreadCount()}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.main', width: 56, height: 56 }}>
                  <MarkEmailUnread />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Important
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {getImportantCount()}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'error.main', width: 56, height: 56 }}>
                  <Star />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    AI Analysis
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {currentAnalysis ? 'Ready' : 'Available'}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.main', width: 56, height: 56 }}>
                  <Typography variant="h6">AI</Typography>
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filters */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder={isGmailConnected ? 'Search Gmail (from:, subject:, has:attachment, newer_than:7d)...' : 'Search emails...'}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={filters.priority}
                    label="Priority"
                    onChange={(e) => handleFilterChange('priority', e.target.value)}
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="low">Low</MenuItem>
                  </Select>
                </FormControl>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={filters.unread}
                      onChange={(e) => handleFilterChange('unread', e.target.checked)}
                    />
                  }
                  label="Unread only"
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={filters.important}
                      onChange={(e) => handleFilterChange('important', e.target.checked)}
                    />
                  }
                  label="Important only"
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Action Bar */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setComposeOpen(true)}
        >
          Compose Email
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<FilterList />}
        >
          Advanced Filters
        </Button>
      </Box>

      {/* Email List */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
            Emails ({(isGmailConnected ? displayedEmails : filteredEmails).length})
          </Typography>
          
          {isLoading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography>Loading emails...</Typography>
            </Box>
          ) : filteredEmails.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">No emails found</Typography>
            </Box>
          ) : (
            <List>
              {(isGmailConnected ? displayedEmails : filteredEmails).map((email, index) => (
                <React.Fragment key={email.id}>
                  <ListItem
                    alignItems="flex-start"
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                      bgcolor: email.isRead ? 'transparent' : 'action.selected',
                    }}
                    onClick={() => handleEmailClick(email)}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: email.isImportant ? 'error.main' : 'grey.300' }}>
                        {email.from.charAt(0).toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography
                            variant="subtitle1"
                            sx={{
                              fontWeight: email.isRead ? 400 : 600,
                              color: email.isRead ? 'text.primary' : 'text.primary',
                            }}
                          >
                            {email.subject}
                          </Typography>
                          
                          {email.isImportant && (
                            <Chip label="Important" size="small" color="error" />
                          )}
                          
                          {!email.isRead && (
                            <Chip label="New" size="small" color="primary" />
                          )}
                          
                          <Chip
                            label={email.priority}
                            size="small"
                            color={getPriorityColor(email.priority)}
                            sx={{ textTransform: 'capitalize' }}
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            From: {email.from}
                          </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                {email.body && email.body.length > 0
                  ? (email.body.length > 100 ? email.body.substring(0, 100) + '...' : email.body)
                  : email.snippet || ''}
              </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {format(new Date(email.timestamp), 'MMM dd, yyyy HH:mm')}
                          </Typography>
                        </Box>
                      }
                    />
                    
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Mark as read/unread">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMarkAsRead(email.id)
                          }}
                        >
                          {email.isRead ? <MarkEmailUnread /> : <MarkEmailRead />}
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Mark as important">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMarkAsImportant(email.id)
                          }}
                        >
                          {email.isImportant ? <Star color="error" /> : <StarBorder />}
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="AI Analysis">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAnalyzeEmail(email)
                          }}
                          disabled={isGenerating}
                        >
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>AI</Typography>
                        </IconButton>
                      </Tooltip>
                      
                      <IconButton size="small">
                        <MoreVert />
                      </IconButton>
                    </Box>
                  </ListItem>
                  
                  {index < (isGmailConnected ? displayedEmails : filteredEmails).length - 1 && <Divider variant="inset" component="li" />}
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* AI Analysis Results */}
      {currentAnalysis && (
        <Card sx={{ mt: 4 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              AI Email Analysis
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Summary
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {currentAnalysis.summary}
                </Typography>
                
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Priority
                </Typography>
                <Chip
                  label={currentAnalysis.priority}
                  color={getPriorityColor(currentAnalysis.priority)}
                  sx={{ textTransform: 'capitalize', mb: 2 }}
                />
                
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Sentiment
                </Typography>
                <Chip
                  label={currentAnalysis.sentiment}
                  color={currentAnalysis.sentiment === 'positive' ? 'success' : 'default'}
                  sx={{ textTransform: 'capitalize' }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Suggested Response
                </Typography>
                <Typography variant="body2" sx={{ mb: 2, fontStyle: 'italic' }}>
                  {currentAnalysis.suggestedResponse}
                </Typography>
                
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Keywords
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {currentAnalysis.keywords.map((keyword, index) => (
                    <Chip key={index} label={keyword} size="small" variant="outlined" />
                  ))}
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Compose Email Dialog */}
      <Dialog
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Compose Email</Typography>
            <IconButton onClick={() => setComposeOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <form onSubmit={handleComposeSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="To"
                  value={composeData.to}
                  onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
                  required
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Subject"
                  value={composeData.subject}
                  onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                  required
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Message"
                  multiline
                  rows={6}
                  value={composeData.body}
                  onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                  required
                />
              </Grid>
            </Grid>
          </DialogContent>
          
          <DialogActions>
            <Button startIcon={<AttachFile />}>
              Attach
            </Button>
            <Button onClick={() => setComposeOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" startIcon={<Send />}>
              Send
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Email Detail Dialog */}
      <Dialog
        open={emailDetailOpen}
        onClose={() => setEmailDetailOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">{currentEmail?.subject}</Typography>
            <IconButton onClick={() => setEmailDetailOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {currentEmail && (
            <Box>
              <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  From: {currentEmail.from}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  To: {currentEmail.to}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Date: {format(new Date(currentEmail.timestamp), 'PPP p')}
                </Typography>
              </Box>
              
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {currentEmail.body}
              </Typography>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button startIcon={<Reply />}>
            Reply
          </Button>
          <Button startIcon={<Forward />}>
            Forward
          </Button>
          <Button startIcon={<Delete />} color="error">
            Delete
          </Button>
          {isGmailConnected && currentEmail && (!currentEmail.body || currentEmail.body.length < 20) && (
            <Button onClick={loadFullEmailBody} disabled={loadingFullBody}>
              {loadingFullBody ? 'Loading…' : 'Load full content'}
            </Button>
          )}
          {currentEmail && (
            <Button component="a" href={`https://mail.google.com/mail/u/0/#inbox/${currentEmail.id}`} target="_blank" rel="noreferrer">
              Open in Gmail
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Gmail Connection Dialog */}
      <SimpleGmailConnection
        open={gmailConnectionOpen}
        onClose={() => setGmailConnectionOpen(false)}
        onConnectionChange={setIsGmailConnected}
      />
    </Box>
  )
}

export default EmailDashboard
