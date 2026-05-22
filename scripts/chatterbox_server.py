#!/usr/bin/env python3
"""Local Chatterbox TTS HTTP server for Raj Assistant."""

from __future__ import annotations

import io
import os
from contextlib import asynccontextmanager

import torch
import torchaudio as ta
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field

MODEL = None
DEVICE: str | None = None
PORT = int(os.environ.get("CHATTERBOX_PORT", "8765"))


def resolve_device() -> str:
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def load_model():
    global MODEL, DEVICE
    if MODEL is not None:
        return MODEL

    from chatterbox.tts import ChatterboxTTS

    DEVICE = resolve_device()
    print(f"Loading Chatterbox TTS on {DEVICE} (first run downloads ~1GB of models)...")
    MODEL = ChatterboxTTS.from_pretrained(device=DEVICE)
    print(f"Chatterbox ready (sample rate {MODEL.sr}).")
    return MODEL


@asynccontextmanager
async def lifespan(_app: FastAPI):
    load_model()
    yield


app = FastAPI(title="Chatterbox TTS Local", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class TtsRequest(BaseModel):
    text: str
    exaggeration: float = Field(default=0.45, ge=0.0, le=2.0)
    cfg_weight: float = Field(default=0.0, ge=0.0, le=1.0)


@app.get("/health")
def health():
    return {
        "ok": True,
        "device": DEVICE or resolve_device(),
        "loaded": MODEL is not None,
        "sampleRate": MODEL.sr if MODEL else None,
    }


@app.post("/api/tts")
def synthesize(body: TtsRequest):
    text = (body.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="text required")
    if len(text) > 220:
        text = text[:220].rsplit(" ", 1)[0].strip() or text[:220].strip()

    model = load_model()
    wav = model.generate(
        text,
        exaggeration=body.exaggeration,
        cfg_weight=body.cfg_weight,
    )

    buf = io.BytesIO()
    ta.save(buf, wav, model.sr, format="wav")
    return Response(content=buf.getvalue(), media_type="audio/wav")


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=PORT, log_level="info")
