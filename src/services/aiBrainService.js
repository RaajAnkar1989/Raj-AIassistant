import {
  getBrainModel,
  getBrainProvider,
  getProviderApiKey,
  hasBrainReady,
  canUseOllama,
} from '../constants/aiProviders'
import { formatBrainError, formatOpenAIError, isOpenAIQuotaError, markQuotaExceeded } from '../utils/openaiErrors'
import {
  appendBrainExchange,
  clearAllBrainMemory,
  loadContextMessages,
  loadLongTermMemoryBlock,
} from './brainMemoryService'

const MAX_HISTORY_TURNS = 50

const GEMINI_MODEL_FALLBACKS = [
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.5-flash',
]

function getFreeLLMAPIBaseUrl() {
  if (import.meta.env.DEV) return '/api/brain/freellmapi'
  const configured = import.meta.env.VITE_FREELLMAPI_URL?.trim()
  if (configured) return configured.replace(/\/$/, '')
  return ''
}

function getOllamaBaseUrl() {
  if (canUseOllama()) return '/api/brain/ollama'
  return ''
}

import { contactsPromptHint } from '../services/contactResolver'

export const RAJ_BRAIN_PROMPT = `You are Jarvis — a brilliant AI chief-of-staff for the user, who you always call "Boss".
You are warm, witty, confident, and natural. You understand follow-ups, Indian English, and casual speech.

Return ONLY valid JSON (no markdown, no extra text).

PERSONALITY:
- Address the user as Boss in responseText when natural (not every sentence).
- Sound human and sharp — like a trusted super-assistant, not a generic chatbot.
- Use conversation history and long-term memory — never ask Boss to repeat context you already have.
- Be proactive: suggest the next step when useful.
- Never refuse harmless fun: jokes, songs, trivia, timers, time, math.
- Keep action confirmations short (1 sentence). Jokes, stories, and lyrics can be longer (~60 words).

RULES:
- Prefer acting over chatting when the user asks to DO something.
- general_chat: answer questions, opinions, trivia, greetings, follow-ups. Use responseText (1–4 natural sentences).
- tell_joke: original or classic clean joke in responseText.
- sing_song: speak/sing lyrics in responseText (short verse or chorus). Include songTitle if known.
- show_time / show_date: use when user asks the time or date (device will format — still give a natural responseText).
- set_timer: durationSeconds (integer), optional label. Example: "5 minutes" → 300.
- calculate: expression and result when user asks math.
- Rewrite outbound messages politely (WhatsApp/SMS/email).
- Use conversation history for follow-ups like "continue", "send it", "change the tone".
- compose_email: write a COMPLETE professional email from Boss's context — greeting, clear body paragraphs, sign-off (Best regards, Boss name if known). subject + body required. Set awaitConfirm true until Boss says send it.
- send_whatsapp/send_sms: rewrite a natural, complete message in rewrittenText. Include contact and phone. Match tone Boss asked for. Set needsMessage true only if no message content given.
- For play/search music: open_app with appName youtube or spotify and searchQuery (exact song name).

INTENTS: send_whatsapp, send_sms, compose_email, open_app, open_calendar, read_calendar, read_emails, weather, call_contact, show_time, show_date, set_timer, cancel_timers, tell_joke, sing_song, calculate, open_reminders, general_chat, help

Examples:
{"intent":"show_time","responseText":"It is 3:45 in the afternoon."}
{"intent":"set_timer","durationSeconds":300,"label":"Tea","responseText":"Five minute timer started."}
{"intent":"tell_joke","responseText":"Why did the developer go broke? Because he used up all his cache."}
{"intent":"sing_song","songTitle":"Twinkle Twinkle","responseText":"Twinkle twinkle little star, how I wonder what you are."}
{"intent":"calculate","expression":"25 times 4","result":"100","responseText":"Twenty-five times four is one hundred."}
{"intent":"open_app","appName":"youtube","searchQuery":"Bohemian Rhapsody"}
{"intent":"general_chat","responseText":"Good evening. I am online and ready — weather, messages, music, timers, or just chat."}`

