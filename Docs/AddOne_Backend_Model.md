# AddOne Backend Model

Last locked: March 19, 2026

This document defines the first real cloud data model for AddOne.
It follows the canonical v1 product spec and assumes:
- new AddOne devices first
- legacy prototype backend stays separate
- AddOne uses its own staging and production Supabase projects
- first-user v1 active product surface is `single owner, one device`
- sharing schema already exists and may become active during the beta sharing workstream; rewards and reminders remain future-phase unless explicitly pulled in

For the firmware-facing RPC and provisioning handshake, see [AddOne_Device_Cloud_Contract.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_Cloud_Contract.md) and [AddOne_Device_AP_Provisioning_Contract.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_AP_Provisioning_Contract.md).
For low-latency online device delivery, see [AddOne_Device_Realtime_Transport.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_Realtime_Transport.md).

## Project Strategy
- Keep the existing prototype Supabase project alive for already-distributed legacy devices.
- Create a clean `addone-development` Supabase project for laptop/local development.
- Create a clean `addone-beta` Supabase project for pre-launch validation and tester builds.
- Create a clean `addone-production` Supabase project for launch.
- Treat legacy migration as optional and selective, not as a requirement for the new backend design.
- Production-facing domain target is `addone.studio`.

Temporary beta decision:
- because the current Supabase account is at the free-project limit, the existing hosted `AddOne` project (`sqhzaayqacmgxseiqihs`) is acting as the beta backend for now
- the separate `addone-beta` project remains the intended later target, not the immediate blocker

## Core Identity Model
- `auth.users.id` is the canonical user key.
- `public.profiles` stores AddOne-specific profile metadata.
- The app currently uses `email OTP` for the dev and staging auth flow.
- The relational model still allows Google or password auth later because all tables anchor to `auth.users.id`.
- Branded auth email and redirect configuration can move to `addone.studio` later without changing the relational model.
- For Supabase-hosted email OTP, the current email template must include `{{ .Token }}` rather than a magic-link-only `{{ .ConfirmationURL }}` flow.
- Beta social identity should live in `public.profiles`, not inside auth itself.
- Email stays the auth credential, not the friend-facing identity label.

## Core Data Model

### `profiles`
Purpose:
- stores display metadata for authenticated users
- acts as the friend-facing social profile layer used by `Friends`

Key fields:
- `user_id`
- `display_name`
- `username`
- `avatar_url`
- `first_name`
- `last_name`

Notes:
- `display_name` is derived from `first_name + last_name` for the beta social profile instead of being edited separately in the app.
- `first_name + last_name + @username` is the intended beta social identity surface.
- `username` is nullable at the table level until a user completes the beta social-profile gate, but when present it must be unique, lowercase-safe for `@handle` display, and accompanied by non-empty first and last name fields.
- Profile photos now upload through a dedicated public storage bucket so the app can use native camera and photo-library flows instead of a pasted URL.
- The profile write path now supports authenticated self-serve insert or update so the app can recover cleanly even if an older auth row missed the initial profile bootstrap.
- Beta sharing should remain device-code plus owner-approval based, not open username discovery.

### `devices`
Purpose:
- stores one AddOne device record per physical unit

Key fields:
- `hardware_uid`
- `device_auth_token_hash`
- `hardware_profile`
- `name`
- `timezone`
- `day_reset_time`
- `week_start`
- `weekly_target`
- `palette_preset`
- `palette_custom`
- `reward_enabled`
- `reward_type`
- `reward_trigger`
- `reward_artwork_id`
- `brightness`
- `ambient_auto`
- `firmware_version`
- `last_seen_at`
- `last_sync_at`

Notes:
- Wi-Fi passwords are intentionally not stored here.
- `hardware_uid` is the durable identifier used for claim/migration logic.
- `hardware_uid` stays internal; the normal user-facing flow should not require typing it.
- devices can be pre-registered during factory flashing / QA before customer shipment.
- `device_auth_token_hash` stores the hashed device-local secret used for device/cloud authentication.

### `device_onboarding_sessions`
Purpose:
- stores short-lived onboarding claim sessions created by the signed-in app user before AP provisioning

Key fields:
- `user_id`
- `device_id`
- `hardware_profile_hint`
- `claim_token_hash`
- `claim_token_prefix`
- `status`
- `expires_at`
- `waiting_for_device_at`
- `claimed_at`
- `cancelled_at`
- `last_error`

Notes:
- the raw claim token is returned only when the session is created and should stay in app-local state
- the backend stores only a hash of that token
- one active session per user is enough for v1 onboarding
- the device redeems the session after it reaches cloud

## Onboarding And Claim Model
- v1 uses a `generic QR -> app/web start page -> AP provisioning -> cloud claim confirmation` flow.
- The printed QR does **not** need to be unique in v1.
- The backend still needs an internal durable device identity:
  - `hardware_uid`
  - device-local secret material for secure claim / activation
