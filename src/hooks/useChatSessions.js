import { useCallback, useEffect, useState } from 'react'
import {
  CHAT_ACTIVE_KEY,
  CHAT_SESSIONS_KEY,
  MAX_CHAT_SESSIONS,
  MAX_MESSAGES_PER_SESSION,
} from '../constants/chatAppStorage'

function loadSessions() {
  try {
    const raw = localStorage.getItem(CHAT_SESSIONS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveSessions(sessions) {
  localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(sessions.slice(0, MAX_CHAT_SESSIONS)))
}

function sessionTitle(messages) {
  const first = messages.find((m) => m.role === 'user' && m.content?.trim())
  if (!first) return 'New chat'
  const t = first.content.trim().replace(/\s+/g, ' ')
  return t.length > 42 ? `${t.slice(0, 42)}…` : t
}

export function createEmptySession() {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    title: 'New chat',
    messages: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function useChatSessions() {
  const [sessions, setSessions] = useState(loadSessions)
  const [activeId, setActiveId] = useState(() => {
    try {
      return localStorage.getItem(CHAT_ACTIVE_KEY) || ''
    } catch {
      return ''
    }
  })

  const activeSession = sessions.find((s) => s.id === activeId) || sessions[0] || null

  useEffect(() => {
    saveSessions(sessions)
  }, [sessions])

  useEffect(() => {
    try {
      if (activeId) localStorage.setItem(CHAT_ACTIVE_KEY, activeId)
    } catch {}
  }, [activeId])

  const ensureSession = useCallback(() => {
    if (activeSession) return activeSession.id
    const session = createEmptySession()
    setSessions((prev) => [session, ...prev])
    setActiveId(session.id)
    return session.id
  }, [activeSession])

  const newSession = useCallback(() => {
    const session = createEmptySession()
    setSessions((prev) => [session, ...prev].slice(0, MAX_CHAT_SESSIONS))
    setActiveId(session.id)
    return session
  }, [])

  const selectSession = useCallback((id) => {
    setActiveId(id)
  }, [])

  const deleteSession = useCallback(
    (id) => {
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== id)
        if (activeId === id) {
          setActiveId(next[0]?.id || '')
        }
        return next
      })
    },
    [activeId],
  )

  const appendMessage = useCallback((sessionId, message) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionId) return s
        const messages = [...s.messages, message].slice(-MAX_MESSAGES_PER_SESSION)
        return {
          ...s,
          messages,
          title: sessionTitle(messages),
          updatedAt: new Date().toISOString(),
        }
      }),
    )
  }, [])

  const updateMessage = useCallback((sessionId, messageId, patch) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionId) return s
        const messages = s.messages.map((m) => (m.id === messageId ? { ...m, ...patch } : m))
        return { ...s, messages, updatedAt: new Date().toISOString() }
      }),
    )
  }, [])

  return {
    sessions,
    activeSession,
    activeId,
    ensureSession,
    newSession,
    selectSession,
    deleteSession,
    appendMessage,
    updateMessage,
  }
}
