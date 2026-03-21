---
id: T-008
title: Onboarding and Wi-Fi recovery polish batch
subsystem: app
priority: medium
owner: Unassigned
depends_on:
  - T-001
owned_paths:
  - app/(app)/onboarding/
  - app/(app)/devices/
  - components/
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/ui-beta-issue-log.md
success_gate: Strict gate
report_path: Docs/agent-reports/<YYYY-MM-DD>-onboarding-and-wifi-recovery-polish.md
---

# T-008 Onboarding And Wi-Fi Recovery Polish

## Objective

Deliver the final visible UI polish pass for onboarding and Wi-Fi recovery.

## Why Now

This slice is intentionally held until after Friends planning and Friends execution so the beta surface can end in one clean pass.

## In Scope

- onboarding polish
- Wi-Fi recovery polish
- copy and state refinement

## Out Of Scope

- Friends implementation
- broad account redesign

## Required Changes

- app-side polish and acceptance cleanup

## Verification Required

- manual simulator or device proof across onboarding and recovery

## Success Definition

- onboarding and recovery feel deliberate and beta-ready

## Open Risks

- should remain the last visible UI pass inside `S3`
