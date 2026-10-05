<!-- cd /workspaces/online-exam-v1

docker compose -p online-exam-v1 up -d postgres redis minio ||
docker compose -p online-exam-v1 up -d --force-recreate postgres redis minio

docker compose -p online-exam-v1 ps
docker compose -p online-exam-v1 exec redis redis-cli ping
docker compose -p online-exam-v1 exec postgres pg_isready -U examuser -d examdb -->