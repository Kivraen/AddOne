Stage
S4: Beta Hardening And Durable Release Memory

Status
Blocked on `codex/s4-release-candidate-remediation`.

This rerun stayed narrow to the explicit `T-044` blocker list. The live firmware-cohort blocker is cleared: `AO_A4F00F767008` is no longer in the active `fw-beta-20260327-05` allowlist, and its owner-facing update summary now reports `not_in_rollout` instead of offering a user-triggered install. The installable-artifact blocker is not cleared yet: fresh iOS builds were launched from commit `dce8541be1cd3fa1662c39b2d608a68f20158770`, but no finished March 27, 2026 iOS artifact exists yet because the remote store build is still queued in EAS and the local IPA fallback is blocked by the host Xcode installation missing the iOS 26.4 device platform. Android remains explicitly deferred and was not reopened in this iOS-first gate.

Changes made
- Remediated the active rollout state for `fw-beta-20260327-05` so the allowlist now contains only `AO_B0CBD8CFABB0`.
- Explicitly removed `AO_A4F00F767008` from the release-candidate cohort instead of widening scope into firmware reflashing.
- Launched fresh remote iOS builds from accepted baseline `dce8541`:
  - internal `beta`: `eeaf522a-4cd8-41a2-b77d-338354af7689`
  - store `testflight`: `7d230430-ddb5-43df-b700-2b2c05a31fc8`
- Repaired the local macOS build toolchain enough to test a local IPA fallback:
  - temporarily set repo-local `core.ignorecase=true` so EAS could package, then restored it to `false`
  - installed `fastlane` with Homebrew
  - reinstalled `cocoapods` with Homebrew after the Ruby/ffi conflict broke `pod`
- Updated the scoped runbook and added this report.

Exact files changed in the final branch state:
- [Docs/AddOne_Beta_Environment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Beta_Environment.md)
- [Docs/agent-reports/2026-03-27-publish-blocker-remediation-and-release-candidate-rerun.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-27-publish-blocker-remediation-and-release-candidate-rerun.md)

