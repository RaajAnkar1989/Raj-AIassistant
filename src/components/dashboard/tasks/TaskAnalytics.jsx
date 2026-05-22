import React from 'react'
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  useTheme,
} from '@mui/material'
import {
  TrendingUp,
  TrendingDown,
  Schedule,
  CheckCircle,
  PriorityHigh,
  Work,
  Home,
  School,
  FitnessCenter,
  ShoppingCart,
  LocalHospital,
  Flight,
  Celebration,
} from '@mui/icons-material'


const TaskAnalytics = ({ todos, priorityCounts, categoryCounts }) => {
  const theme = useTheme()
  
  // Calculate analytics
  const totalTasks = todos.length
  const completedTasks = todos.filter(todo => todo.completed).length
  const pendingTasks = totalTasks - completedTasks
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  
  // Calculate average completion time
  const tasksWithTime = todos.filter(todo => todo.trackedTime && todo.completed)
  const averageCompletionTime = tasksWithTime.length > 0 
    ? Math.round(tasksWithTime.reduce((sum, todo) => sum + todo.trackedTime, 0) / tasksWithTime.length / 60)
    : 0
  
  // Get category icon
  const getCategoryIcon = (category) => {
    const iconMap = {
      work: <Work />,
      personal: <Home />,
      school: <School />,
      fitness: <FitnessCenter />,
      shopping: <ShoppingCart />,
      health: <LocalHospital />,
      travel: <Flight />,
      celebration: <Celebration />
    }
    return iconMap[category] || <Work />
  }
  
  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'error'
      case 'medium': return 'warning'
      case 'low': return 'success'
      default: return 'default'
    }
  }
  
  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
        Task Analytics & Insights
      </Typography>
      
      <Grid container spacing={3}>
        {/* Overview Cards */}
        <Grid item xs={12} md={6} lg={3}>
          <div>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                      {completionRate}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Completion Rate
                    </Typography>
                  </Box>
                  <CheckCircle sx={{ fontSize: 40, color: 'success.main' }} />
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={completionRate} 
                  sx={{ 
                    height: 8, 
                    borderRadius: 4,
                    bgcolor: 'grey.200',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                      background: 'linear-gradient(45deg, #4caf50, #66bb6a)'
                    }
                  }} 
                />
              </CardContent>
            </Card>
          </div>
        </Grid>
        
        <Grid item xs={12} md={6} lg={3}>
          <div>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
                      {totalTasks}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Tasks
                    </Typography>
                  </Box>
                  <Schedule sx={{ fontSize: 40, color: 'info.main' }} />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {completedTasks} completed, {pendingTasks} pending
                </Typography>
              </CardContent>
            </Card>
          </div>
        </Grid>
        
        <Grid item xs={12} md={6} lg={3}>
          <div>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                      {averageCompletionTime}m
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Avg. Completion Time
                    </Typography>
                  </Box>
                  <TrendingUp sx={{ fontSize: 40, color: 'warning.main' }} />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Based on {tasksWithTime.length} tracked tasks
                </Typography>
              </CardContent>
            </Card>
          </div>
        </Grid>
        
        <Grid item xs={12} md={6} lg={3}>
          <div>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'error.main' }}>
                      {priorityCounts.high || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      High Priority
                    </Typography>
                  </Box>
                  <PriorityHigh sx={{ fontSize: 40, color: 'error.main' }} />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {priorityCounts.urgent || 0} urgent tasks
                </Typography>
              </CardContent>
            </Card>
          </div>
        </Grid>
        
        {/* Priority Distribution */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Priority Distribution
              </Typography>
              
              {['urgent', 'high', 'medium', 'low'].map((priority) => {
                const count = priorityCounts[priority] || 0
                const percentage = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0
                
                return (
                  <Box key={priority} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={priority.charAt(0).toUpperCase() + priority.slice(1)}
                          size="small"
                          color={getPriorityColor(priority)}
                          variant="outlined"
                        />
                        <Typography variant="body2" color="text.secondary">
                          {count} tasks
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {percentage}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={percentage} 
                      color={getPriorityColor(priority)}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>
                )
              })}
            </CardContent>
          </Card>
        </Grid>
        
        {/* Category Distribution */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Category Distribution
              </Typography>
              
              {Object.entries(categoryCounts).map(([category, count]) => {
                const percentage = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0
                
                return (
                  <Box key={category} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getCategoryIcon(category)}
                        <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                          {category}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          ({count})
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {percentage}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={percentage} 
                      sx={{ 
                        height: 6, 
                        borderRadius: 3,
                        '& .MuiLinearProgress-bar': {
                          background: 'linear-gradient(45deg, #2196F3, #21CBF3)'
                        }
                      }}
                    />
                  </Box>
                )
              })}
            </CardContent>
          </Card>
        </Grid>
        
        {/* Productivity Insights */}
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Productivity Insights
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main', mb: 1 }}>
                      {Math.round(completionRate / 10) * 10}/10
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Productivity Score
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main', mb: 1 }}>
                      {pendingTasks > 0 ? Math.round((completedTasks / (completedTasks + pendingTasks)) * 100) : 100}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Task Efficiency
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main', mb: 1 }}>
                      {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Completion Rate
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
              
              {/* Recommendations */}
              <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'info.contrastText' }}>
                  💡 AI Recommendations
                </Typography>
                <Typography variant="body2" color="info.contrastText">
                  {completionRate < 50 
                    ? 'Focus on completing high-priority tasks first to improve your productivity score.'
                    : completionRate < 80
                    ? 'Great progress! Consider breaking down larger tasks into smaller subtasks for better completion rates.'
                    : 'Excellent work! You\'re maintaining high productivity. Consider taking on more challenging tasks to grow further.'
                  }
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

export default TaskAnalytics
