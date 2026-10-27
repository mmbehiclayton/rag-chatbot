#!/bin/bash
# Builds the Docker image locally, ships it to the VPS and swaps the container.
# Runbook (first-time server setup, database move, rollback): docs/deploy-vps.md
set -e

IMAGE_NAME="elimu"
CONTAINER_NAME="elimu-app"
REMOTE_USER="root"
REMOTE_HOST="178.162.244.166"
REMOTE_APP_DIR="/root/apps/elimu"
REMOTE_MIGRATE_DIR="/root/migrate-elimu"
HOST_PORT=3001
HEALTH_URL="http://127.0.0.1:${HOST_PORT}/api/health"
HEALTH_TIMEOUT=90
ENV_FILE=".env.production"

# ── Preflight ─────────────────────────────────────────────────────────────────
# Docker Desktop's socket can accept a connection and never answer when the engine
# is down, which makes the script look frozen. Time it out and say so.
if ! timeout 15 docker version --format '{{.Server.Version}}' >/dev/null 2>&1; then
  echo "❌ The Docker daemon is not responding. Start Docker Desktop and re-run."
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ $ENV_FILE not found. See 'The environment file' in docs/deploy-vps.md."
  exit 1
fi

# docker --env-file keeps quotes as part of the value (vercel env pull writes KEY="value").
if grep -qE "^[A-Za-z0-9_]+=[\"']" "$ENV_FILE"; then
  echo "❌ $ENV_FILE has quoted values, which Docker would keep as part of the value. Remove them:"
  echo "   sed -i -E 's/^([A-Za-z0-9_]+)=\"(.*)\"\$/\\1=\\2/' $ENV_FILE"
  exit 1
fi

# NEXT_PUBLIC_* values are baked into the bundle, so they go in as build args.
env_value() {
  grep -E "^$1=" "$ENV_FILE" | tail -n 1 | cut -d= -f2- | tr -d '\r' | sed -E 's/^["\x27](.*)["\x27]$/\1/'
}
APP_URL=$(env_value NEXT_PUBLIC_APP_URL)
if [ -z "$APP_URL" ]; then
  echo "❌ NEXT_PUBLIC_APP_URL is missing from $ENV_FILE (should be https://elimu.edupro.co.ke)."
  exit 1
fi

if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  echo "⚠️  You have uncommitted changes. They WILL be in this build:"
  git status --short
  read -rp "Build anyway? [y/N] " dirty
  [[ "$dirty" =~ ^[Yy]$ ]] || exit 0
fi

# ── Version ───────────────────────────────────────────────────────────────────
latest_version=0
for v in $(docker images --format "{{.Repository}}:{{.Tag}}" | grep "^${IMAGE_NAME}:v" | sed "s/^${IMAGE_NAME}:v//"); do
  if [[ "$v" =~ ^[0-9]+$ ]] && (( v > latest_version )); then
    latest_version=$v
  fi
done
new_version=$((latest_version + 1))
echo "Previous version: v${latest_version}"
echo "New version:      v${new_version}"

# ── Build ─────────────────────────────────────────────────────────────────────
echo "Building ${IMAGE_NAME}:v${new_version} for ${APP_URL}..."
docker build \
  --build-arg NEXT_PUBLIC_APP_URL="$APP_URL" \
  --build-arg NEXT_PUBLIC_SUPPORT_EMAIL="$(env_value NEXT_PUBLIC_SUPPORT_EMAIL)" \
  --build-arg NEXT_PUBLIC_DEMO_MODE="$(env_value NEXT_PUBLIC_DEMO_MODE)" \
  -t "${IMAGE_NAME}:latest" -t "${IMAGE_NAME}:v${new_version}" .
echo "✅ Build complete: ${IMAGE_NAME}:v${new_version}"

# ── Upload ────────────────────────────────────────────────────────────────────
read -rp "Upload to VPS now? [y/N] " confirm
[[ "$confirm" =~ ^[Yy]$ ]] || exit 0

ssh "${REMOTE_USER}@${REMOTE_HOST}" "mkdir -p ${REMOTE_APP_DIR}/backups ${REMOTE_MIGRATE_DIR}/prisma && chmod 700 ${REMOTE_APP_DIR}"
scp "$ENV_FILE" "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_APP_DIR}/.env.production"
ssh "${REMOTE_USER}@${REMOTE_HOST}" "chmod 600 ${REMOTE_APP_DIR}/.env.production"
echo "✅ .env.production uploaded"

echo "📤 Streaming image to VPS..."
docker save "${IMAGE_NAME}:v${new_version}" | ssh "${REMOTE_USER}@${REMOTE_HOST}" "docker load"

