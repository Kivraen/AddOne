---
id: T-001
title: Beta Friends surface
stage_id: S3
stage_name: Trusted Beta Surface Alignment
subsystem: app
priority: high
owner: Unassigned
depends_on: []
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
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-16-app-beta-friends-surface.md
---

## Objective
Replace the placeholder `Friends` tab with the first real beta sharing flow.

## Why Now
`Friends` is already visible in the product shell. Leaving it as placeholder UI makes the current app state confusing and breaks trust in the beta surface.

## In Scope
- Turn the `Friends` tab into a real sharing surface using the existing sharing schema and repository helpers.
- Show boards shared with the signed-in user.
- Show the active device sharing state for the owner:
  - current share code
  - pending access requests
  - approved viewers
- Support the owner actions already exposed by the repository layer:
  - rotate share code
  - approve request
  - reject request

## Out of Scope
- Chat, comments, reactions, or community feed features
- Notifications or reminders
- Multi-device management redesign
- New backend schema or RPC design unless a concrete bug blocks the existing flow

## Required Changes
- Add data hooks for shared boards and active-device sharing state.
- Replace placeholder `Friends` copy with real loading, empty, error, and populated states.
- Render shared boards read-only and keep them visually distinct from the owner’s main board.
- Render owner sharing controls and viewer/request lists in the same tab.
- Keep the surface aligned with the existing backend contract rather than inventing a second sharing model.

## Verification Required
- Typecheck and app build smoke test
- Manual UI check for:
  - no shared boards
  - shared boards present
  - no pending requests
  - pending requests present
  - viewer list present
- Confirm repository actions wire to the existing share RPCs

## Success Definition
- The visible `Friends` tab is real product flow, not placeholder copy.
- A signed-in owner can inspect and manage board sharing from one place.
- A viewer can see shared boards without mixing them into the owner’s main board.

## Open Risks
- The exact volume and shape of staged sharing data may be limited in current test environments.
- Realtime invalidation for sharing surfaces may need a follow-up if the first pass relies on manual refresh.
