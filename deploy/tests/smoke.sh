#!/usr/bin/env bash
# Isolated CI only: real TLS proxy, PostgreSQL, Redis, encryption and restore.
# S3 transport is a local stub; no real provider/payment/email is contacted.
set -euo pipefail
cd "$(dirname "$0")/../.."
test_root=$(mktemp -d)
export API_IMAGE=online-exam-api:ci WEB_IMAGE=online-exam-web:ci
export SERVER_ENV_FILE="$test_root/server.env" TLS_DIR="$test_root/tls"
export COMPOSE_ENV_FILE="$test_root/compose.env" OPS_STATE_DIR="$test_root/state"
export POSTGRES_PASSWORD=ci-only-private-pg REDIS_PASSWORD=ci-only-private-cache
export BACKUP_S3_URI=s3://ci-backup/archive
dc() { docker compose --project-name online-exam --env-file "$COMPOSE_ENV_FILE" -f deploy/compose.production.yml "$@"; }
cleanup() { dc logs --tail 30 api web || true; dc down --volumes || true; }
trap cleanup EXIT
mkdir -p "$TLS_DIR" "$OPS_STATE_DIR" "$test_root/bin"
touch "$COMPOSE_ENV_FILE"
openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj /CN=localhost -addext subjectAltName=DNS:localhost -keyout "$TLS_DIR/privkey.pem" -out "$TLS_DIR/fullchain.pem" 2>/dev/null
chmod 644 "$TLS_DIR/privkey.pem"
python3 - <<'PY'
import os, secrets
from pathlib import Path
values = dict(NODE_ENV="production", DATABASE_URL="postgresql://examuser:ci-only-private-pg@postgres:5432/examdb",
    REDIS_URL="redis://:ci-only-private-cache@redis:6379", JWT_ACCESS_SECRET=secrets.token_hex(32),
    JWT_REFRESH_SECRET=secrets.token_hex(32), CLIENT_URL="https://exam.ci-domain.ir", SERVER_URL="https://exam.ci-domain.ir/api",
    OTP_EMAIL_FROM="ci@ci-domain.ir", ZARINPAL_SANDBOX="false", ZARINPAL_MERCHANT_ID="ci-not-a-real-merchant",
    S3_ACCESS_KEY_ID="ci-not-real", S3_SECRET_ACCESS_KEY="ci-not-real", S3_ENDPOINT="https://storage.invalid",
    METRICS_TOKEN="ci-private-metrics-token-not-real")
Path(os.environ["SERVER_ENV_FILE"]).write_text("\n".join(f"{k}={v}" for k,v in values.items()) + "\n")
PY
dc config --quiet
dc up -d --wait postgres redis redis-replica
# The replica is a read-only standby; it must actually follow the primary.
dc exec -T redis-replica sh -c 'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli info replication | grep -q "^role:slave"'
dc run --rm migrate
dc up -d --wait --wait-timeout 180 api web
curl --fail --silent --cacert "$TLS_DIR/fullchain.pem" https://localhost/api/health | grep -q '"status":"ok"'
curl --fail --silent --cacert "$TLS_DIR/fullchain.pem" https://localhost/ | grep -q '<div id="root">'
for endpoint in /metrics /api/metrics /api/metrics/ /api/METRICS; do
  test "$(curl --silent --cacert "$TLS_DIR/fullchain.pem" -o /dev/null -w '%{http_code}' "https://localhost$endpoint")" = 404
done
test "$(curl --silent --cacert "$TLS_DIR/fullchain.pem" -X POST -o /dev/null -w '%{http_code}' https://localhost/api/auth/refresh)" = 403
curl --fail --silent --cacert "$TLS_DIR/fullchain.pem" -D "$test_root/headers" -X POST -H 'Origin: https://exam.ci-domain.ir' https://localhost/api/auth/logout > /dev/null
grep -qi 'Path=/api/auth' "$test_root/headers"
grep -qi 'Strict-Transport-Security:' "$test_root/headers"
curl --fail --silent --cacert "$TLS_DIR/fullchain.pem" 'https://localhost/socket.io/?EIO=4&transport=polling' | grep -q '"sid"'
# No service except web may publish a port.
python3 - <<'PY'
import json, os, subprocess
args = ['docker','compose','--env-file',os.environ['COMPOSE_ENV_FILE'],'-f','deploy/compose.production.yml','config','--format','json']
services = json.loads(subprocess.check_output(args))['services']
assert all(not v.get('ports') for k,v in services.items() if k != 'web')
PY
age-keygen -o "$test_root/identity" 2>/dev/null
export AGE_RECIPIENT
AGE_RECIPIENT=$(age-keygen -y "$test_root/identity")
dc exec -T postgres psql -U examuser -d examdb -v ON_ERROR_STOP=1 -c "CREATE TABLE backup_probe(value text); INSERT INTO backup_probe VALUES ('restored-row');"
# Stub only the external upload transport; dump, age and restore are real.
cat > "$test_root/bin/aws" <<'PY'
#!/usr/bin/env python3
import os, shutil, sys
from pathlib import Path
assert sys.argv[1:3] == ['s3','cp']
shutil.copyfile(sys.argv[3], Path(os.environ['OPS_STATE_DIR']) / 'remote.dump.age')
PY
chmod +x "$test_root/bin/aws"
PATH="$test_root/bin:$PATH" python3 deploy/ops.py backup
test -s "$OPS_STATE_DIR/backup-success"
dc exec -T postgres createdb -U examuser restore_check
age -d -i "$test_root/identity" "$OPS_STATE_DIR/remote.dump.age" | dc exec -T postgres pg_restore --exit-on-error --no-owner --no-acl -U examuser -d restore_check
dc exec -T postgres psql -U examuser -d restore_check -tAc 'SELECT count(*) FROM "_prisma_migrations"' | grep -Eq '^[1-9][0-9]*$'
dc exec -T postgres psql -U examuser -d restore_check -tAc 'SELECT value FROM backup_probe' | grep -qx restored-row
echo 'Production proxy and encrypted backup restore smoke passed'
