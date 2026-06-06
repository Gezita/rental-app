#!/usr/bin/env bash
# Create a macOS Desktop shortcut (zigglo.app) that launches the dev server.
set -euo pipefail

APP_ROOT="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
APP_NAME="zigglo"
BUNDLE_ID="com.gezita.zigglo"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

info() { echo -e "${BLUE}▸${NC} $*"; }
ok()   { echo -e "${GREEN}✓${NC} $*"; }

if [[ "$(uname)" != "Darwin" ]]; then
  echo "Shortcuts are only supported on macOS."
  exit 1
fi

DESKTOP="${HOME}/Desktop"
SHORTCUT="${DESKTOP}/${APP_NAME}.app"

info "Creating shortcut at ${SHORTCUT}"

rm -rf "$SHORTCUT"
mkdir -p "${SHORTCUT}/Contents/MacOS"
mkdir -p "${SHORTCUT}/Contents/Resources"

cat > "${SHORTCUT}/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>en</string>
  <key>CFBundleExecutable</key>
  <string>launcher</string>
  <key>CFBundleIdentifier</key>
  <string>com.gezita.zigglo</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>zigglo</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>0.1.0</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>LSMinimumSystemVersion</key>
  <string>11.0</string>
</dict>
</plist>
PLIST

# Embed project path so the shortcut works after you move the .app on Desktop.
cat > "${SHORTCUT}/Contents/MacOS/launcher" <<LAUNCHER
#!/usr/bin/env bash
APP_ROOT='${APP_ROOT}'

if [[ ! -f "\${APP_ROOT}/.env" ]]; then
  osascript -e 'display alert "zigglo" message "Run install.command in the project folder first." as warning' 2>/dev/null || true
  exit 1
fi

if [[ ! -d "\${APP_ROOT}/node_modules" ]]; then
  osascript -e 'display alert "zigglo" message "Dependencies missing. Run install.command first." as warning' 2>/dev/null || true
  exit 1
fi

open -a Terminal "\${APP_ROOT}/start.command"
LAUNCHER

chmod +x "${SHORTCUT}/Contents/MacOS/launcher"

# Optional: copy SVG as a document icon hint (Finder may still show generic app icon).
if [[ -f "${APP_ROOT}/public/icons/icon.svg" ]]; then
  cp "${APP_ROOT}/public/icons/icon.svg" "${SHORTCUT}/Contents/Resources/icon.svg"
fi

xattr -cr "$SHORTCUT" 2>/dev/null || true

ok "Shortcut created: ${SHORTCUT}"
echo "  Double-click it on your Desktop to start the app."
