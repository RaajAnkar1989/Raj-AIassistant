import React, { useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material'
import {
  CloudDownload,
  CloudUpload,
  Delete,
  Storage,
  CheckCircle,
  Warning,
  Info,
} from '@mui/icons-material'
import dataService from '../services/dataService'
import toast from 'react-hot-toast'

const DataManagement = ({ open, onClose }) => {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [importPreview, setImportPreview] = useState(null)
  const [storageInfo, setStorageInfo] = useState({
    emails: 0,
    events: 0,
    todos: 0,
    conversations: 0,
    totalSize: '0 KB',
  })

  // Get storage information
  const getStorageInfo = async () => {
    try {
      const emails = await dataService.getAll('emails')
      const events = await dataService.getAll('events')
      const todos = await dataService.getAll('todos')
      const conversations = await dataService.getAll('conversations')

      // Calculate approximate size
      const data = { emails, events, todos, conversations }
      const jsonString = JSON.stringify(data)
      const sizeInBytes = new Blob([jsonString]).size
      const sizeInKB = (sizeInBytes / 1024).toFixed(2)

      setStorageInfo({
        emails: emails.length,
        events: events.length,
        todos: todos.length,
        conversations: conversations.length,
        totalSize: `${sizeInKB} KB`,
      })
    } catch (error) {
      console.error('Error getting storage info:', error)
    }
  }

  // Export data
  const handleExport = async () => {
    try {
      setIsExporting(true)
      await dataService.exportData()
      toast.success('Data exported successfully')
    } catch (error) {
      toast.error('Export failed: ' + error.message)
    } finally {
      setIsExporting(false)
    }
  }

  // Handle file selection for import
  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (file) {
      setImportFile(file)
      
      // Preview the file content
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result)
          setImportPreview(data)
        } catch (error) {
          setImportPreview(null)
          toast.error('Invalid JSON file')
        }
      }
      reader.readAsText(file)
    }
  }

  // Import data
  const handleImport = async () => {
    if (!importFile || !importPreview) {
      toast.error('Please select a valid file first')
      return
    }

    try {
      setIsImporting(true)
      
      // Confirm import
      const confirmed = window.confirm(
        'This will replace all existing data. Are you sure you want to continue?'
      )
      
      if (!confirmed) {
        setIsImporting(false)
        return
      }

      const result = await dataService.importData(importPreview)
      
      if (result.success) {
        toast.success(result.message)
        setImportFile(null)
        setImportPreview(null)
        getStorageInfo()
        onClose()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error('Import failed: ' + error.message)
    } finally {
      setIsImporting(false)
    }
  }

  // Clear all data
  const handleClearData = async () => {
    const confirmed = window.confirm(
      'This will permanently delete all data. Are you sure you want to continue?'
    )
    
    if (!confirmed) return

    try {
      await dataService.clearAllData()
      toast.success('All data cleared successfully')
      getStorageInfo()
    } catch (error) {
      toast.error('Failed to clear data: ' + error.message)
    }
  }

  // Load storage info when dialog opens
  React.useEffect(() => {
    if (open) {
      getStorageInfo()
    }
  }, [open])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Storage />
          Data Management
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {/* Storage Information */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Storage Information
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <Info color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Emails"
                secondary={`${storageInfo.emails} items`}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Info color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Calendar Events"
                secondary={`${storageInfo.events} items`}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Info color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Todos"
                secondary={`${storageInfo.todos} items`}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Info color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Conversations"
                secondary={`${storageInfo.conversations} items`}
              />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemIcon>
                <Storage color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Total Size"
                secondary={storageInfo.totalSize}
              />
            </ListItem>
          </List>
        </Box>

        {/* Export Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Export Data
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Export all your data to a JSON file for backup or transfer to another device.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<CloudDownload />}
            onClick={handleExport}
            disabled={isExporting}
            sx={{ mr: 2 }}
          >
            {isExporting ? 'Exporting...' : 'Export Data'}
          </Button>
          {isExporting && <LinearProgress sx={{ mt: 1 }} />}
        </Box>

        {/* Import Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Import Data
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Import data from a previously exported JSON file. This will replace all existing data.
          </Typography>
          
          <input
            accept=".json"
            style={{ display: 'none' }}
            id="import-file"
            type="file"
            onChange={handleFileSelect}
          />
          <label htmlFor="import-file">
            <Button
              variant="outlined"
              component="span"
              startIcon={<CloudUpload />}
              sx={{ mr: 2 }}
            >
              Select File
            </Button>
          </label>
          
          {importFile && (
            <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
              Selected: {importFile.name}
            </Typography>
          )}

          {/* Import Preview */}
          {importPreview && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>
                File Preview:
              </Typography>
              <Typography variant="body2" component="div">
                • Emails: {importPreview.emails?.length || 0}
              </Typography>
              <Typography variant="body2" component="div">
                • Events: {importPreview.events?.length || 0}
              </Typography>
              <Typography variant="body2" component="div">
                • Todos: {importPreview.todos?.length || 0}
              </Typography>
              <Typography variant="body2" component="div">
                • Conversations: {importPreview.conversations?.length || 0}
              </Typography>
            </Alert>
          )}

          {importPreview && (
            <Button
              variant="contained"
              startIcon={<CloudUpload />}
              onClick={handleImport}
              disabled={isImporting}
              sx={{ mt: 2 }}
              color="warning"
            >
              {isImporting ? 'Importing...' : 'Import Data'}
            </Button>
          )}
          
          {isImporting && <LinearProgress sx={{ mt: 1 }} />}
        </Box>

        {/* Danger Zone */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom color="error">
            Danger Zone
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            These actions cannot be undone. Use with caution.
          </Typography>
          <Button
            variant="outlined"
            color="error"
            startIcon={<Delete />}
            onClick={handleClearData}
          >
            Clear All Data
          </Button>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}

export default DataManagement
