---
id: T-042
title: Minimum app update and firmware status surfaces
stage_id: S4
stage_name: Beta Hardening And Durable Release Memory
subsystem: app
priority: high
owner: Unassigned
depends_on:
  - T-041
  - T-029
owned_paths:
  - app
  - components
  - hooks
  - lib
  - Docs/AddOne_Beta_Environment.md
  - Docs/AddOne_Device_Cloud_Contract.md
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/git-operations.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md
  - Docs/tasks/T-041-firmware-ota-artifact-hosting-and-hardware-validation.md
  - Docs/tasks/T-029-app-and-firmware-update-strategy.md
  - Docs/agent-reports/2026-03-26-firmware-ota-artifact-hosting-and-hardware-validation.md
  - Docs/AddOne_Beta_Environment.md
  - Docs/AddOne_Device_Cloud_Contract.md
  - Docs/AddOne_UI_Direction.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-27-minimum-app-update-and-firmware-status-surfaces.md
---

## Objective
Add the smallest user-facing update/status surface needed on top of the now-real OTA path so a beta user can understand device firmware state, see when an update is available or in progress, and intentionally trigger an update without operator tooling.

## Why Now
`T-041` proved the real immutable OTA flow on hardware. The next gap is no longer infrastructure. The app now needs a minimal, truthful surface for firmware version, OTA state, and update availability before broader rollout or operator tooling work.

## In Scope
- Show the current device firmware version in the app
- Show the current OTA/update state when a release is:
  - available
  - requested
  - downloading
  - verifying
  - staged
  - rebooting
  - pending confirm
  - succeeded
  - failed
- Add one minimal user-triggered update action for eligible releases
- Show enough failure detail that beta testing can distinguish “no update”, “in progress”, and “failed”
- Add the minimum app/build version visibility needed if it helps orient the beta user
- Update the scoped docs/report so they match the shipped app surface

## Out Of Scope
- Broad rollout console work
- Per-channel operator management UI
- Rich release notes, changelog UX, or update history browsers
- Automatic firmware policy controls beyond what is already defined in the accepted OTA contract
- Broad settings redesign outside the smallest required surface changes

## Required Changes
- The app must read and present the backend OTA status in a user-facing place
- The app must expose a bounded user-triggered firmware update path for an eligible device
- The UI must stay compact and aligned with the existing app instead of introducing an admin console

## Verification Required
- `npm run typecheck`
- Exact files changed
- Manual proof of:
  - no-update state
  - update-available state
  - in-progress update state
  - succeeded or failed state presentation
- Explicit note of any backend assumption the app now depends on

## Success Definition
- A beta user can tell what firmware their device is on
- A beta user can tell whether an update is available or already running
- A beta user can start an allowed firmware update without operator-only tools
- The next slice can focus on rollout/rollback tooling rather than basic user-facing update visibility
