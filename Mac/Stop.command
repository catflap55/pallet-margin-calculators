#!/bin/bash
# Right-click this file in Finder -> Open to stop the local preview.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1

echo "Stopping the local calculators preview..."
pids=$(lsof -ti tcp:43141 2>/dev/null || true)
if [ -n "$pids" ]; then
  # shellcheck disable=SC2086
  kill $pids 2>/dev/null || true
  echo "Stopped what was using port 43141."
else
  echo "Nothing was using port 43141."
fi
echo ""
echo "Done. You can close this window."
if [ -z "${GITHUB_ACTIONS:-}" ] && [ -z "${CI:-}" ]; then
  echo "Press Return to close."
  read -r _
fi
