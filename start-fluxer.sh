#!/usr/bin/env bash

# Resolve the repo root relative to this script's location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Start devenv in background
cd "$SCRIPT_DIR"
devenv up &
DEVENV_PID=$!

# Wait for services to be ready
echo "Waiting for services..."
until curl -sf http://localhost:48763/_caddy_health > /dev/null 2>&1; do
    sleep 1
done

# Launch AppImage and wait for it to close
"$SCRIPT_DIR/fluxer_desktop/dist-electron/fluxer_desktop-0.0.0.AppImage"

# When AppImage closes, kill devenv and all its children
kill $DEVENV_PID
pkill -P $DEVENV_PID
fuser -k 49427/tcp 49319/tcp 49107/tcp 2>/dev/null || true

