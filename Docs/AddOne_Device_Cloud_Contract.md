# AddOne Device Cloud Contract

Last locked: March 8, 2026

This document defines the v1 contract between:
- the mobile app during onboarding
- the device firmware during setup and steady-state sync
- the Supabase backend

This is the current target contract. Some parts are implemented in staging already, and some still need firmware to consume them.

For the local AP HTTP contract, see [AddOne_Device_AP_Provisioning_Contract.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_AP_Provisioning_Contract.md).

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

### `record_day_state_from_device(...)`
Called by:
- device firmware

Payload:
- `hardware_uid`
- `device_auth_token`
- `local_date`
- `is_done`
- `device_event_id`
- optional `effective_at`

Purpose:
- writes append-only device-originated day events
- updates the materialized day state
- advances device sync timestamps

## Command Semantics
- Device commands are at-least-once, not exactly-once.
- `request_key` is used on the cloud side to avoid duplicate queueing.
- `device_event_id` is used on the device-originated event side to avoid duplicate history writes.
- Firmware should tolerate receiving the same command more than once.

## Firmware Expectations
- On first boot with no Wi-Fi, start AP mode automatically.
- On power-up hold or Wi-Fi reset, start AP mode manually.
- After AP provisioning succeeds:
  - save Wi-Fi locally
  - reboot or reconnect
  - redeem claim
  - start heartbeat / command poll loop
- During steady state:
  - periodically call heartbeat
  - periodically pull commands
  - ack command results
  - push local button-driven day events

## Current Implementation Status
- App-side onboarding sessions are implemented.
- Backend claim-session and device sync RPCs are implemented in staging schema.
- The app-side AP payload builder and local endpoint contract are now implemented.
- The app now probes the local AP and can POST the provisioning payload to firmware once those endpoints exist.
- Firmware v2 now exposes the AP HTTP provisioning endpoints and can persist the local handoff payload.
- Firmware v2 now has claim-redemption and heartbeat plumbing against the cloud RPC surface.
- Final cloud integration still needs real flashed credentials/config plus command pull/ack and day-event sync.
- Developer staging tools currently simulate claim redemption from the app until firmware is ready.
