#!/usr/bin/env bash
# Switch local dev between PostgreSQL (Docker) and SQLite (prisma/dev.db).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MODE_FILE=".db-mode"
SCHEMA="prisma/schema.prisma"
SQLITE_PATH="prisma/dev.db"
BACKUP_DIR="prisma/backups"
POSTGRES_URL="postgresql://rental:rental@localhost:5432/rental_app"
SQLITE_URL="file:./dev.db"

is_darwin() { [[ "$(uname -s)" == "Darwin" ]]; }

sed_inplace() {
  if is_darwin; then sed -i '' "$@"; else sed -i "$@"; fi
}

ensure_env() {
  if [[ ! -f .env ]]; then
    cp .env.example .env
    echo "Created .env from .env.example"
  fi
}

set_env_var() {
  local key="$1"
  local value="$2"
  ensure_env
  if grep -q "^${key}=" .env; then
    sed_inplace "s|^${key}=.*|${key}=\"${value}\"|" .env
  else
    echo "${key}=\"${value}\"" >> .env
  fi
}

set_schema_provider() {
  local provider="$1"
  awk -v p="$provider" '
    /^datasource db/ { in_ds=1 }
    in_ds && /^  provider = / {
      sub(/provider = "[^"]+"/, "provider = \"" p "\"")
      in_ds=0
    }
    { print }
  ' "$SCHEMA" > "${SCHEMA}.tmp" && mv "${SCHEMA}.tmp" "$SCHEMA"
}

backup_sqlite() {
  if [[ -f "$SQLITE_PATH" ]]; then
    mkdir -p "$BACKUP_DIR"
    local stamp
    stamp="$(date +%Y%m%d-%H%M%S)"
    cp "$SQLITE_PATH" "${BACKUP_DIR}/dev-${stamp}.db"
    cp "$SQLITE_PATH" "${BACKUP_DIR}/dev-latest.db"
    echo "SQLite backup: ${BACKUP_DIR}/dev-${stamp}.db"
  fi
}

use_postgres() {
  backup_sqlite
  set_schema_provider "postgresql"
  set_env_var "DATABASE_URL" "$POSTGRES_URL"
  echo "postgres" > "$MODE_FILE"
  npx prisma generate
  echo ""
  echo "Switched to PostgreSQL ($POSTGRES_URL)"
  echo "Run: make db-up   (start Docker Postgres)"
  echo "Then: make dev"
  echo ""
  echo "To copy prisma/dev.db into Postgres: make db-import-sqlite ARGS=\"--replace\""
}

use_sqlite() {
  backup_sqlite
  set_schema_provider "sqlite"
  set_env_var "DATABASE_URL" "$SQLITE_URL"
  echo "sqlite" > "$MODE_FILE"
  npx prisma generate
  if [[ ! -f "$SQLITE_PATH" ]]; then
    echo "No prisma/dev.db found — creating schema…"
    npx prisma db push
    echo "Run 'npm run db:seed' if you need the demo account."
  fi
  echo ""
  echo "Switched to SQLite ($SQLITE_PATH)"
  echo "Run: make dev-sqlite   (no Docker required)"
}

show_status() {
  local mode="postgres"
  if [[ -f "$MODE_FILE" ]]; then
    mode="$(tr -d '[:space:]' < "$MODE_FILE")"
  fi
  local provider url
  provider="$(awk '/^datasource db/{f=1} f&&/^  provider =/{gsub(/^  provider = "|".*$/,""); print; exit}' "$SCHEMA")"
  if [[ -f .env ]]; then
    url="$(grep '^DATABASE_URL=' .env | sed 's/DATABASE_URL=//' | tr -d '"')"
  else
    url="(no .env)"
  fi
  echo "Active mode:  $mode"
  echo "Schema:       $provider"
  echo "DATABASE_URL: $url"
  if [[ -f "$SQLITE_PATH" ]]; then
    echo "SQLite file:  $SQLITE_PATH ($(du -h "$SQLITE_PATH" | cut -f1))"
  else
    echo "SQLite file:  (missing)"
  fi
}

case "${1:-status}" in
  postgres) use_postgres ;;
  sqlite) use_sqlite ;;
  status) show_status ;;
  *)
    echo "Usage: $0 {postgres|sqlite|status}"
    exit 1
    ;;
esac
