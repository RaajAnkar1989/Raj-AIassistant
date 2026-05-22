import { getElevenLabsAgentId } from './elevenlabsStorage'

export { ELEVENLABS_AGENT_ID, ELEVENLABS_AGENT_NAME } from './elevenlabsStorage'
export {
  getElevenLabsAgentId,
  setElevenLabsAgentId,
  getUserSystemPromptOverride,
  setUserSystemPromptOverride,
  getElevenLabsPromptSource,
  isPromptOverrideEnabled,
  setPromptOverrideEnabled,
  getPreferredConnectionType,
  setPreferredConnectionType,
  getVoiceBackend,
  setVoiceBackend,
} from './elevenlabsStorage'

export function getElevenLabsApiKey() {
  return (
    import.meta.env.VITE_ELEVENLABS_API_KEY ||
    localStorage.getItem('elevenlabs_api_key') ||
    ''
  ).trim()
}

/** Optional xi-api-key for private agents; public agents may work with agentId only. */
export function getElevenLabsSessionDefaults() {
  const key = getElevenLabsApiKey()
  return {
    agentId: getElevenLabsAgentId(),
    connectionType: 'webrtc',
    ...(key ? { authorization: key } : {}),
  }
}
