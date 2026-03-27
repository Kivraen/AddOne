Stage
S4: Beta Hardening And Durable Release Memory

Status
Implemented on `codex/s4-firmware-ota-control-plane`. The repo now has one backend OTA control plane and release registry on top of the accepted `T-038` safety contract. This slice adds the release-state model, HTTPS eligibility lookup, durable OTA progress reporting, and the `begin_firmware_update` trigger path. It does not implement the firmware OTA client or any app UI.

Changes made
- Added the backend OTA control-plane migration:
  - [supabase/migrations/20260326153000_add_firmware_ota_control_plane.sql](/Users/viktor/Desktop/DevProjects/Codex/AddOne/supabase/migrations/20260326153000_add_firmware_ota_control_plane.sql)
- Updated the scoped backend and firmware-facing docs to match the implemented contract:
  - [Docs/AddOne_Device_Cloud_Contract.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_Cloud_Contract.md)
  - [Docs/AddOne_Beta_Environment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Beta_Environment.md)
  - [Docs/AddOne_Firmware_V2_Architecture.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Firmware_V2_Architecture.md)
  - [supabase/README.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/supabase/README.md)
- Added this worker report:
  - [Docs/agent-reports/2026-03-26-firmware-ota-control-plane-and-release-registry.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-26-firmware-ota-control-plane-and-release-registry.md)

Commands run
- `git status --short --branch`
- `git branch --list 'codex/s4-firmware-ota-control-plane'`
- `git switch -c codex/s4-firmware-ota-control-plane`
- `sed -n '1,220p' /Users/viktor/.codex/skills/stage-coordinator/SKILL.md`
- `sed -n '1,260p' Docs/AddOne_Main_Plan.md`
- `sed -n '1,260p' Docs/project-memory.md`
- `sed -n '1,260p' Docs/git-operations.md`
- `sed -n '1,260p' Docs/agent-coordination.md`
- `sed -n '1,260p' Docs/stages/stage-register.md`
- `sed -n '1,260p' Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md`
- `sed -n '1,260p' Docs/tasks/T-039-firmware-ota-control-plane-and-release-registry.md`
- `sed -n '1,260p' Docs/tasks/T-038-firmware-ota-safety-model-and-release-contract.md`
- `sed -n '1,260p' Docs/tasks/T-029-app-and-firmware-update-strategy.md`
- `sed -n '1,320p' Docs/agent-reports/2026-03-26-firmware-ota-safety-model-and-release-contract.md`
- `sed -n '1,320p' Docs/agent-reports/2026-03-26-firmware-ota-architecture-and-rollout-plan.md`
- `sed -n '1,320p' Docs/AddOne_Device_Cloud_Contract.md`
- `sed -n '1,320p' Docs/AddOne_Firmware_V2_Architecture.md`
- `sed -n '1,320p' Docs/AddOne_Beta_Environment.md`
- `sed -n '1,420p' supabase/migrations/20260308170000_add_device_cloud_sync_contract.sql`
- `sed -n '1,320p' supabase/migrations/20260326123000_transport_trust_and_device_identity_hardening.sql`
- `sed -n '1,260p' supabase/migrations/20260325003000_add_friend_celebration_playback.sql`
- `sed -n '603,760p' supabase/migrations/20260322183000_device_account_removal_flow.sql`
- `git diff --check`
- `git diff --stat`
- `rg -n "check_device_firmware_release|report_device_ota_progress|begin_firmware_update|firmware_releases|device_firmware_ota_statuses|device_firmware_update_requests" ...`

Evidence
- Exact schema references for the OTA control plane now exist in [supabase/migrations/20260326153000_add_firmware_ota_control_plane.sql](/Users/viktor/Desktop/DevProjects/Codex/AddOne/supabase/migrations/20260326153000_add_firmware_ota_control_plane.sql):
  - release registry: `firmware_releases`
  - staged cohort storage: `firmware_release_rollout_allowlist`
  - persisted install requests: `device_firmware_update_requests`
  - OTA event log: `device_firmware_ota_events`
  - latest per-device OTA projection: `device_firmware_ota_statuses`
  - device channel selector: `devices.firmware_channel`
- Exact RPC and command seams now exist in that migration:
  - `check_device_firmware_release(...)`
  - `report_device_ota_progress(...)`
  - `begin_firmware_update(...)`
  - `device_commands.kind = begin_firmware_update`
- Exact `T-038` enforcement is now in schema and function logic:
  - release status enum is `draft | active | paused | rolled_back | archived`
  - only one active forward release exists per `channel + hardware_profile`
  - field OTA is constrained to `addone-dual-ota-v1`
  - field OTA artifact kind is constrained to `esp32-application-bin`
  - artifact URL must be HTTPS
  - artifact size is capped to one OTA slot
  - active releases require `previous_stable_release_id`
  - `confirm_window_seconds` is frozen to `120`
  - `require_cloud_check_in` is frozen to `false`
  - explicit operator rollback is only allowed to the current release’s `previous_stable_release_id`
  - a second OTA target is blocked while a different OTA is already in progress
- Exact doc references now point to the same contract:
  - cloud RPC contract: [Docs/AddOne_Device_Cloud_Contract.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_Cloud_Contract.md)
  - beta rollout preconditions: [Docs/AddOne_Beta_Environment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Beta_Environment.md)
  - firmware architecture handoff: [Docs/AddOne_Firmware_V2_Architecture.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Firmware_V2_Architecture.md)
  - Supabase schema overview: [supabase/README.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/supabase/README.md)
- Internal-consistency proof:
  - the migration defines the same three OTA RPC names the task brief required
  - the docs now describe the same tables, RPC names, and `begin_firmware_update` command kind as the migration
  - `git diff --check` passed, so the changed files are free of whitespace and merge-marker issues
  - the existing realtime path remains compatible because queued device commands are already published generically through the broker bridge, so the new `begin_firmware_update` command uses the same backend control-plane lane rather than a special-case side channel
- What the next firmware OTA client slice can now assume:
  - the backend release registry is the source of truth for firmware rollout state
  - `check_device_firmware_release(...)` returns a decision row with `none | available | install_ready | blocked` plus the concrete release envelope when applicable
  - `available` means a rollout-eligible release exists but user confirmation is still required
  - `install_ready` means the control plane authorizes download now
  - `begin_firmware_update(...)` persists the install request before the device ever receives the command nudge
  - `report_device_ota_progress(...)` is the durable place to write OTA states and terminal failures
  - rollback targeting is explicit and anchored to `previous_stable_release_id`, not to an arbitrary older build

Open risks / blockers
- The migration and docs are implemented, but the migration was not applied to a live or temporary Postgres instance in this task. Backend proof is static branch-state proof, not runtime execution proof.
- The firmware client does not exist yet, so no real device has called `check_device_firmware_release(...)`, `report_device_ota_progress(...)`, or consumed `begin_firmware_update`.
- The repo’s checked-in `lib/supabase/database.types.ts` already predates some accepted backend migrations outside this slice, so this task kept the control-plane source of truth in SQL and docs instead of claiming a freshly regenerated TypeScript contract.
- Operator tooling to create and manage `firmware_releases` rows is still later work; this slice only establishes the backend contract and storage model.

Recommendation
Treat this branch as the backend OTA control-plane baseline for `T-039`. The next firmware slice can now stay narrow to client work: call `check_device_firmware_release(...)`, treat `begin_firmware_update` as a nudge only, write OTA state transitions through `report_device_ota_progress(...)`, and rely on the backend to enforce release state, single-target safety, and previous-stable rollback targeting.
