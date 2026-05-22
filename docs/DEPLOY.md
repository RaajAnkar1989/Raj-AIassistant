# Deploy Raj (Netlify)

One Netlify site = **UI + Jarvis neural voice + PWA**. No separate TTS server.

## Jarvis voice (built into the same Netlify deploy)

Hosted Raj uses **Edge neural TTS** (Ryan, British male — Jarvis style) via a **Netlify Function** at `/api/tts/edge`.

- Same voice path as local dev (`/api/tts/edge`)
- No extra server, no API key for voice
- Chatterbox (local Python) is **optional on your Mac only** — too heavy for Netlify

| Environment | Voice engine |
|-------------|--------------|
| Mac `npm run dev` | Chatterbox → Edge → browser |
| Netlify (hosted) | **Edge Jarvis (bundled function)** → browser |

## Brain (AI) — same as local FreeLLMAPI

The brain is separate from voice. For auto-brain like local:

### 1. Get your FreeLLMAPI unified key (Mac)

```bash
npm run dev
curl -s http://127.0.0.1:3001/api/settings/api-key
```

Copy the `freellmapi-…` key. Add Gemini/Groq keys in FreeLLMAPI dashboard.

### 2. Host FreeLLMAPI OR use Gemini fallback

**Option A — FreeLLMAPI (like local):** deploy [FreeLLMAPI](https://github.com/tashfeenahmed/freellmapi) to Railway/Render, then set Netlify env:

```env
VITE_FREELLMAPI_URL=https://your-brain.up.railway.app/v1
VITE_FREELLMAPI_KEY=freellmapi-xxxxxxxx
```

**Option B — simpler:** Gemini only:

```env
VITE_GEMINI_API_KEY=AIza...
```

### 3. Netlify environment variables

| Variable | Required for |
|----------|----------------|
| `VITE_GOOGLE_CLIENT_ID` | Gmail / Calendar |
| `VITE_FREELLMAPI_URL` + `VITE_FREELLMAPI_KEY` | Auto brain (FreeLLMAPI) |
| `VITE_GEMINI_API_KEY` | Brain fallback |

Then **Deploy → Clear cache and deploy**.

### 4. Google OAuth

Add your Netlify URL in [Google Cloud Console](https://console.cloud.google.com/apis/credentials):

```
https://your-site.netlify.app
```

## Chatterbox on your Mac (optional, local only)

Chatterbox is **not** pushed to GitHub (1.4GB Python models). It installs locally:

```bash
npm run setup:local   # see docs/CHATTERBOX_SETUP.md
npm run dev
```

The server script `scripts/chatterbox_server.py` **is** in the repo.

## Repo

[github.com/RaajAnkar1989/Raj-AIassistant](https://github.com/RaajAnkar1989/Raj-AIassistant)
