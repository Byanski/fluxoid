# 🎨 Fluxoid
> A custom fork of Fluxer built for themers and developers.

---

## 🎨 What is Fluxoid

Fluxoid is the `refactor` branch with extra flavor. It extends the base Fluxer client with deeper customization support — a **Custom JS** tab in Settings gives themers full control over the look, feel, sound, and behavior of their client, on top of the existing Custom CSS field.

> ⚠️ **Note:** Fluxoid is not for everyday users. If you're a themer or want to contribute feedback and suggestions, this is for you.

---

## ✨ Features

### Custom JS Tab
Found in **Settings → Look & Feel**, the Custom JS tab includes:

- **Presets** — one-click scripts for common effects (sounds, animations, etc.)
- **Sound Slots** — assign custom sounds to clicks, keypresses, DMs, notifications, boot, and join call. Each slot has its own volume slider plus a master volume control.
- **Channel Transition Animations** — Slide Left/Right/Up/Down, Checkerboard, Fade, Zoom In, or Glitch. Configure distance and duration per animation.
- **Video Background** — paste a `fluxerusercontent.com` link to an MP4, WebM, or MOV to use as an animated background. Optional audio toggle.
- **Share / Import** — export your JS setup as a base64 code to share or import on another device.
- **Security Scanner** — all scripts are scanned before execution. Dangerous patterns are blocked; suspicious ones show a permission summary before running.

### Security
All custom JS runs through a static analysis layer before execution:

- **Hard blocks** — filesystem access, shell execution, credential theft, crypto miners, infinite loops, and obfuscated code are rejected outright
- **Dangerous globals shadowed** — `require`, `process`, `global`, `__dirname`, `Buffer` etc. are set to `undefined` before user code runs
- **Permission summary** — on import, a dialog shows exactly what the script can do before you confirm
- **DOM mutation rate limiting** — MutationObserver callbacks are disconnected if they exceed 500 mutations/sec
- **50kb size limit** — oversized scripts are rejected

---

## 🔑 Logging in

Because the production Fluxer API requires captcha on login, Fluxoid includes a **"Login with token"** option at the bottom of the login screen.

To get your token:
1. Log into Fluxer at [web.fluxer.app](https://web.fluxer.app) in a browser
2. Open DevTools (F12) → Console
3. Run: `localStorage.getItem('token')`
4. Copy the result and paste it into the token field in Fluxoid

---

## 🚀 Getting Started

### Prerequisites

- **Nix** — [install guide](https://install.determinate.systems/)
```bash
  curl --proto '=https' --tlsv1.2 -sSf -L https://install.determinate.systems/nix | sh
```
- **devenv** — open a new terminal after installing Nix, then:
```bash
  nix profile install --accept-flake-config github:cachix/devenv/latest
```

Once both are installed, open a new terminal and run the start script.

### One-Click Launch
```bash
bash /path/to/fluxoid/start-fluxer.sh
```

The script will check dependencies, build the frontend on first launch, start all backend services, and launch the AppImage. When you close the app it shuts everything down cleanly.

You can also create a desktop launcher pointing to `bash /path/to/fluxoid/start-fluxer.sh`.

### Manual Launch

**Terminal 1:**
```bash
cd /path/to/fluxoid && devenv up
```

**Terminal 2:**
```bash
/path/to/fluxoid/fluxer_desktop/dist-electron/Fluxer-0.0.0-linux-x86_64.AppImage --no-sandbox
```

### Building manually

**Frontend:**
```bash
devenv shell -- bash -c "cd fluxer_app && pnpm build"
```

**AppImage:**
```bash
devenv shell -- bash -c "cd fluxer_desktop && node scripts/build.mjs && pnpm exec electron-builder --linux --x64 --config electron-builder.config.cjs"
```

---

## 🔧 Troubleshooting

### App won't open / blank screen
Check `~/.config/fluxer/settings.json` contains:
```json
{ "app_url": "http://localhost:48763" }
```

### Services not starting
Check logs in `~/fluxoid/dev/logs/` — `bootstrap.log`, `fluxer_app.log`, `fluxer_server.log`, `fluxer_gateway.log`.

### Port conflicts
```bash
fuser 49427/tcp 49319/tcp 49107/tcp
```

### devenv won't start
```bash
rm -f "${XDG_RUNTIME_DIR:-/tmp}/fluxer_dev_bootstrap.done" && devenv up
```

### Nix installed but not found
```bash
sudo systemctl restart nix-daemon
```
Then open a new terminal and try again.

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `start-fluxer.sh` | One-click launch script |
| `dev/Caddyfile.dev` | Caddy reverse proxy config |
| `dev/logs/` | All service logs |
| `fluxer_app/src/lib/CustomJsSecurity.ts` | Custom JS security scanner |
| `~/.config/fluxer/settings.json` | Desktop app config |

---

## 📝 License

This project inherits the license of the upstream Fluxer project. See [LICENSE](LICENSE) and [LICENSING.md](LICENSING.md) for details.
