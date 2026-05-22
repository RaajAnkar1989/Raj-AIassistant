import {
  getElevenLabsApiKey,
  getElevenLabsAgentId,
  getPreferredConnectionType,
} from '../constants/elevenlabsAgent'
import { getActiveSystemPromptOverride } from '../constants/rajAgentPrompt'

const TOKEN_URL = 'https://api.elevenlabs.io/v1/convai/conversation/token'

export async function fetchConversationToken(agentId = getElevenLabsAgentId(), apiKey = getElevenLabsApiKey()) {
  const params = new URLSearchParams({
    agent_id: agentId,
    source: 'js_sdk',
    version: '0.5.0',
  })
  const headers = {}
  if (apiKey) headers['xi-api-key'] = apiKey

  const res = await fetch(`${TOKEN_URL}?${params}`, { headers })
  if (!res.ok) {
    let detail = ''
    try {
      const body = await res.json()
      detail = body?.detail?.message || body?.detail || body?.message || ''
    } catch {}
    const quota = /quota|exceeds your quota|rate.?limit/i.test(detail)
    if (res.status === 429 || quota) {
      throw new Error(
        detail ||
          'ElevenLabs quota exceeded. Check your plan and usage at elevenlabs.io → Subscription.'
      )
    }
    throw new Error(
      `ElevenLabs token failed (${res.status})${detail ? `: ${detail}` : ''}. ` +
        (res.status === 401
          ? 'Add your API key in Settings if the agent requires authentication.'
          : 'Check agent ID is published on ElevenLabs.')
    )
  }
  const data = await res.json()
  if (!data?.token) throw new Error('No conversation token from ElevenLabs')
  return data.token
}

function applyPromptOverride(options) {
  const promptOverride = getActiveSystemPromptOverride()
  if (promptOverride) {
    options.overrides = {
      agent: {
        prompt: { prompt: promptOverride },
      },
    }
  }
  return options
}

/**
 * WebSocket avoids LiveKit/WebRTC — fixes "connection state changed to disconnected".
 */
export function buildWebSocketSessionOptions(agentId = getElevenLabsAgentId()) {
  const apiKey = getElevenLabsApiKey()
  const options = {
    agentId,
    connectionType: 'websocket',
    ...(apiKey ? { authorization: apiKey } : {}),
  }
  return applyPromptOverride(options)
}

export function buildWebRtcSessionOptions(conversationToken) {
  const options = {
    conversationToken,
    connectionType: 'webrtc',
  }
  return applyPromptOverride(options)
}

/** Pick transport from Settings (default: websocket for stability). */
export async function buildSessionStartOptions(agentId = getElevenLabsAgentId()) {
  const type = getPreferredConnectionType()
  if (type === 'websocket') {
    return buildWebSocketSessionOptions(agentId)
  }
  const token = await fetchConversationToken(agentId)
  return buildWebRtcSessionOptions(token)
}

/** @deprecated */
export function buildStableSessionOptions(conversationToken) {
  return buildWebRtcSessionOptions(conversationToken)
}

export function buildSessionVariants(conversationToken) {
  return [buildWebRtcSessionOptions(conversationToken)]
}

export async function buildPrimarySessionOptions() {
  return buildSessionStartOptions()
}

export async function buildMinimalSessionOptions() {
  return buildSessionStartOptions()
}

export function isLiveKitDisconnectMessage(message) {
  return /livekit|connection state changed to disconnected/i.test(String(message || ''))
}
