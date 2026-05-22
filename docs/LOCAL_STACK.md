# Raj local stack

One command starts everything for local dev:

```bash
npm run dev
```

| What | URL | Notes |
|------|-----|--------|
| **Raj app (UI)** | https://localhost:3002 | Main PWA |
| **Chatterbox voice** | http://127.0.0.1:8765 | Auto-started; first run loads models (~1GB) |
| **FreeLLMAPI brain** | http://127.0.0.1:3011/v1 | Auto-started |
| **FreeLLMAPI admin** | http://127.0.0.1:3011 | Add Gemini/Groq keys, copy `freellmapi-…` key |

## First-time setup

```bash
npm run setup:local
```

Installs FreeLLMAPI (if missing) and builds its admin UI once. Chatterbox is optional — see [CHATTERBOX_SETUP.md](./CHATTERBOX_SETUP.md).

## Settings

- **Voice:** Chatterbox (local) or Auto
- **Brain:** FreeLLMAPI (local) → paste unified key from http://127.0.0.1:3011

## App only (no local voice/brain)

```bash
RAJ_LOCAL_SERVICES=0 npm run dev
# or
npm run dev:app
```

## Run services individually (debugging)

```bash
npm run chatterbox
npm run freellmapi
```

See also: [CHATTERBOX_SETUP.md](./CHATTERBOX_SETUP.md), [FREELLMAPI_SETUP.md](./FREELLMAPI_SETUP.md)
