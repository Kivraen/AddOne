Stage
S4: Beta Hardening And Durable Release Memory

Status
Revise and retry. This March 27, 2026 `T-041` pass did not close the task. `AO_B0CBD8CFABB0` still did not produce a clean backend-visible `pending_confirm -> succeeded` run for `fw-beta-20260327-03`. The branch does now isolate the remaining proof gap more precisely: fresh OTA commands deliver and apply exactly once, backend-visible `requested -> downloading` remains fixed, the immediate `downloading` reboot loop is now surfaced with reset-reason evidence, and the final branch state ends in a reproducible backend-visible mid-stream stall at `379900/1134144` bytes with a `45000 ms` idle timeout.

Changes made
- Added a deterministic firmware version override plus a dedicated beta.1 baseline environment so proof retries can USB-flash a controlled `2.0.0-beta.1` bench image while keeping the hosted OTA target on `2.0.0-beta.3`:
  - [firmware/include/config.h](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/include/config.h)
  - [firmware/platformio.ini](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/platformio.ini)
- Updated the OTA client to keep command-triggered release checks pending across transient failures, retry OTA progress reports, flush pending reports after reboot, move the `4096` byte OTA buffer off the sync-task stack, surface interrupted OTA sessions with `esp_reset_reason()`, split the download path into `1000 ms` chunk reads with a `45000 ms` overall idle timeout, yield a real scheduler tick after each successful chunk write, and report exact stalled byte counts:
  - [firmware/src/ota_client.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/ota_client.cpp)
  - [firmware/src/ota_client.h](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/ota_client.h)
- Kept the branch's command-ack flush and HTTP fallback ack handling in the proof base for the no-serial retries:
  - [firmware/src/firmware_app.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/firmware_app.cpp)
- Refreshed the beta blocker note and this worker report to match the actual final branch state:
  - [Docs/AddOne_Beta_Environment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Beta_Environment.md)
  - [Docs/agent-reports/2026-03-26-firmware-ota-artifact-hosting-and-hardware-validation.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-26-firmware-ota-artifact-hosting-and-hardware-validation.md)

