# Active Work

Last updated: March 18, 2026

This file is the live registry for coordination work.
It is the structured companion to [AddOne_Main_Plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Main_Plan.md).
The coordinator owns this file.

## Active Stage

- `S1: Validation Baseline Ready`
- Stage note: [stage-01-validation-baseline-ready.md](stages/stage-01-validation-baseline-ready.md)
- Next brief: [B-001-stage-s1-validation-baseline.md](briefs/B-001-stage-s1-validation-baseline.md)
- Rule: only `S1` work should be actively delegated until the coordinator accepts, blocks, or revises the stage.

## Workstream Trust

| Workstream | Trust | Summary | Owner | Notes |
| --- | --- | --- | --- | --- |
| Coordination system | Verified | Main plan, stage register, task briefs, report format, and dashboard foundation now exist. | Coordinator | Keep the docs and the dashboard aligned after every completed task. |
| App beta surface | Stale | The product shell exists, but `Friends` is still placeholder UI and the history entry path still has drift. | Coordinator | Queue `T-001` after the hosted baseline is trusted unless the user reprioritizes it sooner. |
| Beta environment | Implemented | Hosted beta infrastructure shape exists, but the full always-on stack is not yet end-to-end verified. | Coordinator | `S1` is active because `T-002` unlocks the next proof stage. |
| Backend runtime mirror | Implemented | Snapshot-based runtime and gateway forwarding exist, but the full staged validation loop is still pending. | Coordinator | Re-check after `T-002` and `T-003`. |
| Hardware validation | Not Done | Validation criteria are clear, but the full real-device pass has not been completed yet. | Coordinator | Start `T-003` only after `S1` is accepted or explicitly bounded. |

## Task Registry

| Task ID | Title | Subsystem | Status | Owner | Depends On | Task Brief | Latest Report | Success Gate | Next Coordinator Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-000 | Project dashboard foundation | coordination | Closed | Codex | — | [T-000](tasks/T-000-project-dashboard-foundation.md) | [Report](agent-reports/2026-03-16-coordination-project-dashboard-foundation.md) | Strict gate | Accepted as historical coordination bootstrap work. |
| T-001 | Beta Friends surface | app | Backlog | Unassigned | — | [T-001](tasks/T-001-beta-friends-surface.md) | — | Strict gate | Queue after `S1` and `S2`, unless the user explicitly reprioritizes the visible beta surface earlier. |
| T-002 | Hosted beta bring-up | infra | Brief Ready | Unassigned | — | [T-002](tasks/T-002-hosted-beta-bring-up.md) | — | Strict gate | Dispatch [B-001](briefs/B-001-stage-s1-validation-baseline.md) and review the report against `S1`. |
| T-003 | Real-device validation pass | firmware | Backlog | Unassigned | T-002 | [T-003](tasks/T-003-real-device-validation-pass.md) | — | Strict gate | Start after the hosted beta path is stable enough to support validation. |
| T-004 | Truth cleanup after validation | docs | Backlog | Unassigned | T-001, T-002, T-003 | [T-004](tasks/T-004-truth-cleanup-after-validation.md) | — | Strict gate | Run after implementation and validation results are known. |
