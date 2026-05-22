# ElevenLabs agent setup (required for Gmail / Calendar)

Raj’s app registers **client tool handlers** in code, but the **ElevenLabs agent** must also define the same tools and allow the model to call them. If tools are missing, Raj will say things like *“I cannot access your email for privacy reasons”* even after Google sign-in.

Agent: **Raaj-AI-Assistant-New** — `agent_6401ks3bv7wafb5sr6dgwqstsa98`

## 1. System prompt — why you still see the OLD prompt

ElevenLabs often keeps your **published Main branch version**, not unsaved edits:

| What you did | What conversations use |
|--------------|------------------------|
| Edited prompt but only **saved draft** | Old **published** version |
| Changed prompt on a **side branch** with 0% traffic | Old **Main** version (100% traffic) |
| Clicked Save but did not **commit / publish version** | Old version |

**Fix on ElevenLabs:**

1. Open agent → **Versioning** tab (if enabled).
2. On **Main** branch: edit system prompt → **Save / commit** a new version.
3. Set **Main = 100%** traffic (deployments must total 100%).
4. Or disable versioning and use classic **Publish** after editing.

**Fix in Raj app (immediate):**

1. Settings → paste your **new** system prompt in the text box → **Save settings**.
2. Hard refresh (`Cmd+Shift+R`), start a **new** voice session.
3. On ElevenLabs agent → **Security** → allow **system prompt override** (required when using pasted prompt).

Raj’s app **does not override** the dashboard prompt unless you paste one in Settings (or set `VITE_RAJ_USE_PROMPT_OVERRIDE=true`).

Only enable client override if you need it:

- App env: `VITE_RAJ_USE_PROMPT_OVERRIDE=true`
- ElevenLabs agent → **Security / Overrides** → allow **system prompt override**

If override is disabled but the app sends one, the session can fail to connect.

## 2. Add client tools (must match names exactly)

For each tool: **Tools → Add tool → Type: Client → Wait for response: ON** (so `read_emails` / `read_calendar` return data to the agent).

| Tool name | Description | Parameters |
|-----------|-------------|------------|
| `read_emails` | Fetch and summarize the user's Gmail inbox via Google API. Call whenever the user asks about emails, inbox, or unread mail. | `max` (number, optional), `unread` (boolean, optional) |
| `send_gmail` | Send an email via Gmail API. | `to` (string, required), `subject` (string), `body` (string) |
| `read_calendar` | List upcoming Google Calendar events. Call for schedule / meetings / what's on today or tomorrow. | `max` (number, optional) |
| `create_calendar_event` | Create a Google Calendar event. | `title`, `startTime`, `durationMinutes`, `description`, `location`, `attendeeEmail` (all optional except title + startTime) |
| `connect_google` | Run Google OAuth if Gmail/Calendar not connected. | none |
| `open_gmail` | Open the Gmail app on the phone. | none |
| `open_whatsapp` | Open WhatsApp with optional prefilled message. | `message`, `phone`, `contact` |
| `open_messages` | Open Messages/SMS with prefilled text. | `message`, `phone` |
| `compose_email` | Open mail app with draft. | `to`, `subject`, `body`, `useGmail` |
| `open_calendar` | Open Calendar app. | none |
| `open_app` | Open another app (maps, instagram, etc.). | `appName` |
| `get_weather` | Current weather for user location. | none |

**Case-sensitive:** names must match the table (e.g. `read_emails`, not `readEmails`).

After adding tools, attach them to the agent prompt (**tool_ids** / tools section in the agent editor).

## 3. System prompt (paste on ElevenLabs if not using overrides)

```
You are Raj, a Jarvis-style personal assistant on the user's iPhone.

You HAVE access to Gmail and Google Calendar through client tools after the user connects Google.
NEVER refuse email or calendar requests for privacy — call the right tool instead.

- Email / inbox / unread → read_emails
- Send mail via API → send_gmail
- Schedule / meetings → read_calendar
- Create event → create_calendar_event
- Not connected → connect_google

Use tool results as facts; do not invent messages or events.
Speak naturally and briefly.
```

## 4. LLM choice

Use a strong tool-calling model (e.g. GPT-4o / GPT-5.x class, Claude Sonnet). Weak models often skip tools and give generic refusals.

## 5. Test

1. Raj app → Settings → Google connected (green).
2. End any active voice session, start a **new** session (prompt is sent at connect).
3. Say: **“Read my recent emails”** or **“Any unread mail?”**
4. In ElevenLabs → **Conversation history**, confirm `read_emails` appears as a client tool call.

If the tool never appears, the agent dashboard is still missing the tool or prompt. If the tool runs but fails, check Google connection in Settings.

## 6. App-side behavior

- **Default:** uses your **published ElevenLabs prompt** only (no override).
- Sends `google_connected` / `google_configured` dynamic variables when supported.
- If connection fails after publishing, check **Authentication** on the agent — add `VITE_ELEVENLABS_API_KEY` in Raj Settings.

## 7. “Disconnected: This request exceeds your quota limit”

This is **ElevenLabs billing**, not a Raj bug. Your account has used its allowed voice/conversation minutes or credits.

**What to do:**

1. Log in at [elevenlabs.io](https://elevenlabs.io) → **Subscription** / **Usage**
2. See if you need to **upgrade** or wait for the **monthly reset**
3. Shorter test sessions use less quota — each voice call consumes minutes

Raj will show a clearer message after a refresh. New sessions will work again once ElevenLabs quota is available.

## 8. App won’t connect after publish

1. **Authentication** — If enabled on the agent, add ElevenLabs API key in Raj Settings.
2. **Prompt override** — Leave off unless you enabled overrides (section 1).
3. **Hard refresh** the browser (`Cmd+Shift+R`) and start a **new** voice session.
4. Read the red toast error — it usually says 401 (needs API key) or agent/token failure.
