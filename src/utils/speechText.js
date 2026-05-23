/** Never read raw model JSON aloud — extract responseText only */
export function extractSpeakableText(raw) {
  const text = String(raw || '').trim()
  if (!text) return ''
  if (!text.startsWith('{') && !text.startsWith('[')) return text

  try {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start >= 0 && end > start) {
      const data = JSON.parse(text.slice(start, end + 1))
      const line = data.responseText || data.message || data.reply || ''
      if (line) return String(line).trim()
    }
  } catch {
    /* partial JSON */
  }

  const m = text.match(/"responseText"\s*:\s*"((?:[^"\\]|\\.)*)"/)
  if (m) {
    try {
      return JSON.parse(`"${m[1]}"`)
    } catch {
      return m[1]
    }
  }

  return ''
}
