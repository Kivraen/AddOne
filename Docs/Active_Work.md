# Active Work

Last updated: March 22, 2026

This file is the live registry for coordination work.
It is the structured companion to [AddOne_Main_Plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Main_Plan.md).
The coordinator owns this file.

## Active Stage

- `S3: Beta UI Completion And Social Shape`
- Stage note: [stage-03-trusted-beta-surface-alignment.md](stages/stage-03-trusted-beta-surface-alignment.md)
- Next brief: [B-015-stage-s3-factory-reset-remove-and-fresh-add-flow.md](briefs/B-015-stage-s3-factory-reset-remove-and-fresh-add-flow.md)
- Rule: only `S3` work should be actively delegated until the coordinator accepts, blocks, or revises the stage.
- Scoped parallel track approved on March 18, 2026: timezone audit and timezone implementation work may run in parallel inside `S3` because they directly affect onboarding, settings, recovery, and device-behavior decisions.
- Narrow repo-health support work is also allowed inside `S3` when it directly restores proof quality for the active UI stage.

## Workstream Trust

| Workstream | Trust | Summary | Owner | Notes |
| --- | --- | --- | --- | --- |
| Coordination system | Verified | Main plan, stage register, task briefs, report format, and dashboard foundation now exist. | Coordinator | Keep the docs and the dashboard aligned after every completed task. |
| App beta surface | Implemented | The product shell now has the friend-facing profile model, the first Friends sharing implementation, a hardware-validated setup or recovery flow, and `Reset history` as `Start new habit`. Friends final acceptance is blocked on second-device proof, and destructive factory reset plus remove is the next active slice. | Coordinator | `S3` remains active until Friends proof, the timezone revision path, and the final onboarding or reset polish slices are explicit enough to accept. |
| Timezone model | Verified | The current flow is now audited: device timezone is the canonical scheduling setting, a future viewer timezone must stay separate, and universal support is firmware-blocked today. | Coordinator | Choose a beta policy next: supported-zone picker and fallback messaging, or explicit firmware timezone expansion. |
| Beta environment | Implemented | Hosted beta infrastructure is alive and the TestFlight distribution path now works, but the always-on device reconnect path is not yet trusted enough to close validation. | Coordinator | Queue `T-002` after the active UI stage is explicit enough to hand off cleanly, then use `T-003` to prove the real device path. |
| Backend runtime mirror | Implemented | Snapshot-based runtime and gateway forwarding exist, but the full staged validation loop is still pending. | Coordinator | Re-check after `T-002` and `T-003`. |
| Hardware validation | Not Done | Validation criteria are clear, but the full real-device pass has not been completed yet. | Coordinator | Start `T-003` only after `S1` is accepted or explicitly bounded. |

## Task Registry

