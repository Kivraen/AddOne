---
id: T-028
title: Beta security and production readiness audit
stage_id: S4
stage_name: Beta Hardening And Durable Release Memory
subsystem: cross-platform
priority: high
owner: Unassigned
depends_on:
  - T-002
  - T-003
owned_paths:
  - Docs/AddOne_Main_Plan.md
  - Docs/AddOne_Beta_Environment.md
  - Docs/AddOne_Beta_Hosting_Recommendation.md
  - Docs/AddOne_Device_Realtime_Transport.md
  - services/realtime-gateway
  - deploy
  - firmware/include
  - firmware/src
  - supabase
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md
  - Docs/AddOne_Beta_Environment.md
  - Docs/AddOne_Beta_Hosting_Recommendation.md
  - Docs/AddOne_Device_Realtime_Transport.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-24-beta-security-and-production-readiness-audit.md
---

## Objective
Audit the live beta stack for production-facing security and operational gaps before wider device distribution.

## Why Now
The user wants security and production trust treated as first-class release work, not as an afterthought after devices are already in circulation.

## In Scope
- Audit app, backend, gateway, broker, firmware, and deployment assumptions for beta-to-production risk.
- Identify current weak points around:
  - secrets handling
  - broker auth and ACLs
  - device auth material
  - transport security
  - operator or admin trust boundaries
  - release recovery and rollback
- Produce a concrete hardening sequence instead of a generic checklist.

## Out Of Scope
- Implementing every hardening change in one task
- Broad product feature work

## Success Definition
- The repo has one durable source of truth for what “secure enough for wider beta” still requires.
- Security and release hardening are split into concrete follow-up slices rather than vague future work.
