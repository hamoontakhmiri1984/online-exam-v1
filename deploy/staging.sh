#!/usr/bin/env bash
set -euo pipefail
image=${1:?Pass the immutable image reference}
[[ "$image" =~ ^ghcr\.io/[a-z0-9_/-]+:[a-f0-9]{40}$ ]] || { echo 'Expected an immutable GHCR SHA tag' >&2; exit 1; }
: "${DEPLOY_ENV_FILE:=/opt/online-exam/server.env}"
[[ -f "$DEPLOY_ENV_FILE" ]] || { echo 'Missing server env file' >&2; exit 1; }
exec 9>/tmp/online-exam-staging.lock
flock -n 9 || { echo 'Another deployment is running' >&2; exit 1; }
name=online-exam-staging
backup=online-exam-staging-previous
# Infrastructure is external to this container; localhost refers to the Linux host.
docker pull "$image"
docker run --rm --network host --env-file "$DEPLOY_ENV_FILE" "$image" npx prisma migrate deploy
if docker container inspect "$backup" >/dev/null 2>&1; then docker rm -f "$backup" >/dev/null; fi
had_previous=false
if docker container inspect "$name" >/dev/null 2>&1; then
  had_previous=true
  docker stop --time 20 "$name" >/dev/null
  docker rename "$name" "$backup"
fi
rollback() {
  docker rm -f "$name" >/dev/null 2>&1 || true
  if "$had_previous"; then docker rename "$backup" "$name"; docker start "$name" >/dev/null; fi
  echo 'Deployment failed; previous application restored. Database migrations were not reversed.' >&2
}
trap rollback ERR
docker run -d --name "$name" --restart unless-stopped --network host --env-file "$DEPLOY_ENV_FILE" "$image" >/dev/null
healthy=false
for ((attempt=0; attempt<24; attempt++)); do
  health=$(docker inspect --format '{{.State.Health.Status}}' "$name")
  if [[ "$health" == healthy ]]; then healthy=true; break; fi
  if [[ "$health" == unhealthy ]]; then break; fi
  sleep 5
done
"$healthy"
trap - ERR
echo "Healthy staging deployment: $image"
