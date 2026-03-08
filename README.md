# 🎨 Fluxoid
> A custom fork of Fluxer built for themers and developers.

---

## 🔐 Alpha 0.4.6.5 — Security & Stability Update

This update focuses on hardening the Custom JS system and stabilizing the AppImage build.

### What's new in alpha-0.4.6.5
- **Custom JS security scanner** — all scripts are statically analysed before execution
- **Permission summary UI** — import dialog now shows what a script can do before you accept it
- **Dangerous globals shadowed** — Node.js/Electron globals are neutralised before user code runs
- **DOM mutation rate limiting** — runaway MutationObserver abuse is automatically disconnected
- **AppImage build fixed** — resolved `createRequire` duplicate declaration crash on launch
- **Start script updated** — `start-fluxer.sh` now points to the correct AppImage filename

---

## 🛡️ Custom JS Security

Fluxoid lets you run custom JavaScript inside the client. This is powerful but carries risk when sharing scripts with others. Alpha 0.4.6.5 introduces a multi-layer security system to protect you.

### How it works

When you type or import a script, Fluxoid runs a static analysis scan before anything executes. Scripts are checked against a list of hard-blocked patterns and a list of patterns that require your confirmation.

### Hard blocks — these are always rejected

| Pattern | Reason |
|---------|--------|
| `document.cookie` | Credential theft |
| `localStorage.getItem` / `sessionStorage.getItem` | Credential theft |
| `require('fs')` | Filesystem access — can delete files |
| `require('child_process')` | Shell execution — can run arbitrary commands |
| `process.env` | Environment variable theft |
| `process.exit` | Can crash the app |
| `window.require` / `global.require` | Node.js/Electron escape |
| `WebAssembly` | Crypto miner vector |
| `new Worker` / `new SharedWorker` | Background crypto miner vector |
| `navigator.sendBeacon` | Silent data exfiltration |
| `while(true)` / `for(;;)` | Infinite loop / CPU abuse |
| Heavily hex/unicode obfuscated code | Malicious code concealment |
| `eval(atob(...))` / `eval(unescape(...))` | Obfuscated code execution |

### Dangerous globals shadowed at runtime

Even if a pattern slips past static analysis, the following are set to `undefined` before your script runs, so they cannot be accessed:

`require`, `process`, `global`, `__dirname`, `__filename`, `module`, `exports`, `Buffer`

### Warnings — shown in the permission dialog

Scripts that use the following trigger a permission summary before import:

- `fetch()` — network requests
- `XMLHttpRequest` — outbound HTTP
- `eval()` / `Function()` — dynamic code execution
- `window.open()` — opens new windows
- `MutationObserver` — watches DOM changes
- `setInterval` — repeated background execution
- `AudioContext` — plays audio
- `window.Notification` — intercepts notifications

### Permission summary UI

When importing a shared script, you will see a dialog listing everything the script can do, for example:

```
This script requests the following permissions:

✓ Modify UI
✓ Play sounds
⚠ Send network requests
⚠ Watch DOM changes

Import anyway?
```

Blocked scripts show an error toast and are never imported or executed.

### DOM mutation rate limiting

`MutationObserver` callbacks are automatically disconnected if they fire more than 500 mutations per second, preventing runaway DOM manipulation.

### Script size limit

Scripts larger than 50kb are rejected outright.

### Obfuscation detection

Scripts with suspiciously long single lines (500+ chars) or an unusually high density of special characters are blocked as potentially malicious.

---

## ⚡ Alpha 0.2 — Optimization Update

This update replaced the rspack dev server with a production-built static frontend served by Caddy, significantly reducing CPU usage.

### What's new in alpha-0.2
- **Production build** replaces the rspack dev server — major CPU reduction
- **Static file serving** via Caddy instead of a live dev server
- **Gzip/zstd compression** on all served assets
- **Token login** added to the login page — required since the production API uses captcha
- **Gateway and API routing** fixed to connect properly to production Fluxer

