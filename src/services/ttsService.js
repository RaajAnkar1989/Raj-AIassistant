import { DEFAULT_FREE_VOICE } from '../constants/freeVoices'
import { getTtsOptions, loadVoicePro, resolveWorkingEngine } from '../utils/voiceSettings'
import { extractSpeakableText } from '../utils/speechText'
import { getVoiceBackend } from '../constants/elevenlabsStorage'
import { isMobileDevice } from '../utils/device'

const TTS_FETCH_TIMEOUT_MS = isMobileDevice() ? 18000 : 8000
const CHATTERBOX_TIMEOUT_MS = 20000

const MALE_WEB_SPEECH_RE =
  /daniel|alex|aaron|fred|gordon|ryan|guy|prabhat|rishi|david|james|tom|marcos|lee|nathan|oliver|arthur|boris|brian|callum|charlie|christopher|eric|ethan|finley|geraint|jason|jacob|john|liam|logan|mason|michael|noah|roger|sam|sebastian|stanley|thomas|william|andrew|martin|paul|peter|steve|joe|george|hugh|richard|arjun|kunal|rehaan|anbu|male/i

async function fetchWithTimeout(url, options = {}, timeoutMs = TTS_FETCH_TIMEOUT_MS) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

const WEB_SPEECH_QUALITY_RE = /neural|natural|enhanced|premium|google|samantha|karen|daniel|moira|veena|rishi|heera|aditi/i

let audioUnlocked = false
let primedAudio = null

export function unlockAudioPlayback() {
  if (audioUnlocked || typeof window === 'undefined') return Promise.resolve()
  return new Promise((resolve) => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (Ctx) {
        const ctx = new Ctx()
        const buf = ctx.createBuffer(1, 1, 22050)
        const src = ctx.createBufferSource()
        src.buffer = buf
        src.connect(ctx.destination)
        src.start(0)
        if (ctx.state === 'suspended') ctx.resume().finally(() => { audioUnlocked = true; resolve() })
        else { audioUnlocked = true; resolve() }
        return
      }
    } catch {}
    audioUnlocked = true
    resolve()
  })
}

/** Prime HTML5 audio during the user's tap — required for iPhone playback after async brain calls. */
export async function primeAudioForSession() {
  if (typeof window === 'undefined') return
  await unlockAudioPlayback()
  try {
    if (!primedAudio) {
      primedAudio = new Audio()
      primedAudio.preload = 'auto'
      primedAudio.playsInline = true
      primedAudio.setAttribute('playsinline', 'true')
      primedAudio.setAttribute('webkit-playsinline', 'true')
    }
    primedAudio.src =
      'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADhAC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAA4T/CAAA//tQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuMTAwA8MAAAAAAAAAABQgJAUHQQAB9AAA4QCbKAAA//tQZAwP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuMTAwA8MAAAAAAAAAABQgJAUHQQAB9AAA4QCbKAAA'
    primedAudio.volume = 0.01
    await primedAudio.play()
    primedAudio.pause()
    primedAudio.currentTime = 0
    audioUnlocked = true
  } catch {
    // Permission may arrive on first real playback attempt.
  }
}

function waitForVoices(timeoutMs = 2500) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      resolve([])
      return
    }
    const existing = window.speechSynthesis.getVoices()
    if (existing.length > 0) {
      resolve(existing)
      return
    }
    const done = () => resolve(window.speechSynthesis.getVoices())
    const t = setTimeout(done, timeoutMs)
    window.speechSynthesis.onvoiceschanged = () => {
      clearTimeout(t)
      done()
    }
  })
}

function trimForSpeech(text, maxLen = 180) {
  const t = String(text || '').trim()
  if (!t) return ''
  if (t.length <= maxLen) return t
  const cut = t.slice(0, maxLen)
  const lastPeriod = cut.lastIndexOf('.')
  if (lastPeriod > 40) return cut.slice(0, lastPeriod + 1)
  return `${cut.trim()}…`
}

function pickBestWebSpeechVoice(voices, lang = 'en-IN') {
  if (!voices?.length) return null
  const langLower = (lang || 'en-IN').toLowerCase()
  const prefix = langLower.split('-')[0]
  const score = (v) => {
    const name = v.name || ''
    const vlang = (v.lang || '').toLowerCase()
    let s = 0
    if (vlang.startsWith(langLower)) s += 40
    else if (vlang.startsWith(prefix)) s += 20
    if (MALE_WEB_SPEECH_RE.test(name)) s += 35
    if (WEB_SPEECH_QUALITY_RE.test(name)) s += 20
    if (/google/i.test(name)) s += 10
    if (v.localService) s += 5
    return s
  }
  return [...voices].sort((a, b) => score(b) - score(a))[0] || null
}

