const STORAGE_KEY = 'raj_action_session'
const MAX_AGE_MS = 30 * 60 * 1000

export function getActionSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const session = JSON.parse(raw)
    if (!session?.updatedAt || Date.now() - session.updatedAt > MAX_AGE_MS) {
      sessionStorage.removeItem(STORAGE_KEY)
      return null
    }
    return session
  } catch {
    return null
  }
}

export function setActionSession(partial) {
  const prev = getActionSession() || {}
  const next = {
    ...prev,
    ...partial,
    updatedAt: Date.now(),
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export function clearActionSession() {
  sessionStorage.removeItem(STORAGE_KEY)
}

export function setPendingAction(pending) {
  return setActionSession({ pending: { ...pending, updatedAt: Date.now() } })
}

export function clearPendingAction() {
  const session = getActionSession()
  if (!session) return
  const { pending, ...rest } = session
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...rest, updatedAt: Date.now() }))
}
