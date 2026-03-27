Stage
S4: Beta Hardening And Durable Release Memory

Status
Complete on `codex/s4-release-candidate-validation`.

One focused internal release-candidate validation pass ran against the real beta stack on the accepted `T-043` baseline. The pass made the remaining publish blockers explicit. Store-submission prep is not ready to start yet.

Changes made
- Added this validation report:
  - [2026-03-27-internal-release-candidate-validation-and-publish-blockers.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-27-internal-release-candidate-validation-and-publish-blockers.md)
- Updated the beta runbook with the exact March 27, 2026 release-candidate matrix and verdict:
  - [AddOne_Beta_Environment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Beta_Environment.md)

Exact files changed in the final branch state:
- [AddOne_Beta_Environment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Beta_Environment.md)
- [2026-03-27-internal-release-candidate-validation-and-publish-blockers.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-27-internal-release-candidate-validation-and-publish-blockers.md)

Commands run
- `git status --short --branch`
- `git branch --list --all 'codex/s4-*' 'main'`
- `git switch -c codex/s4-release-candidate-validation`
- `sed -n '1,220p' /Users/viktor/.codex/skills/stage-coordinator/SKILL.md`
- `sed -n '1,220p' Docs/AddOne_Main_Plan.md`
- `sed -n '1,220p' Docs/project-memory.md`
- `sed -n '1,220p' Docs/git-operations.md`
- `sed -n '1,220p' Docs/agent-coordination.md`
- `sed -n '1,220p' Docs/stages/stage-register.md`
- `sed -n '1,220p' Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md`
- `sed -n '1,220p' Docs/tasks/T-044-internal-release-candidate-validation-and-publish-blockers.md`
- `sed -n '1,220p' Docs/tasks/T-029-app-and-firmware-update-strategy.md`
- `sed -n '1,220p' Docs/agent-reports/2026-03-27-operator-rollout-and-rollback-tooling.md`
- `sed -n '1,220p' Docs/agent-reports/2026-03-27-minimum-app-update-and-firmware-status-surfaces.md`
- `sed -n '1,220p' Docs/agent-reports/2026-03-26-firmware-ota-artifact-hosting-and-hardware-validation.md`
- `sed -n '1,220p' Docs/AddOne_Beta_Environment.md`
- `sed -n '1,240p' eas.json`
- `sed -n '1,240p' app.config.js`
- `rg -n "T-043|T-044|release candidate|operator rollout|app update|OTA" Docs/AddOne_Main_Plan.md Docs/project-memory.md Docs/git-operations.md Docs/agent-coordination.md Docs/stages/stage-register.md Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md Docs/tasks/T-044-internal-release-candidate-validation-and-publish-blockers.md Docs/tasks/T-029-app-and-firmware-update-strategy.md Docs/agent-reports/2026-03-27-operator-rollout-and-rollback-tooling.md Docs/agent-reports/2026-03-27-minimum-app-update-and-firmware-status-surfaces.md Docs/agent-reports/2026-03-26-firmware-ota-artifact-hosting-and-hardware-validation.md Docs/AddOne_Beta_Environment.md`
- `eas whoami`
- `eas build:list --platform ios --limit 10 --json --non-interactive`
- `eas build:list --platform android --limit 10 --json --non-interactive`
- `npm run typecheck`
- `node services/firmware-rollout-operator/index.mjs inspect --release fw-beta-20260327-05 --env-file .codex-tmp/realtime-gateway.env --json`
- `curl -I https://gateway-beta.addone.studio/health`
- `curl -I https://sqhzaayqacmgxseiqihs.supabase.co/storage/v1/object/public/firmware-artifacts/ota/fw-beta-20260327-05/firmware-2c84953dc3c58d26.bin`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s "$SUPABASE_URL/rest/v1/devices?select=id,hardware_uid,firmware_version,firmware_channel,last_seen_at&hardware_uid=in.(AO_B0CBD8CFABB0,AO_A4F00F767008)&order=hardware_uid.asc" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Accept-Profile: public"`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s "$SUPABASE_URL/rest/v1/firmware_releases?select=release_id,status,firmware_version,previous_stable_release_id,artifact_url,artifact_sha256,artifact_size_bytes,updated_at&release_id=in.(fw-beta-20260327-03,fw-beta-20260327-04,fw-beta-20260327-05)&order=release_id.asc" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Accept-Profile: public"`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/get_device_firmware_update_summary" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Content-Type: application/json" -H "Accept-Profile: public" -d '{"p_device_id":"21a6fae3-a304-45c0-bbbd-e6886a290012","p_app_version":"0.2.0"}'`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/get_device_firmware_update_summary" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Content-Type: application/json" -H "Accept-Profile: public" -d '{"p_device_id":"e7e61f8b-f2a6-4fa9-a736-04d4e995c1bb","p_app_version":"0.2.0"}'`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s "$SUPABASE_URL/rest/v1/device_firmware_ota_statuses?select=device_id,current_state,target_release_id,confirmed_release_id,reported_firmware_version,last_failure_code,last_failure_detail,last_requested_at,last_reported_at,ota_started_at,ota_completed_at,updated_at&device_id=in.(21a6fae3-a304-45c0-bbbd-e6886a290012,e7e61f8b-f2a6-4fa9-a736-04d4e995c1bb)&order=device_id.asc" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Accept-Profile: public"`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s "$SUPABASE_URL/rest/v1/device_firmware_update_requests?select=device_id,release_id,status,last_error,request_source,requested_at,completed_at,updated_at&device_id=in.(21a6fae3-a304-45c0-bbbd-e6886a290012,e7e61f8b-f2a6-4fa9-a736-04d4e995c1bb)&order=updated_at.desc&limit=6" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Accept-Profile: public"`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s "$SUPABASE_URL/rest/v1/device_commands?select=id,device_id,kind,status,last_error,requested_at,delivered_at,applied_at&kind=eq.begin_firmware_update&device_id=in.(21a6fae3-a304-45c0-bbbd-e6886a290012,e7e61f8b-f2a6-4fa9-a736-04d4e995c1bb)&order=requested_at.desc&limit=6" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Accept-Profile: public"`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s "$SUPABASE_URL/rest/v1/rpc/list_active_device_mqtt_credentials" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Accept-Profile: public"`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s "$SUPABASE_URL/rest/v1/device_runtime_snapshots?select=device_id,created_at,generated_at,revision,current_week_start,today_row&device_id=eq.21a6fae3-a304-45c0-bbbd-e6886a290012&order=created_at.desc&limit=1" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Accept-Profile: public"`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s "$SUPABASE_URL/rest/v1/device_runtime_snapshots?select=device_id,created_at,generated_at,revision,current_week_start,today_row&device_id=eq.e7e61f8b-f2a6-4fa9-a736-04d4e995c1bb&order=created_at.desc&limit=1" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Accept-Profile: public"`
- `git rev-parse HEAD`
- `git log --oneline --decorate -1`
- `git show -s --format='%H %ci %s' 8014e9d8218943083173debe20ce7e409ba61838 34156db53ab73bac5a91c24aa342e49560b48a60 d589cdce934bd4e0283fa761166dacb5da20b8ce`

Evidence
- Exact validation matrix used:
  - installable app path:
    - `eas build:list --platform ios --limit 10 --json --non-interactive`
    - `eas build:list --platform android --limit 10 --json --non-interactive`
    - repo config audit in [eas.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/eas.json) and [app.config.js](/Users/viktor/Desktop/DevProjects/Codex/AddOne/app.config.js)
  - active firmware release path:
    - `node services/firmware-rollout-operator/index.mjs inspect --release fw-beta-20260327-05 --env-file .codex-tmp/realtime-gateway.env --json`
    - `curl -I` against the immutable `fw-beta-20260327-05` artifact URL
  - live beta cohort:
    - read-only `devices`, `device_firmware_ota_statuses`, `device_firmware_update_requests`, and `device_commands` queries for `AO_B0CBD8CFABB0` and `AO_A4F00F767008`
    - read-only `get_device_firmware_update_summary(...)` checks for both device IDs with `p_app_version = 0.2.0`
    - read-only `list_active_device_mqtt_credentials()` verification that both boards still have issued per-device broker accounts
    - read-only latest `device_runtime_snapshots` row per device
  - public operator surface:
    - `curl -I https://gateway-beta.addone.studio/health`
  - branch sanity:
    - `npm run typecheck`
    - `git rev-parse HEAD`
    - `git show -s --format='%H %ci %s' ...`

