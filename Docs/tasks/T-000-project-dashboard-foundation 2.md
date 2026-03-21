---
id: T-000
title: Project dashboard foundation
stage_id: S0
stage_name: Coordination Bootstrap
subsystem: coordination
priority: high
owner: Codex
depends_on: []
owned_paths:
  - Docs/AddOne_Main_Plan.md
  - Docs/Active_Work.md
  - Docs/tasks
  - Docs/agent-reports
  - README.md
  - tools/project-dashboard
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/Active_Work.md
  - Docs/tasks/README.md
  - Docs/agent-reports/README.md
  - README.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-16-coordination-project-dashboard-foundation.md
---

## Objective
Create the coordinator-facing dashboard foundation and the structured repo files it reads.

## Why Now
The repo already has enough implementation that progress is hard to track by memory or chat alone. We need a single visual entrypoint before further task splitting.

## In Scope
- Add the structured coordination files for active work and task briefs.
- Add metadata-friendly task brief and report conventions.
- Build the read-only dashboard workspace under `tools/project-dashboard`.
- Render overview, active work board, task detail, and reports from repo docs only.

## Out of Scope
- Editing tasks from the UI
- Product-facing app changes
- Replacing the product app with dashboard logic
- Any second source of truth outside the repo docs

## Required Changes
- Add `Docs/Active_Work.md` and `Docs/tasks/*.md`.
- Update report conventions so reports can be indexed reliably.
- Add a Vite-based internal dashboard that reads markdown files via a loader.
- Add smoke-testable loader behavior, warnings, and empty states.

## Verification Required
- Loader tests for empty, normal, dependent, and malformed states
- Dashboard build smoke test
- Manual check that the dashboard surfaces active tasks, trust levels, and latest reports

## Success Definition
- The dashboard answers where we are, what is active, what is blocked, what was done, and what is trusted.
- Coordination docs and dashboard render the same truth.
- The dashboard stays read-only.

## Open Risks
- Local dependency layout may require a dedicated `npm install` inside the dashboard workspace later.
- Any future change to markdown structure must preserve the documented table and frontmatter shapes.
