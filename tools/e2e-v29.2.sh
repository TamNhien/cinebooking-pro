#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

APP_VERSION="${APP_VERSION:-v29.2-e2e}"
VCS_REF="${VCS_REF:-${GITHUB_SHA:-local}}"
HTTP_PORT="${HTTP_PORT:-18080}"
POSTGRES_PORT="${POSTGRES_PORT:-15433}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-cinebooking_v292_e2e_${GITHUB_RUN_ID:-local}}"
JWT_SECRET="${JWT_SECRET:-v29.2-e2e-secret-0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ}"
E2E_SKIP_BUILD="${E2E_SKIP_BUILD:-false}"

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
if [[ "$E2E_SKIP_BUILD" != "true" && "$E2E_SKIP_BUILD" != "false" ]]; then
  echo "ERROR: E2E_SKIP_BUILD must be true or false." >&2
  exit 2
fi

export APP_VERSION VCS_REF HTTP_PORT POSTGRES_PORT COMPOSE_PROJECT_NAME JWT_SECRET
export POSTGRES_DB="${POSTGRES_DB:-cinebooking_v292_e2e}"
export POSTGRES_USER="${POSTGRES_USER:-cinebooking}"
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-cinebooking_v292_e2e}"
export ADMIN_EMAIL="${ADMIN_EMAIL:-admin-v29@cine.local}"
export ADMIN_PASSWORD="${ADMIN_PASSWORD:-V29SmokeOnly-ChangeMe}"
export ADMIN_NAME="${ADMIN_NAME:-V29 E2E Admin}"
export E2E_ADMIN_EMAIL="$ADMIN_EMAIL"
export E2E_ADMIN_PASSWORD="$ADMIN_PASSWORD"
export PLAYWRIGHT_BASE_URL="http://127.0.0.1:${HTTP_PORT}"
export MAIL_ENABLED=false
export DEV_RESET_LINK=false
export PAYMENT_PROVIDER=mock
export CHECKIN_EARLY_MINUTES="${CHECKIN_EARLY_MINUTES:-2880}"
export CHECKIN_LATE_MINUTES="${CHECKIN_LATE_MINUTES:-240}"

cleanup() {
  status=$?
  echo
  echo "=== V29.2 E2E cleanup ==="
  docker compose ps || true
  if [[ $status -ne 0 ]]; then
    docker compose logs --no-color --tail=160 backend-1 backend-2 frontend nginx postgres redis || true
  fi
  docker compose down --remove-orphans --volumes || true
  exit "$status"
}
trap cleanup EXIT

wait_http() {
  local url="$1"
  local label="$2"
  local max_attempts="${3:-75}"
  local attempt
  for ((attempt=1; attempt<=max_attempts; attempt++)); do
    if curl --silent --show-error --fail --max-time 5 "$url" >/tmp/v292-e2e-body 2>/tmp/v292-e2e-error; then
      echo "PASS: $label"
      return 0
    fi
    sleep 2
  done
  echo "ERROR: timed out waiting for $label at $url" >&2
  cat /tmp/v292-e2e-error >&2 || true
  return 1
}

echo "=== CineBooking V29.2 Playwright E2E ==="
echo "Project: $COMPOSE_PROJECT_NAME"
echo "Version: $APP_VERSION"
echo "Revision: $VCS_REF"
echo "Base URL: $PLAYWRIGHT_BASE_URL"

echo
echo "=== Validate Compose ==="
docker compose config --quiet

if [[ "$E2E_SKIP_BUILD" != "true" ]]; then
  echo
  echo "=== Build versioned application images ==="
  docker compose build backend-1 frontend
fi

echo
echo "=== Start disposable E2E stack ==="
docker compose up -d --no-build postgres redis backend-1 backend-2 frontend nginx
wait_http "${PLAYWRIGHT_BASE_URL}/" "frontend through nginx"
wait_http "${PLAYWRIGHT_BASE_URL}/api/movies" "movies API through nginx"

echo
echo "=== Run Playwright Chromium journey ==="
(
  cd frontend
  npm run e2e
)

echo
echo "V29.2 PLAYWRIGHT E2E PASSED"