- Passed checks:
  - current branch tip is still the accepted `T-043` checkpoint:
    - `8014e9d8218943083173debe20ce7e409ba61838`
    - commit date: March 27, 2026 11:34:21 -0700
    - subject: `Accept T-043 rollout operator tooling`
  - local code sanity on the accepted baseline:
    - `npm run typecheck` passed
  - installable iOS path exists in EAS:
    - latest finished internal iOS beta build:
      - build profile: `beta`
      - commit: `34156db53ab73bac5a91c24aa342e49560b48a60`
      - completed at: `2026-03-20T14:09:54.741Z`
      - app version: `0.2.0`
      - build version: `1`
    - latest finished iOS store build:
      - build profile: `testflight`
      - commit: `d589cdce934bd4e0283fa761166dacb5da20b8ce`
      - completed at: `2026-03-20T20:56:30.001Z`
      - app version: `0.2.0`
      - build version: `4`
  - active firmware release is still the accepted immutable beta release:
    - `fw-beta-20260327-05`
    - status: `active`
    - firmware version: `2.0.0-beta.3`
    - previous stable release: `fw-beta-20260326-01`
    - rollout mode: `allowlist`
    - allowlist still contains:
      - `AO_A4F00F767008`
      - `AO_B0CBD8CFABB0`
  - active immutable artifact still serves correctly:
    - `curl -I` returned `HTTP/2 200`
    - `content-length: 1137136`
  - successful device still matches the accepted OTA proof:
    - `AO_B0CBD8CFABB0`
    - `devices.firmware_version = 2.0.0-beta.3`
    - `devices.last_seen_at = 2026-03-27T18:39:48.999177+00:00`
    - summary RPC returned:
      - `current_state = succeeded`
      - `confirmed_release_id = fw-beta-20260327-05`
      - `availability_reason = up_to_date`
      - `update_available = false`
    - rollout inspect returned:
      - command status `applied`
      - request status `completed`
      - recent events still include `downloaded`, `verifying`, `staged`, `rebooting`, `pending_confirm`, and `succeeded`
  - hosted beta connectivity remains live enough for validation:
    - both boards have recent `last_seen_at` rows in `devices`
    - both boards still have active per-device MQTT credential rows
    - latest runtime snapshot rows still exist for both boards:
      - `AO_B0CBD8CFABB0`: `created_at = 2026-03-27T07:19:04.192666+00:00`, `revision = 102`
      - `AO_A4F00F767008`: `created_at = 2026-03-27T17:58:08.760136+00:00`, `revision = 74`