Commands run
- `git status --short --branch`
- `git diff -- firmware/src/ota_client.cpp firmware/src/ota_client.h firmware/include/config.h firmware/platformio.ini`
- `rg -n "interruptedPhaseFailureFor|clearPendingProgressReport_|flushPendingProgressReport_|queuePendingProgressReport_|esp_reset_reason|Device restarted before OTA phase" firmware/src/ota_client.cpp firmware/src/ota_client.h firmware/include/config.h firmware/platformio.ini`
- `sed -n '1,180p' firmware/src/ota_client.cpp`
- `sed -n '1,200p' /Users/viktor/.platformio/packages/framework-arduinoespressif32/tools/sdk/esp32/include/esp_system/include/esp_system.h`
- `rg -n "task_wdt|esp_task_wdt|watchdog|addone_sync|sync task|xTaskCreate|TaskHandle_t|downloadAndStageRelease_|handlePendingConfirmation_|service\\(" firmware/src firmware/include`
- `sed -n '430,520p' firmware/src/firmware_app.cpp`
- `sed -n '1660,1775p' firmware/src/firmware_app.cpp`
- `sed -n '300,390p' firmware/src/ota_client.cpp`
- `git diff --check`
- `pio run -d firmware -e addone-esp32dev-beta`
- `pio run -d firmware -e addone-esp32dev-beta-ota-base`
- `strings firmware/.pio/build/addone-esp32dev-beta/firmware.bin | rg -n "2\\.0\\.0-beta\\.[13]"`
- `strings firmware/.pio/build/addone-esp32dev-beta-ota-base/firmware.bin | rg -n "2\\.0\\.0-beta\\.[13]"`
- `pio run -d firmware -e addone-esp32dev-beta-ota-base -t nobuild -t upload --upload-port /dev/cu.usbserial-10`
- `sleep 6`
- `sleep 10`
- `sleep 12`
- `sleep 15`
- `sleep 20`
- `sleep 30`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s "$SUPABASE_URL/rest/v1/devices?select=id,hardware_uid,firmware_version,firmware_channel,last_seen_at&hardware_uid=eq.AO_B0CBD8CFABB0" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Accept-Profile: public"`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s "$SUPABASE_URL/rest/v1/device_firmware_ota_statuses?select=device_id,current_state,target_release_id,reported_firmware_version,last_failure_code,last_failure_detail,updated_at&device_id=eq.21a6fae3-a304-45c0-bbbd-e6886a290012&order=updated_at.desc&limit=1" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Accept-Profile: public"`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s "$SUPABASE_URL/rest/v1/device_firmware_ota_events?select=state,failure_code,failure_detail,firmware_version,release_id,created_at&device_id=eq.21a6fae3-a304-45c0-bbbd-e6886a290012&order=created_at.desc&limit=12" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Accept-Profile: public"`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s "$SUPABASE_URL/rest/v1/device_firmware_update_requests?select=id,status,last_error,requested_at,completed_at&device_id=eq.21a6fae3-a304-45c0-bbbd-e6886a290012&order=requested_at.desc&limit=3" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Accept-Profile: public"`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s "$SUPABASE_URL/rest/v1/device_commands?select=*&id=eq.25dfad8b-bfac-4274-a4e3-80a10f959d78" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Accept-Profile: public"`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s "$SUPABASE_URL/rest/v1/device_commands?select=*&id=eq.a8651353-1187-4d2b-b880-94d9e5023853" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Accept-Profile: public"`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s "$SUPABASE_URL/rest/v1/device_commands?select=*&id=eq.e3a22019-52f6-4272-ac2e-8a04a7f7b675" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Accept-Profile: public"`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/begin_firmware_update" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Content-Type: application/json" -H "Accept-Profile: public" -d '{"p_device_id":"21a6fae3-a304-45c0-bbbd-e6886a290012","p_release_id":"fw-beta-20260327-03","p_request_source":"operator"}'`

Evidence
- Exact files changed in the final branch state:
  - [Docs/AddOne_Beta_Environment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Beta_Environment.md)
  - [Docs/agent-reports/2026-03-26-firmware-ota-artifact-hosting-and-hardware-validation.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-26-firmware-ota-artifact-hosting-and-hardware-validation.md)
  - [firmware/include/config.h](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/include/config.h)
  - [firmware/platformio.ini](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/platformio.ini)
  - [firmware/src/firmware_app.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/firmware_app.cpp)
  - [firmware/src/ota_client.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/ota_client.cpp)
  - [firmware/src/ota_client.h](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/ota_client.h)
- Serial-access handling:
  - The real proof attempts were run with no serial monitor or raw serial reader attached.
  - USB serial on `/dev/cu.usbserial-10` was opened only for the three baseline uploads.
  - Each upload handshake confirmed MAC `b0:cb:d8:cf:ab:b0`, which matches `AO_B0CBD8CFABB0`.
  - There was no serial attachment during the OTA attempt windows or any confirmation window, because no run reached provisional beta.3 boot.
- Build identity proof:
  - `strings firmware/.pio/build/addone-esp32dev-beta/firmware.bin` contains `2.0.0-beta.3`.
  - `strings firmware/.pio/build/addone-esp32dev-beta-ota-base/firmware.bin` contains `2.0.0-beta.1`.
- Real-hardware attempt 1 after reset-reason instrumentation:
  - Request `c98ef0fc-8952-48d1-8aaa-fb0f47d4919a` created command `25dfad8b-bfac-4274-a4e3-80a10f959d78` at `2026-03-27T16:40:50.721148+00:00`.
  - The command reached `delivered_at = 2026-03-27T16:40:51.204069+00:00` and `applied_at = 2026-03-27T16:40:51.204069+00:00`.
  - Backend-visible OTA sequence:
    - `requested` at `2026-03-27T16:40:55.987221+00:00`
    - `downloading` at `2026-03-27T16:40:58.688551+00:00`
    - `failed_download` at `2026-03-27T16:41:17.363819+00:00`
  - Failure detail: `Device restarted before OTA phase 'downloading' could complete (reset_reason=ESP_RST_TASK_WDT).`
  - The board recovered on the old firmware:
    - `devices.firmware_version = 2.0.0-beta.1`
    - `devices.last_seen_at = 2026-03-27T16:41:23.361539+00:00`
