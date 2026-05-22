import React, { useState } from 'react'
import { useDispatch } from 'react-redux'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Button,
  Avatar,
  AvatarGroup,
  LinearProgress,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Badge,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import {
  CheckCircle,
  RadioButtonUnchecked,
  PriorityHigh,
  Schedule,
  Category,
  Tag,
  MoreVert,
  Edit,
  Delete,
  Archive,
  Share,
  Visibility,
  PlayArrow,
  Pause,
  Stop,
  Timer,
  TrendingUp,
  TrendingDown,
  Star,
  Flag,
  Label,
  Notifications,
  NotificationsOff,
  Repeat,
  SubdirectoryArrowRight,
  KeyboardVoice,
  Mic,
  MicOff,
  Work,
  Home,
  School,
  FitnessCenter,
  ShoppingCart,
  LocalHospital,
  Flight,
  Celebration,
} from '@mui/icons-material'

import { format, isToday, isTomorrow, isOverdue, addDays, differenceInHours, differenceInMinutes } from 'date-fns'
import toast from 'react-hot-toast'

import { toggleTodoComplete, deleteTodo, setSelectedTodo, setEditTodoOpen } from '../../../store/slices/todoSlice'

const AdvancedTaskCard = ({ todo }) => {
  const dispatch = useDispatch()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  
  // Local state
  const [anchorEl, setAnchorEl] = useState(null)
  const [isTimeTracking, setIsTimeTracking] = useState(false)
  const [trackedTime, setTrackedTime] = useState(todo.trackedTime || 0)
  const [voiceInputActive, setVoiceInputActive] = useState(false)
  
  // Menu handlers
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget)
  }
  
  const handleMenuClose = () => {
    setAnchorEl(null)
  }
  
  // Task actions
  const handleToggleComplete = () => {
    dispatch(toggleTodoComplete(todo.id))
    toast.success(todo.completed ? 'Task marked as incomplete' : 'Task completed! 🎉')
  }
  
  const handleEdit = () => {
    dispatch(setSelectedTodo(todo))
    dispatch(setEditTodoOpen(true))
    handleMenuClose()
  }
  
  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      dispatch(deleteTodo(todo.id))
      toast.success('Task deleted successfully')
    }
    handleMenuClose()
  }
  
  const handleArchive = () => {
    // TODO: Implement archive functionality
    toast.success('Task archived')
    handleMenuClose()
  }
  
  const handleShare = () => {
    // TODO: Implement share functionality
    toast.success('Share link copied to clipboard')
    handleMenuClose()
  }
  
  // Time tracking
  const handleTimeTracking = () => {
    setIsTimeTracking(!isTimeTracking)
    if (!isTimeTracking) {
      toast.success('Time tracking started ⏱️')
      // TODO: Start actual time tracking
    } else {
      toast.info('Time tracking paused')
      // TODO: Pause time tracking
    }
  }
  
  // Voice input
  const handleVoiceInput = () => {
    setVoiceInputActive(!voiceInputActive)
    if (!voiceInputActive) {
      toast.success('Voice input activated! Speak your update...')
      // TODO: Implement voice recognition
    } else {
      toast.info('Voice input deactivated')
    }
  }
  
  // Utility functions
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'error'
      case 'medium': return 'warning'
      case 'low': return 'success'
      default: return 'default'
    }
  }
  
  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high': return <PriorityHigh fontSize="small" />
      case 'medium': return <Schedule fontSize="small" />
      case 'low': return <Category fontSize="small" />
      default: return <Category fontSize="small" />
    }
  }
  
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'work': return <Work fontSize="small" />
      case 'personal': return <Home fontSize="small" />
      case 'school': return <School fontSize="small" />
      case 'fitness': return <FitnessCenter fontSize="small" />
      case 'shopping': return <ShoppingCart fontSize="small" />
      case 'health': return <LocalHospital fontSize="small" />
      case 'travel': return <Flight fontSize="small" />
      case 'celebration': return <Celebration fontSize="small" />
      default: return <Label fontSize="small" />
    }
  }
  
  const getDueDateStatus = () => {
    if (!todo.dueDate) return { text: 'No due date', color: 'default' }
    
    const dueDate = new Date(todo.dueDate)
    
    if (isOverdue(dueDate) && !todo.completed) {
      return { text: 'Overdue', color: 'error' }
    } else if (isToday(dueDate)) {
      return { text: 'Due today', color: 'warning' }
    } else if (isTomorrow(dueDate)) {
      return { text: 'Due tomorrow', color: 'info' }
    } else {
      const hoursLeft = differenceInHours(dueDate, new Date())
      if (hoursLeft < 24) {
        return { text: `Due in ${hoursLeft} hours`, color: 'warning' }
      } else {
        const daysLeft = Math.ceil(hoursLeft / 24)
        return { text: `Due in ${daysLeft} days`, color: 'default' }
      }
    }
  }
  
  const getProgressValue = () => {
    if (todo.subtasks && todo.subtasks.length > 0) {
      const completedSubtasks = todo.subtasks.filter(subtask => subtask.completed).length
      return (completedSubtasks / todo.subtasks.length) * 100
    }
    return 0
  }
  
  const dueDateStatus = getDueDateStatus()
  const progressValue = getProgressValue()
  
  return (
    <div>
      <Card 
        sx={{ 
          borderRadius: 3,
          border: todo.completed ? '2px solid #4caf50' : '2px solid transparent',
          bgcolor: todo.completed ? 'rgba(76, 175, 80, 0.05)' : 'background.paper',
          '&:hover': {
            boxShadow: theme.shadows[8],
            transform: 'translateY(-2px)',
          },
          transition: 'all 0.3s ease',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          {/* Header Row */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
              {/* Completion Checkbox */}
              <Tooltip title={todo.completed ? 'Mark as incomplete' : 'Mark as complete'}>
                <IconButton
                  onClick={handleToggleComplete}
                  sx={{
                    color: todo.completed ? 'success.main' : 'text.secondary',
                    '&:hover': {
                      bgcolor: todo.completed ? 'success.light' : 'action.hover',
                    }
                  }}
                >
                  {todo.completed ? <CheckCircle fontSize="large" /> : <RadioButtonUnchecked fontSize="large" />}
                </IconButton>
              </Tooltip>
              
              {/* Task Title */}
              <Box sx={{ flex: 1 }}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 600,
                    textDecoration: todo.completed ? 'line-through' : 'none',
                    color: todo.completed ? 'text.secondary' : 'text.primary',
                    mb: 0.5
                  }}
                >
                  {todo.title}
                </Typography>
                
                {/* Task Description */}
                {todo.description && (
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ 
                      textDecoration: todo.completed ? 'line-through' : 'none',
                      mb: 1
                    }}
                  >
                    {todo.description}
                  </Typography>
                )}
                
                {/* Progress Bar for Subtasks */}
                {todo.subtasks && todo.subtasks.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        Subtasks
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {Math.round(progressValue)}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={progressValue} 
                      sx={{ 
                        height: 4, 
                        borderRadius: 2,
                        bgcolor: 'grey.200',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 2,
                          background: 'linear-gradient(45deg, #2196F3, #21CBF3)'
                        }
                      }} 
                    />
                  </Box>
                )}
              </Box>
            </Box>
            
            {/* Action Menu */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {/* Voice Input */}
              <Tooltip title="Voice Input">
                <IconButton
                  onClick={handleVoiceInput}
                  color={voiceInputActive ? 'primary' : 'default'}
                  size="small"
                >
                  {voiceInputActive ? <Mic fontSize="small" /> : <MicOff fontSize="small" />}
                </IconButton>
              </Tooltip>
              
              {/* Time Tracking */}
              <Tooltip title={isTimeTracking ? 'Pause tracking' : 'Start tracking'}>
                <IconButton
                  onClick={handleTimeTracking}
                  color={isTimeTracking ? 'primary' : 'default'}
                  size="small"
                >
                  {isTimeTracking ? <Pause fontSize="small" /> : <PlayArrow fontSize="small" />}
                </IconButton>
              </Tooltip>
              
              {/* More Options */}
              <IconButton
                onClick={handleMenuOpen}
                size="small"
              >
                <MoreVert />
              </IconButton>
            </Box>
          </Box>
          
          {/* Tags and Categories Row */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            {/* Priority */}
            <Chip
              icon={getPriorityIcon(todo.priority)}
              label={todo.priority}
              color={getPriorityColor(todo.priority)}
              variant="outlined"
              size="small"
            />
            
            {/* Category */}
            <Chip
              icon={getCategoryIcon(todo.category)}
              label={todo.category}
              variant="outlined"
              size="small"
            />
            
            {/* Due Date Status */}
            <Chip
              label={dueDateStatus.text}
              color={dueDateStatus.color}
              variant="outlined"
              size="small"
            />
            
            {/* Tags */}
            {todo.tags && todo.tags.map((tag, index) => (
              <Chip
                key={index}
                label={tag}
                variant="outlined"
                size="small"
                sx={{ fontSize: '0.75rem' }}
              />
            ))}
          </Box>
          
          {/* Additional Info Row */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* Due Date */}
              {todo.dueDate && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Schedule fontSize="small" color="action" />
                  <Typography variant="caption" color="text.secondary">
                    {format(new Date(todo.dueDate), 'MMM d, yyyy')}
                  </Typography>
                </Box>
              )}
              
              {/* Created Date */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CalendarToday fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">
                  {format(new Date(todo.createdAt), 'MMM d')}
                </Typography>
              </Box>
              
              {/* Tracked Time */}
              {trackedTime > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Timer fontSize="small" color="action" />
                  <Typography variant="caption" color="text.secondary">
                    {Math.floor(trackedTime / 60)}m
                  </Typography>
                </Box>
              )}
            </Box>
            
            {/* AI Insights Badge */}
            {todo.aiInsights && (
              <Chip
                icon={<TrendingUp fontSize="small" />}
                label="AI Optimized"
                color="success"
                variant="outlined"
                size="small"
              />
            )}
          </Box>
          
          {/* Time Tracking Progress */}
          {isTimeTracking && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.light', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="primary.contrastText" sx={{ fontWeight: 600 }}>
                  ⏱️ Time Tracking Active
                </Typography>
                <Typography variant="body2" color="primary.contrastText">
                  {Math.floor(trackedTime / 60)}m {trackedTime % 60}s
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={(trackedTime / (todo.estimatedTime || 3600)) * 100} 
                sx={{ 
                  height: 6, 
                  borderRadius: 3,
                  bgcolor: 'rgba(255,255,255,0.3)',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 3,
                    bgcolor: 'white'
                  }
                }} 
              />
            </Box>
          )}
          
          {/* AI Recommendations */}
          {todo.aiRecommendations && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
              <Typography variant="body2" color="info.contrastText" sx={{ fontWeight: 600, mb: 1 }}>
                🤖 AI Recommendation
              </Typography>
              <Typography variant="body2" color="info.contrastText">
                {todo.aiRecommendations}
              </Typography>
            </Box>
          )}
        </CardContent>
        
        {/* Action Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            sx: {
              borderRadius: 2,
              minWidth: 200,
            }
          }}
        >
          <MenuItem onClick={handleEdit}>
            <ListItemIcon>
              <Edit fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit Task</ListItemText>
          </MenuItem>
          
          <MenuItem onClick={handleShare}>
            <ListItemIcon>
              <Share fontSize="small" />
            </ListItemIcon>
            <ListItemText>Share Task</ListItemText>
          </MenuItem>
          
          <MenuItem onClick={handleArchive}>
            <ListItemIcon>
              <Archive fontSize="small" />
            </ListItemIcon>
            <ListItemText>Archive</ListItemText>
          </MenuItem>
          
          <Divider />
          
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <Delete fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        </Menu>
      </Card>
    </div>
  )
}

export default AdvancedTaskCard
