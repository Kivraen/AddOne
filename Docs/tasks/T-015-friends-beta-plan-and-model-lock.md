---
id: T-015
title: Friends beta plan and model lock
stage_id: S3
stage_name: Beta UI Completion And Social Shape
required_skills: []
subsystem: product
priority: high
owner: Unassigned
depends_on:
  - T-005
owned_paths:
  - Docs/plans/friends-beta-plan.md
  - Docs/ui-beta-issue-log.md
  - Docs/tasks/T-001-beta-friends-surface.md
  - Docs/tasks/T-013-challenge-groups-and-shared-board-model.md
  - Docs/Active_Work.md
  - Docs/stages/stage-03-trusted-beta-surface-alignment.md
  - Docs/AddOne_Main_Plan.md
  - Docs/AddOne_V1_Canonical_Spec.md
  - Docs/AddOne_Backend_Model.md
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-03-trusted-beta-surface-alignment.md
  - Docs/AddOne_V1_Canonical_Spec.md
  - Docs/AddOne_Backend_Model.md
  - Docs/ui-beta-issue-log.md
  - Docs/plans/friends-beta-plan.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-19-friends-beta-plan-and-model-lock.md
---

## Objective
Turn the current `Friends` ideas into an explicit first-beta product plan with a bounded social floor, a clear later challenge direction, and a safe implementation sequence.

## Why Now
The user wants to concentrate on `Friends` before final onboarding polish. Right now the repo has intent and partial direction, but not yet a solid planning checkpoint that says what first-beta `Friends` actually is, what is deferred, and what technology/back-end shape is acceptable.

## In Scope
- Lock the first-beta meaning of `Friends`.
- Reduce the current ideas into:
  - beta scope
  - later scope
  - explicit open decisions
- Decide the likely first-beta social floor recommendation.
- Decide the likely connection model recommendation.
- Map current backend sharing primitives against what the recommended beta social floor needs.
- Preserve the later challenge-group direction without pulling it into first beta.
- Produce a clear implementation sequence and success gates for the next execution tasks.

## Out of Scope
- Implementing the `Friends` UI
- Building chat, comments, or notification systems
- Schema migration execution unless needed only for planning clarity
- Final onboarding polish execution

## Required Changes
- Create or refine a dedicated durable friends planning doc.
- Update the UI issue log so the current social decision space is explicit.
- Re-sequence the active S3 work so friends planning is the next slice and onboarding is the final visible UI polish slice.
- Tighten `T-001` so implementation starts only after the planning lock is accepted.

## Verification Required
- Doc consistency across:
  - main plan
  - active work
  - stage note
  - issue log
  - dedicated friends planning doc
- Explicit answer to:
  - what is in first beta
  - what is later
  - what still needs a user decision

## Success Definition
- A fresh agent can understand the first-beta `Friends` direction without reading chat.
- The implementation task that follows can be delegated without inventing social architecture mid-task.
- Onboarding is explicitly held as the final visible UI polish slice rather than competing with friends planning.

## Open Risks
- A richer social floor may still require one narrow backend extension beyond the current sharing primitives.
- Identity decisions may remain partially coupled to profile-model work.