| Task ID | Title | Subsystem | Status | Owner | Depends On | Task Brief | Latest Report | Success Gate | Next Coordinator Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-000 | Project dashboard foundation | coordination | Closed | Codex | — | [T-000](tasks/T-000-project-dashboard-foundation.md) | [Report](agent-reports/2026-03-16-coordination-project-dashboard-foundation.md) | Strict gate | Accepted as historical coordination bootstrap work. |
| T-001 | Beta Friends surface and social floor | app | Blocked | Unassigned | T-015, T-009 | [T-001](tasks/T-001-beta-friends-surface.md) | [Report](agent-reports/2026-03-16-app-beta-friends-surface.md) | Strict gate | Wait for second device or second account proof. Then use [B-012](briefs/B-012-stage-s3-beta-friends-verification-pass.md) for the final Friends verification sweep. |
| T-002 | Hosted beta bring-up | infra | Backlog | Unassigned | — | [T-002](tasks/T-002-hosted-beta-bring-up.md) | — | Strict gate | Return to this after the active UI stage is explicit enough to avoid cross-stage churn. |
| T-003 | Real-device validation pass | firmware | Backlog | Unassigned | T-002 | [T-003](tasks/T-003-real-device-validation-pass.md) | — | Strict gate | Start after the hosted beta path is stable enough to support validation. |
| T-004 | Truth cleanup after validation | docs | Backlog | Unassigned | T-001, T-002, T-003 | [T-004](tasks/T-004-truth-cleanup-after-validation.md) | — | Strict gate | Run after implementation and validation results are known. |
| T-005 | Beta UI audit and scope lock | app | Closed | Codex | — | [T-005](tasks/T-005-beta-ui-audit-and-scope-lock.md) | [Report](agent-reports/2026-03-19-s3-cumulative-ui-surface-report.md) | Strict gate | Accepted as the stage-entry audit and scope-lock checkpoint. Continue the active stage through `T-009`, `T-001`, the `T-011` revision path if needed, and the final onboarding slice. |
| T-015 | Friends beta plan and model lock | product | Closed | Codex | T-005 | [T-015](tasks/T-015-friends-beta-plan-and-model-lock.md) | [Report](agent-reports/2026-03-19-friends-beta-plan-and-model-lock.md) | Strict gate | Accepted. First-beta Friends is now narrowed to profile-gated code sharing plus live read-only board browsing, with richer social deferred. |
| T-009 | Profile identity model and account surface | app | Closed | Codex | T-015 | [T-009](tasks/T-009-profile-identity-model-and-account-surface.md) | [Report](agent-reports/2026-03-19-profile-identity-model-and-account-surface.md) | Strict gate | Accepted. Social profile, unique username support, profile photo flow, and the Friends gate now exist and are the foundation for `T-001`. |
| T-008 | Onboarding and Wi-Fi recovery polish batch | app | In Progress | Unassigned | T-001 | [T-008](tasks/T-008-onboarding-and-wifi-recovery-polish.md) | [Report](agent-reports/2026-03-22-recovery-and-reset-history-start-new-habit.md) | Strict gate | Treat this as the parent slice for the current setup, recovery, and reset-model work. |
| T-017 | Add-device entry flow first-screen polish | app | Closed | Codex | T-008 | [T-017](tasks/T-017-add-device-entry-flow-first-screen.md) | [Report](agent-reports/2026-03-22-recovery-and-reset-history-start-new-habit.md) | Strict gate | Absorbed into the broader March 22 setup-flow stabilization slice. |
| T-018 | Factory reset remove and fresh add-flow validation | cross-platform | Brief Ready | Unassigned | T-008 | [T-018](tasks/T-018-factory-reset-remove-and-fresh-add-flow.md) | — | Strict gate | Start with [B-015](briefs/B-015-stage-s3-factory-reset-remove-and-fresh-add-flow.md) to make destructive reset plus account removal trustworthy before more onboarding polish. |
| T-014 | Repo typecheck noise cleanup | repo | Closed | Codex | T-005 | [T-014](tasks/T-014-repo-typecheck-noise-cleanup.md) | [Report](agent-reports/2026-03-19-repo-typecheck-noise-cleanup.md) | Strict gate | Accepted. Repo-wide `typecheck` is meaningful again; keep the backup tree excluded unless a deliberate restore workflow needs it. |
| T-013 | Challenge groups and shared board model | app | Backlog | Unassigned | T-001 | [T-013](tasks/T-013-challenge-groups-and-shared-board-model.md) | — | Strict gate | Keep as a post-beta planning task so the first-beta friends implementation does not block shared-goal groups later. |
| T-006 | Timezone model and universal flow audit | cross-platform | Closed | Hubble | — | [T-006](tasks/T-006-timezone-model-and-universal-flow-audit.md) | [Report](agent-reports/2026-03-18-timezone-model-and-universal-flow-audit.md) | Strict gate | Accepted. Next decide whether beta uses a supported-zone timezone picker or whether firmware timezone support must expand first. |
| T-011 | Beta timezone capability and picker baseline | cross-platform | In Progress | Ptolemy | T-006 | [T-011](tasks/T-011-beta-timezone-capability-and-picker-baseline.md) | [Report](agent-reports/2026-03-18-beta-timezone-capability-and-picker-baseline.md) | Strict gate | Revise and retry with [B-006](briefs/B-006-stage-s3-timezone-revision-pass.md): restore or explicitly relocate reset-time editing, complete live manual UI proof for onboarding/settings/recovery, and resubmit. |
