import { getGoogleConnectionStatus } from '../services/googleIntegration'
import { getUserSystemPromptOverride, isPromptOverrideEnabled } from './elevenlabsStorage'

/** Built-in fallback prompt via env only. */
export function shouldUseRajBuiltinPromptOverride() {
  return import.meta.env.VITE_RAJ_USE_PROMPT_OVERRIDE === 'true'
}

export function getActiveSystemPromptOverride() {
  const userPrompt = getUserSystemPromptOverride()
  if (userPrompt && isPromptOverrideEnabled()) return userPrompt
  if (shouldUseRajBuiltinPromptOverride()) return buildRajSystemPrompt()
  return null
}

/**
 * Optional system prompt override (off by default once you manage prompt on ElevenLabs).
 */
export function buildRajSystemPrompt() {
  const { connected, configured } = getGoogleConnectionStatus()

  const googleLine = !configured
    ? 'Google is NOT configured — tell the user to add a Client ID in Settings, then say connect Google.'
    : connected
      ? 'Google Gmail and Calendar are ALREADY connected for this user. You have live API access via client tools.'
      : 'Google is configured but not connected this session — call connect_google first, then read_emails or read_calendar.'

  return `You are Raj, a Jarvis-style personal voice assistant running on the user's iPhone web app.

CRITICAL — EMAIL AND CALENDAR:
- You DO have access to the user's Gmail and Google Calendar when connected. ${googleLine}
- NEVER say you cannot access personal email, cannot check inboxes, or refuse for privacy/security. That is wrong for this app.
- When the user asks about emails, inbox, unread mail, recent messages, or "what did X email say" → you MUST call the client tool read_emails (set unread: true for unread-only). Wait for the tool result, then summarize it naturally in speech.
- When they ask to send email via Gmail API → call send_gmail with to, subject, body.
- When they ask about schedule, meetings, calendar, what's on tomorrow → call read_calendar. Wait for results, then speak them.
- To create an event → call create_calendar_event with title, startTime, durationMinutes, optional attendeeEmail.
- To open the Gmail app on the phone → open_gmail. For draft in Mail app → compose_email.

OTHER CLIENT TOOLS:
- open_whatsapp, open_messages — open real apps with prefilled text (user taps Send).
- open_calendar — opens Calendar app.
- open_app — maps, instagram, spotify, etc.
- get_weather — current weather.
- connect_google — OAuth if not connected.

STYLE:
- Warm, concise, human — like a trusted chief of staff. No robotic disclaimers.
- After a tool returns, use ONLY that data — do not invent emails or events.
- If a tool errors, explain briefly and suggest Settings → Connect Google.

Never mention being "an AI" that lacks access. You are Raj with tools on their device.`
}

export function buildRajDynamicVariables() {
  const { connected, configured } = getGoogleConnectionStatus()
  return {
    google_connected: connected ? 'yes' : 'no',
    google_configured: configured ? 'yes' : 'no',
  }
}

/** Session extras: dynamic vars always; prompt override when set in Settings or env. */
export function buildRajConversationSessionConfig() {
  const config = {
    dynamicVariables: buildRajDynamicVariables(),
  }

  const promptOverride = getActiveSystemPromptOverride()
  if (promptOverride) {
    config.overrides = {
      agent: {
        prompt: {
          prompt: promptOverride,
        },
      },
    }
  }

  return config
}

/** Minimal config if full session fails (e.g. override blocked after publish). */
export function buildRajFallbackSessionConfig() {
  return {
    dynamicVariables: buildRajDynamicVariables(),
  }
}

export function formatElevenLabsSessionError(error) {
  const msg = error instanceof Error ? error.message : String(error || 'Connection failed')

  if (/quota|exceeds your quota|rate.?limit|usage limit|insufficient credits/i.test(msg)) {
    return (
      'ElevenLabs quota exceeded — your plan limit for voice/conversations is used up. ' +
      'Check usage at elevenlabs.io (Profile → Subscription / Usage), upgrade your plan, or wait for the monthly reset. ' +
      'Raj cannot start new voice sessions until ElevenLabs allows more requests.'
    )
  }
  if (/401|authentication enabled|signed url|conversation token/i.test(msg)) {
    return 'ElevenLabs agent requires authentication. Add your ElevenLabs API key in Settings (xi-api-key from elevenlabs.io).'
  }
  if (/override|conversation_config/i.test(msg)) {
    return 'Session rejected (prompt override blocked). The app will retry without override — refresh and tap again. Or enable overrides on your ElevenLabs agent.'
  }
  if (/403|404|agent/i.test(msg)) {
    return `${msg} — Check agent ID and that the agent is published on ElevenLabs.`
  }
  return msg
}
