---
id: T-038
title: Firmware OTA safety model and release contract
stage_id: S4
stage_name: Beta Hardening And Durable Release Memory
subsystem: cross-platform
priority: high
owner: Unassigned
depends_on:
  - T-036
  - T-037
  - T-029
owned_paths:
  - firmware
  - supabase
  - Docs/AddOne_Beta_Environment.md
  - Docs/AddOne_Device_Cloud_Contract.md
  - Docs/AddOne_Device_Realtime_Transport.md
  - Docs/AddOne_Firmware_V2_Architecture.md
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/git-operations.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md
  - Docs/tasks/T-029-app-and-firmware-update-strategy.md
  - Docs/agent-reports/2026-03-26-firmware-ota-architecture-and-rollout-plan.md
  - Docs/agent-reports/2026-03-26-launch-readiness-coordinator-plan.md
  - Docs/agent-reports/2026-03-26-release-operations-cleanup-and-launch-baseline.md
  - Docs/agent-reports/2026-03-26-mqtt-tls-acceptance-and-device-reprovisioning.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-26-firmware-ota-safety-model-and-release-contract.md
---

## Objective
Define and implement the minimum firmware OTA safety contract that must exist before AddOne starts building the OTA control plane or shipping firmware updates to real user devices.

## Why Now
The transport and hosted rollout baseline is now accepted. The next risk is not transport anymore; it is shipping an OTA mechanism without a clear device-side safety model for staging, verification, rollback, and release eligibility.

## In Scope
- Define the device-side OTA safety rules:
  - release eligibility
  - staged rollout expectations
  - verification before commit
  - failure fallback and boot rollback behavior
  - pause or rollback semantics
- Implement the minimum firmware and contract changes needed to support that safety model
- Update the scoped release and firmware docs so the OTA safety contract is explicit

## Out Of Scope
- Full OTA control-plane implementation
- Full app-side update UX
- Broad release-console tooling

## Required Changes
- The repo must have one explicit OTA safety contract another engineer can implement against
- Firmware-side release acceptance and rollback assumptions must be concrete, not implied
- The next OTA slices must have a stable contract for manifests, rollout status, and failure handling

## Verification Required
- Firmware build proof if code changes land
- Exact doc and contract references for the OTA safety model
- Explicit statement of what the next OTA implementation slice can rely on

## Success Definition
- OTA implementation can proceed without reopening the trust or rollback model
- The release contract is durable in-repo rather than trapped in planning notes
- The next slice can move to OTA control-plane implementation from a clear safety baseline
