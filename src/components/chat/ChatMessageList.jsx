import React, { useEffect, useRef } from 'react'

function MessageAttachments({ attachments }) {
  if (!attachments?.length) return null
  return (
    <div className="raj-chat-attachments">
      {attachments.map((a) =>
        (a.kind === 'image' || a.kind === 'generated') && a.dataUrl ? (
          <img
            key={a.id}
            src={a.dataUrl}
            alt={a.name}
            className={a.kind === 'generated' ? 'raj-chat-generated-image' : 'raj-chat-attachment-thumb'}
          />
        ) : (
          <span key={a.id} className="raj-chat-attachment-chip">
            {a.name}
          </span>
        ),
      )}
    </div>
  )
}

export default function ChatMessageList({ messages, streamingText, streamStatus, isStreaming }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText, isStreaming])

  if (!messages.length && !isStreaming) {
    return (
      <div className="raj-chat-messages">
        <div className="raj-chat-empty">
          <h2>Raj Chat</h2>
          <p>Chat, attach files, or say <strong>“draw a sunset over Mumbai”</strong> to create images.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="raj-chat-messages">
      {messages.map((msg) => (
        <div key={msg.id} className={`raj-chat-msg-row ${msg.role}`}>
          <div className="raj-chat-msg-avatar">{msg.role === 'user' ? 'You' : 'AI'}</div>
          <div className="raj-chat-msg-body">
            {msg.content}
            <MessageAttachments attachments={msg.attachments} />
          </div>
        </div>
      ))}
      {isStreaming && (
        <div className="raj-chat-msg-row assistant">
          <div className="raj-chat-msg-avatar">AI</div>
          <div className="raj-chat-msg-body">
            {streamingText || streamStatus || ''}
            {!streamingText && <span className="raj-chat-typing" />}
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
