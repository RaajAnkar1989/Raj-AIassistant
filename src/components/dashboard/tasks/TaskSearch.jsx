import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Collapse,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Typography,
  useTheme,
} from '@mui/material'
import {
  Search,
  Clear,
  FilterList,
  ExpandMore,
  ExpandLess,
  Psychology,
  AutoAwesome,
} from '@mui/icons-material'

import toast from 'react-hot-toast'

import { setSearchQuery, setFilters, selectSearchQuery, selectFilters } from '../../../store/slices/todoSlice'

const TaskSearch = () => {
  const dispatch = useDispatch()
  const theme = useTheme()
  const searchQuery = useSelector(selectSearchQuery)
  const filters = useSelector(selectFilters)
  
  // Local state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [aiSearchActive, setAiSearchActive] = useState(false)
  
  // Handle search query change
  const handleSearchChange = (event) => {
    dispatch(setSearchQuery(event.target.value))
  }
  
  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    dispatch(setFilters({ [filterType]: value }))
  }
  
  // Clear all filters
  const handleClearFilters = () => {
    dispatch(setFilters({
      completed: 'all',
      priority: 'all',
      category: 'all',
      tags: [],
    }))
    dispatch(setSearchQuery(''))
    toast.success('All filters cleared')
  }
  
  // Handle AI search
  const handleAiSearch = () => {
    setAiSearchActive(!aiSearchActive)
    if (!aiSearchActive) {
      toast.success('AI search activated! 🤖')
      // TODO: Implement AI-powered search
    } else {
      toast.info('AI search deactivated')
    }
  }
  
  // Get active filters count
  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.completed !== 'all') count++
    if (filters.priority !== 'all') count++
    if (filters.category !== 'all') count++
    if (filters.tags.length > 0) count++
    return count
  }
  
  const activeFiltersCount = getActiveFiltersCount()
  
  return (
    <Box sx={{ width: '100%' }}>
      {/* Main Search Bar */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <TextField
          fullWidth
          placeholder="Search tasks by title, description, or tags..."
          value={searchQuery}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search color="action" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                {searchQuery && (
                  <IconButton
                    size="small"
                    onClick={() => dispatch(setSearchQuery(''))}
                  >
                    <Clear />
                  </IconButton>
                )}
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              '&:hover': {
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                },
              },
            },
          }}
        />
        
        {/* AI Search Toggle */}
        <Button
          variant={aiSearchActive ? 'contained' : 'outlined'}
          onClick={handleAiSearch}
          startIcon={aiSearchActive ? <AutoAwesome /> : <Psychology />}
          sx={{
            minWidth: 'auto',
            px: 2,
            borderRadius: 2,
            ...(aiSearchActive && {
              background: 'linear-gradient(45deg, #2196F3, #21CBF3)',
              '&:hover': {
                background: 'linear-gradient(45deg, #1976D2, #1E88E5)'
              }
            })
          }}
        >
          {aiSearchActive ? 'AI On' : 'AI'}
        </Button>
        
        {/* Advanced Filters Toggle */}
        <Button
          variant="outlined"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          startIcon={showAdvancedFilters ? <ExpandLess /> : <ExpandMore />}
          endIcon={<FilterList />}
          sx={{ borderRadius: 2, minWidth: 'auto', px: 2 }}
        >
          Filters
          {activeFiltersCount > 0 && (
            <Chip
              label={activeFiltersCount}
              size="small"
              color="primary"
              sx={{ ml: 1, height: 20, minWidth: 20 }}
            />
          )}
        </Button>
      </Box>
      
      {/* Advanced Filters */}
      <Collapse in={showAdvancedFilters}>
        <div>
          <Box sx={{ 
            mt: 2, 
            p: 2, 
            bgcolor: 'background.paper', 
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
          }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Advanced Filters
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
              {/* Completion Status Filter */}
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.completed}
                  onChange={(e) => handleFilterChange('completed', e.target.value)}
                  label="Status"
                >
                  <MenuItem value="all">All Tasks</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                </Select>
              </FormControl>
              
              {/* Priority Filter */}
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={filters.priority}
                  onChange={(e) => handleFilterChange('priority', e.target.value)}
                  label="Priority"
                >
                  <MenuItem value="all">All Priorities</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                </Select>
              </FormControl>
              
              {/* Category Filter */}
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  label="Category"
                >
                  <MenuItem value="all">All Categories</MenuItem>
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
            </Box>
            
            {/* Clear Filters Button */}
            {activeFiltersCount > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={handleClearFilters}
                  size="small"
                  sx={{ borderRadius: 2 }}
                >
                  Clear All Filters
                </Button>
              </Box>
            )}
          </Box>
        </div>
      </Collapse>
    </Box>
  )
}

export default TaskSearch
