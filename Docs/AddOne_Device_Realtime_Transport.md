# AddOne Device Realtime Transport

Last locked: March 9, 2026

This document defines the low-latency command path for AddOne devices.

The goal is:
- instant local feedback in the app
- near-instant reaction on online devices
- device remaining the runtime source of truth
- Supabase storing the latest device-confirmed mirror
- reliable fallback when the broker or device is offline

## Architecture

AddOne uses two lanes:

1. `Source of truth`
- Supabase auth
- device ownership
- mirrored latest board/settings
- queued command records
- snapshot storage

2. `Realtime transport`
- MQTT broker for low-latency device command delivery
- small gateway service that bridges:
  - Supabase command rows -> MQTT topics
  - MQTT device runtime messages -> Supabase RPCs
- existing Supabase RPCs retained as the cloud write surface

This means:
- the app still writes command intents to Supabase
- the gateway publishes queued commands to MQTT immediately
- online devices receive commands without waiting for a poll cycle
- the device applies locally first
- the device publishes a fresh runtime snapshot after accepted runtime changes
- the cloud mirror advances only from device-confirmed apply or device-originated runtime snapshots
- offline devices still recover through queued commands plus reconnect snapshots

## Why This Shape

This is the clean upgrade from the current validation-grade polling system because:
- it keeps the backend data model already implemented
- it improves latency for online devices without throwing away fallback safety
- it scales to more command types later
- it supports future broker ACL / per-device auth hardening

## Command Flow

1. App writes a command-producing change into Supabase.
2. Supabase records the command intent in `device_commands`.
3. The realtime gateway sees the queued command.
4. The gateway publishes the command to the device MQTT topic.
5. The device applies the command immediately if online.
6. The device acknowledges with `ack_device_command(...)`.
7. The device publishes a fresh runtime snapshot.
8. The gateway forwards that snapshot to `upload_device_runtime_snapshot(...)`.
9. Supabase updates the mirrored board/settings state.
10. The app UI reconciles from the new device snapshot revision.

If the device is offline:
- the command remains queued in Supabase
- the device can still recover through fallback polling after reconnect
- when it reconnects, it should publish a fresh runtime snapshot to heal drift

## Topic Contract

Topic prefix default:
- `addone`

### Device command topic
- `addone/device/<hardware_uid>/command`

Published by:
- realtime gateway

Payload:
```json
{
  "id": "uuid",
  "kind": "set_day_state",
  "payload": {
    "local_date": "2026-03-09",
    "is_done": true,
    "effective_at": "2026-03-09T04:20:30.853751+00:00"
  },
  "requested_at": "2026-03-09T04:20:30.853751+00:00",
  "request_key": null,
  "schema_version": 1
}
```

Supported `kind` values in v1:
- `set_day_state`
- `request_runtime_snapshot`
- `apply_history_draft`
- `apply_device_settings`

### Device day-event topic
- `addone/device/<hardware_uid>/event/day-state`

Published by:
- device firmware

Purpose:
- low-latency path for device-originated local toggles

Current runtime direction:
- device should publish here first when realtime is available
- HTTP `record_day_state_from_device(...)` remains the fallback

### Device runtime snapshot topic
- `addone/device/<hardware_uid>/snapshot/runtime`

Published by:
- device firmware

Purpose:
- publish the current device-confirmed runtime board and mirrored runtime settings after accepted runtime changes or reconnect

Current runtime direction:
- device should publish here first when realtime is available
- HTTP `upload_device_runtime_snapshot(...)` remains the fallback

### Device presence topic
- `addone/device/<hardware_uid>/presence`

Published by:
- device firmware

Purpose:
- low-latency presence heartbeat without blocking the interaction loop

Current runtime direction:
- device should publish here first when realtime is available
- HTTP `device_heartbeat(...)` remains the fallback

## Security Model

Current implementation target:
- MQTT transport is enabled only when explicit broker config exists
- Supabase remains authoritative for device authentication and command ack

Staging-friendly model:
- broker username/password may be shared by the deployed device fleet
- device identity still lives in topic namespace plus Supabase-authenticated ack RPCs

Production target:
- broker over TLS
- broker ACL or per-device credentials
- device topics restricted to the device’s own namespace
- no broad cross-device publish/subscribe permissions

This is the long-term target because transport auth and product auth should not be conflated.

## Fallback Rules

If MQTT is unavailable:
- onboarding still works
- button-driven local habit tracking still works
- cloud-originated commands still recover through periodic polling

Polling remains the fallback, not the primary fast path.

## Gateway Responsibilities

The realtime gateway must:
- subscribe to queued `device_commands`
- resolve `device_id -> hardware_uid`
- publish command payloads to MQTT
- subscribe to device ack, presence, day-event, and runtime-snapshot topics
- forward runtime snapshots into `upload_device_runtime_snapshot(...)`
- deduplicate rapid republish of the same queued command
- remain stateless enough to restart safely

The gateway should not:
- become the source of truth for command state
- write history directly except via the existing RPC surface

## Firmware Responsibilities

Firmware must:
- connect to MQTT when Wi-Fi and broker config are present
- subscribe to its own command topic
- parse and apply realtime commands using the same command handler as the poll path
- publish command acknowledgements, local day events, presence, and runtime snapshots through the realtime lane when possible, with HTTP fallback
- keep fallback poll enabled at a slower interval

## App Responsibilities

The app must:
- show immediate feedback for in-flight today toggles
- confirm runtime changes from a newer device snapshot revision
- reserve `queued` for actual offline/backlog cases
- keep only a light self-heal refetch if realtime snapshot delivery is unavailable

## Deployment Notes

For v1, the broker and gateway are separate from Supabase:
- Supabase handles product data
- MQTT handles online runtime delivery
- the gateway bridges the two

For the hosted beta split and required repo config, see [AddOne_Beta_Environment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Beta_Environment.md).

This keeps the system scalable without turning Postgres polling into the realtime layer.

## Development Setup Notes
- Local validation on a developer machine can use `mosquitto` as the broker.
- The minimum healthy local stack is:
  - Expo app
  - Supabase staging project
  - MQTT broker
  - realtime gateway
  - flashed firmware configured for that broker
- `device_runtime_snapshots` must be in the `supabase_realtime` publication for the app to receive live mirrored board updates via Supabase subscriptions.
- If that publication entry is missing, the app can still work by polling snapshots, but it will feel slower and more fragile.
