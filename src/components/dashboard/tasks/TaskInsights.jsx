import React from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  useTheme,
  Grid,
} from '@mui/material'
import {
  Psychology,
  AutoAwesome,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Speed,
  Schedule,
  PriorityHigh,
} from '@mui/icons-material'


const TaskInsights = ({ todos }) => {
  const theme = useTheme()
  
  // Calculate insights
  const totalTasks = todos.length
  const completedTasks = todos.filter(todo => todo.completed).length
  const pendingTasks = totalTasks - completedTasks
  const overdueTasks = todos.filter(todo => 
    todo.dueDate && new Date(todo.dueDate) < new Date() && !todo.completed
  ).length
  
  // Generate AI insights
  const generateInsights = () => {
    const insights = []
    
    if (overdueTasks > 0) {
      insights.push({
        type: 'warning',
        title: 'Overdue Tasks Detected',
        description: `You have ${overdueTasks} overdue tasks. Consider reprioritizing or rescheduling them.`,
        icon: <Schedule color="warning" />,
        action: 'Review Overdue Tasks'
      })
    }
    
    if (pendingTasks > completedTasks) {
      insights.push({
        type: 'info',
        title: 'Task Balance',
        description: 'You have more pending tasks than completed ones. Focus on completion to maintain momentum.',
        icon: <TrendingUp color="info" />,
        action: 'Focus on Completion'
      })
    }
    
    if (totalTasks > 0 && completedTasks / totalTasks < 0.3) {
      insights.push({
        type: 'error',
        title: 'Low Completion Rate',
        description: 'Your completion rate is below 30%. Consider breaking down larger tasks into smaller ones.',
        icon: <TrendingDown color="error" />,
        action: 'Break Down Tasks'
      })
    }
    
    if (pendingTasks > 10) {
      insights.push({
        type: 'warning',
        title: 'Task Overload',
        description: 'You have many pending tasks. Consider delegating or postponing less critical ones.',
        icon: <PriorityHigh color="warning" />,
        action: 'Prioritize Tasks'
      })
    }
    
    // Add positive insights
    if (completedTasks > 0) {
      insights.push({
        type: 'success',
        title: 'Great Progress!',
        description: `You've completed ${completedTasks} tasks. Keep up the excellent work!`,
        icon: <TrendingUp color="success" />,
        action: 'Celebrate Success'
      })
    }
    
    return insights
  }
  
  const insights = generateInsights()
  
  return (
    <Box sx={{ mb: 3 }}>
      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Psychology color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              AI-Powered Task Insights
            </Typography>
            <Chip
              icon={<AutoAwesome />}
              label="AI Enhanced"
              color="primary"
              variant="outlined"
            />
          </Box>
          
          {insights.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Lightbulb sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                No insights available
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Create some tasks to get personalized insights and recommendations
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {insights.map((insight, index) => (
                <Grid item xs={12} md={6} key={index}>
                  <div>
                    <Card 
                      sx={{ 
                        borderRadius: 2,
                        border: `1px solid ${theme.palette[insight.type].main}`,
                        bgcolor: `${insight.type}.light`,
                      }}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                          {insight.icon}
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                              {insight.title}
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 2 }}>
                              {insight.description}
                            </Typography>
                            <Button
                              variant="outlined"
                              size="small"
                              color={insight.type}
                              sx={{ borderRadius: 2 }}
                            >
                              {insight.action}
                            </Button>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </div>
                </Grid>
              ))}
            </Grid>
          )}
          
          {/* Productivity Tips */}
          <Box sx={{ mt: 4, p: 3, bgcolor: 'info.light', borderRadius: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'info.contrastText' }}>
              💡 Productivity Tips
            </Typography>
            <Typography variant="body2" color="info.contrastText" sx={{ mb: 2 }}>
              • Use the Pomodoro Technique: Work for 25 minutes, then take a 5-minute break
            </Typography>
            <Typography variant="body2" color="info.contrastText" sx={{ mb: 2 }}>
              • Prioritize tasks using the Eisenhower Matrix: Urgent vs Important
            </Typography>
            <Typography variant="body2" color="info.contrastText" sx={{ mb: 2 }}>
              • Break down large tasks into smaller, manageable subtasks
            </Typography>
            <Typography variant="body2" color="info.contrastText">
              • Review and adjust your task list daily for better productivity
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}

export default TaskInsights