# ── DB backup ─────────────────────────────────────────────────────────────────
echo "🗄️  Backing up the elimu database before deploy..."
ssh "${REMOTE_USER}@${REMOTE_HOST}" bash -s << 'DBBACKUP'
  BACKUP_DIR=/root/apps/elimu/backups
  ENV_FILE=/root/apps/elimu/.env.production
  STAMP=$(date +%Y-%m-%d_%H%M%S)
  # Read only this line: the file is unquoted for Docker, so sourcing it isn't safe.
  DATABASE_URL=$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2-)
  # The env file's 172.17.0.1 is the container's route; from the host itself Postgres
  # sees the public IP there and refuses, so use 127.0.0.1. Drop Prisma-only options
  # like ?schema=public, which pg_dump rejects.
  HOST_URL=$(printf '%s' "${DATABASE_URL%%\?*}" | sed 's#@172\.17\.0\.1:#@127.0.0.1:#')
  pg_dump "$HOST_URL" -Fc -Z 6 -f "${BACKUP_DIR}/db-${STAMP}.dump" 2>&1 \
    && echo "  ✅ DB backup saved: db-${STAMP}.dump" \
    || echo "  ⚠️  DB backup failed (continuing deploy)"
  # Keep the last 7
  ls -1t "${BACKUP_DIR}"/db-*.dump 2>/dev/null | tail -n +8 | xargs -r rm --
DBBACKUP

# ── Migrations ────────────────────────────────────────────────────────────────
echo "🔄 Running migrations..."
scp prisma/schema.prisma "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_MIGRATE_DIR}/prisma/schema.prisma"
scp -r prisma/migrations "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_MIGRATE_DIR}/prisma/"
ssh "${REMOTE_USER}@${REMOTE_HOST}" bash -s << 'MIGRATE'
  cd /root/migrate-elimu
  # Host-side, so 127.0.0.1 rather than the container's 172.17.0.1 (see the backup step).
  export DATABASE_URL=$(grep -E '^DATABASE_URL=' /root/apps/elimu/.env.production | head -1 | cut -d= -f2- | sed 's#@172\.17\.0\.1:#@127.0.0.1:#')
  export DATABASE_URL_UNPOOLED="$DATABASE_URL"
  npx prisma migrate deploy 2>&1 \
    && echo "  ✅ Migrations applied" \
    || { echo "  ❌ Migrations failed — aborting deploy (the old container is still running)"; exit 1; }
MIGRATE

# ── Deploy ────────────────────────────────────────────────────────────────────
echo "🚀 Deploying ${IMAGE_NAME}:v${new_version}..."
ssh "${REMOTE_USER}@${REMOTE_HOST}" bash -s << EOF
  set -e
  docker stop ${CONTAINER_NAME} 2>/dev/null || true
  docker rm   ${CONTAINER_NAME} 2>/dev/null || true
  docker run -d \
    --name ${CONTAINER_NAME} \
    -p 127.0.0.1:${HOST_PORT}:3000 \
    --env-file ${REMOTE_APP_DIR}/.env.production \
    --add-host=host.docker.internal:172.17.0.1 \
    --restart unless-stopped \
    --memory=1g \
    --memory-swap=1.5g \
    --cpus=1.5 \
    --log-driver=json-file \
    --log-opt max-size=50m \
    --log-opt max-file=3 \
    ${IMAGE_NAME}:v${new_version}
EOF

# ── Health check ──────────────────────────────────────────────────────────────
echo "⏳ Waiting for health check (up to ${HEALTH_TIMEOUT}s)..."
for i in $(seq 1 "${HEALTH_TIMEOUT}"); do
  result=$(ssh "${REMOTE_USER}@${REMOTE_HOST}" "curl -sf ${HEALTH_URL} 2>/dev/null || echo 'fail'")
  if echo "$result" | grep -q '"status":"ok"'; then
    echo "✅ Healthy after ${i}s — ${IMAGE_NAME}:v${new_version} is live at ${APP_URL}"

    # Keep the last 3 images on the VPS for rollback
    ssh "${REMOTE_USER}@${REMOTE_HOST}" \
      "docker images ${IMAGE_NAME} --format '{{.Tag}}' \
       | grep -E '^v[0-9]+$' | sort -t v -k2 -n \
       | head -n -3 \
       | xargs -I{} docker rmi ${IMAGE_NAME}:{} 2>/dev/null || true"
    exit 0
  fi
  sleep 1
done

echo "❌ Health check failed after ${HEALTH_TIMEOUT}s"
echo "   Logs:     ssh ${REMOTE_USER}@${REMOTE_HOST} 'docker logs ${CONTAINER_NAME} --tail 50'"
echo "   Rollback: see 'Rolling back' in docs/deploy-vps.md"
exit 1
