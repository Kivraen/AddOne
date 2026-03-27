---
id: T-043
title: Operator rollout and rollback tooling
stage_id: S4
stage_name: Beta Hardening And Durable Release Memory
subsystem: cross-platform
priority: high
owner: Unassigned
depends_on:
  - T-041
  - T-042
  - T-029
owned_paths:
  - deploy
  - services
  - supabase
  - Docs/AddOne_Beta_Environment.md
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/git-operations.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md
  - Docs/tasks/T-029-app-and-firmware-update-strategy.md
  - Docs/tasks/T-041-firmware-ota-artifact-hosting-and-hardware-validation.md
  - Docs/tasks/T-042-minimum-app-update-and-firmware-status-surfaces.md
  - Docs/agent-reports/2026-03-26-firmware-ota-artifact-hosting-and-hardware-validation.md
  - Docs/agent-reports/2026-03-27-minimum-app-update-and-firmware-status-surfaces.md
  - Docs/AddOne_Beta_Environment.md
  - Docs/AddOne_Device_Cloud_Contract.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-27-operator-rollout-and-rollback-tooling.md
---

## Objective
Add the minimum operator tooling needed to manage immutable firmware releases safely in beta: activate a release, target devices, roll back a release, and verify rollout state without manual ad hoc database work.

## Why Now
The OTA path is now real on hardware and the app has a minimal owner-facing update surface. The next operational gap is repeatable release management for the beta environment.

## In Scope
- One bounded operator workflow for:
  - activating a release
  - allowlisting or targeting devices
  - rolling back an active release
  - inspecting rollout state
- Keep immutable release IDs and previous-stable rollback rules intact
- Update the beta runbook so the operator path is explicit and repeatable

## Out Of Scope
- Broad public admin console work
- End-user app UI beyond the already accepted `T-042` surface
- OTA architecture redesign

## Required Changes
- Operators must no longer need scattered one-off commands to manage beta rollout state
- The release/rollback path must align with the accepted OTA safety and control-plane contract

## Verification Required
- Exact files changed
- Exact operator commands or tool flows exercised
- Proof of one real activation or rollback flow against the beta backend
- Explicit note of any remaining manual step that still exists

## Success Definition
- Beta release management is repeatable and durable
- Rollback remains constrained to the accepted immutable release model
- The next stage can focus on broader release confidence rather than missing operator basics
