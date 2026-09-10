#!/bin/bash
# Right-click this file in Finder -> Open. You do not need to type commands.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1

# Finder does not use the same PATH as Terminal. Add the usual install locations.
export PATH="/usr/local/bin:/opt/homebrew/bin:/Library/Frameworks/Python.framework/Versions/Current/bin:${HOME}/.local/bin:${PATH}"

pause() {
  echo ""
  echo "Press Return to close this window."
  read -r _
}

fail() {
  echo ""
  echo "$1"
  echo ""
  pause
  exit 1
}

PY=""
if command -v python3 >/dev/null 2>&1; then
  PY="python3"
elif command -v python >/dev/null 2>&1; then
  PY="python"
else
  fail "Python is not installed. Open https://www.python.org/downloads/ , install it (keep the defaults), then open this file again."
fi

if curl -sf --max-time 1 "http://127.0.0.1:43141/preview.html" >/dev/null 2>&1 \
  || curl -sf --max-time 1 "http://localhost:43141/preview.html" >/dev/null 2>&1; then
  fail "Port 43141 is already in use. Right-click Stop.command, then Open, then start again."
fi

echo "Leave this window open. Safari will open by itself when the calculators are ready."
echo ""

"$PY" scripts/serve-embed.py &
DEV_PID=$!

ready=0
i=0
while [ "$i" -lt 60 ]; do
  if ! kill -0 "$DEV_PID" 2>/dev/null; then
    fail "The preview stopped before it was ready. Scroll up in this window for the error."
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
  fail "The preview did not become ready in time. Keep this window open and read the lines above."
fi

echo "Ready. Opening the calculators."
echo "If the page fails, try http://localhost:43141/preview.html then http://127.0.0.1:43141/preview.html (same tools)."
open "http://localhost:43141/preview.html" 2>/dev/null || open "http://127.0.0.1:43141/preview.html"

if [ -n "${GITHUB_ACTIONS:-}" ] || [ -n "${CI:-}" ]; then
  exit 0
fi

wait "$DEV_PID"
echo "Stopped."
pause
