# AddOne Firmware OTA Safety Contract

Last locked: March 26, 2026

This document locks the minimum device-side OTA safety model and release contract for AddOne.

It exists so the next OTA slices can build the control plane and firmware client without reopening:
- which flash layout is required
- what a valid field OTA release is allowed to change
- when a booted image is considered healthy
- when rollback is automatic vs operator-driven
- which device and release states must exist

## Scope Boundary

This contract applies only to field OTA of the application firmware image on customer devices.

It does not authorize field OTA for:
- bootloader changes
- partition-table changes
- `boot_app0`
- filesystem migrations that require repartitioning

Those remain factory or USB release operations.

## Storage Baseline

The required OTA-capable layout is `addone-dual-ota-v1`, tracked in:
- [partitions/addone_ota.csv](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/partitions/addone_ota.csv)

That layout reserves:
- `otadata` for ESP32 OTA boot state
- `app0` as one application slot
- `app1` as the second application slot
- `spiffs` plus `coredump` unchanged from the current Arduino baseline

Concrete slot assumptions:
- partition layout id: `addone-dual-ota-v1`
- application slot size: `0x140000` bytes per slot
- field OTA artifact kind: `esp32-application-bin`
- field OTA writes only the inactive OTA application slot

Any device not flashed with `addone-dual-ota-v1` is `ota_ineligible`.
It must be serviced by factory or USB flashing before any field OTA rollout.

## Release Contract

Any release eligible for `active` rollout must define all of the following:
- `schema_version`
- `release_id`
- `firmware_version`
- `hardware_profile`
- `partition_layout`
- `channel`
- `status`
- `install_policy`
- `rollout`
- `artifact`
- `rollback`
- `boot_confirmation`

Required semantics:
- `release_id` is immutable. Do not mutate an existing release record into a different artifact.
- `status` is one of `draft`, `active`, `paused`, `rolled_back`, or `archived`.
- `hardware_profile` must match the running firmware hardware target exactly.
- `partition_layout` must equal `addone-dual-ota-v1` for field OTA.
- `artifact.url` must be immutable HTTPS.
- `artifact.sha256` and `artifact.size_bytes` are mandatory and must be verified on-device before staging.
- `rollback.previous_stable_release_id` is mandatory for every `active` release, even if the operator does not expect to use it.
- `boot_confirmation.confirm_window_seconds` is mandatory and defines the maximum provisional-boot window before the image must confirm or roll back.
- `boot_confirmation.require_normal_runtime_state` must remain `true`.
- `boot_confirmation.require_cloud_check_in` must remain `false`.
- the current forward-release baseline is a `45` second confirm window, while devices may accept any contract window from `30` to `120` seconds so controlled rollback installs remain possible.

An example release envelope is tracked in:
- [releases/ota-release.example.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/releases/ota-release.example.json)

## Device Eligibility Rules

A device may only treat a release as installable when all of the following are true:
- the device is already provisioned to an owner
- the device is not in factory QA mode
- the device is not in AP onboarding or manual Wi-Fi recovery
- the device is not already applying another OTA release
- the release status is `active`
- the release hardware profile matches the device hardware profile
- the device partition layout is `addone-dual-ota-v1`
- the release artifact fits inside one OTA slot
- the device is not already running the target `release_id`
- the release is currently eligible for the device’s channel and rollout cohort
- if `install_policy` is `user_triggered`, the device has received an explicit install request for the same `release_id`

Normal forward updates must reject same-version or older-version installs.
The only allowed downgrade path is an explicit operator rollback to the declared `previous_stable_release_id`.

## Apply Flow

The field OTA flow is frozen as:
1. Device receives update availability or an install request.
2. Device calls `check_device_firmware_release(...)` over authenticated HTTPS.
3. Device proceeds only if the returned release is still `active`, still eligible, and still matches the requested `release_id`.
4. Device downloads the artifact over CA-validated HTTPS.
5. Device verifies:
   - `hardware_profile`
   - `partition_layout`
   - `artifact.size_bytes`
   - `artifact.sha256`
   - forward-update or explicit-rollback eligibility
6. Device writes the artifact to the inactive OTA slot only.
7. Device reports `pending_confirm` and reboots into the provisional image.
8. New firmware confirms the boot only after the post-boot health gate passes.

MQTT may be used to nudge or request an install, but MQTT is never the source of truth for release eligibility.
Every real install decision must go back through authenticated HTTPS before download and before final commit.

## Boot Confirmation Gate

The new image must remain provisional until all of the following succeed:
- device identity and persisted auth state load successfully from NVS
- persisted runtime state and device settings load successfully
- a previously provisioned device does not fall back into `SetupRecovery`
- the main firmware state resolves to either `Tracking` or `TimeInvalid`
- the main loop remains alive without panic, watchdog reset, or reboot for the confirmation window

Frozen launch values:
- confirmation window: `45` seconds
- cloud check-in is best effort only and must not be required for confirmation

The confirm window is local-first because AddOne runtime is offline-first.
Loss of Wi-Fi after download must not force a healthy image to roll back.

On success, firmware must call `esp_ota_mark_app_valid_cancel_rollback()` and persist the confirmed release metadata.

On failure before confirmation, firmware must:
- report the failure if any network path is available
- avoid marking the provisional image valid
- call `esp_ota_mark_app_invalid_rollback_and_reboot()` when available, or otherwise reboot unconfirmed so the ESP32 bootloader returns to the last confirmed slot

## Pause And Rollback Semantics

`paused` means:
- new checks stop returning the release as installable immediately
- devices that already learned about the release must re-check before final staging or reboot
- if the release is no longer eligible on re-check, the device discards the staged artifact and reports a blocked or aborted state

`rolled_back` means:
- the bad release never becomes installable again
- future checks must target `previous_stable_release_id` or a newer replacement release instead
- devices already running the bad but bootable release require an explicit downgrade release path; they are not healed by pause alone

## Device OTA State Contract

The next OTA slices should use these device states:
- `available`
- `blocked`
- `requested`
- `downloading`
- `downloaded`
- `verifying`
- `staged`
- `rebooting`
- `pending_confirm`
- `succeeded`
- `failed_download`
- `failed_verify`
- `failed_stage`
- `failed_boot`
- `rolled_back`
- `recovery_needed`

Recommended blocking or failure codes:
- `not_ota_capable`
- `release_paused`
- `release_rolled_back`
- `hardware_profile_mismatch`
- `partition_layout_mismatch`
- `version_not_allowed`
- `sha256_mismatch`
- `artifact_too_large`
- `slot_write_failed`
- `health_gate_failed`
- `boot_not_confirmed`
- `operator_rollback`

## Frozen Assumptions For The Next OTA Slice

The next OTA control-plane and firmware-client work can assume:
- AddOne field OTA targets only the application image, not the bootloader or partition table
- `addone-dual-ota-v1` is the required field-OTA partition layout
- release eligibility is decided over authenticated HTTPS, not MQTT
- user-triggered install is the default launch policy, with optional internal auto-apply only for controlled validation cohorts
- the device confirms locally after a healthy boot window and does not require cloud reachability to mark a good image valid
- automatic rollback is mandatory for failed verification, failed staging, failed boot, or failed confirmation
- operator rollback always points to the prior stable release, not an arbitrary historical build
