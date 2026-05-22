import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  Box,
  Chip,
  Button,
  Typography,
  useTheme,
} from '@mui/material'
import {
  FilterList,
  Clear,
  TrendingUp,
  TrendingDown,
  Schedule,
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

import toast from 'react-hot-toast'

import { setFilters, selectFilters } from '../../../store/slices/todoSlice'

const TaskFilters = () => {
  const dispatch = useDispatch()
  const theme = useTheme()
  const filters = useSelector(selectFilters)
  
  // Quick filter presets
  const quickFilters = [
    {
      label: 'High Priority',
      icon: <PriorityHigh />,
      filters: { priority: 'high' },
      color: 'error'
    },
    {
      label: 'Due Today',
      icon: <Schedule />,
      filters: { dueToday: true },
      color: 'warning'
    },
    {
      label: 'Work Tasks',
      icon: <Work />,
      filters: { category: 'work' },
      color: 'primary'
    },
    {
      label: 'Personal',
      icon: <Home />,
      filters: { category: 'personal' },
      color: 'success'
    },
    {
      label: 'Overdue',
      icon: <TrendingDown />,
      filters: { overdue: true },
      color: 'error'
    },
    {
      label: 'Recent',
      icon: <TrendingUp />,
      filters: { recent: true },
      color: 'info'
    }
  ]
  
  // Category filters
  const categoryFilters = [
    { value: 'work', label: 'Work', icon: <Work />, color: 'primary' },
    { value: 'personal', label: 'Personal', icon: <Home />, color: 'success' },
    { value: 'school', label: 'School', icon: <School />, color: 'info' },
    { value: 'fitness', label: 'Fitness', icon: <FitnessCenter />, color: 'warning' },
    { value: 'shopping', label: 'Shopping', icon: <ShoppingCart />, color: 'secondary' },
    { value: 'health', label: 'Health', icon: <LocalHospital />, color: 'error' },
    { value: 'travel', label: 'Travel', icon: <Flight />, color: 'info' },
    { value: 'celebration', label: 'Celebration', icon: <Celebration />, color: 'success' }
  ]
  
  // Priority filters
  const priorityFilters = [
    { value: 'urgent', label: 'Urgent', color: 'error' },
    { value: 'high', label: 'High', color: 'warning' },
    { value: 'medium', label: 'Medium', color: 'info' },
    { value: 'low', label: 'Low', color: 'success' }
  ]
  
  // Apply quick filter
  const handleQuickFilter = (filterPreset) => {
    dispatch(setFilters({ ...filters, ...filterPreset.filters }))
    toast.success(`Applied filter: ${filterPreset.label}`)
  }
  
  // Apply category filter
  const handleCategoryFilter = (category) => {
    const newCategory = filters.category === category ? 'all' : category
    dispatch(setFilters({ ...filters, category: newCategory }))
    
    if (newCategory === 'all') {
      toast.success('All categories selected')
    } else {
      toast.success(`Filtered by: ${category}`)
    }
  }
  
  // Apply priority filter
  const handlePriorityFilter = (priority) => {
    const newPriority = filters.priority === priority ? 'all' : priority
    dispatch(setFilters({ ...filters, priority: newPriority }))
    
    if (newPriority === 'all') {
      toast.success('All priorities selected')
    } else {
      toast.success(`Filtered by: ${priority} priority`)
    }
  }
  
  // Clear all filters
  const handleClearAll = () => {
    dispatch(setFilters({
      completed: 'all',
      priority: 'all',
      category: 'all',
      tags: [],
      dueToday: false,
      overdue: false,
      recent: false,
    }))
    toast.success('All filters cleared')
  }
  
  // Check if filter is active
  const isFilterActive = (filterType, value) => {
    return filters[filterType] === value
  }
  
  // Get active filters count
  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.completed !== 'all') count++
    if (filters.priority !== 'all') count++
    if (filters.category !== 'all') count++
    if (filters.tags.length > 0) count++
    if (filters.dueToday) count++
    if (filters.overdue) count++
    if (filters.recent) count++
    return count
  }
  
  const activeFiltersCount = getActiveFiltersCount()
  
  return (
    <Box sx={{ width: '100%' }}>
      {/* Quick Filters */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>
          Quick Filters
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {quickFilters.map((filter) => (
            <div
              key={filter.label}
            >
              <Chip
                icon={filter.icon}
                label={filter.label}
                variant="outlined"
                color={filter.color}
                onClick={() => handleQuickFilter(filter)}
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: `${filter.color}.light`,
                    color: `${filter.color}.contrastText`,
                  }
                }}
              />
            </div>
          ))}
        </Box>
      </Box>
      
      {/* Category Filters */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>
          Categories
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {categoryFilters.map((category) => (
            <div
              key={category.value}
            >
              <Chip
                icon={category.icon}
                label={category.label}
                variant={isFilterActive('category', category.value) ? 'filled' : 'outlined'}
                color={category.color}
                onClick={() => handleCategoryFilter(category.value)}
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: `${category.color}.light`,
                    color: `${category.color}.contrastText`,
                  }
                }}
              />
            </div>
          ))}
        </Box>
      </Box>
      
      {/* Priority Filters */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>
          Priorities
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {priorityFilters.map((priority) => (
            <div
              key={priority.value}
            >
              <Chip
                label={priority.label}
                variant={isFilterActive('priority', priority.value) ? 'filled' : 'outlined'}
                color={priority.color}
                onClick={() => handlePriorityFilter(priority.value)}
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: `${priority.color}.light`,
                    color: `${priority.color}.contrastText`,
                  }
                }}
              />
            </div>
          ))}
        </Box>
      </Box>
      
      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <Box sx={{ 
          p: 2, 
          bgcolor: 'background.paper', 
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              Active Filters ({activeFiltersCount})
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={handleClearAll}
              startIcon={<Clear />}
              sx={{ borderRadius: 2 }}
            >
              Clear All
            </Button>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {filters.category !== 'all' && (
              <Chip
                label={`Category: ${filters.category}`}
                size="small"
                onDelete={() => handleCategoryFilter(filters.category)}
                color="primary"
                variant="outlined"
              />
            )}
            
            {filters.priority !== 'all' && (
              <Chip
                label={`Priority: ${filters.priority}`}
                size="small"
                onDelete={() => handlePriorityFilter(filters.priority)}
                color="warning"
                variant="outlined"
              />
            )}
            
            {filters.completed !== 'all' && (
              <Chip
                label={`Status: ${filters.completed}`}
                size="small"
                onDelete={() => dispatch(setFilters({ ...filters, completed: 'all' }))}
                color="info"
                variant="outlined"
              />
            )}
            
            {filters.dueToday && (
              <Chip
                label="Due Today"
                size="small"
                onDelete={() => dispatch(setFilters({ ...filters, dueToday: false }))}
                color="warning"
                variant="outlined"
              />
            )}
            
            {filters.overdue && (
              <Chip
                label="Overdue"
                size="small"
                onDelete={() => dispatch(setFilters({ ...filters, overdue: false }))}
                color="error"
                variant="outlined"
              />
            )}
            
            {filters.recent && (
              <Chip
                label="Recent"
                size="small"
                onDelete={() => dispatch(setFilters({ ...filters, recent: false }))}
                color="info"
                variant="outlined"
              />
            )}
          </Box>
        </Box>
      )}
    </Box>
  )
}

export default TaskFilters
