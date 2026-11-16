#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

backend_pid=""
cleanup() {
  if [[ -n "$backend_pid" ]]; then
    kill "$backend_pid" 2>/dev/null || true
    wait "$backend_pid" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

# A Vite page can render even when the API on port 4000 is not running.
# Start the backend and its dependencies unless the health endpoint is ready.
if ! curl --fail --silent --max-time 2 http://127.0.0.1:4000/health >/dev/null; then
  bash scripts/start-codespace.sh &
  backend_pid=$!
  ready=false
  for ((i=0; i<90; i++)); do
    if curl --fail --silent --max-time 2 http://127.0.0.1:4000/health >/dev/null; then
      ready=true
      break
    fi
    if ! kill -0 "$backend_pid" 2>/dev/null; then break; fi
    sleep 2
  done
  if [[ "$ready" != true ]]; then
    echo "Backend is not ready on port 4000; login cannot work. Check server startup logs above." >&2
    exit 1
  fi
fi

if [[ -n "${CODESPACE_NAME:-}" ]]; then
  frontend_origin="https://${CODESPACE_NAME}-5173.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
  # An anonymous refresh should reach session validation and return 401.
  # A healthy API can still be an older process rejecting the forwarded origin.
  status="$(curl --silent --max-time 5 --output /dev/null --write-out '%{http_code}' \
    --request POST --header "Origin: $frontend_origin" http://127.0.0.1:4000/auth/refresh)" || status=000
  if [[ "$status" != 401 ]]; then
    echo "Session refresh check failed for $frontend_origin (HTTP $status)." >&2
    echo "Stop the API currently running on port 4000, then run npm run dev:codespace again." >&2
    exit 1
  fi
fi

echo "API is ready on port 4000. Starting the frontend on port 5173."
# Fail explicitly if another Vite instance is already using 5173.
npm run dev -w client -- --host 0.0.0.0 --port 5173 --strictPort
