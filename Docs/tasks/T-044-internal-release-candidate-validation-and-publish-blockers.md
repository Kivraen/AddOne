---
id: T-044
title: Internal release-candidate validation and publish blockers
stage_id: S4
stage_name: Beta Hardening And Durable Release Memory
subsystem: cross-platform
priority: high
owner: Unassigned
depends_on:
  - T-043
owned_paths:
  - Docs/AddOne_Beta_Environment.md
  - Docs/AddOne_Main_Plan.md
  - app
  - firmware
  - services
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/git-operations.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md
  - Docs/tasks/T-043-operator-rollout-and-rollback-tooling.md
  - Docs/tasks/T-029-app-and-firmware-update-strategy.md
  - Docs/agent-reports/2026-03-27-operator-rollout-and-rollback-tooling.md
  - Docs/agent-reports/2026-03-27-minimum-app-update-and-firmware-status-surfaces.md
  - Docs/agent-reports/2026-03-26-firmware-ota-artifact-hosting-and-hardware-validation.md
  - Docs/AddOne_Beta_Environment.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-27-internal-release-candidate-validation-and-publish-blockers.md
---

## Objective
Run one focused internal release-candidate validation pass on the real beta stack and produce the final concrete blocker list before App Store / Play Store submission work starts.

## Why Now
The transport hardening, OTA path, owner-facing update surface, and operator rollout tooling are now accepted. The next risk is not missing infrastructure. It is whether the full installable app plus real boards plus OTA path behave cleanly enough to justify store submission.

## In Scope
- One internal release-candidate validation matrix on the real beta environment
- App-side validation on installable builds, not only dev-only Metro flows where practical
- Device-side validation on the accepted OTA-capable baseline
- Explicit publish blocker list with severity and owner
- Runbook/report updates so store submission readiness is factual

## Out Of Scope
- Broad new feature work
- Broad UI polish
- New OTA architecture
- Full public launch rollout

## Required Changes
- Validate the current beta stack end to end on the actual intended release path
- Produce an explicit publish-blocker list instead of leaving readiness implicit

## Verification Required
- Exact files changed
- Exact validation matrix used
- Evidence for passed and failed checks
- Explicit publish blocker list
- Explicit recommendation: ready for store-submission prep or not yet

## Success Definition
- The team has one concrete internal release-candidate checkpoint
- Remaining store blockers, if any, are explicit and finite
- The next slice can move into submission prep instead of more vague hardening
