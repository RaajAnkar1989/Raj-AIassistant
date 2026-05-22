#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/tools/freellmapi"

node "$ROOT/scripts/ensure-local-services.mjs"

cd "$DIR"
echo "FreeLLMAPI API:   http://127.0.0.1:3011/v1"
echo "FreeLLMAPI admin: http://127.0.0.1:3011"
exec npm run dev -w server
