import React from 'react'
import { Box, Typography, Card, CardContent } from '@mui/material'

const MeetingDashboard = () => {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        Meeting Management
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Start meetings, manage calls, and integrate with Google Meet
      </Typography>
      
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Meeting Dashboard
          </Typography>
          <Typography color="text.secondary">
            This component will include Google Meet integration, WebRTC calling, and meeting scheduling features.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}

export default MeetingDashboard
