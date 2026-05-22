import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Box, Typography, IconButton, Fade, Collapse } from '@mui/material'
import { Settings, MicNone, CallEnd } from '@mui/icons-material'
import { useConversation } from '@elevenlabs/react'
import { getElevenLabsAgentId } from '../constants/elevenlabsAgent'
import { formatElevenLabsSessionError } from '../constants/rajAgentPrompt'
import { buildSessionStartOptions, isLiveKitDisconnectMessage } from '../services/elevenlabsSession'
import { getPreferredConnectionType } from '../constants/elevenlabsAgent'
import { setClientToolActivityPing } from '../services/clientToolHandlers'
import JarvisSettingsPanel from './JarvisSettingsPanel'
import JarvisHud from './JarvisHud'
import { getGoogleConnectionStatus, isGoogleConfigured } from '../services/googleIntegration'
import toast from 'react-hot-toast'

function parseMessage(message) {
  if (!message) return { user: '', agent: '' }
  if (typeof message === 'string') return { agent: message }
  const source = message.source || message.role || message.type
  const text = message.message || message.text || message.agent_response || message.user_transcript || ''
  if (source === 'user' || message.type === 'user_transcript') return { user: text }
  return { agent: text }
}

const AssistantHome = () => {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [userLine, setUserLine] = useState('')
  const [agentLine, setAgentLine] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [lastError, setLastError] = useState('')
  const [levels, setLevels] = useState([0.2, 0.35, 0.5, 0.35, 0.2])
  const animRef = useRef(null)
  const userEndedRef = useRef(false)
  const sessionStartedRef = useRef(false)
  const [sessionStartedAt, setSessionStartedAt] = useState(null)
  const agentIdRef = useRef(getElevenLabsAgentId())
  const googleStatus = getGoogleConnectionStatus()
  const showGoogleHint = isGoogleConfigured() && !googleStatus.connected

  const conversation = useConversation({
    volume: 1,
    onConnect: () => {
      setConnecting(false)
      setLastError('')
      sessionStartedRef.current = true
      setSessionStartedAt(Date.now())
    },
    onDisconnect: (details) => {
      setConnecting(false)
      sessionStartedRef.current = false
      setSessionStartedAt(null)
      setClientToolActivityPing(null)

      if (userEndedRef.current) {
        userEndedRef.current = false
        return
      }

      const reason = details?.reason || 'unknown'
      const detail =
        details?.message ||
        details?.closeReason ||
        (reason === 'agent' ? 'Raj agent ended the session' : 'Connection lost')

      const formatted = formatElevenLabsSessionError(detail)
      const liveKit = isLiveKitDisconnectMessage(detail)
      const hint = liveKit && getPreferredConnectionType() === 'webrtc'
        ? ' Try Settings → Stable connection (WebSocket).'
        : ''
      setLastError(/quota/i.test(formatted) ? formatted : detail + hint)
      toast.error(/quota/i.test(formatted) ? formatted : `Disconnected: ${detail}${hint}`, {
        duration: 10000,
        style: { background: '#0f172a', color: '#e2e8f0' },
      })
    },
    onUnhandledClientToolCall: ({ tool_name: toolName }) => {
      toast.error(
        `Tool "${toolName}" not registered in app. Add as Client tool on ElevenLabs.`,
        { duration: 5000, style: { background: '#0f172a', color: '#e2e8f0' } }
      )
    },
    onError: (error) => {
      const msg = formatElevenLabsSessionError(error)
      if (sessionStartedRef.current) {
        console.warn('[Raj] session error:', msg)
        return
      }
      setConnecting(false)
      setLastError(msg)
      toast.error(msg, {
        duration: 8000,
        style: { background: '#0f172a', color: '#e2e8f0' },
      })
    },
    onMessage: (message) => {
      const { user, agent } = parseMessage(message)
      if (user) setUserLine(user)
      if (agent) setAgentLine(agent)
    },
  })

  const isConnected = conversation.status === 'connected'
  const isLive = isConnected && (conversation.isSpeaking || conversation.isListening)
  const mode = conversation.isSpeaking ? 'speaking' : conversation.isListening ? 'listening' : 'idle'

  useEffect(() => {
    if (!isConnected) {
      setClientToolActivityPing(null)
      return undefined
    }

    setClientToolActivityPing(() => {
      try {
        conversation.sendUserActivity()
      } catch {}
    })

    const keepAlive = setInterval(() => {
      try {
        conversation.sendUserActivity()
      } catch {}
    }, 12000)

    let wakeLock = null
    if (typeof navigator !== 'undefined' && navigator.wakeLock?.request) {
      navigator.wakeLock.request('screen').then((lock) => {
        wakeLock = lock
      }).catch(() => {})
    }

    return () => {
      clearInterval(keepAlive)
      setClientToolActivityPing(null)
      wakeLock?.release?.().catch(() => {})
    }
  }, [isConnected, conversation])

  useEffect(() => {
    if (!isLive) {
      setLevels([0.15, 0.25, 0.35, 0.25, 0.15])
      return undefined
    }
    const tick = () => {
      const base = conversation.isSpeaking ? 0.7 : 0.45
      setLevels(Array.from({ length: 7 }, () => 0.15 + Math.random() * base))
    }
    tick()
    animRef.current = setInterval(tick, 120)
    return () => clearInterval(animRef.current)
  }, [isLive, conversation.isSpeaking, conversation.isListening])

  const startSession = useCallback(async () => {
    if (connecting || isConnected) return

    userEndedRef.current = false
    setConnecting(true)
    setUserLine('')
    setAgentLine('')
    setLastError('')

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (e) {
      setConnecting(false)
      if (e?.name === 'NotAllowedError') toast.error('Allow microphone access')
      else toast.error(e?.message || 'Microphone unavailable')
      return
    }

    try {
      const options = await buildSessionStartOptions(agentIdRef.current)
      conversation.startSession(options)
    } catch (e) {
      setConnecting(false)
      const msg = formatElevenLabsSessionError(e)
      setLastError(msg)
      toast.error(msg, { duration: 8000, style: { background: '#0f172a', color: '#e2e8f0' } })
    }
  }, [connecting, isConnected, conversation])

  const endSession = useCallback(() => {
    userEndedRef.current = true
    sessionStartedRef.current = false
    setClientToolActivityPing(null)
    conversation.endSession()
    setConnecting(false)
    setLastError('')
  }, [conversation])

  const handleMainAction = () => {
    if (isConnected || connecting) endSession()
    else startSession()
  }

  const statusText = connecting
    ? 'Connecting…'
    : isConnected
      ? mode === 'speaking'
        ? 'Raj is speaking'
        : mode === 'listening'
          ? 'Listening'
          : 'Online'
      : 'Tap to activate'

  return (
    <Box className="jarvis-root">
      <div className="jarvis-grid" aria-hidden />
      <div className="jarvis-glow jarvis-glow--top" aria-hidden />
      <div className="jarvis-glow jarvis-glow--bottom" aria-hidden />

      <IconButton
        className="jarvis-settings-btn"
        onClick={() => setSettingsOpen(true)}
        aria-label="Settings"
      >
        <Settings sx={{ fontSize: 22 }} />
      </IconButton>

      <JarvisHud sessionActive={isConnected} sessionStartedAt={sessionStartedAt} />

      <Box className="jarvis-center">
        <Typography className="jarvis-brand" component="h1">
          RAJ
        </Typography>
        <Typography className="jarvis-tagline">Personal AI Assistant</Typography>

        <Box className="jarvis-orb-container">
          <span className={`jarvis-ring jarvis-ring--1 ${isLive ? 'is-active' : ''}`} />
          <span className={`jarvis-ring jarvis-ring--2 ${isLive ? 'is-active' : ''}`} />
          <span className={`jarvis-ring jarvis-ring--3 ${isLive ? 'is-active' : ''}`} />
          <Box className={`jarvis-core ${isLive ? `jarvis-core--${mode}` : ''} ${connecting ? 'jarvis-core--connecting' : ''}`}>
            <Box className="jarvis-visualizer">
              {levels.map((h, i) => (
                <span
                  key={i}
                  className="jarvis-bar"
                  style={{ transform: `scaleY(${isLive ? h : 0.2})` }}
                />
              ))}
            </Box>
          </Box>
        </Box>

        <Typography className={`jarvis-status ${isLive ? 'jarvis-status--live' : ''}`}>
          {statusText}
        </Typography>

        {!isConnected && (
          <Typography
            variant="caption"
            sx={{ color: '#64748b', mt: 0.5, fontFamily: 'monospace', fontSize: '0.65rem' }}
          >
            {getPreferredConnectionType() === 'websocket' ? 'Stable (WebSocket)' : 'WebRTC'} ·{' '}
            {agentIdRef.current.slice(0, 18)}…
          </Typography>
        )}

        {showGoogleHint && !isConnected && (
          <Typography
            variant="caption"
            sx={{
              color: '#fbbf24',
              mt: 1,
              px: 2,
              textAlign: 'center',
              maxWidth: 300,
              lineHeight: 1.4,
            }}
          >
            Connect Google in Settings for email & calendar voice commands.
          </Typography>
        )}

        {lastError && !isConnected && !connecting && (
          <Typography
            variant="caption"
            sx={{
              color: '#f87171',
              mt: 1,
              px: 2,
              textAlign: 'center',
              maxWidth: 320,
              lineHeight: 1.4,
            }}
          >
            {lastError}
          </Typography>
        )}

        <Collapse in={Boolean(userLine || agentLine) && isConnected}>
          <Fade in>
            <Box className="jarvis-transcript">
              {userLine && (
                <Typography className="jarvis-transcript-user">You — {userLine}</Typography>
              )}
              {agentLine && (
                <Typography className="jarvis-transcript-agent">{agentLine}</Typography>
              )}
            </Box>
          </Fade>
        </Collapse>
      </Box>

      <Box className="jarvis-controls">
        <button
          type="button"
          className={`jarvis-talk-btn ${isConnected ? 'jarvis-talk-btn--active' : ''}`}
          onClick={handleMainAction}
          disabled={connecting}
          aria-label={isConnected ? 'End conversation' : 'Start conversation'}
        >
          <span className="jarvis-talk-btn-inner">
            {connecting ? (
              <span className="jarvis-spinner" />
            ) : isConnected ? (
              <CallEnd sx={{ fontSize: 32 }} />
            ) : (
              <MicNone sx={{ fontSize: 36 }} />
            )}
          </span>
        </button>
        <Typography className="jarvis-hint">
          {isConnected ? 'Tap to end session' : 'Tap to talk to Raj'}
        </Typography>
      </Box>

      <JarvisSettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Box>
  )
}

export default AssistantHome