- The app should create a one-time claim context during onboarding.
- That claim context is delivered to the device during the AP provisioning session together with Wi-Fi credentials.
- After the device reaches cloud, it redeems the claim context and becomes owned by the signed-in user.
- This avoids raw hardware UID entry and avoids LAN discovery as the primary claim path.
- LAN discovery can be added later for nearby diagnostics or maintenance, but it is not the v1 dependency.

### `device_memberships`
Purpose:
- defines ownership and approved viewer access

Roles:
- `owner`
- `viewer`

Statuses:
- `pending`
- `approved`
- `revoked`
- `rejected`

Notes:
- a device can have only one approved owner
- reminder settings are stored at the membership level so they can stay user-specific

### `device_share_codes`
Purpose:
- one active share code per device for v1 code-based sharing

### `device_share_requests`
Purpose:
- tracks code-based access requests waiting for owner approval

Statuses:
- `pending`
- `approved`
- `rejected`
- `cancelled`

### `reward_artworks`
Purpose:
- stores custom or AI-generated 8x21 reward art metadata

Sources:
- `preset`
- `custom`
- `ai`

Notes:
- for v1, static reward art can live in Postgres as JSON board data
- if this grows later, artwork assets can move to Supabase Storage while metadata stays relational

### `device_day_events`
Purpose:
- reserved for optional future audit/event tracing

Sources:
- `device`
- `cloud`
- `recovery`
- `migration`

Notes:
- this is not the primary v1 runtime-healing path
- v1 runtime correctness relies on device-authored snapshots, not replaying per-day event history

### `device_day_states`
Purpose:
- current materialized day state per `device + local_date`

Notes:
- updated from device-confirmed apply and device-authored runtime snapshots
- this is a derived compatibility/read table, not the active app runtime board source
- app-originated changes should not advance this table until the device confirms apply

### `device_runtime_snapshots`
Purpose:
- store the latest full device-authored board/settings snapshot by runtime revision

Notes:
- this is the primary healing path after reconnect or drift
- snapshots rewrite the mirrored `device_day_states` read model
- snapshots keep cloud/app aligned to the exact device board without a deferred event queue

### `device_commands`
Purpose:
- store cloud-originated commands as the authoritative command log

Initial v1 usage:
- remote fallback completion
- live device settings apply
- runtime snapshot refresh requests
- history draft apply

Transport model:
- online devices should receive these commands over the MQTT realtime delivery lane
- fallback polling still exists for offline recovery and backlog drain
- command acknowledgement still writes back through Supabase
- acknowledged `applied` commands confirm execution, while mirrored board/settings state advances on the next device-confirmed snapshot

## RPC / Helper Functions
The first migration includes helper functions for:
- claiming a new device into an owner account
- rotating a device share code
- requesting view access by code
- approving or rejecting a share request
- recording a day-state event
- queueing a device command

The onboarding migration adds helper functions for:
- creating a short-lived onboarding session
- marking a session as waiting for device cloud connection
- redeeming a claim session once the device comes online
- claiming a device for an explicit owner user internally

The device sync migration adds helper functions for:
- registering a factory device with its auth token
- authenticating device-originated calls
- heartbeat / last seen updates
- device command pull
- device command acknowledgement
- device runtime snapshot upload

The runtime authority rebuild adds helper functions for:
- requesting a runtime snapshot refresh from the app
- applying a live history draft with `base_revision`
- applying live device settings through a device-confirmed command path

The realtime transport layer adds:
- MQTT topic contract for per-device command delivery
- a small gateway service that bridges queued `device_commands` rows into broker publishes
- MQTT presence / day-event topics so device-originated sync can stay off the blocking HTTP path when realtime is available

These functions are important because they keep multi-table mutations atomic and reduce client-side mistakes.

## Security Model
- Row-level security is enabled on all app tables.
- Approved device members can read device data relevant to them.
- Only approved owners can mutate device-level app data.
- Viewer access is read-only by policy.
- Service-role operations remain available for trusted backend/device sync paths.

## What Stays Out Of The Cloud
- Wi-Fi passwords
- temporary AP credentials
- raw device-local secrets
- prototype-only settings such as rotary or haptic configuration

## Manufacturing Notes
- Factory prep may register devices before shipment.
- Factory QA can validate button, RTC, ambient sensor, display, and firmware version before final reset.
- Customer ownership begins only after the onboarding claim succeeds, not merely because a device exists in the backend.

## Next Backend Steps
1. Revalidate the device-authoritative runtime path on real hardware and keep the snapshot mirror stable.
2. Finish the always-on beta bring-up:
   - hosted gateway
   - managed broker
   - beta app / firmware profiles
3. Harden gateway and broker operations for beta:
   - auth
   - restart safety
   - health checks
   - observability
4. Support the planned sharing beta workstream without widening scope into rewards, reminders, or multi-device product work.
5. Split dedicated development and beta Supabase projects later when account capacity allows, without changing the current runtime contract.
