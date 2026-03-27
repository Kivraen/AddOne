---
id: T-046
title: Release-candidate easy UI cleanup
stage_id: S4
stage_name: Beta Hardening And Durable Release Memory
subsystem: app
priority: medium
owner: Unassigned
depends_on:
  - T-044
owned_paths:
  - app
  - components
  - hooks
  - lib
  - Docs/AddOne_Beta_Environment.md
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
  - Docs/AddOne_UI_Direction.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-27-release-candidate-easy-ui-cleanup.md
---

## Objective
Fix a narrow set of easy release-candidate UI issues without widening into behavior, history semantics, or device-sync work.

## Why Now
`T-045` is blocked on external iOS artifact production. The user explicitly opened a parallel track for cheap UI cleanup while that external blocker is pending, but does not want the next agent to expand into broader bug-fixing or planning work yet.

## In Scope
- Remove the leftover temporary celebrations list or similar temporary UI from board settings if it is still present
- Fix small obvious UI issues found directly on the same affected settings surfaces if they are cheap and clearly release-quality issues
- Use Metro + Simulator proof for native app verification
- Update the scoped runbook/report so they reflect the final UI state

## Out Of Scope
- Weekly minimum-goal behavior or history semantics
- Offline-for-days device resync behavior
- Broad app-wide bug bash or broad polish
- OTA architecture, rollout tooling, or build pipeline work
- Coordinator-owned docs like `project-memory.md`, the stage register, the master plan, or `Active_Work.md`

## Required Changes
- The targeted settings UI should no longer expose known temporary or obviously incorrect release-candidate affordances
- The slice must stay compact and avoid turning into a broad cleanup pass

## Verification Required
- `npm run typecheck`
- Exact files changed
- Manual Metro/Simulator proof of the cleaned-up surface
- Explicit note of any UI issue intentionally left alone because it belongs to later planning or behavior work

## Success Definition
- The cheap UI leftovers identified by the user are removed or corrected
- The branch stays narrow enough that later behavior/history/offline work can be planned separately instead of being mixed into this slice
