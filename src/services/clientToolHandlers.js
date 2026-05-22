/**
 * Client tools for ElevenLabs agent — iPhone apps + Google API integrations.
 * Tool names must match your ElevenLabs agent dashboard (or aliases below).
 */
import {
  openWhatsApp,
  openSms,
  openComposeEmail,
  openApp,
  openCalendarApp,
  openUrl,
  isMacDesktop,
} from './actionRouter'
import { getWeatherByCoords } from './weatherService'
import {
  connectGoogle,
  summarizeInbox,
  sendGmailMessage,
  summarizeCalendar,
  createCalendarEvent,
  isGoogleConfigured,
} from './googleIntegration'

function str(v) {
  return v == null ? '' : String(v)
}

export const CLIENT_TOOL_NAMES = [
  'connect_google',
  'read_emails',
  'send_gmail',
  'read_calendar',
  'create_calendar_event',
  'open_gmail',
  'open_whatsapp',
  'open_messages',
  'compose_email',
  'open_calendar',
  'open_app',
  'get_weather',
]

/** Optional — set by AssistantHome during voice session to reduce idle timeouts. */
let sessionActivityPing = null

export function setClientToolActivityPing(fn) {
  sessionActivityPing = typeof fn === 'function' ? fn : null
}

async function withSessionActivity(work) {
  sessionActivityPing?.()
  return work()
}

export async function runClientTool(name, parameters = {}) {
  const p = parameters || {}
  const tool = name.toLowerCase().replace(/\s+/g, '_')

  switch (tool) {
    case 'connect_google':
    case 'google_connect':
    case 'connect_gmail': {
      if (!isGoogleConfigured()) {
        return 'Google is not set up yet. Open Settings and add your Google OAuth Client ID, then try again.'
      }
      await connectGoogle()
      return 'Google is connected. I can now read your emails, send mail, and manage your calendar.'
    }

    case 'read_emails':
    case 'check_emails':
    case 'summarize_inbox':
    case 'read_inbox':
    case 'list_emails': {
      try {
        return await withSessionActivity(() =>
          summarizeInbox({
            max: Number(p.max || p.limit) || 5,
            unreadOnly: Boolean(p.unreadOnly || p.unread),
          })
        )
      } catch (e) {
        return `Gmail error: ${e?.message || e}. Connect Google in Settings before asking about email.`
      }
    }

    case 'send_gmail':
    case 'send_email_api':
    case 'gmail_send': {
      return await sendGmailMessage({
        to: p.to || p.recipient || p.email,
        subject: p.subject || '',
        body: p.body || p.message || p.rewrittenText || '',
      })
    }

    case 'read_calendar':
    case 'check_calendar':
    case 'calendar_events':
    case 'get_calendar':
    case 'list_calendar': {
      try {
        return await withSessionActivity(() =>
          summarizeCalendar({ max: Number(p.max || p.limit) || 8 })
        )
      } catch (e) {
        return `Calendar error: ${e?.message || e}. Connect Google in Settings before asking about your schedule.`
      }
    }

    case 'create_calendar_event':
    case 'schedule_event':
    case 'create_event': {
      return await createCalendarEvent({
        title: p.title || p.summary || 'Meeting',
        startTime: p.startTime || p.start || p.datetime,
        durationMinutes: Number(p.durationMinutes || p.duration) || 60,
        description: p.description || '',
        location: p.location || '',
        attendeeEmail: p.attendeeEmail || p.attendee || p.email,
      })
    }

    case 'open_gmail': {
      const result = openApp('gmail')
      return result.message
    }

    case 'open_whatsapp':
    case 'send_whatsapp': {
      const text = str(p.message || p.text || p.rewrittenText)
      openWhatsApp({ text, phone: p.phone })
      return `Opened WhatsApp${p.contact ? ` for ${p.contact}` : ''}. Tap send when ready.`
    }

    case 'open_messages':
    case 'send_sms':
    case 'send_message': {
      const text = str(p.message || p.text || p.rewrittenText)
      openSms({ text, phone: p.phone })
      return 'Opened Messages with your text ready.'
    }

    case 'compose_email': {
      openComposeEmail({
        to: p.to || p.recipient,
        subject: p.subject || '',
        body: p.body || p.message || p.rewrittenText || '',
        useGmail: p.useGmail !== false,
      })
      return 'Opened mail app with your draft ready.'
    }

    case 'open_calendar': {
      openCalendarApp()
      return isMacDesktop() ? 'Opening Calendar in your browser.' : 'Opening Calendar.'
    }

    case 'open_app': {
      const app = str(p.appName || p.app || 'app')
      const result = openApp(app)
      return result.message
    }

    case 'call_contact': {
      if (p.phone) {
        openUrl(`tel:${str(p.phone).replace(/\s/g, '')}`)
        return `Calling ${p.contact || p.phone} now.`
      }
      return 'I need a phone number to place the call.'
    }

    case 'get_weather':
    case 'weather': {
      return await getWeatherByCoords()
    }

    default:
      return `Unknown tool "${name}". Available: ${CLIENT_TOOL_NAMES.join(', ')}`
  }
}

const TOOL_ALIASES = {
  connect_google: ['google_connect', 'connect_gmail', 'link_google'],
  read_emails: ['check_emails', 'summarize_inbox', 'read_inbox', 'list_emails'],
  send_gmail: ['send_email_api', 'gmail_send', 'email_send'],
  read_calendar: ['check_calendar', 'calendar_events', 'list_calendar'],
  create_calendar_event: ['schedule_event', 'create_event', 'add_calendar_event'],
  open_gmail: ['launch_gmail', 'gmail_app'],
  open_whatsapp: ['send_whatsapp', 'whatsapp'],
  open_messages: ['send_sms', 'send_message', 'text_message'],
  compose_email: ['draft_email', 'email_draft'],
  get_weather: ['weather', 'check_weather'],
}

export function buildElevenLabsClientTools() {
  const tools = {}
  for (const name of CLIENT_TOOL_NAMES) {
    const run = (parameters) => runClientTool(name, parameters)
    tools[name] = run
    for (const alias of TOOL_ALIASES[name] || []) {
      tools[alias] = run
    }
  }
  return tools
}
