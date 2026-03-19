---
id: T-001
title: Beta Friends surface and social floor
stage_id: S3
stage_name: Beta UI Completion And Social Shape
required_skills:
  - .agents/skills/building-native-ui/SKILL.md
subsystem: app
priority: high
owner: Unassigned
depends_on:
  - T-015
owned_paths:
  - app/(app)
  - components/app
  - hooks
  - lib/supabase/addone-repository.ts
  - providers
  - types/addone.ts
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/AddOne_V1_Canonical_Spec.md
  - Docs/AddOne_Backend_Model.md
  - Docs/plans/friends-beta-plan.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-16-app-beta-friends-surface.md
---

## Objective
Replace the placeholder `Friends` tab with the first real beta social flow: deliberate linking, browsing friends' boards, and one explicitly bounded lightweight engagement lane.

## Why Now
`Friends` is already visible in the product shell. Leaving it as placeholder UI makes the current app state confusing and breaks trust in the beta surface. The user has now made it explicit that first beta should include more than raw board sharing: people should be able to link up, browse each other's boards, and get at least a minimal sense of shared activity.

## In Scope
- Turn the `Friends` tab into a real social beta surface using the existing sharing schema and repository helpers where possible.
- Support deliberate person-to-person linking for the first beta.
- Let a signed-in user browse connected friends' boards and recent progress without mixing those boards into the owner's main board.
- Show the active device sharing state for the owner:
  - current share code
  - pending access requests
  - approved viewers or connected people
- Support the owner actions already exposed by the repository layer:
  - rotate share code
  - approve request
  - reject request
- Lock one bounded first-beta engagement lane:
  - lightweight reactions / likes
  - or an activity feed with lightweight reactions
  - or another equally narrow social floor that does not require inventing full messaging infrastructure
- Preserve room for later shared challenges without forcing that whole system into first beta.

## Out of Scope
- Full challenge-group implementation
- Heavy messaging infrastructure or open-ended social graph design
- Broad notifications or reminders system
- Multi-device management redesign
- New backend schema or RPC design unless a concrete bug blocks the existing flow

## Required Changes
- Lock the first-user beta connection model clearly enough to implement without inventing social architecture mid-task.
- Add data hooks for linked people, shared boards, active-device sharing state, and any accepted lightweight activity lane.
- Replace placeholder `Friends` copy with real loading, empty, error, and populated states.
- Render friends' boards read-only and keep them visually distinct from the owner's main board.
- Render owner sharing controls and viewer/request lists in the same tab or connected flow.
- Record what is explicitly deferred:
  - comments or threaded discussion
  - richer notifications
  - challenge groups and shared-goal group boards

## Verification Required
- Typecheck and app build smoke test
- Manual UI check for:
  - no linked friends / shared boards
  - linked friends / shared boards present
  - no pending requests
  - pending requests present
  - viewer / connected-people list present
  - accepted lightweight engagement lane present, if included in the task lock
- Confirm repository actions wire to the existing share RPCs or record the exact backend gap if the social floor needs one narrow addition

## Success Definition
- The visible `Friends` tab is real product flow, not placeholder copy.
- A signed-in user can link with other people and browse their boards in one coherent surface.
- The first beta social floor is explicit and bounded instead of being vague placeholder ambition.
- The implementation does not block later challenge groups or richer communication.

## Open Risks
- The exact first-beta engagement lane still needs a coordinator lock before implementation starts.
- The existing sharing backend may need one narrow extension if beta requires activity feed or reactions beyond the current viewer/share primitives.
- Realtime invalidation for sharing surfaces may need a follow-up if the first pass relies on manual refresh.
