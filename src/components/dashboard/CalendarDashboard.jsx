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
  Tooltip,
} from '@mui/material'
import {
  CalendarToday,
  Add,
  Search,
  FilterList,
  Edit,
  Delete,
  LocationOn,
  Schedule,
  Group,
  MoreVert,
  Close,
} from '@mui/icons-material'
import { format } from 'date-fns'
import {
  selectEvents,
  selectFilteredEvents,
  selectIsLoading,
  selectFilters,
  fetchCalendarEvents,
  addCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  setFilters,
} from '../../store/slices/calendarSlice'
import toast from 'react-hot-toast'

const CalendarDashboard = () => {
  const dispatch = useDispatch()
  const events = useSelector(selectEvents)
  const filteredEvents = useSelector(selectFilteredEvents)
  const isLoading = useSelector(selectIsLoading)
  const filters = useSelector(selectFilters)

  const [createEventOpen, setCreateEventOpen] = useState(false)
  const [editEventOpen, setEditEventOpen] = useState(false)
  const [currentEvent, setCurrentEvent] = useState(null)
  const [eventData, setEventData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    location: '',
    attendees: [],
    isAllDay: false,
    type: 'event',
    priority: 'medium',
  })

  useEffect(() => {
    // Always attempt to refresh from real Google Calendar when opening
    dispatch(fetchCalendarEvents())
  }, [dispatch])

  const handleCreateEvent = async (e) => {
    e.preventDefault()
    try {
      await dispatch(addCalendarEvent(eventData)).unwrap()
      toast.success('Event created successfully')
      setCreateEventOpen(false)
      setEventData({
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        location: '',
        attendees: [],
        isAllDay: false,
        type: 'event',
        priority: 'medium',
      })
    } catch (error) {
      toast.error('Failed to create event')
    }
  }

  const handleEditEvent = async (e) => {
    e.preventDefault()
    try {
      await dispatch(updateCalendarEvent({ ...currentEvent, ...eventData })).unwrap()
      toast.success('Event updated successfully')
      setEditEventOpen(false)
      setCurrentEvent(null)
    } catch (error) {
      toast.error('Failed to update event')
    }
  }

  const handleDeleteEvent = async (eventId) => {
    try {
      await dispatch(deleteCalendarEvent(eventId)).unwrap()
      toast.success('Event deleted successfully')
    } catch (error) {
      toast.error('Failed to delete event')
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

  const getEventTypeColor = (type) => {
    switch (type) {
      case 'meeting': return 'primary'
      case 'presentation': return 'secondary'
      case 'social': return 'success'
      case 'planning': return 'info'
      default: return 'default'
    }
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Calendar Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Organize your schedule with smart event management and AI-powered insights
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Events
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {events.length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                  <CalendarToday />
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
                    Today's Events
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {events.filter(event => {
                      const today = new Date()
                      const eventDate = new Date(event.startTime)
                      return eventDate.toDateString() === today.toDateString()
                    }).length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main', width: 56, height: 56 }}>
                  <Schedule />
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
                    High Priority
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {events.filter(event => event.priority === 'high').length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'error.main', width: 56, height: 56 }}>
                  <Typography variant="h6">!</Typography>
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
                    This Week
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {events.filter(event => {
                      const now = new Date()
                      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
                      const eventDate = new Date(event.startTime)
                      return eventDate >= now && eventDate <= weekFromNow
                    }).length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.main', width: 56, height: 56 }}>
                  <Typography variant="h6">7</Typography>
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Action Bar */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateEventOpen(true)}
        >
          Add Event
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<FilterList />}
        >
          Filters
        </Button>
      </Box>

      {/* Events List */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
            Upcoming Events ({filteredEvents.length})
          </Typography>
          
          {isLoading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography>Loading events...</Typography>
            </Box>
          ) : filteredEvents.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">No events found</Typography>
            </Box>
          ) : (
            <List>
              {filteredEvents.map((event, index) => (
                <React.Fragment key={event.id}>
                  <ListItem alignItems="flex-start">
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: event.color || 'primary.main' }}>
                        <CalendarToday />
                      </Avatar>
                    </ListItemAvatar>
                    
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {event.title}
                          </Typography>
                          
                          <Chip
                            label={event.type}
                            size="small"
                            color={getEventTypeColor(event.type)}
                            sx={{ textTransform: 'capitalize' }}
                          />
                          
                          <Chip
                            label={event.priority}
                            size="small"
                            color={getPriorityColor(event.priority)}
                            sx={{ textTransform: 'capitalize' }}
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            {event.description}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            📅 {format(new Date(event.startTime), 'MMM dd, yyyy HH:mm')} - {format(new Date(event.endTime), 'HH:mm')}
                          </Typography>
                          {event.location && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              📍 {event.location}
                            </Typography>
                          )}
                          {event.attendees.length > 0 && (
                            <Typography variant="body2" color="text.secondary">
                              👥 {event.attendees.length} attendees
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Edit event">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setCurrentEvent(event)
                            setEventData({
                              title: event.title,
                              description: event.description,
                              startTime: event.startTime,
                              endTime: event.endTime,
                              location: event.location,
                              attendees: event.attendees,
                              isAllDay: event.isAllDay,
                              type: event.type,
                              priority: event.priority,
                            })
                            setEditEventOpen(true)
                          }}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Delete event">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteEvent(event.id)}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                      
                      <IconButton size="small">
                        <MoreVert />
                      </IconButton>
                    </Box>
                  </ListItem>
                  
                  {index < filteredEvents.length - 1 && <Divider variant="inset" component="li" />}
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Create Event Dialog */}
      <Dialog
        open={createEventOpen}
        onClose={() => setCreateEventOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Create New Event</Typography>
            <IconButton onClick={() => setCreateEventOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <form onSubmit={handleCreateEvent}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Event Title"
                  value={eventData.title}
                  onChange={(e) => setEventData({ ...eventData, title: e.target.value })}
                  required
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  value={eventData.description}
                  onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Start Time"
                  type="datetime-local"
                  value={eventData.startTime}
                  onChange={(e) => setEventData({ ...eventData, startTime: e.target.value })}
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="End Time"
                  type="datetime-local"
                  value={eventData.endTime}
                  onChange={(e) => setEventData({ ...eventData, endTime: e.target.value })}
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Location"
                  value={eventData.location}
                  onChange={(e) => setEventData({ ...eventData, location: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Event Type</InputLabel>
                  <Select
                    value={eventData.type}
                    label="Event Type"
                    onChange={(e) => setEventData({ ...eventData, type: e.target.value })}
                  >
                    <MenuItem value="event">Event</MenuItem>
                    <MenuItem value="meeting">Meeting</MenuItem>
                    <MenuItem value="presentation">Presentation</MenuItem>
                    <MenuItem value="social">Social</MenuItem>
                    <MenuItem value="planning">Planning</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={eventData.priority}
                    label="Priority"
                    onChange={(e) => setEventData({ ...eventData, priority: e.target.value })}
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={eventData.isAllDay}
                      onChange={(e) => setEventData({ ...eventData, isAllDay: e.target.checked })}
                    />
                  }
                  label="All Day Event"
                />
              </Grid>
            </Grid>
          </DialogContent>
          
          <DialogActions>
            <Button onClick={() => setCreateEventOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" startIcon={<Add />}>
              Create Event
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog
        open={editEventOpen}
        onClose={() => setEditEventOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Edit Event</Typography>
            <IconButton onClick={() => setEditEventOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <form onSubmit={handleEditEvent}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Event Title"
                  value={eventData.title}
                  onChange={(e) => setEventData({ ...eventData, title: e.target.value })}
                  required
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  value={eventData.description}
                  onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Start Time"
                  type="datetime-local"
                  value={eventData.startTime}
                  onChange={(e) => setEventData({ ...eventData, startTime: e.target.value })}
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="End Time"
                  type="datetime-local"
                  value={eventData.endTime}
                  onChange={(e) => setEventData({ ...eventData, endTime: e.target.value })}
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Location"
                  value={eventData.location}
                  onChange={(e) => setEventData({ ...eventData, location: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Event Type</InputLabel>
                  <Select
                    value={eventData.type}
                    label="Event Type"
                    onChange={(e) => setEventData({ ...eventData, type: e.target.value })}
                  >
                    <MenuItem value="event">Event</MenuItem>
                    <MenuItem value="meeting">Meeting</MenuItem>
                    <MenuItem value="presentation">Presentation</MenuItem>
                    <MenuItem value="social">Social</MenuItem>
                    <MenuItem value="planning">Planning</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={eventData.priority}
                    label="Priority"
                    onChange={(e) => setEventData({ ...eventData, priority: e.target.value })}
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={eventData.isAllDay}
                      onChange={(e) => setEventData({ ...eventData, isAllDay: e.target.checked })}
                    />
                  }
                  label="All Day Event"
                />
              </Grid>
            </Grid>
          </DialogContent>
          
          <DialogActions>
            <Button onClick={() => setEditEventOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" startIcon={<Edit />}>
              Update Event
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  )
}

export default CalendarDashboard
