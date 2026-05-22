import { getActionSession } from '../utils/actionSession'

function cleanMessage(text) {
  return String(text || '')
    .replace(/^["']|["']$/g, '')
    .replace(/^(saying|that says|to say|message)\s+/i, '')
    .trim()
}

function extractContact(raw) {
  const name = String(raw || '')
    .replace(/^(my|the)\s+/i, '')
    .replace(/\s+(please|now|today)$/i, '')
    .trim()
  return {
    contact: name,
    phone: '',
    email: '',
    displayName: name,
  }
}

export function parseSessionCommand(command) {
  const text = String(command || '').trim()
  const lower = text.toLowerCase()

  if (/^(continue|carry on|keep going|go on)( the conversation| conversation| with that)?[.!]?$/i.test(lower)) {
    return { intent: 'session_continue' }
  }
  if (/^(yes|yeah|yep|ok|okay|sure|send it|send now|go ahead|confirm|open it|do it|proceed)[.!]?$/i.test(lower)) {
    return { intent: 'session_confirm' }
  }
  if (/^(cancel|never mind|nevermind|stop|forget it|scratch that|abort)[.!]?$/i.test(lower)) {
    return { intent: 'session_cancel' }
  }
  if (/^(change it|edit it|rewrite it|make it better|improve it|different tone)[.!]?$/i.test(lower)) {
    return { intent: 'session_refine', refinement: text }
  }

  return null
}

export function parseMessagingCommand(command) {
  const text = String(command || '').trim()
  const lower = text.toLowerCase()

  const whatsappPatterns = [
    /(?:send|whatsapp|message|text)\s+(?:a\s+)?(?:message\s+)?(?:to|for)\s+(?:my\s+)?(.+?)(?:\s+(?:saying|that says|to say|message|with|about|:)\s+(.+))?$/i,
    /(?:tell|message|text|whatsapp)\s+(?:my\s+)?(.+?)\s+(?:that|to say|saying)\s+(.+)$/i,
    /whatsapp\s+(?:my\s+)?(.+?)(?:\s+(?:saying|message|:)\s+(.+))?$/i,
  ]

  for (const re of whatsappPatterns) {
    const m = text.match(re)
    if (!m) continue
    const who = extractContact(m[1])
    const msg = cleanMessage(m[2] || '')
    return {
      intent: 'send_whatsapp',
      contact: who.contact,
      displayName: who.displayName,
      phone: who.phone,
      rewrittenText: msg,
      needsMessage: !msg,
      channel: 'whatsapp',
    }
  }

  const smsMatch = text.match(
    /(?:send|text)\s+(?:an?\s+)?sms\s+(?:to|for)\s+(?:my\s+)?(.+?)(?:\s+(?:saying|that says|to say|message|:)\s+(.+))?$/i
  )
  if (smsMatch) {
    const who = extractContact(smsMatch[1])
    const msg = cleanMessage(smsMatch[2] || '')
    return {
      intent: 'send_sms',
      contact: who.contact,
      displayName: who.displayName,
      phone: who.phone,
      rewrittenText: msg,
      needsMessage: !msg,
      channel: 'sms',
    }
  }

  const emailPatterns = [
    /(?:draft|compose|write|send|prepare)\s+(?:an?\s+)?(?:email|mail|message)\s+(?:to|for)\s+(?:my\s+)?(.+?)(?:\s+(?:about|regarding|re:|subject:|on|for)\s+(.+))?$/i,
    /email\s+(?:my\s+)?(.+?)(?:\s+(?:about|regarding|re:)\s+(.+))?$/i,
  ]

  for (const re of emailPatterns) {
    const m = text.match(re)
    if (!m) continue
    const who = extractContact(m[1])
    const topic = cleanMessage(m[2] || '')
    return {
      intent: 'compose_email',
      contact: who.contact,
      displayName: who.displayName,
      to: who.email,
      toName: who.displayName,
      topic,
      body: topic,
      subject: topic ? topic.replace(/^\w/, (c) => c.toUpperCase()) : '',
      needsDraft: true,
      awaitConfirm: true,
      channel: 'email',
    }
  }

  if (/whatsapp/.test(lower) && !/open whatsapp/.test(lower)) {
    return { intent: 'send_whatsapp', needsMessage: true, channel: 'whatsapp' }
  }

  return null
}

/** If Raj asked "what should I say?", treat the next utterance as the message body. */
export function parsePendingReply(command) {
  const session = getActionSession()
  const pending = session?.pending
  if (!pending || pending.status !== 'awaiting_message') {
    if (pending?.status === 'awaiting_search') {
      const text = String(command || '').trim()
      if (!text || parseSessionCommand(text)) return null
      return {
        intent: 'open_app',
        appName: pending.appName || 'youtube',
        searchQuery: text,
      }
    }
    return null
  }

  const text = String(command || '').trim()
  if (!text || parseSessionCommand(text)) return null

  return {
    intent: pending.intent,
    contact: pending.contact,
    displayName: pending.displayName,
    phone: pending.phone,
    to: pending.to,
    toName: pending.toName,
    rewrittenText: text,
    channel: pending.channel,
    confirmed: true,
  }
}

export function enrichBrainCommand(command, localParse) {
  if (!localParse) return command
  const bits = [command]
  if (localParse.displayName) bits.push(`Contact: ${localParse.displayName}`)
  if (localParse.phone) bits.push(`Phone: ${localParse.phone}`)
  if (localParse.to) bits.push(`Email: ${localParse.to}`)
  if (localParse.topic) bits.push(`Topic: ${localParse.topic}`)
  bits.push('Return JSON only. For messages, polish rewrittenText. For email, include subject and body.')
  return bits.join('\n')
}
