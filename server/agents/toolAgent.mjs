import { parseJsonContent, speechFromModelOutput } from '../utils/jsonParse.mjs'

/** Parse agent JSON and normalize tool payload for frontend actionRouter */
export function parseAgentResponse(raw) {
  const data = parseJsonContent(raw)
  const intent = data.intent || data.action || 'general_chat'
  return {
    intent,
    ...data,
    responseText: data.responseText || data.message || data.reply || '',
  }
}

export function speechFromIntent(intent) {
  if (intent.responseText) {
    const line = speechFromModelOutput(intent.responseText)
    if (line) return line
  }
  if (intent.intent === 'help') {
    return 'Try: play a song, draft an email, set a timer, or ask me anything, Boss.'
  }
  return 'Done, Boss.'
}

/** Server-side remember tool — persists to memory file */
export function handleServerSideTool(intent) {
  if (intent.intent === 'remember' && intent.memoryNote) {
    return { handled: true, note: intent.memoryNote }
  }
  return { handled: false }
}
