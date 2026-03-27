Stage
S4: Beta Hardening And Durable Release Memory

Status
Implemented on `codex/s4-firmware-ota-safety`. The repo now has one durable OTA safety contract for the first field firmware rollout, the OTA-capable dual-slot partition layout is explicit in tracked firmware build config instead of implied by the Arduino default, and the cloud, realtime, beta-environment, and firmware-architecture docs now point to the same release and rollback model. No OTA control plane or firmware client was implemented in this slice.

Changes made
- Added the durable firmware OTA source of truth:
  - [firmware/OTA_SAFETY_CONTRACT.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/OTA_SAFETY_CONTRACT.md)
  - [firmware/releases/ota-release.example.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/releases/ota-release.example.json)
- Added a tracked OTA-capable partition table and made the build use it explicitly:
  - [firmware/partitions/addone_ota.csv](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/partitions/addone_ota.csv)
  - [firmware/platformio.ini](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/platformio.ini)
  - [firmware/include/config.h](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/include/config.h)
- Updated scoped docs so the same safety contract is referenced from the firmware, cloud, realtime, and beta release surfaces:
  - [firmware/README.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/README.md)
  - [Docs/AddOne_Device_Cloud_Contract.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_Cloud_Contract.md)
  - [Docs/AddOne_Device_Realtime_Transport.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_Realtime_Transport.md)
  - [Docs/AddOne_Beta_Environment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Beta_Environment.md)
  - [Docs/AddOne_Firmware_V2_Architecture.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Firmware_V2_Architecture.md)

Commands run
- `git status --short --branch`
- `git switch -c codex/s4-firmware-ota-safety`
- `sed -n '1,220p' /Users/viktor/.codex/skills/stage-coordinator/SKILL.md`
- `sed -n '1,320p' Docs/AddOne_Device_Cloud_Contract.md`
- `sed -n '1,320p' Docs/AddOne_Device_Realtime_Transport.md`
- `sed -n '1,320p' Docs/AddOne_Firmware_V2_Architecture.md`
- `sed -n '1,280p' Docs/AddOne_Beta_Environment.md`
- `sed -n '1,260p' firmware/README.md`
- `sed -n '1,260p' firmware/platformio.ini`
- `sed -n '1,120p' ~/.platformio/packages/framework-arduinoespressif32/tools/partitions/default.csv`
- `pio run -e addone-esp32dev-beta -t envdump`
- `pio run -e addone-esp32dev-beta`

Evidence
- Exact OTA safety contract:
  - [firmware/OTA_SAFETY_CONTRACT.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/OTA_SAFETY_CONTRACT.md) now freezes:
    - field OTA scope as application-image only
    - `addone-dual-ota-v1` as the required partition layout
    - `120` second local boot-confirm window
    - mandatory automatic rollback for failed verify, failed stage, failed boot, or failed confirmation
    - `draft | active | paused | rolled_back | archived` release states
    - device OTA states and recommended failure codes
- Exact release-envelope contract:
  - [firmware/releases/ota-release.example.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/releases/ota-release.example.json) now gives the next control-plane slice a concrete manifest shape with:
    - immutable `release_id`
    - `hardware_profile`
    - `partition_layout`
    - rollout policy
    - immutable HTTPS artifact metadata
    - previous-stable rollback target
    - boot-confirmation rules
- Firmware build support proof:
  - [firmware/platformio.ini](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/platformio.ini) now explicitly points to the tracked [addone_ota.csv](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/partitions/addone_ota.csv) partition table instead of relying on the framework default.
  - `pio run -e addone-esp32dev-beta -t envdump` now reports `ARDUINO_PARTITION_addone_ota` and `PARTITIONS_TABLE_CSV = /Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/partitions/addone_ota.csv`.
  - `pio run -e addone-esp32dev-beta` completed successfully after the changes, proving the beta firmware still builds with the explicit OTA-capable layout and the locked OTA constants.
  - Current size proof from that build:
    - flash used: `1,104,781 / 1,310,720` bytes (`84.3%`)
    - remaining slot headroom: `205,939` bytes
- Exact contract references for the next slice:
  - HTTPS OTA RPC seam: [Docs/AddOne_Device_Cloud_Contract.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_Cloud_Contract.md)
  - MQTT trigger-only rule: [Docs/AddOne_Device_Realtime_Transport.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_Realtime_Transport.md)
  - beta rollout preconditions: [Docs/AddOne_Beta_Environment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Beta_Environment.md)
  - firmware architecture alignment: [Docs/AddOne_Firmware_V2_Architecture.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Firmware_V2_Architecture.md)
- What the next OTA slice can now assume:
  - all field OTA releases target only the inactive application slot
  - partition-layout or bootloader rewrites are out of scope for field OTA
  - release eligibility is decided on HTTPS, not on MQTT
  - default launch install policy is user-triggered, with optional internal auto-apply only for controlled cohorts
  - a good image confirms locally and does not require cloud reachability to stay installed
  - rollback always resolves to the previous stable release, not an arbitrary historical build

Open risks / blockers
- The repo now locks the safety model, but the OTA control plane and device client still need implementation. No real OTA download, staging, confirm, or rollback path was exercised in this task.
- Existing beta boards may still need an explicit USB reflash audit before OTA validation if any currently deployed hardware was flashed with a different partition layout than `addone-dual-ota-v1`.
- The current beta firmware already uses `84.3%` of the OTA slot. The next OTA client slice needs size discipline, or it will have to reduce binary size before adding more firmware features.
- The release envelope is now concrete, but the backend schema and RPC implementation still need to persist release state, rollout state, per-device OTA progress, and rollback targeting.
- OTA artifact hosting still depends on an immutable CA-validated HTTPS path that is not implemented in this task.

Recommendation
Treat this branch as the locked OTA safety baseline for `T-038`. The next slice can move directly to OTA control-plane implementation and should build exactly these seams: `check_device_firmware_release(...)`, `report_device_ota_progress(...)`, the `begin_firmware_update` trigger command, release-state enforcement, and previous-stable rollback targeting. Do not reopen partition-layout, boot-confirmation, or MQTT-vs-HTTPS authority decisions unless a real implementation finding disproves the contract now recorded in this branch.
