/** Chat app sessions — separate from Jarvis voice command history */

export const CHAT_SESSIONS_KEY = 'raj_chat_sessions_v1'
export const CHAT_ACTIVE_KEY = 'raj_chat_active_session'

export const CHAT_SYSTEM_PROMPT = `You are Raj Chat — a natural, helpful assistant (like ChatGPT).
Have normal conversations: explain clearly, ask follow-ups when useful, use markdown when it helps.
If the user attaches images or files, use them in your answer when relevant.
Do not return JSON or voice-command intents here — just talk naturally.`

export const CHAT_VISION_SYSTEM_PROMPT = `${CHAT_SYSTEM_PROMPT}
The user attached image(s) in this message. You CAN see them — describe, read, and analyze what is shown directly.
Keep answers concise unless asked for detail. Never say you cannot view images.`

export const MAX_CHAT_SESSIONS = 40
export const MAX_MESSAGES_PER_SESSION = 200
export const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024
export const MAX_VISION_HISTORY = 6
export const VISION_MAX_SIDE = 768
export const VISION_JPEG_QUALITY = 0.72
export const VISION_REQUEST_TIMEOUT_MS = 90_000

export const ACCEPTED_CHAT_FILES =
  'image/jpeg,image/png,image/webp,image/gif,.pdf,.txt,.md,.csv,.json,text/plain'
