Stage
S4: Beta Hardening And Durable Release Memory

Status
Implemented on `codex/s4-firmware-ota-client` from the accepted `codex/s4-firmware-ota-control-plane` baseline. The firmware now has one concrete OTA client path that can discover release eligibility over HTTPS, consume `begin_firmware_update` as a nudge, stage an application image into the inactive slot, boot into a provisional image, confirm after the locked local health window, and report rollback when that confirmation path fails.

Changes made
- Added the firmware OTA client module:
  - [firmware/src/ota_client.h](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/ota_client.h)
  - [firmware/src/ota_client.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/ota_client.cpp)
- Extended the authenticated HTTPS cloud client so firmware can parse the accepted OTA control-plane contract and report device OTA state transitions:
  - [firmware/src/cloud_client.h](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/cloud_client.h)
  - [firmware/src/cloud_client.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/cloud_client.cpp)
- Wired the OTA client into the real firmware command and background-sync flow:
  - [firmware/src/firmware_app.h](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/firmware_app.h)
  - [firmware/src/firmware_app.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/firmware_app.cpp)
  - [firmware/src/realtime_client.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/realtime_client.cpp)
- Updated the scoped firmware and cloud docs so they describe the implemented client path instead of only the planning seam:
  - [Docs/AddOne_Device_Cloud_Contract.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_Cloud_Contract.md)
  - [Docs/AddOne_Firmware_V2_Architecture.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Firmware_V2_Architecture.md)
  - [firmware/README.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/README.md)
- Added this worker report:
  - [Docs/agent-reports/2026-03-26-firmware-ota-client-and-device-flow.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-26-firmware-ota-client-and-device-flow.md)

Commands run
- `git status --short --branch`
- `git branch --list 'codex/s4-firmware-ota-control-plane' 'codex/s4-firmware-ota-client'`
- `git switch -c codex/s4-firmware-ota-client`
- `sed -n '1,220p' /Users/viktor/.codex/skills/stage-coordinator/SKILL.md`
- `sed -n '1,220p' Docs/tasks/T-040-firmware-ota-client-and-device-flow.md Docs/tasks/T-039-firmware-ota-control-plane-and-release-registry.md Docs/tasks/T-038-firmware-ota-safety-model-and-release-contract.md Docs/tasks/T-029-app-and-firmware-update-strategy.md`
- `sed -n '1,240p' Docs/AddOne_Device_Cloud_Contract.md firmware/OTA_SAFETY_CONTRACT.md`
- `sed -n '1,220p' Docs/project-memory.md Docs/agent-coordination.md Docs/stages/stage-register.md Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md Docs/git-operations.md`
- `rg -n "OTA|ota|Update|update|esp_ota|partition|begin_firmware_update|report_device_ota_progress|check_device_firmware_release" firmware`
- `sed -n '1,420p' firmware/src/cloud_client.cpp`
- `sed -n '1080,1500p' firmware/src/firmware_app.cpp`
- `sed -n '760,1138p' supabase/migrations/20260326153000_add_firmware_ota_control_plane.sql`
- `sed -n '1132,1388p' supabase/migrations/20260326153000_add_firmware_ota_control_plane.sql`
- `rg -n "esp_ota_mark_app_valid_cancel_rollback|esp_ota_mark_app_invalid_rollback_and_reboot|esp_ota_get_state_partition|esp_ota_begin|esp_ota_write|esp_ota_end|esp_ota_set_boot_partition" ~/.platformio/packages/framework-arduinoespressif32 -g '*.*'`
- `rg -n "CONFIG_APP_ROLLBACK_ENABLE|CONFIG_BOOTLOADER_APP_ROLLBACK_ENABLE" ~/.platformio/packages/framework-arduinoespressif32 -g 'sdkconfig*'`
- `pio run -e addone-esp32dev-beta`
- `git diff --check`
- `git diff --stat`

Evidence
- Exact firmware OTA client references now exist in:
  - [firmware/src/ota_client.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/ota_client.cpp): `verifyRollbackLater()` override plus the OTA state machine for download, stage, provisional boot, local confirmation, and rollback reporting.
  - [firmware/src/cloud_client.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/cloud_client.cpp): typed `checkFirmwareRelease(...)` and `reportOtaProgress(...)` parsing against the accepted HTTPS OTA RPCs.
  - [firmware/src/firmware_app.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/firmware_app.cpp): `begin_firmware_update` command handling and `otaClient_.service(...)` integration in the real background sync loop.
  - [firmware/src/realtime_client.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/realtime_client.cpp): realtime dedupe support for repeated `begin_firmware_update` nudges.
