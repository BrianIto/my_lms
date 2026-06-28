#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend-go"
AUTH_DIR="$ROOT_DIR/auth_service"
FRONTEND_DIR="$ROOT_DIR/frontend-react"

RUN_INSTALL=1
RUN_MIGRATIONS=1

for arg in "$@"; do
  case "$arg" in
    --no-install) RUN_INSTALL=0 ;;
    --no-migrate) RUN_MIGRATIONS=0 ;;
    -h|--help)
      cat <<'USAGE'
Usage: ./dev.sh [--no-install] [--no-migrate]

Starts the local development stack with hot reload where supported:
  - Docker infra: Postgres, Redis, OpenTelemetry collector
  - Go backend: go run ./cmd/server (restart script to pick up Go changes)
  - Auth service: tsx watch hot reload
  - Frontend: Vite/TanStack hot reload

URLs:
  Frontend  http://localhost:5173
  Auth      http://localhost:3000/api/auth/ok
  Backend   http://localhost:8080/health
USAGE
      exit 0
      ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

log() { printf '\033[1;34m[dev]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[dev]\033[0m %s\n' "$*" >&2; }
fail() { printf '\033[1;31m[dev]\033[0m %s\n' "$*" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"; }

make_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 32
  else
    python3 - <<'PY'
import secrets
print(secrets.token_urlsafe(48))
PY
  fi
}

write_if_missing() {
  local path="$1"
  local content="$2"
  if [ ! -f "$path" ]; then
    log "Creating ${path#$ROOT_DIR/}"
    printf '%s\n' "$content" > "$path"
  fi
}

upsert_env() {
  local path="$1"
  local key="$2"
  local value="$3"
  if grep -qE "^${key}=" "$path" 2>/dev/null; then
    python3 - "$path" "$key" "$value" <<'PY'
from pathlib import Path
import sys
path = Path(sys.argv[1])
key = sys.argv[2]
value = sys.argv[3]
lines = path.read_text().splitlines()
for i, line in enumerate(lines):
    if line.startswith(f"{key}="):
        lines[i] = f"{key}={value}"
        break
path.write_text("\n".join(lines) + "\n")
PY
  else
    printf '%s=%s\n' "$key" "$value" >> "$path"
  fi
}

get_env_value() {
  local path="$1"
  local key="$2"
  grep -E "^${key}=" "$path" 2>/dev/null | tail -n 1 | cut -d= -f2- || true
}

port_available() {
  local port="$1"
  python3 - "$port" <<'PY'
import socket
import sys
port = int(sys.argv[1])
with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        sock.bind(("127.0.0.1", port))
    except OSError:
        sys.exit(1)
PY
}

find_available_port() {
  local port="$1"
  while ! port_available "$port"; do
    port=$((port + 1))
  done
  printf '%s\n' "$port"
}

ensure_local_port() {
  local env_file="$1"
  local key="$2"
  local preferred="$3"
  local fallback="$4"
  local current
  current="$(get_env_value "$env_file" "$key")"
  current="${current:-$preferred}"

  if port_available "$current"; then
    upsert_env "$env_file" "$key" "$current"
    printf '%s\n' "$current"
    return
  fi

  local next
  next="$(find_available_port "$fallback")"
  warn "localhost:$current is already in use; using localhost:$next for $key"
  upsert_env "$env_file" "$key" "$next"
  printf '%s\n' "$next"
}

need docker
need npm
need bun
need go

write_if_missing "$BACKEND_DIR/.env" "HTTP_ADDR=:8080
SHUTDOWN_TIMEOUT=10s
ENV=development
DATABASE_URL=postgres://app:app@localhost:5432/app?sslmode=disable
REDIS_ADDR=localhost:6380
REDIS_PASSWORD=
OTEL_EXPORTER_OTLP_ENDPOINT=localhost:4319
OTEL_SERVICE_NAME=go-server
WS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
POSTGRES_DB=app
POSTGRES_USER=app
POSTGRES_PASSWORD=app
POSTGRES_HOST_PORT=5432
REDIS_HOST_PORT=6380
OTEL_GRPC_HOST_PORT=4319"

write_if_missing "$AUTH_DIR/.env" "DATABASE_URL=postgresql://app:app@localhost:5432/app?sslmode=disable
BETTER_AUTH_SECRET=$(make_secret)
BETTER_AUTH_URL=http://localhost:3000
PORT=3000
NODE_ENV=development
TRUSTED_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:8080
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
RESEND_API_KEY=
BETA_REQUEST_FROM=Agentic Engineering <onboarding@resend.dev>
BETA_REQUEST_ADMIN_EMAIL=brian.oliveira100@gmail.com
BETA_REQUEST_APPROVAL_BASE_URL=http://localhost:3000"

write_if_missing "$FRONTEND_DIR/.env" "VITE_AUTH_URL=http://localhost:3000
VITE_API_URL=http://localhost:8080"

POSTGRES_HOST_PORT="$(ensure_local_port "$BACKEND_DIR/.env" POSTGRES_HOST_PORT 5432 55432)"
REDIS_HOST_PORT="$(ensure_local_port "$BACKEND_DIR/.env" REDIS_HOST_PORT 6380 6380)"
OTEL_GRPC_HOST_PORT="$(ensure_local_port "$BACKEND_DIR/.env" OTEL_GRPC_HOST_PORT 4319 4319)"

