---
id: T-015
title: Friends beta plan and model lock
subsystem: product
priority: high
owner: Codex
depends_on:
  - T-005
owned_paths:
  - Docs/plans/friends-beta-plan.md
  - Docs/AddOne_V1_Canonical_Spec.md
  - Docs/AddOne_Backend_Model.md
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/AddOne_V1_Canonical_Spec.md
  - Docs/AddOne_Backend_Model.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-19-friends-beta-plan-and-model-lock.md
---

# T-015 Friends Beta Plan And Model Lock

## Objective

Turn the Friends ideas into a durable first-beta plan with clear beta-vs-later boundaries.

## Why Now

Friends is strategically important and should not move into implementation as a loose idea cloud.

## In Scope

- first-beta connection model
- first-beta social floor
- profile dependency
- later challenge direction

## Out Of Scope

- implementation of the Friends surface itself

## Required Changes

- durable planning docs and canonical spec alignment

## Verification Required

- accepted planning checkpoint with explicit next sequence

## Success Definition

- `T-009` and `T-001` can be executed without reopening the high-level Friends product shape

## Open Risks

- the profile model still has to be built before Friends can ship
