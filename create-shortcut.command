#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR"

clear 2>/dev/null || true
echo ""

if ! "$APP_DIR/scripts/create-shortcut.sh" "$APP_DIR"; then
  echo ""
  echo "Failed to create shortcut."
  read -r -p "Press Enter to close…" _
  exit 1
fi

echo ""
read -r -p "Press Enter to close…" _
