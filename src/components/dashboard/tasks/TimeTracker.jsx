import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  LinearProgress,
  Grid,
  useTheme,
} from '@mui/material'
import {
  PlayArrow,
  Pause,
  Stop,
  Timer,
  Schedule,
  TrendingUp,
  AccessTime,
} from '@mui/icons-material'

import toast from 'react-hot-toast'

const TimeTracker = ({ todos }) => {
  const theme = useTheme()
  
  // State for time tracking
  const [activeTask, setActiveTask] = useState(null)
  const [isTracking, setIsTracking] = useState(false)
  const [trackedTime, setTrackedTime] = useState(0)
  const [startTime, setStartTime] = useState(null)
  
  // Update tracked time every second
  useEffect(() => {
    let interval
    if (isTracking && startTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        setTrackedTime(elapsed)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isTracking, startTime])
  
  // Start tracking time for a task
  const startTracking = (task) => {
    if (activeTask && activeTask.id !== task.id) {
      toast.error('Please stop tracking the current task first')
      return
    }
    
    setActiveTask(task)
    setIsTracking(true)
    setStartTime(Date.now())
    setTrackedTime(0)
    toast.success(`Started tracking: ${task.title}`)
  }
  
  // Pause time tracking
  const pauseTracking = () => {
    setIsTracking(false)
    toast.info('Time tracking paused')
  }
  
  // Resume time tracking
  const resumeTracking = () => {
    setIsTracking(true)
    setStartTime(Date.now() - (trackedTime * 1000))
    toast.success('Time tracking resumed')
  }
  
  // Stop time tracking
  const stopTracking = () => {
    if (activeTask) {
      const totalTime = trackedTime + (activeTask.trackedTime || 0)
      toast.success(`Stopped tracking: ${activeTask.title} (Total: ${Math.floor(totalTime / 60)}m ${totalTime % 60}s)`)
    }
    
    setIsTracking(false)
    setActiveTask(null)
    setTrackedTime(0)
    setStartTime(null)
  }
  
  // Format time display
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }
  
  // Get tasks that can be tracked
  const trackableTasks = todos.filter(task => !task.completed)
  
  return (
    <Box sx={{ mb: 3 }}>
      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Timer color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Time Tracker
            </Typography>
            {activeTask && (
              <Chip
                label="Active"
                color="success"
                variant="outlined"
              />
            )}
          </Box>
          
          {/* Active Tracking Display */}
          {activeTask && (
            <div>
              <Card sx={{ 
                mb: 3, 
                bgcolor: 'primary.light', 
                color: 'primary.contrastText',
                borderRadius: 2
              }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Currently Tracking: {activeTask.title}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <AccessTime />
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {formatTime(trackedTime)}
                    </Typography>
                  </Box>
                  
                  <LinearProgress 
                    variant="determinate" 
                    value={(trackedTime / (activeTask.estimatedTime || 3600)) * 100} 
                    sx={{ 
                      height: 8, 
                      borderRadius: 4,
                      bgcolor: 'rgba(255,255,255,0.3)',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                        bgcolor: 'white'
                      }
                    }} 
                  />
                  
                  <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                    {isTracking ? (
                      <Button
                        variant="outlined"
                        startIcon={<Pause />}
                        onClick={pauseTracking}
                        sx={{ 
                          color: 'white', 
                          borderColor: 'white',
                          '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
                        }}
                      >
                        Pause
                      </Button>
                    ) : (
                      <Button
                        variant="outlined"
                        startIcon={<PlayArrow />}
                        onClick={resumeTracking}
                        sx={{ 
                          color: 'white', 
                          borderColor: 'white',
                          '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
                        }}
                      >
                        Resume
                      </Button>
                    )}
                    
                    <Button
                      variant="outlined"
                      startIcon={<Stop />}
                      onClick={stopTracking}
                      sx={{ 
                        color: 'white', 
                        borderColor: 'white',
                        '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
                      }}
                    >
                      Stop
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Task List */}
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Trackable Tasks ({trackableTasks.length})
          </Typography>
          
          {trackableTasks.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Schedule sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                No tasks available for tracking
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Complete some tasks or create new ones to start time tracking
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {trackableTasks.map((task) => (
                <Grid item xs={12} md={6} lg={4} key={task.id}>
                  <div>
                    <Card sx={{ 
                      borderRadius: 2,
                      border: activeTask?.id === task.id ? `2px solid ${theme.palette.primary.main}` : 'none',
                    }}>
                      <CardContent>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                          {task.title}
                        </Typography>
                        
                        {task.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {task.description}
                          </Typography>
                        )}
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                          <Chip
                            label={task.priority}
                            size="small"
                            color={
                              task.priority === 'high' ? 'error' :
                              task.priority === 'medium' ? 'warning' : 'success'
                            }
                            variant="outlined"
                          />
                          
                          {task.trackedTime > 0 && (
                            <Chip
                              icon={<AccessTime />}
                              label={`${Math.floor(task.trackedTime / 60)}m`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                        
                        <Button
                          fullWidth
                          variant={activeTask?.id === task.id ? 'contained' : 'outlined'}
                          startIcon={activeTask?.id === task.id ? <Pause /> : <PlayArrow />}
                          onClick={() => {
                            if (activeTask?.id === task.id) {
                              pauseTracking()
                            } else {
                              startTracking(task)
                            }
                          }}
                          disabled={activeTask && activeTask.id !== task.id}
                          sx={{ borderRadius: 2 }}
                        >
                          {activeTask?.id === task.id ? 'Pause' : 'Start Tracking'}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </Grid>
              ))}
            </Grid>
          )}
          
          {/* Time Tracking Tips */}
          <Box sx={{ mt: 4, p: 3, bgcolor: 'info.light', borderRadius: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'info.contrastText' }}>
              ⏱️ Time Tracking Tips
            </Typography>
            <Typography variant="body2" color="info.contrastText" sx={{ mb: 1 }}>
              • Track time for each task to understand your productivity patterns
            </Typography>
            <Typography variant="body2" color="info.contrastText" sx={{ mb: 1 }}>
              • Use the pause feature for breaks without losing track of time
            </Typography>
            <Typography variant="body2" color="info.contrastText" sx={{ mb: 1 }}>
              • Compare estimated vs actual time to improve future planning
            </Typography>
            <Typography variant="body2" color="info.contrastText">
              • Review your time data to identify your most productive hours
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}

export default TimeTracker
