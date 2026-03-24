---
id: T-022
title: Factory station release promotion and broader bench validation
stage_id: S2
stage_name: Trusted Real-Device Validation
subsystem: cross-platform
priority: high
owner: Unassigned
depends_on:
  - T-021
owned_paths:
  - firmware/releases
  - firmware/src
  - firmware/include
  - tools/factory-station
  - Docs/AddOne_Main_Plan.md
  - Docs/AddOne_Device_Cloud_Contract.md
  - Docs/AddOne_Backend_Model.md
  - Docs/plans
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/git-operations.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-02-trusted-real-device-validation.md
  - Docs/tasks/T-003-real-device-validation-pass.md
  - Docs/tasks/T-021-factory-qa-and-ship-ready-bring-up-plan.md
  - Docs/agent-reports/2026-03-22-factory-qa-and-ship-ready-bring-up-plan.md
  - Docs/AddOne_Device_Cloud_Contract.md
  - Docs/AddOne_Backend_Model.md
  - firmware/README.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-24-factory-station-release-promotion-and-bench-validation.md
---

## Objective
Promote the beta factory station from a branch-candidate workflow into a stable repeatable bench process with an approved firmware artifact, broader multi-board proof, and clearer retry or rework handling.

## Why Now
`T-021` established the first working factory station and one successful live board run. Before operators depend on it routinely, the repo still needs an approved stable release artifact and wider validation across more boards and failure paths.

## In Scope
- Promote the factory manifest from branch-candidate firmware to an approved stable artifact flow
- Validate the station on multiple known-good boards
- Validate intentional failure or rework paths where practical
- Tighten retry and rework visibility in the operator workflow and backend records
- Update scoped docs and runbooks so the promoted workflow is explicit

## Out Of Scope
- Broad security hardening beyond the station-specific release and retry path
- Customer onboarding redesign
- Friends or app-surface work

## Verification Required
- Evidence from multiple real board runs
- Evidence for at least one meaningful retry or rework scenario
- Clear proof of which release artifact is approved for operator use

## Success Definition
- The station is no longer tied to a branch-candidate artifact.
- Operators can use one explicit approved firmware release.
- The workflow is trusted across more than one successful board run.
- Retry and rework behavior are documented and evidenced.
