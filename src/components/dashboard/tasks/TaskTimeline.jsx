import React from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  useTheme,
} from '@mui/material'
import {
  Timeline,
  Schedule,
  CheckCircle,
  PendingActions,
} from '@mui/icons-material'

import { format, isToday, isTomorrow, isOverdue } from 'date-fns'

const TaskTimeline = ({ todos }) => {
  const theme = useTheme()
  
  // Group tasks by date
  const groupTasksByDate = () => {
    const grouped = {}
    
    todos.forEach(todo => {
      if (todo.dueDate) {
        const date = new Date(todo.dueDate)
        const dateKey = format(date, 'yyyy-MM-dd')
        
        if (!grouped[dateKey]) {
          grouped[dateKey] = []
        }
        grouped[dateKey].push(todo)
      }
    })
    
    // Sort dates
    return Object.keys(grouped)
      .sort()
      .reduce((obj, key) => {
        obj[key] = grouped[key]
        return obj
      }, {})
  }
  
  const groupedTasks = groupTasksByDate()
  
  const getDateLabel = (dateStr) => {
    const date = new Date(dateStr)
    
    if (isToday(date)) return 'Today'
    if (isTomorrow(date)) return 'Tomorrow'
    if (isOverdue(date)) return 'Overdue'
    
    return format(date, 'MMM d, yyyy')
  }
  
  const getDateColor = (dateStr) => {
    const date = new Date(dateStr)
    
    if (isOverdue(date)) return 'error'
    if (isToday(date)) return 'warning'
    if (isTomorrow(date)) return 'info'
    
    return 'default'
  }
  
  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
        Task Timeline
      </Typography>
      
      {Object.keys(groupedTasks).length === 0 ? (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Timeline sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              No tasks with due dates
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add due dates to your tasks to see them in the timeline view
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box>
          {Object.entries(groupedTasks).map(([dateStr, tasks], index) => (
            <div
              key={dateStr}
            >
              <Card sx={{ mb: 2, borderRadius: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Schedule color={getDateColor(dateStr)} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {getDateLabel(dateStr)}
                    </Typography>
                    <Chip
                      label={`${tasks.length} task${tasks.length !== 1 ? 's' : ''}`}
                      size="small"
                      color={getDateColor(dateStr)}
                      variant="outlined"
                    />
                  </Box>
                  
                  <Box sx={{ pl: 4 }}>
                    {tasks.map((task) => (
                      <Box
                        key={task.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          py: 1,
                          borderLeft: `2px solid ${task.completed ? 'success.main' : 'grey.300'}`,
                          pl: 2,
                          mb: 1,
                        }}
                      >
                        {task.completed ? (
                          <CheckCircle color="success" fontSize="small" />
                        ) : (
                          <PendingActions color="action" fontSize="small" />
                        )}
                        
                        <Box sx={{ flex: 1 }}>
                          <Typography
                            variant="body1"
                            sx={{
                              textDecoration: task.completed ? 'line-through' : 'none',
                              color: task.completed ? 'text.secondary' : 'text.primary',
                              fontWeight: 500,
                            }}
                          >
                            {task.title}
                          </Typography>
                          
                          {task.description && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                textDecoration: task.completed ? 'line-through' : 'none',
                              }}
                            >
                              {task.description}
                            </Typography>
                          )}
                        </Box>
                        
                        <Chip
                          label={task.priority}
                          size="small"
                          color={
                            task.priority === 'high' ? 'error' :
                            task.priority === 'medium' ? 'warning' : 'success'
                          }
                          variant="outlined"
                        />
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </div>
          ))}
        </Box>
      )}
    </Box>
  )
}

export default TaskTimeline
