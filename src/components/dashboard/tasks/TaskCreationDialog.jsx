import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  FormHelperText,
  Switch,
  FormControlLabel,
  Slider,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Divider,
  Alert,
  LinearProgress,
  useTheme,
} from '@mui/material'
import {
  Close,
  Add,
  Delete,
  Schedule,
  PriorityHigh,
  Category,
  Tag,
  Timer,
  Psychology,
  AutoAwesome,
  TrendingUp,
  CalendarToday,
  Notifications,
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
  Star,
  Flag,
  Label,
} from '@mui/icons-material'

import { format, addDays, addHours } from 'date-fns'
import toast from 'react-hot-toast'

import { addTodo, setCreateTodoOpen, selectCreateTodoOpen } from '../../../store/slices/todoSlice'

const TaskCreationDialog = () => {
  const dispatch = useDispatch()
  const theme = useTheme()
  const open = useSelector(selectCreateTodoOpen)
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: 'personal',
    dueDate: '',
    dueTime: '',
    estimatedTime: 60, // minutes
    tags: [],
    subtasks: [],
    recurring: false,
    recurringPattern: 'daily',
    notifications: true,
    aiOptimization: true,
    estimatedDifficulty: 3,
    dependencies: [],
    attachments: [],
    notes: '',
  })
  
  // UI state
  const [currentTag, setCurrentTag] = useState('')
  const [currentSubtask, setCurrentSubtask] = useState('')
  const [voiceInputActive, setVoiceInputActive] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState([])
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false)
  
  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      resetForm()
      generateAiSuggestions()
    }
  }, [open])
  
  // Reset form to initial state
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      category: 'personal',
      dueDate: '',
      dueTime: '',
      estimatedTime: 60,
      tags: [],
      subtasks: [],
      recurring: false,
      recurringPattern: 'daily',
      notifications: true,
      aiOptimization: true,
      estimatedDifficulty: 3,
      dependencies: [],
      attachments: [],
      notes: '',
    })
    setCurrentTag('')
    setCurrentSubtask('')
    setAiSuggestions([])
  }
  
  // Handle form field changes
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }
  
  // Handle tag management
  const handleAddTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      handleFieldChange('tags', [...formData.tags, currentTag.trim()])
      setCurrentTag('')
    }
  }
  
  const handleRemoveTag = (tagToRemove) => {
    handleFieldChange('tags', formData.tags.filter(tag => tag !== tagToRemove))
  }
  
  // Handle subtask management
  const handleAddSubtask = () => {
    if (currentSubtask.trim()) {
      const newSubtask = {
        id: Date.now().toString(),
        title: currentSubtask.trim(),
        completed: false,
        estimatedTime: 15, // default 15 minutes
      }
      handleFieldChange('subtasks', [...formData.subtasks, newSubtask])
      setCurrentSubtask('')
    }
  }
  
  const handleRemoveSubtask = (subtaskId) => {
    handleFieldChange('subtasks', formData.subtasks.filter(subtask => subtask.id !== subtaskId))
  }
  
  const handleSubtaskChange = (subtaskId, field, value) => {
    handleFieldChange('subtasks', formData.subtasks.map(subtask => 
      subtask.id === subtaskId ? { ...subtask, [field]: value } : subtask
    ))
  }
  
  // Handle voice input
  const handleVoiceInput = () => {
    setVoiceInputActive(!voiceInputActive)
    if (!voiceInputActive) {
      toast.success('Voice input activated! Speak your task details...')
      // TODO: Implement voice recognition
    } else {
      toast.info('Voice input deactivated')
    }
  }
  
  // Generate AI suggestions
  const generateAiSuggestions = async () => {
    setIsGeneratingSuggestions(true)
    
    // Simulate AI processing
    setTimeout(() => {
      const suggestions = [
        {
          type: 'priority',
          suggestion: 'Consider setting this as high priority due to upcoming deadline',
          confidence: 0.85
        },
        {
          type: 'category',
          suggestion: 'This task fits well in the "Work" category',
          confidence: 0.78
        },
        {
          type: 'time',
          suggestion: 'Based on similar tasks, this might take 2-3 hours',
          confidence: 0.72
        },
        {
          type: 'tags',
          suggestion: 'Suggested tags: project, deadline, collaboration',
          confidence: 0.68
        }
      ]
      setAiSuggestions(suggestions)
      setIsGeneratingSuggestions(false)
    }, 1500)
  }
  
  // Apply AI suggestion
  const applySuggestion = (suggestion) => {
    switch (suggestion.type) {
      case 'priority':
        handleFieldChange('priority', 'high')
        break
      case 'category':
        handleFieldChange('category', 'work')
        break
      case 'time':
        handleFieldChange('estimatedTime', 180) // 3 hours
        break
      case 'tags':
        const newTags = ['project', 'deadline', 'collaboration']
        handleFieldChange('tags', [...formData.tags, ...newTags.filter(tag => !formData.tags.includes(tag))])
        break
      default:
        break
    }
    toast.success('AI suggestion applied!')
  }
  
  // Handle form submission
  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a task title')
      return
    }
    
    try {
      const taskData = {
        ...formData,
        dueDate: formData.dueDate && formData.dueTime 
          ? new Date(`${formData.dueDate}T${formData.dueTime}`).toISOString()
          : formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
        estimatedTime: formData.estimatedTime * 60, // convert to seconds
        createdAt: new Date().toISOString(),
        completed: false,
        aiInsights: formData.aiOptimization,
        aiRecommendations: aiSuggestions.length > 0 ? aiSuggestions[0].suggestion : null,
      }
      
      await dispatch(addTodo(taskData)).unwrap()
      toast.success('Task created successfully! 🎉')
      dispatch(setCreateTodoOpen(false))
    } catch (error) {
      toast.error('Failed to create task')
    }
  }
  
  // Handle dialog close
  const handleClose = () => {
    dispatch(setCreateTodoOpen(false))
  }
  
  // Quick due date presets
  const quickDueDates = [
    { label: 'Today', value: format(new Date(), 'yyyy-MM-dd') },
    { label: 'Tomorrow', value: format(addDays(new Date(), 1), 'yyyy-MM-dd') },
    { label: 'Next Week', value: format(addDays(new Date(), 7), 'yyyy-MM-dd') },
    { label: 'Next Month', value: format(addDays(new Date(), 30), 'yyyy-MM-dd') },
  ]
  
  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          minHeight: '80vh'
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Create New Task
            </Typography>
            {formData.aiOptimization && (
              <Chip
                icon={<AutoAwesome />}
                label="AI Optimized"
                color="primary"
                size="small"
              />
            )}
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Voice Input">
              <IconButton
                onClick={handleVoiceInput}
                color={voiceInputActive ? 'primary' : 'default'}
                size="small"
              >
                {voiceInputActive ? <Mic /> : <MicOff />}
              </IconButton>
            </Tooltip>
            
            <IconButton onClick={handleClose} size="small">
              <Close />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Grid container spacing={3}>
          {/* Main Task Details */}
          <Grid item xs={12} md={8}>
            {/* Basic Information */}
            <Card sx={{ mb: 3, borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Basic Information
                </Typography>
                
                <TextField
                  fullWidth
                  label="Task Title"
                  value={formData.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  placeholder="What needs to be done?"
                  sx={{ mb: 2 }}
                  required
                />
                
                <TextField
                  fullWidth
                  label="Description"
                  value={formData.description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  placeholder="Add more details about this task..."
                  multiline
                  rows={3}
                  sx={{ mb: 2 }}
                />
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Priority</InputLabel>
                      <Select
                        value={formData.priority}
                        onChange={(e) => handleFieldChange('priority', e.target.value)}
                        label="Priority"
                      >
                        <MenuItem value="low">Low</MenuItem>
                        <MenuItem value="medium">Medium</MenuItem>
                        <MenuItem value="high">High</MenuItem>
                        <MenuItem value="urgent">Urgent</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Category</InputLabel>
                      <Select
                        value={formData.category}
                        onChange={(e) => handleFieldChange('category', e.target.value)}
                        label="Category"
                      >
                        <MenuItem value="work">Work</MenuItem>
                        <MenuItem value="personal">Personal</MenuItem>
                        <MenuItem value="school">School</MenuItem>
                        <MenuItem value="fitness">Fitness</MenuItem>
                        <MenuItem value="shopping">Shopping</MenuItem>
                        <MenuItem value="health">Health</MenuItem>
                        <MenuItem value="travel">Travel</MenuItem>
                        <MenuItem value="celebration">Celebration</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
            
            {/* Due Date and Time */}
            <Card sx={{ mb: 3, borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Due Date & Time
                </Typography>
                
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="Due Date"
                      value={formData.dueDate}
                      onChange={(e) => handleFieldChange('dueDate', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="time"
                      label="Due Time"
                      value={formData.dueTime}
                      onChange={(e) => handleFieldChange('dueTime', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                </Grid>
                
                {/* Quick Due Date Presets */}
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {quickDueDates.map((preset) => (
                    <Chip
                      key={preset.label}
                      label={preset.label}
                      variant="outlined"
                      size="small"
                      onClick={() => handleFieldChange('dueDate', preset.value)}
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
            
            {/* Subtasks */}
            <Card sx={{ mb: 3, borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Subtasks
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField
                    fullWidth
                    label="Add Subtask"
                    value={currentSubtask}
                    onChange={(e) => setCurrentSubtask(e.target.value)}
                    placeholder="Enter a subtask..."
                    size="small"
                  />
                  <Button
                    variant="contained"
                    onClick={handleAddSubtask}
                    startIcon={<Add />}
                    sx={{ minWidth: 'auto', px: 2 }}
                  >
                    Add
                  </Button>
                </Box>
                
                <div>
                  {formData.subtasks.map((subtask) => (
                    <div
                      key={subtask.id}
                    >
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 2, 
                        p: 1.5, 
                        bgcolor: 'grey.50', 
                        borderRadius: 1,
                        mb: 1
                      }}>
                        <SubdirectoryArrowRight color="action" />
                        <TextField
                          fullWidth
                          value={subtask.title}
                          onChange={(e) => handleSubtaskChange(subtask.id, 'title', e.target.value)}
                          size="small"
                          variant="standard"
                        />
                        <TextField
                          type="number"
                          label="Est. Time (min)"
                          value={subtask.estimatedTime}
                          onChange={(e) => handleSubtaskChange(subtask.id, 'estimatedTime', parseInt(e.target.value) || 0)}
                          size="small"
                          sx={{ width: 120 }}
                        />
                        <IconButton
                          onClick={() => handleRemoveSubtask(subtask.id)}
                          size="small"
                          color="error"
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Tags */}
            <Card sx={{ mb: 3, borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Tags
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField
                    fullWidth
                    label="Add Tag"
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    placeholder="Enter a tag..."
                    size="small"
                  />
                  <Button
                    variant="outlined"
                    onClick={handleAddTag}
                    startIcon={<Add />}
                    sx={{ minWidth: 'auto', px: 2 }}
                  >
                    Add
                  </Button>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {formData.tags.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      onDelete={() => handleRemoveTag(tag)}
                      variant="outlined"
                      size="small"
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Sidebar - Advanced Options */}
          <Grid item xs={12} md={4}>
            {/* AI Suggestions */}
            <Card sx={{ mb: 3, borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Psychology color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    AI Suggestions
                  </Typography>
                </Box>
                
                {isGeneratingSuggestions ? (
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <LinearProgress sx={{ mb: 2 }} />
                    <Typography variant="body2" color="text.secondary">
                      Generating AI insights...
                    </Typography>
                  </Box>
                ) : aiSuggestions.length > 0 ? (
                  <Box>
                    {aiSuggestions.map((suggestion, index) => (
                      <Alert
                        key={index}
                        severity="info"
                        sx={{ mb: 1 }}
                        action={
                          <Button
                            size="small"
                            onClick={() => applySuggestion(suggestion)}
                            sx={{ minWidth: 'auto' }}
                          >
                            Apply
                          </Button>
                        }
                      >
                        <Typography variant="body2">
                          {suggestion.suggestion}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Confidence: {Math.round(suggestion.confidence * 100)}%
                        </Typography>
                      </Alert>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    No AI suggestions yet
                  </Typography>
                )}
              </CardContent>
            </Card>
            
            {/* Time Estimation */}
            <Card sx={{ mb: 3, borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Time Estimation
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Estimated Time: {formData.estimatedTime} minutes
                  </Typography>
                  <Slider
                    value={formData.estimatedTime}
                    onChange={(e, value) => handleFieldChange('estimatedTime', value)}
                    min={15}
                    max={480}
                    step={15}
                    marks={[
                      { value: 15, label: '15m' },
                      { value: 60, label: '1h' },
                      { value: 240, label: '4h' },
                      { value: 480, label: '8h' }
                    ]}
                    valueLabelDisplay="auto"
                  />
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Difficulty Level: {formData.estimatedDifficulty}/5
                  </Typography>
                  <Slider
                    value={formData.estimatedDifficulty}
                    onChange={(e, value) => handleFieldChange('estimatedDifficulty', value)}
                    min={1}
                    max={5}
                    step={1}
                    marks
                    valueLabelDisplay="auto"
                  />
                </Box>
              </CardContent>
            </Card>
            
            {/* Advanced Options */}
            <Card sx={{ mb: 3, borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Advanced Options
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.recurring}
                      onChange={(e) => handleFieldChange('recurring', e.target.checked)}
                    />
                  }
                  label="Recurring Task"
                  sx={{ mb: 1 }}
                />
                
                {formData.recurring && (
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Recurring Pattern</InputLabel>
                    <Select
                      value={formData.recurringPattern}
                      onChange={(e) => handleFieldChange('recurringPattern', e.target.value)}
                      label="Recurring Pattern"
                      size="small"
                    >
                      <MenuItem value="daily">Daily</MenuItem>
                      <MenuItem value="weekly">Weekly</MenuItem>
                      <MenuItem value="monthly">Monthly</MenuItem>
                      <MenuItem value="yearly">Yearly</MenuItem>
                    </Select>
                  </FormControl>
                )}
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.notifications}
                      onChange={(e) => handleFieldChange('notifications', e.target.checked)}
                    />
                  }
                  label="Enable Notifications"
                  sx={{ mb: 1 }}
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.aiOptimization}
                      onChange={(e) => handleFieldChange('aiOptimization', e.target.checked)}
                    />
                  }
                  label="AI Optimization"
                  sx={{ mb: 1 }}
                />
              </CardContent>
            </Card>
            
            {/* Notes */}
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Additional Notes
                </Typography>
                
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  placeholder="Add any additional notes or context..."
                  value={formData.notes}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions sx={{ p: 3, gap: 2 }}>
        <Button onClick={handleClose} variant="outlined">
          Cancel
        </Button>
        
        <Button
          onClick={handleSubmit}
          variant="contained"
          startIcon={<Add />}
          sx={{
            background: 'linear-gradient(45deg, #2196F3, #21CBF3)',
            '&:hover': {
              background: 'linear-gradient(45deg, #1976D2, #1E88E5)'
            }
          }}
        >
          Create Task
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default TaskCreationDialog
