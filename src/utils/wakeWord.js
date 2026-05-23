import { loadVoicePro } from './voiceSettings'

const WAKE_ALIASES = ['jarvis', 'hey jarvis', 'ok jarvis', 'hi jarvis']

export function getWakeConfig() {
  const pro = loadVoicePro()
  const custom = String(pro.wakeWord || 'jarvis')
    .toLowerCase()
    .trim()
  const phrases = [...new Set([custom, ...WAKE_ALIASES].filter(Boolean))]
  return {
    enabled: pro.wakeWordEnabled !== false,
    phrases,
    primary: custom || 'jarvis',
  }
}

function normalizeHeard(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\w\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function stripWakeWord(text, phrases = getWakeConfig().phrases) {
  let rest = normalizeHeard(text)
  for (const phrase of [...phrases].sort((a, b) => b.length - a.length)) {
    const p = normalizeHeard(phrase)
    if (!p) continue
    if (rest === p) return ''
    if (rest.startsWith(`${p} `)) return rest.slice(p.length + 1).trim()
    if (rest.startsWith(`${p},`)) return rest.slice(p.length + 1).trim()
  }
  return rest
}

export function containsWakeWord(text, phrases = getWakeConfig().phrases) {
  const heard = normalizeHeard(text)
  if (!heard) return false
  return phrases.some((phrase) => {
    const p = normalizeHeard(phrase)
    if (!p) return false
    return heard === p || heard.startsWith(`${p} `) || heard.startsWith(`${p},`)
  })
}

/**
 * @returns {'none'|'wake'|'interrupt'}
 */
export function classifyWakeInput(text, { speaking = false, processing = false } = {}) {
  const { enabled, phrases } = getWakeConfig()
  if (!enabled) return { action: 'pass', command: String(text || '').trim() }

  const heard = String(text || '').trim()
  if (!heard) return { action: 'none', command: '' }

  if ((speaking || processing) && containsWakeWord(heard, phrases)) {
    return { action: 'interrupt', command: stripWakeWord(heard, phrases) }
  }

  if (!containsWakeWord(heard, phrases)) {
    return { action: 'none', command: '' }
  }

  const command = stripWakeWord(heard, phrases)
  return { action: 'wake', command }
}

export const ENGAGED_WINDOW_MS = 50_000
