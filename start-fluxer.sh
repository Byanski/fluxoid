#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$SCRIPT_DIR/fluxer_app/dist"
CADDYFILE="$SCRIPT_DIR/dev/Caddyfile.dev"

# Inject correct dist path into Caddyfile
sed -i "s|root \* .*|root * $DIST_DIR|" "$CADDYFILE"

# Build frontend if dist doesnt exist
if [ ! -d "$DIST_DIR" ]; then
    echo "Building frontend..."
    cd "$SCRIPT_DIR"
    devenv shell -- bash -c "cd fluxer_app && pnpm build"
fi

# Start devenv in background
cd "$SCRIPT_DIR"
devenv up &
DEVENV_PID=$!

# Wait for services to be ready
echo "Waiting for services..."
until curl -sf http://localhost:48763/_caddy_health > /dev/null 2>&1; do
    sleep 1
done

# Wait for fluxer_server to be ready
echo "Waiting for backend..."
until curl -sf http://localhost:48763/.well-known/fluxer > /dev/null 2>&1; do
    sleep 1
done

# Extra settle time
sleep 3

# Launch AppImage and wait for it to close
"$SCRIPT_DIR/fluxer_desktop/dist-electron/Fluxer-0.0.0-linux-x86_64.AppImage"

# When AppImage closes, kill devenv and all its children
kill $DEVENV_PID
pkill -P $DEVENV_PID
fuser -k 49427/tcp 49319/tcp 49107/tcp 2>/dev/null || true
