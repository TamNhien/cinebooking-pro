#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

APP_VERSION="${APP_VERSION:-v29-smoke}"
VCS_REF="${VCS_REF:-${GITHUB_SHA:-local}}"
HTTP_PORT="${HTTP_PORT:-18080}"
POSTGRES_PORT="${POSTGRES_PORT:-15433}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-cinebooking_v29_smoke_${GITHUB_RUN_ID:-local}}"
JWT_SECRET="${JWT_SECRET:-v29-smoke-secret-0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ}"

if [[ ! "$APP_VERSION" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "ERROR: APP_VERSION may contain only letters, digits, dot, underscore, and dash." >&2
  exit 2
fi
if [[ ! "$HTTP_PORT" =~ ^[0-9]+$ ]] || (( HTTP_PORT < 1024 || HTTP_PORT > 65535 )); then
  echo "ERROR: HTTP_PORT must be an unprivileged TCP port between 1024 and 65535." >&2
  exit 2
fi
if [[ ! "$POSTGRES_PORT" =~ ^[0-9]+$ ]] || (( POSTGRES_PORT < 1024 || POSTGRES_PORT > 65535 )); then
  echo "ERROR: POSTGRES_PORT must be an unprivileged TCP port between 1024 and 65535." >&2
  exit 2
fi

export APP_VERSION VCS_REF HTTP_PORT POSTGRES_PORT COMPOSE_PROJECT_NAME JWT_SECRET
export POSTGRES_DB="${POSTGRES_DB:-cinebooking_v29_smoke}"
export POSTGRES_USER="${POSTGRES_USER:-cinebooking}"
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-cinebooking_v29_smoke}"
export ADMIN_EMAIL="${ADMIN_EMAIL:-admin-v29@cine.local}"
export ADMIN_PASSWORD="${ADMIN_PASSWORD:-V29SmokeOnly-ChangeMe}"
export ADMIN_NAME="${ADMIN_NAME:-V29 Smoke Admin}"
export MAIL_ENABLED=false
export DEV_RESET_LINK=false
export PAYMENT_PROVIDER=mock

cleanup() {
  status=$?
  echo
  echo "=== V29 smoke cleanup ==="
  docker compose ps || true
  docker compose logs --no-color --tail=120 backend-1 backend-2 frontend nginx postgres redis || true
  # Safe because COMPOSE_PROJECT_NAME is unique to this disposable smoke stack.
  docker compose down --remove-orphans --volumes || true
  exit "$status"
}
trap cleanup EXIT

echo "=== CineBooking V29 release-candidate smoke ==="
echo "Project: $COMPOSE_PROJECT_NAME"
echo "Version: $APP_VERSION"
echo "Revision: $VCS_REF"
echo "HTTP: http://127.0.0.1:$HTTP_PORT"

echo
echo "=== Validate Compose ==="
docker compose config --quiet

echo
echo "=== Build versioned application images ==="
docker compose build backend-1 frontend

backend_image="cinebooking/backend:${APP_VERSION}"
frontend_image="cinebooking/frontend:${APP_VERSION}"

backend_version="$(docker image inspect "$backend_image" --format '{{ index .Config.Labels "org.opencontainers.image.version" }}')"
backend_revision="$(docker image inspect "$backend_image" --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}')"
frontend_version="$(docker image inspect "$frontend_image" --format '{{ index .Config.Labels "org.opencontainers.image.version" }}')"
frontend_revision="$(docker image inspect "$frontend_image" --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}')"

[[ "$backend_version" == "$APP_VERSION" ]]
[[ "$frontend_version" == "$APP_VERSION" ]]
[[ "$backend_revision" == "$VCS_REF" ]]
[[ "$frontend_revision" == "$VCS_REF" ]]
echo "PASS: OCI image version/revision labels"

echo
echo "=== Start disposable full stack ==="
docker compose up -d --no-build postgres redis backend-1 backend-2 frontend nginx

wait_http() {
  local url="$1"
  local label="$2"
  local max_attempts="${3:-60}"
  local attempt
  for ((attempt=1; attempt<=max_attempts; attempt++)); do
    if curl --silent --show-error --fail --max-time 5 "$url" >/tmp/v29-smoke-body 2>/tmp/v29-smoke-error; then
      echo "PASS: $label"
      return 0
    fi
    sleep 2
  done
  echo "ERROR: timed out waiting for $label at $url" >&2
  cat /tmp/v29-smoke-error >&2 || true
  return 1
}

wait_http "http://127.0.0.1:${HTTP_PORT}/" "frontend through nginx"
wait_http "http://127.0.0.1:${HTTP_PORT}/api/movies" "public movies API through nginx"

assert_running_services() {
  local running service
  running="$(docker compose ps --status running --services)"
  for service in postgres redis backend-1 backend-2 frontend nginx; do
    if ! printf '%s\n' "$running" | grep -Fxq "$service"; then
      echo "ERROR: expected Compose service $service to still be running" >&2
      docker compose ps >&2 || true
      return 1
    fi
  done
  echo "PASS: both backend replicas and supporting services are running"
}

assert_running_services

movies_payload="$(curl --silent --show-error --fail --max-time 5 "http://127.0.0.1:${HTTP_PORT}/api/movies")"
python3 - "$movies_payload" <<'PY'
import json, sys
payload=json.loads(sys.argv[1])
if not isinstance(payload, list):
    raise SystemExit("/api/movies did not return a JSON array")
print(f"PASS: /api/movies returned JSON array ({len(payload)} item(s))")
PY

headers="$(curl --silent --show-error --fail --head --max-time 5 "http://127.0.0.1:${HTTP_PORT}/")"
printf '%s\n' "$headers" | tr -d '\r' | grep -qi '^X-Content-Type-Options: nosniff$'
echo "PASS: nginx security header X-Content-Type-Options=nosniff"

echo
echo "=== Running services ==="
docker compose ps

echo
echo "V29 RELEASE-CANDIDATE SMOKE PASSED"
