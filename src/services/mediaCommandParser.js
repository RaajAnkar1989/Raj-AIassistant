function cleanQuery(raw) {
  return String(raw || '')
    .replace(/^["']|["']$/g, '')
    .replace(/^(called|named)\s+/i, '')
    .replace(/\s+(please|for me|now|today)$/i, '')
    .replace(/\s+(on|in|using)\s+(youtube|spotify|yt).*$/i, '')
    .trim()
}

const APP_PATTERNS = {
  youtube: [
    /(?:play|start|put on)\s+(?:a\s+)?(?:song|video|music|track)\s+(?:called|named)?\s*(.+?)\s+(?:on|in|using)\s+(?:youtube|yt)\b/i,
    /(?:play|start)\s+(.+?)\s+(?:on|in|using)\s+(?:youtube|yt)\b/i,
    /(?:search|find)\s+(?:youtube|yt)\s+(?:for\s+)?(.+)/i,
    /(?:search|find)\s+(?:for\s+)?(.+?)\s+(?:on|in)\s+(?:youtube|yt)\b/i,
    /(?:youtube|yt)\s+(?:play|search)\s+(?:for\s+)?(.+)/i,
    /(?:play|start)\s+(?:on|in)\s+(?:youtube|yt)\s+(?:a\s+)?(?:song|video|music|track)?\s*(.+)/i,
  ],
  spotify: [
    /(?:play|start|put on)\s+(?:a\s+)?(?:song|music|track)\s+(?:called|named)?\s*(.+?)\s+(?:on|in|using)\s+spotify/i,
    /(?:play|start)\s+(.+?)\s+(?:on|in|using)\s+spotify/i,
    /(?:search|find)\s+(?:for\s+)?(.+?)\s+(?:on|in)\s+spotify/i,
    /spotify\s+(?:play|search)\s+(?:for\s+)?(.+)/i,
  ],
}

const NEEDS_QUERY_PATTERNS = [
  /^(?:play|start)\s+(?:a\s+)?(?:song|video|music|track)\s+(?:on|in|using)\s+(?:youtube|yt|spotify)\b/i,
  /^(?:play|start)\s+(?:on|in)\s+(?:youtube|yt|spotify)\s*(?:please)?$/i,
]

/** Fast local parse — skips AI brain for play/search commands. */
export function parseMediaCommand(command) {
  const text = String(command || '').trim()
  if (!text) return null

  for (const re of NEEDS_QUERY_PATTERNS) {
    if (re.test(text)) {
      const app = /spotify/i.test(text) ? 'spotify' : 'youtube'
      return { intent: 'open_app', appName: app, needsSearchQuery: true }
    }
  }

  for (const [appName, patterns] of Object.entries(APP_PATTERNS)) {
    for (const re of patterns) {
      const m = text.match(re)
      if (!m?.[1]) continue
      const searchQuery = cleanQuery(m[1])
      if (!searchQuery || searchQuery.length < 2) continue
      if (/^(a|an|the|song|video|music|track)$/i.test(searchQuery)) continue
      return { intent: 'open_app', appName, searchQuery }
    }
  }

  return null
}
