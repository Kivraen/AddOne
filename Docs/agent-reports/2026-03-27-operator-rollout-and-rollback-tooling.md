Stage
S4: Beta Hardening And Durable Release Memory

Status
Implemented on `codex/s4-operator-rollout-tooling`.

The beta rollout slice now has one bounded operator path for release activation, rollout targeting, operator-triggered install requests, rollback, and rollout inspection without hand-editing `firmware_releases` or `firmware_release_rollout_allowlist`. The live beta proof activated a temporary immutable smoke release, inspected it as the active rollout target, then rolled it back so the accepted `fw-beta-20260327-05` release ended the run active again.

Changes made
- Added service-role rollout management RPCs in [20260327143000_add_operator_firmware_release_tooling.sql](/Users/viktor/Desktop/DevProjects/Codex/AddOne/supabase/migrations/20260327143000_add_operator_firmware_release_tooling.sql):
  - `operator_activate_firmware_release(...)`
  - `operator_set_firmware_release_rollout(...)`
  - `operator_rollback_firmware_release(...)`
- Added the local beta operator CLI in [index.mjs](/Users/viktor/Desktop/DevProjects/Codex/AddOne/services/firmware-rollout-operator/index.mjs) with the documented surface in [README.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/services/firmware-rollout-operator/README.md):
  - `activate`
  - `target`
  - `request`
  - `rollback`
  - `inspect`
- Updated the durable contract and runbook docs so the repo matches the implemented operator path:
  - [AddOne_Device_Cloud_Contract.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_Cloud_Contract.md)
  - [AddOne_Beta_Environment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Beta_Environment.md)
  - [supabase/README.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/supabase/README.md)
- Added this worker report:
  - [2026-03-27-operator-rollout-and-rollback-tooling.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-27-operator-rollout-and-rollback-tooling.md)

Commands run
- `git status --short --branch`
- `git switch -c codex/s4-operator-rollout-tooling`
- `sed -n '1,220p' /Users/viktor/.codex/skills/stage-coordinator/SKILL.md`
- `sed -n '1,220p' Docs/tasks/T-043-operator-rollout-and-rollback-tooling.md`
- `sed -n '1,220p' Docs/tasks/T-029-app-and-firmware-update-strategy.md`
- `sed -n '1,240p' Docs/AddOne_Beta_Environment.md`
- `sed -n '160,360p' Docs/AddOne_Device_Cloud_Contract.md`
- `sed -n '1,320p' supabase/migrations/20260326153000_add_firmware_ota_control_plane.sql`
- `node --check services/firmware-rollout-operator/index.mjs`
- `node services/firmware-rollout-operator/index.mjs help`
- `npx supabase db push --linked`
- `node services/firmware-rollout-operator/index.mjs inspect --release fw-beta-20260327-05 --env-file .codex-tmp/realtime-gateway.env --json`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s -X POST "$SUPABASE_URL/rest/v1/firmware_releases" ... -d '{"release_id":"fw-beta-20260327-ops-01", ...}'`
- `node services/firmware-rollout-operator/index.mjs target --release fw-beta-20260327-ops-01 --hardware-uids AO_B0CBD8CFABB0 --env-file .codex-tmp/realtime-gateway.env --json`
- `node services/firmware-rollout-operator/index.mjs activate --release fw-beta-20260327-ops-01 --env-file .codex-tmp/realtime-gateway.env --json`
- `node services/firmware-rollout-operator/index.mjs inspect --release fw-beta-20260327-ops-01 --env-file .codex-tmp/realtime-gateway.env --json`
- `node services/firmware-rollout-operator/index.mjs rollback --release fw-beta-20260327-ops-01 --env-file .codex-tmp/realtime-gateway.env --json`
- `node services/firmware-rollout-operator/index.mjs inspect --release fw-beta-20260327-05 --env-file .codex-tmp/realtime-gateway.env --json`
- `set -a; source .codex-tmp/realtime-gateway.env; set +a; curl -s "$SUPABASE_URL/rest/v1/firmware_releases?select=release_id,status,firmware_version,previous_stable_release_id,updated_at&release_id=in.(fw-beta-20260327-05,fw-beta-20260327-ops-01)&order=release_id.asc" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Accept-Profile: public"`
- `git diff --check`
- `git diff --name-only`

