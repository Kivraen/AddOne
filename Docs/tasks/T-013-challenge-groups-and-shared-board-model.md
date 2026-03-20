---
id: T-013
title: Challenge groups and shared board model
stage_id: S3
stage_name: Beta UI Completion And Social Shape
required_skills:
  - .agents/skills/building-native-ui/SKILL.md
subsystem: app
priority: medium
owner: Unassigned
depends_on:
  - T-001
owned_paths:
  - app/(app)
  - components/app
  - hooks
  - lib/supabase/addone-repository.ts
  - providers
  - types/addone.ts
  - Docs/AddOne_V1_Canonical_Spec.md
  - Docs/ui-beta-issue-log.md
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/AddOne_V1_Canonical_Spec.md
  - Docs/AddOne_Backend_Model.md
  - Docs/plans/friends-beta-plan.md
  - Docs/ui-beta-issue-log.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-19-challenge-groups-and-shared-board-model.md
---

## Objective
Define the post-beta challenge-group product model so AddOne can later support shared-goal groups, aggregated challenge boards, and group communication without forcing those decisions into the first beta launch.

## Why Now
The user has already articulated a clear next-wave social concept: a group challenge where several people share the same goal and the board intensity reflects how many members completed that day. This should be preserved in repo memory now so first-beta friends work does not accidentally box it out.

## In Scope
- Lock the product model for shared-goal challenges.
- Define how challenge boards differ from:
  - private personal boards
  - friend-board browsing
- Define the aggregated board rule where color intensity or brightness reflects completion count for the group.
- Define the join rule:
  - challenge participation starts from the moment a user joins
  - prior personal board history does not silently backfill the challenge
- Define the per-user rule:
  - each participant still keeps their own weekly success / fail outcome
- Define the overlay rule:
  - the current user's own completion stays the strongest / full-intensity state
  - other participants' completion can tint otherwise empty days
- Decide whether challenge should remain app-first or ever reach the device surface, without assuming it overrides the personal board by default.
- Define what communication belongs around a challenge group.
- Bound how challenge membership fits a `single-habit` product if users can theoretically join more than one challenge.
- Bound the data/model implications so future execution can use reliable managed infrastructure rather than bespoke chat systems.

## Out of Scope
- Shipping challenge groups in first beta
- Implementing full chat or threaded messaging
- Broad notification system work
- Multi-device redesign

## Required Changes
- Preserve the challenge-group concept in durable docs.
- Make the separation explicit between:
  - private boards
  - friend-board browsing
  - shared-goal challenge boards
- Preserve the rule that the personal board remains the default truth-view unless a future explicit challenge mode is accepted.
- Bound the likely backend and UI implications without overcommitting to an implementation too early.

## Verification Required
- Doc consistency across the main plan, canonical spec, and issue log
- Explicit note of what remains future-facing versus first-beta scope

## Success Definition
- A future agent can understand the intended challenge-group direction without chat history.
- The first-beta friends implementation will not accidentally close off the shared-goal board model.

## Open Risks
- The eventual communication stack should prefer managed, reliable primitives rather than a custom realtime chat system built prematurely.
- The final aggregated-board visual language will need careful design validation once the feature is actually in scope.
- If challenge ever overrides the personal board too aggressively, it could break the quiet device-first ritual that defines AddOne.
- Multiple simultaneous challenges could pull the product away from its `single-habit` focus unless the rule is kept very explicit.
