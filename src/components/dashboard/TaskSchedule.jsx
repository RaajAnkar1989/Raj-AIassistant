import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Tooltip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Menu,
  ListItemIcon,
  Switch,
  Alert,
  LinearProgress,
} from '@mui/material'
import {
  Add,
  Edit,
  Delete,
  Schedule,
  CheckCircle,
  RadioButtonUnchecked,
  NotificationsActive,
  ExpandMore,
  Snooze,
  Repeat,
  SubdirectoryArrowRight,
  Mic,
  MicOff,
  KeyboardVoice,
  Refresh,
  MoreVert,
  Alarm,
  CalendarToday,
  AccessTime,
} from '@mui/icons-material'
import {
  fetchTodos,
  addTodo,
  updateTodo,
  deleteTodo,
  toggleTodoComplete,
  selectTodos,
  selectIsLoading,
} from '../../store/slices/todoSlice'
import { speakText } from '../../store/slices/voiceSlice'
import { format, addDays, addWeeks, addMonths, addYears, parseISO, isAfter, isBefore, startOfDay } from 'date-fns'
import toast from 'react-hot-toast'

// Natural language parser for task creation
const parseNaturalLanguage = (text) => {
  const result = {
    title: text,
    dueDate: null,
    priority: 'medium',
    recurring: null,
    snooze: null,
  }

  // Date parsing patterns
  const datePatterns = [
    { regex: /tomorrow/i, fn: () => addDays(new Date(), 1) },
    { regex: /next week/i, fn: () => addWeeks(new Date(), 1) },
    { regex: /next month/i, fn: () => addMonths(new Date(), 1) },
    { regex: /in (\d+) days?/i, fn: (match) => addDays(new Date(), parseInt(match[1])) },
    { regex: /in (\d+) weeks?/i, fn: (match) => addWeeks(new Date(), parseInt(match[1])) },
    { regex: /in (\d+) months?/i, fn: (match) => addMonths(new Date(), parseInt(match[1])) },
    { regex: /(\d{1,2}):(\d{2})\s*(am|pm)?/i, fn: (match) => {
      const now = new Date()
      const hours = parseInt(match[1]) + (match[3]?.toLowerCase() === 'pm' && match[1] !== '12' ? 12 : 0)
      now.setHours(hours, parseInt(match[2]), 0, 0)
      return now
    }},
  ]

  // Priority patterns
  const priorityPatterns = [
    { regex: /urgent|asap|critical/i, priority: 'high' },
    { regex: /low priority|not urgent/i, priority: 'low' },
  ]

  // Recurring patterns
  const recurringPatterns = [
    { regex: /daily|every day/i, recurring: 'daily' },
    { regex: /weekly|every week/i, recurring: 'weekly' },
    { regex: /monthly|every month/i, recurring: 'monthly' },
    { regex: /yearly|every year/i, recurring: 'yearly' },
  ]

  // Apply patterns
  for (const pattern of datePatterns) {
    const match = text.match(pattern.regex)
    if (match) {
      result.dueDate = pattern.fn(match)
      result.title = text.replace(pattern.regex, '').trim()
    }
  }

  for (const pattern of priorityPatterns) {
    if (pattern.regex.test(text)) {
      result.priority = pattern.priority
      result.title = text.replace(pattern.regex, '').trim()
    }
  }

  for (const pattern of recurringPatterns) {
    if (pattern.regex.test(text)) {
      result.recurring = pattern.recurring
      result.title = text.replace(pattern.regex, '').trim()
    }
  }

  return result
}

