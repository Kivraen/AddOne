---
id: T-000
title: Project dashboard foundation
subsystem: coordination
priority: medium
owner: Codex
depends_on: []
owned_paths:
  - tools/project-dashboard/
  - Docs/Active_Work.md
  - Docs/agent-reports/
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/Active_Work.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-16-coordination-project-dashboard-foundation.md
---

# T-000 Project Dashboard Foundation

## Objective

Create the internal coordination dashboard foundation that renders live repo planning state.

## Why Now

This was the original visibility layer for the coordination system.

## In Scope

- dashboard data model
- overview of tasks, reports, and current stage

## Out Of Scope

- product app UI
- direct work management in the dashboard

## Required Changes

- coordination docs and dashboard loader

## Verification Required

- loader parses repo docs
- dashboard build succeeds

## Success Definition

- dashboard foundation exists as a real internal tool

## Open Risks

- The historical dashboard source is not currently restored in the clean recovery repo and may need deliberate rebuild if the dashboard is still desired.
