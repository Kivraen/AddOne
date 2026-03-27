---
id: T-047
title: Friends controls and release-candidate UI iteration
stage_id: S4
stage_name: Beta Hardening And Durable Release Memory
subsystem: app
priority: medium
owner: Unassigned
depends_on:
  - T-046
owned_paths:
  - components/app
  - components/layout
  - components/settings
  - hooks
  - lib
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/git-operations.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md
  - Docs/agent-reports/2026-03-27-release-candidate-easy-ui-cleanup.md
  - Docs/AddOne_UI_Direction.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-27-friends-controls-and-release-candidate-ui-iteration.md
---

## Objective
Ship the user-guided Friends controls redesign and the adjacent release-candidate UI cleanups that were explicitly requested while the iOS artifact gate in `T-045` is blocked externally.

## Why Now
`T-045` is waiting on iOS artifact production. The user chose to spend that idle time on bounded release-candidate UI improvements instead of broad polish or new feature work.

## In Scope
- Redesign the Friends top-right controls into a clearer AddOne-style actions surface
- Improve the join/share code flow and related sheet transitions
- Make the requested local UI polish updates on Home, Friends, and board settings surfaces
- Carry one small runtime confirmation-state stabilization only if it directly supports the surfaced UI behavior and stays tightly scoped
- Record the final accepted branch state in a durable report

## Out Of Scope
- Weekly minimum-goal or history semantics changes
- Offline-sync and multi-day reconnect reliability work
- OTA architecture or backend changes
- Broad product redesign or open-ended polish

## Required Changes
- The Friends actions menu must be materially clearer than the prior implementation
- Requested UI tweaks must remain release-candidate quality improvements, not a new product-scope pass
- Any non-UI code on the branch must stay small, explicit, and justified by the surfaced interaction

## Verification Required
- `npm run typecheck`
- Exact files changed
- Metro + iOS Simulator proof for the final UI
- Explicit note of any requested item deferred because it belongs to later planning

## Success Definition
- The user-guided Friends controls redesign and related UI tweaks are accepted as materially better
- The branch stays within a bounded release-candidate UI iteration scope
- `T-045` remains the main blocked release gate and is not silently replaced by polish work
