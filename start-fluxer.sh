#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$SCRIPT_DIR/fluxer_app/dist"
CADDYFILE="$SCRIPT_DIR/dev/Caddyfile.dev"

# ─── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()    { echo -e "${CYAN}[Fluxoid]${NC} $1"; }
success() { echo -e "${GREEN}[Fluxoid]${NC} $1"; }
warn()    { echo -e "${YELLOW}[Fluxoid]${NC} $1"; }
error()   { echo -e "${RED}[Fluxoid]${NC} $1"; exit 1; }

# ─── Dependency checks ────────────────────────────────────────────────────────

# 1. Nix
if ! command -v nix &>/dev/null; then
    echo ""
    echo -e "${RED}[Fluxoid] Nix is not installed or not on PATH.${NC}"
    echo ""
    echo "  Install it with:"
    echo "    curl --proto '=https' --tlsv1.2 -sSf -L https://install.determinate.systems/nix | sh"
    echo ""
    echo "  Then open a new terminal and run this script again."
    echo ""
    exit 1
fi
success "Nix found: $(nix --version)"

# 2. devenv
if ! command -v devenv &>/dev/null; then
    echo ""
    echo -e "${RED}[Fluxoid] devenv is not installed.${NC}"
    echo ""
    echo "  Install it with:"
    echo "    nix profile install --accept-flake-config github:cachix/devenv/latest"
    echo ""
    echo "  Then open a new terminal and run this script again."
    echo ""
    exit 1
fi
success "devenv found: $(devenv --version 2>/dev/null || echo 'version unknown')"

# 3. curl
if ! command -v curl &>/dev/null; then
    echo ""
    echo -e "${RED}[Fluxoid] curl is not installed.${NC}"
    echo ""
    echo "  Install it with your package manager, e.g.:"
    echo "    sudo apt-get install curl"
    echo "    sudo dnf install curl"
    echo "    sudo pacman -S curl"
    echo ""
    exit 1
fi

# 4. FUSE (required for AppImage)
if ! command -v fusermount &>/dev/null && ! command -v fusermount3 &>/dev/null; then
    warn "FUSE is not installed (required for AppImage). Attempting to install..."
    if command -v apt-get &>/dev/null; then
        sudo apt-get install -y fuse libfuse2 2>/dev/null || sudo apt-get install -y fuse3 libfuse3-dev 2>/dev/null
    elif command -v dnf &>/dev/null; then
        sudo dnf install -y fuse fuse-libs 2>/dev/null
    elif command -v pacman &>/dev/null; then
        sudo pacman -S --noconfirm fuse2 2>/dev/null || sudo pacman -S --noconfirm fuse3 2>/dev/null
    else
        warn "Could not install FUSE automatically. The AppImage may not launch. See: https://docs.appimage.org/user-guide/troubleshooting/fuse.html"
    fi
fi

# 5. AppImage exists
APPIMAGE="$SCRIPT_DIR/fluxer_desktop/dist-electron/Fluxer-0.0.0-linux-x86_64.AppImage"
if [ ! -f "$APPIMAGE" ]; then
    error "AppImage not found at $APPIMAGE. Please build it first:\n  devenv shell -- bash -c \"cd fluxer_desktop && node scripts/build.mjs && pnpm exec electron-builder --linux --x64 --config electron-builder.config.cjs\""
fi
chmod +x "$APPIMAGE"

# ─── Caddyfile setup ──────────────────────────────────────────────────────────
sed -i "s|root \* .*|root * $DIST_DIR|" "$CADDYFILE"

# ─── Build frontend if needed ─────────────────────────────────────────────────
if [ ! -d "$DIST_DIR" ]; then
    info "Frontend not built yet — building now (this may take a few minutes)..."
    cd "$SCRIPT_DIR"
    devenv shell -- bash -c "cd fluxer_app && pnpm build"
    success "Frontend built."
fi

# ─── Clear stale bootstrap flag ───────────────────────────────────────────────
rm -f "${XDG_RUNTIME_DIR:-/tmp}/fluxer_dev_bootstrap.done"

# ─── Start devenv ─────────────────────────────────────────────────────────────
info "Starting backend services..."
cd "$SCRIPT_DIR"
devenv up &
DEVENV_PID=$!

# ─── Wait for services ────────────────────────────────────────────────────────
info "Waiting for services to be ready..."
TIMEOUT=120
ELAPSED=0
until curl -sf http://localhost:48763/_caddy_health > /dev/null 2>&1; do
    sleep 1
    ELAPSED=$((ELAPSED + 1))
    if [ $ELAPSED -ge $TIMEOUT ]; then
        error "Services did not start within ${TIMEOUT}s. Check logs in $SCRIPT_DIR/dev/logs/"
    fi
