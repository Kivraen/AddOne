# Active Work

Last updated: March 18, 2026

This file is the live registry for coordination work.
It is the structured companion to [AddOne_Main_Plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Main_Plan.md).
The coordinator owns this file.

## Active Stage

- `S3: Beta UI Completion And Social Shape`
- Stage note: [stage-03-trusted-beta-surface-alignment.md](stages/stage-03-trusted-beta-surface-alignment.md)
- Next brief: [B-002-stage-s3-ui-audit-and-lock.md](briefs/B-002-stage-s3-ui-audit-and-lock.md)
- Rule: only `S3` work should be actively delegated until the coordinator accepts, blocks, or revises the stage.
- Scoped parallel track approved on March 18, 2026: timezone audit and timezone implementation work may run in parallel inside `S3` because they directly affect onboarding, settings, recovery, and device-behavior decisions.

## Workstream Trust

| Workstream | Trust | Summary | Owner | Notes |
| --- | --- | --- | --- | --- |
| Coordination system | Verified | Main plan, stage register, task briefs, report format, and dashboard foundation now exist. | Coordinator | Keep the docs and the dashboard aligned after every completed task. |
| App beta surface | Stale | The product shell exists and habit identity/minimum-goal UI has landed, but `Friends` is still placeholder UI and several visible surfaces still need a coordinated polish and proof pass. | Coordinator | `S3` is active because the user reprioritized UI completion and social-shape lock. |
| Timezone model | Verified | The current flow is now audited: device timezone is the canonical scheduling setting, a future viewer timezone must stay separate, and universal support is firmware-blocked today. | Coordinator | Choose a beta policy next: supported-zone picker and fallback messaging, or explicit firmware timezone expansion. |
| Beta environment | Implemented | Hosted beta infrastructure shape exists, but the full always-on stack is not yet end-to-end verified. | Coordinator | Queue `T-002` after the active UI stage is explicit enough to hand off cleanly. |
| Backend runtime mirror | Implemented | Snapshot-based runtime and gateway forwarding exist, but the full staged validation loop is still pending. | Coordinator | Re-check after `T-002` and `T-003`. |
| Hardware validation | Not Done | Validation criteria are clear, but the full real-device pass has not been completed yet. | Coordinator | Start `T-003` only after `S1` is accepted or explicitly bounded. |

## Task Registry

| Task ID | Title | Subsystem | Status | Owner | Depends On | Task Brief | Latest Report | Success Gate | Next Coordinator Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-000 | Project dashboard foundation | coordination | Closed | Codex | — | [T-000](tasks/T-000-project-dashboard-foundation.md) | [Report](agent-reports/2026-03-16-coordination-project-dashboard-foundation.md) | Strict gate | Accepted as historical coordination bootstrap work. |
| T-001 | Beta Friends surface | app | Backlog | Unassigned | T-005 | [T-001](tasks/T-001-beta-friends-surface.md) | — | Strict gate | Start after the UI audit locks the first-user friends shape and connection model. |
| T-002 | Hosted beta bring-up | infra | Backlog | Unassigned | — | [T-002](tasks/T-002-hosted-beta-bring-up.md) | — | Strict gate | Return to this after the active UI stage is explicit enough to avoid cross-stage churn. |
| T-003 | Real-device validation pass | firmware | Backlog | Unassigned | T-002 | [T-003](tasks/T-003-real-device-validation-pass.md) | — | Strict gate | Start after the hosted beta path is stable enough to support validation. |
| T-004 | Truth cleanup after validation | docs | Backlog | Unassigned | T-001, T-002, T-003 | [T-004](tasks/T-004-truth-cleanup-after-validation.md) | — | Strict gate | Run after implementation and validation results are known. |
| T-005 | Beta UI audit and scope lock | app | In Progress | Codex | — | [T-005](tasks/T-005-beta-ui-audit-and-scope-lock.md) | [Report](agent-reports/2026-03-18-habit-identity-and-minimum-goal-beta-ui.md) | Strict gate | Habit identity/minimum-goal slice is implemented but not yet accepted; complete a quick manual UI proof pass, then keep splitting profile, onboarding/recovery, and friends work. |
| T-006 | Timezone model and universal flow audit | cross-platform | Closed | Hubble | — | [T-006](tasks/T-006-timezone-model-and-universal-flow-audit.md) | [Report](agent-reports/2026-03-18-timezone-model-and-universal-flow-audit.md) | Strict gate | Accepted. Next decide whether beta uses a supported-zone timezone picker or whether firmware timezone support must expand first. |
| T-011 | Beta timezone capability and picker baseline | cross-platform | In Progress | Ptolemy | T-006 | [T-011](tasks/T-011-beta-timezone-capability-and-picker-baseline.md) | [Report](agent-reports/2026-03-18-beta-timezone-capability-and-picker-baseline.md) | Strict gate | Revise and retry with [B-006](briefs/B-006-stage-s3-timezone-revision-pass.md): restore or explicitly relocate reset-time editing, complete live manual UI proof for onboarding/settings/recovery, and resubmit. |