function resolveNeuralVoiceId(options) {
  if (options.azureVoiceName && /Neural|Multilingual/i.test(options.azureVoiceName)) {
    return options.azureVoiceName
  }
  return DEFAULT_FREE_VOICE
}

export const TTS_INTERRUPTED = 'INTERRUPTED'

let chatterboxWarmed = false
let edgeWarmed = false

export async function warmUpChatterbox() {
  if (!import.meta.env.DEV || chatterboxWarmed) return
  chatterboxWarmed = true
  try {
    await fetchWithTimeout(
      '/api/tts/chatterbox',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Ready.', exaggeration: 0.45, cfg_weight: 0 }),
      },
      CHATTERBOX_TIMEOUT_MS
    )
  } catch {
    chatterboxWarmed = false
  }
}

export async function warmUpEdgeTts() {
  if (edgeWarmed) return
  edgeWarmed = true
  try {
    await fetchWithTimeout(
      '/api/tts/edge',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Ready.' }),
      },
      TTS_FETCH_TIMEOUT_MS
    )
  } catch {
    edgeWarmed = false
  }
}

function interruptedError() {
  const err = new Error('Speech interrupted')
  err.code = TTS_INTERRUPTED
  return err
}

class TtsService {
  constructor() {
    this.currentAudio = null
    this.muted = false
    this.speakGeneration = 0
    this.activeReject = null
  }

  setMuted(muted) {
    this.muted = muted
    if (muted) this.stop()
  }

  stop() {
    this.speakGeneration += 1
    if (this.activeReject) {
      try {
        this.activeReject(interruptedError())
      } catch {}
      this.activeReject = null
    }
    try {
      if (this.currentAudio) {
        this.currentAudio.pause()
        this.currentAudio.src = ''
        this.currentAudio = null
      }
    } catch {}
    try {
      window?.speechSynthesis?.cancel()
    } catch {}
  }

  isInterrupted(gen) {
    return gen !== this.speakGeneration
  }

  async playAudioBlob(blob, volume = 1) {
    if (this.muted) return
    await unlockAudioPlayback()
    const gen = this.speakGeneration
    const url = URL.createObjectURL(blob)
    return new Promise((resolve, reject) => {
      this.activeReject = reject
      const audio = primedAudio || new Audio()
      if (!primedAudio) {
        audio.preload = 'auto'
        audio.playsInline = true
        audio.setAttribute('playsinline', 'true')
        audio.setAttribute('webkit-playsinline', 'true')
      }
      primedAudio = audio
      audio.volume = Math.min(1, Math.max(0, volume ?? 1))
      audio.src = url
      this.currentAudio = audio
      const cleanup = () => {
        try { URL.revokeObjectURL(url) } catch {}
        if (this.currentAudio === audio) this.currentAudio = null
        if (this.activeReject === reject) this.activeReject = null
      }
      const finish = (fn) => {
        if (this.isInterrupted(gen)) {
          cleanup()
          fn(interruptedError())
          return
        }
        cleanup()
        fn()
      }
      const tryPlay = () =>
        audio
          .play()
          .then(() => {
            audioUnlocked = true
          })
          .catch(async (e) => {
            if (e?.name === 'NotAllowedError') {
              await unlockAudioPlayback()
              return audio.play()
            }
            throw e
          })

      audio.onended = () => finish(resolve)
      audio.onerror = () => finish(() => reject(new Error('Audio playback failed')))
      tryPlay().catch((e) => finish(() => reject(e)))
    })
  }

