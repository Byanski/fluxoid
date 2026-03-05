# Fluxoid Windows

## Setup

1. Download the required binaries and place them in the `bin/` folder:

   | Binary | Download |
   |--------|---------|
   | `caddy.exe` | https://caddyserver.com/download (Windows amd64) |
   | `nats-server.exe` | https://github.com/nats-io/nats-server/releases (Windows amd64) |
   | `valkey-server.exe` | https://github.com/valkey-io/valkey/releases (Windows) |
   | `meilisearch.exe` | https://github.com/meilisearch/meilisearch/releases (Windows amd64) |
   | `livekit-server.exe` | https://github.com/livekit/livekit/releases (Windows amd64) |
   | `node/node.exe` + `node/pnpm.cmd` | https://nodejs.org (Windows, extract to bin/node/) |
   | `fluxer_gateway/` | Built Erlang release for Windows (see below) |

2. Copy `dev/meilisearch_master_key` from the repo root into this `windows/` folder.

3. Double-click `Start-Fluxoid.bat` to launch.

## Building the Gateway for Windows

The fluxer_gateway Erlang release must be compiled on a Windows machine with Erlang/OTP installed:
```
cd fluxer_gateway
scripts\rebar3_wrapper.sh as prod release
```

Then copy `_build/prod/rel/fluxer_gateway/` into `windows/bin/fluxer_gateway/`.

## Notes

- All service logs are written to `windows/logs/`
- Data is stored in `windows/data/`
- The frontend is built automatically on first launch if not present
