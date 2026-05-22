#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENV="$ROOT/tools/chatterbox/.venv"
SERVER="$ROOT/scripts/chatterbox_server.py"

if [[ ! -x "$VENV/bin/python" ]]; then
  echo "Chatterbox venv missing. Run setup first:"
  echo "  git clone https://github.com/resemble-ai/chatterbox.git tools/chatterbox"
  echo "  python3.12 -m venv tools/chatterbox/.venv"
  echo "  source tools/chatterbox/.venv/bin/activate && pip install -e tools/chatterbox"
  exit 1
fi

exec "$VENV/bin/python" "$SERVER"
