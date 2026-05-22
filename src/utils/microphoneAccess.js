let activeStream = null

export function getMicPermissionHint() {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}

export function isSecureMicContext() {
  if (typeof window === 'undefined') return true
  return window.isSecureContext === true
}

function isEmbeddedPreviewBrowser() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  return /Cursor|VSCode|Code\/|Electron/i.test(ua) && !/Edg\/|Chrome\/[\d.]+.*Safari/i.test(ua)
}

export async function listAudioInputDevices() {
  if (!navigator.mediaDevices?.enumerateDevices) return []
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices.filter((d) => d.kind === 'audioinput')
  } catch {
    return []
  }
}

async function tryOpenMicrophone() {
  const attempts = [
    { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } },
    { audio: { echoCancellation: true, noiseSuppression: true } },
    { audio: true },
  ]

  let lastError = null
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints)
    } catch (e) {
      lastError = e
      if (e?.name === 'NotAllowedError' || e?.name === 'PermissionDeniedError') throw e
    }
  }
  throw lastError || new Error('Could not access microphone')
}

async function buildNotFoundMessage() {
  const inputs = await listAudioInputDevices()
  const origin = getMicPermissionHint()

  if (isEmbeddedPreviewBrowser()) {
    return `This IDE preview has no microphone. Open ${origin} in Safari or Chrome on your Mac, then tap the mic again.`
  }

  if (inputs.length > 0) {
    return `A microphone is listed (${inputs.length}) but the browser could not use it. Open ${origin} in Safari or Chrome, then check System Settings → Privacy & Security → Microphone and enable your browser.`
  }

  return `No microphone detected. On Mac: System Settings → Sound → Input → select Built-in Microphone (or your headset). Then reload ${origin} in Safari or Chrome.`
}

/** Request mic in the same user gesture as the tap (required on Safari/iOS). */
export async function requestMicrophoneAccess({ required = true } = {}) {
  if (!isSecureMicContext()) {
    const httpsHint = getMicPermissionHint().replace(/^http:/, 'https:')
    throw new Error(
      `iPhone needs HTTPS for the microphone. Open ${httpsHint} in Safari (tap "Show Details" → visit website if warned).`
    )
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    if (!required) return null
    throw new Error('Microphone API not available in this browser.')
  }

  if (navigator.permissions?.query) {
    try {
      const status = await navigator.permissions.query({ name: 'microphone' })
      if (status.state === 'denied') {
        throw new Error(
          `Microphone is blocked for ${getMicPermissionHint()}. In browser settings, allow the mic for this exact address (including the port number).`
        )
      }
    } catch (e) {
      if (e?.message?.includes('blocked for')) throw e
    }
  }

  releaseMicrophoneStream()

  try {
    activeStream = await tryOpenMicrophone()
    return activeStream
  } catch (e) {
    if (e?.name === 'NotAllowedError' || e?.name === 'PermissionDeniedError') {
      throw new Error(
        `Allow microphone for ${getMicPermissionHint()} — site settings must match this URL exactly (port included).`
      )
    }
    if (e?.name === 'NotFoundError' || e?.name === 'DevicesNotFoundError') {
      if (!required) return null
      const err = new Error(await buildNotFoundMessage())
      err.code = 'MIC_NOT_FOUND'
      throw err
    }
    throw new Error(e?.message || 'Could not access microphone.')
  }
}

export function releaseMicrophoneStream() {
  if (!activeStream) return
  activeStream.getTracks().forEach((t) => {
    try {
      t.stop()
    } catch {}
  })
  activeStream = null
}

export function hasActiveMicStream() {
  return Boolean(activeStream?.active)
}

export function getActiveMicStream() {
  return activeStream?.active ? activeStream : null
}