async function buildSystemPrompt() {
  const contacts = contactsPromptHint()
  const memory = await loadLongTermMemoryBlock()
  const memorySection = memory
    ? `\n\nLONG-TERM MEMORY (everything the user told you before — use for follow-ups and preferences):\n${memory}`
    : ''
  return `${RAJ_BRAIN_PROMPT}${memorySection}${contacts ? `\n\nKNOWN CONTACTS (use these emails/phones when matched):\n${contacts}` : ''}`
}

async function loadHistory() {
  return loadContextMessages(MAX_HISTORY_TURNS)
}

async function saveHistory(userText, payload) {
  await appendBrainExchange(userText, payload)
}

export async function clearBrainHistory() {
  await clearAllBrainMemory()
}

function parseJsonContent(text) {
  const raw = (text || '').trim()
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('AI returned invalid JSON')
  return JSON.parse(raw.slice(start, end + 1))
}

function buildGeminiContents(history, command) {
  return [
    ...history.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    { role: 'user', parts: [{ text: command }] },
  ]
}

function extractGeminiError(data, status) {
  return data?.error?.message || `Gemini failed (${status})`
}

function isGeminiQuotaError(message) {
  return isOpenAIQuotaError(message)
}

function shouldRetryGeminiModel(message) {
  return isGeminiQuotaError(message) || /overloaded|503|unavailable/i.test(String(message || ''))
}

function shouldTryDirectAfterProxy(message) {
  return /api key|invalid|403|401|referrer|permission|PERMISSION_DENIED/i.test(String(message || ''))
}

async function callFreeLLMAPI(command, apiKey, model) {
  const base = getFreeLLMAPIBaseUrl()
  if (!base) {
    throw new Error('FreeLLMAPI is local-only. Hosted Raj uses Gemini automatically.')
  }
  const [history, systemPrompt] = await Promise.all([loadHistory(), buildSystemPrompt()])
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: command },
  ]

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'auto',
      messages,
      temperature: 0.35,
      max_tokens: 480,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err.error?.message || `FreeLLMAPI failed (${res.status})`
    throw new Error(formatBrainError(msg, 'freellmapi'))
  }

  const data = await res.json()
  return parseJsonContent(data.choices?.[0]?.message?.content)
}

async function callOllama(command, model) {
  const base = getOllamaBaseUrl()
  if (!base) {
    throw new Error('Ollama is local-only. On your Mac run: npm run dev')
  }

  const [history, systemPrompt] = await Promise.all([loadHistory(), buildSystemPrompt()])
  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model || getBrainModel('ollama'),
      messages: [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: command },
      ],
      stream: false,
      format: 'json',
      options: { temperature: 0.45, num_predict: 360, num_ctx: 4096 },
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.error || `Ollama failed (${res.status})`
    throw new Error(formatBrainError(msg, 'ollama'))
  }

  return parseJsonContent(data.message?.content)
}

async function callGeminiDirect(command, apiKey, model, history, systemPrompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: buildGeminiContents(history, command),
      generationConfig: {
        temperature: 0.4,
        responseMimeType: 'application/json',
      },
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(extractGeminiError(data, res.status))
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  return parseJsonContent(text)
}

