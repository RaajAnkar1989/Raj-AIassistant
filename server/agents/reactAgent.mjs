import { parseJsonContent } from '../utils/jsonParse.mjs'

export const MAX_REACT_STEPS = Number(process.env.JARVIS_REACT_MAX_STEPS || 5)

/** Tools executed in the browser (iPhone deep links, Gmail OAuth, etc.) */
export const CLIENT_ACTIONS = new Set([
  'open_app',
  'compose_email',
  'send_whatsapp',
  'send_sms',
  'open_calendar',
  'read_calendar',
  'read_emails',
  'weather',
  'call_contact',
  'set_timer',
  'cancel_timers',
  'open_reminders',
])

export const REACT_SYSTEM_PROMPT = `You are Jarvis — an agentic voice assistant for Boss.
You work in a ReAct loop: Thought → Action → Observation → next step.

Return ONLY valid JSON for each step:

{
  "thought": "brief reasoning",
  "action": "tool_name or respond",
  "params": { ... },
  "responseText": "what to say to Boss this step",
  "done": false
}

When the task is complete, set "done": true and action "respond".

TOOLS (action → params):
- open_app: { appName, searchQuery? }
- compose_email: { to, toName?, subject, body, awaitConfirm? }
- send_whatsapp: { contact, rewrittenText, phone? }
- send_sms: { contact, rewrittenText, phone? }
- set_timer: { durationSeconds, label? }
- read_calendar: {}
- read_emails: { unreadOnly? }
- weather: {}
- show_time: {}
- tell_joke: {}
- remember: { memoryNote }
- respond: { responseText } — final answer, done true

Multi-step examples:
1) "play music then set a timer" → open_app, then set_timer, then respond done.
2) "email John about the meeting" → compose_email, then respond done.

Keep responseText short and natural. Address user as Boss.`

export function mapActionToIntent(action, params = {}) {
  const a = String(action || 'respond').toLowerCase()
  if (a === 'respond' || a === 'general_chat') {
    return { intent: 'general_chat', responseText: params.responseText || params.text || '' }
  }
  return { intent: a, ...params, responseText: params.responseText || '' }
}

export function parseReactStep(raw) {
  const data = parseJsonContent(raw)
  const action = data.action || data.tool || 'respond'
  return {
    thought: data.thought || '',
    action,
    params: data.params || data.arguments || {},
    responseText: data.responseText || data.message || '',
    done: Boolean(data.done) || action === 'respond',
    intent: mapActionToIntent(action, { ...data.params, responseText: data.responseText }),
  }
}

export function buildObservationMessage(step, result) {
  return `Observation (step ${step + 1}): ${String(result || 'ok').slice(0, 500)}`
}
