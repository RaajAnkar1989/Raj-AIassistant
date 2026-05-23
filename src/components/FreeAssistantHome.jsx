import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Box, Typography, IconButton, Collapse, Fade } from '@mui/material'
import { Settings, MicNone, CallEnd } from '@mui/icons-material'
import JarvisSettingsPanel from './JarvisSettingsPanel'
import {
  setListening,
  setTranscript,
  setSpeaking,
  processVoiceCommand,
  stopSpeaking,
  clearError,
  selectVoiceError,
} from '../store/slices/voiceSlice'
import { executeIntent } from '../services/actionRouter'
import { getGoogleConnectionStatus, isGoogleConfigured } from '../services/googleIntegration'
import ttsService, {
  unlockAudioPlayback,
  primeAudioForSession,
  TTS_INTERRUPTED,
  warmUpChatterbox,
  warmUpEdgeTts,
} from '../services/ttsService'
import {
  getMicPermissionHint,
  isSecureMicContext,
  requestMicrophoneAccess,
  releaseMicrophoneStream,
  getActiveMicStream,
} from '../utils/microphoneAccess'
import { hasBrainReady, getActiveProviderInfo, getBrainProvider, migrateBrainSettings } from '../constants/aiProviders'
import {
  shouldUseWhisperStt,
  getVoiceInputLabel,
  getPhoneSetupHint,
} from '../utils/voiceInputMode'
import { startWhisperListenLoop } from '../services/whisperService'
import { formatBrainError, isOpenAIQuotaError, isQuotaExceededCached, clearQuotaExceededCache } from '../utils/openaiErrors'
import {
  buildActionKey,
  estimateEchoCooldownMs,
  isDuplicateAction,
  isLikelyNoiseCommand,
  looksLikeAssistantEcho,
} from '../utils/voiceEchoGuard'
import EmailDraftOverlay from './EmailDraftOverlay'
import JarvisHud from './JarvisHud'
import { getTtsOptions, migrateVoiceSettings } from '../utils/voiceSettings'
import { isMobileDevice, isIOSDevice } from '../utils/device'
import { useBatteryReminder } from '../hooks/useBatteryReminder'
import { TIMER_DONE_EVENT, restoreVoiceTimers } from '../services/timerService'
import { buildBossWelcomeBriefing } from '../services/bossBriefing'
import {
  classifyWakeInput,
  containsWakeWord,
  ENGAGED_WINDOW_MS,
  getWakeConfig,
  stripWakeWord,
} from '../utils/wakeWord'
import toast from 'react-hot-toast'

function containsWakeWordForAccept(text) {
  return containsWakeWord(text)
}

const SPEECH_ERRORS = {
  network: 'Browser speech failed (common on iPhone). Use HTTPS and ChatGPT key — Raj switches to Whisper on phone.',
  'no-speech': 'No speech heard. Try again closer to the mic.',
  aborted: '',
}

