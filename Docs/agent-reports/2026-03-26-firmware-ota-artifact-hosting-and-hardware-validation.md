Stage
S4: Beta Hardening And Durable Release Memory

Status
Partially unblocked on `codex/s4-firmware-ota-validation`. The hosted beta backend now exposes the accepted `T-039` OTA schema and the real release registry rows exist remotely, so `T-041` is no longer blocked on backend drift. The same bench device `AO_B0CBD8CFABB0` now reaches the real OTA control plane, receives an `install_ready` decision, and writes backend-visible request and status rows. The slice is still blocked before completion because the current running `2.0.0-beta.1` firmware crashes with a stack canary in `addone_sync` during the OTA install path, before staged download progresses to `downloading`, provisional boot, local confirmation, or backend-visible `succeeded`.

Changes made
- Added the previous-stable release manifest that now matches the remote archived release row:
  - [firmware/releases/fw-beta-20260326-01.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/releases/fw-beta-20260326-01.json)
- Updated the beta runbook to record that the hosted OTA schema is now live and that bench OTA is now blocked by a device-side stack canary instead:
  - [Docs/AddOne_Beta_Environment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Beta_Environment.md)
- Refreshed this worker report to capture the remote migration, real release rows, resumed hardware path, and the new runtime blocker:
  - [Docs/agent-reports/2026-03-26-firmware-ota-artifact-hosting-and-hardware-validation.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-26-firmware-ota-artifact-hosting-and-hardware-validation.md)