done

info "Waiting for backend..."
ELAPSED=0
until curl -sf http://localhost:48763/.well-known/fluxer > /dev/null 2>&1; do
    sleep 1
    ELAPSED=$((ELAPSED + 1))
    if [ $ELAPSED -ge $TIMEOUT ]; then
        error "Backend did not become ready within ${TIMEOUT}s. Check logs in $SCRIPT_DIR/dev/logs/"
    fi
done

sleep 3
success "All services ready. Launching Fluxoid..."

# ─── Launch AppImage ──────────────────────────────────────────────────────────
"$APPIMAGE" --no-sandbox

# ─── Cleanup ──────────────────────────────────────────────────────────────────
info "Shutting down services..."
kill $DEVENV_PID 2>/dev/null || true
pkill -P $DEVENV_PID 2>/dev/null || true
fuser -k 49427/tcp 49319/tcp 49107/tcp 2>/dev/null || true
success "Done."
if ! command -v fusermount &>/dev/null && ! command -v fusermount3 &>/dev/null; then
    warn "FUSE is not installed (required for AppImage). Attempting to install..."
    if command -v apt-get &>/dev/null; then
        sudo apt-get install -y fuse libfuse2 2>/dev/null || sudo apt-get install -y fuse3 libfuse3-dev 2>/dev/null
    elif command -v dnf &>/dev/null; then
        sudo dnf install -y fuse fuse-libs 2>/dev/null
    elif command -v pacman &>/dev/null; then
        sudo pacman -S --noconfirm fuse2 2>/dev/null || sudo pacman -S --noconfirm fuse3 2>/dev/null
    else
        warn "Could not install FUSE automatically. The AppImage may not launch. See: https://docs.appimage.org/user-guide/troubleshooting/fuse.html"
    fi
fi

# 5. AppImage exists
APPIMAGE="$SCRIPT_DIR/fluxer_desktop/dist-electron/Fluxer-0.0.0-linux-x86_64.AppImage"
if [ ! -f "$APPIMAGE" ]; then
    error "AppImage not found at $APPIMAGE. Please build it first:\n  devenv shell -- bash -c \"cd fluxer_desktop && node scripts/build.mjs && pnpm exec electron-builder --linux --x64 --config electron-builder.config.cjs\""
fi
chmod +x "$APPIMAGE"

# ─── Caddyfile setup ──────────────────────────────────────────────────────────
sed -i "s|root \* .*|root * $DIST_DIR|" "$CADDYFILE"

# ─── Build frontend if needed ─────────────────────────────────────────────────
if [ ! -d "$DIST_DIR" ]; then
    info "Frontend not built yet — building now (this may take a few minutes)..."
    cd "$SCRIPT_DIR"
    devenv shell -- bash -c "cd fluxer_app && pnpm build"
    success "Frontend built."
fi

# ─── Clear stale bootstrap flag ───────────────────────────────────────────────
rm -f "${XDG_RUNTIME_DIR:-/tmp}/fluxer_dev_bootstrap.done"

# ─── Start devenv ─────────────────────────────────────────────────────────────
info "Starting backend services..."
cd "$SCRIPT_DIR"
devenv up &
DEVENV_PID=$!

# ─── Wait for services ────────────────────────────────────────────────────────
info "Waiting for services to be ready..."
TIMEOUT=120
ELAPSED=0
until curl -sf http://localhost:48763/_caddy_health > /dev/null 2>&1; do
    sleep 1
    ELAPSED=$((ELAPSED + 1))
    if [ $ELAPSED -ge $TIMEOUT ]; then
        error "Services did not start within ${TIMEOUT}s. Check logs in $SCRIPT_DIR/dev/logs/"
    fi
done

info "Waiting for backend..."
ELAPSED=0
until curl -sf http://localhost:48763/.well-known/fluxer > /dev/null 2>&1; do
    sleep 1
    ELAPSED=$((ELAPSED + 1))
    if [ $ELAPSED -ge $TIMEOUT ]; then
        error "Backend did not become ready within ${TIMEOUT}s. Check logs in $SCRIPT_DIR/dev/logs/"
    fi
done

sleep 3
success "All services ready. Launching Fluxoid..."

# ─── Launch AppImage ──────────────────────────────────────────────────────────
"$APPIMAGE" --no-sandbox

# ─── Cleanup ──────────────────────────────────────────────────────────────────
info "Shutting down services..."
kill $DEVENV_PID 2>/dev/null || true
pkill -P $DEVENV_PID 2>/dev/null || true
fuser -k 49427/tcp 49319/tcp 49107/tcp 2>/dev/null || true
success "Done."