upsert_env "$BACKEND_DIR/.env" DATABASE_URL "postgres://app:app@localhost:${POSTGRES_HOST_PORT}/app?sslmode=disable"
upsert_env "$BACKEND_DIR/.env" REDIS_ADDR "localhost:${REDIS_HOST_PORT}"
upsert_env "$BACKEND_DIR/.env" OTEL_EXPORTER_OTLP_ENDPOINT "localhost:${OTEL_GRPC_HOST_PORT}"
upsert_env "$AUTH_DIR/.env" DATABASE_URL "postgresql://app:app@localhost:${POSTGRES_HOST_PORT}/app?sslmode=disable"

if [ "$RUN_INSTALL" -eq 1 ]; then
  [ -d "$AUTH_DIR/node_modules" ] || (log "Installing auth_service dependencies" && cd "$AUTH_DIR" && npm install)
  [ -d "$FRONTEND_DIR/node_modules" ] || (log "Installing frontend-react dependencies" && cd "$FRONTEND_DIR" && bun install)
fi

log "Starting Docker infra (Postgres, Redis, OpenTelemetry)"
(cd "$BACKEND_DIR" && docker compose up -d postgres redis otel-collector)

# If the Postgres container was created before the compose file exposed 5432,
# docker compose up will keep the old container and localhost connections from
# auth_service/backend will fail with ECONNREFUSED. Recreate only the container,
# preserving the named data volume.
if ! (cd "$BACKEND_DIR" && docker compose port postgres 5432 >/dev/null 2>&1); then
  warn "Postgres is not publishing its configured host port; recreating container without removing data"
  (cd "$BACKEND_DIR" && docker compose up -d --force-recreate postgres)
fi

log "Waiting for Postgres"
for _ in $(seq 1 60); do
  if (cd "$BACKEND_DIR" && docker compose exec -T postgres pg_isready -U app -d app >/dev/null 2>&1); then
    break
  fi
  sleep 1
done
(cd "$BACKEND_DIR" && docker compose exec -T postgres pg_isready -U app -d app >/dev/null 2>&1) || fail "Postgres did not become ready"

log "Auth service uses the same app database/public schema as the Go backend"

if [ "$RUN_MIGRATIONS" -eq 1 ]; then
  log "Applying backend migrations"
  (cd "$BACKEND_DIR" && docker compose exec -T postgres psql -U app -d app -v ON_ERROR_STOP=1) <<'SQL' >/dev/null
CREATE TABLE IF NOT EXISTS backend_schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
SQL

  for migration in "$BACKEND_DIR"/internal/db/migrations/*.up.sql; do
    [ -e "$migration" ] || continue
    version="$(basename "$migration")"
    if (cd "$BACKEND_DIR" && docker compose exec -T postgres psql -U app -d app -tAc "SELECT 1 FROM backend_schema_migrations WHERE version = '$version'" | grep -q 1); then
      log "Skipping backend migration $version"
      continue
    fi

    log "Running backend migration $version"
    {
      printf 'BEGIN;\n'
      cat "$migration"
      printf '\nINSERT INTO backend_schema_migrations (version) VALUES (:'"'migration_version'"');\nCOMMIT;\n'
    } | (cd "$BACKEND_DIR" && docker compose exec -T postgres psql -U app -d app -v ON_ERROR_STOP=1 -v migration_version="$version") >/dev/null
  done

  if [ -d "$AUTH_DIR/node_modules" ]; then
    log "Applying Better Auth migrations"
    (cd "$AUTH_DIR" && npm run auth:migrate) || fail "Better Auth migration failed. Re-run: cd auth_service && npm run auth:migrate"
  else
    fail "auth_service dependencies are missing; cannot run Better Auth migrations. Re-run without --no-install."
  fi
fi

PIDS=()
terminate_tree() {
  local pid="$1"
  local child
  for child in $(pgrep -P "$pid" 2>/dev/null || true); do
    terminate_tree "$child"
  done
  kill "$pid" >/dev/null 2>&1 || true
}

cleanup() {
  local exit_code=$?
  trap - EXIT INT TERM
  if [ "${#PIDS[@]}" -gt 0 ]; then
    warn "Stopping dev services"
    for pid in "${PIDS[@]}"; do
      terminate_tree "$pid"
    done
    wait "${PIDS[@]}" >/dev/null 2>&1 || true
  fi
  exit "$exit_code"
}
trap cleanup EXIT INT TERM

start() {
  local name="$1"
  local dir="$2"
  shift 2
  log "Starting $name"
  (
    cd "$dir"
    exec "$@"
  ) > >(sed -u "s/^/[$name] /") 2>&1 &
  PIDS+=("$!")
}

start backend "$BACKEND_DIR" bash -lc 'set -a; source .env; set +a; make run'
start auth "$AUTH_DIR" npm run dev
start frontend "$FRONTEND_DIR" bun --bun run dev

log "Development stack is up. Press Ctrl+C to stop app processes. Docker infra remains running."
log "Frontend: http://localhost:5173 | Auth: http://localhost:3000/api/auth/ok | Backend: http://localhost:8080/health"

wait "${PIDS[@]}"
