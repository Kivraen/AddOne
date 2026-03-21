---
id: T-009
title: Profile identity model and account surface
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
  - supabase/migrations
  - Docs/AddOne_V1_Canonical_Spec.md
  - Docs/AddOne_Backend_Model.md
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/AddOne_V1_Canonical_Spec.md
  - Docs/AddOne_Backend_Model.md
  - Docs/plans/friends-beta-plan.md
  - Docs/ui-beta-issue-log.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-19-profile-identity-model-and-account-surface.md
---

## Objective
Turn the current email-only account surface into a real AddOne social profile model that can gate `Friends` without redesigning auth.

## Why Now
The current profile surface only shows the signed-in email address. That is not enough for a friend-facing sharing flow. `Friends` now depends on a profile layer that gives people a real public identity while keeping auth lightweight and private.

## In Scope
- Keep auth as `email OTP` for beta.
- Define and implement the first friend-facing social profile shape.
- Require a completed social profile before `Friends` unlocks.
- Lock the intended beta identity surface:
  - required `first_name`
  - required `last_name`
  - required unique `username`
  - derived `display_name`
  - optional `avatar`
- Keep email private and account-only.
- Update the profile/account surface so it can:
  - display the current account state
  - edit the social profile
  - explain why `Friends` needs it
- Provide the gating path that `T-001` can rely on when a user enters `Friends` without a completed profile.

## Out of Scope
- Replacing `email OTP` with password, Google, or another auth system
- Username-based public user discovery
- Broader account settings redesign beyond what is needed for the social profile
- Activity feed, reactions, comments, or challenge features

## Required Changes
- Lock the social profile strategy clearly enough that `Friends` can use it without inventing identity rules mid-task.
- Update the account/profile UI so raw email is no longer the only visible identity.
- Add any required backend support for unique usernames and profile writes.
- Keep the account layer separate from device settings and onboarding.
- Make the incomplete-profile state explicit so `Friends` can route into it.

## Verification Required
- Typecheck and app build smoke test
- Manual UI check for:
  - signed-in user with no completed social profile
  - signed-in user with completed profile
  - username uniqueness conflict
  - optional fields left blank
  - `Friends` entry handoff when profile is incomplete
- Confirm the friend-facing UI no longer relies on raw email as the visible identity label

## Success Definition
- The app has a real friend-facing identity model instead of an email-only account placeholder.
- `Friends` can depend on profile completion without redesigning sign-in.
- Email remains the private auth credential, not the social label people see.
- The implementation does not accidentally widen into open user discovery or a broader social graph.

## Open Risks
- The final copy balance between the derived `display_name`, `@username`, and required name fields still needs careful UX copy so the setup feels light.
- If username rules are too strict or too early, the social-profile gate could feel heavier than necessary.
- The backend contract must keep email private and auth-only even as the social profile grows.
