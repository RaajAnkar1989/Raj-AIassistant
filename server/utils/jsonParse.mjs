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
