# AddOne Supabase Layout

This folder holds the live AddOne cloud schema for the app, firmware, and runtime mirror behavior.

## Project Strategy

- `legacy-prototype`: keep older distributed prototype devices on their existing backend
- `addone-development`: future clean development backend
- `addone-beta`: future clean pre-launch validation backend
- `addone-production`: launch backend

Current temporary decision:
- the hosted Supabase project `AddOne` (`sqhzaayqacmgxseiqihs`) is the active beta backend for now
- a distinct `addone-beta` project is deferred until there is another project slot or an upgraded plan

## Current Schema Direction

The current schema is built around the device-authoritative runtime model:
- ownership, auth, onboarding sessions, and device metadata live in Supabase
- app-originated changes become queued commands
- the physical device is the runtime authority for board state and device-affecting settings
- `device_runtime_snapshots` are the primary cloud mirror for app/runtime reads
- `device_day_states` remains a derived compatibility/read model, not the primary runtime truth

## Key Migrations

Core foundation:
- `migrations/20260308113000_init_addone_schema.sql`

Onboarding and cloud sync:
- `migrations/20260308153000_add_device_onboarding_sessions.sql`
- `migrations/20260308170000_add_device_cloud_sync_contract.sql`

Runtime-authority rebuild:
- `migrations/20260309104500_device_authoritative_runtime.sql`
- `migrations/20260309150000_runtime_authority_rebuild.sql`
- `migrations/20260309162000_enable_runtime_snapshot_realtime.sql`

Later runtime/settings support:
- `migrations/20260309171000_add_wifi_recovery_command.sql`
- `migrations/20260315194000_add_palette_custom_to_runtime_snapshots.sql`

## Current Repo Status

- typed database types already exist in `lib/supabase/database.types.ts`
- the app already reads owned devices from Supabase
- the app already uses onboarding-session RPCs and runtime/device command RPCs
- the schema already supports runtime snapshots, history drafts, live settings apply, and Wi-Fi recovery commands
- sharing, rewards, and reminders still exist in schema for future phases, but first-user v1 should keep those surfaces hidden

## Data Boundary

- Wi-Fi passwords do not belong in Supabase
- product-auth device secrets do not belong in app-visible Supabase tables
- the new `device_mqtt_credentials` table is service-only transport-auth storage used to render broker password files without fleet-shared MQTT credentials
- Supabase stores ownership, metadata, queued commands, onboarding sessions, and the mirrored latest runtime snapshot
- when the device and cloud disagree, the device snapshot is the healing path

## Current Next Steps

1. Validate the hosted beta environment end-to-end with real device snapshots and command delivery.
2. Keep the docs in `Docs/` aligned with any schema or RPC changes.
3. Create the dedicated beta Supabase project when account capacity allows, then regenerate `lib/supabase/database.types.ts`.
