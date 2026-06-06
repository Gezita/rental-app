#!/usr/bin/env bash
# Double-click this file in Finder to install zigglo on macOS.
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR"

clear 2>/dev/null || true

if ! "$APP_DIR/scripts/install.sh" "$APP_DIR"; then
  echo ""
  echo "Install failed. See messages above."
  read -r -p "Press Enter to close…" _
  exit 1
fi

echo ""
read -r -p "Press Enter to close…" _
