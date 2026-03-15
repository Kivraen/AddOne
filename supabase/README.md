# AddOne Supabase Layout

This folder holds the AddOne cloud schema for the new product backend.

Project strategy:
- `legacy-prototype`: keep the existing distributed prototype devices on their current backend
- `addone-development`: local/dev app and firmware validation backend
- `addone-beta`: clean pre-launch validation backend
- `addone-production`: real AddOne launch backend

Current temporary decision:
- the hosted Supabase project `AddOne` is the active beta backend for now
- a distinct `addone-beta` project is deferred until there is another project slot or an upgraded Supabase plan

Rules:
- Do not point new AddOne app code at the legacy prototype project.
- Do not reuse the legacy schema as the AddOne production schema.
- Migrate old devices selectively later, through an explicit import path.

Initial migration:
- `migrations/20260308113000_init_addone_schema.sql`

What this migration sets up:
- user profiles
- devices
- owner/viewer memberships
- share codes and share requests
- reward artwork metadata
- day-state event log plus current day-state snapshot
- queued device commands
- core RPC helpers for claiming devices, sharing, day-event writes, and command queueing
- row-level security policies for app access

How to apply once a target environment exists:
1. Create the `addone-development`, `addone-beta`, or `addone-production` Supabase project.
2. Apply the SQL in the Supabase SQL editor or via the Supabase CLI migration flow.
3. Set the app env vars from that staging project:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
4. After the schema is live, generate typed database types and replace the mock device store with query-backed repositories.

Important data boundary:
- Wi-Fi passwords and device-local secrets do not belong in Supabase.
- The cloud stores device metadata, ownership, history, rewards metadata, and queued commands.
- The physical device remains authoritative for its local loop when offline, but cloud history uses timestamped day-state events for reconciliation.
