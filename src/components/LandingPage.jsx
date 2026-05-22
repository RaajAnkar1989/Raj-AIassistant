import React, { useState } from 'react'
import { useDispatch } from 'react-redux'
import {
  Box, Container, Typography, Button, TextField, Paper, Grid, Avatar, Chip, Divider,
} from '@mui/material'
import { Mic, SmartToy, PhoneIphone, RecordVoiceOver, Bolt } from '@mui/icons-material'
import { authenticateUser } from '../store/slices/authSlice'
import toast from 'react-hot-toast'

const LandingPage = () => {
  const dispatch = useDispatch()
  const [credentials, setCredentials] = useState({ email: '', password: '' })
  const [isLoading, setIsLoading] = useState(false)

  const login = async (creds) => {
    setIsLoading(true)
    try {
      await dispatch(authenticateUser(creds)).unwrap()
      toast.success('Welcome, Raj is ready.')
    } catch (error) {
      toast.error(error || 'Sign in failed')
    } finally {
      setIsLoading(false)
    }
  }

  const features = [
    { icon: <Mic sx={{ fontSize: 40 }} />, title: 'Voice-first', desc: 'Talk to Raj — no cluttered dashboards', color: '#38bdf8' },
    { icon: <PhoneIphone sx={{ fontSize: 40 }} />, title: 'Real iPhone apps', desc: 'Opens WhatsApp, Messages, Gmail, Calendar on your phone', color: '#7ee787' },
    { icon: <RecordVoiceOver sx={{ fontSize: 40 }} />, title: 'Speaks back', desc: 'Calendar, weather, and answers read aloud', color: '#a78bfa' },
    { icon: <Bolt sx={{ fontSize: 40 }} />, title: 'Jarvis-style actions', desc: 'Draft messages, emails, and hand off to native apps', color: '#fbbf24' },
  ]

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(160deg, #0c1929 0%, #0d1117 50%, #010409 100%)' }}>
      <Box sx={{ py: 3, px: 2 }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: '#38bdf8', width: 48, height: 48 }}>
                <SmartToy />
              </Avatar>
              <Typography variant="h5" sx={{ color: '#e6edf3', fontWeight: 800 }}>
                Raj Assistant
              </Typography>
            </Box>
            <Button
              variant="outlined"
              sx={{ color: '#38bdf8', borderColor: '#38bdf8' }}
              onClick={() => login({ email: 'demo@example.com', password: 'demo123' })}
              disabled={isLoading}
            >
              Try demo
            </Button>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Grid container spacing={6} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h2" sx={{ color: '#e6edf3', fontWeight: 800, mb: 2, fontSize: { xs: '2.2rem', md: '3rem' } }}>
              Your Jarvis for iPhone
            </Typography>
            <Typography variant="h6" sx={{ color: '#8b949e', mb: 4, lineHeight: 1.6 }}>
              One screen. Your voice. Raj opens WhatsApp, drafts emails, reads your calendar aloud —
              on the real apps, not inside a copy of Gmail.
            </Typography>
            <Chip label="Add to Home Screen on iPhone for best experience" sx={{ bgcolor: '#21262d', color: '#7ee787' }} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 4, borderRadius: 3, bgcolor: '#161b22', border: '1px solid #30363d' }}>
              <Typography variant="h6" sx={{ mb: 3, textAlign: 'center', fontWeight: 600 }}>
                Sign in
              </Typography>
              <form onSubmit={(e) => { e.preventDefault(); login(credentials) }}>
                <TextField fullWidth label="Email" type="email" value={credentials.email}
                  onChange={(e) => setCredentials({ ...credentials, email: e.target.value })} sx={{ mb: 2 }} required />
                <TextField fullWidth label="Password" type="password" value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })} sx={{ mb: 3 }} required />
                <Button type="submit" fullWidth variant="contained" size="large" disabled={isLoading}
                  sx={{ py: 1.5, background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}>
                  {isLoading ? 'Signing in…' : 'Launch Raj'}
                </Button>
              </form>
              <Divider sx={{ my: 2 }}><Chip label="OR" size="small" /></Divider>
              <Button fullWidth variant="outlined" onClick={() => login({ email: 'demo@example.com', password: 'demo123' })} disabled={isLoading}>
                Continue with demo
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      <Box sx={{ py: 6, bgcolor: '#161b22' }}>
        <Container maxWidth="lg">
          <Typography variant="h4" sx={{ textAlign: 'center', mb: 4, fontWeight: 700, color: '#e6edf3' }}>
            What Raj does
          </Typography>
          <Grid container spacing={3}>
            {features.map((f, i) => (
              <Grid item xs={12} sm={6} key={i}>
                <Paper sx={{ p: 3, height: '100%', bgcolor: '#0d1117', border: '1px solid #30363d' }}>
                  <Box sx={{ color: f.color, mb: 1 }}>{f.icon}</Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>{f.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{f.desc}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    </Box>
  )
}

export default LandingPage
