---
id: T-029
title: App and firmware update strategy
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
  - app.config.js
  - eas.json
  - firmware
  - services
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md
  - Docs/AddOne_Beta_Environment.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-24-app-and-firmware-update-strategy.md
---

## Objective
Define the shipped update model for both the mobile app and device firmware, including what is automatic, what is user-controlled, and how rollback or recovery should work.

## Why Now
Wider device distribution without a clear update policy is operationally risky. The user wants automatic updates as the default direction, with the option to disable when appropriate, but that needs a deliberate technical and product plan first.

## In Scope
- Define the intended beta and production update path for:
  - Expo app updates
  - TestFlight or store builds
  - device firmware updates
- Decide what should be automatic by default versus user-controlled.
- Define the failure and rollback model.
- Record any infrastructure, firmware, app, or UX prerequisites needed before rollout.

## Out Of Scope
- Implementing the full OTA system in one task
- Broad feature work unrelated to updates

## Success Definition
- Another engineer can explain how AddOne is expected to update in the field without relying on chat memory.
- The team has an explicit roadmap for safe automatic updates rather than an implied future assumption.
