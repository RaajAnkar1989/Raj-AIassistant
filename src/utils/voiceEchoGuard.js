import { normalizeAppName, parseOpenAppCommand } from '../services/actionRouter'

const ASSISTANT_OPENING_RE = /^(opening|checking your|you have \d|in your browser)/i

const NOISE_RE =
  /^(uh|um|ah|oh|hmm|ok|okay|yes|no|the|a|an|i|you|thanks|thank you)$/i

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

export function textSimilarity(a, b) {
  const ta = tokenize(a)
  const tb = tokenize(b)
  if (!ta.length || !tb.length) return 0
  const setB = new Set(tb)
  const overlap = ta.filter((w) => setB.has(w)).length
  return overlap / Math.max(ta.length, tb.length)
}

/** Only reject obvious TTS echo while the guard window is active (right after Raj speaks). */
export function looksLikeAssistantEcho(command, lastSpoken = '', guardActive = false) {
  if (!guardActive) return false
  const text = String(command || '').trim()
  if (!text) return true
  if (ASSISTANT_OPENING_RE.test(text)) return true
  if (lastSpoken && textSimilarity(text, lastSpoken) >= 0.72) return true
  return false
}

export function isLikelyNoiseCommand(command) {
  const text = String(command || '').trim()
  if (!text) return true
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 1 && text.length < 4 && !/^(help|weather|whatsapp|youtube|spotify)$/i.test(text)) {
    return true
  }
  if (NOISE_RE.test(text)) return true
  return false
}

export function buildActionKey(intent, aiData = {}) {
  if (intent === 'session_confirm' || intent === 'session_continue' || intent === 'session_cancel') {
    return `${intent}:${Date.now()}`
  }
  if (intent === 'send_whatsapp' || intent === 'send_sms') {
    return `${intent}:${aiData.contact || ''}:${(aiData.rewrittenText || '').slice(0, 40)}`
  }
  if (intent === 'compose_email') {
    return `${intent}:${aiData.to || aiData.contact || ''}:${aiData.confirmed ? 'send' : 'draft'}`
  }
  if (intent === 'open_app') {
    const app = normalizeAppName(aiData.appName) || parseOpenAppCommand(`open ${aiData.appName || ''}`)
    return `open_app:${app || 'unknown'}`
  }
  return intent || 'unknown'
}

export function isDuplicateAction(actionKey, lastAction, windowMs = 4000) {
  if (!actionKey || !lastAction?.key) return false
  if (actionKey !== lastAction.key) return false
  return Date.now() - lastAction.at < windowMs
}

export function estimateEchoCooldownMs(text, baseMs = 450) {
  const len = String(text || '').length
  return Math.min(1200, baseMs + len * 6)
}
