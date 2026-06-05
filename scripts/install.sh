#!/usr/bin/env bash
# Rentals Dashboard — macOS installer
set -euo pipefail

APP_ROOT="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$APP_ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()  { echo -e "${BLUE}▸${NC} $*"; }
ok()    { echo -e "${GREEN}✓${NC} $*"; }
warn()  { echo -e "${YELLOW}!${NC} $*"; }
fail()  { echo -e "${RED}✗${NC} $*" >&2; exit 1; }

MIN_NODE_MAJOR=18

require_node() {
  if command -v node >/dev/null 2>&1; then
    local major
    major="$(node -p "process.versions.node.split('.')[0]")"
    if [[ "$major" -ge "$MIN_NODE_MAJOR" ]]; then
      ok "Node.js $(node -v)"
      return 0
    fi
    warn "Node.js $(node -v) is older than v${MIN_NODE_MAJOR}; attempting upgrade…"
  else
    warn "Node.js not found."
  fi

  if command -v brew >/dev/null 2>&1; then
    info "Installing Node.js via Homebrew (this may take a few minutes)…"
    brew install node
    ok "Node.js $(node -v) installed"
    return 0
  fi

  fail "Node.js v${MIN_NODE_MAJOR}+ is required. Install from https://nodejs.org or run: brew install node"
}

ensure_env() {
  if [[ -f .env ]]; then
    ok ".env already exists (left unchanged)"
    return 0
  fi

  if [[ ! -f .env.example ]]; then
    fail ".env.example is missing; cannot create .env"
  fi

  cp .env.example .env
  local secret
  secret="$(openssl rand -base64 32 | tr -d '\n')"
  if [[ "$(uname)" == "Darwin" ]]; then
    sed -i '' "s|SESSION_SECRET=\"change-me-to-a-long-random-string\"|SESSION_SECRET=\"${secret}\"|" .env
  else
    sed -i "s|SESSION_SECRET=\"change-me-to-a-long-random-string\"|SESSION_SECRET=\"${secret}\"|" .env
  fi
  ok "Created .env with a random SESSION_SECRET"
}

install_deps() {
  info "Installing npm dependencies…"
  if [[ -f package-lock.json ]]; then
    npm ci
  else
    npm install
  fi
  ok "Dependencies installed"
}

setup_database() {
  info "Setting up local database (SQLite) and demo data…"
  npm run db:setup
  ok "Database ready"
}

build_app() {
  info "Building production bundle (optional, for npm start)…"
  npm run build
  ok "Production build complete"
}

main() {
  echo ""
  echo "  Rentals Dashboard — macOS Install"
  echo "  =================================="
  echo "  Location: $APP_ROOT"
  echo ""

  require_node
  ensure_env
  install_deps
  setup_database
  build_app

  mkdir -p uploads

  if [[ "$(uname)" == "Darwin" ]]; then
    info "Creating Desktop shortcut…"
    "$APP_ROOT/scripts/create-shortcut.sh" "$APP_ROOT" || warn "Could not create Desktop shortcut"
  fi

  echo ""
  echo -e "${GREEN}Install complete.${NC}"
  echo ""
  echo "  Start the app:"
  echo "    • Double-click  Rentals Dashboard  on your Desktop"
  echo "    • Or double-click  start.command  in this folder"
  echo "    • Or run:        npm run dev"
  echo ""
  echo "  Then open:  http://localhost:3000"
  echo "  Demo login: demo@landlord.app / demo1234"
  echo ""
}

main "$@"
