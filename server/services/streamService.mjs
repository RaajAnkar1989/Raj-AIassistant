import { FAST_MODEL, SMART_MODEL, STREAM_OPTIONS } from '../config.mjs'
import { classifyQuery, shouldEscalate } from '../agents/routerAgent.mjs'
import { parseAgentResponse, speechFromIntent, handleServerSideTool } from '../agents/toolAgent.mjs'
import { AGENT_SYSTEM_PROMPT, CHAT_SYSTEM_PROMPT } from '../tools/registry.mjs'
import { chatOnce, chatStream, listModels, pickModel } from './ollamaClient.mjs'
import {
  buildMemorySystemSection,
  loadShortTermContext,
  saveExchange,
  rememberFact,
} from './memoryService.mjs'
import { extractSentences, synthesizeSentence, splitForImmediateTts } from './ttsService.mjs'
import { runReactLoop } from './reactService.mjs'
import { extractPartialResponseText, speechFromModelOutput, tryParseIntent } from '../utils/jsonParse.mjs'

function send(ws, payload) {
  if (ws.readyState !== 1) return
  ws.send(JSON.stringify(payload))
}

function streamSpeechToClient(ws, buffer, lastSentRef) {
  const speech = buffer.trim().startsWith('{')
    ? extractPartialResponseText(buffer) || ''
    : buffer

  if (!speech || speech.length <= lastSentRef.length + 5) return lastSentRef

  const delta = speech.slice(lastSentRef.length)
  const { sentences } = extractSentences(delta, { minLen: 6 })
  for (const sentence of sentences) {
    const utterance = (lastSentRef + sentence).trim()
    if (utterance.length > lastSentRef.length) {
      lastSentRef = utterance
      send(ws, { type: 'sentence', text: utterance })
    }
  }
  return lastSentRef
}

function flushSpeechTail(ws, buffer, lastSentRef) {
  const speech = speechFromModelOutput(buffer)
  if (!speech || speech.length <= lastSentRef.length) return lastSentRef
  send(ws, { type: 'sentence', text: speech })
  return speech
}

function buildMessages(system, history, userText) {
  return [
    { role: 'system', content: system },
    ...history,
    { role: 'user', content: userText },
  ]
}

async function resolveModels() {
  let available = []
  try {
    available = await listModels()
  } catch {
    /* ollama down */
  }
  return {
    fast: pickModel(FAST_MODEL, available),
    smart: pickModel(SMART_MODEL, available),
  }
}

async function streamChatResponse({ ws, models, route, userText, history, memorySection, signal }) {
  const model = route.tier === 'smart' ? models.smart : models.fast
  const system = `${CHAT_SYSTEM_PROMPT}${memorySection}`
  const messages = buildMessages(system, history, userText)

  let buffer = ''
  let lastSentSpeech = ''

  send(ws, { type: 'state', state: 'thinking', model, mode: 'chat' })

  await chatStream({
    model,
    messages,
    options: route.tier === 'smart' ? STREAM_OPTIONS.smart : STREAM_OPTIONS.fast,
    signal,
    onToken: (full, delta) => {
      buffer = full
      send(ws, { type: 'token', text: delta, full })
      lastSentSpeech = streamSpeechToClient(ws, buffer, lastSentSpeech)
    },
  })

  lastSentSpeech = flushSpeechTail(ws, buffer, lastSentSpeech)

  const intent = tryParseIntent(buffer)
  await saveExchange(userText, intent)
  send(ws, { type: 'intent', data: intent })
  send(ws, { type: 'done', mode: 'chat' })
  return intent
}

async function runAgentJson({ ws, models, route, userText, history, memorySection, signal, tier = 'fast' }) {
  const model = tier === 'smart' ? models.smart : models.fast
  const system = `${AGENT_SYSTEM_PROMPT}${memorySection}`
  const messages = buildMessages(system, history, userText)

  send(ws, { type: 'state', state: 'thinking', model, mode: 'agent' })

  let buffer = ''
  let lastSentSpeech = ''

  await chatStream({
    model,
    messages,
    options: tier === 'smart' ? STREAM_OPTIONS.smart : STREAM_OPTIONS.fast,
    signal,
    onToken: (full, delta) => {
      buffer = full
      send(ws, { type: 'token', text: delta, full })
      lastSentSpeech = streamSpeechToClient(ws, buffer, lastSentSpeech)
    },
  })

  let intent
  try {
    intent = parseAgentResponse(buffer)
  } catch (e) {
    return { error: e, buffer }
  }

  const serverTool = handleServerSideTool(intent)
  if (serverTool.handled) {
    rememberFact(serverTool.note)
  }

  const speech = speechFromIntent(intent)
  lastSentSpeech = flushSpeechTail(ws, speech, lastSentSpeech)
  for (const sentence of splitForImmediateTts(speech)) {
    if (sentence.length > lastSentSpeech.length) {
      lastSentSpeech = sentence
      send(ws, { type: 'sentence', text: sentence })
    }
  }

  await saveExchange(userText, intent)
  send(ws, { type: 'intent', data: intent })
  send(ws, { type: 'done', mode: 'agent' })
  return intent
}

export async function handleUserMessage(ws, userText, { signal, waitForToolResult } = {}) {
  const text = String(userText || '').trim()
  if (!text) {
    send(ws, { type: 'error', message: 'Empty message' })
    return
  }

  send(ws, { type: 'state', state: 'listening' })

  const route = classifyQuery(text)
  const history = loadShortTermContext(20)
  const memorySection = buildMemorySystemSection()
  const models = await resolveModels()

  send(ws, {
    type: 'route',
    tier: route.tier,
    mode: route.mode,
    reason: route.reason,
    models,
  })

  if (route.mode === 'react') {
    await runReactLoop(ws, text, { signal, waitForToolResult, model: models.smart })
    return
  }

  if (route.mode === 'chat') {
    await streamChatResponse({ ws, models, route, userText: text, history, memorySection, signal })
    return
  }

  let result = await runAgentJson({
    ws,
    models,
    route,
    userText: text,
    history,
    memorySection,
    signal,
    tier: route.tier,
  })

  if (result?.error && shouldEscalate({ route, parseError: true })) {
    send(ws, { type: 'state', state: 'thinking', model: models.smart, mode: 'agent_escalated' })
    result = await runAgentJson({
      ws,
      models,
      route: { ...route, tier: 'smart' },
      userText: text,
      history,
      memorySection,
      signal,
      tier: 'smart',
    })
  }

  if (result?.error) {
    send(ws, { type: 'error', message: result.error.message || 'Agent parse failed' })
    send(ws, { type: 'done', mode: 'error' })
  }
}

/** HTTP SSE fallback for environments without WebSocket */
export async function handleSseMessage(userText, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  })

  const send = (payload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`)
  }

  const fakeWs = {
    readyState: 1,
    send: (raw) => send(JSON.parse(raw)),
  }

  const controller = new AbortController()
  res.on('close', () => controller.abort())

  try {
    await handleUserMessage(fakeWs, userText, { signal: controller.signal })
  } catch (e) {
    send({ type: 'error', message: e.message })
  }
  res.end()
}

/** Optional: synthesize TTS server-side for a sentence */
export async function handleTtsRequest(text, voice) {
  return synthesizeSentence(text, voice)
}
