import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, Box, Alert, Stepper, Step, StepLabel, Link } from '@mui/material';
import { SmartToy, Link as LinkIcon } from '@mui/icons-material';
import openaiService from '../services/openaiService';
import gmailService from '../services/gmailService';

const SetupWizard = () => {
  const [open, setOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [apiKey, setApiKey] = useState('');
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleApiKey, setGoogleApiKey] = useState('');
  
  useEffect(() => {
    // Check if keys are missing
    const needsOpenAI = !openaiService.getApiKey();
    const needsGoogle = !gmailService.hasValidKeys();
    
    if (needsOpenAI || needsGoogle) {
      setOpen(true);
      if (!needsOpenAI && needsGoogle) {
        setActiveStep(1); // Skip to Google step if OpenAI is set
      }
    }
  }, []);

  const handleNext = () => {
    if (activeStep === 0) {
      // Save OpenAI key
      if (apiKey.trim()) {
        const aiProStr = localStorage.getItem('ai_pro_settings');
        let aiPro = {};
        try { if (aiProStr) aiPro = JSON.parse(aiProStr); } catch (e) {}
        aiPro.apiKey = apiKey.trim();
        localStorage.setItem('ai_pro_settings', JSON.stringify(aiPro));
        localStorage.setItem('openai_api_key', apiKey.trim());
        openaiService.setApiKey(apiKey.trim());
      }
      setActiveStep(1);
    } else {
      handleSave();
    }
  };

  const handleSave = () => {
    // Save Google Keys
    if (googleClientId.trim() && googleApiKey.trim()) {
      gmailService.setKeys(googleClientId.trim(), googleApiKey.trim());
    }
    setOpen(false);
  };

  const steps = ['OpenAI (Raj brain)', 'Google Calendar (optional)'];

  return (
    <Dialog open={open} disableEscapeKeyDown maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SmartToy color="primary" /> Welcome to Raj Assistant
      </DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 4, mt: 2 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {activeStep === 0 ? (
          <Box>
            <Typography variant="body1" sx={{ mb: 2 }}>
              To enable voice commands, app launching, and intelligent messaging, please provide your OpenAI API Key.
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              Your key is stored securely <b>only on your device</b> and is never sent anywhere except directly to OpenAI.
            </Alert>
            <TextField
              autoFocus
              fullWidth
              label="OpenAI API Key"
              placeholder="sk-..."
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              variant="outlined"
            />
            <Box sx={{ mt: 1, textAlign: 'right' }}>
              <Link href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" variant="caption">
                Get your API key from OpenAI Platform
              </Link>
            </Box>
          </Box>
        ) : (
          <Box>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Optional: Google OAuth Client ID lets Raj read your calendar aloud (opens Calendar app — no inbox UI here).
            </Typography>
            <Alert severity="info" sx={{ mb: 1 }}>
              You need an OAuth 2.0 Client ID (Web application) and an API Key from the Google Cloud Console.
            </Alert>
            <Box sx={{ mb: 3, textAlign: 'right' }}>
              <Link href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" variant="caption">
                Generate credentials in Google Cloud Console
              </Link>
            </Box>
            <TextField
              fullWidth
              label="Google Client ID"
              placeholder="YOUR_CLIENT_ID.apps.googleusercontent.com"
              value={googleClientId}
              onChange={(e) => setGoogleClientId(e.target.value)}
              variant="outlined"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Google API Key"
              type="password"
              placeholder="AIzaSy..."
              value={googleApiKey}
              onChange={(e) => setGoogleApiKey(e.target.value)}
              variant="outlined"
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 0, justifyContent: 'space-between' }}>
        {activeStep === 1 ? (
          <Button onClick={() => setActiveStep(0)}>Back</Button>
        ) : <Box />}
        <Button 
          variant="contained" 
          onClick={handleNext}
          disabled={
            (activeStep === 0 && !apiKey.trim() && !openaiService.getApiKey()) || 
            (activeStep === 1 && (!googleClientId.trim() || !googleApiKey.trim()) && !gmailService.hasValidKeys())
          }
        >
          {activeStep === 0 ? 'Next' : 'Save & Start Assistant'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SetupWizard;
