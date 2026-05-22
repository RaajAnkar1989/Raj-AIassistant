import React, { useState, useEffect } from 'react'
import {
  Box,
  Chip,
  IconButton,
  Tooltip,
  Typography,
  LinearProgress,
  Collapse,
  Paper,
} from '@mui/material'
import {
  Sync,
  SyncDisabled,
  CloudDone,
  CloudOff,
  CloudQueue,
  Refresh,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material'
import syncService from '../services/syncService'
import toast from 'react-hot-toast'

const SyncStatus = () => {
  const [syncStatus, setSyncStatus] = useState({
    isOnline: true,
    lastSyncTime: null,
    pendingChanges: 0,
    isSyncing: false,
  })
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    // Get initial sync status
    updateSyncStatus()

    // Set up periodic status updates
    const interval = setInterval(updateSyncStatus, 10000) // Update every 10 seconds

    // Listen for sync events
    const syncCallbackId = syncService.onDataChange(() => {
      updateSyncStatus()
    })

    return () => {
      clearInterval(interval)
      syncService.offDataChange(syncCallbackId)
    }
  }, [])

  const updateSyncStatus = () => {
    const status = syncService.getSyncStatus()
    setSyncStatus(status)
  }

  const handleForceSync = async () => {
    try {
      setSyncStatus(prev => ({ ...prev, isSyncing: true }))
      await syncService.forceSync()
      toast.success('Data synchronized successfully')
      updateSyncStatus()
    } catch (error) {
      toast.error('Sync failed: ' + error.message)
    } finally {
      setSyncStatus(prev => ({ ...prev, isSyncing: false }))
    }
  }

  const getStatusIcon = () => {
    if (syncStatus.isSyncing) {
      return <Sync className="loading-spinner" />
    }
    if (!syncStatus.isOnline) {
      return <CloudOff color="error" />
    }
    if (syncStatus.pendingChanges > 0) {
      return <CloudQueue color="warning" />
    }
    return <CloudDone color="success" />
  }

  const getStatusColor = () => {
    if (syncStatus.isSyncing) return 'info'
    if (!syncStatus.isOnline) return 'error'
    if (syncStatus.pendingChanges > 0) return 'warning'
    return 'success'
  }

  const getStatusText = () => {
    if (syncStatus.isSyncing) return 'Syncing...'
    if (!syncStatus.isOnline) return 'Offline'
    if (syncStatus.pendingChanges > 0) return `${syncStatus.pendingChanges} pending`
    return 'Synced'
  }

  const formatLastSync = (timestamp) => {
    if (!timestamp) return 'Never'
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return date.toLocaleDateString()
  }

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Main sync status indicator */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title={getStatusText()}>
          <IconButton
            size="small"
            onClick={handleForceSync}
            disabled={syncStatus.isSyncing || !syncStatus.isOnline}
            sx={{ color: 'inherit' }}
          >
            {getStatusIcon()}
          </IconButton>
        </Tooltip>
        
        <Chip
          label={getStatusText()}
          size="small"
          color={getStatusColor()}
          variant="outlined"
          onClick={() => setExpanded(!expanded)}
          icon={expanded ? <ExpandLess /> : <ExpandMore />}
        />
      </Box>

      {/* Expanded sync details */}
      <Collapse in={expanded}>
        <Paper
          sx={{
            position: 'absolute',
            top: '100%',
            right: 0,
            mt: 1,
            p: 2,
            minWidth: 300,
            zIndex: 1000,
            boxShadow: 3,
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            Sync Status
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Connection
              </Typography>
              <Chip
                label={syncStatus.isOnline ? 'Online' : 'Offline'}
                size="small"
                color={syncStatus.isOnline ? 'success' : 'error'}
                variant="outlined"
              />
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Pending Changes
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {syncStatus.pendingChanges}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Last Sync
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {formatLastSync(syncStatus.lastSyncTime)}
              </Typography>
            </Box>
          </Box>

          {/* Sync progress */}
          {syncStatus.isSyncing && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Syncing data...
              </Typography>
              <LinearProgress />
            </Box>
          )}

          {/* Action buttons */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton
              size="small"
              onClick={handleForceSync}
              disabled={syncStatus.isSyncing || !syncStatus.isOnline}
              sx={{ color: 'primary.main' }}
            >
              <Refresh />
            </IconButton>
            
            <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
              Click to force sync
            </Typography>
          </Box>
        </Paper>
      </Collapse>
    </Box>
  )
}

export default SyncStatus
