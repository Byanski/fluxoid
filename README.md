# 🎨 Fluxoid

> A custom fork of Fluxer built for themers and developers.

Fluxoid is the `refactor` branch with extra flavor. It extends the base Fluxer client with deeper customization support — most notably a **Custom JS** input field that works alongside the existing Custom CSS field, giving themers full control over the look, feel, and behavior of their client.

---

## ✨ What's Different

- **Custom JS Field** — Found at the bottom of **Settings → Look & Feel**, this new field lets you inject JavaScript directly into the client. It works in tandem with Custom CSS for a fully scriptable theming experience.
- Built on top of the `refactor` branch — so you get all the upstream improvements plus the extras.
- Headless dev server + backend run in the background automatically via the included launch script.

> ⚠️ **Note:** Running Fluxoid does add overhead compared to the standard client. You're running a dev build of the frontend (rspack dev server), a local backend (fluxer_server), and all supporting services (NATS, Valkey, Caddy, etc.) in the background.

---

## 🚀 Getting Started

### The Easy Way — One-Click Launch

A `start-fluxer.sh` script is included to handle everything for you. It will:

1. Start the `devenv` environment and all background services
2. Wait until everything is ready
3. Launch the AppImage automatically
4. Shut down all services cleanly when you close the app

**To use it:**

```bash
bash /home/youruser/fluxer/start-fluxer.sh
```

You can also create a desktop launcher (e.g. in Linux Mint via right-click → Create Launcher) pointing to:

```
bash /home/youruser/fluxer/start-fluxer.sh
```

That's it — one click and you're in.

---

### The Manual Way — CLI

If you prefer to see what's happening under the hood or want more control:

**Terminal 1 — Start the dev environment:**
```bash
cd /home/youruser/fluxer
devenv up
```

This starts all background services: NATS, Valkey, Caddy, Meilisearch, LiveKit, fluxer_server, fluxer_gateway, and fluxer_app (rspack dev server).

**Terminal 2 — Launch the AppImage:**
```bash
/home/youruser/fluxer/fluxer_desktop/dist-electron/fluxer_desktop-0.0.0.AppImage
```

Running manually lets you watch all service logs in real time in Terminal 1, which is useful for debugging.

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
~/fluxer/dev/logs/bootstrap.log
~/fluxer/dev/logs/bootstrap.err.log
```

---

### Individual service crashes

Each service has its own log:

```
~/fluxer/dev/logs/fluxer_app.log
~/fluxer/dev/logs/fluxer_server.log
~/fluxer/dev/logs/fluxer_gateway.log
```

---

### Port conflicts on startup

If a previous session didn't shut down cleanly, old processes may still be holding ports. Check with:

```bash
fuser 49427/tcp 49319/tcp 49107/tcp
```

The `start-fluxer.sh` script handles this automatically on launch. If running manually, kill the offending processes before starting devenv.

---

### devenv won't start at all

Delete the bootstrap stamp file and try again:

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
| `scripts/dev_bootstrap.sh` | Bootstrap script (secrets, config) |
| `~/.config/fluxer/settings.json` | Desktop app config |

---

## 📝 License

This project inherits the license of the upstream Fluxer project. See [LICENSE](LICENSE) and [LICENSING.md](LICENSING.md) for details.
