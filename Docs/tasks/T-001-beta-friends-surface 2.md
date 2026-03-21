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
  - T-009
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
  - Docs/tasks/T-009-profile-identity-model-and-account-surface.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-16-app-beta-friends-surface.md
---

## Objective
Replace the placeholder `Friends` tab with the first real beta social flow: profile-gated unit sharing, owner-managed board access, and live read-only browsing of approved shared boards.

## Why Now
`Friends` is already visible in the product shell. Leaving it as placeholder UI makes the current app state confusing and breaks trust in the beta surface. The current planning lock now says the first implementation target is not a feed or messaging layer. It is the private unit-sharing flow itself, with real identity gating and real board access management.

## In Scope
- Turn the `Friends` tab into a real social beta surface using the existing device-sharing schema and repository helpers where possible.
- Respect the social-profile gate defined in `T-009`:
  - if the user has not completed the required friend-facing profile, route them into that flow before sharing unlocks
- Support deliberate unit-based linking for the first beta.
- Let a signed-in user browse connected friends' boards live and read-only without mixing those boards into the owner's main board.
- Show the active device sharing state for the owner:
  - current share code
  - pending access requests
  - approved viewers or connected people
- Support the owner actions already exposed by the repository layer:
  - rotate share code
  - approve request
  - reject request
- Support the request path for a signed-in user entering another person's share code.
- Preserve room for later shared challenges without forcing that whole system into first beta.

## Out of Scope
- Full challenge-group implementation
- Heavy messaging infrastructure or open-ended social graph design
- Broad notifications or reminders system
- Multi-device management redesign
- Username search / social discovery
- Activity feed
- Reactions
- Comments or threaded discussion
- New backend schema or RPC design unless a concrete bug blocks the existing flow

## Required Changes
- Reuse the current device-based share code plus approval contract instead of inventing a second social graph.
- Add data hooks for shared boards, active-device sharing state, and share-code request/approval actions.
- Replace placeholder `Friends` copy with real loading, empty, error, and populated states.
- Render friends' boards read-only and keep them visually distinct from the owner's main board.
- Render owner sharing controls and viewer/request lists in the same tab or connected flow.
- Make the `Friends` entry flow work with the profile-gating rule from `T-009`.
- Record what is explicitly deferred:
  - activity feed
  - reactions
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
  - profile-incomplete user gets the expected social-profile gate
- Confirm repository actions wire to the existing share RPCs or record the exact backend gap if the share flow needs one narrow addition
- Confirm the implementation does not introduce feed, reactions, comments, or challenge behavior prematurely

## Success Definition
- The visible `Friends` tab is real product flow, not placeholder copy.
- A signed-in user can complete a social profile, link with other people by device code, and browse approved boards in one coherent surface.
- The first beta implementation is clearly about sharing and live board visibility, not a half-built social feed.
- The implementation does not block later challenge groups or richer communication.

## Open Risks
- The profile gate from `T-009` now becomes a real dependency for `Friends`.
- The current sharing backend is well-shaped for code-based access, but viewer-management polish may still need a narrow follow-up.
- Realtime invalidation for sharing surfaces may need a follow-up if the first pass relies on manual refresh.
