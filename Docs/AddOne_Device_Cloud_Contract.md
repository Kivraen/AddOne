# AddOne Device Cloud Contract

Last locked: March 26, 2026

This document defines the v1 contract between:
- the mobile app during onboarding
- the device firmware during setup and steady-state sync
- the Supabase backend

This is the current target contract. Most of it now exists in this repo and staging/beta infrastructure. The remaining work is end-to-end hardware validation, beta bring-up, and custom reward asset sync.

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

### `issue_device_mqtt_credentials(...)`
Called by:
- device firmware after authenticated cloud access is available

Payload:
- `hardware_uid`
- `device_auth_token`

Purpose:
- authenticates the device over the product-auth path
- returns the device-scoped MQTT username and password for the broker transport lane
- keeps MQTT transport auth separate from `device_auth_token`

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

### Firmware OTA control plane

The backend OTA control plane now lives in
[supabase/migrations/20260326153000_add_firmware_ota_control_plane.sql](/Users/viktor/Desktop/DevProjects/Codex/AddOne/supabase/migrations/20260326153000_add_firmware_ota_control_plane.sql)
and stays locked to the safety model in
[firmware/OTA_SAFETY_CONTRACT.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/OTA_SAFETY_CONTRACT.md).

Release-state and progress storage now use:
- `firmware_releases`
- `firmware_release_rollout_allowlist`
- `device_firmware_update_requests`
- `device_firmware_ota_events`
- `device_firmware_ota_statuses`

#### `check_device_firmware_release(...)`
Called by:
- device firmware

Payload:
- `hardware_uid`
- `device_auth_token`
- current `firmware_version`
- current confirmed `release_id` when available
- current `partition_layout`

Purpose:
- authenticates the device over the existing product-auth path
- returns one decision row with:
  - `decision`: `none | available | install_ready | blocked`
  - `reason`: a concrete control-plane reason such as `up_to_date`, `user_confirmation_required`, `release_paused`, or `partition_layout_mismatch`
  - `release`: `null` or one release envelope matching
    [ota-release.example.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/releases/ota-release.example.json)
  - `target_release_id`
  - `install_authorized`
  - optional `request_id`, `command_id`, and `requested_at` when a persisted install request exists
- keeps rollout eligibility authoritative on the HTTPS control plane rather than on MQTT
- enforces the locked `T-038` contract:
  - only one active forward release per `channel + hardware_profile`
  - `addone-dual-ota-v1` partition-layout requirement
  - forward-only installs by default
  - explicit previous-stable rollback only when the current confirmed release is marked `rolled_back`
  - no second OTA target while a different OTA is already in progress

#### `get_device_firmware_update_summary(...)`
Called by:
- authenticated device owner app

Payload:
- `device_id`
- optional current app `version`

Purpose:
- returns one owner-readable OTA summary row without exposing the device auth secret
- gives the app the current firmware version, current OTA state, any eligible user-facing release target, and whether the owner can intentionally request the update right now
- keeps rollout percentage or allowlist checks, version ordering, and active-release selection in the backend instead of recreating them in the app
- currently assumes the accepted beta OTA layout `addone-dual-ota-v1` for the owner-facing update surface because per-device partition layout is not yet projected into owner-readable device metadata

Return:
- current device firmware version plus firmware channel
- latest OTA state from `device_firmware_ota_statuses`
- optional available release summary:
  - `release_id`
  - `firmware_version`
  - `install_policy`
  - optional minimum app or confirmed firmware versions
- `availability_reason`
- `update_available`
- `can_request_update`

#### `report_device_ota_progress(...)`
Called by:
- device firmware

Payload:
- `hardware_uid`
- `device_auth_token`
- `release_id`
- `state`
- optional `failure_code`
- optional `failure_detail`
- current `firmware_version`

Purpose:
- records device OTA state transitions in `device_firmware_ota_events`
- projects the latest per-device state into `device_firmware_ota_statuses`
- distinguishes download, verify, staging, boot, and rollback failures
- gives the app and operator tooling one durable state model instead of ad hoc serial logs

Return:
- the updated `device_firmware_ota_statuses` row for that device, including:
  - `current_state`
  - `target_release_id`
  - `confirmed_release_id` once a release reports `succeeded`
  - `last_failure_code`
  - `last_failure_detail`
  - `ota_started_at`
  - `ota_completed_at`

#### `begin_firmware_update(...)`
Called by:
- authenticated device owner
- service-role operator tooling

Payload:
- `device_id`
- `release_id`
- optional `request_id`
- optional `request_source` in `user | operator | auto_rollout`

Purpose:
- creates one persisted install request in `device_firmware_update_requests`
- queues one `device_commands.kind = begin_firmware_update` command as the realtime or polling nudge
- records `requested` state in `device_firmware_ota_statuses` before the firmware client starts reporting progress
- keeps the command path separate from the authoritative HTTPS eligibility check

Return:
- `request_id`
- `command_id`
- `release_id`
- `request_status`
- `command_status`
- `requested_at`

#### Service-role rollout management
Called by:
- beta-only operator tooling with the service-role key

