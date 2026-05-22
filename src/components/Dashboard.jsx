import React, { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Divider,
  Badge,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Email as EmailIcon,
  CalendarToday as CalendarIcon,
  CheckCircle as TodoIcon,
  VideoCall as MeetingIcon,
  Message as MessageIcon,
  People as PeopleIcon,
  SmartToy as AIIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material'
import { useNavigate, useLocation } from 'react-router-dom'
import { logoutUser } from '../store/slices/authSlice'
import { selectUser } from '../store/slices/authSlice'
import { selectUnreadCount } from '../store/slices/notificationSlice'
import toast from 'react-hot-toast'
import SyncStatus from './SyncStatus'

import DashboardHome from './dashboard/DashboardHome'
import EmailDashboard from './dashboard/EmailDashboard'
import CalendarDashboard from './dashboard/CalendarDashboard'

import MeetingDashboard from './dashboard/MeetingDashboard'
import MessageDashboard from './dashboard/MessageDashboard'
import AIDashboard from './dashboard/AIDashboard'
import CustomerDashboard from './dashboard/CustomerDashboard'
import SettingsDashboard from './dashboard/SettingsDashboard'
import TaskSchedule from './dashboard/TaskSchedule'

const drawerWidth = 280

const Dashboard = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  
  const user = useSelector(selectUser)
  const unreadCount = useSelector(selectUnreadCount)

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Emails', icon: <EmailIcon />, path: '/dashboard/emails' },
    { text: 'Calendar', icon: <CalendarIcon />, path: '/dashboard/calendar' },
    { text: 'Task Schedule', icon: <TodoIcon />, path: '/dashboard/tasks' },
    { text: 'Meetings', icon: <MeetingIcon />, path: '/dashboard/meetings' },
    { text: 'Messages', icon: <MessageIcon />, path: '/dashboard/messages' },
    { text: 'Customer', icon: <PeopleIcon />, path: '/dashboard/customer' },
    { text: 'AI Assistant', icon: <AIIcon />, path: '/dashboard/ai' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/dashboard/settings' },
  ]

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleNavigation = (path) => {
    navigate(path)
    if (isMobile) {
      setMobileOpen(false)
    }
  }

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap()
      toast.success('Logged out successfully')
      navigate('/')
    } catch (error) {
      toast.error('Logout failed')
    }
  }

  const drawer = (
    <Box>
      {/* User Profile Section */}
      <Box sx={{ p: 3, textAlign: 'center', borderBottom: '1px solid rgba(56, 189, 248, 0.2)' }}>
        <Avatar
          src={user?.avatar}
          sx={{ width: 80, height: 80, mx: 'auto', mb: 2 }}
        >
          {user?.name?.charAt(0)}
        </Avatar>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          {user?.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {user?.email}
        </Typography>
      </Box>

      {/* Navigation Menu */}
      <List sx={{ pt: 2 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              onClick={() => handleNavigation(item.path)}
              selected={location.pathname === item.path}
              sx={{
                mx: 2,
                borderRadius: 2,
                mb: 0.5,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 40,
                  color: location.pathname === item.path ? 'white' : 'inherit',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider sx={{ my: 2 }} />

      {/* Logout Button */}
      <List>
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleLogout}
            sx={{
              mx: 2,
              borderRadius: 2,
              color: 'error.main',
              '&:hover': {
                bgcolor: 'error.light',
                color: 'white',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: '0 2px 16px rgba(0,0,0,0.4)',
          borderBottom: '1px solid rgba(56, 189, 248, 0.15)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Raj Assistant
          </Typography>

          {/* Sync Status */}
          <Box sx={{ mr: 2 }}>
            <SyncStatus />
          </Box>

          {/* Notifications */}
          <IconButton color="inherit" sx={{ mr: 2 }}>
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          {/* User Menu */}
          <IconButton color="inherit">
            <Avatar src={user?.avatar} sx={{ width: 32, height: 32 }}>
              {user?.name?.charAt(0)}
            </Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: '1px solid rgba(0,0,0,0.1)',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: '64px', // AppBar height
        }}
      >
        <Routes>
          <Route path="/" element={<DashboardHome />} />
          <Route path="/emails" element={<EmailDashboard />} />
          <Route path="/calendar" element={<CalendarDashboard />} />
          <Route path="/tasks" element={<TaskSchedule />} />
          <Route path="/meetings" element={<MeetingDashboard />} />
          <Route path="/messages" element={<MessageDashboard />} />
          <Route path="/customer" element={<CustomerDashboard />} />
          <Route path="/ai" element={<AIDashboard />} />
          <Route path="/settings" element={<SettingsDashboard />} />
        </Routes>
      </Box>
    </Box>
  )
}

export default Dashboard
