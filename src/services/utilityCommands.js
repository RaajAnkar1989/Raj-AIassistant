import { format } from 'date-fns'
import { parseDurationSeconds, formatDuration } from './timerService'

const LOCAL_JOKES = [
  'Why did the computer go to therapy? Too many bytes of emotional baggage.',
  'I asked the cloud for a joke. It said: "404 — humour not found." Then it rained puns.',
  'Why do programmers prefer dark mode? Because light attracts bugs.',
  'What do you call a fake noodle? An impasta. I regret nothing.',
  'Why did the smartphone need glasses? It lost all its contacts.',
  'Parallel lines have so much in common. It is a shame they will never meet.',
  'I told my Wi-Fi we needed to talk. It said the signal was weak.',
  'Why was the math book sad? It had too many problems.',
  'What did the ocean say to the beach? Nothing — it just waved.',
  'Why do Java developers wear glasses? Because they do not C sharp.',
]

const SONG_SNIPPETS = {
  happybirthday: 'Happy birthday to you. Happy birthday to you. Happy birthday dear friend. Happy birthday to you.',
  twinkle: 'Twinkle twinkle little star. How I wonder what you are. Up above the world so high. Like a diamond in the sky.',
  abc: 'A B C D E F G. H I J K L M N O P. Q R S T U V. W X Y and Z.',
}

function safeCalculate(expression) {
  const cleaned = String(expression || '')
    .toLowerCase()
    .replace(/what('s| is| are)/g, '')
    .replace(/calculate|compute|equals?|equal to/g, '')
    .replace(/plus/g, '+')
    .replace(/minus/g, '-')
    .replace(/times|multiplied by/g, '*')
    .replace(/divided by|over/g, '/')
    .replace(/[^0-9+\-*/().%\s]/g, '')
    .trim()

  if (!cleaned || !/^[\d+\-*/().%\s]+$/.test(cleaned)) return null

  try {
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${cleaned})`)()
    if (typeof result !== 'number' || !Number.isFinite(result)) return null
    const rounded = Math.round(result * 10000) / 10000
    return String(rounded)
  } catch {
    return null
  }
}

export function formatCurrentTime() {
  const now = new Date()
  return format(now, 'h:mm a')
}

export function formatCurrentDateTime() {
  const now = new Date()
  return format(now, "EEEE, MMMM d — h:mm a")
}

export function formatCurrentDate() {
  return format(new Date(), 'EEEE, MMMM d, yyyy')
}

export function pickLocalJoke() {
  return LOCAL_JOKES[Math.floor(Math.random() * LOCAL_JOKES.length)]
}

export function pickSongSnippet(topic = '') {
  const key = String(topic || '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
  if (SONG_SNIPPETS[key]) return SONG_SNIPPETS[key]
  if (/birthday/.test(topic)) return SONG_SNIPPETS.happybirthday
  if (/twinkle|star/.test(topic)) return SONG_SNIPPETS.twinkle
  return ''
}

/** Fast local parsing — no LLM needed for common super-assistant tasks. */
export function parseUtilityCommand(command) {
  const raw = String(command || '').trim()
  const lower = raw.toLowerCase()
  if (!lower) return null

  if (
    /\b(what('s| is)?\s*(the\s+)?time|what time is it|tell me the time|current time|time now)\b/.test(
      lower
    )
  ) {
    return { intent: 'show_time' }
  }

  if (
    /\b(what('s| is)?\s*(the\s+)?date|what day is it|today('s)? date|what is today)\b/.test(lower)
  ) {
    return { intent: 'show_date' }
  }

  if (/\b(cancel|stop|clear)\s+(all\s+)?timers?\b/.test(lower)) {
    return { intent: 'cancel_timers' }
  }

  if (/\b(any|active)\s+timers?|timer status|timers running|list timers?\b/.test(lower)) {
    return { intent: 'list_timers' }
  }

  const fiveMinTimer = lower.match(/\b(\d+)\s*(?:minute|min|mins|m)\s+timer\b/)
  if (fiveMinTimer) {
    const seconds = parseDurationSeconds(`${fiveMinTimer[1]} minutes`)
    if (seconds > 0) return { intent: 'set_timer', durationSeconds: seconds, label: 'Timer' }
  }

  const timerFirst = lower.match(/\btimer\s+(?:for\s+)?(\d+\s*(?:minutes?|mins?|seconds?|secs?|hours?|hrs?)?.*?)$/i)
  if (timerFirst) {
    const seconds = parseDurationSeconds(timerFirst[1])
    if (seconds > 0) return { intent: 'set_timer', durationSeconds: seconds, label: 'Timer' }
  }

  const timerMatch =
    lower.match(
      /\b(?:set|start|create)\s+(?:a\s+)?timer\s+(?:for\s+)?(.+?)(?:\s+please)?$/
    ) ||
    lower.match(/\btimer\s+(?:for\s+)?(.+?)(?:\s+please)?$/) ||
    lower.match(/\bremind me in\s+(.+?)(?:\s+please)?$/)

  if (timerMatch) {
    const seconds = parseDurationSeconds(timerMatch[1])
    if (seconds > 0) {
      return {
        intent: 'set_timer',
        durationSeconds: seconds,
        label: 'Timer',
      }
    }
  }

  if (/\b(tell me a joke|say a joke|make me laugh|something funny|crack a joke|joke please)\b/.test(lower)) {
    return { intent: 'tell_joke', preferBrain: true }
  }

  const singMatch = lower.match(/\b(?:sing|recite)\s+(?:me\s+)?(?:a\s+)?(?:song\s+)?(?:called\s+)?(.+?)(?:\s+please)?$/)
  if (/\bsing\b/.test(lower) || singMatch) {
    const topic = singMatch?.[1]?.trim() || ''
    const snippet = pickSongSnippet(topic)
    if (snippet) {
      return { intent: 'sing_song', responseText: snippet, songTitle: topic || 'a song' }
    }
    return { intent: 'sing_song', songTitle: topic || 'a song', preferBrain: true }
  }

  if (/\b(set a reminder|open reminders|show reminders)\b/.test(lower)) {
    return { intent: 'open_reminders' }
  }

  if (/\b(calculate|what is|what's|how much is)\b/.test(lower) && /[\d+]/.test(lower)) {
    const result = safeCalculate(raw)
    if (result != null) {
      return { intent: 'calculate', result, expression: raw }
    }
  }

  return null
}

export { formatDuration, parseDurationSeconds, safeCalculate }