Commands run
- `npx supabase migration list --linked`
- `npx supabase db push --linked --include-all --yes`
- `npx supabase migration list --linked`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s "$SUPABASE_URL/rest/v1/devices?select=id,hardware_uid,firmware_channel,firmware_version,last_seen_at&hardware_uid=eq.AO_B0CBD8CFABB0" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Accept-Profile: public"`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s "$SUPABASE_URL/rest/v1/firmware_releases?select=release_id,status,firmware_version,previous_stable_release_id,artifact_url&limit=5" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Accept-Profile: public"`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/check_device_firmware_release" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Content-Type: application/json" -H "Accept-Profile: public" -d '{"p_hardware_uid":"AO_B0CBD8CFABB0","p_device_auth_token":"invalid-token","p_current_firmware_version":"2.0.0-beta.1","p_current_partition_layout":"ota_v1"}'`
- `pio run -e addone-esp32dev-beta`
- `shasum -a 256 firmware/.pio/build/addone-esp32dev-beta/firmware.bin`
- `stat -f '%z bytes' firmware/.pio/build/addone-esp32dev-beta/firmware.bin`
- `curl -I "https://sqhzaayqacmgxseiqihs.supabase.co/storage/v1/object/public/firmware-artifacts/ota/fw-beta-20260326-01/firmware-ce6cd2a54dc0038a.bin"`
- `curl -I "https://sqhzaayqacmgxseiqihs.supabase.co/storage/v1/object/public/firmware-artifacts/ota/fw-beta-20260326-02/firmware-42e687ee3dae9497.bin"`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s -X POST "$SUPABASE_URL/rest/v1/firmware_releases" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Content-Type: application/json" -H "Prefer: return=representation,resolution=merge-duplicates" -d '[{"release_id":"fw-beta-20260326-01","firmware_version":"2.0.0-beta.1","hardware_profile":"addone-v1","partition_layout":"addone-dual-ota-v1","channel":"beta","status":"archived","install_policy":"user_triggered","artifact_url":"https://sqhzaayqacmgxseiqihs.supabase.co/storage/v1/object/public/firmware-artifacts/ota/fw-beta-20260326-01/firmware-ce6cd2a54dc0038a.bin","artifact_sha256":"ce6cd2a54dc0038a1c08e8f053c17d763c332d3743215a242a75a39732f1ffbf","artifact_size_bytes":1134144,"rollout_mode":"allowlist","minimum_partition_layout":"addone-dual-ota-v1","minimum_confirmed_firmware_version":null,"minimum_app_version":null,"previous_stable_release_id":null,"allow_downgrade_to_previous_stable":true,"confirm_window_seconds":120,"require_normal_runtime_state":true,"require_cloud_check_in":false,"notes":"Prior stable beta.1 artifact for OTA validation rollback baseline."}]'`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s -X POST "$SUPABASE_URL/rest/v1/firmware_releases" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Content-Type: application/json" -H "Prefer: return=representation,resolution=merge-duplicates" -d '[{"release_id":"fw-beta-20260326-02","firmware_version":"2.0.0-beta.2","hardware_profile":"addone-v1","partition_layout":"addone-dual-ota-v1","channel":"beta","status":"active","install_policy":"user_triggered","artifact_url":"https://sqhzaayqacmgxseiqihs.supabase.co/storage/v1/object/public/firmware-artifacts/ota/fw-beta-20260326-02/firmware-42e687ee3dae9497.bin","artifact_sha256":"42e687ee3dae9497bf12a69410fa8432ce7a2b2a387a668205fb5a9038c9387b","artifact_size_bytes":1134144,"rollout_mode":"allowlist","minimum_partition_layout":"addone-dual-ota-v1","minimum_confirmed_firmware_version":"2.0.0-beta.1","minimum_app_version":null,"previous_stable_release_id":"fw-beta-20260326-01","allow_downgrade_to_previous_stable":true,"confirm_window_seconds":120,"require_normal_runtime_state":true,"require_cloud_check_in":false,"notes":"First real hosted beta OTA validation release."}]'`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s -X POST "$SUPABASE_URL/rest/v1/firmware_release_rollout_allowlist" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Content-Type: application/json" -H "Prefer: return=representation,resolution=merge-duplicates" -d '[{"release_id":"fw-beta-20260326-02","hardware_uid":"AO_B0CBD8CFABB0"}]'`
- `pio device monitor -p /dev/cu.usbserial-10 -b 115200`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/begin_firmware_update" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Content-Type: application/json" -H "Accept-Profile: public" -d '{"p_device_id":"21a6fae3-a304-45c0-bbbd-e6886a290012","p_release_id":"fw-beta-20260326-02","p_request_source":"operator"}'`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s "$SUPABASE_URL/rest/v1/device_firmware_update_requests?select=*&device_id=eq.21a6fae3-a304-45c0-bbbd-e6886a290012&order=requested_at.desc&limit=3" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Accept-Profile: public"`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s "$SUPABASE_URL/rest/v1/device_firmware_ota_statuses?select=*&device_id=eq.21a6fae3-a304-45c0-bbbd-e6886a290012" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Accept-Profile: public"`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s "$SUPABASE_URL/rest/v1/device_firmware_ota_events?select=*&device_id=eq.21a6fae3-a304-45c0-bbbd-e6886a290012&order=created_at.desc&limit=10" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Accept-Profile: public"`
- `~/.platformio/packages/toolchain-xtensa-esp32/bin/xtensa-esp32-elf-addr2line -pfiaC -e firmware/.pio/build/addone-esp32dev-beta/firmware.elf ...`

Evidence
- Exact files changed on this branch:
  - [firmware/releases/fw-beta-20260326-01.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/releases/fw-beta-20260326-01.json)
  - [Docs/AddOne_Beta_Environment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Beta_Environment.md)
  - [Docs/agent-reports/2026-03-26-firmware-ota-artifact-hosting-and-hardware-validation.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-26-firmware-ota-artifact-hosting-and-hardware-validation.md)
- Proof that the hosted OTA migration is applied:
  - `npx supabase migration list --linked` now shows `20260326153000 | 20260326153000` for local and remote
  - the previously missing remote objects now resolve through the hosted schema:
    - `GET /rest/v1/devices?...select=firmware_channel...` returns `firmware_channel = "beta"` for `AO_B0CBD8CFABB0`
    - `GET /rest/v1/firmware_releases?...` returns real rows for `fw-beta-20260326-01` and `fw-beta-20260326-02`
    - `POST /rest/v1/rpc/check_device_firmware_release` now resolves the RPC and returns `P0001 Device authentication failed.` for an invalid token instead of `404/PGRST202`
- Firmware build proof for the released beta.2 artifact:
  - `pio run -e addone-esp32dev-beta` succeeded with [config.h](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/include/config.h) still at `2.0.0-beta.2`
  - built artifact path: `firmware/.pio/build/addone-esp32dev-beta/firmware.bin`
  - SHA-256: `42e687ee3dae9497bf12a69410fa8432ce7a2b2a387a668205fb5a9038c9387b`
  - size: `1,134,144` bytes
- Exact hosted artifact and release references now live remotely:
  - archived previous-stable artifact: `https://sqhzaayqacmgxseiqihs.supabase.co/storage/v1/object/public/firmware-artifacts/ota/fw-beta-20260326-01/firmware-ce6cd2a54dc0038a.bin`
  - active target artifact: `https://sqhzaayqacmgxseiqihs.supabase.co/storage/v1/object/public/firmware-artifacts/ota/fw-beta-20260326-02/firmware-42e687ee3dae9497.bin`
  - both URLs return `HTTP/2 200` and `content-length: 1134144`
  - remote `firmware_releases` rows now exist for:
    - `fw-beta-20260326-01` with `status = archived`, `firmware_version = 2.0.0-beta.1`
    - `fw-beta-20260326-02` with `status = active`, `firmware_version = 2.0.0-beta.2`, `previous_stable_release_id = fw-beta-20260326-01`
  - the allowlist entry was inserted for `release_id = fw-beta-20260326-02` and `hardware_uid = AO_B0CBD8CFABB0`, and the device’s release-check response included that allowlist in the returned envelope
