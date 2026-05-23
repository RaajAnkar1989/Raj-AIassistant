import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getActiveProviderInfo } from '../../constants/aiProviders'
import { useChatSessions } from '../../hooks/useChatSessions'
import { streamChatReply } from '../../services/chatService'
import { syncOllamaFromLocal } from '../../services/ollamaSync'
import { isImageGenerationRequest, extractImagePrompt } from '../../utils/imageGenIntent'
import { generateChatImage } from '../../services/imageGenService'
import ChatSidebar, { ChatSidebarToggle } from './ChatSidebar'
import ChatMessageList from './ChatMessageList'
import ChatComposer from './ChatComposer'
import '../../styles/chat.css'

export default function ChatApp() {
  const navigate = useNavigate()
  const brain = getActiveProviderInfo()
  const {
    sessions,
    activeSession,
    activeId,
    ensureSession,
    newSession,
    selectSession,
    deleteSession,
    appendMessage,
  } = useChatSessions()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [streamStatus, setStreamStatus] = useState('')
  const abortRef = useRef(null)

  useEffect(() => {
    void syncOllamaFromLocal({ force: true })
  }, [])

  const handleSend = useCallback(
    async ({ content, attachments }) => {
      const sessionId = ensureSession()
      const priorMessages = activeSession?.id === sessionId ? activeSession.messages : []
      const userMsg = {
        id: crypto.randomUUID(),
        role: 'user',
        content:
          content ||
          (attachments?.some((a) => a.kind === 'image')
            ? 'Describe this image briefly.'
            : attachments?.length
              ? 'See attached files.'
              : ''),
        attachments: attachments || [],
        createdAt: new Date().toISOString(),
      }
      const history = [...priorMessages, userMsg]
      appendMessage(sessionId, userMsg)

      setIsStreaming(true)
      setStreamingText('')
      setStreamStatus('')
      const controller = new AbortController()
      abortRef.current = controller

      const isImageGen = !attachments?.length && isImageGenerationRequest(content)

      try {
        if (isImageGen) {
          const imagePrompt = extractImagePrompt(content)
          const result = await generateChatImage({
            prompt: imagePrompt,
            signal: controller.signal,
            onStatus: setStreamStatus,
          })
          appendMessage(sessionId, {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: result.caption || 'Here is your image:',
            attachments: [
              {
                id: crypto.randomUUID(),
                kind: 'generated',
                name: 'generated.png',
                mime: 'image/png',
                dataUrl: result.dataUrl,
              },
            ],
            createdAt: new Date().toISOString(),
          })
          return
        }

        const full = await streamChatReply({
          messages: history,
          signal: controller.signal,
          onStatus: setStreamStatus,
          onToken: (_delta, fullText) => {
            setStreamStatus('')
            setStreamingText(fullText)
          },
        })
        appendMessage(sessionId, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: full || '…',
          createdAt: new Date().toISOString(),
        })
      } catch (e) {
        if (e.name !== 'AbortError') {
          toast.error(e.message || 'Chat failed')
        }
      } finally {
        setIsStreaming(false)
        setStreamingText('')
        setStreamStatus('')
        abortRef.current = null
      }
    },
    [activeSession, appendMessage, ensureSession],
  )

  const handleStop = () => {
    abortRef.current?.abort()
    if (streamingText.trim() && activeId) {
      appendMessage(activeId, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: streamingText,
        createdAt: new Date().toISOString(),
      })
    }
    setIsStreaming(false)
    setStreamingText('')
    setStreamStatus('')
  }

  return (
    <div className="raj-chat-root">
      <ChatSidebar
        sessions={sessions}
        activeId={activeId}
        onNewChat={newSession}
        onSelect={selectSession}
        onDelete={deleteSession}
        onOpenVoice={() => navigate('/')}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="raj-chat-main">
        <header className="raj-chat-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ChatSidebarToggle onClick={() => setSidebarOpen(true)} />
            <div>
              <div className="raj-chat-header-title">{activeSession?.title || 'Raj Chat'}</div>
              <div className="raj-chat-header-meta">{brain.label} · natural chat</div>
            </div>
          </div>
        </header>
        <ChatMessageList
          messages={activeSession?.messages || []}
          streamingText={streamingText}
          streamStatus={streamStatus}
          isStreaming={isStreaming}
        />
        <ChatComposer onSend={handleSend} onStop={handleStop} disabled={false} isStreaming={isStreaming} />
      </div>
    </div>
  )
}