const TaskSchedule = () => {
  const dispatch = useDispatch()
  const todos = useSelector(selectTodos)
  const isLoading = useSelector(selectIsLoading)

  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [current, setCurrent] = useState(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [notifyEnabled, setNotifyEnabled] = useState(false)
  const [voiceInput, setVoiceInput] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [anchorEl, setAnchorEl] = useState(null)
  const [selectedTaskForMenu, setSelectedTaskForMenu] = useState(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    category: 'personal',
    remind: true,
    recurring: null,
    snooze: null,
    subTasks: [],
    tags: [],
  })

  useEffect(() => {
    dispatch(fetchTodos())
  }, [dispatch])

  // Process recurring tasks every hour
  useEffect(() => {
    const processRecurring = () => {
      const now = new Date()
      const currentTodos = todos.filter(t => t.recurring && t.completed && t.dueDate)
      
      for (const todo of currentTodos) {
        const dueDate = new Date(todo.dueDate)
        if (dueDate < now) {
          // Create next occurrence
          let nextDueDate = new Date(dueDate)
          switch (todo.recurring) {
            case 'daily':
              nextDueDate.setDate(nextDueDate.getDate() + 1)
              break
            case 'weekly':
              nextDueDate.setDate(nextDueDate.getDate() + 7)
              break
            case 'monthly':
              nextDueDate.setMonth(nextDueDate.getMonth() + 1)
              break
            case 'yearly':
              nextDueDate.setFullYear(nextDueDate.getFullYear() + 1)
              break
          }
          
          const newTodo = {
            ...todo,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            completed: false,
            dueDate: nextDueDate.toISOString(),
            createdAt: new Date().toISOString(),
          }
          
          dispatch(addTodo(newTodo))
        }
      }
    }
    
    const interval = setInterval(processRecurring, 60 * 60 * 1000) // Every hour
    processRecurring() // Run once on mount
    
    return () => clearInterval(interval)
  }, [todos, dispatch])

  // Browser notifications permission
  useEffect(() => {
    if (!('Notification' in window)) return
    if (Notification.permission === 'granted') setNotifyEnabled(true)
  }, [])

  const requestNotifications = async () => {
    try {
      if (!('Notification' in window)) {
        toast.error('Notifications not supported')
        return
      }
      const result = await Notification.requestPermission()
      setNotifyEnabled(result === 'granted')
      if (result === 'granted') toast.success('Reminders enabled')
    } catch {}
  }

  // Voice recognition setup
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Voice recognition not supported')
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setVoiceInput(transcript)
      handleVoiceInput(transcript)
    }
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
    }

    return () => recognition.abort()
  }, [])

  const handleVoiceInput = (transcript) => {
    const parsed = parseNaturalLanguage(transcript)
    setForm(prev => ({
      ...prev,
      ...parsed,
      dueDate: parsed.dueDate ? parsed.dueDate.toISOString().substring(0, 16) : '',
    }))
    setCreateOpen(true)
    toast.success(`Voice input: "${transcript}"`)
  }

  const startVoiceInput = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      recognition.start()
    }
  }

  // Reminder ticker with snooze support
  useEffect(() => {
    const alertedKey = 'task_alerted_ids'
    const snoozedKey = 'task_snoozed_ids'
    
    const getAlerted = () => {
      try { return JSON.parse(localStorage.getItem(alertedKey) || '[]') } catch { return [] }
    }
    const setAlerted = (ids) => {
      try { localStorage.setItem(alertedKey, JSON.stringify(ids)) } catch {}
    }
    const getSnoozed = () => {
      try { return JSON.parse(localStorage.getItem(snoozedKey) || '{}') } catch { return {} }
    }
    
    const tick = async () => {
      const now = Date.now()
      const alerted = new Set(getAlerted())
      const snoozed = getSnoozed()
      
      for (const t of todos) {
        if (!t || !t.dueDate || t.completed || !t.remind) continue
        
        const due = new Date(t.dueDate).getTime()
        const snoozeUntil = snoozed[t.id] || 0
        
        if (due <= now && now >= snoozeUntil && !alerted.has(t.id)) {
          // Notify
          if (notifyEnabled && 'Notification' in window && Notification.permission === 'granted') {
            try { 
              new Notification('Task due', { 
                body: t.title,
                icon: '/favicon.ico',
                requireInteraction: true
              }) 
            } catch {}
          }
          try { await dispatch(speakText(`Reminder. ${t.title} is due now.`)) } catch {}
          alerted.add(t.id)
          setAlerted(Array.from(alerted))
        }
      }
    }
    
    const id = setInterval(tick, 60000)
    tick()
    return () => clearInterval(id)
  }, [todos, notifyEnabled, dispatch])

  const displayed = useMemo(() => {
    const todayStart = startOfDay(new Date())
    const todayEnd = new Date(todayStart)
    todayEnd.setHours(23, 59, 59, 999)
    
    return todos
      .filter(t => {
        if (query && !(`${t.title} ${t.description}`.toLowerCase().includes(query.toLowerCase()))) {
          return false
        }
        if (filter === 'completed' && !t.completed) return false
        if (filter === 'pending' && t.completed) return false
        if (filter === 'today' && t.dueDate) {
          const d = new Date(t.dueDate)
          if (!(d >= todayStart && d <= todayEnd)) return false
        }
        if (filter === 'upcoming' && t.dueDate) {
          const d = new Date(t.dueDate)
          if (!(d > todayEnd)) return false
        }
        if (filter === 'overdue' && t.dueDate) {
          const d = new Date(t.dueDate)
          if (!(d < todayStart) || t.completed) return false
        }
        if (filter === 'recurring' && !t.recurring) return false
        return true
      })
      .sort((a, b) => {
        const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity
        const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity
        return da - db
      })
  }, [todos, query, filter])

  const openCreate = () => {
    setForm({ 
      title: '', 
      description: '', 
      priority: 'medium', 
      dueDate: '', 
      category: 'personal', 
      remind: true,
      recurring: null,
      snooze: null,
      subTasks: [],
      tags: []
    })
    setCreateOpen(true)
  }

  const saveCreate = async () => {
    if (!form.title) { toast.error('Title required'); return }
    
    const taskData = { ...form }
    if (taskData.dueDate) {
      taskData.dueDate = new Date(taskData.dueDate).toISOString()
    }
    
    await dispatch(addTodo(taskData))
    setCreateOpen(false)
    toast.success('Task created')
  }

  const openEdit = (t) => {
    setCurrent(t)
    setForm({ 
      title: t.title, 
      description: t.description, 
      priority: t.priority, 
      dueDate: t.dueDate ? t.dueDate.substring(0, 16) : '', 
      category: t.category || 'personal', 
      remind: t.remind !== false,
      recurring: t.recurring || null,
      snooze: t.snooze || null,
      subTasks: t.subTasks || [],
      tags: t.tags || []
    })
    setEditOpen(true)
  }

  const saveEdit = async () => {
    if (!current) return
    
    const taskData = { ...form }
    if (taskData.dueDate) {
      taskData.dueDate = new Date(taskData.dueDate).toISOString()
    }
    
    await dispatch(updateTodo({ id: current.id, ...taskData }))
    setEditOpen(false)
    toast.success('Task updated')
  }

  const removeTask = async (id) => {
    await dispatch(deleteTodo(id))
    toast.success('Task deleted')
  }

  const toggleComplete = async (id) => {
    await dispatch(toggleTodoComplete(id))
  }

  const snoozeTask = async (task, minutes) => {
    const snoozeTime = Date.now() + (minutes * 60 * 1000)
    const snoozed = JSON.parse(localStorage.getItem('task_snoozed_ids') || '{}')
    snoozed[task.id] = snoozeTime
    localStorage.setItem('task_snoozed_ids', JSON.stringify(snoozed))
    
    toast.success(`Task snoozed for ${minutes} minutes`)
    setAnchorEl(null)
  }

  const addSubTask = (taskId) => {
    const newSubTask = {
      id: Date.now().toString(),
      title: 'New sub-task',
      completed: false
    }
    
    const updatedTask = todos.find(t => t.id === taskId)
    if (updatedTask) {
      const newSubTasks = [...(updatedTask.subTasks || []), newSubTask]
      dispatch(updateTodo({ id: taskId, subTasks: newSubTasks }))
    }
  }

  const toggleSubTask = async (taskId, subTaskId) => {
    const updatedTask = todos.find(t => t.id === taskId)
    if (updatedTask) {
      const newSubTasks = (updatedTask.subTasks || []).map(st => 
        st.id === subTaskId ? { ...st, completed: !st.completed } : st
      )
      await dispatch(updateTodo({ id: taskId, subTasks: newSubTasks }))
    }
  }

  const priorityColor = (p) => p === 'high' ? 'error' : p === 'low' ? 'default' : 'warning'

  const getRecurringText = (recurring) => {
    if (!recurring) return null
    const icons = { daily: '🔄', weekly: '📅', monthly: '📆', yearly: '🎯' }
    return `${icons[recurring]} ${recurring}`
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>Task Schedule</Typography>
          <Typography variant="body1" color="text.secondary">Create, schedule, and get reminded of tasks effortlessly</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button 
            variant="outlined" 
            startIcon={isListening ? <MicOff /> : <Mic />}
            onClick={startVoiceInput}
            color={isListening ? 'error' : 'primary'}
            data-voice-input="true"
          >
            {isListening ? 'Listening...' : 'Voice Input'}
          </Button>
          <Button variant="outlined" startIcon={<NotificationsActive />} onClick={requestNotifications} disabled={notifyEnabled}>
            {notifyEnabled ? 'Reminders On' : 'Enable Reminders'}
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}>New Task</Button>
        </Box>
      </Box>

      {voiceInput && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Voice input: "{voiceInput}" - Parsed and ready to create task
        </Alert>
      )}

      {/* Task Statistics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h4" color="primary" sx={{ fontWeight: 700 }}>
              {todos.filter(t => !t.completed).length}
            </Typography>
            <Typography variant="body2" color="text.secondary">Active Tasks</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h4" color="error" sx={{ fontWeight: 700 }}>
              {todos.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && !t.completed).length}
            </Typography>
            <Typography variant="body2" color="text.secondary">Overdue</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h4" color="info" sx={{ fontWeight: 700 }}>
              {todos.filter(t => t.recurring).length}
            </Typography>
            <Typography variant="body2" color="text.secondary">Recurring</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h4" color="success" sx={{ fontWeight: 700 }}>
              {todos.filter(t => t.completed).length}
            </Typography>
            <Typography variant="body2" color="text.secondary">Completed</Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Task Creation */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Quick Task</Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <TextField 
                fullWidth 
                placeholder="Type a quick task (e.g., 'Call John tomorrow 2pm urgent')" 
                value={query} 
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && query.trim()) {
                    const parsed = parseNaturalLanguage(query)
                    setForm(prev => ({
                      ...prev,
                      ...parsed,
                      dueDate: parsed.dueDate ? parsed.dueDate.toISOString().substring(0, 16) : '',
                    }))
                    setCreateOpen(true)
                    setQuery('')
                  }
                }}
                InputProps={{
                  startAdornment: <KeyboardVoice sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Button 
                fullWidth 
                variant="outlined" 
                onClick={() => {
                  if (query.trim()) {
                    const parsed = parseNaturalLanguage(query)
                    setForm(prev => ({
                      ...prev,
                      ...parsed,
                      dueDate: parsed.dueDate ? parsed.dueDate.toISOString().substring(0, 16) : '',
                    }))
                    setCreateOpen(true)
                    setQuery('')
                  }
                }}
                disabled={!query.trim()}
              >
                Create Task
              </Button>
            </Grid>
          </Grid>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            💡 Try: "Buy groceries tomorrow 6pm", "Weekly team meeting every Monday 9am", "Call dentist urgent"
          </Typography>
        </CardContent>
      </Card>

      {/* Task Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Filters</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {['all', 'today', 'upcoming', 'overdue', 'pending', 'completed', 'recurring'].map(f => (
              <Chip 
                key={f} 
                label={f} 
                variant={filter === f ? 'filled' : 'outlined'} 
                color={filter === f ? 'primary' : 'default'} 
                onClick={() => setFilter(f)} 
                sx={{ textTransform: 'capitalize' }} 
              />
            ))}
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Tasks ({displayed.length})</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {filter !== 'all' && (
                <Chip 
                  label={`${filter} filter active`} 
                  color="primary" 
                  variant="outlined" 
                  size="small"
                />
              )}
              {query && (
                <Chip 
                  label={`Search: "${query}"`} 
                  color="secondary" 
                  variant="outlined" 
                  size="small"
                  onDelete={() => setQuery('')}
                />
              )}
            </Box>
          </Box>
          {isLoading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}><LinearProgress /></Box>
          ) : displayed.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}><Typography color="text.secondary">No tasks</Typography></Box>
          ) : (
            <List>
              {displayed.map((t, idx) => (
                <React.Fragment key={t.id}>
                  <ListItem alignItems="flex-start">
                    <IconButton onClick={() => toggleComplete(t.id)} sx={{ mr: 1 }}>
                      {t.completed ? <CheckCircle color="success" /> : <RadioButtonUnchecked />}
                    </IconButton>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, textDecoration: t.completed ? 'line-through' : 'none' }}>
                            {t.title}
                          </Typography>
                          <Chip size="small" label={t.priority} color={priorityColor(t.priority)} sx={{ textTransform: 'capitalize' }} />
                          {t.recurring && (
                            <Chip size="small" label={getRecurringText(t.recurring)} color="info" />
                          )}
                          {t.dueDate && (
                            <Chip 
                              size="small" 
                              icon={<Schedule />} 
                              label={format(new Date(t.dueDate), 'MMM dd, yyyy HH:mm')} 
                              color={isBefore(new Date(t.dueDate), new Date()) ? 'error' : 'default'}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {t.description}
                          </Typography>
                          {t.subTasks && t.subTasks.length > 0 && (
                            <Box sx={{ ml: 2 }}>
                              {t.subTasks.map(st => (
                                <Box key={st.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                  <Checkbox
                                    size="small"
                                    checked={st.completed}
                                    onChange={() => toggleSubTask(t.id, st.id)}
                                  />
                                  <Typography 
                                    variant="body2" 
                                    sx={{ textDecoration: st.completed ? 'line-through' : 'none' }}
                                  >
                                    {st.title}
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="More options">
                        <IconButton 
                          onClick={(e) => {
                            setSelectedTaskForMenu(t)
                            setAnchorEl(e.currentTarget)
                          }}
                        >
                          <MoreVert />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {idx < displayed.length - 1 && <Divider component="li" />}
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Task Options Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        {selectedTaskForMenu && (
          <>
            <MenuItem onClick={() => { openEdit(selectedTaskForMenu); setAnchorEl(null) }}>
              <ListItemIcon><Edit fontSize="small" /></ListItemIcon>
              Edit Task
            </MenuItem>
            <MenuItem onClick={() => { addSubTask(selectedTaskForMenu.id); setAnchorEl(null) }}>
              <ListItemIcon><SubdirectoryArrowRight fontSize="small" /></ListItemIcon>
              Add Sub-task
            </MenuItem>
            <MenuItem onClick={() => snoozeTask(selectedTaskForMenu, 15)}>
              <ListItemIcon><Snooze fontSize="small" /></ListItemIcon>
              Snooze 15 min
            </MenuItem>
            <MenuItem onClick={() => snoozeTask(selectedTaskForMenu, 60)}>
              <ListItemIcon><Snooze fontSize="small" /></ListItemIcon>
              Snooze 1 hour
            </MenuItem>
            <MenuItem onClick={() => snoozeTask(selectedTaskForMenu, 1440)}>
              <ListItemIcon><Snooze fontSize="small" /></ListItemIcon>
              Snooze 1 day
            </MenuItem>
            <Divider />
            <MenuItem 
              onClick={() => { removeTask(selectedTaskForMenu.id); setAnchorEl(null) }}
              sx={{ color: 'error.main' }}
            >
              <ListItemIcon><Delete fontSize="small" color="error" /></ListItemIcon>
              Delete Task
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>New Task</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'grid', gap: 2 }}>
            <TextField 
              label="Title" 
              value={form.title} 
              onChange={(e) => setForm({ ...form, title: e.target.value })} 
              fullWidth 
            />
            <TextField 
              label="Description" 
              value={form.description} 
              onChange={(e) => setForm({ ...form, description: e.target.value })} 
              fullWidth 
              multiline 
              rows={3} 
            />
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select value={form.priority} label="Priority" onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select value={form.category} label="Category" onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    <MenuItem value="personal">Personal</MenuItem>
                    <MenuItem value="work">Work</MenuItem>
                    <MenuItem value="health">Health</MenuItem>
                    <MenuItem value="finance">Finance</MenuItem>
                    <MenuItem value="learning">Learning</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField 
                  label="Due date & time" 
                  type="datetime-local" 
                  value={form.dueDate} 
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })} 
                  fullWidth 
                  InputLabelProps={{ shrink: true }} 
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Recurring</InputLabel>
                  <Select value={form.recurring || ''} label="Recurring" onChange={(e) => setForm({ ...form, recurring: e.target.value || null })}>
                    <MenuItem value="">No Recurring</MenuItem>
                    <MenuItem value="daily">Daily</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                    <MenuItem value="yearly">Yearly</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <FormControlLabel 
              control={<Checkbox checked={form.remind} onChange={(e) => setForm({ ...form, remind: e.target.checked })} />} 
              label="Remind me at due time" 
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveCreate}>Create</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Task</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'grid', gap: 2 }}>
            <TextField 
              label="Title" 
              value={form.title} 
              onChange={(e) => setForm({ ...form, title: e.target.value })} 
              fullWidth 
            />
            <TextField 
              label="Description" 
              value={form.description} 
              onChange={(e) => setForm({ ...form, description: e.target.value })} 
              fullWidth 
              multiline 
              rows={3} 
            />
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select value={form.priority} label="Priority" onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select value={form.category} label="Category" onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    <MenuItem value="personal">Personal</MenuItem>
                    <MenuItem value="work">Work</MenuItem>
                    <MenuItem value="health">Health</MenuItem>
                    <MenuItem value="finance">Finance</MenuItem>
                    <MenuItem value="learning">Learning</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField 
                  label="Due date & time" 
                  type="datetime-local" 
                  value={form.dueDate} 
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })} 
                  fullWidth 
                  InputLabelProps={{ shrink: true }} 
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Recurring</InputLabel>
                  <Select value={form.recurring || ''} label="Recurring" onChange={(e) => setForm({ ...form, recurring: e.target.value || null })}>
                    <MenuItem value="">No Recurring</MenuItem>
                    <MenuItem value="daily">Daily</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                    <MenuItem value="yearly">Yearly</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <FormControlLabel 
              control={<Checkbox checked={form.remind} onChange={(e) => setForm({ ...form, remind: e.target.checked })} />} 
              label="Remind me at due time" 
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveEdit}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default TaskSchedule


