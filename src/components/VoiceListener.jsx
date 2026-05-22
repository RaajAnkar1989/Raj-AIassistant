import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import {
  Box,
  Fab,
  Tooltip,
  Typography,
  Paper,
  IconButton,
  Chip,
  Collapse,
  LinearProgress,
} from '@mui/material'
import { Mic, MicOff, Close, VolumeUp, VolumeOff, SmartToy } from '@mui/icons-material'
import {
  selectIsListening,
  selectTranscript,
  selectIsProcessing,
  selectIsSupported,
  selectIsSpeaking,
  selectLastSpokenText,
  selectVoiceError,
  selectVoiceSettings,
  setListening,
  setTranscript,
  processVoiceCommand,
  speakText,
  stopSpeaking,
  clearError,
} from '../store/slices/voiceSlice'
import { fetchEmails } from '../store/slices/emailSlice'
import toast from 'react-hot-toast'
import gmailService from '../services/gmailService'
import ttsService, { unlockAudioPlayback } from '../services/ttsService'

const VoiceListener = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const isListening = useSelector(selectIsListening)
  const transcript = useSelector(selectTranscript)
  const isProcessing = useSelector(selectIsProcessing)
  const isSupported = useSelector(selectIsSupported)
  const isSpeaking = useSelector(selectIsSpeaking)
  const lastSpokenText = useSelector(selectLastSpokenText)
  const voiceError = useSelector(selectVoiceError)
  const voiceSettings = useSelector(selectVoiceSettings)

  const [showPanel, setShowPanel] = useState(false)
  const [muted, setMuted] = useState(false)
  const recognitionRef = useRef(null)

  useEffect(() => {
    if (voiceError) {
      toast.error(String(voiceError))
      dispatch(clearError())
    }
  }, [voiceError, dispatch])

  useEffect(() => {
    ttsService.setMuted(muted)
  }, [muted])

  const handleVoiceCommand = useCallback(async (command) => {
    try {
      const result = await dispatch(processVoiceCommand(command)).unwrap()
      const { intent, aiData } = result

      if (intent === 'send_whatsapp') {
        const text = aiData?.rewrittenText || command
        await dispatch(speakText(`Opening WhatsApp for ${aiData?.contact || 'your contact'}`))
        window.location.href = `whatsapp://send?text=${encodeURIComponent(text)}`
      } else if (intent === 'send_sms') {
        const text = aiData?.rewrittenText || command
        await dispatch(speakText(`Opening Messages`))
        window.location.href = `sms:&body=${encodeURIComponent(text)}`
      } else if (intent === 'open_app') {
        const appName = aiData?.appName?.toLowerCase() || ''
        const schemes = {
          whatsapp: 'whatsapp://', instagram: 'instagram://', youtube: 'youtube://',
          spotify: 'spotify://', twitter: 'twitter://', x: 'twitter://',
          facebook: 'fb://', maps: 'maps://', messages: 'sms:', mail: 'message://',
          telegram: 'tg://', uber: 'uber://',
        }
        await dispatch(speakText(`Opening ${appName}`))
        window.location.href = schemes[appName] || `${appName.replace(/\s+/g, '')}://`
      } else if (intent === 'navigation') {
        const dest = aiData?.destination?.toLowerCase()
        const routes = {
          emails: '/dashboard/emails', calendar: '/dashboard/calendar',
          tasks: '/dashboard/tasks', todo: '/dashboard/tasks', settings: '/dashboard/settings',
        }
        navigate(routes[dest] || '/dashboard')
        await dispatch(speakText(`Opening ${dest || 'dashboard'}`))
      } else if (intent === 'general_chat') {
        await dispatch(speakText(aiData?.responseText || 'Done.'))
      } else if (intent === 'email_check') {
        navigate('/dashboard/emails')
        await dispatch(speakText('Opening your emails'))
      } else if (intent === 'clean_emails') {
        await dispatch(speakText('Scanning your inbox for clutter'))
        try {
          const clean = await gmailService.cleanInbox()
          await dispatch(speakText(
            clean.count > 0
              ? `Cleaned ${clean.count} emails from your inbox`
              : 'Your inbox is already clean'
          ))
          dispatch(fetchEmails())
        } catch {
          await dispatch(speakText('Connect Gmail in settings to clean emails'))
        }
      } else if (intent === 'calendar_check') {
        navigate('/dashboard/calendar')
        await dispatch(speakText('Opening your calendar'))
      } else if (intent === 'todo') {
        navigate('/dashboard/tasks')
        await dispatch(speakText('Opening your tasks'))
      } else if (/stop|quiet|mute|silence/i.test(command)) {
        await dispatch(stopSpeaking())
      } else {
        await dispatch(speakText(
          "Try: check my emails, open calendar, clean inbox, or send a WhatsApp message."
        ))
      }
    } catch (error) {
      console.error('Voice command error:', error)
      await dispatch(speakText('Sorry, I had trouble with that. Check your API key in settings.'))
    }
  }, [dispatch, navigate])

  useEffect(() => {
    if (!isSupported) return

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = voiceSettings.language || 'en-IN'
    recognitionRef.current = recognition

    recognition.onstart = () => {
      dispatch(setListening(true))
      setShowPanel(true)
    }

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript
      dispatch(setTranscript(text))
      handleVoiceCommand(text)
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      dispatch(setListening(false))
      if (event.error !== 'aborted') {
        toast.error('Could not hear you. Try again.')
      }
    }

    recognition.onend = () => {
      dispatch(setListening(false))
    }

    return () => {
      try { recognition.stop() } catch {}
    }
  }, [isSupported, voiceSettings.language, dispatch, handleVoiceCommand])

  const toggleListening = async () => {
    if (!recognitionRef.current) return
    await unlockAudioPlayback()

    if (isListening) {
      recognitionRef.current.stop()
      dispatch(setListening(false))
    } else {
      try {
        recognitionRef.current.start()
      } catch {
        toast.error('Microphone busy. Wait a moment and try again.')
      }
    }
  }

  const toggleMute = async () => {
    const next = !muted
    setMuted(next)
    ttsService.setMuted(next)
    if (next) await dispatch(stopSpeaking())
  }

  if (!isSupported) return null

  const statusLabel = isListening
    ? 'Listening…'
    : isProcessing
      ? 'Thinking…'
      : isSpeaking
        ? 'Speaking…'
        : 'Tap to speak'

  return (
    <>
      <Collapse in={showPanel && (transcript || isProcessing || isSpeaking || lastSpokenText)}>
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: 100,
            right: 24,
            width: 360,
            maxWidth: 'calc(100vw - 48px)',
            zIndex: 999,
            p: 2,
            borderRadius: 3,
            background: 'linear-gradient(145deg, #0d1117 0%, #161b22 100%)',
            color: '#e6edf3',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            boxShadow: '0 8px 32px rgba(0, 212, 255, 0.15)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <SmartToy sx={{ color: '#38bdf8' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1 }}>
              Raj Assistant
            </Typography>
            <IconButton size="small" onClick={toggleMute} sx={{ color: '#94a3b8' }}>
              {muted ? <VolumeOff fontSize="small" /> : <VolumeUp fontSize="small" />}
            </IconButton>
            <IconButton
              size="small"
              onClick={() => { dispatch(setTranscript('')); setShowPanel(false) }}
              sx={{ color: '#94a3b8' }}
            >
              <Close fontSize="small" />
            </IconButton>
          </Box>

          {(isListening || isProcessing || isSpeaking) && (
            <LinearProgress
              sx={{
                mb: 1.5,
                borderRadius: 1,
                bgcolor: 'rgba(56,189,248,0.15)',
                '& .MuiLinearProgress-bar': { bgcolor: '#38bdf8' },
              }}
            />
          )}

          {transcript && (
            <Typography variant="body2" sx={{ mb: 1, color: '#94a3b8' }}>
              You: &ldquo;{transcript}&rdquo;
            </Typography>
          )}
          {lastSpokenText && !isSpeaking && (
            <Typography variant="body2" sx={{ color: '#7ee787' }}>
              Raj: {lastSpokenText.length > 120 ? `${lastSpokenText.slice(0, 120)}…` : lastSpokenText}
            </Typography>
          )}
          <Chip
            label={statusLabel}
            size="small"
            sx={{
              mt: 1.5,
              bgcolor: isListening ? 'rgba(248, 81, 73, 0.2)' : 'rgba(56, 189, 248, 0.15)',
              color: isListening ? '#f85149' : '#38bdf8',
              fontWeight: 600,
            }}
          />
        </Paper>
      </Collapse>

      <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000 }}>
        <Tooltip title={statusLabel}>
          <Fab
            onClick={toggleListening}
            disabled={isProcessing && !isListening}
            sx={{
              width: 72,
              height: 72,
              background: isListening
                ? 'linear-gradient(135deg, #f85149, #da3633)'
                : 'linear-gradient(135deg, #0ea5e9, #0284c7)',
              color: '#fff',
              boxShadow: isListening
                ? '0 0 0 8px rgba(248, 81, 73, 0.25)'
                : '0 4px 24px rgba(14, 165, 233, 0.45)',
              animation: isListening ? 'pulse 1.5s ease-in-out infinite' : 'none',
              '@keyframes pulse': {
                '0%, 100%': { transform: 'scale(1)' },
                '50%': { transform: 'scale(1.06)' },
              },
              '&:hover': {
                background: isListening
                  ? 'linear-gradient(135deg, #da3633, #b62324)'
                  : 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
              },
            }}
          >
            {isListening ? <MicOff sx={{ fontSize: 32 }} /> : <Mic sx={{ fontSize: 32 }} />}
          </Fab>
        </Tooltip>
      </Box>
    </>
  )
}

export default VoiceListener
