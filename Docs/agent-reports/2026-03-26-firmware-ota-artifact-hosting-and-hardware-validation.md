Stage
S4: Beta Hardening And Durable Release Memory

Status
Revise and retry. The March 27, 2026 proof pass on `codex/s4-firmware-ota-validation` did not close `T-041`. `AO_B0CBD8CFABB0` did not produce the required clean `pending_confirm -> succeeded` sequence for `fw-beta-20260327-03`, and the board remained or returned to `2.0.0-beta.1`. The earlier branch evidence still proves the stack-canary loop is fixed and that beta.3 can stage plus boot provisionally on hardware, but this proof pass exposed a newer bench blocker before confirmation: one raw-serial diagnostic attempt reached only `requested -> downloading` before repeated `HTTP -1` failures, and one fully disconnected retry delivered plus applied the OTA command without producing any new OTA progress rows.

Changes made
- No firmware, backend, or rollout-tooling code changed in this proof pass.
- Refreshed the beta OTA runbook blocker note so it matches the latest March 27 bench result:
  - [Docs/AddOne_Beta_Environment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Beta_Environment.md)
- Refreshed this `T-041` worker report so it reflects the actual current branch state after the latest proof attempt:
  - [Docs/agent-reports/2026-03-26-firmware-ota-artifact-hosting-and-hardware-validation.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-26-firmware-ota-artifact-hosting-and-hardware-validation.md)
- Existing `T-041` implementation files already present on this branch remain unchanged in this pass:
  - [firmware/src/firmware_app.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/firmware_app.cpp)
  - [firmware/include/config.h](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/include/config.h)
  - [firmware/releases/fw-beta-20260326-01.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/releases/fw-beta-20260326-01.json)
  - [firmware/releases/fw-beta-20260327-03.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/releases/fw-beta-20260327-03.json)