- Real-hardware attempt 2 after `1000 ms` chunk reads:
  - Request `a6fa2c5e-d53f-4265-b374-ddd3c5499bad` created command `a8651353-1187-4d2b-b880-94d9e5023853` at `2026-03-27T16:44:49.941642+00:00`.
  - The command reached `delivered_at = 2026-03-27T16:44:50.528334+00:00` and `applied_at = 2026-03-27T16:44:50.528334+00:00`.
  - Backend-visible OTA sequence:
    - `requested` at `2026-03-27T16:44:55.593561+00:00`
    - `downloading` at `2026-03-27T16:44:58.310398+00:00`
    - `failed_download` at `2026-03-27T16:45:19.526233+00:00`
  - Failure detail: `Device restarted before OTA phase 'downloading' could complete (reset_reason=ESP_RST_TASK_WDT).`
  - The board recovered on the old firmware:
    - `devices.firmware_version = 2.0.0-beta.1`
    - `devices.last_seen_at = 2026-03-27T16:45:25.38134+00:00`
- Real-hardware attempt 3 after per-chunk `delay(1)`:
  - Request `710dca2d-a38a-440b-838b-e48e17b7690c` created command `e3a22019-52f6-4272-ac2e-8a04a7f7b675` at `2026-03-27T16:48:15.509491+00:00`.
  - The command reached `delivered_at = 2026-03-27T16:48:16.033433+00:00` and `applied_at = 2026-03-27T16:48:16.033433+00:00`.
  - Backend-visible OTA sequence:
    - `requested` at `2026-03-27T16:48:21.227968+00:00`
    - `downloading` at `2026-03-27T16:48:23.781396+00:00`
    - `failed_download` at `2026-03-27T16:49:27.401268+00:00`
  - Failure detail: `OTA artifact download stalled after 379900/1134144 bytes with a 45000 ms idle timeout.`
  - The board stayed on the old firmware and checked in again immediately after the failure:
    - `devices.firmware_version = 2.0.0-beta.1`
    - `devices.last_seen_at = 2026-03-27T16:49:28.577315+00:00`
- Explicit real-hardware proof still missing in the final branch state:
  - `downloaded`: not observed
  - `verifying`: not observed
  - `staged`: not observed
  - provisional boot into `2.0.0-beta.3`: not observed
  - `pending_confirm`: not observed
  - `succeeded`: not observed

Open risks / blockers
- `T-041` remains open because there is still no clean real-hardware `pending_confirm -> succeeded` proof for `fw-beta-20260327-03`.
- The active blocker is now isolated later and more precisely than before:
  - fresh commands deliver and apply exactly once
  - the device reaches backend-visible `requested -> downloading` without a serial monitor attached
  - the final branch state no longer ends in an immediate hidden reboot loop, but the artifact stream still does not reach `downloaded`
  - the latest no-serial retry failed at `379900/1134144` bytes with `download_failed` and a `45000 ms` idle timeout
- Because the device never reached `downloaded`, none of the later required proof points exist yet for this pass:
  - `verifying`
  - `staged`
  - provisional beta.3 boot
  - `pending_confirm`
  - `succeeded`

Recommendation
Keep scope narrow on `codex/s4-firmware-ota-validation`. Use the current branch state as the next proof baseline. The next revise-and-retry slice should target only the remaining artifact-stream gap between backend `downloading` and `downloaded` on `AO_B0CBD8CFABB0`, specifically why the hosted stream stops at `379900/1134144` bytes under no-serial bench conditions. Do not widen scope into app UI, rollout tooling, or OTA architecture until one real run reaches provisional beta.3 boot plus backend-visible `pending_confirm -> succeeded`.
