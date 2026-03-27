---
id: T-039
title: Firmware OTA control plane and release registry
stage_id: S4
stage_name: Beta Hardening And Durable Release Memory
subsystem: cross-platform
priority: high
owner: Unassigned
depends_on:
  - T-038
owned_paths:
  - supabase
  - Docs/AddOne_Device_Cloud_Contract.md
  - Docs/AddOne_Beta_Environment.md
  - Docs/AddOne_Firmware_V2_Architecture.md
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/git-operations.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md
  - Docs/tasks/T-038-firmware-ota-safety-model-and-release-contract.md
  - Docs/agent-reports/2026-03-26-firmware-ota-safety-model-and-release-contract.md
  - Docs/tasks/T-029-app-and-firmware-update-strategy.md
  - Docs/agent-reports/2026-03-26-firmware-ota-architecture-and-rollout-plan.md
  - Docs/AddOne_Device_Cloud_Contract.md
  - Docs/AddOne_Firmware_V2_Architecture.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-26-firmware-ota-control-plane-and-release-registry.md
---

## Objective
Implement the backend OTA control plane and release registry that the firmware client will rely on, using the safety model frozen in `T-038`.

## Why Now
The rollout baseline and OTA safety contract are both accepted. The next missing layer is the server-side source of truth for release eligibility, staged rollout state, per-device OTA progress, and explicit update triggers.

## In Scope
- Add the backend release registry and related release-state model
- Implement release eligibility lookup for devices
- Implement per-device OTA progress reporting
- Implement the trigger path that lets the app or operator request a firmware update for a specific device and release
- Update the scoped device cloud contract and release docs to match the implemented control plane

## Out Of Scope
- Full firmware OTA client implementation
- Broad app-side update UX
- Operator console or broad rollout tooling

## Required Changes
- The repo must contain one concrete control-plane path for:
  - `check_device_firmware_release(...)`
  - `report_device_ota_progress(...)`
  - `begin_firmware_update`
- Release-state enforcement must respect the frozen `T-038` contract
- Rollback targeting and prior-stable semantics must be modeled explicitly enough for the firmware client to trust

## Verification Required
- Exact schema/RPC/doc references for the new OTA control plane
- Proof that the backend pieces exist and are internally consistent
- Explicit note of what the next firmware OTA client slice can rely on

## Success Definition
- The firmware OTA client can be implemented against a stable backend contract
- Release eligibility, rollout state, and progress reporting no longer depend on implied future behavior
- The next slice can move to firmware OTA client implementation without reopening control-plane design
