---
id: T-045
title: Publish blocker remediation and release-candidate rerun
stage_id: S4
stage_name: Beta Hardening And Durable Release Memory
subsystem: cross-platform
priority: high
owner: Unassigned
depends_on:
  - T-044
owned_paths:
  - Docs/AddOne_Beta_Environment.md
  - app
  - firmware
  - services
  - eas.json
  - app.config.js
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/git-operations.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md
  - Docs/tasks/T-044-internal-release-candidate-validation-and-publish-blockers.md
  - Docs/agent-reports/2026-03-27-internal-release-candidate-validation-and-publish-blockers.md
  - Docs/AddOne_Beta_Environment.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-27-publish-blocker-remediation-and-release-candidate-rerun.md
---

## Objective
Clear the explicit publish blockers found in `T-044`, then rerun the same release-candidate validation matrix on the corrected baseline.

## Why Now
`T-044` reduced submission readiness to a small concrete blocker list:
- one board in the RC cohort is not OTA-capable on the user-triggered path
- no fresh installable artifacts exist for the accepted March 27 baseline
- Android has no finished build, but the current launch policy is iOS-first unless a shared release issue forces Android back into the same gate

## In Scope
- Reflash `AO_A4F00F767008` to the accepted OTA-capable baseline or explicitly remove it from the RC cohort
- Produce fresh installable iOS artifacts from the accepted release-candidate baseline
- Record Android as a deferred follow-up track unless the user explicitly reopens Android as part of the same launch gate
- Rerun the `T-044` validation matrix on the corrected baseline
- Update the runbook and report to reflect the actual final release-candidate state

## Out Of Scope
- Broad feature work
- Broad UI polish
- New OTA architecture
- Store metadata and submission copy

## Required Changes
- The RC cohort must no longer include a board that rejects `begin_firmware_update`
- Fresh installable iOS artifacts must exist for the accepted release-candidate baseline
- The validation matrix must be rerun against those real artifacts

## Verification Required
- Exact files changed
- Exact remediation actions taken on `AO_A4F00F767008`
- Exact build artifacts produced
- Exact rerun matrix and results
- Explicit remaining blocker list, if any

## Success Definition
- The current blocker list shrinks materially or goes to zero
- The project can either move to store-submission prep or point to one final finite blocker list with no ambiguity
