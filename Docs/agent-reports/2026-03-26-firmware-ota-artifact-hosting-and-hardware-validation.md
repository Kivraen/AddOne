Stage
S4: Beta Hardening And Durable Release Memory

Status
Still not accepted, but the original blinking OTA crash loop is fixed on `codex/s4-firmware-ota-validation`. The hosted beta backend now exposes the accepted `T-039` OTA schema, the old crashing beta.2 release is rolled back remotely, and a new fixed beta.3 release is active. On real hardware, `AO_B0CBD8CFABB0` now advances through `requested`, `downloading`, `downloaded`, `verifying`, `staged`, `rebooting`, and boots the staged `2.0.0-beta.3` image. The remaining blocker is narrower: bench validation still rolls back during provisional boot when a normal serial monitor is attached, and failed-download retries can leave the backend temporarily stale when the failure RPC itself drops with `HTTP -1`. The device is currently stable again on `2.0.0-beta.1` with OTA state `available`, not stuck in the previous 5-15 second crash/retry loop.

Changes made
- Increased the `addone_sync` task stack so nested HTTPS/TLS OTA work no longer blows the stack canary:
  - [firmware/src/firmware_app.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/firmware_app.cpp)
- Bumped the tracked OTA candidate source version to the fixed beta.3 release:
  - [firmware/include/config.h](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/include/config.h)
- Added the previous-stable release manifest that matches the remote archived release row:
  - [firmware/releases/fw-beta-20260326-01.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/releases/fw-beta-20260326-01.json)
- Added the fixed beta.3 release manifest that matches the new active hosted release row:
  - [firmware/releases/fw-beta-20260327-03.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/releases/fw-beta-20260327-03.json)
- Updated the beta runbook to record that the stack-canary crash is fixed, beta.2 is rolled back, and provisional-boot validation should avoid reset-toggling serial monitors:
  - [Docs/AddOne_Beta_Environment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Beta_Environment.md)
- Refreshed this worker report to capture the fixed release, the live bench results, and the remaining confirmation blocker:
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
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s -X PATCH "$SUPABASE_URL/rest/v1/device_firmware_update_requests?id=eq.7318fdee-a17b-43b2-8d5e-26ae1f2fbeb7" ...`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s -X PATCH "$SUPABASE_URL/rest/v1/device_firmware_ota_statuses?device_id=eq.21a6fae3-a304-45c0-bbbd-e6886a290012" ...`
- `curl -I "https://sqhzaayqacmgxseiqihs.supabase.co/storage/v1/object/public/firmware-artifacts/ota/fw-beta-20260327-03/firmware-9b6857af3439fcfb.bin"`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s -X PATCH "$SUPABASE_URL/rest/v1/firmware_releases?release_id=eq.fw-beta-20260326-02" ...`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s -X POST "$SUPABASE_URL/rest/v1/firmware_releases" ... fw-beta-20260327-03 ...`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s -X POST "$SUPABASE_URL/rest/v1/firmware_release_rollout_allowlist" ... fw-beta-20260327-03 ...`
- `pio run -e addone-esp32dev-beta -t upload --upload-port /dev/cu.usbserial-10`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/begin_firmware_update" ... fw-beta-20260327-03 ...`

Evidence
- Exact files changed on this branch:
  - [firmware/src/firmware_app.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/firmware_app.cpp)
  - [firmware/include/config.h](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/include/config.h)
  - [firmware/releases/fw-beta-20260326-01.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/releases/fw-beta-20260326-01.json)
  - [firmware/releases/fw-beta-20260327-03.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/releases/fw-beta-20260327-03.json)
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
- Firmware build proof for the fixed beta.3 artifact:
  - `pio run -e addone-esp32dev-beta` succeeded again after restoring [config.h](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/include/config.h) to `2.0.0-beta.3`
  - built artifact path: `firmware/.pio/build/addone-esp32dev-beta/firmware.bin`
  - SHA-256: `9b6857af3439fcfbd2a1fa2c703ad001838401315c79d649b44cd647c8a93d50`
  - size: `1,134,144` bytes
