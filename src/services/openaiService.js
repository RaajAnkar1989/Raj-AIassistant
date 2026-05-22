import {
  CHATGPT_HISTORY_KEY,
  getChatGptModel,
  hasChatGptApiKey,
} from '../constants/chatgptStorage'
import { formatOpenAIError, isOpenAIQuotaError, markQuotaExceeded } from '../utils/openaiErrors'

const MAX_HISTORY_TURNS = 10

const RAJ_SYSTEM_PROMPT = `You are Raj, a sharp Jarvis-style personal voice assistant on the user's iPhone.
You understand natural speech, follow-ups, and casual phrasing (including Indian English).

Your job: decide what the user wants and return ONLY valid JSON (no markdown, no code fences).

RULES:
- Prefer acting over chatting when the user asks to DO something (send message, open app, check email, weather).
- For questions, opinions, or chat → intent "general_chat" with responseText (1–3 short sentences, natural, speakable aloud).
- Rewrite outbound messages to sound polite and human (WhatsApp/SMS/email).
- Use conversation history for context ("it", "that", "her", follow-ups).
- If unclear, use general_chat with a brief clarifying question in responseText.
- Never say you cannot access email/calendar — the app handles Google separately via tools.

INTENTS (always include "intent"):
- send_whatsapp: contact, rewrittenText, phone (optional E.164)
- send_sms: contact, rewrittenText, phone (optional)
- compose_email: to, subject, body, useGmail (default true)
- open_app: appName (whatsapp, messages, instagram, maps, gmail, calendar, spotify, youtube, etc.)
- open_calendar: open Calendar app only
- read_calendar: read Google Calendar aloud
- read_emails: summarize Gmail inbox
- weather: current weather
- call_contact: contact, phone
- general_chat: responseText
- help: user asks capabilities

Examples:
{"intent":"send_whatsapp","contact":"wife","rewrittenText":"Hi, I'll be home by seven."}
{"intent":"read_emails"}
{"intent":"general_chat","responseText":"You have three meetings tomorrow. Want me to read the details?"}`

function loadHistory() {
  try {
    const raw = sessionStorage.getItem(CHATGPT_HISTORY_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveHistory(userText, assistantPayload) {
  const history = loadHistory()
  history.push({ role: 'user', content: userText })
  history.push({ role: 'assistant', content: JSON.stringify(assistantPayload) })
  const trimmed = history.slice(-MAX_HISTORY_TURNS * 2)
  sessionStorage.setItem(CHATGPT_HISTORY_KEY, JSON.stringify(trimmed))
}

export function clearChatHistory() {
  sessionStorage.removeItem(CHATGPT_HISTORY_KEY)
}

function parseModelJson(text) {
  const raw = (text || '').trim()
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('Invalid JSON from ChatGPT')
  return JSON.parse(raw.slice(start, end + 1))
}

class OpenAIService {
  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY || ''
  }

  setApiKey(key) {
    this.apiKey = key
  }

  getApiKey() {
    try {
      const aiProString = localStorage.getItem('ai_pro_settings')
      if (aiProString) {
        const aiPro = JSON.parse(aiProString)
        if (aiPro.apiKey) return aiPro.apiKey
      }
    } catch {}
    return this.apiKey || localStorage.getItem('openai_api_key') || ''
  }

  hasApiKey() {
    return hasChatGptApiKey()
  }

  getModel() {
    return getChatGptModel()
  }

  async processCommand(command) {
    const activeKey = this.getApiKey()
    if (!activeKey) {
      throw new Error('Add your ChatGPT API key in Settings to use Raj as a smart assistant.')
    }

    const model = getChatGptModel()
    const history = loadHistory()
    const messages = [
      { role: 'system', content: RAJ_SYSTEM_PROMPT },
      ...history,
      { role: 'user', content: command },
    ]

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${activeKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.4,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const msg = errorData.error?.message || `ChatGPT request failed (${response.status})`
      if (response.status === 401) {
        throw new Error('Invalid ChatGPT API key. Check Settings.')
      }
      if (isOpenAIQuotaError(msg) || response.status === 429) {
        markQuotaExceeded()
      }
      throw new Error(formatOpenAIError(msg))
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    const parsed = parseModelJson(content)

    if (!parsed?.intent) {
      throw new Error('ChatGPT returned an invalid response')
    }

    saveHistory(command, parsed)
    return parsed
  }
}

const openaiService = new OpenAIService()
export default openaiService
