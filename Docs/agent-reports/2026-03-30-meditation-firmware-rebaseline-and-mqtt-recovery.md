Stage
S4: Beta Hardening And Durable Release Memory

Status
Recovered `AO_A4F00F767008` (`Meditation`) to the accepted baseline.

Recovery used both:
- wired reflash to restore an OTA-capable `2.0.0-beta.1` base
- OTA to the accepted active release `fw-beta-20260327-05` / firmware `2.0.0-beta.3`

Final state:
- firmware: `2.0.0-beta.3`
- OTA status: `succeeded`
- MQTT: healthy again
- control path: verified live
- cohort status: recovered, but intentionally kept outside the active ship cohort

Changes made
- No persistent repo changes were required for the board recovery itself.
- A temporary local-only recovery edit in `firmware_app.cpp` was used to build a one-off USB recovery image that cleared Meditation’s persisted MQTT transport creds, then reverted.
- Final git state for source files is clean; only the pre-existing untracked local `.npm-cache/` remained outside repo state.

Commands run
- `git fetch origin codex/s4-mqtt-broker-sync-automation`
- `git switch -C codex/s4-meditation-firmware-rebaseline origin/codex/s4-mqtt-broker-sync-automation`
- `git status --short --branch`
- `pio run -e addone-esp32dev-beta`
- `strings .pio/build/addone-esp32dev-beta/firmware.bin | rg -n "2\\.0\\.0-beta\\.[13]"`
- `pio device monitor -p /dev/cu.usbserial-210 -b 115200`
- `pio run -e addone-esp32dev-beta-ota-base`
- `pio run -e addone-esp32dev-beta-ota-base -t nobuild -t upload --upload-port /dev/cu.usbserial-210`
- `node services/firmware-rollout-operator/index.mjs inspect --release fw-beta-20260327-05 --env-file .codex-tmp/realtime-gateway.env --json`
- `node services/firmware-rollout-operator/index.mjs target --release fw-beta-20260327-05 --hardware-uids AO_A4F00F767008,AO_B0CBD8CFABB0 --env-file .codex-tmp/realtime-gateway.env --json`
- `node services/firmware-rollout-operator/index.mjs request --release fw-beta-20260327-05 --hardware-uids AO_A4F00F767008 --env-file .codex-tmp/realtime-gateway.env --json`
- `node services/firmware-rollout-operator/index.mjs target --release fw-beta-20260327-05 --hardware-uids AO_B0CBD8CFABB0 --env-file .codex-tmp/realtime-gateway.env --json`
- read-only `curl` queries against `devices`, `device_firmware_ota_statuses`, `device_firmware_update_requests`, `device_commands`, `device_mqtt_credentials`, and `firmware_release_rollout_allowlist`
- `curl -X POST .../rpc/queue_device_command` with `request_runtime_snapshot`

Evidence
- Hardware UID proof:
  - USB flash on `/dev/cu.usbserial-210` reported `MAC: a4:f0:0f:76:70:08`, matching `AO_A4F00F767008`
  - backend device row is `hardware_uid = AO_A4F00F767008`, `name = Meditation`
- Before firmware version:
  - `devices.firmware_version = 2.0.0-beta.1`
  - `device_firmware_ota_statuses.current_state = blocked`
  - `last_failure_detail = Unsupported command kind.`
  - live serial before recovery repeated `MQTT connect failed, state=5` while HTTP polling still worked
- MQTT stale-credential proof:
  - backend MQTT credentials had been reissued on `2026-03-28`
  - after the OTA-capable beta.1 flash, serial showed:
    - `Cloud RPC issue_device_mqtt_credentials -> HTTP 200`
    - `Provisioned device MQTT credentials for AO_A4F00F767008`
    - `MQTT connected, subscribed to addone/device/AO_A4F00F767008/command`
- OTA recovery proof:
  - request `a32c4cb6-0ea3-42d6-a612-1ea8dc028fe4`
  - command `58b9c94f-5bb3-4599-9d2e-2248d298e0f3`
  - delivered and applied at `2026-03-30T19:19:16.466978+00:00`
  - OTA events reached:
    - `requested`
    - `downloading`
    - `downloaded`
    - `verifying`
    - `staged`
    - `rebooting`
    - `pending_confirm`
    - `succeeded`
- After firmware version:
  - `devices.firmware_version = 2.0.0-beta.3`
  - `device_firmware_ota_statuses.confirmed_release_id = fw-beta-20260327-05`
  - `device_firmware_ota_statuses.current_state = succeeded`
- MQTT recovery proof after final OTA:
  - post-recovery command `b383ad89-8684-4b0b-88aa-a6d12cfa4ffd` delivered and applied in under a second
  - serial showed:
    - `MQTT command queued`
    - `Acked command ... as applied`
    - `Uploaded runtime snapshot revision 79`
- Cohort note:
  - rollout allowlist for `fw-beta-20260327-05` was restored to only `AO_B0CBD8CFABB0`
  - Meditation is recovered but intentionally remains outside the active ship cohort

Open risks / blockers
- No blocker remains for Meditation recovery itself.
- Residual reliability gap: firmware still has no normal field self-heal for stale persisted MQTT transport creds after backend credential rotation. This board needed a narrow USB intervention to clear cached creds before it could re-fetch the current broker secret.

Recommendation
- Keep Meditation out of the active ship cohort unless it is intentionally reintroduced later.
- If you want to close the residual reliability gap, add a small firmware self-heal that clears and re-fetches MQTT transport creds after broker auth failure (`state=5`) instead of requiring a USB recovery step.
