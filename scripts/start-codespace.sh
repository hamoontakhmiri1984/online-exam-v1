#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
if ! docker info >/dev/null 2>&1; then
  echo 'Docker is not ready. Start/reopen the Codespace and retry.' >&2
  exit 1
fi
if ! docker compose -p online-exam-v1 up -d postgres redis redis-replica minio; then
  echo 'Docker startup failed. If the error was RWLayer unexpectedly nil, run:' >&2
  echo 'docker compose -p online-exam-v1 up -d --force-recreate postgres redis redis-replica minio' >&2
  exit 1
fi
ready=false
for ((i=0; i<30; i++)); do
  if docker compose -p online-exam-v1 exec -T redis sh -c 'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli ping' 2>/dev/null | grep -qx PONG &&
     docker compose -p online-exam-v1 exec -T postgres sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 1
done
if [[ "$ready" != true ]]; then
  echo 'Redis or PostgreSQL did not become ready. Inspect docker compose ps/logs.' >&2
  exit 1
fi
# A PONG inside the container is insufficient: verify the URL used by Node too.
node server/scripts/check-redis.cjs
# Ensure cookie-session Origin checks use the actual forwarded frontend URL.
# Codespaces can be renamed/recreated while server/.env still points to localhost.
# Only this local development launcher sets the override; production is unaffected.
if [[ -n "${CODESPACE_NAME:-}" ]]; then
  export CLIENT_URL="https://${CODESPACE_NAME}-5173.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
  echo "Allowed development frontend: $CLIENT_URL"
fi
# The server workspace predev hook generates Prisma and deploys pending
# migrations before the API listener starts, including when npm run dev is used directly.
exec npm run dev -w server
