#!/usr/bin/env bash
# =============================================================================
# build-dist.sh
# Full production build pipeline for Fluxer Desktop
#
# Usage:
#   ./build-dist.sh            # builds for current OS
#   ./build-dist.sh --all      # cross-compile all three platforms (needs wine
#                               # on Linux for Windows, and a Mac for macOS)
#   SKIP_FRONTEND=1 ./build-dist.sh   # skip frontend rebuild (dev iteration)
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESKTOP_DIR="$REPO_ROOT/fluxer_desktop"
APP_DIR="$REPO_ROOT/fluxer_app"

# ---------------------------------------------------------------------------
# 1. Build the frontend with the production URL baked in
# ---------------------------------------------------------------------------
if [[ "${SKIP_FRONTEND:-0}" != "1" ]]; then
  echo ">>> Building fluxer_app (production)..."
  cd "$APP_DIR"

  # Point the app at the production API.
  # Adjust env var names to whatever rspack / webpack / vite reads in fluxer_app.
  VITE_API_URL="https://web.fluxer.app" \
  VITE_GATEWAY_URL="wss://gateway.fluxer.app" \
  VITE_MEDIA_URL="https://fluxerusercontent.com" \
  NODE_ENV=production \
    npm run build   # produces fluxer_app/dist/

  echo ">>> Frontend build complete."
fi

# ---------------------------------------------------------------------------
# 2. Build the Electron main process
# ---------------------------------------------------------------------------
echo ">>> Building Electron main process..."
cd "$DESKTOP_DIR"

# Compile TypeScript (or rspack) targeting electron-main.
# Adjust to match your package.json scripts.
NODE_ENV=production npm run build:main   # should output to dist/electron/

echo ">>> Electron main process build complete."

# ---------------------------------------------------------------------------
# 3. (Optional) Copy frontend static build into the Electron output directory
#    Only needed if you prefer bundling the frontend inside the asar instead of
#    always loading https://web.fluxer.app remotely.
#    If loading the live URL, skip this section.
# ---------------------------------------------------------------------------
# FRONTEND_OUT="$APP_DIR/dist"
# ELECTRON_FRONTEND="$DESKTOP_DIR/dist/electron/frontend"
# echo ">>> Copying frontend build into Electron output..."
# rm -rf "$ELECTRON_FRONTEND"
# cp -r "$FRONTEND_OUT" "$ELECTRON_FRONTEND"
#
# Then in Window.tsx load it via:
#   win.loadFile(path.join(app.getAppPath(), "frontend", "index.html"));
# instead of win.loadURL("https://web.fluxer.app").

# ---------------------------------------------------------------------------
# 4. Package with electron-builder
# ---------------------------------------------------------------------------
echo ">>> Packaging with electron-builder..."
cd "$DESKTOP_DIR"

if [[ "${1:-}" == "--all" ]]; then
  # Cross-platform — needs wine (Windows) and a real Mac (macOS)
  npx electron-builder \
    --config electron-builder.config.js \
    --linux --win --mac \
    --publish never
else
  # Current OS only (fastest, recommended for CI)
  npx electron-builder \
    --config electron-builder.config.js \
    --publish never
fi

echo ""
echo ">>> Build artifacts written to $DESKTOP_DIR/release/"
ls -lh "$DESKTOP_DIR/release/"
