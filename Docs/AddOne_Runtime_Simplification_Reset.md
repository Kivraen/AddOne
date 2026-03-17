# AddOne Runtime Simplification Reset

Last locked: March 17, 2026

Status note:
- This document still describes the locked runtime direction.
- Several of the cleanup items here have since been implemented in code.
- Use [AddOne_Main_Plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Main_Plan.md) and [AddOne_V1_Canonical_Spec.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_V1_Canonical_Spec.md) for current project status and next steps.

## Why This Reset Exists
- The product runtime is simpler than the current implementation.
- We are carrying too many active runtime layers at once:
  - device-local board state
  - cloud `device_day_states`
  - app-local optimistic cache patches
  - command status polling
  - runtime snapshots layered on top
- That layering is the main reason simple interactions are behaving unreliably.

## What We Learned
- The product is simple. Most of the runtime instability came from architecture that was too layered, not from hard product requirements.
- If the app reads the board from multiple places at once, drift is inevitable.
- If device commands use one transport and runtime snapshots use another unrelated transport, the system feels slow and glitchy even when it is technically working.
- The physical button path must stay fully local and must never share a blocking loop with network work.
- History edit is only robust if it is `live-only Draft + Save`. Streaming per-cell edits creates unnecessary races.
- The app should not treat command-row status as the user-facing truth. The user-facing truth is the latest device-confirmed board.
- The cloud mirror must be able to heal from a full device snapshot after reconnect or drift.

## The Correct Runtime Model

### Authority
- `device` is the runtime source of truth
- `cloud` stores the latest device-confirmed mirror
- `app` sends intents and displays device-confirmed state

### Runtime read model
- The active board read model for app/runtime should be the latest `device_runtime_snapshot`
- `device_day_states` becomes a derived compatibility/read table, not the primary runtime board source
- If a snapshot exists, the app should render the current logical board by projecting that snapshot onto the current device `timezone + reset time + week start`
- The app should invalidate live board state from `device_runtime_snapshots`, not from `device_day_states`
- Backend command rows may still use `queued` for delivery, but `queued` should not be treated as a user-facing board runtime state
- The app should no longer fetch `device_day_states` for runtime board rendering; devices without a snapshot remain in bootstrap state until the first snapshot arrives
- User-facing “last synced” messaging should come from the latest device runtime snapshot timestamp, not generic command or heartbeat timestamps
- If the projected logical board is ahead of the latest confirmed snapshot, the app should:
  - mark the board as `verifying`
  - request one fresh runtime snapshot for live devices in the background
  - keep the today action locked until the refresh settles

### Runtime write model
- App sends commands only during a live device session
- Device applies locally
- Device publishes or uploads a fresh snapshot
- App advances to the new board when the snapshot revision advances
- `set_day_state` is valid only for the device's current logical date
- Non-today edits use `apply_history_draft`

### Offline behavior
- Device always works offline
- Remote app becomes read-only when the device is offline
- When the latest snapshot is stale across reset or long downtime, the app still projects the correct current logical frame from the last confirmed board plus device settings
- On reconnect, the device uploads a new snapshot and heals cloud/app

## What We Should Stop Doing
- Stop treating `device_day_states` as the primary runtime board source in the app
- Stop letting app-side optimistic cache patches become a second board truth
- Stop treating command rows as the user-facing state truth
- Stop streaming per-cell history edits
- Stop relying on cloud writes to represent board state before the device confirms them

## Simplified Runtime Flows

### Today toggle
1. App ensures the live board is not stale for the current logical day
2. App sends `set_day_state(base_revision, desired_state, local_date)`
3. Device applies immediately if revision matches and `local_date` matches the current logical day
4. Device uploads snapshot with new revision
5. App updates from the new snapshot

### History edit
1. App loads latest device snapshot
2. User edits locally in a draft
3. User taps `Save`
4. App sends `apply_history_draft(base_revision, updates)`
5. Device applies once if revision matches
6. Device uploads snapshot with new revision
7. App updates from the new snapshot

### Physical button
1. Button press is captured locally
2. Device updates board immediately
3. Device renders immediately
4. Background sync uploads snapshot

## Required Runtime Setup
- `MQTT` is the primary online runtime transport.
- `Supabase` remains auth, ownership, backup, and mirrored-state storage.
- Runtime commands should flow:
  - `app -> Supabase RPC -> gateway -> MQTT -> device`
- Runtime snapshots should flow:
  - `device -> MQTT -> gateway -> Supabase`
- Direct device -> Supabase snapshot upload may remain as fallback, but not as the preferred hot path.
- `device_runtime_snapshots` must be included in the `supabase_realtime` publication so app subscriptions can see fresh device-confirmed state without relying only on polling.
- The app may keep a light self-heal refetch for resilience, but this is backup behavior, not the primary runtime design.

## Implementation Priority
1. Make app board rendering prefer `device_runtime_snapshots`
2. Project stale snapshots onto the current logical day in one shared, testable board helper
3. Remove remaining app runtime behaviors that treat `device_day_states` as live truth
4. Keep command rows only for delivery/observability
5. Make app/device UI confirmation depend on new snapshot revision, not just command-row status
6. Keep firmware local-first and networking out of the normal interaction loop

## Non-Goals
- No full audit/event sourcing for v1
- No deferred history queues
- No secondary cloud runtime authority
