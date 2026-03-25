---
id: T-024
title: Reward display modes after transition foundation
stage_id: S3
stage_name: Beta UI Completion And Social Shape
required_skills:
  - .agents/skills/building-native-ui/SKILL.md
subsystem: cross-platform
priority: high
owner: Unassigned
depends_on:
  - T-027
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
Introduce the first real beta reward-display choice on the physical board after the transition primitive already exists: a configurable post-record display mode between `Clock` and preset-backed `Artwork`.

## Why Now
The current reward system only supports a built-in clock or generic paint effect, and it is still mostly an internal implementation detail. After the reusable transition foundation lands in `T-027`, the next clean beta step is to make reward display a real user-facing choice without mixing in AI, custom editing, and social playback in the same slice.

## In Scope
- Add an explicit reward-display mode model for beta.
- Keep the first beta choice bounded to:
  - `Clock`
  - `Artwork`
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
- Add the app settings affordance to choose between `Clock` and `Artwork`.
- Ensure the beta `Artwork` path uses truthful preset-backed content rather than placeholder paint-wave behavior.

## Verification Required
- `npm run typecheck`
- manual proof of:
  - selecting `Clock`
  - selecting `Artwork`
  - triggering the reward after a habit record
- exact files changed
- explicit statement of any firmware or backend contract changes made

## Success Definition
- The beta app now has a real configurable reward display instead of a hidden implementation detail.
- The first reward-display slice builds on the already-existing transition primitive instead of inventing a second animation path.
- The first reward-display slice is strong enough to build later art and AI work on top of it.

## Open Risks
- The current reward-artwork schema exists, but the app and firmware do not yet use it end to end.
- If preset artwork is not modeled cleanly, the first slice could accidentally blur into the later editor or AI scope.
