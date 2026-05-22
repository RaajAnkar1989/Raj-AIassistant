# Chatterbox TTS (local, free)

[Raj Assistant](../) can use [Chatterbox TTS](https://github.com/resemble-ai/chatterbox) on your Mac for high-quality offline speech — no API key required.

## What was installed

- Repo clone: `tools/chatterbox/`
- Python venv: `tools/chatterbox/.venv/` (Python 3.12)
- Local server: `scripts/chatterbox_server.py` (port **8765**)

Models download automatically on first synthesis (~1GB from Hugging Face).

## Start the voice server

In a **separate terminal**:

```bash
npm run chatterbox
```

Wait until you see `Chatterbox ready`.

## Start the app

```bash
npm run dev
```

In **Settings → Voice**, choose **Chatterbox (local, free)** as the TTS engine, or leave **Auto** — in dev mode Auto prefers Chatterbox when the server is running.

## Test from the terminal

```bash
curl -s http://127.0.0.1:8765/health
curl -s -X POST http://127.0.0.1:8765/api/tts \
  -H 'Content-Type: application/json' \
  -d '{"text":"Raj online. I am ready."}' \
  --output /tmp/chatterbox-test.wav
open /tmp/chatterbox-test.wav
```

## Notes

- Uses Apple **MPS** GPU on M-series Macs when available; otherwise CPU.
- First utterance is slow while models load; later speech is faster.
- Chatterbox embeds a subtle Resemble AI watermark in generated audio (see upstream docs).
- The local server only binds to `127.0.0.1` — not exposed to the network.

## Reinstall / update

```bash
cd tools/chatterbox && git pull
source .venv/bin/activate && pip install -e .
```
