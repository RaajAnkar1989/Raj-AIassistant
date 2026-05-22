import React, { useMemo } from 'react'
import { ConversationProvider } from '@elevenlabs/react'
import AssistantHome from './AssistantHome'
import {
  getElevenLabsSessionDefaults,
  getElevenLabsAgentId,
  getPreferredConnectionType,
} from '../constants/elevenlabsAgent'
import { buildElevenLabsClientTools } from '../services/clientToolHandlers'

const AssistantShell = () => {
  const agentId = useMemo(() => getElevenLabsAgentId(), [])
  const connectionType = useMemo(() => getPreferredConnectionType(), [])
  const apiKey = useMemo(() => getElevenLabsSessionDefaults().authorization, [])
  const clientTools = useMemo(() => buildElevenLabsClientTools(), [])

  return (
    <ConversationProvider
      agentId={agentId}
      connectionType={connectionType}
      authorization={apiKey}
      clientTools={clientTools}
    >
      <AssistantHome />
    </ConversationProvider>
  )
}

export default AssistantShell