- Exact hosted artifact and release references now live remotely:
  - archived previous-stable artifact: `https://sqhzaayqacmgxseiqihs.supabase.co/storage/v1/object/public/firmware-artifacts/ota/fw-beta-20260326-01/firmware-ce6cd2a54dc0038a.bin`
  - rolled-back beta.2 artifact: `https://sqhzaayqacmgxseiqihs.supabase.co/storage/v1/object/public/firmware-artifacts/ota/fw-beta-20260326-02/firmware-42e687ee3dae9497.bin`
  - current active beta.3 artifact: `https://sqhzaayqacmgxseiqihs.supabase.co/storage/v1/object/public/firmware-artifacts/ota/fw-beta-20260327-03/firmware-9b6857af3439fcfb.bin`
  - all hosted artifact URLs above return `HTTP/2 200` and `content-length: 1134144`
  - remote `firmware_releases` rows now exist for:
    - `fw-beta-20260326-01` with `status = archived`, `firmware_version = 2.0.0-beta.1`
    - `fw-beta-20260326-02` with `status = rolled_back`, `firmware_version = 2.0.0-beta.2`, `previous_stable_release_id = fw-beta-20260326-01`
    - `fw-beta-20260327-03` with `status = active`, `firmware_version = 2.0.0-beta.3`, `previous_stable_release_id = fw-beta-20260326-01`
  - allowlist entries exist for both validation releases and include `AO_B0CBD8CFABB0`
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
  - the hosted backend now contains the real OTA control-plane rows created by the first resume attempt:
    - `device_firmware_update_requests` contains `7318fdee-a17b-43b2-8d5e-26ae1f2fbeb7` for `fw-beta-20260326-02`
    - `device_firmware_ota_statuses` shows `current_state = requested`, `target_release_id = fw-beta-20260326-02`, `install_request_id = 7318fdee-a17b-43b2-8d5e-26ae1f2fbeb7`, and `ota_started_at = 2026-03-27T07:00:34.392662+00:00`
    - `device_firmware_ota_events` now contains repeated backend-visible `requested` events for `fw-beta-20260326-02`
- Fixed root cause for the original blinking loop:
  - serial monitoring on the old beta.2 request reproduced `Stack canary watchpoint triggered (addone_sync)`
  - `xtensa-esp32-elf-addr2line` resolves that crash through [cloud_client.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/cloud_client.cpp), [ota_client.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/ota_client.cpp), and [firmware_app.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/firmware_app.cpp)
  - after increasing the sync-task stack and cancelling the old active request, the device stopped the repeated `requested` crash loop and returned to a stable `available` state on `2.0.0-beta.1`
- Real hardware proof after the stack fix:
  - the fixed beta.3 request `a56a7476-e854-499e-892d-3d1c8300e62a` reached:
    - `requested`
    - `downloading`
    - `downloaded`
    - `verifying`
    - `staged`
    - `rebooting`
  - serial output then showed the device booting the staged image:
    - `AddOne firmware 2.0.0-beta.3`
    - `State -> Tracking`
  - the bench device then rolled back to beta.1 with backend-visible `rolled_back` / `boot_not_confirmed`
  - the device is currently stable again on beta.1, with latest OTA status `available` instead of a repeat `requested` loop
- Remaining blocker discovered during the fixed release rerun:
  - attaching a normal serial monitor during the provisional beta.3 boot reliably causes an extra `SW_CPU_RESET` before the 120-second local confirmation window completes
  - independent of that bench-monitor issue, failed-download retries can produce `Cloud RPC report_device_ota_progress -> HTTP -1`, which means the backend can temporarily stay at `downloading` until the device retries
- What remains before app update surfaces or operator tooling:
  - the hosted backend drift is cleared and the original crash loop is fixed, but the hardware path still needs one clean confirmation run to `pending_confirm` and `succeeded`
  - app update surfaces or operator tooling should wait until the bench workflow is validated without reset-toggling monitors during the confirmation phase

Open risks / blockers
- The original stack-canary failure is fixed, but `T-041` still lacks one clean `pending_confirm -> succeeded` pass on real hardware.
- The bench validation setup itself can currently invalidate provisional boots when a normal serial monitor reattaches and toggles reset lines.
- Failed-download retries can still leave the backend stale if the failure-progress RPC also drops with `HTTP -1`, so operator-facing status would need retry-safe handling before broader rollout tooling.
- App update surfaces and rollout tooling remain out of scope until the bench device proves the full accepted OTA state progression on hardware.

Recommendation
Keep `codex/s4-firmware-ota-validation` as the resume branch and keep the fixed beta.3 release active. The next narrow slice should validate the confirmation phase without a reset-toggling serial monitor attached, then capture one backend-visible `pending_confirm` and `succeeded` sequence for `fw-beta-20260327-03`. Do not widen into app update UI or rollout console work until that last confirmation proof is durable.