- Failed checks:
  - blocked beta board is still not OTA-capable on the intended user-triggered path:
    - `AO_A4F00F767008`
    - `devices.firmware_version = 2.0.0-beta.1`
    - `devices.last_seen_at = 2026-03-27T18:40:28.275868+00:00`
    - summary RPC returned:
      - `current_state = blocked`
      - `target_release_id = fw-beta-20260327-05`
      - `last_failure_code = command_rejected`
      - `last_failure_detail = Unsupported command kind.`
      - `availability_reason = user_confirmation_required`
      - `update_available = true`
      - `can_request_update = true`
    - latest update request row:
      - `status = cancelled`
      - `request_source = user`
      - `last_error = Unsupported command kind.`
      - `requested_at = 2026-03-27T17:59:14.925182+00:00`
    - latest `begin_firmware_update` command row:
      - `status = failed`
      - `last_error = Unsupported command kind.`
      - `delivered_at = 2026-03-27T17:59:15.423231+00:00`
  - installable app path is stale for the accepted March 27 release-candidate baseline:
    - current accepted branch tip is `8014e9d8218943083173debe20ce7e409ba61838` from March 27, 2026
    - latest finished internal iOS beta build is still `34156db53ab73bac5a91c24aa342e49560b48a60` from March 18, 2026
    - latest finished iOS store build is still `d589cdce934bd4e0283fa761166dacb5da20b8ce` from March 20, 2026
    - `eas build:list --platform android --limit 10 --json --non-interactive` returned `[]`
  - public gateway health path is still not usable as a public monitor target:
    - `curl -I https://gateway-beta.addone.studio/health` returned `HTTP/2 404`

Open risks / blockers
- `P0` firmware / device-ops blocker:
  - `AO_A4F00F767008` is still part of the active beta allowlist but cannot execute `begin_firmware_update`.
  - owner: firmware baseline / bench device operations
  - unblock by reflashing that board to the accepted OTA-capable base image or removing it from the intended release-candidate cohort before submission prep is treated as real.
- `P0` app release blocker:
  - no installable build exists for the actual accepted March 27, 2026 release-candidate baseline.
  - owner: app release operations
  - unblock by producing fresh installable builds from `8014e9d8218943083173debe20ce7e409ba61838` or later, then rerunning this same matrix against those artifacts.
- `P1` Android store-path blocker:
  - there are still no finished Android builds in EAS, so Play Store submission prep is not grounded in a real artifact.
  - owner: app release operations
  - if the immediate launch decision is explicitly iOS-only, reclassify this blocker before the next gate instead of silently ignoring it.
- `P2` operational risk:
  - `https://gateway-beta.addone.studio/health` still returns `HTTP 404`.
  - owner: backend / hosting operations
  - this did not block the live RC evidence in this pass because on-host checks and backend state still showed active device traffic, but it should be repaired before broader external operations rely on it.

Recommendation
Do not start store-submission prep yet.

The current beta stack is close enough to produce a finite blocker list, but not close enough to call release-candidate validation clean. The next gating move should be narrow:
- reflash or remove `AO_A4F00F767008` from the active beta cohort
- produce fresh installable iOS and Android artifacts from the accepted March 27 baseline
- rerun this same validation matrix against those new app artifacts and the live beta backend