Evidence
- Exact files changed in the final branch state:
  - [AddOne_Beta_Environment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Beta_Environment.md)
  - [AddOne_Device_Cloud_Contract.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_Cloud_Contract.md)
  - [2026-03-27-operator-rollout-and-rollback-tooling.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-27-operator-rollout-and-rollback-tooling.md)
  - [README.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/services/firmware-rollout-operator/README.md)
  - [index.mjs](/Users/viktor/Desktop/DevProjects/Codex/AddOne/services/firmware-rollout-operator/index.mjs)
  - [supabase/README.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/supabase/README.md)
  - [20260327143000_add_operator_firmware_release_tooling.sql](/Users/viktor/Desktop/DevProjects/Codex/AddOne/supabase/migrations/20260327143000_add_operator_firmware_release_tooling.sql)
- Live beta activation plus rollback proof on March 27, 2026:
  - proof-only immutable release row inserted:
    - `release_id = fw-beta-20260327-ops-01`
    - `status = draft`
    - `previous_stable_release_id = fw-beta-20260327-05`
    - artifact metadata reused the accepted `fw-beta-20260327-05` binary only for rollout-state proof
  - target step result:
    - `fw-beta-20260327-ops-01`
    - `rollout_mode = allowlist`
    - `allowlist_count = 1`
    - targeted hardware UID: `AO_B0CBD8CFABB0`
    - `updated_at = 2026-03-27T18:28:27.591665+00:00`
  - activation step result:
    - `fw-beta-20260327-ops-01 -> active`
    - current active release `fw-beta-20260327-05 -> archived`
    - `updated_at = 2026-03-27T18:28:30.483867+00:00`
  - inspect step result while the smoke release was live:
    - `active_release.release_id = fw-beta-20260327-ops-01`
    - `release.status = active`
    - `allowlist = [AO_B0CBD8CFABB0]`
    - no device requests or OTA events were issued for the proof-only release
  - rollback step result:
    - `fw-beta-20260327-ops-01 -> rolled_back`
    - `fw-beta-20260327-05 -> active`
    - `updated_at = 2026-03-27T18:28:56.989835+00:00`
  - final backend snapshot after rollback:
    - `fw-beta-20260327-05`
      - `status = active`
      - `firmware_version = 2.0.0-beta.3`
      - `previous_stable_release_id = fw-beta-20260326-01`
    - `fw-beta-20260327-ops-01`
      - `status = rolled_back`
      - `firmware_version = 2.0.0-beta.3`
      - `previous_stable_release_id = fw-beta-20260327-05`
- Final live rollout inspection for the restored accepted release:
  - `active_release.release_id = fw-beta-20260327-05`
  - allowlist now still contains:
    - `AO_A4F00F767008`
    - `AO_B0CBD8CFABB0`
  - current per-device rollout states:
    - `AO_B0CBD8CFABB0 -> succeeded`
    - `AO_A4F00F767008 -> blocked`
  - the existing accepted OTA proof rows for `AO_B0CBD8CFABB0` remain intact on `fw-beta-20260327-05`

Open risks / blockers
- Remaining manual step: this slice does not publish artifacts or create draft release rows from a manifest. Operators still need a separate artifact-upload plus draft-insert step before this tool can activate or target a new immutable release.
- The proof run intentionally did not issue a device install request for `fw-beta-20260327-ops-01`, because the smoke release reused the already-installed `fw-beta-20260327-05` artifact and existed only to prove safe activation plus rollback state transitions.
- `AO_A4F00F767008` still rejects OTA commands with `Unsupported command kind.`, so operator-triggered install requests on that board remain blocked by its firmware baseline rather than by the rollout tooling.

Recommendation
Treat this branch as the minimum beta operator rollout baseline for `T-043`: apply the new migration, use the local `services/firmware-rollout-operator` CLI for activation, targeting, rollback, and inspection, and keep the remaining draft-publication step explicitly separate until a later immutable-release publication slice is approved.
