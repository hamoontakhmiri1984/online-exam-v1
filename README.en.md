# Online Exam Platform

A bilingual (Persian-first) exam-management application with a React/Vite client, Express/Prisma API, PostgreSQL, Redis, and MinIO. The `main` branch is the stable release branch; make changes on a separate branch and merge only after CI passes.

## Requirements

- Node.js 22 and npm
- Docker Engine with Docker Compose
- PostgreSQL 16, Redis 7, and MinIO (started by the local Compose file)
- `ffmpeg` / `ffprobe` for supported media processing

## Quick start (GitHub Codespaces / local)

```bash
git clone https://github.com/hamoon2002/online-exam-v1.git
cd online-exam-v1
node scripts/setup-local.cjs
npm ci
docker compose up -d postgres redis redis-replica minio minio-init
npm run dev -w server
```

In a second terminal run `npm run dev -w client`. Codespaces users can use `bash scripts/start-codespace.sh` for the backend; do not run two backend instances at the same time. The frontend proxies API requests to port 4000. Keep PostgreSQL, Redis, MinIO, and other internal service ports private.

**Spreadsheet dependency:** The pinned SheetJS Community Edition `xlsx@0.20.3` is installed with npm from the official, versioned SheetJS CDN package tarball, rather than copied from a `vendor/` folder. The public npm registry's `xlsx@0.18.5` is outdated and must not be used as an automatic replacement. `npm ci` installs the pinned lockfile and verifies its SHA-512 integrity.

## Tests and quality gates

```bash
npm run build -w client
npm run build -w server
npm test -w client
npm run lint -w client
npm run test:setup -w server
npm test -w server
npm run lint -w server
npm run format:check -w server
npm run test:e2e -w client
```

The server integration tests require a separate migrated test database and Redis; follow the test environment instructions in [the original Persian README](README.md). The CI workflow also checks Docker Compose, production TLS, access-control, dependency audit, upload behavior, and the initial frontend transfer budget.

## Exam anti-cheating and security

- The **server** controls exam start time, expiry, answer revisions, grading, and attempt completion.
- A per-exam, per-student Redis lease restricts an active attempt to **one browser-tab client identifier**. The client stores an opaque identifier in `sessionStorage` so an ordinary reload can resume. The server atomically validates it on start, autosave, finish, event submission, and active-attempt retrieval. A competing tab receives HTTP **409**.
- During an active exam, browser visibility changes and fullscreen exits are reported to the server and stored as timestamped audit events. These are indications for an instructor's review, **not proof of cheating**. Browser signals can be blocked or altered by a determined user, so a web app cannot promise foolproof detection.
- If the browser tab is irrecoverably lost, the remaining attempt may need to expire; do not clear the student tab's session storage during an active exam.
- The Redis session store intentionally **fails closed with HTTP 503** when unavailable. This indicates service unavailability, not a user authentication failure. Do not disable the security checks to suppress a 503.
- Refresh tokens use HttpOnly cookies. Deploy only behind HTTPS and keep all credentials in environment secrets, not in the Git repository.

## Redis replica

Both development and production Compose files define `redis-replica`, a password-authenticated read-only replica with its own persistent storage volume. **Redis replication is asynchronous and is not automatic failover.** The API continues to write to the `redis` primary. If the primary fails, a replica alone will not restore API access; configure Redis Sentinel or managed Redis with automatic promotion and client reconnection before claiming high availability.

Inspect replication with:

```bash
docker compose exec -T redis-replica sh -c 'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli info replication | grep -E "^role:|^master_link_status:"'
```

Expected: `role:slave` (Redis 7 naming) and `master_link_status:up`.

## Operations

- A passing `/health` probe only confirms service readiness, not the correctness of migrations or live exam flows.
- Read [the operations guide](docs/OPERATIONS.fa.md) before production deployment and backups.
- Read [security validation](docs/SECURITY-VALIDATION.fa.md) and [quality hardening](docs/QUALITY-HARDENING.fa.md) before changing authentication, CORS, or the database schema.
- Follow the Persian [Codespaces guide](docs/CODESPACE-START.fa.md) for troubleshooting.

## License and third-party code

Check the dependencies' individual licenses. The project README is operational guidance, not a license grant for all dependencies or uploaded educational content.
