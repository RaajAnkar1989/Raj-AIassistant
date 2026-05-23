/** Heuristic model + tool routing — zero LLM latency */

const TOOL_RE =
  /\b(open|play|start|launch|send|draft|compose|email|mail|whatsapp|message|text|sms|call|timer|remind|calendar|schedule|weather|youtube|spotify|gmail|maps|instagram|reminder|note)\b/i

const COMPLEX_RE =
  /\b(plan|analyze|research|compare|explain in detail|step by step|write a long|summarize my|strategy|debug|refactor|multi|several tasks)\b/i

const CHAT_RE =
  /^(hi|hello|hey|thanks|thank you|good morning|good evening|how are you|who are you|what can you)/i

const MULTI_STEP_RE =
  /\b(and then|then also|also|after that|first.*then|play.*timer|email.*and|set a timer.*play|play.*set)\b/i

export function classifyQuery(text) {
  const q = String(text || '').trim()
  if (!q) return { tier: 'fast', mode: 'chat', reason: 'empty' }

  if (MULTI_STEP_RE.test(q) || COMPLEX_RE.test(q)) {
    return { tier: 'smart', mode: 'react', reason: 'multi_step' }
  }

  if (TOOL_RE.test(q)) {
    return { tier: 'fast', mode: 'agent', reason: 'tool_keyword' }
  }

  if (CHAT_RE.test(q)) {
    return { tier: 'fast', mode: 'chat', reason: 'greeting' }
  }

  if (q.length > 120) {
    return { tier: 'smart', mode: 'chat', reason: 'long_query' }
  }

  return { tier: 'fast', mode: 'chat', reason: 'default' }
}

/** Escalate to smart model when fast JSON parse fails or intent is ambiguous */
export function shouldEscalate({ route, parseError, intent }) {
  if (route.tier === 'smart') return false
  if (parseError) return true
  if (intent?.intent === 'help' && route.mode === 'agent') return true
  return false
}