Commands run
- `git status --short --branch`
- `git branch --contains dce8541 --all`
- `git rev-parse --verify dce8541`
- `git switch -c codex/s4-release-candidate-remediation dce8541`
- `sed -n '1,220p' /Users/viktor/.codex/skills/stage-coordinator/SKILL.md`
- `sed -n '1,240p' Docs/AddOne_Main_Plan.md`
- `sed -n '1,240p' Docs/project-memory.md`
- `sed -n '1,240p' Docs/git-operations.md`
- `sed -n '1,240p' Docs/agent-coordination.md`
- `sed -n '1,260p' Docs/stages/stage-register.md`
- `sed -n '1,320p' Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md`
- `sed -n '1,260p' Docs/tasks/T-045-publish-blocker-remediation-and-release-candidate-rerun.md`
- `sed -n '1,260p' Docs/briefs/B-042-stage-s4-publish-blocker-remediation-and-release-candidate-rerun.md`
- `sed -n '1,320p' Docs/agent-reports/2026-03-27-internal-release-candidate-validation-and-publish-blockers.md`
- `sed -n '1,320p' Docs/AddOne_Beta_Environment.md`
- `sed -n '1,240p' eas.json`
- `sed -n '1,260p' app.config.js`
- `sed -n '1,520p' services/firmware-rollout-operator/index.mjs`
- `npm run typecheck`
- `eas whoami`
- `node services/firmware-rollout-operator/index.mjs target --release fw-beta-20260327-05 --hardware-uids AO_B0CBD8CFABB0 --env-file .codex-tmp/realtime-gateway.env --json`
- `eas build:list --platform ios --limit 10 --json --non-interactive`
- `eas build:list --platform android --limit 10 --json --non-interactive`
- `EAS_SKIP_AUTO_FINGERPRINT=1 eas build --platform ios --profile beta --non-interactive --json --no-wait`
- `EAS_SKIP_AUTO_FINGERPRINT=1 eas build --platform ios --profile testflight --non-interactive --json --no-wait`
- `git config core.ignorecase true`
- `brew install fastlane`
- `brew reinstall cocoapods`
- `EAS_SKIP_AUTO_FINGERPRINT=1 eas build --platform ios --profile beta --local --non-interactive --output /tmp/addone-beta-dce8541.ipa`
- `curl -I https://sqhzaayqacmgxseiqihs.supabase.co/storage/v1/object/public/firmware-artifacts/ota/fw-beta-20260327-05/firmware-2c84953dc3c58d26.bin`
- `curl -I https://gateway-beta.addone.studio/health`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s "$SUPABASE_URL/rest/v1/firmware_releases?..."`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s "$SUPABASE_URL/rest/v1/firmware_release_rollout_allowlist?..."`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s "$SUPABASE_URL/rest/v1/devices?..."`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/get_device_firmware_update_summary" ...`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s "$SUPABASE_URL/rest/v1/device_firmware_ota_statuses?..."`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s "$SUPABASE_URL/rest/v1/device_firmware_update_requests?..."`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s "$SUPABASE_URL/rest/v1/device_commands?..."`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s "$SUPABASE_URL/rest/v1/rpc/list_active_device_mqtt_credentials"`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl --http1.1 -s "$SUPABASE_URL/rest/v1/device_runtime_snapshots?..."`
- `git config core.ignorecase false`
- `git rev-parse HEAD`
- `git log --oneline --decorate -1`

Evidence
- Corrected baseline:
  - branch: `codex/s4-release-candidate-remediation`
  - commit: `dce8541be1cd3fa1662c39b2d608a68f20158770`
  - subject: `Refine T-045 for iOS-first launch`
  - `npm run typecheck` passed on this baseline
- Exact remediation action on `AO_A4F00F767008`:
  - changed live rollout state for `fw-beta-20260327-05` with:
    - `node services/firmware-rollout-operator/index.mjs target --release fw-beta-20260327-05 --hardware-uids AO_B0CBD8CFABB0 --env-file .codex-tmp/realtime-gateway.env --json`
  - release row remains:
    - `release_id = fw-beta-20260327-05`
    - `status = active`
    - `firmware_version = 2.0.0-beta.3`
    - `rollout_mode = allowlist`
    - `updated_at = 2026-03-27T18:58:03.058342+00:00`
  - allowlist after remediation:
    - `AO_B0CBD8CFABB0`
    - `created_at = 2026-03-27T18:58:03.058342+00:00`
  - `AO_A4F00F767008` remains online but is no longer eligible on the user-triggered path:
    - `devices.firmware_version = 2.0.0-beta.1`
    - `devices.last_seen_at = 2026-03-27T19:14:28.509239+00:00`
    - `get_device_firmware_update_summary(...)` now returns:
      - `availability_reason = not_in_rollout`
      - `update_available = false`
      - `can_request_update = false`
    - the stale failed `begin_firmware_update` evidence remains visible only as historical state:
      - `current_state = blocked`
      - `last_failure_code = command_rejected`
      - `last_failure_detail = Unsupported command kind.`
- Exact iOS build artifacts produced:
  - remote EAS jobs created from `dce8541`:
    - internal `beta`
      - build id: `eeaf522a-4cd8-41a2-b77d-338354af7689`
      - status at rerun time: `NEW`
      - app version: `0.2.0`
      - build version: `7`
      - created at: `2026-03-27T19:07:04.657Z`
    - store `testflight`
      - build id: `7d230430-ddb5-43df-b700-2b2c05a31fc8`
      - status at rerun time: `IN_QUEUE`
      - app version: `0.2.0`
      - build version: `7`
      - created at: `2026-03-27T19:07:04.363Z`
      - queue position at rerun time: `1033`
      - estimated wait remaining at rerun time: `10694` seconds
  - local fallback attempts:
    - repaired host toolchain until local EAS reached `xcodebuild archive`
    - no fresh `.ipa` was produced
    - final local blocker:
      - `xcodebuild: error: Unable to find a destination matching the provided destination specifier`
      - `iOS 26.4 is not installed. Please download and install the platform from Xcode > Settings > Components.`
- Exact rerun matrix and results:
  - installable app path:
    - `eas build:list --platform ios --limit 10 --json --non-interactive`
      - shows the new `dce8541` internal/store jobs above
      - still shows no finished March 27, 2026 iOS artifact
    - `eas build:list --platform android --limit 10 --json --non-interactive`
      - returned `[]`
      - Android remains explicitly deferred and was not reopened in this iOS-first gate
  - active OTA release and artifact:
    - `fw-beta-20260327-05` remains active
    - artifact URL returned `HTTP/2 200`
    - `content-length: 1137136`
  - live beta cohort:
    - `AO_B0CBD8CFABB0`
      - `devices.firmware_version = 2.0.0-beta.3`
      - `devices.last_seen_at = 2026-03-27T19:13:49.285571+00:00`
      - summary RPC returned:
        - `current_state = succeeded`
        - `confirmed_release_id = fw-beta-20260327-05`
        - `availability_reason = up_to_date`
        - `update_available = false`
      - latest runtime snapshot:
        - `created_at = 2026-03-27T07:19:04.192666+00:00`
        - `revision = 102`
    - `AO_A4F00F767008`
      - `devices.firmware_version = 2.0.0-beta.1`
      - `devices.last_seen_at = 2026-03-27T19:14:28.509239+00:00`
      - summary RPC returned:
        - `current_state = blocked`
        - `availability_reason = not_in_rollout`
        - `update_available = false`
        - `can_request_update = false`
      - latest runtime snapshot:
        - `created_at = 2026-03-27T17:58:08.760136+00:00`
        - `revision = 74`
    - both boards still have active per-device MQTT credentials:
      - `AO_A4F00F767008`
      - `AO_B0CBD8CFABB0`
  - public operator surface:
    - `curl -I https://gateway-beta.addone.studio/health` still returned `HTTP/2 404`

Open risks / blockers
- `P0` iOS artifact blocker:
  - there is still no finished installable iOS artifact for baseline `dce8541`.
  - remote builds were launched correctly, but they are not done yet.
  - local IPA fallback is blocked because the host Xcode installation does not have the iOS 26.4 platform component required for device archives.
- `P2` operational risk:
  - `https://gateway-beta.addone.studio/health` still returns `HTTP/2 404`.
  - this remains non-blocking for the RC evidence because hosted device traffic and OTA state are still live, but it should be repaired before broader operations rely on it.
- Explicit Android disposition:
  - deferred follow-up
  - `eas build:list --platform android --limit 10 --json --non-interactive` is still `[]`
  - Android was not reopened as part of this March 27, 2026 iOS-first launch wave

Recommendation
Do not start iOS submission prep yet.

`AO_A4F00F767008` is no longer a release-candidate blocker because it is explicitly out of the active cohort, but `T-045` is still blocked on fresh finished iOS artifacts. The next narrow move should be one of:
- wait for EAS jobs `eeaf522a-4cd8-41a2-b77d-338354af7689` and `7d230430-ddb5-43df-b700-2b2c05a31fc8` to finish, then rerun the installable-artifact portion of the matrix
- or install the iOS 26.4 platform in Xcode, rerun the local `beta` and `testflight` IPA builds from `dce8541`, and then repeat the same artifact checks

Until one of those completes, the corrected baseline is clearer than `T-044` but not yet ready for iOS submission prep.
