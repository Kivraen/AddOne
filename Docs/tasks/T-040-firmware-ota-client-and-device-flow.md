---
id: T-040
title: Firmware OTA client and device flow
stage_id: S4
stage_name: Beta Hardening And Durable Release Memory
subsystem: firmware
priority: high
owner: Unassigned
depends_on:
  - T-039
owned_paths:
  - firmware
  - Docs/AddOne_Device_Cloud_Contract.md
  - Docs/AddOne_Firmware_V2_Architecture.md
  - Docs/AddOne_Beta_Environment.md
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/git-operations.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md
  - Docs/tasks/T-038-firmware-ota-safety-model-and-release-contract.md
  - Docs/tasks/T-039-firmware-ota-control-plane-and-release-registry.md
  - Docs/tasks/T-029-app-and-firmware-update-strategy.md
  - Docs/agent-reports/2026-03-26-firmware-ota-safety-model-and-release-contract.md
  - Docs/agent-reports/2026-03-26-firmware-ota-control-plane-and-release-registry.md
  - Docs/AddOne_Device_Cloud_Contract.md
  - Docs/AddOne_Firmware_V2_Architecture.md
  - Docs/AddOne_Beta_Environment.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-26-firmware-ota-client-and-device-flow.md
---

## Objective
Implement the firmware-side OTA client against the accepted `T-038` safety contract and accepted `T-039` backend control plane so a device can safely discover, stage, boot, confirm, and roll back an application-image update.

## Why Now
The OTA safety rules and backend control plane are both now explicit and accepted. The next missing layer is the actual device implementation that consumes those contracts and proves the OTA path is real end to end.

## In Scope
- Call the OTA control-plane path from firmware:
  - `check_device_firmware_release(...)`
  - `report_device_ota_progress(...)`
  - `begin_firmware_update(...)` command handling
- Download the inactive-slot application artifact over authenticated HTTPS
- Enforce the accepted OTA safety flow on-device:
  - stage only the inactive app slot
  - verify before boot switch
  - boot into the new slot
  - use the local confirmation window
  - roll back automatically on failure or non-confirmation
- Update the scoped firmware and cloud docs to match the real client flow

## Out Of Scope
- Broad app-side update UX
- Operator rollout console or release-authoring tooling
- Bootloader or partition-table OTA

## Required Changes
- The firmware must implement one concrete OTA client path using the accepted `T-039` backend contract
- Device OTA state transitions must be reported durably through `report_device_ota_progress(...)`
- On-device staging, boot, confirm, and rollback behavior must match the frozen `T-038` safety model

## Verification Required
- Firmware build proof
- Exact firmware and contract references for the client path
- Real-device proof of at least one OTA path step if feasible in the slice
- Explicit note of what the next app update or operator slice can now rely on

## Success Definition
- The device can participate in the OTA flow without implied future behavior
- OTA progress and terminal failures are visible through the accepted backend sink
- The next slice can add minimal app update surfaces or rollout tooling without reopening the firmware-side model
