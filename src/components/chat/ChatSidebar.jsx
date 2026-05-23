import React from 'react'
import { Add, DeleteOutline, GraphicEq, Menu } from '@mui/icons-material'

export default function ChatSidebar({
  sessions,
  activeId,
  onNewChat,
  onSelect,
  onDelete,
  onOpenVoice,
  open,
  onClose,
}) {
  return (
    <>
      {open && <div className="raj-chat-sidebar-backdrop" onClick={onClose} aria-hidden />}
      <aside className={`raj-chat-sidebar ${open ? 'is-open' : ''}`}>
        <div className="raj-chat-sidebar-header">
          <button type="button" className="raj-chat-new-btn" onClick={onNewChat}>
            <Add fontSize="small" />
            New chat
          </button>
          <button type="button" className="raj-chat-voice-link" onClick={onOpenVoice}>
            <GraphicEq fontSize="small" />
            Jarvis voice mode
          </button>
        </div>
        <div className="raj-chat-session-list">
          {sessions.map((s) => (
            <div key={s.id} className="raj-chat-session-item">
              <button
                type="button"
                className={`raj-chat-session-btn ${s.id === activeId ? 'is-active' : ''}`}
                onClick={() => {
                  onSelect(s.id)
                  onClose?.()
                }}
              >
                {s.title || 'New chat'}
              </button>
              <button
                type="button"
                className="raj-chat-session-delete"
                aria-label="Delete chat"
                onClick={() => onDelete(s.id)}
              >
                <DeleteOutline sx={{ fontSize: 16 }} />
              </button>
            </div>
          ))}
        </div>
      </aside>
    </>
  )
}

export function ChatSidebarToggle({ onClick }) {
  return (
    <button type="button" className="raj-chat-icon-btn raj-chat-sidebar-toggle" onClick={onClick} aria-label="Menu">
      <Menu />
    </button>
  )
}
