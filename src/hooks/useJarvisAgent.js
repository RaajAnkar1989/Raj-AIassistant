import { useCallback, useEffect, useRef, useState } from 'react'
import { JarvisAgentClient, probeAgentServer, isAgentModePreferred } from '../services/jarvisAgentClient'
import { streamingVoiceQueue } from '../services/streamingVoiceService'

/** Voice session states for Jarvis HUD */
export const JARVIS_STATES = {
  IDLE: 'idle',
  LISTENING: 'listening',
  THINKING: 'thinking',
  SPEAKING: 'speaking',
}

export function useJarvisAgent({ onIntent, onReactStep, onError } = {}) {
  const [agentState, setAgentState] = useState(JARVIS_STATES.IDLE)
  const [streamText, setStreamText] = useState('')
  const [agentOnline, setAgentOnline] = useState(false)
  const [routeInfo, setRouteInfo] = useState(null)
  const [reactInfo, setReactInfo] = useState(null)
  const clientRef = useRef(null)
  const fullTextRef = useRef('')

  useEffect(() => {
    let cancelled = false
    probeAgentServer().then((info) => {
      if (!cancelled) setAgentOnline(Boolean(info.ok))
    })
    return () => {
      cancelled = true
    }
  }, [])

  const ensureClient = useCallback(async () => {
    if (!clientRef.current) {
      const client = new JarvisAgentClient()
      client.on('state', (state) => {
        if (state === 'thinking') setAgentState(JARVIS_STATES.THINKING)
        else if (state === 'listening') setAgentState(JARVIS_STATES.LISTENING)
        else if (state === 'idle') setAgentState(JARVIS_STATES.IDLE)
      })
      client.on('token', (msg) => {
        fullTextRef.current = msg.full || fullTextRef.current + msg.text
        setStreamText(fullTextRef.current)
      })
      client.on('sentence', (text) => {
        setAgentState(JARVIS_STATES.SPEAKING)
        streamingVoiceQueue.enqueue(text)
      })
      client.on('intent', (data, msg) => {
        onIntent?.(data, msg)
      })
      client.on('react_step', async (msg) => {
        setReactInfo({ step: msg.step, action: msg.action })
        if (!onReactStep) {
          client.sendToolResult(msg.step, 'no handler')
          return
        }
        try {
          const result = await onReactStep(msg.intent || msg.params, msg)
          client.sendToolResult(msg.step, result)
        } catch (e) {
          client.sendToolResult(msg.step, e?.message || 'tool failed')
        }
      })
      client.on('react_thought', (msg) => {
        setReactInfo({ step: msg.step, thought: msg.thought, action: msg.action })
      })
      client.on('react_done', () => setReactInfo(null))
      client.on('route', (info) => setRouteInfo(info))
      client.on('done', () => {
        setAgentState(JARVIS_STATES.IDLE)
        setReactInfo(null)
      })
      client.on('error', (message) => {
        onError?.(message)
        setAgentState(JARVIS_STATES.IDLE)
      })
      clientRef.current = client
    }
    if (!clientRef.current.connected) {
      await clientRef.current.connect()
    }
    return clientRef.current
  }, [onIntent, onReactStep, onError])

  const sendMessage = useCallback(
    async (text) => {
      fullTextRef.current = ''
      setStreamText('')
      setReactInfo(null)
      streamingVoiceQueue.reset()
      streamingVoiceQueue.resume()
      setAgentState(JARVIS_STATES.THINKING)
      const client = await ensureClient()

      return new Promise((resolve, reject) => {
        const onDone = () => {
          cleanup()
          setAgentState(JARVIS_STATES.IDLE)
          resolve()
        }
        const onErrorEvt = (message) => {
          cleanup()
          setAgentState(JARVIS_STATES.IDLE)
          reject(new Error(message || 'Agent failed'))
        }
        const cleanup = () => {
          client.handlers.done = prevDone
          client.handlers.error = prevError
        }
        const prevDone = client.handlers.done
        const prevError = client.handlers.error
        client.handlers.done = (...args) => {
          prevDone?.(...args)
          onDone()
        }
        client.handlers.error = (...args) => {
          prevError?.(...args)
          onErrorEvt(args[0])
        }
        try {
          client.sendUserMessage(text)
        } catch (e) {
          cleanup()
          reject(e)
        }
      })
    },
    [ensureClient]
  )

  const cancel = useCallback(() => {
    clientRef.current?.cancel()
    streamingVoiceQueue.stop()
    setAgentState(JARVIS_STATES.IDLE)
    setReactInfo(null)
  }, [])

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect()
    streamingVoiceQueue.stop()
  }, [])

  useEffect(() => () => disconnect(), [disconnect])

  return {
    agentState,
    streamText,
    agentOnline,
    routeInfo,
    reactInfo,
    agentModeEnabled: isAgentModePreferred(),
    sendMessage,
    cancel,
    disconnect,
    ensureClient,
  }
}