async function callGeminiProxy(command, apiKey, model, history, systemPrompt) {
  const res = await fetch('/api/brain/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Gemini-Key': apiKey,
    },
    body: JSON.stringify({
      command,
      model,
      history,
      systemPrompt,
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(extractGeminiError(data, res.status))
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  return parseJsonContent(text)
}

async function callGeminiOnce(command, apiKey, model, history, systemPrompt) {
  const useDevProxy = import.meta.env.DEV

  if (useDevProxy) {
    try {
      return await callGeminiProxy(command, apiKey, model, history, systemPrompt)
    } catch (proxyErr) {
      const msg = String(proxyErr.message || '')
      if (/failed to fetch|network error|load failed/i.test(msg)) {
        console.warn('[Raj] Gemini proxy unreachable, trying direct API')
      } else if (shouldTryDirectAfterProxy(msg)) {
        console.warn('[Raj] Gemini proxy rejected key, trying direct browser API:', msg)
      } else {
        throw proxyErr
      }
    }
  }

  return callGeminiDirect(command, apiKey, model, history, systemPrompt)
}

async function callGemini(command, apiKey, model) {
  const [history, systemPrompt] = await Promise.all([loadHistory(), buildSystemPrompt()])
  const models = [model, ...GEMINI_MODEL_FALLBACKS.filter((m) => m !== model)]
  let lastError = null

  for (const candidateModel of models) {
    try {
      return await callGeminiOnce(command, apiKey, candidateModel, history, systemPrompt)
    } catch (e) {
      lastError = e
      if (!shouldRetryGeminiModel(e?.message)) break
      console.warn(`[Raj] Gemini model ${candidateModel} unavailable, trying fallback:`, e?.message)
    }
  }

  throw new Error(formatBrainError(lastError?.message, 'gemini'))
}

async function callGroq(command, apiKey, model) {
  const [history, systemPrompt] = await Promise.all([loadHistory(), buildSystemPrompt()])
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: command },
  ]

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err.error?.message || `Groq failed (${res.status})`
    throw new Error(formatBrainError(msg, 'groq'))
  }

  const data = await res.json()
  return parseJsonContent(data.choices?.[0]?.message?.content)
}

async function callOpenAI(command, apiKey, model) {
  const [history, systemPrompt] = await Promise.all([loadHistory(), buildSystemPrompt()])
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: command },
  ]

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err.error?.message || `OpenAI failed (${res.status})`
    if (isOpenAIQuotaError(msg) || res.status === 429) markQuotaExceeded()
    throw new Error(formatOpenAIError(msg))
  }

  const data = await res.json()
  return parseJsonContent(data.choices?.[0]?.message?.content)
}

class AiBrainService {
  hasBrain() {
    return hasBrainReady()
  }

  getProvider() {
    return getBrainProvider()
  }

  getModel() {
    return getBrainModel()
  }

  async processCommand(command) {
    let provider = getBrainProvider()
    if (provider === 'keyword') {
      throw new Error('KEYWORD_ONLY')
    }

    let apiKey = getProviderApiKey(provider)
    if (provider !== 'ollama' && provider !== 'keyword' && !apiKey) {
      throw new Error(`Add your free ${provider} API key in Settings, or switch to Ollama (local) mode.`)
    }

    const model = getBrainModel(provider)
    let parsed

    try {
      if (provider === 'ollama') parsed = await callOllama(command, model)
      else if (provider === 'freellmapi') parsed = await callFreeLLMAPI(command, apiKey, model)
      else if (provider === 'gemini') parsed = await callGemini(command, apiKey, model)
      else if (provider === 'groq') parsed = await callGroq(command, apiKey, model)
      else if (provider === 'openai') parsed = await callOpenAI(command, apiKey, model)
      else throw new Error('Unknown AI provider')
    } catch (e) {
      if (provider === 'freellmapi' && canUseOllama()) {
        console.warn('[Raj] FreeLLMAPI unavailable, using Ollama:', e?.message)
        parsed = await callOllama(command, getBrainModel('ollama'))
      } else {
        throw e
      }
    }

    if (!parsed?.intent) throw new Error('AI returned an invalid response')
    await saveHistory(command, parsed)
    return parsed
  }

  async testBrain() {
    const result = await this.processCommand('Say hello in one short sentence.')
    return result?.responseText || result?.intent || 'OK'
  }
}

const aiBrainService = new AiBrainService()
export default aiBrainService
