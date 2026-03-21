---
id: T-011
title: Beta timezone capability and picker baseline
subsystem: cross-platform
priority: medium
owner: Ptolemy
depends_on:
  - T-006
owned_paths:
  - app/(app)/onboarding/
  - app/(app)/devices/
  - components/settings/
  - lib/
  - firmware/src/
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/AddOne_V1_Canonical_Spec.md
  - Docs/ui-beta-issue-log.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-18-beta-timezone-capability-and-picker-baseline.md
---

# T-011 Beta Timezone Capability And Picker Baseline

## Objective

Implement the beta timezone picker and capability baseline across app and firmware.

## Why Now

The audit is complete, but the implementation still needs acceptance closure.

## In Scope

- regional timezone picker
- advanced fixed UTC offset mode
- onboarding, settings, and recovery wiring
- minimum firmware capability required for supported beta zones

## Out Of Scope

- full global timezone expansion
- viewer/display timezone feature

## Required Changes

- UI, runtime, and firmware timezone handling

## Verification Required

- typecheck
- runtime tests
- manual proof for onboarding, settings, recovery, and fixed-offset flow

## Success Definition

- the beta timezone path is explicit, honest, and manually verified

## Open Risks

- current status is `revise and retry` because reset-time handling and manual proof are not fully closed
