import { MAX_REACT_STEPS, CLIENT_ACTIONS, REACT_SYSTEM_PROMPT, parseReactStep, buildObservationMessage, mapActionToIntent } from '../agents/reactAgent.mjs'
import { chatOnce, chatStream } from './ollamaClient.mjs'
import { buildMemorySystemSection, loadShortTermContext, saveExchange } from './memoryService.mjs'
import { splitForImmediateTts } from './ttsService.mjs'
import { STREAM_OPTIONS, SMART_MODEL } from '../config.mjs'
import { pickModel, listModels } from './ollamaClient.mjs'
import { rememberFact } from './memoryService.mjs'

function send(ws, payload) {
  if (ws.readyState !== 1) return
  ws.send(JSON.stringify(payload))
}

function streamSentences(ws, text) {
  const pending = String(text || '').trim()
  if (!pending) return
  for (const sentence of splitForImmediateTts(pending)) {
    const chunk = sentence.trim()
    if (chunk) send(ws, { type: 'sentence', text: chunk })
  }
}

/**
 * Multi-step ReAct — client executes browser tools, server continues loop.
 * @param {object} ws - WebSocket
 * @param {function} waitForToolResult - (step) => Promise<string>
 */
export async function runReactLoop(ws, userText, { signal, waitForToolResult, model: preferredModel }) {
  let available = []
  try {
    available = await listModels()
  } catch {}
  const model = pickModel(preferredModel || SMART_MODEL, available)

  const memorySection = buildMemorySystemSection()
  const history = loadShortTermContext(12)
  const system = `${REACT_SYSTEM_PROMPT}${memorySection}`

  const messages = [
    { role: 'system', content: system },
    ...history,
    { role: 'user', content: userText },
  ]

  send(ws, { type: 'state', state: 'thinking', model, mode: 'react' })
  send(ws, { type: 'react_start', maxSteps: MAX_REACT_STEPS })

  const steps = []
  let finalIntent = { intent: 'general_chat', responseText: 'Done, Boss.' }

  for (let step = 0; step < MAX_REACT_STEPS; step += 1) {
    if (signal?.aborted) {
      const err = new Error('Aborted')
      err.name = 'AbortError'
      throw err
    }

    let buffer = ''
    await chatStream({
      model,
      messages,
      options: STREAM_OPTIONS.smart,
      signal,
      onToken: (full, delta) => {
        buffer = full
        send(ws, { type: 'token', text: delta, full, reactStep: step })
      },
    })

    let parsed
    try {
      parsed = parseReactStep(buffer)
    } catch (e) {
      send(ws, { type: 'react_error', step, message: e.message })
      break
    }

    send(ws, { type: 'react_thought', step, thought: parsed.thought, action: parsed.action })

    if (parsed.responseText) {
      streamSentences(ws, parsed.responseText)
    }

    if (parsed.action === 'remember' && parsed.params?.memoryNote) {
      rememberFact(parsed.params.memoryNote)
    }

    if (parsed.done || parsed.action === 'respond') {
      finalIntent = mapActionToIntent('respond', { responseText: parsed.responseText || 'Done, Boss.' })
      send(ws, { type: 'intent', data: finalIntent, reactStep: step, final: true })
      steps.push({ step, action: 'respond', result: parsed.responseText })
      break
    }

    const intent = parsed.intent
    finalIntent = intent

    if (CLIENT_ACTIONS.has(parsed.action)) {
      send(ws, {
        type: 'react_step',
        step,
        awaitClient: true,
        intent,
        action: parsed.action,
        params: parsed.params,
      })

      let observation = 'ok'
      try {
        observation = await waitForToolResult(step, signal)
      } catch (e) {
        observation = e.message || 'tool failed'
        send(ws, { type: 'react_tool_error', step, message: observation })
      }

      steps.push({ step, action: parsed.action, result: observation })
      messages.push({ role: 'assistant', content: buffer })
      messages.push({ role: 'user', content: buildObservationMessage(step, observation) })
      send(ws, { type: 'react_observation', step, observation })
      continue
    }

    steps.push({ step, action: parsed.action, result: parsed.responseText })
    send(ws, { type: 'intent', data: intent, reactStep: step })
    messages.push({ role: 'assistant', content: buffer })
    messages.push({
      role: 'user',
      content: buildObservationMessage(step, 'Server-side action noted. Continue or respond done.'),
    })
  }

  await saveExchange(userText, { intent: 'react', steps, final: finalIntent })
  send(ws, { type: 'react_done', steps: steps.length, final: finalIntent })
  send(ws, { type: 'done', mode: 'react' })
  return { steps, finalIntent }
}