---

## 🎨 What is Fluxoid

Fluxoid is the `refactor` branch with extra flavor. It extends the base Fluxer client with deeper customization support — most notably a **Custom JS** input field that works alongside the existing Custom CSS field, giving themers full control over the look, feel, and behavior of their client.

---

## ✨ What's Different

- **Custom JS Field** — Found at the bottom of **Settings → Look & Feel**, inject JavaScript directly into the client alongside Custom CSS.
- **Custom JS Security** — Multi-layer static analysis and runtime protection on all user scripts.
- Built on top of the `refactor` branch — upstream improvements plus the extras.
- Production frontend served statically via Caddy — no rspack dev server overhead.

> ⚠️ **Note:** Fluxoid is not for everyday users. If you're a themer or want to contribute feedback and suggestions, this is for you.

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

### The Easy Way — One-Click Launch

A `start-fluxer.sh` script is included to handle everything for you. It will:

1. Inject the correct dist path into the Caddyfile
2. Build the frontend automatically if it hasn't been built yet
3. Start the `devenv` environment and all background services
4. Wait until everything is ready
5. Launch the AppImage automatically
6. Shut down all services cleanly when you close the app

**To use it:**
```bash
bash /path/to/fluxoid/start-fluxer.sh
```

You can also create a desktop launcher (e.g. in Linux Mint via right-click → Create Launcher) pointing to:
```
bash /path/to/fluxoid/start-fluxer.sh
```

---

### The Manual Way — CLI

**Terminal 1 — Start the dev environment:**
```bash
cd /path/to/fluxoid
devenv up
```

**Terminal 2 — Launch the AppImage:**
```bash
/path/to/fluxoid/fluxer_desktop/dist-electron/Fluxer-0.0.0-linux-x86_64.AppImage
```

---

### Building the frontend manually

The production build is not included in the repo. The `start-fluxer.sh` script builds it automatically on first launch. To rebuild manually:
```bash
cd /path/to/fluxoid
devenv shell -- bash -c "cd fluxer_app && pnpm build"
```

### Building the AppImage manually

```bash
cd /path/to/fluxoid
devenv shell -- bash -c "cd fluxer_desktop && node scripts/build.mjs && pnpm exec electron-builder --linux --x64 --config electron-builder.config.cjs"
```

---

## 🔧 Troubleshooting

### App won't open / blank screen

Check that your settings file has the correct local URL:
```
~/.config/fluxer/settings.json
```
It should contain:
```json
{ "app_url": "http://localhost:48763" }
```

### Services not starting

Check the bootstrap logs:
```
~/fluxoid/dev/logs/bootstrap.log
~/fluxoid/dev/logs/bootstrap.err.log
```

### Individual service crashes
```
~/fluxoid/dev/logs/fluxer_app.log
~/fluxoid/dev/logs/fluxer_server.log
~/fluxoid/dev/logs/fluxer_gateway.log
```

### Port conflicts on startup
```bash
fuser 49427/tcp 49319/tcp 49107/tcp
```
The `start-fluxer.sh` script handles this automatically.

### devenv won't start at all
```bash
rm -f "${XDG_RUNTIME_DIR:-/tmp}/fluxer_dev_bootstrap.done"
```
Then re-run `devenv up`.

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `start-fluxer.sh` | One-click launch script |
| `dev/Caddyfile.dev` | Caddy reverse proxy config |
| `dev/logs/` | All service logs |
| `scripts/dev_bootstrap.sh` | Bootstrap script |
| `~/.config/fluxer/settings.json` | Desktop app config |
| `fluxer_app/src/lib/CustomJsSecurity.ts` | Custom JS security scanner |

---

## 📝 License

This project inherits the license of the upstream Fluxer project. See [LICENSE](LICENSE) and [LICENSING.md](LICENSING.md) for details.
