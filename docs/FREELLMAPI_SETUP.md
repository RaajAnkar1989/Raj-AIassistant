# FreeLLMAPI (local free brain)

Raj Assistant can use [FreeLLMAPI](https://github.com/RaajAnkar1989/freellmapi) as its AI brain — one OpenAI-compatible endpoint that routes across free tiers (Gemini, Groq, Cerebras, etc.) with automatic failover.

The proxy lives in `tools/freellmapi/` and is **not bundled** into the PWA.

## Setup (one time)

**Terminal 1 — start FreeLLMAPI:**

```bash
npm run freellmapi
```

Open **http://localhost:5174** (or the port shown in the terminal) → **Keys** page:

1. Add at least one provider key (e.g. Google Gemini from [AI Studio](https://aistudio.google.com/apikey))
2. Copy your **unified API key** (`freellmapi-…`) from the Keys page header

**Terminal 2 — start Raj:**

```bash
npm run dev
```

In **Settings → AI Brain**:

- Provider: **FreeLLMAPI (local, free)**
- Model: **Auto** (recommended)
- Paste your `freellmapi-…` key → **Test connection**

## Why this fixes the Gemini error

Direct Gemini calls were falling back to deprecated `gemini-1.5-flash`. FreeLLMAPI routes to current models (e.g. Gemini 2.5 Flash) and retries on rate limits automatically.

## Optional env

```bash
# .env — skip pasting key in Settings
VITE_FREELLMAPI_KEY=freellmapi-your-unified-key
VITE_FREELLMAPI_URL=http://127.0.0.1:3001/v1
```

## Notes

- FreeLLMAPI is for **personal local use** — keep it on `127.0.0.1`.
- Voice (Chatterbox) and brain (FreeLLMAPI) are separate servers; run both if you want the full local stack.