Purpose:
- keeps release activation, rollout targeting, and rollback transitions out of ad hoc table edits
- preserves the accepted immutable-release and previous-stable rollback rules in SQL
- leaves per-device install nudges on the existing `begin_firmware_update(...)` path

Operator-only functions:
- `operator_activate_firmware_release(release_id)`
  - activates one draft or paused release
  - archives the current active release for the same `channel + hardware_profile`
  - requires `previous_stable_release_id` on the target release to match the current active release
- `operator_set_firmware_release_rollout(release_id, rollout_mode, rollout_value, hardware_uids[])`
  - updates one release to `allowlist`, `all`, or `percentage`
  - replaces the stored allowlist when `rollout_mode = allowlist`
  - rejects archived or rolled-back releases
- `operator_rollback_firmware_release(release_id)`
  - marks the bad release `rolled_back`
  - re-activates that release's `previous_stable_release_id`, even if the previous stable row was archived
  - rejects rollback when the release does not declare a valid previous stable target

## Command Semantics
- Device commands are at-least-once, not exactly-once.
- `request_key` is used on the cloud side to avoid duplicate queueing.
- `set_day_state` and `apply_history_draft` carry `base_revision` so the device can reject stale requests.
- `enter_wifi_recovery` is a deliberate owner-triggered command that tells the device to stop normal cloud control and start its temporary `AddOne-XXXX` AP without clearing ownership, history, or settings.
- `begin_firmware_update` now exists as a normal cloud command, but the command is only an install trigger; the device must still re-check release eligibility over authenticated HTTPS before downloading or rebooting into a staged image
- operator rollout state changes should go through the service-role rollout functions above instead of direct `firmware_releases` or `firmware_release_rollout_allowlist` edits
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
  - periodically call `check_device_firmware_release(...)` so the device can discover `available` or `auto_apply` releases even without a queued command
  - fetch or refresh MQTT transport credentials through authenticated HTTPS if none are stored locally
  - process realtime commands immediately when online
  - periodically pull commands only as fallback / backlog recovery
  - ack command results
  - upload runtime snapshots after accepted runtime changes and after reconnect
  - treat `begin_firmware_update` as a nudge only, then re-check the target over authenticated HTTPS before download or reboot
  - persist the confirmed firmware `release_id` locally after a healthy OTA boot so later release checks and explicit rollback targeting stay aligned with the control plane
  - report OTA progress through `report_device_ota_progress(...)` for `available`, `requested`, `downloading`, `downloaded`, `verifying`, `staged`, `rebooting`, `pending_confirm`, `succeeded`, and terminal rollback or failure states when the network path is available

## Current Implementation Status
- App-side onboarding sessions are implemented.
- Backend claim-session and device sync RPCs are implemented in staging schema.
- The app-side AP payload builder and local endpoint contract are now implemented.
- The app now probes the local AP and can POST the provisioning payload to firmware.
- Firmware v2 now exposes the AP HTTP provisioning endpoints and can persist the local handoff payload.
- Firmware v2 now has claim-redemption, heartbeat, command pull/ack, and runtime snapshot upload plumbing against the cloud RPC surface.
- Firmware v2 now has the first real AddOne product behavior layer on top of that transport: button input, 21-week board state, time service, and board rendering.
- Firmware v2 now also applies `apply_device_settings` commands for the AddOne v1 settings subset and uses ambient brightness at render time.
- Firmware v2 now has a real OTA client path on top of the accepted `T-038` plus `T-039` contracts:
  - periodic `check_device_firmware_release(...)` discovery
  - `begin_firmware_update` command nudges that re-check the control plane before install
  - inactive-slot application-image staging over CA-validated HTTPS
  - local boot confirmation with the locked `120` second pending-confirm window
  - automatic rollback reporting when a provisional image fails to confirm
- A dedicated realtime transport contract now exists for MQTT-based online command delivery, with fallback polling retained for reliability.
- The gateway now handles MQTT command publish plus MQTT ack, presence, day-event, and runtime-snapshot forwarding back into the existing Supabase RPC surface.
- Runtime devices no longer rely on `register_factory_device(...)` as an auth-failure self-heal path; factory registration stays service-role only.
- Runtime snapshots should now use the same realtime lane whenever possible:
  - `device -> MQTT -> gateway -> upload_device_runtime_snapshot(...)`
  - direct device -> Supabase HTTP snapshot upload is fallback only
- `device_runtime_snapshots` must be in the `supabase_realtime` publication or the app can miss live device-confirmed state and fall back to polling.
- The backend OTA control plane now exists:
  - release registry tables are in Supabase
  - `check_device_firmware_release(...)` is the HTTPS eligibility path
  - `report_device_ota_progress(...)` is the durable OTA progress path
  - `begin_firmware_update(...)` plus `device_commands.kind = begin_firmware_update` is the trigger path
- The remaining firmware gap is custom reward asset sync and end-to-end hardware validation.
- Developer testing helpers still exist for manual staging checks, but firmware now owns the intended claim / heartbeat / snapshot runtime path.
