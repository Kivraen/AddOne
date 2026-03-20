---
id: T-003
title: Real-device validation pass
subsystem: firmware
priority: high
owner: Unassigned
depends_on:
  - T-002
owned_paths:
  - firmware/
  - app/
  - Docs/AddOne_Device_Cloud_Contract.md
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/AddOne_Device_Cloud_Contract.md
  - Docs/AddOne_Device_AP_Provisioning_Contract.md
success_gate: Strict gate
report_path: Docs/agent-reports/<YYYY-MM-DD>-real-device-validation-pass.md
---

# T-003 Real-Device Validation Pass

## Objective

Validate the real app-device-cloud flow on actual hardware and networks.

## Why Now

This starts after hosted beta is ready.

## In Scope

- onboarding
- daily toggle behavior
- settings apply
- recovery
- reconnect healing

## Out Of Scope

- broad product redesign

## Required Changes

- targeted firmware or app fixes found during validation

## Verification Required

- device-by-device validation notes and evidence

## Success Definition

- the real-device beta path is trusted enough for wider testing

## Open Risks

- depends on hosted beta stability
