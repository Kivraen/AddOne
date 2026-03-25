---
id: T-031
title: Friends UI experiment clarity and technical polish
stage_id: S3
stage_name: Beta UI Completion And Social Shape
subsystem: app
priority: medium
owner: Unassigned
depends_on:
  - T-001
  - T-027
  - T-030
owned_paths:
  - app/(app)
  - components/app
  - components/layout
  - hooks
  - providers
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/AddOne_UI_Direction.md
  - Docs/briefs/B-023-stage-s3-ui-skill-informed-beta-ui-audit.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-25-friends-ui-experiment-clarity-and-technical-polish.md
---

## Objective
Run a narrow UI experiment on the Friends surface: make the next action more obvious and clean up the most important technical UI issues surfaced by the audit, while keeping the branch easy to discard if the experiment is not good enough.

## Why Now
The audit showed that Friends is the main current mismatch with AddOne’s “one obvious next step” direction and is also the highest-value technical UI cleanup target. This makes it the best experimental polish slice before broader UI churn.

## In Scope
- Make one primary Friends action visible on the main tab instead of a menu-first interaction.
- Reduce confusion and fragmentation on the main Friends surface.
- Improve Friends safe-area and scroll handling.
- Reduce obvious technical UI waste in the Friends rendering path where practical.
- Keep the flow coherent across iOS and Android without inventing new social scope.

## Out Of Scope
- New Friends features
- New social architecture
- Reward display configuration
- AI artwork generation
- Broad onboarding or settings redesign
- Security or update strategy work

## Required Changes
- Use the audit findings from `T-030` as the starting point.
- Keep the experiment narrow and reversible.
- If the experiment changes navigation or overlays, prefer more native behavior rather than more custom chrome.
- Preserve the accepted Friends and celebration functionality while improving clarity and technical quality.

## Verification Required
- `npm run typecheck`
- manual UI proof on the main Friends flow after the experiment
- exact files changed
- explicit note of what was changed because of:
  - product clarity
  - safe-area or navigation correctness
  - rendering or performance cleanup

## Success Definition
- The main Friends tab has a clearer primary action and lower first-glance confusion.
- The technical UI issues fixed in this slice improve quality without changing product scope.
- The branch is safe to keep or discard because the experiment is isolated from `main`.

## Open Risks
- Friends is already a complex surface, so this experiment can easily drift into redesign if not kept tight.
- A technically better native pattern is not automatically better for AddOne if it adds chrome or complexity.
