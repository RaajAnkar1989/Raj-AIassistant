/**
 * Sentence-queue streaming TTS — starts playback before full LLM response completes.
 */
import { DEFAULT_FREE_VOICE } from '../constants/freeVoices'
import { getTtsOptions } from '../utils/voiceSettings'
import { extractSpeakableText } from '../utils/speechText'

const AGENT_TTS_URL = import.meta.env.DEV
  ? '/api/agent/tts'
  : import.meta.env.VITE_JARVIS_AGENT_URL
    ? `${import.meta.env.VITE_JARVIS_AGENT_URL.replace(/\/$/, '')}/api/agent/tts`
    : ''

export class StreamingVoiceQueue {
  constructor() {
    this.queue = []
    this.playing = false
    this.stopped = false
    this.currentAudio = null
    this.onStart = null
    this.onEnd = null
    this.onSentenceStart = null
  }

  reset() {
    this.stop()
    this.queue = []
    this.stopped = false
  }

  enqueue(text) {
    const t = extractSpeakableText(text) || String(text || '').trim()
    if (!t || this.stopped) return
    if (this.queue.includes(t)) return
    this.queue.push(t)
    void this.pump()
  }

  stop() {
    this.stopped = true
    this.queue = []
    this.playing = false
    if (this.currentAudio) {
      try {
        this.currentAudio.pause()
        this.currentAudio.src = ''
      } catch {}
      this.currentAudio = null
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
  }

  resume() {
    this.stopped = false
  }

  async synthesize(text, opts) {
    if (AGENT_TTS_URL) {
      const res = await fetch(AGENT_TTS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: opts.azureVoiceName || DEFAULT_FREE_VOICE,
          rate: opts.rate,
        }),
        signal: AbortSignal.timeout(12000),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.audioBase64) {
          const mime = data.mime || 'audio/mpeg'
          return { kind: 'blob', src: `data:${mime};base64,${data.audioBase64}` }
        }
      }
    }

    return { kind: 'webspeech', text }
  }

  playBlob(src) {
    return new Promise((resolve, reject) => {
      const audio = new Audio(src)
      audio.playsInline = true
      audio.setAttribute('playsinline', 'true')
      this.currentAudio = audio
      audio.onended = () => {
        this.currentAudio = null
        resolve()
      }
      audio.onerror = () => {
        this.currentAudio = null
        reject(new Error('Audio playback failed'))
      }
      audio.play().catch(reject)
    })
  }

  playWebSpeech(text, opts) {
    return new Promise((resolve, reject) => {
      if (!window.speechSynthesis) {
        reject(new Error('No speech synthesis'))
        return
      }
      const u = new SpeechSynthesisUtterance(text)
      u.rate = opts.rate ?? 1.08
      u.pitch = opts.pitch ?? 1
      u.volume = opts.volume ?? 1
      u.onend = () => resolve()
      u.onerror = (e) => reject(e.error || new Error('speech failed'))
      window.speechSynthesis.speak(u)
    })
  }

  async pump() {
    if (this.playing || this.stopped || !this.queue.length) return
    this.playing = true
    this.onStart?.()
    const opts = getTtsOptions({ azureVoiceName: DEFAULT_FREE_VOICE, rate: 1.08 })

    while (this.queue.length && !this.stopped) {
      const sentence = this.queue.shift()
      this.onSentenceStart?.(sentence)
      try {
        const result = await this.synthesize(sentence, opts)
        if (result.kind === 'blob') {
          await this.playBlob(result.src)
        } else {
          await this.playWebSpeech(result.text, opts)
        }
      } catch (e) {
        console.warn('[Jarvis] streaming TTS sentence failed:', e.message)
      }
    }

    this.playing = false
    this.onEnd?.()
  }
}

export const streamingVoiceQueue = new StreamingVoiceQueue()
