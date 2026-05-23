export function parseJsonContent(text) {
  const raw = String(text || '').trim()
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('Invalid JSON from model')
  return JSON.parse(raw.slice(start, end + 1))
}

/** Try to extract responseText early from partial JSON stream */
export function extractPartialResponseText(buffer) {
  const m = buffer.match(/"responseText"\s*:\s*"((?:[^"\\]|\\.)*)"/)
  if (!m) return null
  try {
    return JSON.parse(`"${m[1]}"`)
  } catch {
    return m[1]
  }
}

/** Plain speech only — never read raw JSON aloud */
export function speechFromModelOutput(raw) {
  const text = String(raw || '').trim()
  if (!text) return ''
  if (text.startsWith('{')) {
    try {
      const data = parseJsonContent(text)
      const line = data.responseText || data.message || data.reply || ''
      if (line) return String(line).trim()
    } catch {
      const partial = extractPartialResponseText(text)
      if (partial) return String(partial).trim()
    }
    return ''
  }
  return text
}

export function tryParseIntent(raw) {
  try {
    const data = parseJsonContent(raw)
    return {
      ...data,
      intent: data.intent || data.action || 'general_chat',
      responseText: speechFromModelOutput(raw),
    }
  } catch {
    return { intent: 'general_chat', responseText: speechFromModelOutput(raw) || String(raw || '').trim() }
  }
}
