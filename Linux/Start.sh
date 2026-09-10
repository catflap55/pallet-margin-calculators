#!/bin/bash
# Open the Linux folder, then run this file (Run in Terminal).
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1

fail() {
  echo ""
  echo "$1"
  if [ -z "${GITHUB_ACTIONS:-}" ] && [ -z "${CI:-}" ]; then
    echo "Press Enter to close."
    read -r _
  fi
  exit 1
}

if command -v python3 >/dev/null 2>&1; then
  PY="python3"
elif command -v python >/dev/null 2>&1; then
  PY="python"
else
  fail "Install Python 3 first (see the Linux section of README.md)."
fi

if curl -sf --max-time 1 "http://127.0.0.1:43141/preview.html" >/dev/null 2>&1 \
  || curl -sf --max-time 1 "http://localhost:43141/preview.html" >/dev/null 2>&1; then
  fail "Port 43141 is already in use. Run bash Stop.sh, then start again."
fi

"$PY" scripts/serve-embed.py &
DEV_PID=$!
echo "Leave this window open. The browser will open when the calculators are ready."

ready=0
i=0
while [ "$i" -lt 60 ]; do
  if ! kill -0 "$DEV_PID" 2>/dev/null; then
    fail "The preview stopped before it was ready. Scroll up for the error."
  fi
  if curl -sf "http://127.0.0.1:43141/preview.html" >/dev/null 2>&1; then
    ready=1
    break
  fi
  if curl -sf "http://localhost:43141/preview.html" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
  i=$((i + 1))
done

if [ "$ready" -ne 1 ] || ! kill -0 "$DEV_PID" 2>/dev/null; then
  kill "$DEV_PID" 2>/dev/null || true
  fail "The preview did not become ready. Read the lines above."
fi

echo "Ready. If the page fails, try http://localhost:43141/preview.html then http://127.0.0.1:43141/preview.html (same tools)."
xdg-open "http://localhost:43141/preview.html" >/dev/null 2>&1 || xdg-open "http://127.0.0.1:43141/preview.html" >/dev/null 2>&1 || true

if [ -n "${GITHUB_ACTIONS:-}" ] || [ -n "${CI:-}" ]; then
  exit 0
fi

wait "$DEV_PID"
echo "Press Enter to close."
read -r _
