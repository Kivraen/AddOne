---
task_id: T-015
title: Friends beta plan and model lock
date: 2026-03-19
agent: Codex
result_state: Implemented
verification_state: Verified
changed_paths:
  - Docs/agent-reports/2026-03-19-friends-beta-plan-and-model-lock.md
  - Docs/AddOne_Backend_Model.md
  - Docs/AddOne_V1_Canonical_Spec.md
  - Docs/plans/friends-beta-plan.md
  - Docs/tasks/T-001-beta-friends-surface.md
  - Docs/tasks/T-009-profile-identity-model-and-account-surface.md
  - Docs/tasks/T-013-challenge-groups-and-shared-board-model.md
  - Docs/ui-beta-issue-log.md
---

## Stage

`S3: Beta UI Completion And Social Shape`

## Status

Completed for the scoped planning/model-lock documentation. The repo now has a durable first-beta `Friends` plan, explicit profile/sharing decisions, and preserved challenge guardrails. Coordinator-owned acceptance docs were intentionally left untouched.

## Changes made

- Rewrote `Docs/plans/friends-beta-plan.md` into a real planning checkpoint that locks:
  - beta-now scope
  - future-social scope
  - future-challenge guardrails
  - identity model
  - code-based sharing model
  - implementation order
- Updated `Docs/ui-beta-issue-log.md` so the S3 live decision log now reflects:
  - profile-gated `Friends`
  - `display_name + @username`
  - one active rotatable share code per device
  - explicit deferral of feed, reactions, comments, push, and challenges
- Tightened `Docs/tasks/T-001-beta-friends-surface.md` so the first implementation slice is:
  - social-profile gate
  - unit sharing by code
  - owner approval
  - live read-only board browsing
- Added `Docs/tasks/T-009-profile-identity-model-and-account-surface.md` to make the social-profile gate a first-class dependency before `Friends`.
- Expanded `Docs/tasks/T-013-challenge-groups-and-shared-board-model.md` with the preserved challenge rules:
  - join starts at join time
  - personal weekly success stays personal
  - other members tint otherwise empty days
  - challenge must not silently override the personal board
- Updated `Docs/AddOne_V1_Canonical_Spec.md` and `Docs/AddOne_Backend_Model.md` so the product and backend docs match the new plan.

Exact files changed:
- `Docs/agent-reports/2026-03-19-friends-beta-plan-and-model-lock.md`
- `Docs/AddOne_Backend_Model.md`
- `Docs/AddOne_V1_Canonical_Spec.md`
- `Docs/plans/friends-beta-plan.md`
- `Docs/tasks/T-001-beta-friends-surface.md`
- `Docs/tasks/T-009-profile-identity-model-and-account-surface.md`
- `Docs/tasks/T-013-challenge-groups-and-shared-board-model.md`
- `Docs/ui-beta-issue-log.md`

## Commands run

- `sed -n '1,220p' /Users/viktor/.codex/skills/stage-coordinator/SKILL.md`
- `git -C /Users/viktor/Desktop/DevProjects/Codex/AddOne status --short`
- `git -C /Users/viktor/Desktop/DevProjects/Codex/AddOne diff -- Docs/...`
- `rg -n "..." Docs/... components/app/profile-tab-content.tsx supabase/migrations/20260308113000_init_addone_schema.sql`
- `nl -ba Docs/... | sed -n '...'`
- `nl -ba components/app/profile-tab-content.tsx | sed -n '...'`
- `nl -ba supabase/migrations/20260308113000_init_addone_schema.sql | sed -n '...'`

## Evidence

- The locked first-beta meaning, identity model, connection model, defer list, and execution order now live in `Docs/plans/friends-beta-plan.md`.
- The live S3 issue log now records the narrower beta target and the social-profile gate in `Docs/ui-beta-issue-log.md`.
- `T-001` now depends on `T-009` and no longer assumes a feed/reaction lane in the first implementation slice.
- `T-009` now exists as a dedicated task for `display_name`, unique `username`, and the `Friends` entry gate.
- `T-013` now preserves the challenge-specific rules without smuggling challenges into beta.
- The canonical spec now says first-user beta `Friends` is deliberate unit-based linking with profile-gated access, while richer social remains future-facing.
- The backend model now explicitly treats `public.profiles` as the friend-facing identity layer and keeps sharing device-code plus approval based.
- Repo verification confirmed:
  - current profile UI still exposes raw email as the visible account label
  - the backend schema already has one active code row per device
  - the backend schema already supports code-based access requests and share-code rotation

## Open risks / blockers

- Coordinator-owned docs still use the older broader social-floor framing:
  - `Docs/AddOne_Main_Plan.md`
  - `Docs/stages/stage-03-trusted-beta-surface-alignment.md`
  Those were left untouched intentionally and should be updated only through coordinator acceptance.
- The backend does not yet have unique username support, so `T-009` likely needs one narrow schema/repository extension.
- The current profile UI is still email-only until `T-009` is implemented.
- Realtime invalidation or refresh polish for the shared-board surface may still need a follow-up during `T-001`.

## Recommendation

- First-beta connection model:
  - one active rotatable share code per device
  - request by code
  - owner approval
  - approved viewer access until revoked
- First-beta social floor:
  - require social profile completion before `Friends`
  - share boards
  - request boards by code
  - approve or reject requests
  - browse approved boards live and read-only
- Deferred:
  - username search/discovery
  - activity feed
  - reactions
  - comments
  - push notifications
  - challenge groups
- Likely backend/library gaps remain:
  - unique `username` support
  - social-profile completion flow and validation
  - future-only activity/challenge model work when those slices are explicitly accepted
- Recommended sequence:
  - accept `T-015`
  - implement `T-009`
  - implement `T-001`
  - preserve `T-013` as later planning/model work
  - keep onboarding and Wi-Fi recovery as the final visible polish slice
