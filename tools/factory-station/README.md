# Factory Station

Local factory QA and ship-ready tool for AddOne beta hardware.

## What It Does
- loads the approved firmware release manifest
- flashes a board over USB
- captures serial boot output
- runs manufacturing QA commands over USB serial
- preregisters hardware in Supabase using the service role
- records factory notes and QA results in `factory_device_runs`
- performs the final ship-ready reset and verifies fresh setup state

## Required Environment
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional:
- `FACTORY_STATION_ACCESS_TOKEN` fixed API token for the local browser session. If omitted, the station generates a fresh token each time it starts.
- `FACTORY_STATION_PORT` default `8791`
- `FACTORY_STATION_MANIFEST_PATH` default `firmware/releases/factory-stable.json`
- `FACTORY_STATION_AMBIENT_DELTA_THRESHOLD` default `0.15`
- `FACTORY_STATION_RTC_RETENTION_SECONDS` default `30`
- `FACTORY_STATION_RTC_RETENTION_TOLERANCE_SECONDS` default `10`

Recommended:
- create a local file at `tools/factory-station/.env.local`
- copy values from `.env.local.example`
- keep your real Supabase values there so you do not need to paste exports every time

## Local Commands
- `npm install`
- `npm run dev`
- `./run.sh`
- `npm run launch`
- `./run-factory-station.sh`

The server binds to `127.0.0.1` only and serves a per-session API token to the local browser UI.
`run.sh` starts the station from this folder, installs dependencies if needed, and automatically picks the next free local port if `8791` is already taken.
`run-factory-station.sh` lets you start the station from the repo root with one command.

## QA Access
- Fresh unclaimed boards expose factory QA automatically after flashing, so the station can reconnect and continue without a special boot gesture.
- On a non-fresh board, USB QA stays locked after a normal boot.
- If you need to force QA access on a non-fresh board, power-cycle while holding the main button for about `3 seconds`, then reconnect serial in the station UI.
