import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  IconButton,
  Tabs,
  Tab,
  Fab,
  Tooltip,
  LinearProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import {
  Add,
  ViewList,
  ViewModule,
  Timeline,
  Analytics,
  TrendingUp,
  CheckCircle,
  Schedule,
  PriorityHigh,
  Assessment,
  PendingActions,
  Work,
  Today,
  Upcoming,
} from '@mui/icons-material'
import { format, isToday, isOverdue, startOfWeek, endOfWeek } from 'date-fns'
import toast from 'react-hot-toast'

import {
  fetchTodos,
  addTodo,
  updateTodo,
  deleteTodo,
  toggleTodoComplete,
  setFilters,
  setSearchQuery,
  setCreateTodoOpen,
  setEditTodoOpen,
  selectTodos,
  selectIsLoading,
  selectError,
  selectFilteredTodos,
  selectPriorityCounts,
  selectCategoryCounts,
} from '../../store/slices/todoSlice'

const TodoDashboard = () => {
  const dispatch = useDispatch()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  
  // Redux state
  const todos = useSelector(selectTodos)
  const isLoading = useSelector(selectIsLoading)
  const error = useSelector(selectError)
  const filteredTodos = useSelector(selectFilteredTodos)
  const priorityCounts = useSelector(selectPriorityCounts)
  const categoryCounts = useSelector(selectCategoryCounts)
  
  // Local state
  const [selectedTab, setSelectedTab] = useState(0)
  
  // Load todos on component mount
  useEffect(() => {
    dispatch(fetchTodos())
  }, [dispatch])
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue)
  }
  
  // Calculate statistics
  const totalTasks = todos.length
  const completedTasks = todos.filter(todo => todo.completed).length
  const pendingTasks = totalTasks - completedTasks
  const overdueTasks = todos.filter(todo => 
    todo.dueDate && isOverdue(new Date(todo.dueDate)) && !todo.completed
  ).length
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  
  // Get today's tasks
  const todayTasks = todos.filter(todo => 
    todo.dueDate && isToday(new Date(todo.dueDate))
  )
  
  // Get upcoming tasks
  const upcomingTasks = todos.filter(todo => 
    todo.dueDate && !isToday(new Date(todo.dueDate)) && !isOverdue(new Date(todo.dueDate))
  ).slice(0, 5)
  
  return (
    <Box sx={{ flexGrow: 1, p: { xs: 2, md: 3 } }}>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 800, mb: 1, background: 'linear-gradient(45deg, #2196F3, #21CBF3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Task Management
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              AI-Powered Productivity & Project Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Transform your workflow with intelligent task prioritization, time tracking, and insights
            </Typography>
          </Box>
          
          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => dispatch(setCreateTodoOpen(true))}
              sx={{ 
                borderRadius: 2,
                background: 'linear-gradient(45deg, #2196F3, #21CBF3)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #1976D2, #1E88E5)'
                }
              }}
            >
              New Task
            </Button>
          </Box>
        </Box>
        
        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: 3
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {totalTasks}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Total Tasks
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    bgcolor: 'rgba(255,255,255,0.2)', 
                    borderRadius: '50%', 
                    p: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Assessment sx={{ fontSize: 32 }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              borderRadius: 3
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {pendingTasks}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Pending
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    bgcolor: 'rgba(255,255,255,0.2)', 
                    borderRadius: '50%', 
                    p: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <PendingActions sx={{ fontSize: 32 }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
              borderRadius: 3
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {completionRate}%
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Completion Rate
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    bgcolor: 'rgba(255,255,255,0.2)', 
                    borderRadius: '50%', 
                    p: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <TrendingUp sx={{ fontSize: 32 }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
              color: 'white',
              borderRadius: 3
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {overdueTasks}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Overdue
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    bgcolor: 'rgba(255,255,255,0.2)', 
                    borderRadius: '50%', 
                    p: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Schedule sx={{ fontSize: 32 }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        {/* Progress Overview */}
        <Card sx={{ borderRadius: 3, mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Weekly Progress
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {format(startOfWeek(new Date()), 'MMM d')} - {format(endOfWeek(new Date()), 'MMM d, yyyy')}
              </Typography>
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
                  background: 'linear-gradient(45deg, #2196F3, #21CBF3)'
                }
              }} 
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {completedTasks} of {totalTasks} completed
              </Typography>
              <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>
                {completionRate}%
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
      
      {/* Main Content Tabs */}
      <Card sx={{ borderRadius: 3, mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={selectedTab} 
            onChange={handleTabChange}
            variant={isMobile ? "scrollable" : "fullWidth"}
            scrollButtons={isMobile ? "auto" : false}
            sx={{
              '& .MuiTab-root': {
                minHeight: 64,
                fontSize: '1rem',
                fontWeight: 600,
                textTransform: 'none'
              }
            }}
          >
            <Tab 
              icon={<ViewList />} 
              label="All Tasks" 
              iconPosition="start"
            />
            <Tab 
              icon={<Today />} 
              label="Today" 
              iconPosition="start"
            />
            <Tab 
              icon={<Upcoming />} 
              label="Upcoming" 
              iconPosition="start"
            />
          </Tabs>
        </Box>
        
        <Box sx={{ p: 3 }}>
          {/* Tab Content */}
          {selectedTab === 0 && (
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
                All Tasks ({filteredTodos.length})
              </Typography>
              
              {isLoading ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Typography variant="h6" color="text.secondary">
                    Loading tasks...
                  </Typography>
                </Box>
              ) : filteredTodos.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                    No tasks found
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Create your first task to get started
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => dispatch(setCreateTodoOpen(true))}
                    sx={{ borderRadius: 2 }}
                  >
                    Create Task
                  </Button>
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {filteredTodos.map((todo) => (
                    <Grid item xs={12} key={todo.id}>
                      <Card sx={{ borderRadius: 2 }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                                {todo.title}
                              </Typography>
                              {todo.description && (
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                  {todo.description}
                                </Typography>
                              )}
                              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Chip
                                  label={todo.priority}
                                  size="small"
                                  color={
                                    todo.priority === 'high' ? 'error' :
                                    todo.priority === 'medium' ? 'warning' : 'success'
                                  }
                                  variant="outlined"
                                />
                                {todo.category && (
                                  <Chip
                                    label={todo.category}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                  />
                                )}
                              </Box>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <IconButton
                                onClick={() => dispatch(toggleTodoComplete(todo.id))}
                                color={todo.completed ? 'success' : 'default'}
                              >
                                <CheckCircle />
                              </IconButton>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          )}
          
          {selectedTab === 1 && (
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
                Today's Tasks ({todayTasks.length})
              </Typography>
              
              {todayTasks.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                    No tasks due today
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Great job! You're all caught up.
                  </Typography>
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {todayTasks.map((todo) => (
                    <Grid item xs={12} key={todo.id}>
                      <Card sx={{ borderRadius: 2 }}>
                        <CardContent>
                          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                            {todo.title}
                          </Typography>
                          {todo.description && (
                            <Typography variant="body2" color="text.secondary">
                              {todo.description}
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          )}
          
          {selectedTab === 2 && (
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
                Upcoming Tasks ({upcomingTasks.length})
              </Typography>
              
              {upcomingTasks.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                    No upcoming tasks
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    You're all set for now.
                  </Typography>
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {upcomingTasks.map((todo) => (
                    <Grid item xs={12} key={todo.id}>
                      <Card sx={{ borderRadius: 2 }}>
                        <CardContent>
                          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                            {todo.title}
                          </Typography>
                          {todo.description && (
                            <Typography variant="body2" color="text.secondary">
                              {todo.description}
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          )}
        </Box>
      </Card>
      
      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add task"
        onClick={() => dispatch(setCreateTodoOpen(true))}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: 'linear-gradient(45deg, #2196F3, #21CBF3)',
          '&:hover': {
            background: 'linear-gradient(45deg, #1976D2, #1E88E5)'
          }
        }}
      >
        <Add />
      </Fab>
    </Box>
  )
}

export default TodoDashboard
