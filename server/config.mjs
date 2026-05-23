/** Jarvis agent server — local-first config */
export const PORT = Number(process.env.JARVIS_AGENT_PORT || 8787)
export const OLLAMA_URL = (process.env.OLLAMA_URL || 'http://127.0.0.1:11434').replace(/\/$/, '')

/** Fast model for voice latency (pull with: ollama pull qwen2.5:3b) */
export const FAST_MODEL =
  process.env.JARVIS_FAST_MODEL || process.env.VITE_OLLAMA_MODEL || 'qwen2.5:3b'

/** Smart model for tools / planning (pull with: ollama pull qwen2.5:14b) */
export const SMART_MODEL = process.env.JARVIS_SMART_MODEL || 'qwen2.5:14b'

export const MAX_CONTEXT_MESSAGES = 20
export const STREAM_OPTIONS = {
  fast: { temperature: 0.55, num_predict: 180, num_ctx: 4096 },
  smart: { temperature: 0.35, num_predict: 480, num_ctx: 8192 },
}
