import {
  appendExchange,
  buildLongTermMemoryBlock,
  getContextMessages,
  addNote,
} from '../../scripts/memoryStore.mjs'

export function loadShortTermContext(limit = 20) {
  return getContextMessages(limit)
}

export function loadLongTermBlock() {
  return buildLongTermMemoryBlock()
}

export function saveExchange(userText, assistantPayload) {
  return appendExchange(userText, assistantPayload)
}

export function rememberFact(text) {
  return addNote(text)
}

export function buildMemorySystemSection() {
  const block = loadLongTermBlock()
  if (!block) return ''
  return `\n\nLONG-TERM MEMORY:\n${block}`
}