const FreeAssistantHome = () => {
  const dispatch = useDispatch()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sessionActive, setSessionActive] = useState(false)
  const [starting, setStarting] = useState(false)
  const [levels, setLevels] = useState([0.2, 0.35, 0.5, 0.35, 0.2])
  const animRef = useRef(null)
  const recognitionRef = useRef(null)
  const sessionActiveRef = useRef(false)
  const processingRef = useRef(false)
  const speakingRef = useRef(false)
  const micGrantedRef = useRef(false)
  const lastSpeechErrorRef = useRef(0)
  const commandGenerationRef = useRef(0)
  const whisperStopRef = useRef(null)
  const echoGuardUntilRef = useRef(0)
  const lastCommandTextRef = useRef('')
  const lastCommandAtRef = useRef(0)
  const lastSpokenTextRef = useRef('')
  const lastActionRef = useRef({ key: '', at: 0 })
  const resumeTimerRef = useRef(null)
  const engagedUntilRef = useRef(0)
  const [sessionStartedAt, setSessionStartedAt] = useState(null)
  const [sttMode, setSttMode] = useState(() => (shouldUseWhisperStt() ? 'whisper' : 'webspeech'))
  const [brainInfo, setBrainInfo] = useState(() => getActiveProviderInfo())
  const useWhisper = sttMode === 'whisper'
  const brainReady = hasBrainReady()
  const openaiQuotaLimited = brainInfo.id === 'openai' && isQuotaExceededCached()

  const isListening = useSelector((s) => s.voice.isListening)
  const isProcessing = useSelector((s) => s.voice.isProcessing)
  const isSpeaking = useSelector((s) => s.voice.isSpeaking)
  const transcript = useSelector((s) => s.voice.transcript)
  const voiceSettings = useSelector((s) => s.voice.settings)
  const voiceError = useSelector(selectVoiceError)
  const googleStatus = getGoogleConnectionStatus()
  const showGoogleHint = isGoogleConfigured() && !googleStatus.connected

  const isLive = sessionActive && (isListening || isProcessing || isSpeaking)
  const mode = isSpeaking ? 'speaking' : isProcessing ? 'thinking' : isListening ? 'listening' : 'idle'

  useEffect(() => {
    sessionActiveRef.current = sessionActive
  }, [sessionActive])

  useEffect(() => {
    if (!voiceError) return
    const msg = String(voiceError).trim()
    if (!msg) {
      dispatch(clearError())
      return
    }
    toast.error(msg, { duration: 5000 })
    dispatch(clearError())
  }, [voiceError, dispatch])

  useEffect(() => () => releaseMicrophoneStream(), [])

  useEffect(() => {
    const refreshBrain = () => {
      if (getBrainProvider() !== 'openai') clearQuotaExceededCache()
      setBrainInfo(getActiveProviderInfo())
    }
    window.addEventListener('raj-brain-settings-change', refreshBrain)
    window.addEventListener('storage', refreshBrain)
    return () => {
      window.removeEventListener('raj-brain-settings-change', refreshBrain)
      window.removeEventListener('storage', refreshBrain)
    }
  }, [])

  const clearResumeTimer = useCallback(() => {
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current)
      resumeTimerRef.current = null
    }
  }, [])

  const startRecognition = useCallback(() => {
    if (!sessionActiveRef.current) return
    if (Date.now() < echoGuardUntilRef.current) return
    if (speakingRef.current || processingRef.current) return
    try {
      recognitionRef.current?.start()
      dispatch(setListening(true))
    } catch {}
  }, [dispatch])

  const scheduleResumeListening = useCallback(
    (delayMs = 350) => {
      clearResumeTimer()
      resumeTimerRef.current = setTimeout(() => {
        resumeTimerRef.current = null
        const wait = echoGuardUntilRef.current - Date.now()
        if (wait > 0) {
          scheduleResumeListening(wait + 50)
          return
        }
        startRecognition()
      }, delayMs)
    },
    [clearResumeTimer, startRecognition]
  )

  const stopRecognition = useCallback(() => {
    clearResumeTimer()
    try {
      recognitionRef.current?.stop()
    } catch {}
    dispatch(setListening(false))
  }, [clearResumeTimer, dispatch])

  /** iOS blocks speaker output while mic capture is active — release before TTS. */
  const pauseMicForSpeech = useCallback(async () => {
    stopRecognition()
    releaseMicrophoneStream()
    if (isMobileDevice()) {
      await new Promise((r) => setTimeout(r, 280))
    }
    return async () => {
      if (useWhisper) {
        try {
          await requestMicrophoneAccess({ required: true })
        } catch {}
      }
    }
  }, [stopRecognition, useWhisper])

  const resetVoiceSessionRefs = useCallback(() => {
    clearResumeTimer()
    echoGuardUntilRef.current = 0
    lastSpokenTextRef.current = ''
    lastCommandTextRef.current = ''
    lastCommandAtRef.current = 0
    lastActionRef.current = { key: '', at: 0 }
    processingRef.current = false
    speakingRef.current = false
  }, [clearResumeTimer])

  const shouldAcceptCommand = useCallback((command) => {
    const text = (command || '').trim()
    if (!text) return false
    if (speakingRef.current || processingRef.current) return false

    const { enabled } = getWakeConfig()
    const engaged = Date.now() < engagedUntilRef.current
    if (enabled && !engaged && !containsWakeWordForAccept(text)) return false

    const guardActive = Date.now() < echoGuardUntilRef.current
    if (guardActive && looksLikeAssistantEcho(text, lastSpokenTextRef.current, true)) return false
    if (isLikelyNoiseCommand(text)) return false

    const now = Date.now()
    if (text.toLowerCase() === lastCommandTextRef.current.toLowerCase() && now - lastCommandAtRef.current < 2500) {
      return false
    }
    return true
  }, [])

  const speak = useCallback(
    async (text, cmdGen) => {
      if (!text?.trim()) return
      if (voiceSettings.autoSpeak === false) return
      if (cmdGen !== undefined && cmdGen !== commandGenerationRef.current) return

      const spoken = text.trim()
      lastSpokenTextRef.current = spoken
      speakingRef.current = true
      dispatch(setSpeaking(true))
      let resumeMic = null
      if (isMobileDevice()) {
        resumeMic = await pauseMicForSpeech()
      } else {
        stopRecognition()
      }
      echoGuardUntilRef.current = Date.now() + estimateEchoCooldownMs(spoken, 280)

      try {
        await unlockAudioPlayback()
        if (cmdGen !== undefined && cmdGen !== commandGenerationRef.current) return

        await ttsService.speak(
          spoken,
          getTtsOptions({
            lang: voiceSettings.language || 'en-IN',
            rate: voiceSettings.rate ?? 1.14,
            pitch: voiceSettings.pitch ?? 1,
            volume: voiceSettings.volume ?? 1,
          })
        )
      } catch (e) {
        if (e?.code !== TTS_INTERRUPTED) {
          const msg = e?.message || 'Could not play voice response'
          toast.error(msg, { duration: 5000 })
        }
      } finally {
        if (resumeMic) await resumeMic()
        speakingRef.current = false
        dispatch(setSpeaking(false))
        echoGuardUntilRef.current = Date.now() + estimateEchoCooldownMs(spoken, 320)
        scheduleResumeListening(120)
      }
    },
    [voiceSettings, dispatch, stopRecognition, pauseMicForSpeech, scheduleResumeListening]
  )

  const speakProactive = useCallback(
    (text) => speak(text),
    [speak]
  )

  useBatteryReminder({ speak: speakProactive, enabled: sessionActive })

  useEffect(() => {
    if (!sessionActive) return undefined
    const onTimerDone = (event) => {
      const message = event.detail?.message
      if (message) speakProactive(message)
    }
    window.addEventListener(TIMER_DONE_EVENT, onTimerDone)
    return () => window.removeEventListener(TIMER_DONE_EVENT, onTimerDone)
  }, [sessionActive, speakProactive])

  const deliverBossWelcome = useCallback(
    async (cmdGen) => {
      if (cmdGen !== commandGenerationRef.current) return
      processingRef.current = true
      try {
        const briefing = await buildBossWelcomeBriefing()
        if (cmdGen !== commandGenerationRef.current) return
        await speak(briefing, cmdGen)
      } finally {
        if (cmdGen === commandGenerationRef.current) {
          processingRef.current = false
        }
      }
    },
    [speak]
  )

  const handleIncomingSpeech = useCallback(
    (text, { isFinal = true } = {}) => {
      const heard = String(text || '').trim()
      if (!heard) return

      dispatch(setTranscript(heard))

      const { enabled } = getWakeConfig()
      const engaged = Date.now() < engagedUntilRef.current
      const wake = classifyWakeInput(heard, {
        speaking: speakingRef.current,
        processing: processingRef.current,
      })

      if (wake.action === 'interrupt') {
        ttsService.stop()
        speakingRef.current = false
        dispatch(setSpeaking(false))
        commandGenerationRef.current += 1
        engagedUntilRef.current = Date.now() + ENGAGED_WINDOW_MS
        const cmdGen = ++commandGenerationRef.current
        if (wake.command) {
          handleCommandRef.current(wake.command, cmdGen)
        } else {
          void deliverBossWelcome(cmdGen)
        }
        return
      }

      if (enabled && !engaged) {
        if (wake.action === 'none') return
        if (!isFinal) return
        engagedUntilRef.current = Date.now() + ENGAGED_WINDOW_MS
        const cmdGen = ++commandGenerationRef.current
        if (wake.command) {
          handleCommandRef.current(wake.command, cmdGen)
        } else {
          void deliverBossWelcome(cmdGen)
        }
        return
      }

      if (!isFinal) return
      if (!shouldAcceptCommandRef.current(heard)) return

      engagedUntilRef.current = Date.now() + ENGAGED_WINDOW_MS
      const cmdGen = ++commandGenerationRef.current
      const command = stripWakeWord(heard) || heard
      handleCommandRef.current(command, cmdGen)
    },
    [dispatch, deliverBossWelcome]
  )

  const handleCommand = useCallback(
    async (command, cmdGen) => {
      if (!command?.trim() || cmdGen !== commandGenerationRef.current) return
      if (!shouldAcceptCommand(command)) return

      lastCommandTextRef.current = command.trim()
      lastCommandAtRef.current = Date.now()
      processingRef.current = true
      dispatch(setTranscript(''))

      try {
        const result = await dispatch(processVoiceCommand(command)).unwrap()
        if (cmdGen !== commandGenerationRef.current) return

        const actionKey = buildActionKey(result.intent, result.aiData)
        if (isDuplicateAction(actionKey, lastActionRef.current)) {
          return
        }
        lastActionRef.current = { key: actionKey, at: Date.now() }

        await executeIntent(result.intent, result.aiData, (line) => speak(line, cmdGen))
      } catch (e) {
        if (cmdGen === commandGenerationRef.current) {
          const msg = typeof e === 'string' ? e : e?.message
          if (msg?.trim()) await speak(msg, cmdGen)
        }
      } finally {
        if (cmdGen === commandGenerationRef.current) {
          processingRef.current = false
          if (!speakingRef.current) scheduleResumeListening(200)
        }
      }
    },
    [dispatch, speak, shouldAcceptCommand, scheduleResumeListening]
  )

  const handleCommandRef = useRef(handleCommand)
  useEffect(() => {
    handleCommandRef.current = handleCommand
  }, [handleCommand])

  const shouldAcceptCommandRef = useRef(shouldAcceptCommand)
  useEffect(() => {
    shouldAcceptCommandRef.current = shouldAcceptCommand
  }, [shouldAcceptCommand])

  const showSpeechError = useCallback((errorCode) => {
    if (!errorCode || errorCode === 'aborted' || errorCode === 'no-speech') return
    const now = Date.now()
    if (now - lastSpeechErrorRef.current < 2500) return
    lastSpeechErrorRef.current = now

    if (errorCode === 'not-allowed' || errorCode === 'service-not-allowed') {
      if (micGrantedRef.current) return
      toast.error(
        `Speech blocked for ${getMicPermissionHint()}. Allow microphone for this exact URL in browser settings.`,
        { duration: 8000 }
      )
      return
    }

    const msg = SPEECH_ERRORS[errorCode]
    if (msg) toast.error(msg, { duration: 6000 })
  }, [])

  useEffect(() => {
    if (!sessionActive) return undefined

    if (useWhisper) {
      const stream = getActiveMicStream()
      if (!stream) {
        toast.error('Microphone not ready. Tap mic again and allow access.')
        setSessionActive(false)
        return undefined
      }

      whisperStopRef.current = startWhisperListenLoop({
        stream,
        shouldContinue: () => sessionActiveRef.current,
        isPaused: () =>
          speakingRef.current ||
          processingRef.current ||
          Date.now() < echoGuardUntilRef.current,
        onTranscript: (text) => {
          handleIncomingSpeech(text, { isFinal: true })
        },
        onListeningChange: (on) => dispatch(setListening(on)),
        onError: (e) => {
          if (!sessionActiveRef.current) return
          if (e?.code === 'OPENAI_QUOTA' || isOpenAIQuotaError(e?.message)) {
            toast.error(formatBrainError(e?.message, 'openai'), { duration: 12000 })
            setSttMode('webspeech')
            return
          }
          const now = Date.now()
          if (now - lastSpeechErrorRef.current < 4000) return
          lastSpeechErrorRef.current = now
          toast.error(e?.message || 'Voice recognition failed', { duration: 7000 })
        },
      })

      return () => {
        whisperStopRef.current?.()
        whisperStopRef.current = null
        dispatch(setListening(false))
      }
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast.error('Voice not supported here. On iPhone add ChatGPT key in Settings — Raj uses Whisper.')
      setSessionActive(false)
      return undefined
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = voiceSettings.language || 'en-IN'
    recognitionRef.current = recognition

    recognition.onresult = (event) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) final += t
        else interim += t
      }

      const heard = (final || interim).trim()
      if (!heard) return

      const guardActive = Date.now() < echoGuardUntilRef.current
      if (
        guardActive &&
        !containsWakeWord(heard) &&
        looksLikeAssistantEcho(heard, lastSpokenTextRef.current, true)
      ) {
        return
      }

      if (final.trim()) {
        handleIncomingSpeech(final.trim(), { isFinal: true })
      } else {
        dispatch(setTranscript(heard))
      }
    }

    recognition.onerror = (e) => {
      showSpeechError(e.error)
    }

    recognition.onend = () => {
      if (!sessionActiveRef.current) {
        dispatch(setListening(false))
        return
      }
      if (speakingRef.current || processingRef.current || Date.now() < echoGuardUntilRef.current) {
        dispatch(setListening(false))
        scheduleResumeListening(250)
        return
      }
      startRecognition()
    }

    recognition.onstart = () => {
      dispatch(setListening(true))
    }

    try {
      recognition.start()
    } catch {
      toast.error('Could not start speech recognition. Tap the mic again.')
      setSessionActive(false)
    }

    return () => {
      clearResumeTimer()
      try {
        recognition.stop()
      } catch {}
      recognitionRef.current = null
      dispatch(setListening(false))
    }
  }, [
    sessionActive,
    voiceSettings.language,
    dispatch,
    showSpeechError,
    useWhisper,
    sttMode,
    clearResumeTimer,
    scheduleResumeListening,
    startRecognition,
    handleIncomingSpeech,
  ])

  useEffect(() => {
    if (!isLive) {
      setLevels([0.15, 0.25, 0.35, 0.25, 0.15])
      return undefined
    }
    const tick = () => {
      const base = isSpeaking ? 0.7 : 0.45
      setLevels(Array.from({ length: 7 }, () => 0.15 + Math.random() * base))
    }
    tick()
    animRef.current = setInterval(tick, 120)
    return () => clearInterval(animRef.current)
  }, [isLive, isSpeaking, isListening])

  const startSession = async () => {
    if (starting || sessionActive) return

    migrateBrainSettings()
    if (getBrainProvider() !== 'openai') clearQuotaExceededCache()
    setBrainInfo(getActiveProviderInfo())
    migrateVoiceSettings()
    resetVoiceSessionRefs()
    engagedUntilRef.current = 0
    void restoreVoiceTimers()

    if (!hasBrainReady() && getActiveProviderInfo().id !== 'keyword') {
      toast.error('Brain not linked yet. Pull down to refresh the page — Gemini should auto-connect.', { duration: 8000 })
      setSettingsOpen(true)
      return
    }

    if (!isSecureMicContext()) {
      toast.error(getPhoneSetupHint(), { duration: 12000 })
      return
    }

    if (!useWhisper && !(window.SpeechRecognition || window.webkitSpeechRecognition)) {
      toast.error('Voice not supported. On iPhone, add ChatGPT API key in Settings.')
      return
    }

    setStarting(true)
    lastSpeechErrorRef.current = 0
    commandGenerationRef.current = 0

    try {
      await primeAudioForSession()
      if (useWhisper || !isIOSDevice()) {
        const stream = await requestMicrophoneAccess({ required: true })
        micGrantedRef.current = Boolean(stream)
      } else {
        micGrantedRef.current = true
      }
      void warmUpEdgeTts()
      void warmUpChatterbox()
    } catch (e) {
      micGrantedRef.current = false
      toast.error(e?.message || 'Microphone access denied', { duration: 10000 })
      setStarting(false)
      return
    }

    setSessionActive(true)
    setSessionStartedAt(Date.now())
    setStarting(false)
  }

  const endSession = () => {
    commandGenerationRef.current += 1
    ttsService.stop()
    clearResumeTimer()
    resetVoiceSessionRefs()
    sessionActiveRef.current = false
    setSessionStartedAt(null)
    setSessionActive(false)
    micGrantedRef.current = false
    dispatch(setSpeaking(false))
    dispatch(setTranscript(''))
    dispatch(stopSpeaking())
    releaseMicrophoneStream()
    whisperStopRef.current?.()
    whisperStopRef.current = null
    try {
      recognitionRef.current?.stop()
    } catch {}
  }

  const wakeEnabled = getWakeConfig().enabled
  const statusText = starting
    ? 'Requesting microphone…'
    : !sessionActive
      ? 'Tap to activate'
      : mode === 'speaking'
        ? wakeEnabled
          ? 'Speaking… say Jarvis to interrupt'
          : 'Speaking…'
        : mode === 'thinking'
          ? 'Thinking…'
          : mode === 'listening'
            ? wakeEnabled
              ? 'Say Jarvis, Boss…'
              : 'Listening…'
            : wakeEnabled
              ? 'Say Jarvis, Boss…'
              : 'Ready'

  return (
    <Box className="jarvis-root">
      <div className="jarvis-grid" aria-hidden />
      <div className="jarvis-glow jarvis-glow--top" aria-hidden />
      <div className="jarvis-glow jarvis-glow--bottom" aria-hidden />

      <IconButton className="jarvis-settings-btn" onClick={() => setSettingsOpen(true)} aria-label="Settings">
        <Settings sx={{ fontSize: 22 }} />
      </IconButton>

      <JarvisHud sessionActive={sessionActive} sessionStartedAt={sessionStartedAt} />
      <EmailDraftOverlay />

      <Box className="jarvis-center">
        <Typography className="jarvis-brand" component="h1">
          JARVIS
        </Typography>
        <Typography className="jarvis-tagline">
          {brainReady ? `${brainInfo.label} · calls you Boss · say Jarvis` : 'Add brain key in Settings'}
        </Typography>

        <Box className="jarvis-orb-container">
          <span className={`jarvis-ring jarvis-ring--1 ${isLive ? 'is-active' : ''}`} />
          <span className={`jarvis-ring jarvis-ring--2 ${isLive ? 'is-active' : ''}`} />
          <span className={`jarvis-ring jarvis-ring--3 ${isLive ? 'is-active' : ''}`} />
          <Box className={`jarvis-core ${isLive ? `jarvis-core--${mode === 'thinking' ? 'listening' : mode}` : ''}`}>
            <Box className="jarvis-visualizer">
              {levels.map((h, i) => (
                <span key={i} className="jarvis-bar" style={{ transform: `scaleY(${isLive ? h : 0.2})` }} />
              ))}
            </Box>
          </Box>
        </Box>

        <Typography className={`jarvis-status ${isLive ? 'jarvis-status--live' : ''}`}>{statusText}</Typography>

        <Collapse in={Boolean(transcript) && sessionActive}>
          <Fade in>
            <Typography className="jarvis-transcript-user" sx={{ mt: 1, px: 2, textAlign: 'center' }}>
              You — {transcript}
            </Typography>
          </Fade>
        </Collapse>
      </Box>

      <Box className="jarvis-controls">
        <button
          type="button"
          className={`jarvis-talk-btn ${sessionActive ? 'jarvis-talk-btn--active' : ''}`}
          onClick={() => (sessionActive ? endSession() : startSession())}
          disabled={starting}
          aria-label={sessionActive ? 'End session' : 'Start session'}
        >
          <span className="jarvis-talk-btn-inner">
            {sessionActive ? <CallEnd sx={{ fontSize: 32 }} /> : <MicNone sx={{ fontSize: 36 }} />}
          </span>
        </button>
        <Typography className="jarvis-hint">
          {sessionActive ? 'Say “Jarvis” anytime — try “Jarvis, set a 5 minute timer”' : 'Tap mic · allow microphone when asked'}
        </Typography>
      </Box>

      <JarvisSettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Box>
  )
}

export default FreeAssistantHome