- Real hardware proof on `AO_B0CBD8CFABB0` after the hosted fix:
  - hosted beta still sees the device live with `devices.id = 21a6fae3-a304-45c0-bbbd-e6886a290012`, `firmware_channel = beta`, `firmware_version = 2.0.0-beta.1`, and `last_seen_at = 2026-03-27T07:03:48.468846+00:00`
  - `begin_firmware_update(...)` returned a real install request and command:
    - `request_id = 7318fdee-a17b-43b2-8d5e-26ae1f2fbeb7`
    - `command_id = 9a5637ec-0835-4172-9790-145502b1ff3a`
    - `request_status = requested`
    - `command_status = queued`
  - serial output on `/dev/cu.usbserial-10` then showed:
    - `MQTT command queued: 9a5637ec-0835-4172-9790-145502b1ff3a (begin_firmware_update)`
    - `Queued OTA eligibility re-check for fw-beta-20260326-02`
    - `Cloud RPC check_device_firmware_release -> HTTP 200`
    - returned decision `install_ready` with the full `fw-beta-20260326-02` release envelope, artifact URL/SHA/size, rollback `previous_stable_release_id = fw-beta-20260326-01`, and allowlist containing `AO_B0CBD8CFABB0`
    - `Cloud RPC report_device_ota_progress -> HTTP 200`
  - the hosted backend now contains the real OTA control-plane rows created by that run:
    - `device_firmware_update_requests` contains `7318fdee-a17b-43b2-8d5e-26ae1f2fbeb7` for `fw-beta-20260326-02`
    - `device_firmware_ota_statuses` shows `current_state = requested`, `target_release_id = fw-beta-20260326-02`, `install_request_id = 7318fdee-a17b-43b2-8d5e-26ae1f2fbeb7`, and `ota_started_at = 2026-03-27T07:00:34.392662+00:00`
    - `device_firmware_ota_events` now contains repeated backend-visible `requested` events for `fw-beta-20260326-02`
- Real remaining blocker discovered during resumed hardware validation:
  - the device crashes before the OTA path advances beyond backend-visible `requested`
  - serial output shows `Guru Meditation Error: Core 0 panic'ed (Unhandled debug exception)` with `Stack canary watchpoint triggered (addone_sync)`
  - `xtensa-esp32-elf-addr2line` resolves the failing stack through:
    - [firmware/src/cloud_client.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/cloud_client.cpp)
    - [firmware/src/ota_client.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/ota_client.cpp)
    - [firmware/src/firmware_app.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/firmware_app.cpp)
  - the crash occurs while the current running `2.0.0-beta.1` firmware is still on the bench device, so the OTA path does not yet prove `downloading`, inactive-slot write, provisional boot, local confirmation, or backend-visible `succeeded`
- What remains before app update surfaces or operator tooling:
  - the hosted backend drift is cleared, but the current running firmware must survive the OTA staging path on hardware
  - only after the device reaches `downloading`, boots the staged image, confirms locally, and reports `succeeded` should app update surfaces or operator tooling build on top of this path

Open risks / blockers
- The hosted OTA schema is now correct, but the bench device’s current running `2.0.0-beta.1` runtime still crashes in `addone_sync` during the OTA path, so `T-041` remains incomplete.
- Because the crash is in the currently running image rather than the target hosted artifact, finishing the full OTA proof now requires a new bench baseline that contains the runtime fix before the same validation loop is rerun.
- The remote OTA tables currently show only repeated `requested` progress, not `downloading`, `downloaded`, `staged`, `pending_confirm`, or `succeeded`.
- App update surfaces and rollout tooling remain out of scope until the bench device proves the full accepted OTA state progression on hardware.

Recommendation
Treat `codex/s4-firmware-ota-validation` as the correct resume checkpoint for `T-041`, but not an accepted completion yet. The hosted backend unblock is done and durable on this branch. The next narrow slice should fix the `addone_sync` OTA crash in the current running firmware baseline, re-establish the bench device on that corrected baseline, and rerun this same hardware loop against the already live hosted schema and release rows. Do not widen into app update UI or rollout console work until the hardware path proves staged download, provisional boot, local confirmation, and backend-visible `succeeded`.
