---
id: T-024
title: Reward display modes and transition foundation
stage_id: S3
stage_name: Beta UI Completion And Social Shape
required_skills:
  - .agents/skills/building-native-ui/SKILL.md
subsystem: cross-platform
priority: high
owner: Unassigned
depends_on:
  - T-001
owned_paths:
  - app/(app)/devices
  - components/app
  - components/settings
  - hooks
  - lib/supabase/addone-repository.ts
  - providers
  - types/addone.ts
  - firmware/src
  - firmware/include
  - Docs/AddOne_Main_Plan.md
  - Docs/AddOne_Backend_Model.md
  - Docs/AddOne_V1_Canonical_Spec.md
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/git-operations.md
  - Docs/stages/stage-register.md
  - Docs/stages/stage-03-trusted-beta-surface-alignment.md
  - Docs/agent-reports/2026-03-24-reward-display-and-friends-celebration-plan.md
  - Docs/AddOne_UI_Direction.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-24-reward-display-and-friends-celebration-plan.md
---

## Objective
Introduce the first real beta reward-display choice on the physical board: a configurable post-record display mode and a reusable transition engine that can later power other board-to-board swaps.

## Why Now
The current reward system only supports a built-in clock or generic paint effect and has no reusable transition language. The user now wants a stronger "wow" moment in beta and a foundation that later supports richer reward screens and friend-triggered board reveals without inventing a second rendering path.

## In Scope
- Add an explicit reward-display mode model for beta.
- Keep the first beta choice bounded to:
  - `Clock`
  - `Artwork`
- Replace the abrupt post-record display swap with one reusable transition:
  - current board pixels disappear randomly
  - destination pixels appear randomly
- Make the transition implementation reusable for later board-swap cases.
- Expose the beta setting in a device-facing settings surface so the user can choose the reward display mode deliberately.
- Implement the first real `Artwork` option as preset-backed reward artwork, not custom editing or AI generation yet.
- Document any backend, app, and firmware contract additions required to make that choice durable.

## Out Of Scope
- AI artwork generation
- Voice prompt flow
- Full custom artwork editor
- Friend-triggered remote board reveals
- Final onboarding polish
- Broader reward marketplace or gallery design

## Required Changes
- Define the beta reward-display model clearly in scoped docs.
- Add or update the device settings contract so the selected reward-display mode is durable.
- Implement the reusable random dissolve transition on the device render path.
- Add the app settings affordance to choose between `Clock` and `Artwork`.
- Ensure the beta `Artwork` path uses truthful preset-backed content rather than placeholder paint-wave behavior.

## Verification Required
- `npm run typecheck`
- manual proof of:
  - selecting `Clock`
  - selecting `Artwork`
  - triggering the reward after a habit record
  - the transition running in both directions needed for the reward swap
- exact files changed
- explicit statement of any firmware or backend contract changes made

## Success Definition
- The beta app now has a real configurable reward display instead of a hidden implementation detail.
- The board transition language exists as a reusable primitive.
- The first reward-display slice is strong enough to build later art, AI, and Friends celebration work on top of it.

## Open Risks
- The current reward-artwork schema exists, but the app and firmware do not yet use it end to end.
- Transition quality will depend on keeping the effect intentional rather than noisy or gimmicky.
- If preset artwork is not modeled cleanly, the first slice could accidentally blur into the later editor or AI scope.
