#!/usr/bin/env bash
# Double-click to start Rentals Dashboard and open it in your browser.
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

if [[ ! -f .env ]]; then
  echo -e "${RED}✗${NC} .env not found. Run install.command first."
  read -r -p "Press Enter to close…" _
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo -e "${RED}✗${NC} Dependencies missing. Run install.command first."
  read -r -p "Press Enter to close…" _
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo -e "${RED}✗${NC} Node.js not found. Run install.command or: brew install node"
  read -r -p "Press Enter to close…" _
  exit 1
fi

PORT="${PORT:-3000}"
URL="http://localhost:${PORT}"

echo ""
echo -e "${GREEN}Rentals Dashboard${NC}"
echo "  Starting at ${URL}"
echo "  Press Ctrl+C in this window to stop."
echo ""

(
  sleep 2
  open "$URL" 2>/dev/null || true
) &

export PORT
npm run dev
