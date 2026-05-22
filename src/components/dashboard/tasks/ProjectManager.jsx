import React, { useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  LinearProgress,
  Grid,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
} from '@mui/material'
import {
  Work,
  Add,
  Group,
  TrendingUp,
  Schedule,
  CheckCircle,
  PendingActions,
  Folder,
  Description,
} from '@mui/icons-material'

import toast from 'react-hot-toast'

const ProjectManager = () => {
  const theme = useTheme()
  
  // State for project management
  const [projects, setProjects] = useState([
    {
      id: '1',
      name: 'Website Redesign',
      description: 'Complete redesign of company website with modern UI/UX',
      status: 'in-progress',
      progress: 65,
      totalTasks: 12,
      completedTasks: 8,
      priority: 'high',
      dueDate: '2024-02-15',
      team: ['John Doe', 'Jane Smith'],
      category: 'work'
    },
    {
      id: '2',
      name: 'Mobile App Development',
      description: 'Develop iOS and Android apps for customer engagement',
      status: 'planning',
      progress: 25,
      totalTasks: 8,
      completedTasks: 2,
      priority: 'medium',
      dueDate: '2024-03-30',
      team: ['Mike Johnson', 'Sarah Wilson'],
      category: 'work'
    },
    {
      id: '3',
      name: 'Home Renovation',
      description: 'Kitchen and bathroom renovation project',
      status: 'completed',
      progress: 100,
      totalTasks: 15,
      completedTasks: 15,
      priority: 'low',
      dueDate: '2024-01-20',
      team: ['Contractor Team'],
      category: 'personal'
    }
  ])
  
  const [createProjectOpen, setCreateProjectOpen] = useState(false)
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    status: 'planning',
    priority: 'medium',
    dueDate: '',
    team: [],
    category: 'work'
  })
  
  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success'
      case 'in-progress': return 'primary'
      case 'planning': return 'info'
      case 'on-hold': return 'warning'
      case 'cancelled': return 'error'
      default: return 'default'
    }
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
  
  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle />
      case 'in-progress': return <TrendingUp />
      case 'planning': return <Schedule />
      case 'on-hold': return <PendingActions />
      case 'cancelled': return <Work />
      default: return <Work />
    }
  }
  
  // Handle create project
  const handleCreateProject = () => {
    if (!newProject.name.trim()) {
      toast.error('Please enter a project name')
      return
    }
    
    const project = {
      ...newProject,
      id: Date.now().toString(),
      progress: 0,
      totalTasks: 0,
      completedTasks: 0,
      team: newProject.team.length > 0 ? newProject.team : ['Unassigned']
    }
    
    setProjects([...projects, project])
    setCreateProjectOpen(false)
    setNewProject({
      name: '',
      description: '',
      status: 'planning',
      priority: 'medium',
      dueDate: '',
      team: [],
      category: 'work'
    })
    toast.success('Project created successfully! 🎉')
  }
  
  // Calculate project statistics
  const totalProjects = projects.length
  const completedProjects = projects.filter(p => p.status === 'completed').length
  const inProgressProjects = projects.filter(p => p.status === 'in-progress').length
  const averageProgress = projects.length > 0 
    ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length)
    : 0
  
  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
        Project Management
      </Typography>
      
      {/* Project Statistics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <div>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: 3
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {totalProjects}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Total Projects
                    </Typography>
                  </Box>
                  <Folder sx={{ fontSize: 32, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </div>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <div>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              borderRadius: 3
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {inProgressProjects}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      In Progress
                    </Typography>
                  </Box>
                  <TrendingUp sx={{ fontSize: 32, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </div>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <div>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
              borderRadius: 3
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {completedProjects}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Completed
                    </Typography>
                  </Box>
                  <CheckCircle sx={{ fontSize: 32, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </div>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <div>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
              color: 'white',
              borderRadius: 3
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {averageProgress}%
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Avg. Progress
                    </Typography>
                  </Box>
                  <Schedule sx={{ fontSize: 32, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </div>
        </Grid>
      </Grid>
      
      {/* Create Project Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateProjectOpen(true)}
          sx={{
            borderRadius: 2,
            background: 'linear-gradient(45deg, #2196F3, #21CBF3)',
            '&:hover': {
              background: 'linear-gradient(45deg, #1976D2, #1E88E5)'
            }
          }}
        >
          Create Project
        </Button>
      </Box>
      
      {/* Projects Grid */}
      <Grid container spacing={3}>
        {projects.map((project) => (
          <Grid item xs={12} md={6} lg={4} key={project.id}>
            <div>
              <Card sx={{ 
                borderRadius: 3,
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {/* Project Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                        {project.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {project.description}
                      </Typography>
                    </Box>
                  </Box>
                  
                  {/* Project Status and Priority */}
                  <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    <Chip
                      icon={getStatusIcon(project.status)}
                      label={project.status.replace('-', ' ')}
                      color={getStatusColor(project.status)}
                      variant="outlined"
                      size="small"
                    />
                    <Chip
                      label={project.priority}
                      color={getPriorityColor(project.priority)}
                      variant="outlined"
                      size="small"
                    />
                    <Chip
                      label={project.category}
                      variant="outlined"
                      size="small"
                    />
                  </Box>
                  
                  {/* Progress Bar */}
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Progress
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {project.progress}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={project.progress} 
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
                  </Box>
                  
                  {/* Task Counts */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Tasks: {project.completedTasks}/{project.totalTasks}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Due: {project.dueDate}
                    </Typography>
                  </Box>
                  
                  {/* Team Members */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Team:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {project.team.map((member, index) => (
                        <Chip
                          key={index}
                          label={member}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.75rem' }}
                        />
                      ))}
                    </Box>
                  </Box>
                  
                  {/* Action Buttons */}
                  <Box sx={{ mt: 'auto', display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      fullWidth
                      sx={{ borderRadius: 2 }}
                    >
                      View Details
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      fullWidth
                      sx={{ borderRadius: 2 }}
                    >
                      Manage Tasks
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </div>
          </Grid>
        ))}
      </Grid>
      
      {/* Create Project Dialog */}
      <Dialog 
        open={createProjectOpen} 
        onClose={() => setCreateProjectOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Create New Project
          </Typography>
        </DialogTitle>
        
        <DialogContent>
          <TextField
            fullWidth
            label="Project Name"
            value={newProject.name}
            onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
            placeholder="Enter project name..."
            sx={{ mb: 2, mt: 1 }}
            required
          />
          
          <TextField
            fullWidth
            label="Description"
            value={newProject.description}
            onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
            placeholder="Describe your project..."
            multiline
            rows={3}
            sx={{ mb: 2 }}
          />
          
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={newProject.status}
                  onChange={(e) => setNewProject({ ...newProject, status: e.target.value })}
                  label="Status"
                >
                  <MenuItem value="planning">Planning</MenuItem>
                  <MenuItem value="in-progress">In Progress</MenuItem>
                  <MenuItem value="on-hold">On Hold</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={newProject.priority}
                  onChange={(e) => setNewProject({ ...newProject, priority: e.target.value })}
                  label="Priority"
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="date"
                label="Due Date"
                value={newProject.dueDate}
                onChange={(e) => setNewProject({ ...newProject, dueDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={newProject.category}
                  onChange={(e) => setNewProject({ ...newProject, category: e.target.value })}
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
        </DialogContent>
        
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button onClick={() => setCreateProjectOpen(false)} variant="outlined">
            Cancel
          </Button>
          
          <Button
            onClick={handleCreateProject}
            variant="contained"
            startIcon={<Add />}
            sx={{
              background: 'linear-gradient(45deg, #2196F3, #21CBF3)',
              '&:hover': {
                background: 'linear-gradient(45deg, #1976D2, #1E88E5)'
              }
            }}
          >
            Create Project
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default ProjectManager