  async speakWebSpeech(text, options = {}) {
    if (this.muted) return
    if (!window.speechSynthesis) {
      throw new Error('Speech synthesis not supported in this browser')
    }
    await unlockAudioPlayback()
    const voices = await waitForVoices()
    const gen = this.speakGeneration
    return new Promise((resolve, reject) => {
      this.activeReject = reject
      try {
        window.speechSynthesis.cancel()
      } catch {}

      const utter = new SpeechSynthesisUtterance(trimForSpeech(text))
      const lang = options.lang || 'en-IN'
      utter.lang = lang
      utter.rate = options.rate ?? 0.95
      utter.pitch = options.pitch ?? 1
      utter.volume = options.volume ?? 1

      let voice = null
      if (options.webSpeechVoiceName) {
        voice = voices.find((v) => v.name === options.webSpeechVoiceName)
      }
      if (!voice) voice = pickBestWebSpeechVoice(voices, lang)
      if (voice) utter.voice = voice

      let resumeTimer = null
      const cleanup = () => {
        if (resumeTimer) clearInterval(resumeTimer)
      }

      const finish = (fn) => {
        cleanup()
        if (this.activeReject === reject) this.activeReject = null
        if (this.isInterrupted(gen)) fn(interruptedError())
        else fn()
      }

      let started = false
      const watchdog = setTimeout(() => {
        if (started) return
        try {
          window.speechSynthesis.cancel()
        } catch {}
        finish(() => reject(new Error('Speech did not start — retry after Raj finishes listening')))
      }, 1500)

      utter.onstart = () => {
        started = true
        clearTimeout(watchdog)
      }

      utter.onend = () => {
        clearTimeout(watchdog)
        finish(resolve)
      }
      utter.onerror = (e) => {
        clearTimeout(watchdog)
        finish(() => reject(new Error(e?.error || 'Speech failed')))
      }

      // iOS Safari often pauses speechSynthesis until resumed
      resumeTimer = setInterval(() => {
        try {
          if (window.speechSynthesis.paused) window.speechSynthesis.resume()
        } catch {}
      }, 200)

      window.speechSynthesis.speak(utter)
    })
  }

