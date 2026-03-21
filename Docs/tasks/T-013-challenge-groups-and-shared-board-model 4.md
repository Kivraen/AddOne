---
id: T-013
title: Challenge groups and shared board model
subsystem: app
priority: low
owner: Unassigned
depends_on:
  - T-001
owned_paths:
  - Docs/
  - app/
  - supabase/
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/plans/friends-beta-plan.md
  - Docs/AddOne_V1_Canonical_Spec.md
success_gate: Strict gate
report_path: Docs/agent-reports/<YYYY-MM-DD>-challenge-groups-and-shared-board-model.md
---

# T-013 Challenge Groups And Shared Board Model

## Objective

Preserve the post-beta shared-goal challenge model without blocking first-beta Friends.

## Why Now

The user has a clear future challenge concept that should stay durable even though it is not a beta requirement.

## In Scope

- shared-goal challenge concept
- aggregated brightness board model
- later communication surface planning

## Out Of Scope

- first-beta implementation

## Required Changes

- planning and later-model docs

## Verification Required

- planning checkpoint and clear beta-vs-later boundary

## Success Definition

- the future challenge direction is preserved without expanding current beta scope

## Open Risks

- should not leak into first-beta implementation pressure
