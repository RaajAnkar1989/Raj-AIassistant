import React from 'react'
import { Box, Typography, Card, CardContent } from '@mui/material'

const AIDashboard = () => {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        AI Assistant
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Interact with your AI assistant for insights, suggestions, and productivity help
      </Typography>
      
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            AI Dashboard
          </Typography>
          <Typography color="text.secondary">
            This component will include AI conversations, personality settings, and intelligent insights.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}

export default AIDashboard
