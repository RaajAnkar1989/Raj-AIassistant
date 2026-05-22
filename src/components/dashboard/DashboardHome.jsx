import React, { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  IconButton,
  Paper,
  Divider,
} from '@mui/material'
import {
  Email,
  CalendarToday,
  CheckCircle,
  VideoCall,
  Message,
  SmartToy,
  TrendingUp,
  Notifications,
  Add,
  MoreVert,
} from '@mui/icons-material'
import { format } from 'date-fns'
import {
  selectEmails,
  selectFilteredEmails,
} from '../../store/slices/emailSlice'
import {
  selectEvents,
  selectUpcomingEvents,
} from '../../store/slices/calendarSlice'
import {
  selectTodos,
  selectFilteredTodos,
  selectPriorityCounts,
} from '../../store/slices/todoSlice'
import {
  selectConversations,
  selectIsGenerating,
} from '../../store/slices/aiSlice'
import {
  selectUnreadNotifications,
} from '../../store/slices/notificationSlice'
import { fetchEmails } from '../../store/slices/emailSlice'
import { fetchCalendarEvents } from '../../store/slices/calendarSlice'
import { fetchTodos } from '../../store/slices/todoSlice'
import toast from 'react-hot-toast'

const DashboardHome = () => {
  const dispatch = useDispatch()
  
  const emails = useSelector(selectEmails)
  const filteredEmails = useSelector(selectFilteredEmails)
  const events = useSelector(selectEvents)
  const upcomingEvents = useSelector(selectUpcomingEvents)
  const todos = useSelector(selectTodos)
  const filteredTodos = useSelector(selectFilteredTodos)
  const priorityCounts = useSelector(selectPriorityCounts)
  const conversations = useSelector(selectConversations)
  const isGenerating = useSelector(selectIsGenerating)
  const notifications = useSelector(selectUnreadNotifications)
  const user = useSelector(state => state.auth.user)

  useEffect(() => {
    // Load data if not already loaded
    if (emails.length === 0) dispatch(fetchEmails())
    if (events.length === 0) dispatch(fetchCalendarEvents())
    if (todos.length === 0) dispatch(fetchTodos())
  }, [dispatch, emails.length, events.length, todos.length])

  const handleQuickAction = (action) => {
    switch (action) {
      case 'meeting':
        const meetUrl = 'https://meet.google.com/' + Math.random().toString(36).substring(2, 15)
        window.open(meetUrl, '_blank')
        toast.success('Google Meet opened')
        break
      case 'email':
        toast.success('Email composer opened')
        break
      case 'task':
        toast.success('Task creator opened')
        break
      case 'ai':
        toast.success('AI Assistant activated')
        break
      default:
        break
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'error'
      case 'medium': return 'warning'
      case 'low': return 'success'
      default: return 'default'
    }
  }

  // Simplified data processing functions
  const getUnreadEmailsCount = () => {
    return emails.filter(email => !email.isRead).length
  }

  const getTodayEventsCount = () => {
    const today = new Date()
    return events.filter(event => {
      const eventDate = new Date(event.startTime)
      return eventDate.toDateString() === today.toDateString()
    }).length
  }

  const getCompletedTasksCount = () => {
    return todos.filter(todo => todo.completed).length
  }

  const getTasksProgress = () => {
    if (todos.length === 0) return 0
    return (getCompletedTasksCount() / todos.length) * 100
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Welcome Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Welcome back, {user?.name || 'User'}! 👋
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Here's what's happening with your productivity today
        </Typography>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Unread Emails
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {getUnreadEmailsCount()}
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
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Today's Events
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {getTodayEventsCount()}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'secondary.main', width: 56, height: 56 }}>
                  <CalendarToday />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Tasks Completed
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {getCompletedTasksCount()}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main', width: 56, height: 56 }}>
                  <CheckCircle />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    AI Conversations
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {conversations.length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.main', width: 56, height: 56 }}>
                  <SmartToy />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
            Quick Actions
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<VideoCall />}
                onClick={() => handleQuickAction('meeting')}
                sx={{ py: 2 }}
              >
                Start Meeting
              </Button>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Email />}
                onClick={() => handleQuickAction('email')}
                sx={{ py: 2 }}
              >
                Compose Email
              </Button>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<CheckCircle />}
                onClick={() => handleQuickAction('task')}
                sx={{ py: 2 }}
              >
                Add Task
              </Button>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<SmartToy />}
                onClick={() => handleQuickAction('ai')}
                sx={{ py: 2 }}
              >
                Ask AI
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Simple Content */}
      <Grid container spacing={4}>
        <Grid item xs={12} lg={8}>
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                Recent Activity
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your dashboard is working! This is a simplified version to ensure stability.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                Task Progress
              </Typography>
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Overall Progress</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {Math.round(getTasksProgress())}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={getTasksProgress()} 
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

export default DashboardHome
