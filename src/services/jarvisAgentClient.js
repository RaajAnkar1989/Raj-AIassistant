/** WebSocket client for local Jarvis agent server */

const DEFAULT_WS = import.meta.env.VITE_JARVIS_AGENT_WS || ''
const DEFAULT_HTTP = import.meta.env.VITE_JARVIS_AGENT_URL || ''

function wsUrl() {
  if (DEFAULT_WS) return DEFAULT_WS
  if (import.meta.env.DEV) {
    return 'ws://127.0.0.1:8787/ws/agent'
  }
  if (DEFAULT_HTTP) {
    return DEFAULT_HTTP.replace(/^http/, 'ws').replace(/\/$/, '') + '/ws/agent'
  }
  return ''
}

function httpUrl(path) {
  if (DEFAULT_HTTP) return `${DEFAULT_HTTP.replace(/\/$/, '')}${path}`
  if (import.meta.env.DEV) return `http://${window.location.hostname}:8787${path}`
  return ''
}

export async function probeAgentServer() {
  const url = httpUrl('/health')
  if (!url) return { ok: false, reason: 'no_url' }
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) })
    if (!res.ok) return { ok: false, reason: 'bad_status' }
    const data = await res.json()
    return { ok: true, ...data }
  } catch {
    return { ok: false, reason: 'offline' }
  }
}

export class JarvisAgentClient {
  constructor(handlers = {}) {
    this.handlers = handlers
    this.ws = null
    this.connected = false
    this.connecting = false
  }

  on(event, fn) {
    this.handlers[event] = fn
  }

  emit(event, payload) {
    this.handlers[event]?.(payload)
  }

  async connect() {
    if (this.connected || this.connecting) return this.connected
    const url = wsUrl()
    if (!url) throw new Error('Jarvis agent URL not configured')

    this.connecting = true
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url)
      const timer = setTimeout(() => {
        ws.close()
        reject(new Error('Agent connection timeout'))
      }, 5000)

      ws.onopen = () => {
        clearTimeout(timer)
        this.ws = ws
        this.connected = true
        this.connecting = false
        resolve(true)
      }

      ws.onerror = () => {
        clearTimeout(timer)
        this.connecting = false
        reject(new Error('Agent WebSocket failed'))
      }

      ws.onclose = () => {
        this.connected = false
        this.ws = null
        this.emit('disconnected')
      }

      ws.onmessage = (ev) => {
        let msg
        try {
          msg = JSON.parse(ev.data)
        } catch {
          return
        }
        this.emit('message', msg)
        if (msg.type === 'state') this.emit('state', msg.state)
        if (msg.type === 'token') this.emit('token', msg)
        if (msg.type === 'sentence') this.emit('sentence', msg.text)
        if (msg.type === 'intent') this.emit('intent', msg.data, msg)
        if (msg.type === 'react_step') this.emit('react_step', msg)
        if (msg.type === 'react_thought') this.emit('react_thought', msg)
        if (msg.type === 'react_done') this.emit('react_done', msg)
        if (msg.type === 'done') this.emit('done', msg)
        if (msg.type === 'error') this.emit('error', msg.message)
        if (msg.type === 'route') this.emit('route', msg)
      }
    })
  }

  disconnect() {
    this.ws?.close()
    this.ws = null
    this.connected = false
  }

  sendUserMessage(text) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Agent not connected')
    }
    this.ws.send(JSON.stringify({ type: 'user_message', text }))
  }

  sendToolResult(step, result) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    this.ws.send(JSON.stringify({ type: 'tool_result', step, result: String(result ?? 'ok') }))
  }

  cancel() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'cancel' }))
    }
  }
}

export function isAgentModePreferred() {
  try {
    const flag = localStorage.getItem('jarvis_agent_streaming')
    if (flag === '0') return false
    if (flag === '1') return true
  } catch {}
  if (import.meta.env.VITE_JARVIS_AGENT_ENABLED === '1' || import.meta.env.VITE_JARVIS_AGENT_ENABLED === 'true') {
    return true
  }
  return import.meta.env.DEV
}

export function setAgentModePreferred(on) {
  try {
    localStorage.setItem('jarvis_agent_streaming', on ? '1' : '0')
  } catch {}
}
