import React, { useRef, useState } from 'react'
import { AttachFile, Mic, Send, Stop } from '@mui/icons-material'
import { ACCEPTED_CHAT_FILES, MAX_ATTACHMENT_BYTES } from '../../constants/chatAppStorage'
import { readFileAsAttachment } from '../../services/chatService'
import toast from 'react-hot-toast'

export default function ChatComposer({
  onSend,
  onStop,
  disabled,
  isStreaming,
}) {
  const [text, setText] = useState('')
  const [pendingFiles, setPendingFiles] = useState([])
  const [listening, setListening] = useState(false)
  const fileRef = useRef(null)
  const recognitionRef = useRef(null)

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed && !pendingFiles.length) return
    onSend({ content: trimmed, attachments: pendingFiles })
    setText('')
    setPendingFiles([])
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!disabled && !isStreaming) handleSend()
    }
  }

  const onFilePick = async (e) => {
    const files = [...(e.target.files || [])]
    e.target.value = ''
    for (const file of files) {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        toast.error(`${file.name} is too large (max 4MB)`)
        continue
      }
      try {
        if (file.type.startsWith('image/')) {
          toast.loading('Compressing image for faster vision…', { id: 'raj-compress' })
        }
        const att = await readFileAsAttachment(file)
        if (file.type.startsWith('image/')) toast.dismiss('raj-compress')
        setPendingFiles((prev) => [...prev, att])
      } catch (err) {
        toast.dismiss('raj-compress')
        toast.error(err.message || 'Could not attach file')
      }
    }
  }

  const toggleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast.error('Voice input not supported in this browser')
      return
    }
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }
    const rec = new SpeechRecognition()
    rec.continuous = false
    rec.interimResults = true
    rec.lang = 'en-IN'
    recognitionRef.current = rec
    rec.onresult = (event) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript
      }
      setText(transcript.trim())
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    rec.start()
    setListening(true)
  }

  return (
    <div className="raj-chat-composer-wrap">
      <div className="raj-chat-composer">
        {pendingFiles.length > 0 && (
          <div className="raj-chat-composer-attachments">
            {pendingFiles.map((f) => (
              <span key={f.id} className="raj-chat-pending-attach">
                {f.name}
                <button
                  type="button"
                  aria-label="Remove"
                  onClick={() => setPendingFiles((prev) => prev.filter((x) => x.id !== f.id))}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="raj-chat-composer-row">
          <button
            type="button"
            className="raj-chat-icon-btn"
            onClick={() => fileRef.current?.click()}
            disabled={disabled || isStreaming}
            aria-label="Attach file"
          >
            <AttachFile />
          </button>
          <input
            ref={fileRef}
            type="file"
            hidden
            multiple
            accept={ACCEPTED_CHAT_FILES}
            onChange={onFilePick}
          />
          <textarea
            className="raj-chat-input"
            rows={1}
            placeholder="Message Raj… or “draw a cat in space”"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || isStreaming}
          />
          <button
            type="button"
            className={`raj-chat-icon-btn ${listening ? 'is-active' : ''}`}
            onClick={toggleVoiceInput}
            disabled={disabled || isStreaming}
            aria-label="Voice input"
          >
            <Mic />
          </button>
          {isStreaming ? (
            <button type="button" className="raj-chat-send-btn" onClick={onStop} aria-label="Stop">
              <Stop fontSize="small" />
            </button>
          ) : (
            <button
              type="button"
              className="raj-chat-send-btn"
              onClick={handleSend}
              disabled={disabled || (!text.trim() && !pendingFiles.length)}
              aria-label="Send"
            >
              <Send fontSize="small" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
