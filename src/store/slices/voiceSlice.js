import { resolveBrainConfig } from '../../constants/aiProviders'
import ttsService, { unlockAudioPlayback } from '../../services/ttsService'
import {
  getTtsOptions,
  loadVoiceUi,
  saveVoiceUi,
  migrateVoiceSettings,
} from '../../utils/voiceSettings'
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import aiBrainService from '../../services/aiBrainService'
import { parseOpenAppCommand } from '../../services/actionRouter'
import { parseMediaCommand } from '../../services/mediaCommandParser'
import { formatBrainError, isOpenAIQuotaError } from '../../utils/openaiErrors'
import {
  enrichBrainCommand,
  parseMessagingCommand,
  parsePendingReply,
  parseSessionCommand,
} from '../../services/messageCommandParser'
import { getActionSession, setPendingAction, clearPendingAction } from '../../utils/actionSession'
import {
  getBatterySnapshot,
  parseBatteryReport,
  reportBatteryLevel,
} from '../../utils/batteryService'
import { parseUtilityCommand } from '../../services/utilityCommands'

export const startVoiceRecognition = createAsyncThunk(
  'voice/startVoiceRecognition',
  async (_, { rejectWithValue }) => {
    try {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        throw new Error('Speech recognition not supported in this browser')
      }
      migrateVoiceSettings()
      return true
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

const FAST_INTENTS = new Set([
  'open_app',
  'open_calendar',
  'weather',
  'read_calendar',
  'read_emails',
  'help',
  'show_time',
  'show_date',
  'set_timer',
  'list_timers',
  'cancel_timers',
  'tell_joke',
  'sing_song',
  'calculate',
  'open_reminders',
])
const SESSION_INTENTS = new Set(['session_confirm', 'session_continue', 'session_cancel'])

function basicIntent(command) {
  const lower = command.toLowerCase().trim()
  if (!lower) return null
  if (/weather|temperature|rain/.test(lower)) return { intent: 'weather' }
  if (/calendar|schedule|agenda|meeting/.test(lower) && /read|what|tell|check|upcoming/.test(lower)) {
    return { intent: 'read_calendar' }
  }
  if (/email|mail|inbox/.test(lower) && /read|check|what|any|unread|recent/.test(lower)) {
    return { intent: 'read_emails' }
  }
  if (/open calendar/.test(lower)) return { intent: 'open_calendar' }
  const appName = parseOpenAppCommand(lower)
  if (appName) return { intent: 'open_app', appName }
  if (/help|what can you/.test(lower)) return { intent: 'help' }
  return null
}

function buildCommandResult(command, intent, aiData, usedBrain = false) {
  return {
    original: command,
    processed: command.toLowerCase(),
    intent,
    aiData,
    confidence: usedBrain ? 0.9 : 0.75,
    usedChatGpt: usedBrain,
    timestamp: new Date().toISOString(),
  }
}

function isLikelyNoiseTranscript(command) {
  const text = (command || '').trim()
  if (!text) return true
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 1 && text.length < 4) return true
  if (/^(uh|um|ah|oh|hmm|hey|hi|hello|ok|okay|yes|no|the|a|an)$/i.test(text)) return true
  return false
}

export const processVoiceCommand = createAsyncThunk(
  'voice/processVoiceCommand',
  async (command, { rejectWithValue }) => {
    try {
      if (isLikelyNoiseTranscript(command)) {
        return rejectWithValue('')
      }

      const provider = aiBrainService.getProvider()

      const batteryReport = parseBatteryReport(command)
      if (batteryReport) {
        reportBatteryLevel(batteryReport.level, batteryReport.charging)
        return buildCommandResult(
          command,
          'general_chat',
          {
            responseText: `Noted, Boss. Battery at ${batteryReport.level} percent${batteryReport.charging ? ', and charging' : ''}.`,
          },
          false
        )
      }

      if (/what('s| is)\s+my\s+battery|battery\s+level|how\s+much\s+battery/i.test(command)) {
        const snap = getBatterySnapshot()
        let responseText = "Boss, battery information isn't available yet."
        if (snap.level != null) {
          responseText = `You're at ${snap.level} percent, Boss${snap.charging ? ', and charging nicely' : ''}.`
        } else if (snap.source === 'reported' && snap.level != null) {
          responseText = `Last reported at ${snap.level} percent, Boss${snap.charging ? ', charging' : ''}.`
        } else if (isIOSDevice()) {
          responseText =
            "Boss, I can't read iPhone battery from the browser. Glance at the status bar, or say battery is 45 percent once and I'll track it."
        }
        return buildCommandResult(command, 'general_chat', { responseText }, false)
      }

      const sessionCmd = parseSessionCommand(command)
      if (sessionCmd) {
        if (sessionCmd.intent === 'session_refine' && provider !== 'keyword' && aiBrainService.hasBrain()) {
          const pending = getActionSession()?.pending
          if (pending?.status === 'awaiting_confirm') {
            const refined = await aiBrainService.processCommand(
              `Improve this email draft for ${pending.toName || pending.displayName}. Subject: ${pending.subject}. Body: ${pending.body}. User feedback: ${command}`
            )
            const merged = {
              ...pending,
              ...refined,
              to: refined.to || pending.to,
              toName: refined.toName || pending.toName,
              awaitConfirm: true,
              confirmed: false,
              status: 'awaiting_confirm',
            }
            setPendingAction(merged)
            return buildCommandResult(command, 'compose_email', merged, true)
          }
        }
        return buildCommandResult(command, sessionCmd.intent, sessionCmd, false)
      }

      const media = parseMediaCommand(command)
      if (media) {
        return buildCommandResult(command, 'open_app', media, false)
      }

      const utility = parseUtilityCommand(command)
      if (utility && (!utility.preferBrain || provider === 'keyword')) {
        return buildCommandResult(command, utility.intent, utility, false)
      }

      const pendingReply = parsePendingReply(command)
      if (pendingReply) {
        clearPendingAction()
        return buildCommandResult(command, pendingReply.intent, pendingReply, false)
      }

      const messaging = parseMessagingCommand(command)
      if (messaging) {
        const canSkipBrain =
          (messaging.intent === 'send_whatsapp' || messaging.intent === 'send_sms') &&
          !messaging.needsMessage &&
          messaging.rewrittenText

        if (canSkipBrain) {
          return buildCommandResult(command, messaging.intent, messaging, false)
        }

        if (messaging.needsMessage && messaging.intent !== 'compose_email') {
          return buildCommandResult(command, messaging.intent, messaging, false)
        }

        if (messaging.intent === 'compose_email' && provider !== 'keyword' && aiBrainService.hasBrain()) {
          const aiData = await aiBrainService.processCommand(enrichBrainCommand(command, messaging))
          const merged = {
            ...messaging,
            ...aiData,
            intent: 'compose_email',
            to: aiData.to || messaging.to,
            toName: aiData.toName || messaging.toName,
            subject: aiData.subject || messaging.subject,
            body: aiData.body || aiData.rewrittenText || messaging.body,
            awaitConfirm: aiData.awaitConfirm !== false,
            confirmed: false,
          }
          return buildCommandResult(command, 'compose_email', merged, true)
        }
      }

      const quick = basicIntent(command)
      let aiData = quick && FAST_INTENTS.has(quick.intent) ? quick : utility?.preferBrain ? null : utility

      if (!aiData && provider !== 'keyword' && !parseMediaCommand(command)) {
        try {
          aiData = await aiBrainService.processCommand(command)
        } catch (e) {
          if (e.message === 'KEYWORD_ONLY') {
            aiData = null
          } else {
            const fallback = basicIntent(command) || parseUtilityCommand(command) || messaging
            if (fallback) {
              console.warn('AI brain failed, keyword fallback:', e.message)
              aiData = { ...fallback, quotaFallback: isOpenAIQuotaError(e.message) }
            } else {
              return rejectWithValue(formatBrainError(e.message, aiBrainService.getProvider()) || 'AI could not process that command.')
            }
          }
        }
      }

      const fallback = basicIntent(command)
      const intent = aiData?.intent || fallback?.intent || messaging?.intent || 'help'
      const merged = { ...fallback, ...messaging, ...aiData, intent }

      if (provider === 'keyword' && !fallback && !messaging && !utility && !SESSION_INTENTS.has(intent)) {
        return buildCommandResult(command, 'help', {
          intent: 'help',
          responseText:
            'Basic mode understands weather, apps, time, timers, jokes, and calendar. Pick Ollama or Gemini in Settings for full conversation.',
        }, false)
      }

      if (provider !== 'keyword' && !aiBrainService.hasBrain() && !fallback && !messaging) {
        return rejectWithValue('Add a free Gemini or Groq API key in Settings → AI Brain.')
      }

      return buildCommandResult(command, merged.intent, merged, Boolean(aiData && !quick))
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

export const speakText = createAsyncThunk(
  'voice/speakText',
  async (text, { rejectWithValue, getState }) => {
    try {
      const state = getState()
      const ui = { ...loadVoiceUi(), ...state.voice?.settings }
      if (!ui.autoSpeak) return { text, skipped: true }

      await unlockAudioPlayback()
      const opts = getTtsOptions({
        rate: ui.rate,
        pitch: ui.pitch,
        volume: ui.volume,
        lang: ui.language,
      })
      const result = await ttsService.speak(text, opts)
      return { text, engine: result?.engine }
    } catch (error) {
      return rejectWithValue(error?.message || 'Could not play speech')
    }
  }
)

export const stopSpeaking = createAsyncThunk('voice/stopSpeaking', async () => {
  ttsService.stop()
  return true
})

const savedUi = loadVoiceUi()

const initialState = {
  isListening: false,
  isSupported: false,
  transcript: '',
  isProcessing: false,
  lastCommand: null,
  voiceHistory: [],
  isSpeaking: false,
  lastSpokenText: '',
  error: null,
  settings: savedUi,
}

const voiceSlice = createSlice({
  name: 'voice',
  initialState,
  reducers: {
    setListening: (state, action) => { state.isListening = action.payload },
    setTranscript: (state, action) => { state.transcript = action.payload },
    addToHistory: (state, action) => {
      state.voiceHistory.unshift(action.payload)
      if (state.voiceHistory.length > 50) state.voiceHistory.pop()
    },
    clearTranscript: (state) => { state.transcript = '' },
    setVoiceSettings: (state, action) => {
      state.settings = { ...state.settings, ...action.payload }
      saveVoiceUi(state.settings)
    },
    setSpeaking: (state, action) => { state.isSpeaking = action.payload },
    clearError: (state) => { state.error = null },
  },
  extraReducers: (builder) => {
    builder
      .addCase(startVoiceRecognition.fulfilled, (state) => {
        state.isSupported = true
        state.error = null
      })
      .addCase(startVoiceRecognition.rejected, (state, action) => {
        state.isSupported = false
        state.error = action.payload
      })
      .addCase(processVoiceCommand.pending, (state) => {
        state.isProcessing = true
        state.error = null
      })
      .addCase(processVoiceCommand.fulfilled, (state, action) => {
        state.isProcessing = false
        state.lastCommand = action.payload
        state.voiceHistory.unshift(action.payload)
        if (state.voiceHistory.length > 50) state.voiceHistory.pop()
      })
      .addCase(processVoiceCommand.rejected, (state, action) => {
        state.isProcessing = false
        state.error = action.payload
      })
      .addCase(speakText.pending, (state, action) => {
        state.isSpeaking = true
        state.lastSpokenText = action.meta.arg || ''
        state.error = null
      })
      .addCase(speakText.fulfilled, (state) => { state.isSpeaking = false })
      .addCase(speakText.rejected, (state, action) => {
        state.isSpeaking = false
        state.error = action.payload
      })
      .addCase(stopSpeaking.fulfilled, (state) => { state.isSpeaking = false })
  },
})

export const {
  setListening,
  setTranscript,
  addToHistory,
  clearTranscript,
  setVoiceSettings,
  setSpeaking,
  clearError,
} = voiceSlice.actions

export default voiceSlice.reducer

export const selectIsListening = (state) => state.voice.isListening
export const selectIsSupported = (state) => state.voice.isSupported
export const selectTranscript = (state) => state.voice.transcript
export const selectIsProcessing = (state) => state.voice.isProcessing
export const selectLastCommand = (state) => state.voice.lastCommand
export const selectVoiceHistory = (state) => state.voice.voiceHistory
export const selectIsSpeaking = (state) => state.voice.isSpeaking
export const selectLastSpokenText = (state) => state.voice.lastSpokenText
export const selectVoiceError = (state) => state.voice.error
export const selectVoiceSettings = (state) => state.voice.settings
