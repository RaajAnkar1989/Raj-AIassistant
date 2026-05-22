# Raj Assistant — Integrations

## Stage 2: Google (Gmail + Calendar)

Raj can **read and act** via APIs — not in-app email/calendar screens.

### Setup (one time)

1. [Google Cloud Console](https://console.cloud.google.com/) → create or select your project
2. Enable both APIs (**required** — Raj will error if either is off):
   - [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com) → **Enable**
   - [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com) → **Enable**
   - After enabling Calendar API, wait **2–5 minutes**, then Raj Settings → **Connect Google** again.
3. Create **OAuth 2.0 Client ID** (Web application)
4. **Authorized JavaScript origins** (OAuth 2.0 Client ID → Web application):
   - Open Raj **Settings** and use **Copy origins** — paste each URL into Google Cloud (no trailing `/`).
   - Dev runs on **`https://localhost:3002`** (HTTPS, port 3002). Do **not** use `http://` unless that is what the browser bar shows.
   - On iPhone over Wi‑Fi, also add your network URL from the terminal (e.g. `https://192.168.0.64:3002`).
   - Add your production URL when you deploy (e.g. `https://your-domain.com`).
5. Paste Client ID in Raj **Settings → Connect Google**

### Fix: `Error 400: origin_mismatch`

Google only allows sign-in from origins you listed. Your app’s origin is whatever appears in the browser address bar (scheme + host + port).

| You open Raj at | Add this origin in Cloud Console |
|-----------------|----------------------------------|
| `https://localhost:3002/` | `https://localhost:3002` |
| `https://192.168.0.64:3002/` (iPhone on Wi‑Fi) | `https://192.168.0.64:3002` |
| `http://localhost:3002/` (rare) | `http://localhost:3002` |

After saving in Google Cloud, wait 1–2 minutes, hard-refresh Raj, then **Connect Google** again.

**Tip:** Free port 3000 (`lsof -i :3000` then stop the other process) so `npm run dev` always uses the same origin.

### Connect before voice (important)

1. Raj **Settings** → paste Google Client ID → **Connect Google** (allow Gmail + Calendar).
2. Tap **Test Gmail & Calendar** — should show success.
3. **Then** start a voice session. OAuth popups usually **fail during** a live call.

### Voice commands (after connect)

| Say… | Tool used | Action |
|------|-----------|--------|
| Connect Google | `connect_google` | OAuth consent |
| Read my emails | `read_emails` | Speaks inbox summary |
| Any unread mail? | `read_emails` (unread) | Unread only |
| Send email to boss@… | `send_gmail` | Sends via Gmail API |
| Read my calendar | `read_calendar` | Speaks upcoming events |
| Schedule meeting noon with John | `create_calendar_event` | Creates Google Calendar event |

### ElevenLabs agent tools (required)

Google sign-in in the app is not enough — the agent must **call** `read_emails`. If Raj says it cannot access email for privacy, the ElevenLabs agent is missing client tools or still has an old system prompt.

**Full setup:** [ELEVENLABS_AGENT_SETUP.md](./ELEVENLABS_AGENT_SETUP.md)

Add these **client tools** on your [ElevenLabs agent](https://elevenlabs.io/app/agents) **Raaj-AI-Assistant-New** (`agent_6401ks3bv7wafb5sr6dgwqstsa98`) with matching names (**Wait for response: ON** for `read_emails` and `read_calendar`):

- `connect_google`
- `read_emails`
- `send_gmail`
- `read_calendar`
- `create_calendar_event`
- `open_gmail` — opens Gmail app on phone
- `open_whatsapp`, `open_messages`, `compose_email`, `get_weather`

### iPhone apps (unchanged)

WhatsApp, Messages, Mail compose still use **deep links** — opens the real app.

## Coming next

- Reminders / alarms (Shortcuts)
- Contacts lookup
- Slack / Teams (optional)