Commands run
- `git branch --show-current`
- `git status --short --branch`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s "$SUPABASE_URL/rest/v1/devices?select=id,hardware_uid,firmware_channel,firmware_version,last_seen_at&hardware_uid=eq.AO_B0CBD8CFABB0" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Accept-Profile: public"`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s "$SUPABASE_URL/rest/v1/firmware_releases?select=release_id,status,firmware_version,previous_stable_release_id,artifact_url,confirm_window_seconds&release_id=in.(fw-beta-20260326-01,fw-beta-20260327-03)" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Accept-Profile: public"`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s "$SUPABASE_URL/rest/v1/device_firmware_ota_statuses?select=*&device_id=eq.21a6fae3-a304-45c0-bbbd-e6886a290012" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Accept-Profile: public"`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s "$SUPABASE_URL/rest/v1/device_firmware_ota_events?select=release_id,state,failure_code,failure_detail,created_at&device_id=eq.21a6fae3-a304-45c0-bbbd-e6886a290012&order=created_at.desc&limit=12" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Accept-Profile: public"`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s "$SUPABASE_URL/rest/v1/firmware_release_rollout_allowlist?select=release_id,hardware_uid&release_id=eq.fw-beta-20260327-03&hardware_uid=eq.AO_B0CBD8CFABB0" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Accept-Profile: public"`
- `lsof -nP /dev/cu.usbserial-10`
- `pio device list`
- `python3 - <<'PY' ... glob.glob('/dev/cu.usbserial*') ... PY`
- `python3 -u - <<'PY' ... open('/dev/cu.usbserial-10') ... stream raw serial ... PY`
- `python3 -u - <<'PY' ... open('/dev/cu.usbserial-210') ... stream raw serial ... PY`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/begin_firmware_update" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Content-Type: application/json" -H "Accept-Profile: public" -d '{"p_device_id":"21a6fae3-a304-45c0-bbbd-e6886a290012","p_release_id":"fw-beta-20260327-03","p_request_source":"operator"}'`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s "$SUPABASE_URL/rest/v1/device_firmware_update_requests?select=*&device_id=eq.21a6fae3-a304-45c0-bbbd-e6886a290012&order=requested_at.desc&limit=5" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Accept-Profile: public"`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s "$SUPABASE_URL/rest/v1/device_commands?select=*&device_id=eq.21a6fae3-a304-45c0-bbbd-e6886a290012&kind=eq.begin_firmware_update&limit=5" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Accept-Profile: public"`

Evidence
- Exact files changed in this proof pass:
  - [Docs/AddOne_Beta_Environment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Beta_Environment.md)
  - [Docs/agent-reports/2026-03-26-firmware-ota-artifact-hosting-and-hardware-validation.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-26-firmware-ota-artifact-hosting-and-hardware-validation.md)
- Exact hosted OTA references were still valid before the rerun:
  - `fw-beta-20260326-01` remained `archived` for `2.0.0-beta.1`
  - `fw-beta-20260327-03` remained `active` for `2.0.0-beta.3`
  - allowlist row still existed for `AO_B0CBD8CFABB0`
  - pre-run device row still showed `AO_B0CBD8CFABB0` on `2.0.0-beta.1`
- Existing real-hardware provisional-boot evidence already on this branch still stands:
  - the earlier request `a56a7476-e854-499e-892d-3d1c8300e62a` reached backend-visible `requested`, `downloading`, `downloaded`, `verifying`, `staged`, and `rebooting`
  - serial output from that earlier run showed `AddOne firmware 2.0.0-beta.3` and `State -> Tracking`
  - that earlier run then rolled back with backend-visible `rolled_back` / `boot_not_confirmed`
- First March 27 diagnostic retry with raw serial attached:
  - no existing monitor held `/dev/cu.usbserial-10` open when checked with `lsof`
  - raw readers were opened on `/dev/cu.usbserial-10` and `/dev/cu.usbserial-210`; the target board produced logs on `/dev/cu.usbserial-10`
  - `begin_firmware_update(...)` returned request `2d5ccddd-e35c-4242-a8a4-9ad1b7ad8cd6` and command `c87c0b9b-0911-4d38-9466-cbb5d7299651` at `2026-03-27T07:46:30.295127+00:00`
  - raw serial then showed:
    - `MQTT command queued: c87c0b9b-0911-4d38-9466-cbb5d7299651 (begin_firmware_update)`
    - `Queued OTA eligibility re-check for fw-beta-20260327-03`
    - `Cloud RPC check_device_firmware_release -> HTTP 200`
    - a full `install_ready` response for `fw-beta-20260327-03`
    - `Cloud RPC report_device_ota_progress -> HTTP 200` for `requested`
    - a later backend-visible `downloading` write
    - then repeated `Cloud RPC report_device_ota_progress -> HTTP -1` and `Cloud RPC check_device_firmware_release -> HTTP -1`
  - no new real-hardware evidence of `downloaded`, `staged`, `rebooting`, provisional beta.3 boot, `pending_confirm`, or `succeeded` was captured in this attempt
  - the backend stayed stale at `current_state = downloading` with `last_reported_at = 2026-03-27T07:46:39.488302+00:00`
  - after the raw serial reader was released, the device recovered on `2.0.0-beta.1` and checked in again at `2026-03-27T07:49:49.362714+00:00`
- Second March 27 retry with serial disconnected:
  - no serial reader or `pio device monitor` was attached during this retry or any notional confirmation window
  - `begin_firmware_update(...)` returned request `0a5d1d42-5ef8-4bd3-bf38-ee61fcfdb9f1` and command `667e799a-b2c1-4ebd-a595-fe9cee7e309e` at `2026-03-27T07:50:28.378943+00:00`
  - the persisted command row shows:
    - `delivered_at = 2026-03-27T07:50:34.554587+00:00`
    - `applied_at = 2026-03-27T07:50:39.605619+00:00`
  - the device remained on `2.0.0-beta.1` and last checked in at `2026-03-27T07:50:57.355033+00:00`
  - the persisted request row remained `status = requested`
  - no new `device_firmware_ota_events` rows appeared after the earlier `downloading` row at `2026-03-27T07:46:39.488302+00:00`
  - explicit real-hardware evidence for this proof pass:
    - provisional boot: not observed in this pass
    - `pending_confirm`: not observed
    - `succeeded`: not observed
    - serial monitor note: the first diagnostic attempt used a raw direct reader instead of `pio device monitor` and the second retry kept serial fully disconnected; because neither retry reached provisional boot, no confirmation window on beta.3 was entered with serial attached

Open risks / blockers
- `T-041` still lacks the required clean backend-visible `pending_confirm -> succeeded` pass for `fw-beta-20260327-03`.
- The latest blocker is now earlier than the confirmation window: after `begin_firmware_update` is applied, the bench board can stop before any new OTA progress appears.
- Raw serial observation still looks risky on this bench setup: the board only resumed `2.0.0-beta.1` check-ins after the raw serial reader was released.
- The backend OTA projection can remain stale at `downloading` when `report_device_ota_progress(...)` drops with `HTTP -1`, which obscures whether the board failed download, wedged locally, or lost Wi-Fi immediately after the first progress write.

Recommendation
Keep scope narrow on `codex/s4-firmware-ota-validation`. Do not move on to app update UI or rollout tooling. The next proof slice should recover `AO_B0CBD8CFABB0` to a clean beta.1 baseline if needed, then debug only the gap between an applied `begin_firmware_update` command and the first post-request OTA progress on March 27, 2026. Serial access should stay fully avoided during the real confirmation attempt unless a demonstrably non-disruptive capture method is available before reboot. `pending_confirm` and `succeeded` remain the only missing acceptance proof; this pass did not reach either state.
