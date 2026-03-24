---
id: T-023
title: Factory station security hardening and trust boundaries
stage_id: S4
stage_name: Beta Hardening And Durable Release Memory
subsystem: cross-platform
priority: medium
owner: Unassigned
depends_on:
  - T-021
owned_paths:
  - tools/factory-station
  - Docs/AddOne_Main_Plan.md
  - Docs/AddOne_Device_Cloud_Contract.md
  - Docs/AddOne_Backend_Model.md
  - Docs/AddOne_Beta_Environment.md
  - firmware/include
  - firmware/src
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/git-operations.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md
  - Docs/tasks/T-021-factory-qa-and-ship-ready-bring-up-plan.md
  - Docs/agent-reports/2026-03-22-factory-qa-and-ship-ready-bring-up-plan.md
  - Docs/AddOne_Device_Cloud_Contract.md
  - Docs/AddOne_Backend_Model.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-24-factory-station-security-hardening-and-trust-boundaries.md
---

## Objective
Harden the factory station trust model before wider operator usage, including local auth, secret handling, USB-admin assumptions, and any factory-only firmware or backend access surfaces introduced by `T-021`.

## Why Now
The first beta station works, but it currently relies on a trusted local environment and bench assumptions. That is acceptable for initial proof, but not the final trust model for wider operator use.

## In Scope
- Review local station auth and session-token handling
- Review service-role secret handling
- Review factory-only firmware access assumptions
- Review backend privileges and factory-only record paths
- Clarify the intended trusted-operator model in scoped docs

## Out Of Scope
- Rebuilding the station UI from scratch
- Broad release engineering outside factory-station security
- Customer-facing app UX work

## Verification Required
- Explicit trust-boundary documentation
- Concrete hardening changes with evidence
- Clear statement of what remains trusted by physical access versus what is technically enforced

## Success Definition
- The station’s security posture is no longer “works on my bench” only.
- Operators and maintainers can see the intended trust model clearly.
- The factory path is harder to misuse accidentally.