  buildAzureSsml({ text, voiceName, style, rate, pitch, lang = 'en-IN' }) {
    const safeText = (text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const prosodyRate = typeof rate === 'number' ? `${Math.round((rate - 1) * 100)}%` : '0%'
    const prosodyPitch = typeof pitch === 'number' ? `${Math.round((pitch - 1) * 100)}%` : '0%'
    const voice = voiceName || DEFAULT_FREE_VOICE
    const styleOpen = style ? `<mstts:express-as style="${style}">` : ''
    const styleClose = style ? '</mstts:express-as>' : ''
    return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="${lang}">
  <voice name="${voice}">${styleOpen}<prosody rate="${prosodyRate}" pitch="${prosodyPitch}">${safeText}</prosody>${styleClose}</voice>
</speak>`
  }

  async speakAzure(text, opts) {
    const endpoint = `https://${opts.region}.tts.speech.microsoft.com/cognitiveservices/v1`
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': opts.key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      },
      body: this.buildAzureSsml({
        text,
        voiceName: opts.voiceName,
        style: opts.style,
        rate: opts.rate,
        pitch: opts.pitch,
        lang: opts.lang,
      }),
    })
    if (!res.ok) throw new Error(`Azure TTS failed (${res.status})`)
    const buf = await res.arrayBuffer()
    await this.playAudioBlob(new Blob([buf], { type: 'audio/mpeg' }), opts.volume)
  }

  async speakChatterbox(text, options = {}) {
    const spoken = trimForSpeech(text)
    const res = await fetchWithTimeout(
      '/api/tts/chatterbox',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: spoken,
          exaggeration: options.chatterboxExaggeration ?? 0.45,
          cfg_weight: options.chatterboxCfgWeight ?? 0,
        }),
      },
      CHATTERBOX_TIMEOUT_MS
    )
    if (!res.ok) {
      let detail = `Chatterbox TTS failed (${res.status})`
      try {
        const body = await res.json()
        if (body?.error) detail = body.error
      } catch {}
      throw new Error(detail)
    }
    const buf = await res.arrayBuffer()
    await this.playAudioBlob(new Blob([buf], { type: 'audio/wav' }), options.volume)
  }

  async speakEdge(text, options = {}) {
    const voice = options.azureVoiceName || resolveNeuralVoiceId(options)
    const res = await fetchWithTimeout(
      '/api/tts/edge',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: trimForSpeech(text),
          voice,
          rate: options.rate,
          pitch: options.pitch,
        }),
      },
      TTS_FETCH_TIMEOUT_MS
    )
    if (!res.ok) throw new Error(`Edge TTS failed (${res.status})`)
    const buf = await res.arrayBuffer()
    await this.playAudioBlob(new Blob([buf], { type: 'audio/mpeg' }), options.volume)
  }

  async speakOpenAI(text, options = {}) {
    let apiKey = ''
    try {
      const ai = JSON.parse(localStorage.getItem('ai_pro_settings') || '{}')
      apiKey = ai.apiKey || ''
    } catch {}
    if (!apiKey) apiKey = localStorage.getItem('openai_api_key') || ''
    if (!apiKey) throw new Error('OpenAI API key missing')

    const voices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
    let voice = (options.voiceName || 'nova').toLowerCase()
    if (!voices.includes(voice)) voice = 'nova'

    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'tts-1', input: text, voice }),
    })
    if (!res.ok) throw new Error(`OpenAI TTS failed (${res.status})`)
    const buf = await res.arrayBuffer()
    await this.playAudioBlob(new Blob([buf], { type: 'audio/mpeg' }), options.volume)
  }

  async speakElevenLabs(text, options = {}) {
    if (!options.elevenLabsKey) throw new Error('ElevenLabs API key missing')
    const voiceId = options.elevenLabsVoiceId || '21m00Tcm4TlvDq8ikWAM'
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': options.elevenLabsKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    })
    if (!res.ok) throw new Error(`ElevenLabs TTS failed (${res.status})`)
    const buf = await res.arrayBuffer()
    await this.playAudioBlob(new Blob([buf], { type: 'audio/mpeg' }), options.volume)
  }

  async tryEngine(engine, text, opts) {
    if (engine === 'openai') return this.speakOpenAI(text, opts)
    if (engine === 'azure') {
      if (!opts.key || !opts.region) throw new Error('Azure keys missing')
      return this.speakAzure(text, {
        key: opts.key,
        region: opts.region,
        voiceName: opts.azureVoiceName,
        style: opts.style,
        rate: opts.rate,
        pitch: opts.pitch,
        lang: opts.lang,
        volume: opts.volume,
      })
    }
    if (engine === 'elevenlabs') return this.speakElevenLabs(text, opts)
    if (engine === 'edge') return this.speakEdge(text, opts)
    if (engine === 'chatterbox') return this.speakChatterbox(text, opts)
    if (engine === 'web-speech') return this.speakWebSpeech(text, opts)
    throw new Error(`Unknown engine: ${engine}`)
  }

  async speak(text, options = {}) {
    if (!text?.trim()) return { engine: null }
    const spokenInput = extractSpeakableText(text) || String(text || '').trim()
    if (!spokenInput) return { engine: null }
    const pro = loadVoicePro()
    const userRequested = options.engine ?? pro.ttsEngine ?? 'auto'
    const opts = { ...getTtsOptions(options), ...options }
    const freeMode = getVoiceBackend() === 'free'
    const primary = resolveWorkingEngine(userRequested, pro)
    const spokenText = trimForSpeech(spokenInput)

    const freeChain = ['chatterbox', 'edge', 'web-speech']
    let chain = [primary, ...freeChain.filter((e) => e !== primary)]

    if (freeMode) {
      if (import.meta.env.DEV) {
        chain = ['edge', 'chatterbox', 'web-speech']
      } else {
        chain = ['edge', 'web-speech']
      }
      if (userRequested === 'edge' || userRequested === 'web-speech') {
        chain = [userRequested, ...chain.filter((e) => e !== userRequested)]
      }
    } else {
      chain = [
        primary,
        ...['openai', 'azure', 'elevenlabs', 'chatterbox', 'edge', 'web-speech'].filter(
          (e, i, arr) => arr.indexOf(e) === i && e !== primary
        ),
      ]
    }

    let lastError = null
    for (const engine of chain) {
      try {
        if (engine === 'chatterbox' && !import.meta.env.DEV) continue
        if (engine === 'azure' && (!opts.key || !opts.region)) continue
        if (engine === 'openai') {
          const v = (opts.voiceName || 'nova').toLowerCase()
          if (!['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].includes(v)) {
            opts.voiceName = 'nova'
          }
        }
        await this.tryEngine(engine, spokenText, { ...opts, engine })
        if (engine === 'web-speech' && freeMode && userRequested !== 'web-speech') {
          console.warn('Neural TTS unavailable — fell back to browser voice')
        }
        return { engine, ok: true }
      } catch (e) {
        if (e?.code === TTS_INTERRUPTED) return { engine, interrupted: true }
        lastError = e
        if (e?.name === 'AbortError') {
          console.warn(`TTS ${engine} timed out`)
        } else {
          console.warn(`TTS ${engine} failed:`, e.message)
        }
      }
    }
    const fallbackMsg =
      isMobileDevice() && freeMode
        ? lastError?.message?.includes('NotAllowed')
          ? 'Tap the mic once, then speak again so Raj can play voice on iPhone.'
          : lastError?.message || 'Voice playback failed on phone. Tap mic to restart session.'
        : lastError?.message
    throw new Error(fallbackMsg || 'All TTS engines failed')
  }
}

const ttsService = new TtsService()
export default ttsService
