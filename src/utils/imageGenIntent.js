const PREFIX_PATTERNS = [
  /^(?:please\s+)?(?:can you\s+)?(?:could you\s+)?(?:create|draw|generate|make|paint|design|render|produce|show me|give me)\s+(?:an?\s+)?(?:image|picture|photo|illustration|artwork|drawing|pic|logo|poster|wallpaper)\s+(?:of|showing|with|depicting)?\s*(.*)$/i,
  /^(?:please\s+)?(?:draw|paint|sketch|illustrate)\s+(?:an?\s+)?(?:image\s+of\s+)?(.+)$/i,
  /^(?:image|picture|photo)\s+of\s+(.+)$/i,
]

export function isImageGenerationRequest(text) {
  const t = String(text || '').trim()
  if (!t || t.length < 4) return false
  return PREFIX_PATTERNS.some((re) => re.test(t))
}

export function extractImagePrompt(text) {
  const t = String(text || '').trim()
  for (const re of PREFIX_PATTERNS) {
    const m = t.match(re)
    if (m?.[1]?.trim()) return m[1].trim()
  }
  return t
}
