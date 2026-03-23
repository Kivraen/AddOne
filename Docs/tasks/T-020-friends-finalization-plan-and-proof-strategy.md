---
id: T-020
title: Friends finalization plan and proof strategy
stage_id: S3
stage_name: Beta UI Completion And Social Shape
subsystem: app
priority: high
owner: Unassigned
depends_on:
  - T-001
owned_paths:
  - Docs/AddOne_Main_Plan.md
  - Docs/AddOne_V1_Canonical_Spec.md
  - Docs/AddOne_Backend_Model.md
  - Docs/plans/friends-beta-plan.md
  - Docs/ui-beta-issue-log.md
  - Docs/agent-reports/2026-03-16-app-beta-friends-surface.md
  - app/(app)/friends-arrange.tsx
  - app/(app)/friends-requests.tsx
  - components/app/friends-tab-content.tsx
  - components/app/friends-arrange-screen.tsx
  - components/app/friends-requests-screen.tsx
  - hooks/use-friends.ts
  - hooks/use-friends-board-order.ts
  - lib/supabase/addone-repository.ts
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-03-trusted-beta-surface-alignment.md
  - Docs/tasks/T-001-beta-friends-surface.md
  - Docs/agent-reports/2026-03-16-app-beta-friends-surface.md
  - Docs/plans/friends-beta-plan.md
  - Docs/AddOne_V1_Canonical_Spec.md
  - Docs/AddOne_Backend_Model.md
  - Docs/ui-beta-issue-log.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-22-friends-finalization-plan-and-proof-strategy.md
---

## Objective
Map the current Friends implementation, identify what still blocks acceptance, and produce a concrete finalization plan for proof, testing setup, and any narrow follow-up fixes.

## Why Now
The first Friends implementation exists, but `T-001` is still not accepted because the required runtime proof is incomplete. Before we resume execution work on Friends, we need one clear planning pass that explains what is already done, what must still be verified, what requires a second account or device, and what should remain explicitly deferred.

## In Scope
- Audit the current Friends implementation against `T-001`
- Map the exact proof states still required for acceptance
- Identify which states can be verified with one account, two accounts, one device, or two devices
- Identify any narrow product or data gaps that would block final acceptance
- Produce a recommended execution order for closing `T-001`

## Out Of Scope
- Implementing new Friends features
- Broad redesign of the Friends surface
- Pulling in feed, reactions, comments, notifications, or challenge groups
- Onboarding, timezone, or reset-flow work

## Required Changes
- Produce a durable planning report for Friends finalization.
- If a small scoped doc update is needed to make the plan explicit, update only the scoped docs listed above.
- Keep this as a planning/research slice unless the user later switches to execution.

## Verification Required
- Exact references to the current Friends code and task requirements
- A clear matrix of required proof states
- Explicit statement of what external test setup is still needed
- Recommended next execution step after the planning pass

## Success Definition
- A fresh agent can see what the Friends feature already is, what is still missing for acceptance, and how we plan to close that gap.
- The user can discuss the final Friends path from one planning artifact instead of reconstructing it from old reports.

## Open Risks
- Some proof states may still require a second real account or second device before final acceptance is possible.
- If the current implementation has hidden assumptions about seeded data, the planning pass must call that out explicitly instead of masking it.
