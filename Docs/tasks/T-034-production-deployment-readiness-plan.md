---
id: T-034
title: Production deployment readiness plan
stage_id: S4
stage_name: Beta Hardening And Durable Release Memory
subsystem: cross-platform
priority: high
owner: Unassigned
depends_on:
  - T-028
  - T-029
owned_paths:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md
  - Docs/AddOne_Beta_Environment.md
  - Docs/AddOne_Beta_Hosting_Recommendation.md
  - Docs/AddOne_Device_Realtime_Transport.md
  - app.config.js
  - eas.json
  - services/realtime-gateway
  - firmware
  - supabase
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/git-operations.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md
  - Docs/tasks/T-028-beta-security-and-production-readiness-audit.md
  - Docs/tasks/T-029-app-and-firmware-update-strategy.md
  - Docs/AddOne_Beta_Environment.md
  - Docs/AddOne_Beta_Hosting_Recommendation.md
  - Docs/AddOne_Device_Realtime_Transport.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-25-production-deployment-readiness-plan.md
---

## Objective
Create one explicit publish-readiness plan that audits the real deployment path, current security posture, and app/firmware update model before any further UI polish or feature work.

## Why Now
The visible beta surface is already functional enough to ship. The bigger risk is distributing devices and the app without a clear production plan for security, deployment, updates, rollback, and operational ownership.

## In Scope
- Audit the real current mobile release path, backend deployment path, gateway/broker path, and firmware distribution path
- Identify security gaps that matter before wider release
- Identify update-model gaps for both the app and firmware
- Call out missing user-facing update controls or admin tooling if they are truly required for release
- Produce a concrete implementation sequence for publish readiness

## Out Of Scope
- Full implementation of every hardening or update feature
- Broad UI polish not directly required for release readiness
- New product features

## Required Changes
- Document the real current deployment and update paths as they exist today
- Separate already-sufficient behavior from risky gaps
- Decide which missing capabilities are mandatory before public release versus safe to defer
- Split the next work into concrete follow-up slices, likely including `T-028` and `T-029`

## Verification Required
- Exact code/doc references for the current deployment and update flows
- A concrete risk list with severity and rationale
- A publish-readiness implementation order
- A clear statement of what must exist before wider distribution

## Success Definition
- Another engineer can explain how AddOne is deployed, secured, and updated without relying on chat memory
- The repo has one durable source of truth for the remaining publish-readiness work
- The next implementation tasks are explicit enough to hand off cleanly
