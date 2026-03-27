---
id: T-041
title: Firmware OTA artifact hosting and hardware validation
stage_id: S4
stage_name: Beta Hardening And Durable Release Memory
subsystem: cross-platform
priority: high
owner: Unassigned
depends_on:
  - T-040
owned_paths:
  - firmware
  - deploy
  - Docs/AddOne_Beta_Environment.md
  - Docs/AddOne_Device_Cloud_Contract.md
  - Docs/AddOne_Firmware_V2_Architecture.md
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/git-operations.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md
  - Docs/tasks/T-040-firmware-ota-client-and-device-flow.md
  - Docs/tasks/T-039-firmware-ota-control-plane-and-release-registry.md
  - Docs/tasks/T-038-firmware-ota-safety-model-and-release-contract.md
  - Docs/tasks/T-029-app-and-firmware-update-strategy.md
  - Docs/agent-reports/2026-03-26-firmware-ota-client-and-device-flow.md
  - Docs/agent-reports/2026-03-26-firmware-ota-control-plane-and-release-registry.md
  - Docs/agent-reports/2026-03-26-firmware-ota-safety-model-and-release-contract.md
  - Docs/AddOne_Beta_Environment.md
  - Docs/AddOne_Device_Cloud_Contract.md
  - Docs/AddOne_Firmware_V2_Architecture.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-26-firmware-ota-artifact-hosting-and-hardware-validation.md
---

## Objective
Make the OTA path real end to end by publishing one immutable firmware artifact over trusted HTTPS, creating a real release row, and exercising the device OTA flow on hardware against the accepted `T-038`, `T-039`, and `T-040` contracts.

## Why Now
The OTA client now exists in firmware, but it is only compile-proven. The next risk is not more client structure; it is whether the real artifact, control plane, and device boot-confirmation path work together on actual hardware.

## In Scope
- Produce one real OTA artifact from the accepted firmware build
- Host that artifact at an immutable CA-validated HTTPS URL
- Create one real `firmware_releases` row compatible with the accepted OTA contract
- Exercise the OTA flow on hardware:
  - eligibility check
  - staged download
  - inactive-slot write
  - provisional boot
  - local confirmation
  - backend-visible status progression
- Update the scoped docs and runbook notes to match the real validation path

## Out Of Scope
- Broad app-side update UX
- Broad operator rollout console work
- Non-firmware release tooling beyond what is strictly needed to validate one real OTA flow

## Required Changes
- The repo and hosted environment must have one real immutable OTA artifact path the firmware can use
- One real release record must exist and match the accepted contract
- The device-side OTA path must be proven on hardware against the accepted backend sink and release registry

## Verification Required
- Firmware build proof for the released artifact
- Exact hosted artifact and release-contract references
- Real hardware proof of the OTA path
- Explicit note of any remaining gap before app update surfaces or operator tooling

## Success Definition
- The firmware OTA path is no longer only compile-proven
- The backend-visible OTA states and real boot-confirmation path are validated on hardware
- The next slice can add minimal app update surfaces or operator tooling on top of a real OTA baseline
