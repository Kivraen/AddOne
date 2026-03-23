---
id: T-021
title: Factory QA and ship-ready bring-up plan
stage_id: S2
stage_name: Trusted Real-Device Validation
subsystem: cross-platform
priority: high
owner: Unassigned
depends_on:
  - T-018
owned_paths:
  - Docs/AddOne_Main_Plan.md
  - Docs/AddOne_Device_Cloud_Contract.md
  - Docs/AddOne_Backend_Model.md
  - Docs/AddOne_Firmware_V2_Architecture.md
  - firmware/README.md
  - firmware/src
  - firmware/include
  - firmware/platformio.ini
  - lib/supabase
  - supabase/migrations
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/git-operations.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-02-trusted-real-device-validation.md
  - Docs/AddOne_Device_Cloud_Contract.md
  - Docs/AddOne_Backend_Model.md
  - Docs/AddOne_Firmware_V2_Architecture.md
  - firmware/README.md
  - Docs/plans/2026-03-22-device-lifecycle-real-world-test-checklist.md
  - Docs/agent-reports/2026-03-22-factory-reset-remove-and-fresh-add-flow.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-22-factory-qa-and-ship-ready-bring-up-plan.md
---

## Objective
Research and lock the intended beta factory-QA workflow for a newly built device: flash the correct stable firmware, verify core hardware, preregister the device, record operator notes, and leave the board in a clean ship-ready customer state.

## Why Now
The next physical device build needs a repeatable bring-up and QA flow. The repo already has device identity generation, backend preregistration, onboarding claim logic, and destructive reset behavior, but it does not yet have an operator-facing manufacturing station or a clear test harness.

## In Scope
- Research how a new firmware flash currently derives `hardware_uid` and device auth token material
- Research how factory preregistration is currently expected to hit the backend
- Identify which tests can be:
  - fully automated
  - operator-assisted but digitally verified
  - manual visual confirmations only
- Plan the recommended operator workflow for:
  - selecting the correct stable firmware
  - flashing the board
  - opening a local QA tool or dashboard
  - running tests
  - recording notes like order number or recipient
  - marking the device ship-ready
  - resetting the board to unprovisioned customer state before shipment
- Recommend the tool architecture for a local QA station
- Identify required firmware, backend, and local-tool changes before implementation

## Out Of Scope
- Implementing the QA station
- Broad app UI redesign
- Friends work
- Customer onboarding redesign beyond what is necessary to define the handoff from factory to customer state
- Production-scale manufacturing systems beyond beta needs

## Required Changes
- Produce a durable planning report that explains:
  - the current first-flash and preregistration path
  - the target operator workflow
  - the proposed test matrix
  - the proposed local-tool architecture
  - the required backend or firmware support work
  - the recommended implementation order
- If needed, make narrow clarifications in scoped product or contract docs named above.

## Verification Required
- Exact code and doc references for the current device-registration and flash path
- Clear classification of tests into automated, operator-assisted, and manual
- A concrete recommendation for how the local QA tool should work
- A recommended sequence for implementation that keeps the first execution slice narrow

## Success Definition
- A fresh agent can understand how a new board should move from freshly flashed hardware to ship-ready state without relying on chat memory.
- The user can review an explicit proposed QA and bring-up workflow before implementation starts.
- The follow-up execution task can stay narrow because the architecture and workflow are already locked.

## Open Risks
- The current firmware does not yet expose a dedicated manufacturing-test protocol, so some QA steps may require new firmware support.
- A browser-only dashboard may not be sufficient if reliable serial control and flashing must happen from one local tool.
- The repo does not yet appear to store factory QA runs, operator notes, or shipment-ready signoff in the backend model.
