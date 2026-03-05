# 🎨 Fluxoid

> A custom fork of Fluxer built for themers and developers.

---

## ⚡ Alpha 0.2 — Optimization Update

This update focuses on performance. The rspack dev server has been replaced with a production-built static frontend served directly by Caddy, significantly reducing CPU usage — especially when loading media-heavy channels.

### What's new in alpha-0.2
- **Production build** replaces the rspack dev server — major CPU reduction
- **Static file serving** via Caddy instead of a live dev server
- **Gzip/zstd compression** on all served assets
- **Token login** added to the login page — required since the production API uses captcha (see below)
- **Gateway and API routing** fixed to connect properly to production Fluxer

### Logging in
Because the production Fluxer API requires captcha on login, Fluxoid includes a **"Login with token"** option at the bottom of the login screen.

To get your token:
1. Log into Fluxer at [web.fluxer.app](https://web.fluxer.app) in a browser
2. Open DevTools (F12) → Console
3. Run: `localStorage.getItem('token')`
4. Copy the result and paste it into the token field in Fluxoid

### Building the frontend
The production build is not included in the repo. The `start-fluxer.sh` script will build it automatically on first launch. If you need to rebuild manually after making changes:

```bash
cd /path/to/fluxoid
devenv shell -- bash -c "cd fluxer_app && pnpm build"
```

---

## 🎨 What is Fluxoid

Fluxoid is the `refactor` branch with extra flavor. It extends the base Fluxer client with deeper customization support — most notably a **Custom JS** input field that works alongside the existing Custom CSS field, giving themers full control over the look, feel, and behavior of their client.

---

## ✨ What's Different

- **Custom JS Field** — Found at the bottom of **Settings → Look & Feel**, this new field lets you inject JavaScript directly into the client. It works in tandem with Custom CSS for a fully scriptable theming experience.
- Built on top of the `refactor` branch — so you get all the upstream improvements plus the extras.
- Production frontend served statically via Caddy — no more rspack dev server overhead.

> ⚠️ **Note:** Fluxoid is not for everyday users. If you're a themer or want to contribute feedback and suggestions, this is for you. Otherwise hold off — the next update continues focusing on optimization.

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

That's it — one click and you're in.

---

### The Manual Way — CLI

If you prefer to see what's happening under the hood:

**Terminal 1 — Start the dev environment:**
```bash
cd /path/to/fluxoid
devenv up
```

**Terminal 2 — Launch the AppImage:**
```bash
/path/to/fluxoid/fluxer_desktop/dist-electron/fluxer_desktop-0.0.0.AppImage
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

---

### Services not starting

Check the bootstrap logs:

```
~/fluxoid/dev/logs/bootstrap.log
~/fluxoid/dev/logs/bootstrap.err.log
```

---

### Individual service crashes

```
~/fluxoid/dev/logs/fluxer_app.log
~/fluxoid/dev/logs/fluxer_server.log
~/fluxoid/dev/logs/fluxer_gateway.log
```

---

### Port conflicts on startup

```bash
fuser 49427/tcp 49319/tcp 49107/tcp
```

The `start-fluxer.sh` script handles this automatically.

---

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

---

## 📝 License

This project inherits the license of the upstream Fluxer project. See [LICENSE](LICENSE) and [LICENSING.md](LICENSING.md) for details.