- Exact contract references the implemented client now follows:
  - [firmware/OTA_SAFETY_CONTRACT.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/OTA_SAFETY_CONTRACT.md): locked scope, `addone-dual-ota-v1` partition rule, `120` second confirmation window, and mandatory rollback semantics.
  - [Docs/AddOne_Device_Cloud_Contract.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_Cloud_Contract.md): accepted device-side RPC contract for `check_device_firmware_release(...)`, `report_device_ota_progress(...)`, and `begin_firmware_update(...)`.
  - [supabase/migrations/20260326153000_add_firmware_ota_control_plane.sql](/Users/viktor/Desktop/DevProjects/Codex/AddOne/supabase/migrations/20260326153000_add_firmware_ota_control_plane.sql): accepted backend control-plane enforcement and OTA event/status projection.
- Concrete OTA flow now implemented on this branch:
  - discover: firmware periodically calls `check_device_firmware_release(...)` and reports `available` or `blocked` decisions when the control plane returns a target release
  - authorize: queued `begin_firmware_update` commands trigger an immediate HTTPS re-check instead of trusting MQTT alone
  - stage: the client downloads the artifact over CA-validated HTTPS, verifies SHA-256 plus the locked envelope constraints, writes only the inactive OTA partition, and switches boot to that slot
  - boot: the old image reports `rebooting` before restart and the new image reports `pending_confirm` while still provisional
  - confirm: the new image stays provisional until the local health gate survives the full `120` second window, then calls `esp_ota_mark_app_valid_cancel_rollback()` and persists the confirmed release id
  - rollback: if the provisional image never confirms, the firmware calls `esp_ota_mark_app_invalid_rollback_and_reboot()` when it can detect the failure locally, and the last confirmed image reports `rolled_back` after boot returns to the previous slot
- Firmware build proof:
  - `pio run -e addone-esp32dev-beta` completed successfully on this branch after the OTA client changes.
  - Resulting size from that build:
    - flash used: `1,127,569 / 1,310,720` bytes (`86.0%`)
    - remaining OTA slot headroom: `183,151` bytes
  - `git diff --check` passed after the implementation and doc updates.
- Real hardware exercise note:
  - Exercised on real hardware in this slice: none.
  - Not exercised on real hardware in this slice: live `check_device_firmware_release(...)` against the hosted backend, artifact download from a real HTTPS release URL, inactive-slot stage on a bench device, provisional boot into the new slot, on-device confirmation after `120` seconds, automatic rollback on non-confirmation, and backend-visible OTA event/status verification.
- What the next slice can now assume:
  - firmware already exposes one real OTA client path on-device instead of only a contract stub
  - app or operator work can treat `begin_firmware_update` as a nudge into an already-implemented firmware flow, not as a future firmware placeholder
  - device-side confirmed-release persistence now exists, so later rollout and rollback work can rely on a real `current_confirmed_release_id`
  - progress and terminal state writes should go through `report_device_ota_progress(...)`; app or operator slices do not need to invent a second OTA status sink

Open risks / blockers
- No real-device OTA path was exercised in this slice, so the branch only proves compile-time integration, not hosted beta or bench-device runtime behavior.
- The current implementation uses the firmware’s pinned HTTPS CA bundle for artifact download as well as the Supabase RPC path. If the eventual firmware artifact host chains to a different CA root, the ignored beta firmware config will need the matching trust material before real OTA validation.
- The OTA slot still has only `183,151` bytes of flash headroom after this client landed. Later firmware growth can still force size reduction before broader OTA rollout.
- The rollback and confirmation path depends on the ESP32 rollback-enabled framework baseline that this branch builds against. That behavior is compile-time proven through the framework headers, but not yet bench-verified on a real device with a real staged image.

Recommendation
Treat `codex/s4-firmware-ota-client` as the narrow firmware OTA client baseline for `T-040`. The next slice should stay focused on real beta validation and minimal app/operator surfaces: load a real release row, host a real immutable firmware artifact, exercise the staged OTA path on hardware, and only then add the smallest possible user-facing or operator-facing controls on top of this now-real firmware path.
