# AddOne Device Cloud Contract

Last locked: March 9, 2026

This document defines the v1 contract between:
- the mobile app during onboarding
- the device firmware during setup and steady-state sync
- the Supabase backend

This is the current target contract. Some parts are implemented in staging already, and some still need firmware to consume them.

For the local AP HTTP contract, see [AddOne_Device_AP_Provisioning_Contract.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_AP_Provisioning_Contract.md).
For the low-latency device delivery lane, see [AddOne_Device_Realtime_Transport.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_Realtime_Transport.md).

## Identity Model
- Every device has an internal `hardware_uid`.
- Every device should also have a device-local auth secret generated during manufacturing / flashing.
- The backend stores only a hash of that device auth secret in `devices.device_auth_token_hash`.
- The user never types the `hardware_uid` in the normal customer flow.

## Factory Stage
- Flash firmware.
- Generate or assign:
  - `hardware_uid`
  - `device_auth_token`
- Register the device in backend via `register_factory_device(...)`.
- Run QA:
  - LED matrix
  - RTC
  - ambient sensor
  - button
  - firmware version
- Reset the device to the unprovisioned customer state before shipping.

## Customer Onboarding Flow
1. User scans the generic QR on the device back and lands on `addone.studio/start`.
2. User signs in to the AddOne app.
3. App creates an onboarding session with `create_device_onboarding_session(...)`.
4. App receives a one-time `claim_token`.
5. User joins the temporary `AddOne-XXXX` AP.
6. App sends Wi-Fi credentials and the claim token to the device over AP.
7. Device joins home Wi-Fi and reaches cloud.
8. Device redeems the onboarding claim with `redeem_device_onboarding_claim(...)`.
9. Backend binds the device to the signed-in user.
10. App sees the session move to `claimed` and finishes setup.
11. Online devices should then use the realtime transport lane for low-latency command delivery, with polling retained only as fallback.

## AP Provisioning Handoff
- The exact local payload and endpoint contract now live in [AddOne_Device_AP_Provisioning_Contract.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_AP_Provisioning_Contract.md).
- Wi-Fi credentials stay local to the device and are not stored in Supabase.
- `claim_token` is one-time and short-lived.
- Deeper settings like habit name, target, or rewards are not required during AP provisioning.

## Cloud RPCs

### `create_device_onboarding_session(...)`
Called by:
- authenticated app user

Purpose:
- creates a short-lived claim session
- returns the raw one-time `claim_token` once

### `mark_device_onboarding_waiting(...)`
Called by:
- authenticated app user

Purpose:
- marks the session as waiting for the device to reach cloud after AP provisioning

### `redeem_device_onboarding_claim(...)`
Called by:
- device firmware after it gets online

Payload:
- `claim_token`
- `hardware_uid`
- `hardware_profile`
- `firmware_version`
- optional `name`
- optional `device_auth_token`

Purpose:
- validates the one-time claim
- attaches the device to the owner
- optionally seeds `device_auth_token_hash` if it was not already registered

### `device_heartbeat(...)`
Called by:
- device firmware

Payload:
- `hardware_uid`
- `device_auth_token`
- `firmware_version`
- `hardware_profile`
- optional `last_sync_at`

Purpose:
- authenticates the device
- updates `last_seen_at`
- updates `last_sync_at`
- updates firmware/profile metadata if needed

### `pull_device_commands(...)`
Called by:
- device firmware

Payload:
- `hardware_uid`
- `device_auth_token`
- optional `limit`

Purpose:
- authenticates the device
- returns queued commands
- marks newly queued commands as `delivered`

Notes:
- this remains the fallback / backlog recovery path
- low-latency online delivery now belongs to the MQTT realtime transport layer

### `ack_device_command(...)`
Called by:
- device firmware

Payload:
- `hardware_uid`
- `device_auth_token`
- `command_id`
- `status` in `applied | failed | cancelled`
- optional `last_error`

Purpose:
- acknowledges execution results for cloud-originated commands

### `upload_device_runtime_snapshot(...)`
Called by:
- device firmware

Payload:
- `hardware_uid`
- `device_auth_token`
- `revision`
- `current_week_start`
- `today_row`
- full `board_days`
- device-confirmed `settings`
- optional `generated_at`

Purpose:
- heals cloud/app state back to the exact current device board
- rewrites the mirrored `device_day_states` read model from the device snapshot
- mirrors device-confirmed runtime settings
- advances device sync timestamps and runtime revision metadata

## Command Semantics
- Device commands are at-least-once, not exactly-once.
- `request_key` is used on the cloud side to avoid duplicate queueing.
- `set_day_state` and `apply_history_draft` carry `base_revision` so the device can reject stale requests.
- `enter_wifi_recovery` is a deliberate owner-triggered command that tells the device to stop normal cloud control and start its temporary `AddOne-XXXX` AP without clearing ownership, history, or settings.
- Firmware should tolerate receiving the same command more than once.

## Firmware Expectations
- On first boot with no Wi-Fi, start AP mode automatically.
- On power-up hold or Wi-Fi reset, start AP mode manually.
- After AP provisioning succeeds:
  - save Wi-Fi locally
  - reboot or reconnect
  - redeem claim
  - start heartbeat / realtime subscribe path
  - keep fallback command poll enabled for backlog recovery
- During steady state:
  - periodically call heartbeat
  - process realtime commands immediately when online
  - periodically pull commands only as fallback / backlog recovery
  - ack command results
  - upload runtime snapshots after accepted runtime changes and after reconnect

## Current Implementation Status
- App-side onboarding sessions are implemented.
- Backend claim-session and device sync RPCs are implemented in staging schema.
- The app-side AP payload builder and local endpoint contract are now implemented.
- The app now probes the local AP and can POST the provisioning payload to firmware.
- Firmware v2 now exposes the AP HTTP provisioning endpoints and can persist the local handoff payload.
- Firmware v2 now has claim-redemption, heartbeat, command pull/ack, and runtime snapshot upload plumbing against the cloud RPC surface.
- Firmware v2 now has the first real AddOne product behavior layer on top of that transport: button input, 21-week board state, time service, and board rendering.
- Firmware v2 now also applies `apply_device_settings` commands for the AddOne v1 settings subset and uses ambient brightness at render time.
- A dedicated realtime transport contract now exists for MQTT-based online command delivery, with fallback polling retained for reliability.
- Runtime snapshots should now use the same realtime lane whenever possible:
  - `device -> MQTT -> gateway -> upload_device_runtime_snapshot(...)`
  - direct device -> Supabase HTTP snapshot upload is fallback only
- `device_runtime_snapshots` must be in the `supabase_realtime` publication or the app can miss live device-confirmed state and fall back to polling.
- The remaining firmware gap is custom reward asset sync and end-to-end hardware validation.
- Developer staging tools currently simulate claim redemption from the app until firmware is ready.
